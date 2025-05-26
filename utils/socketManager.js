// 获取小程序实例
const app = getApp()

/**
 * WebSocket基础连接管理器
 */
class SocketManager {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000; // Maximum reconnect delay of 30 seconds
    this.connected = false;
    this.connecting = false;
    this.userId = '';  // 确保初始值为字符串
    this.pendingMessages = []; // 存储待发送的消息
    
    // 确保app实例已经初始化
    if (!app || !app.globalData || !app.globalData.wsUrl) {
      console.error('WebSocket URL not configured in app.globalData');
      return;
    }
  }

  /**
   * 连接WebSocket服务器
   * @param {string} userId 用户ID
   */
  connect(userId) {
    // Store userId for reconnection purposes
    this.userId = userId.toString();
    
    // Prevent multiple connection attempts
    if (this.connecting) {
      console.log('WebSocket连接已在进行中');
      return;
    }
    
    // Don't reconnect if already connected
    if (this.connected && this.socket) {
      console.log('WebSocket已连接');
      return;
    }
    
    this.connecting = true;

    try {
      const wsUrl = app.globalData.wsUrl;
      if (!wsUrl) {
        throw new Error('WebSocket URL not configured');
      }

      // 关闭现有连接
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      this.socket = wx.connectSocket({
        url: `${wsUrl}?userId=${this.userId}`,
        success: () => {
          console.log('WebSocket连接成功');
        },
        fail: (error) => {
          console.error('WebSocket连接失败:', error);
          this.connecting = false;
          this.connected = false;
          this.handleReconnect();
        }
      });

      // 监听连接打开
      this.socket.onOpen(() => {
        console.log('WebSocket连接已打开');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.connecting = false;
        this.connected = true;
        
        // 连接成功后发送所有挂起的消息
        this.sendPendingMessages();
      });

      // 监听消息
      this.socket.onMessage((res) => {
        try {
          const response = JSON.parse(res.data);
          console.log('收到消息:', response);
          
          switch (response.type) {
            case 'connectionSuccess':
              console.log('连接成功，用户ID:', response.userId);
              break;
              
            case 'message':
              // 直接传递原始消息对象给处理器
              this.messageHandlers.forEach(handler => {
                handler(response);
              });
              break;
              
            case 'isRead':
              // 处理消息已读状态
              this.messageHandlers.forEach(handler => {
                if (handler.onMessageRead) {
                  handler.onMessageRead(response.userId, response.otherId);
                }
              });
              break;
              
            default:
              console.log('未知消息类型:', response.type);
          }
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      });

      // 监听连接关闭
      this.socket.onClose(() => {
        console.log('WebSocket连接已关闭');
        this.socket = null;
        this.connected = false;
        this.connecting = false;
        this.handleReconnect();
      });

      // 监听连接错误
      this.socket.onError((error) => {
        console.error('WebSocket错误:', error);
        this.socket = null;
        this.connected = false;
        this.connecting = false;
        this.handleReconnect();
      });

    } catch (error) {
      console.error('初始化WebSocket失败:', error);
      this.socket = null;
      this.connected = false;
      this.connecting = false;
      this.handleReconnect();
    }
  }

  /**
   * 处理重连逻辑
   */
  handleReconnect() {
    if (!this.userId || !this.messageHandlers.size) {
      console.log('没有活跃的聊天页面或用户ID，不进行重连');
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;

    console.log(`尝试在 ${delay}ms 后重新连接... (第 ${this.reconnectAttempts} 次尝试)`);
    
    setTimeout(() => {
      // Check if we're still offline before attempting to reconnect
      wx.getNetworkType({
        success: (res) => {
          if (res.networkType !== 'none' && !this.connected && !this.connecting && this.messageHandlers.size) {
            this.connect(this.userId);
          }
        }
      });
    }, delay);
  }
  
  /**
   * 发送所有挂起的消息
   */
  sendPendingMessages() {
    if (!this.connected || !this.socket || this.pendingMessages.length === 0) {
      return;
    }
    
    console.log(`发送${this.pendingMessages.length}条挂起的消息`);
    
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.doSendMessage(message);
    }
  }
  
  /**
   * 实际发送消息的内部方法
   */
  doSendMessage(message) {
    try {
      this.socket.send({
        data: JSON.stringify(message),
        fail: (error) => {
          console.error('发送消息失败:', error);
          // 发送失败时，将消息重新加入队列
          this.pendingMessages.push(message);
        }
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      // 发送失败时，将消息重新加入队列
      this.pendingMessages.push(message);
    }
  }

  /**
   * 发送消息
   * @param {Object} message 消息对象
   */
  send(message) {
    // 确保消息格式正确
    const formattedMessage = {
      type: 'message',
      senderId: message.fromId.toString(),
      receiverId: message.toId.toString(),
      content: message.content
    };

    if (!this.socket || !this.connected) {
      console.log('WebSocket未连接，消息加入待发送队列');
      this.pendingMessages.push(formattedMessage);
      
      if (!this.connecting && this.userId) {
        this.connect(this.userId);
      }
      return;
    }

    this.doSendMessage(formattedMessage);
  }

  /**
   * 发送已读状态
   * @param {string} userId 当前用户ID
   * @param {string} otherId 对方用户ID
   */
  sendReadStatus(userId, otherId) {
    const message = {
      type: 'isRead',
      userId: userId.toString(),
      otherId: otherId.toString()
    };

    if (!this.socket || !this.connected) {
      console.log('WebSocket未连接，已读状态加入待发送队列');
      this.pendingMessages.push(message);
      
      if (!this.connecting && this.userId) {
        this.connect(this.userId);
      }
      return;
    }

    this.doSendMessage(message);
  }

  /**
   * 添加消息处理器
   * @param {Function} handler 消息处理函数
   */
  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  /**
   * 移除消息处理器
   * @param {Function} handler 消息处理函数
   */
  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
    
    // 如果没有活跃的消息处理器，关闭连接
    if (this.messageHandlers.size === 0) {
      this.close();
    }
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    this.connecting = false;
    this.pendingMessages = [];
  }

  /**
   * 清理连接和状态
   */
  cleanup() {
    this.close();
    this.reconnectAttempts = 0;
    this.userId = '';
    this.messageHandlers.clear();
  }
}

// 导出实例
module.exports = new SocketManager(); 
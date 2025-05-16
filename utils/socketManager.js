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
    this.userId = null;
    this.pendingMessages = []; // 存储待发送的消息
    
    // 监听小程序生命周期事件
    this.setupAppLifecycleListeners();
  }
  
  /**
   * 设置应用生命周期监听
   */
  setupAppLifecycleListeners() {
    // 尝试获取全局App实例
    const globalApp = getApp();
    if (!globalApp) return;
    
    // 存储原始的生命周期函数
    const originalOnShow = globalApp.onShow || function() {};
    const originalOnHide = globalApp.onHide || function() {};
    
    // 增强onShow函数，当小程序进入前台时重新连接
    globalApp.onShow = (options) => {
      // 调用原始的onShow
      originalOnShow.call(globalApp, options);
      
      // 如果有用户ID但未连接，重新连接
      if (this.userId && (!this.connected || !this.socket)) {
        console.log('应用进入前台，重新连接WebSocket');
        this.connect(this.userId);
      }
      
      // 发送所有挂起的消息
      this.sendPendingMessages();
    };
    
    // 增强onHide函数，监控应用进入后台
    globalApp.onHide = () => {
      // 调用原始的onHide
      originalOnHide.call(globalApp);
      
      // 记录应用进入后台，但保持连接
      console.log('应用进入后台，保持WebSocket连接');
    };
  }

  /**
   * 连接WebSocket服务器
   * @param {string} userId 用户ID
   */
  connect(userId) {
    // Store userId for reconnection purposes
    this.userId = userId;
    
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
      const app = getApp();
      const wsUrl = app.globalData.wsUrl || 'ws://campu_run_chat.megajam.online';

      // 关闭现有连接
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      this.socket = wx.connectSocket({
        url: `${wsUrl}?userId=${userId}`,
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
        console.log(res);
        try {
          const response = JSON.parse(res.data);
          console.log('收到消息:', response);
          
          if (response.type === 'message') {
            // 通知所有消息处理器
            this.messageHandlers.forEach(handler => {
              handler(response.data);
            });
            
            // 播放消息提示音 (仅当消息不是自己发送的)
            if (response.data && response.data.sender_id !== userId) {
              this.playMessageTone();
            }
          } else if (response.type === 'error') {
            console.error('服务器错误:', response.error);
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
   * 播放消息提示音
   */
  playMessageTone() {
    // 振动功能已禁用
    console.log('收到新消息');
    
    // 如果需要音频提示，请确保先创建音频文件
    // const innerAudioContext = wx.createInnerAudioContext();
    // innerAudioContext.src = '/assets/audio/message.mp3'; 
    // innerAudioContext.play();
  }

  /**
   * 处理重连逻辑
   */
  handleReconnect() {
    if (!this.userId) {
      console.log('没有用户ID，不进行重连');
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
          if (res.networkType !== 'none' && !this.connected && !this.connecting) {
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
    if (!this.socket || !this.connected) {
      console.log('WebSocket未连接，消息加入待发送队列');
      // 将消息加入待发送队列
      this.pendingMessages.push(message);
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
    this.messageHandlers.clear();
  }

  /**
   * 清理连接和状态
   */
  cleanup() {
    this.close();
    this.reconnectAttempts = 0;
    this.userId = null;
    this.pendingMessages = [];
  }
}

// 导出实例
module.exports = new SocketManager(); 
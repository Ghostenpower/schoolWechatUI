/**
 * WebSocket服务管理器
 * 单例模式实现，确保整个应用只有一个WebSocket连接
 */
class SocketManager {
  constructor() {
    if (SocketManager.instance) {
      return SocketManager.instance;
    }
    SocketManager.instance = this;
    
    this.socket = null;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    this.listeners = new Map();
    this.messageQueue = [];  // 消息队列，存储断线时的消息
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;  // 增加最大重连次数
    this.reconnectDelay = 1000;  // 初始重连延迟1秒
    this.isConnecting = false;
    this.userId = null;
    this.lastPingTime = 0;
    this.pingTimeout = null;
    
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      console.log('网络状态变化:', res.isConnected);
      if (res.isConnected) {
        if (!this.isConnected()) {
          this.reconnect();
        }
      } else {
        this.cleanup();
      }
    });
    
    return this;
  }

  /**
   * 初始化WebSocket连接
   * @param {string} userId 用户ID
   */
  connect(userId) {
    if (this.socket && this.isConnected()) {
      return Promise.resolve();
    }

    this.userId = userId;
    
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        reject(new Error('正在连接中'));
        return;
      }

      this.isConnecting = true;

      // 检查网络状态
      wx.getNetworkType({
        success: (res) => {
          if (res.networkType === 'none') {
            const error = new Error('无网络连接');
            this.handleError(error);
            reject(error);
            return;
          }
          this.initSocket(resolve, reject);
        },
        fail: (error) => {
          this.handleError(error);
          reject(error);
        }
      });
    });
  }

  /**
   * 初始化WebSocket连接
   */
  initSocket(resolve, reject) {
    try {
      this.socket = wx.connectSocket({
        url: `ws://localhost:3000/socket.io/?EIO=4&transport=websocket`,
        success: () => {
          console.log('WebSocket连接创建成功');
        },
        fail: (error) => {
          console.error('WebSocket连接创建失败:', error);
          this.handleError(error);
          reject(error);
        }
      });

      this.socket.onOpen(() => {
        console.log('WebSocket连接已打开');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Socket.IO 引擎握手
        this.socket.send({
          data: '40',
          fail: (error) => this.handleSendError(error)
        });

        // 加入用户房间
        if (this.userId) {
          const joinData = JSON.stringify(['join', this.userId]);
          this.socket.send({
            data: `42${joinData}`,
            fail: (error) => this.handleSendError(error)
          });
        }

        // 开始心跳
        this.startHeartbeat();
        
        // 发送队列中的消息
        this.flushMessageQueue();
        
        resolve();
      });

      this.socket.onMessage((res) => {
        console.log('收到消息:', res.data);
        
        try {
          // 处理心跳响应
          if (res.data === '3') {
            this.lastPingTime = Date.now();
            return;
          }
          
          // 处理 Socket.IO 消息
          if (res.data.startsWith('42')) {
            const messageData = JSON.parse(res.data.slice(2));
            const [event, data] = messageData;
            
            // 通知所有监听该事件的处理器
            const eventListeners = this.listeners.get(event) || [];
            eventListeners.forEach(callback => {
              try {
                callback(data);
              } catch (error) {
                console.error(`事件处理器执行错误 [${event}]:`, error);
              }
            });
          }
        } catch (error) {
          console.error('消息处理错误:', error);
        }
      });

      this.socket.onClose(() => {
        console.log('WebSocket连接已关闭');
        this.cleanup();
        this.reconnect();
      });

      this.socket.onError((error) => {
        console.error('WebSocket错误:', error);
        this.handleError(error);
        reject(error);
      });
    } catch (error) {
      console.error('初始化WebSocket失败:', error);
      this.handleError(error);
      reject(error);
    }
  }

  /**
   * 重新连接
   */
  reconnect() {
    if (this.isConnecting || this.reconnectTimeout) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handleError(new Error('重连次数超过限制'));
      return;
    }

    console.log(`尝试第 ${this.reconnectAttempts + 1} 次重连...`);
    
    // 使用指数退避策略
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectAttempts++;
      this.connect(this.userId).catch(() => {
        // 重连失败，会自动触发下一次重连
      });
    }, delay);
  }

  /**
   * 处理发送错误
   */
  handleSendError(error) {
    console.error('发送消息失败:', error);
    if (!this.isConnected()) {
      this.reconnect();
    }
  }

  /**
   * 发送消息队列中的消息
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { event, data, resolve, reject } = this.messageQueue.shift();
      this.send(event, data).then(resolve).catch(reject);
    }
  }

  /**
   * 添加事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 发送消息
   * @param {string} event 事件名称
   * @param {Object} data 消息数据
   * @returns {Promise} 发送结果
   */
  send(event, data) {
    return new Promise((resolve, reject) => {
      // 如果未连接，尝试重新连接并将消息加入队列
      if (!this.isConnected()) {
        this.messageQueue.push({ event, data, resolve, reject });
        this.reconnect();
        return;
      }

      try {
        const messageData = JSON.stringify([event, data]);
        this.socket.send({
          data: `42${messageData}`,
          success: () => resolve(),
          fail: (error) => {
            this.handleSendError(error);
            // 如果发送失败，将消息加入队列
            this.messageQueue.push({ event, data, resolve, reject });
            reject(error);
          }
        });
      } catch (error) {
        this.handleSendError(error);
        // 如果发送失败，将消息加入队列
        this.messageQueue.push({ event, data, resolve, reject });
        reject(error);
      }
    });
  }

  /**
   * 开始心跳检测
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
    }

    this.lastPingTime = Date.now();
    
    // 发送心跳
    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected()) {
        return;
      }

      this.socket.send({
        data: '2',
        fail: (error) => {
          console.error('心跳发送失败:', error);
          this.handleSendError(error);
        }
      });

      // 设置超时检查
      this.pingTimeout = setTimeout(() => {
        const now = Date.now();
        if (now - this.lastPingTime > 45000) { // 45秒没有收到响应
          console.error('心跳超时');
          this.cleanup();
          this.reconnect();
        }
      }, 45000);
    }, 25000);
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        console.error('关闭socket失败:', e);
      }
      this.socket = null;
    }
    this.isConnecting = false;
  }

  /**
   * 处理错误
   * @param {Error} error 错误对象
   */
  handleError(error) {
    console.error('WebSocket错误:', error);
    this.isConnecting = false;
    
    // 显示错误提示
    wx.showToast({
      title: '连接错误，正在重试',
      icon: 'none'
    });
  }

  /**
   * 获取socket实例
   * @returns {Object} WebSocket实例
   */
  getSocket() {
    return this.socket;
  }

  /**
   * 获取连接状态
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this.socket !== null && !this.isConnecting;
  }
}

// 导出单例
const socketManager = new SocketManager();
module.exports = socketManager; 
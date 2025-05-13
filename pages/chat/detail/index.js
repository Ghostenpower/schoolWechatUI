const app = getApp()

Page({
  data: {
    messages: [],
    inputMessage: '',
    userId: null,
    targetId: null,
    userInfo: null,
    targetInfo: null,
    scrollIntoView: null,
    isLoading: false
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({
      userId: userInfo.userId,
      userInfo: userInfo,
      targetId: Math.floor(options.targetId)
    });

    // 获取目标用户信息
    this.loadTargetInfo();
    
    // 设置Socket监听器
    this.setupSocketListeners();
    
    // 加载历史消息
    this.loadMessages();
  },

  // 设置Socket监听器
  setupSocketListeners() {
    const socketManager = app.globalData.socketManager;
    
    // 监听新消息
    socketManager.on('newMessage', (data) => {
      // 如果是当前对话的消息，添加到列表
      if (data.senderId === this.data.targetId || data.receiverId === this.data.targetId) {
        this.addMessage(data);
      }
    });
  },

  // 加载目标用户信息
  loadTargetInfo() {
    wx.request({
      url: `http://localhost:8051/api/users/getOneById?userId=${this.data.targetId}`,
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          this.setData({
            targetInfo: res.data.data
          });
        }
      }
    });
  },

  // 加载历史消息
  loadMessages() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    wx.showLoading({ title: '加载中...' });

    return new Promise((resolve, reject) => {
      wx.request({
        url: `http://localhost:3000/messages/${this.data.userId}`,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200) {
            // 筛选当前对话的消息
            const messages = res.data
              .filter(msg => 
                (msg.senderId === this.data.userId && msg.receiverId === this.data.targetId) ||
                (msg.senderId === this.data.targetId && msg.receiverId === this.data.userId)
              )
              .map(msg => ({
                ...msg,
                // 确保timestamp是数字类型
                timestamp: new Date(msg.timestamp).getTime(),
                timeStr: this.formatTime(msg.timestamp)
              }))
              // 按时间升序排序
              .sort((a, b) => a.timestamp - b.timestamp);

            console.log('加载的消息:', messages);

            this.setData({
              messages,
              scrollIntoView: messages.length > 0 ? `msg-${messages.length - 1}` : null
            }, () => {
              // 确保消息列表滚动到底部
              if (messages.length > 0) {
                wx.pageScrollTo({
                  scrollTop: 9999,
                  duration: 100
                });
              }
            });
            resolve();
          } else {
            console.error('加载消息失败:', res);
            reject(new Error('Failed to load messages'));
          }
        },
        fail: (error) => {
          console.error('请求失败:', error);
          reject(error);
        },
        complete: () => {
          this.setData({ isLoading: false });
          wx.hideLoading();
        }
      });
    });
  },

  // 添加新消息到列表
  addMessage(message) {
    // 确保timestamp是数字类型
    const timestamp = typeof message.timestamp === 'string' 
      ? new Date(message.timestamp).getTime() 
      : message.timestamp;

    const newMessage = {
      ...message,
      timestamp,
      timeStr: this.formatTime(timestamp)
    };

    const messages = [...this.data.messages, newMessage];
    
    this.setData({
      messages,
      scrollIntoView: `msg-${messages.length - 1}`
    }, () => {
      // 确保新消息出现时滚动到底部
      wx.pageScrollTo({
        scrollTop: 9999,
        duration: 100
      });
    });
  },

  // 输入框事件
  onInputMessage(e) {
    console.log('输入内容:', e.detail.value);
    this.setData({
      inputMessage: e.detail.value
    });
  },

  // 发送消息
  sendMessage() {
    if (!this.data.inputMessage.trim()) {
      return;
    }

    const message = {
      senderId: this.data.userId,
      receiverId: this.data.targetId,
      content: this.data.inputMessage,
      timestamp: new Date().toISOString()
    };

    // 发送消息
    app.globalData.socketManager.send('sendMessage', message);
    console.log('发送的消息:', message);

    // 添加到本地消息列表
    this.addMessage(message);

    // 清空输入框
    this.setData({
      inputMessage: ''
    });
  },

  // 上拉加载更多
  onScrollToUpper() {
    // TODO: 实现加载更多历史消息
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      return `星期${days[date.getDay()]}`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  },

  onUnload() {
    // 移除事件监听器
    const socketManager = app.globalData.socketManager;
    socketManager.off('newMessage');
  },

  onShow() {
    // 页面显示时重新加载消息
    if (this.data.userId && this.data.targetId) {
      this.loadMessages();
    }
  }
}) 
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
    isLoading: false,
    currentPage: 1,
    hasMore: true,
    pageSize: 20
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
    
    // 加载历史消息
    this.loadMessages();

    // 设置消息处理器
    this.setupMessageHandler();
  },

  // 设置消息处理器
  setupMessageHandler() {
    const socketManager = app.globalData.socketManager;
    
    // 添加消息处理函数
    this.messageHandler = (message) => {
      console.log('收到新消息:', message);
      // 检查消息是否属于当前对话
      if (parseInt(message.sender_id)  === parseInt(this.data.targetId) || 
          parseInt(message.receiver_id) === parseInt(this.data.userId)) {
        console.log('当前对话消息:', message);
        // 添加消息到聊天记录
        this.addMessage(message);
        
        // 如果是接收到的新消息，标记为已读
        if (message.sender_id === this.data.targetId) {
          this.markMessageAsRead(message._id);
          // 震动功能已禁用
        }
      } else {
        // 不是当前对话的消息，显示通知
        this.showNotification(message);
      }
    };
    
    socketManager.addMessageHandler(this.messageHandler);
  },

  // 加载目标用户信息
  loadTargetInfo() {
    wx.request({
      url: `http://10.34.80.151:8051/api/users/getOneById?userId=${this.data.targetId}`,
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 401 || res.data.code === 1401) {
          // 未登录或token过期
          wx.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          });
          // 关闭聊天窗口
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
          return;
        }
        
        if (res.data.code === 1 && res.data.data) {
          this.setData({
            targetInfo: res.data.data
          });
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载历史消息
  loadMessages(page = 1) {
    if (this.data.isLoading || (page > 1 && !this.data.hasMore)) return;
    
    this.setData({ isLoading: true });
    if (page === 1) {
      wx.showLoading({ title: '加载中...' });
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.wsUrl.replace('ws:', 'http:')}/api/messages/${this.data.userId}/${this.data.targetId}`,
        method: 'GET',
        data: {
          page: page,
          limit: this.data.pageSize
        },
        success: (res) => {
          if (res.data.code === 401 || res.data.code === 1401) {
            // 未登录或token过期
            wx.showToast({
              title: '登录已过期，请重新登录',
              icon: 'none',
              duration: 2000
            });
            // 关闭聊天窗口
            setTimeout(() => {
              wx.navigateBack();
            }, 2000);
            reject(new Error('Unauthorized'));
            return;
          }

          if (res.statusCode === 200 && Array.isArray(res.data)) {
            const newMessages = res.data.map(this.formatMessage);
            if (page === 1) {
              // 第一页，直接设置消息列表
              this.setData({
                messages: newMessages,
                currentPage: 1,
                hasMore: newMessages.length >= this.data.pageSize,
                scrollIntoView: newMessages.length > 0 ? `msg-${newMessages.length - 1}` : null
              }, () => {
                // 确保消息列表滚动到底部
                this.scrollToBottom();
              });
            } else {
              // 加载更多历史消息时，将新消息添加到列表前面
              this.setData({
                messages: [...newMessages, ...this.data.messages],
                currentPage: page,
                hasMore: newMessages.length >= this.data.pageSize
              });
            }
            resolve(newMessages);
          } else {
            console.error('加载消息失败:', res);
            reject(new Error('Failed to load messages'));
          }
        },
        fail: (err) => {
          console.error('请求失败:', err);
          reject(err);
        },
        complete: () => {
          this.setData({ isLoading: false });
          if (page === 1) {
            wx.hideLoading();
          }
        }
      });
    });
  },

  // 格式化消息对象
  formatMessage(msg) {
    return {
      ...msg,
      senderId: Number(msg.sender_id),
      receiverId: Number(msg.receiver_id),
      content: msg.content,
      timestamp: new Date(msg.createdAt).getTime(),
      timeStr: this.formatTime(msg.createdAt)
    };
  },

  // 添加新消息到列表
  addMessage(message) {
    const newMessage = this.formatMessage(message);

    // 如果是服务器响应的消息格式
    if (message.type === 'message' && message.data) {
      Object.assign(newMessage, this.formatMessage(message.data));
    }

    const messages = [...this.data.messages, newMessage];
    this.setData({
      messages,
      scrollIntoView: `msg-${messages.length - 1}`
    }, () => {
      this.scrollToBottom();
    });
  },

  // 滚动到底部
  scrollToBottom() {
    // 使用scroll-view的scrollIntoView属性滚动到底部
    if (this.data.messages.length > 0) {
      this.setData({
        scrollIntoView: `msg-${this.data.messages.length - 1}`      });
    }
  },

  // 上拉加载更多
  onScrollToUpper() {
    if (!this.data.isLoading && this.data.hasMore) {
      const nextPage = this.data.currentPage + 1;
      this.loadMessages(nextPage);
    }
  },

  // 输入框事件
  onInputMessage(e) {
    const value = e.detail.value;
    console.log('输入内容:', value);
    
    // 更新输入框内容
    this.setData({
      inputMessage: value
    });
  },

  // 发送消息
  sendMessage() {
    if (!this.data.inputMessage.trim()) {
      return;
    }

    // 确保有目标用户信息
    if (!this.data.targetInfo) {
      wx.showToast({
        title: '无法获取接收者信息',
        icon: 'none'
      });
      return;
    }

    const message = {
      // 发送者信息
      sender_id: this.data.userId,
      username: this.data.userInfo.username,
      avatar_url: this.data.userInfo.avatarUrl,
      
      // 接收者信息
      receiver_id: this.data.targetId,
      receiver_name: this.data.targetInfo.username,
      receiver_avatar_url: this.data.targetInfo.avatarUrl,
      
      // 消息内容
      content: this.data.inputMessage,
      
      // 添加时间戳
      createdAt: new Date().toISOString()
    };

    // 发送消息
    app.globalData.socketManager.send(message);
    console.log('发送的消息:', message);
    
    // 将消息添加到本地消息列表
    this.addMessage(message);

    // 清空输入框
    this.setData({
      inputMessage: ''
    });
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

  onShow() {
    // 页面显示时重新加载消息
    if (this.data.userId && this.data.targetId) {
      this.loadMessages();
    }
  },

  onUnload() {
    // 移除消息处理器
    if (this.messageHandler) {
      app.globalData.socketManager.removeMessageHandler(this.messageHandler);
    }
  },

  // 标记消息为已读
  markMessageAsRead(messageId) {
    // 如果服务器提供了标记消息已读的API，可以在这里调用
    // 例如：
    /*
    wx.request({
      url: `${app.globalData.wsUrl.replace('ws:', 'http:')}/api/messages/read/${messageId}`,
      method: 'PUT',
      header: {
        'token': wx.getStorageSync('token')
      }
    });
    */
  },
  
  // 显示消息通知
  showNotification(message) {
    // 如果不是当前聊天的消息，显示通知
    if (message.sender_id !== this.data.targetId && 
        message.receiver_id === this.data.userId) {
      
      // 获取发送者名称
      const senderName = message.username || '新消息';
      
      // 显示通知
      wx.showToast({
        title: `${senderName}: ${message.content}`,
        icon: 'none',
        duration: 3000
      });
    }
  }
}) 

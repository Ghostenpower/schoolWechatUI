const app = getApp()

Page({
  data: {
    messages: [],
    userId: null,
    isLoading: false,
    error: null
  },

  onLoad() {
    // 获取用户ID
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.userId) {
      this.setData({ userId: userInfo.userId });
      this.loadMessages();
      this.setupMessageHandler();
    } else {
      this.setData({ error: '请先登录' });
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
  },

  // 设置消息处理器
  setupMessageHandler() {
    const socketManager = app.globalData.socketManager;
    
    // 添加消息处理函数
    this.messageHandler = (message) => {
      // 更新对应的会话
      const messages = [...this.data.messages];
      const chatIndex = messages.findIndex(m => 
        m.id === message.sender_id || m.id === message.receiver_id
      );

      if (chatIndex >= 0) {
        // 更新现有会话
        messages[chatIndex] = {
          ...messages[chatIndex],
          lastMessage: message.content,
          timestamp: new Date(message.createdAt).getTime(),
          time: this.formatTime(message.createdAt),
          unread: message.receiver_id === this.data.userId ? messages[chatIndex].unread + 1 : messages[chatIndex].unread
        };
      } else {
        // 添加新会话
        this.loadMessages(); // 重新加载完整列表
      }

      // 按时间排序
      messages.sort((a, b) => b.timestamp - a.timestamp);
      
      this.setData({ messages });
    };
    
    socketManager.addMessageHandler(this.messageHandler);
  },

  // 加载消息列表
  async loadMessages() {
    if (this.data.isLoading) return;
    
    this.setData({ 
      isLoading: true,
      error: null 
    });
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `https://campu-run-chat.megajam.online/api/users/${this.data.userId}/chats`,
          method: 'GET',
          success: resolve,
          fail: reject
        });
      });

      console.log('获取到的聊天列表数据:', res.data);

      if (res.statusCode === 200 && Array.isArray(res.data)) {
        // 处理消息列表数据
        const messages = res.data.map(chat => {
          // 确保user和lastMessage字段存在
          const user = chat.user || {};
          const lastMessage = chat.lastMessage || {};
          
          return {
            id: chat._id || '',
            name: user.username || '未知用户',
            avatar: user.avatar_url || '/assets/default-avatar.png',
            lastMessage: lastMessage.content || '',
            timestamp: lastMessage.createdAt ? new Date(lastMessage.createdAt).getTime() : 0,
            time: lastMessage.createdAt ? this.formatTime(lastMessage.createdAt) : '',
            unread: chat.unreadCount || 0
          };
        });

        // 按时间排序
        messages.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log('处理后的消息列表:', messages);
        this.setData({ messages });
      } else {
        throw new Error(res.data?.error || '获取消息列表失败');
      }
    } catch (err) {
      console.error('获取消息列表失败:', err);
      this.setData({ 
        error: err.message || '获取消息失败'
      });
      wx.showToast({
        title: err.message || '获取消息失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ isLoading: false });
      wx.hideLoading();
    }
  },

  onShow() {
    // 页面显示时获取最新的用户信息和刷新消息列表
    const userInfo = wx.getStorageSync('userInfo');
    
    // 检查用户是否已登录并且用户ID是否有变化
    if (userInfo && userInfo.userId) {
      if (this.data.userId !== userInfo.userId) {
        // 用户ID变化，更新用户ID并重新初始化
        console.log('检测到用户ID变化，从', this.data.userId, '变为', userInfo.userId);
        this.setData({ userId: userInfo.userId });
        
        // 重新设置消息处理器
        if (this.messageHandler) {
          app.globalData.socketManager.removeMessageHandler(this.messageHandler);
          this.setupMessageHandler();
        }
      }
      
      // 重新加载消息列表
      this.loadMessages();
    } else if (this.data.userId) {
      // 用户已登出，清除数据
      this.setData({ 
        userId: null,
        messages: [],
        error: '请先登录'
      });
      
      // 移除消息处理器
      if (this.messageHandler) {
        app.globalData.socketManager.removeMessageHandler(this.messageHandler);
        this.messageHandler = null;
      }
      
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
  },

  onUnload() {
    // 清理消息处理器
    if (this.messageHandler) {
      app.globalData.socketManager.removeMessageHandler(this.messageHandler);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMessages().then(() => {
      wx.stopPullDownRefresh();
        });
  },

  // 点击会话
  onTapChat(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/chat/detail/index?targetId=${id}`
    });
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 今天的消息只显示时间
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }

    // 一周内的消息显示星期几
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      return `星期${days[date.getDay()]}`;
    }

    // 更早的消息显示完整日期
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }
}); 
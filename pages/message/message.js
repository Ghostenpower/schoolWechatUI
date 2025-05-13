const app = getApp()

Page({
  data: {
    messages: [],
    userId: null,
    userInfoMap: new Map(),
    isLoading: false
  },

  onLoad() {
    // 获取用户ID
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.userId) {
      this.setData({ userId: userInfo.userId });
      this.setupSocketListeners();
      this.loadMessages();
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
  },

  // 设置Socket监听器
  setupSocketListeners() {
    const socketManager = app.globalData.socketManager;
    
    // 监听新消息
    socketManager.on('newMessage', (data) => {
      // 收到新消息时更新列表
      this.loadMessages();
      // 播放提示音
      this.playMessageSound();
    });

    // 监听聊天列表更新
    socketManager.on('chatListUpdated', (data) => {
      // 直接更新聊天列表
      this.updateChatList(data);
    });

    // 监听未读数量更新
    socketManager.on('unreadCountUpdated', (data) => {
      // 更新特定用户的未读数量
      this.updateUnreadCount(data.fromUserId, data.unreadCount);
    });
  },

  // 播放消息提示音
  playMessageSound() {
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = '/static/message.mp3';
    innerAudioContext.play();
  },

  // 加载消息列表
  async loadMessages() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `http://localhost:3000/chat-users/${this.data.userId}`,
          method: 'GET',
          success: resolve,
          fail: reject
        });
      });

      console.log('服务器返回的完整响应:', res);

      if (!res || !res.data) {
        throw new Error('返回数据为空');
      }

      if (res.statusCode === 200) {
        const chatList = res.data;
        if (!Array.isArray(chatList)) {
          throw new Error('返回数据格式错误，期望数组类型');
        }
        console.log('开始处理聊天列表数据:', chatList);
        await this.updateChatList(chatList);
        console.log('聊天列表更新完成');
      } else {
        throw new Error(`请求失败: ${res.statusCode}`);
      }
    } catch (err) {
      console.error('获取消息列表失败:', err);
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

  // 更新聊天列表
  async updateChatList(chatList) {
    try {
      console.log('开始处理每个聊天项');
      const messages = await Promise.all(chatList.map(async (item) => {
        console.log('处理聊天项:', item);
        const userInfo = await this.loadUserInfo(item.userId);
        console.log('获取到用户信息:', userInfo);
        
        return {
          id: item.userId,
          name: userInfo ? userInfo.username : `用户${item.userId}`,
          avatar: userInfo && userInfo.avatarUrl ? userInfo.avatarUrl : '/assets/images/default-avatar.png',
          lastMessage: item.lastMessage ? item.lastMessage.content : '',
          timestamp: item.lastMessageTime ? new Date(item.lastMessageTime).getTime() : 0,
          time: item.lastMessageTime ? this.formatTime(item.lastMessageTime) : '',
          unread: item.unreadCount || 0
        };
      }));

      console.log('处理后的消息列表:', messages);
      this.setData({ messages });
    } catch (error) {
      console.error('更新聊天列表失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  // 更新未读消息数量
  updateUnreadCount(fromUserId, unreadCount) {
    const messages = this.data.messages.map(msg => {
      if (msg.id === fromUserId) {
        return { ...msg, unread: unreadCount };
      }
      return msg;
    });
    this.setData({ messages });
  },

  // 加载用户信息
  async loadUserInfo(userId) {
    if (this.data.userInfoMap[userId]) {
      console.log('使用缓存的用户信息:', userId);
      return this.data.userInfoMap[userId];
    }

    try {
      console.log('开始请求用户信息:', userId);
      const result = await new Promise((resolve, reject) => {
        wx.request({
          url: `http://localhost:8051/api/users/getOneById`,
          method: 'GET',
          header: {
            'token': wx.getStorageSync('token')
          },
          data: {
            userId: userId
          },
          success: (res) => {
            console.log('原始响应:', res);
            resolve(res);
          },
          fail: (error) => {
            console.error('请求失败:', error);
            reject(error);
          }
        });
      });

      // 检查响应格式
      if (result && result.data && result.data.code === 1 && result.data.data) {
        const userInfo = result.data.data;
        // 使用对象更新的方式更新 Map
        const userInfoMap = { ...this.data.userInfoMap };
        userInfoMap[userId] = userInfo;
        this.setData({ userInfoMap });
        return userInfo;
      }

      console.warn('无效的用户信息响应:', result);
      return this.getDefaultUserInfo(userId);
    } catch (err) {
      console.error('请求用户信息失败:', err);
      return this.getDefaultUserInfo(userId);
    }
  },

  // 获取默认用户信息
  getDefaultUserInfo(userId) {
    return {
      username: `用户${userId}`,
      avatarUrl: '/assets/images/default-avatar.png'
    };
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) { // 1分钟内
      return '刚刚';
    } else if (diff < 60 * 60 * 1000) { // 1小时内
      return `${Math.floor(diff / (60 * 1000))}分钟前`;
    } else if (diff < 24 * 60 * 60 * 1000) { // 24小时内
      return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
    } else if (diff < 7 * 24 * 60 * 60 * 1000) { // 7天内
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      return `星期${days[date.getDay()]}`;
    } else if (now.getFullYear() === date.getFullYear()) { // 同年
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    } else {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
  },

  // 点击消息项
  onTapMessage(e) {
    const id = e.currentTarget.dataset.id;
    // 标记消息为已读
    this.markMessagesAsRead(id);
    // 导航到聊天页面
    wx.navigateTo({
      url: `/pages/chat/detail/index?targetId=${id}`
    });
  },

  // 标记消息为已读
  markMessagesAsRead(fromUserId) {
    app.globalData.socketManager.send('markAsRead', {
      userId: this.data.userId,
      fromUserId: fromUserId
    });
  },

  onShow() {
    // 页面显示时刷新消息列表
    if (this.data.userId) {
      this.loadMessages();
    }
  },

  onUnload() {
    // 移除事件监听器
    const socketManager = app.globalData.socketManager;
    socketManager.off('newMessage');
    socketManager.off('chatListUpdated');
    socketManager.off('unreadCountUpdated');
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMessages().then(() => {
      wx.stopPullDownRefresh();
    });
  }
}) 
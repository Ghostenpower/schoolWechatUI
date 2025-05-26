const app = getApp()
const socketManager = require('../../utils/socketManager')

// 添加sleep函数，用于延时
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Page({
  data: {
    messages: [],
    userId: null,
    isLoading: false,
    error: null,
    refreshInterval: 3000, // 刷新间隔，默认3秒
    lastRefreshTime: 0
  },

  async loadMessages() {
    // 如果正在加载，避免重复请求
    if (this.data.isLoading) return;

    this.setData({
      isLoading: true,
      error: null
    });

    try {
      const chatUrl = app.globalData.chatUrl;
      const userId = wx.getStorageSync('userInfo').userId;

      // 使用Promise包装wx.request
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${chatUrl}/api/getChatList`,
          method: 'POST',
          data: { userId },
          header: {
            'content-type': 'application/json'
          },
          success: (res) => resolve(res.data),
          fail: (err) => reject(err)
        });
      });

      if (response.code === 1 && response.data && response.data.chatList) {
        // 获取第一个用户的聊天列表（因为返回格式是数组，但我们只需要当前用户的）
        const userChatList = response.data.chatList[0]?.chatList || [];

        // 格式化消息列表
        const formattedMessages = userChatList.map(chat => ({
          id: chat.otherId,
          name: chat.otherName,
          avatar: chat.otherAvatar || '/assets/images/default-avatar.png',
          lastMessage: chat.lastMessage,
          unReadCount: chat.unReadCount,
          time: this.formatTime(chat.lastMessageTime),
          lastMessageTime: chat.lastMessageTime // 保留原始时间戳用于比较
        }));

        // 准备更新数据
        const currentMessages = this.data.messages;
        const updatedData = {};
        let hasChanges = false;

        // 创建当前消息的映射
        const currentMessagesMap = {};
        for (let i = 0; i < currentMessages.length; i++) {
          const msg = currentMessages[i];
          currentMessagesMap[msg.id] = {
            msg: msg,
            index: i
          };
        }

        // 检查新消息是否需要更新
        const newMessages = [];
        for (let i = 0; i < formattedMessages.length; i++) {
          const newMsg = formattedMessages[i];
          const current = currentMessagesMap[newMsg.id];

          if (current) {
            // 消息已存在，检查是否有变化
            const oldMsg = current.msg;
            const needsUpdate =
              newMsg.lastMessage !== oldMsg.lastMessage ||
              newMsg.unReadCount !== oldMsg.unReadCount ||
              newMsg.lastMessageTime !== oldMsg.lastMessageTime ||
              newMsg.name !== oldMsg.name ||
              newMsg.avatar !== oldMsg.avatar;

            if (needsUpdate) {
              // 只更新发生变化的特定消息项
              updatedData[`messages[${current.index}]`] = newMsg;
              hasChanges = true;
            }

            // 保留在新列表中，保持原来的顺序
            newMessages.push(current.index);
          } else {
            // 新消息，需要添加
            newMessages.push(-1); // 标记为新消息
            hasChanges = true;
          }
        }

        // 检查是否有消息被删除或顺序变化
        if (formattedMessages.length !== currentMessages.length) {
          hasChanges = true;
        }

        // 如果有变化，更新UI
        if (hasChanges) {
          // 如果消息数量或顺序变化，需要完全替换列表
          if (formattedMessages.length !== currentMessages.length || newMessages.some((idx, i) => idx !== i && idx !== -1)) {
            updatedData.messages = formattedMessages;
          }

          // 应用所有更新
          this.setData(updatedData);
        }

        // 无论数据是否变化，都更新加载状态和刷新时间
        this.setData({
          isLoading: false,
          lastRefreshTime: Date.now()
        });
      } else {
        throw new Error(response.message || '获取消息列表失败');
      }
    } catch (error) {
      console.error('加载消息列表失败:', error);
      this.setData({
        error: error.message || '加载消息列表失败，请稍后重试',
        isLoading: false
      });
    }
  },

  // 启动定时刷新
  startRefreshTimer() {
    // 清除可能存在的旧定时器
    this.clearRefreshTimer();

    // 创建新定时器
    this.refreshTimer = setInterval(() => {
      this.loadMessages();
    }, this.data.refreshInterval);

  },

  // 清除定时刷新
  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  onLoad() {
    const userId = wx.getStorageSync('userInfo').userId;
    this.setData({ userId });

    // 初始加载消息列表
    this.loadMessages();

    // 启动定时刷新
    this.startRefreshTimer();

    // 添加消息处理器，用于实时更新消息列表
    this.messageHandler = (message) => {
      // 收到新消息时刷新列表
      const now = Date.now();
      // 限制刷新频率，至少间隔5秒
      if (now - this.data.lastRefreshTime > 5000) {
        this.loadMessages();
      }
    };

    // 注册消息处理器
    socketManager.addMessageHandler(this.messageHandler);
  },

  onShow() {
    
    //刷新列表
    this.loadMessages();

    // 恢复定时器
    this.startRefreshTimer();
  },

  onHide() {
    // 页面隐藏时记录时间，并暂停定时器
    this.setData({
      lastRefreshTime: Date.now()
    });

    // 暂停定时器
    this.clearRefreshTimer();
  },

  onUnload() {
    // 页面卸载时清除定时器和消息处理器
    this.clearRefreshTimer();

    // 移除消息处理器
    if (this.messageHandler) {
      socketManager.removeMessageHandler(this.messageHandler);
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
    
    // 在导航前暂停定时器
    this.clearRefreshTimer();
    
    wx.navigateTo({
      url: `/pages/chat/detail/index?targetId=${id}`
    });
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';

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
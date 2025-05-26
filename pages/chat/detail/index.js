const app = getApp()
const socketManager = require('../../../utils/socketManager')

Page({
  data: {
    messages: [],
    inputMessage: '',
    userId: '',
    targetId: '',
    userInfo: null,
    targetInfo: null,
    scrollIntoView: null,
    isLoading: false,
    currentPage: 1,
    hasMore: true,
    pageSize: 10,
    headerHeight: 0
  },

  onLoad(options) {
    const userId = (options.userId || wx.getStorageSync('userInfo').userId).toString()
    const targetId = options.targetId.toString()

    this.setData({
      userId,
      targetId
    })

    // 获取系统信息，调整页面布局
    wx.getSystemInfo({
      success: (res) => {
        // 计算安全区域，适配不同机型
        const { statusBarHeight, screenHeight } = res;
        const headerHeight = statusBarHeight + 44; // 状态栏 + 导航栏高度
        
        this.setData({
          headerHeight
        });
      }
    });

    // 获取用户信息
    this.loadUserInfo(userId, 'userInfo')
    this.loadUserInfo(targetId, 'targetInfo')

    // 添加消息处理器
    this.messageHandler = (message) => {
      console.log('收到消息:', message);
      
      // 只处理与当前聊天相关的消息
      if (message.senderId.toString() === this.data.targetId || 
          message.receiverId.toString() === this.data.targetId) {
        
        // 构建本地消息对象
        const newMessage = {
          type: message.type,
          senderId: message.senderId.toString(),
          receiverId: message.receiverId.toString(),
          content: message.content,
          timestamp: new Date().toISOString(),
          isSelf: message.senderId.toString() === this.data.userId,
          read: false
        };

        const { messages } = this.data;
        messages.push(newMessage);

        this.setData({
          messages
        }, () => {
          // 滚动到最新消息
          this.scrollToBottom();
        });

        // 如果消息是从对方发来的，发送已读状态
        if (message.senderId.toString() === this.data.targetId) {
          // 发送已读状态到服务器
          socketManager.sendReadStatus(this.data.userId, this.data.targetId);
        }
      }
    };

    // 添加消息已读处理器
    this.messageHandler.onMessageRead = (userId, otherId) => {
      
      // 确保类型转换为字符串进行比较
      userId = userId.toString();
      otherId = otherId.toString();
      
      // 如果当前聊天对象已读了我的消息（我是otherId）
      if (userId === this.data.userId && otherId === this.data.targetId) {
        console.log('更新消息已读状态');
        
        // 更新所有消息为已读
        const { messages } = this.data;
        const updatedMessages = messages.map(msg => {
          // 只更新我发送的消息
          if (msg.isSelf) {
            return { ...msg, read: true };
          }
          return msg;
        });
        
        this.setData({ messages: updatedMessages });
      }
    };

    // 注册消息处理器
    socketManager.addMessageHandler(this.messageHandler)

    // 连接WebSocket
    socketManager.connect(userId)

    // 发送已读状态
    socketManager.sendReadStatus(userId, targetId)

    // 加载历史消息
    this.loadHistoryMessages()
  },

  onShow() {
    this.loadHistoryMessages()
  },

  // 加载用户信息
  async loadUserInfo(userId, key) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.chatUrl}/api/getUserInfo`,
          method: 'POST',
          header: {
            'content-type': 'application/json'
          },
          data: {
            userId: userId.toString()
          },
          success: (res) => resolve(res),
          fail: (error) => reject(error)
        });
      });

      if (response.data.code === 1 && response.data.data.userInfo) {
        this.setData({
          [key]: response.data.data.userInfo
        });
      } else {
        console.error('获取用户信息失败:', response.data.message);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  // 加载历史消息
  async loadHistoryMessages() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });

    try {
      // 记录当前第一条消息作为锚点
      const anchorMessage = this.data.messages.length > 0 ? this.data.messages[0] : null;
      const isFirstLoad = this.data.currentPage === 1 && this.data.messages.length === 0;
      
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.chatUrl}/api/getHistoryRecord`,
          method: 'POST',
          header: {
            'content-type': 'application/json'
          },
          data: {
            userId: this.data.userId.toString(),
            otherId: this.data.targetId.toString(),
            page: this.data.currentPage,
            limit: this.data.pageSize
          },
          success: (res) => {
            console.log('历史消息响应:', res);
            resolve(res);
          },
          fail: (error) => {
            console.error('请求失败:', error);
            reject(error);
          }
        });
      });

      // 检查响应数据
      const responseData = response.data;
      if (!responseData) {
        throw new Error('No data received from server');
      }

      if (responseData.code === 1) {
        const historyMessages = (responseData.data.historyRecord || []).map(msg => ({
          ...msg,
          isSelf: msg.senderId.toString() === this.data.userId
        }));

        // 更新消息列表，将新消息添加到列表前面
        const updatedMessages = [...historyMessages, ...this.data.messages];
        
        this.setData({
          messages: updatedMessages,
          hasMore: historyMessages.length === this.data.pageSize
        }, () => {
          // 如果是首次加载，滚动到底部
          if (isFirstLoad) {
            this.scrollToBottom();
          } 
          // 如果是加载更多历史消息，滚动到锚点位置
          else if (anchorMessage && historyMessages.length > 0) {
            // 计算锚点消息在新列表中的索引
            const anchorIndex = historyMessages.length;
            
            // 使用延时确保DOM已更新
            setTimeout(() => {
              this.setData({
                scrollIntoView: `msg-${anchorIndex}`
              });
            }, 100);
          }
        });
      } else {
        throw new Error(responseData.message || '加载历史消息失败');
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
      wx.showToast({
        title: error.message || '加载历史消息失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 滚动到底部
  scrollToBottom() {
    if (this.data.messages.length === 0) return;
    
    setTimeout(() => {
      this.setData({
        scrollIntoView: `msg-${this.data.messages.length - 1}`
      });
    }, 100);
  },

  // 发送消息
  sendMessage(content) {
    if (!content.trim()) return;

    // 创建要发送的消息对象
    const message = {
      fromId: this.data.userId.toString(),
      toId: this.data.targetId.toString(),
      content: content.trim()
    };

    // 添加消息到本地列表
    const localMessage = {
      type: 'message',
      senderId: this.data.userId.toString(),
      receiverId: this.data.targetId.toString(),
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isSelf: true,
      read: false // 初始状态为未读
    };

    const { messages } = this.data;
    messages.push(localMessage);

    // 更新UI
    this.setData({
      messages,
      inputMessage: '' // 清空输入框
    }, () => {
      // 滚动到最新消息
      this.scrollToBottom();
    });

    // 使用socketManager发送消息
    socketManager.send(message);
  },

  // 处理输入框内容变化
  handleInputChange(e) {
    const value = e.detail.value;
    this.setData({
      inputMessage: value
    });
  },

  // 处理发送按钮点击
  handleSendMessage() {
    const { inputMessage } = this.data;
    const trimmedMessage = inputMessage.trim();
    if (trimmedMessage) {
      this.sendMessage(trimmedMessage);
    }
  },

  // 下拉加载更多历史消息
  onPullDownRefresh() {
    if (this.data.hasMore && !this.data.isLoading) {
      // 增加页码
      this.setData({
        currentPage: this.data.currentPage + 1
      }, () => {
        // 加载更多历史消息
        this.loadHistoryMessages();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onUnload() {
    // 移除消息处理器
    if (this.messageHandler) {
      socketManager.removeMessageHandler(this.messageHandler)
    }
  }
}) 

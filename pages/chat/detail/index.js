Page({
  data: {
    messages: [
      {
        content: '你好，请问包裹在哪里取？',
        timestamp: '14:25',
        isSelf: false
      },
      {
        content: '在快递驿站3号柜，取件码是A1234',
        timestamp: '14:26',
        isSelf: true
      },
      {
        content: '好的，我现在过去取',
        timestamp: '14:26',
        isSelf: false
      },
      {
        content: '请帮我放在宿舍楼下的快递柜就可以了',
        timestamp: '14:27',
        isSelf: true
      },
      {
        content: '收到，马上去取',
        timestamp: '14:28',
        isSelf: false
      }
    ],
    inputValue: '',
    otherUser: null,
    pageSize: 20,
    currentPage: 1,
    hasMore: true,
    lastMessageId: null
  },

  onLoad: function(options) {
    if (options.userId) {
      this.setData({
        otherUser: {
          id: options.userId,
          avatar: options.avatar || '/images/default-avatar.png',
          nickname: options.nickname ? decodeURIComponent(options.nickname) : '用户'
        },
        // 设置最后一条消息的ID，用于自动滚动到底部
        lastMessageId: 'msg-' + this.data.messages.length
      });
    }
  },

  onShow: function() {
    // 标记消息为已读
    this.markMessagesAsRead();
    // 滚动到最新消息
    this.scrollToBottom();
  },

  scrollToBottom: function() {
    // 滚动到最新消息
    wx.createSelectorQuery()
      .select('.message-list')
      .node()
      .exec((res) => {
        const scrollView = res[0].node;
        scrollView.scrollIntoView({
          selector: '.message-item:last-child',
          animated: true
        });
      });
  },

  loadMessages: function() {
    if (!this.data.hasMore) return;
    
    const that = this;
    wx.showLoading({
      title: '加载中...'
    });

    // TODO: 替换为实际的API调用
    wx.request({
      url: 'YOUR_API_URL/messages',
      data: {
        otherUserId: that.data.otherUser.id,
        page: that.data.currentPage,
        pageSize: that.data.pageSize
      },
      success: function(res) {
        if (res.data.success) {
          const newMessages = res.data.messages;
          that.setData({
            messages: [...that.data.messages, ...newMessages],
            currentPage: that.data.currentPage + 1,
            hasMore: newMessages.length === that.data.pageSize
          });
        }
      },
      complete: function() {
        wx.hideLoading();
      }
    });
  },

  onLoadMore: function() {
    this.loadMessages();
  },

  markMessagesAsRead: function() {
    // TODO: 实现消息已读状态更新
    wx.request({
      url: 'YOUR_API_URL/messages/read',
      method: 'POST',
      data: {
        otherUserId: this.data.otherUser.id
      }
    });
  },

  onInputChange: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  onSendMessage: function() {
    if (!this.data.inputValue.trim()) return;

    const message = {
      content: this.data.inputValue,
      timestamp: this.formatTime(new Date()),
      isSelf: true
    };

    this.setData({
      messages: [...this.data.messages, message],
      inputValue: '',
      lastMessageId: 'msg-' + (this.data.messages.length + 1)
    });

    // 发送后自动滚动到底部
    this.scrollToBottom();
  },

  formatTime: function(date) {
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
  }
}); 
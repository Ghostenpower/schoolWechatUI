Page({
  data: {
    messages: [
      {
        id: 1,
        avatar: '/images/default-avatar.png',
        name: '张三',
        lastMessage: '好的，我马上去取',
        time: '10:30',
        userId: '001'
      },
      {
        id: 2,
        avatar: '/images/default-avatar.png',
        name: '李四',
        lastMessage: '请问包裹在哪里取？',
        time: '09:15',
        userId: '002'
      }
    ]
  },

  onLoad: function(options) {
    // 页面加载时获取消息列表
    this.getMessageList()
  },

  onReady() {
    // 页面初次渲染完成时执行
  },

  onShow: function() {
    // 页面显示时刷新消息列表
    this.getMessageList()
  },

  onHide: function() {
    // 页面隐藏时执行
  },

  onUnload: function() {
    // 页面卸载时执行
  },

  getMessageList: function() {
    // TODO: 从服务器获取最新消息列表
    // wx.request({
    //   url: 'your-api-url/messages',
    //   success: (res) => {
    //     this.setData({
    //       messages: res.data
    //     })
    //   }
    // })
  },

  onTapMessage: function(e) {
    const messageId = e.currentTarget.dataset.id
    const message = this.data.messages.find(msg => msg.id === messageId)
    
    if (message) {
      // 不对头像路径进行 encodeURIComponent，只对中文名称进行编码
      wx.navigateTo({
        url: `/pages/chat/detail/index?userId=${message.userId}&avatar=${message.avatar}&nickname=${encodeURIComponent(message.name)}`
      })
    }
  }
}) 
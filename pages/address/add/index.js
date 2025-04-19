Page({
  data: {
    address: {
      name: '',
      phone: '',
      location: '',
      detail: '',
      tag: '',
      isDefault: false
    }
  },

  onLoad(options) {
    // TODO: 处理页面加载逻辑
  },

  onSave() {
    // TODO: 处理保存地址逻辑
    wx.navigateBack()
  }
}) 
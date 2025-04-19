Page({
  data: {
    addressList: [],
    isSelectMode: false
  },

  onLoad(options) {
    // TODO: 处理页面加载逻辑
    this.setData({
      isSelectMode: options.select === 'true'
    })
  },

  onShow() {
    // TODO: 获取地址列表
  },

  onAddAddress() {
    wx.navigateTo({
      url: '/pages/address/add/index'
    })
  },

  onEditAddress(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/address/add/index?id=${id}`
    })
  },

  onSelectAddress(e) {
    if (!this.data.isSelectMode) return
    const address = e.currentTarget.dataset.item
    // TODO: 处理地址选择逻辑
    wx.navigateBack()
  }
}) 
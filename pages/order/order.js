// pages/order/order.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    tabs: ['全部', '进行中', '已完成'],
    orders: [
      {
        id: 1,
        type: 'express',
        title: '快递代取',
        status: 'processing', // pending_payment, processing, completed
        createTime: '2024-03-20 14:30',
        amount: 5.00,
        details: {
          pickupLocation: '菜鸟驿站',
          deliveryLocation: '6号宿舍楼',
          expectedTime: '2024-03-20 17:30',
          courierName: '李四',
          courierPhone: '13800138000'
        }
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // TODO: 获取订单列表
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index
    })
    // TODO: 根据标签获取对应的订单列表
  },

  // 查看订单详情
  onViewOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${id}`
    })
  },

  // 支付订单
  onPayOrder(e) {
    const id = e.currentTarget.dataset.id
    // TODO: 调用支付接口
    wx.showToast({
      title: '支付成功',
      icon: 'success'
    })
  },

  // 确认完成
  onConfirmComplete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用完成订单接口
          wx.showToast({
            title: '订单已完成',
            icon: 'success'
          })
        }
      }
    })
  },

  // 格式化金额
  formatAmount(amount) {
    return amount.toFixed(2)
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending_payment': '待付款',
      'processing': '进行中',
      'completed': '已完成'
    }
    return statusMap[status] || status
  }
})
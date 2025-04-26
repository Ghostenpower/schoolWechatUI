// pages/profile/profile.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      avatarUrl: '',
      username: '',
      phone: ''
    },
    hasUserInfo: false,
    stats: {
      orderCount: 0,
      balance: '0.00'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取用户信息
    this.getUserInfo()

    // 获取用户统计数据
    this.getUserStats()
  },

  refreshData() {
    // 刷新用户信息和统计数据
    console.log('正在刷新数据...')
    this.getUserInfo()
    this.getUserStats()
    console.log('数据已刷新')
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('token')
          this.data.userInfo = {
            avatarUrl: '',
            username: '',
            phone: ''
          }
          this.hasUserInfo = false

          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 2000
          })
          this.refreshData()
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  getUserInfo() {
    // 检查是否已经登录
    let userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: {
          avatarUrl: userInfo.avatarUrl || '/images/default-avatar.png',
          username: userInfo.username || '未设置',
          phone: userInfo.phone || '未设置',
          balance: userInfo.balance || '0.00'
        },
        hasUserInfo: true
      })
    } else {
      this.setData({
        userInfo: {
          avatarUrl: '',
          username: '',
          phone: ''
        },
        hasUserInfo: false
      })
      console.log('用户未登录或信息不完整')
    }
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

  // 获取用户信息
  getUserProfile() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 获取用户统计数据
  getUserStats() {
    // TODO: 调用后端接口获取用户统计数据
    // wx.request({
    //   url: `${app.globalData.baseUrl}/api/user/stats`,
    //   success: (res) => {
    //     this.setData({
    //       stats: res.data
    //     })
    //   }
    // })
  },

  // 页面跳转
  navigateTo(e) {
    const url = e.currentTarget.dataset.url
    wx.navigateTo({
      url: url
    })
  },

  // 跳转到地址列表
  onNavigateToAddress() {
    wx.navigateTo({
      url: '/pages/address/list/index'
    })
  },

  onNavigateToWallet() {
    wx.navigateTo({
      url: '/pages/wallet/wallet'
    })
  },

  // 跳转到个人资料页面
  onNavigateToUserInfo() {
    wx.navigateTo({
      url: '/pages/user/info/index'
    })
  },

  // 跳转到我的任务
  onNavigateToMyTasks() {
    wx.navigateTo({
      url: '/pages/tasks/my/index'
    })
  },

  // 跳转到我的订单
  onNavigateToMyOrders() {
    wx.navigateTo({
      url: '/pages/order/list/index'
    })
  }
})
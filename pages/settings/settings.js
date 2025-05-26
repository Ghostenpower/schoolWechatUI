// pages/settings/settings.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    version: '1.0.0',
    cacheSize: '0KB'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getCacheSize()
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

  // 获取缓存大小
  async getCacheSize() {
    try {
      const res = await wx.getStorageInfo()
      const size = (res.currentSize / 1024).toFixed(2)
      this.setData({
        cacheSize: size + 'KB'
      })
    } catch (error) {
      console.error('获取缓存大小失败', error)
    }
  },

  // 清除缓存
  onClearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.clearStorage()
            this.setData({
              cacheSize: '0KB'
            })
            wx.showToast({
              title: '清除成功',
              icon: 'success'
            })
          } catch (error) {
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 检查更新
  onCheckUpdate() {
    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      } else {
        wx.showToast({
          title: '已是最新版本',
          icon: 'success'
        })
      }
    })
  },

  // 隐私政策
  onPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/index'
    })
  },

  // 用户协议
  onUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/index'
    })
  },

  // 关于我们
  onAboutUs() {
    wx.navigateTo({
      url: '/pages/about/index'
    })
  }
})
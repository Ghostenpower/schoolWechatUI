// app.js
App({
  globalData: {
    userInfo: null,
    baseUrl: 'https://your-api-domain.com' // 替换为你的后端API地址
  },
  onLaunch() {
    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  }
})

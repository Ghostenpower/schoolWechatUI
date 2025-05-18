// app.js
const socketManager = require('./utils/socketManager');

App({
  globalData: {
    userInfo: null,
    baseUrl: 'http://run-backend.megajam.online', // API基础URL http://run-backend.megajam.online
    wsUrl: 'ws://campu_run_chat.megajam.online', // WebSocket服务器URL
    token: null,
    socketManager: socketManager // 添加socketManager到globalData
  },

  onLaunch() {
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      if (res.isConnected) {
        // 网络恢复时，如果有用户信息则重新连接socket
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.userId) {
          socketManager.connect(userInfo.userId);
        }
      }
    });

    // 初始化应用时运行的代码
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }

    // 获取用户信息并初始化socket连接
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.userId) {
      this.globalData.userInfo = userInfo;
      socketManager.connect(userInfo.userId);
    }
  },

  // 用户登录成功后调用
  onLoginSuccess(userInfo) {
    // 保存用户信息
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
    
    // 初始化socket连接
    socketManager.connect(userInfo.userId);
  },

  // 用户登出时调用
  onLogout() {
    // 清除用户信息
    this.globalData.userInfo = null;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    
    // 清理socket连接
    socketManager.cleanup();
  },

  // 封装请求方法
  request(options) {
    const { url, method = 'GET', data, header = {} } = options;
    const token = wx.getStorageSync('token');
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + url,
        method,
        data,
        header: {
          'token': token,
          ...header
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // token失效，清除登录状态
            this.onLogout();
            wx.navigateTo({
              url: '/pages/login/login'
            });
            reject(new Error('登录已过期，请重新登录'));
          } else {
            reject(res);
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
})

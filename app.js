// app.js
App({
  globalData: {
    userInfo: null,
    baseUrl: 'http://localhost:8051', // API基础URL
    token: null
  },

  onLaunch() {
    // 初始化应用时运行的代码
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
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

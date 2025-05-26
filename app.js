// app.js
const config = require('./config/index')

App({
  globalData: {
    userInfo: null,
    baseUrl: config.apiUrl,
    chatUrl: config.chatUrl,
    wsUrl: config.wsUrl,
    token: null,
    unReadCount: 0,  // 未读消息总数
    currentTabIndex: 0  // 当前选中的TabBar索引
  },

  onLaunch() {
    // 初始化应用时运行的代码
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      
      // 启动未读消息检查定时器
      this.startUnreadMessageTimer();
    }
  },
  
  // 启动未读消息检查定时器
  startUnreadMessageTimer() {
    // 先清除可能存在的旧定时器
    if (this.unreadMessageTimer) {
      clearInterval(this.unreadMessageTimer);
    }
    
    // 设置定时器定期检查未读消息
    this.unreadMessageTimer = setInterval(() => {
      this.checkUnreadMessages();
    }, 3000); // 每3秒检查一次
    
    // 立即检查一次未读消息
    this.checkUnreadMessages();
  },
  
  // 检查未读消息
  checkUnreadMessages() {
    const userInfo = this.globalData.userInfo;
    if (!userInfo || !userInfo.userId) return;
    
    // 确保userId是字符串
    const userId = String(userInfo.userId);
    
    // 创建FormData对象
    const formData = {
      userId: userId
    };
    
    wx.request({
      url: `${this.globalData.chatUrl}/api/getUnReadCount`,
      method: 'POST',
      data: formData,
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.data && res.data.code === 1) {
          const unReadCount = res.data.data.unReadCount || 0;
          
          // 更新全局未读消息数
          this.globalData.unReadCount = unReadCount;
          
          // 更新TabBar的消息角标
          if (unReadCount > 0) {
            wx.setTabBarBadge({
              index: 2, // 消息选项卡的索引，第三个标签页
              text: unReadCount > 99 ? '99+' : unReadCount.toString()
            }).catch(err => {
              // 可能由于页面未准备好等原因导致设置失败，这里忽略错误
            });
          } else {
            // 如果没有未读消息，移除角标
            wx.removeTabBarBadge({
              index: 2 // 消息选项卡的索引，第三个标签页
            }).catch(err => {
              // 忽略错误
            });
          }
        }
      },
      fail: (err) => {
        console.error('获取未读消息数失败', err);
      }
    });
  },

  // 用户登录成功后调用
  onLoginSuccess(userInfo) {
    // 保存用户信息
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
    
    // 启动未读消息检查定时器
    this.startUnreadMessageTimer();
  },

  // 用户登出时调用
  onLogout() {
    // 清除用户信息
    this.globalData.userInfo = null;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    
    // 清除未读消息定时器
    if (this.unreadMessageTimer) {
      clearInterval(this.unreadMessageTimer);
      this.unreadMessageTimer = null;
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

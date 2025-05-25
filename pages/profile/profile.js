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
    },
    userRole: '普通用户'
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
    this.getUserInfo()
    this.getUserStats()
    this.checkUserRole()
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
    this.refreshData();
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
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.userId) {
      this.setData({
        'stats.orderCount': 0,
        'stats.balance': '0.00'
      });
      return;
    }

    // 获取订单数量
    wx.request({
      url: `${app.globalData.baseUrl}/api/orders/getOrderCountByUser`,
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 1) {
          this.setData({
            'stats.orderCount': res.data.data || 0
          });
        } else {
          console.error('获取订单数量失败:', res.data.msg);
          this.setData({
            'stats.orderCount': 0
          });
        }
      },
      fail: (err) => {
        console.error('获取订单数量请求失败:', err);
        this.setData({
          'stats.orderCount': 0
        });
      }
    });

    // 获取用户余额
    wx.request({
      url: `${app.globalData.baseUrl}/api/users/getOneById?userId=${userInfo.userId}`,
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          const balance = (res.data.data.balance || 0).toFixed(2);
          this.setData({
            'stats.balance': balance
          });
        } else {
          console.error('获取用户余额失败:', res.data.msg);
          this.setData({
            'stats.balance': '0.00'
          });
        }
      },
      fail: (err) => {
        console.error('获取用户余额请求失败:', err);
        this.setData({
          'stats.balance': '0.00'
        });
      }
    });
  },

  // 新增：检查用户角色（是否为跑腿员）
  checkUserRole() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ userRole: '普通用户' });
      return;
    }

    wx.request({
      url: `${app.globalData.baseUrl}/api/couriers/getCourierId`,
      method: 'GET',
      header: {
        'token': token
      },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          // 如果返回成功且有数据，说明是跑腿员
          this.setData({ userRole: '跑腿员' });
        } else {
          // 否则是普通用户（包括接口返回错误或跑腿员不存在）
          this.setData({ userRole: '普通用户' });
        }
      },
      fail: (err) => {
        console.error('检查用户角色请求失败:', err);
        // 网络错误或其他失败情况，默认为普通用户
        this.setData({ userRole: '普通用户' });
      }
    });
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
      url: '/pages/order/myorder/myorder'
    })
  },

  // 跳转到注册骑手页面
  onNavigateToRiderRegister() {
    wx.navigateTo({
      url: '/pages/rider/register/register'
    })
  },

  // 跳转：点击订单数
  onOrderCountTap() {
    wx.navigateTo({
      url: '/pages/order/myorder/myorder'
    })
  },

  // 跳转：点击余额
  onBalanceTap() {
    wx.navigateTo({
      url: '/pages/wallet/wallet'
    })
  },
})
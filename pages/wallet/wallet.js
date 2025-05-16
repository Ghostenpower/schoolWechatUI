const app = getApp()

Page({
  data: {
    balance: '0.00',
    transactions: [],
    showRechargeModal: false,
    rechargeAmount: ''
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.userId) {
      wx.request({
        url: `${app.globalData.baseUrl}/api/users/getOneById?userId=${userInfo.userId}`,
        method: 'GET',
        header: {
          'token': wx.getStorageSync('token')
        },
        success: (res) => {
          if (res.data.code === 1 && res.data.data) {
            const balance = (res.data.data.balance || 0).toFixed(2);
            this.setData({ balance });
          } else {
            wx.showToast({ title: res.data.msg || '获取失败', icon: 'none' });
          }
        },
        fail: () => {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      });
    } else {
      this.setData({ balance: '0.00' });
    }
  },

  // 加载钱包信息
  async loadWalletInfo() {
    try {
      const res = await wx.request({
        url: `http://localhost:8051/api/wallet/info`,
        method: 'GET',
        header: {
          'Authorization': wx.getStorageSync('token')
        }
      })

      if (res.statusCode === 200) {
        this.setData({
          balance: res.data.data.balance,
          transactions: res.data.data.transactions.map(item => ({
            ...item,
            createTime: this.formatTime(item.createTime)
          }))
        })
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 格式化时间
  formatTime(dateStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 打开充值弹窗
  onRecharge() {
    this.setData({
      showRechargeModal: true,
      rechargeAmount: ''
    })
  },

  // 关闭充值弹窗
  closeRechargeModal() {
    this.setData({
      showRechargeModal: false
    })
  },

  // 充值金额输入
  onRechargeInput(e) {
    this.setData({
      rechargeAmount: e.detail.value
    })
  },

  // 选择快捷金额
  selectAmount(e) {
    const amount = e.currentTarget.dataset.amount
    this.setData({
      rechargeAmount: amount
    })
  },

  // 确认充值
  async confirmRecharge() {
    const amount = parseFloat(this.data.rechargeAmount)
    if (!amount || amount <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/users/recharge`,
          method: 'POST',
          data: {
            balance: amount
          },
          header: {
            'token': wx.getStorageSync('token'),
            'content-type': 'application/json'
          },
          success: resolve,
          fail: reject
        })
      })

      if (res.data.code === 1) {
        wx.showToast({
          title: '充值成功',
          icon: 'success'
        })
        this.closeRechargeModal()
        this.onLoad()
      } else {
        wx.showToast({
          title: res.data.msg || '充值失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.showToast({
        title: '充值失败',
        icon: 'none'
      })
    }
  },

  // 提现弹窗
  onWithdraw() {
    wx.showModal({
      title: '提现',
      content: '',
      editable: true,
      placeholderText: '请输入提现金额',
      success: (res) => {
        if (res.confirm && res.content) {
          const amount = parseFloat(res.content)
          if (!amount || amount <= 0) {
            wx.showToast({
              title: '请输入有效金额',
              icon: 'none'
            })
            return
          }
          wx.request({
            url: `${app.globalData.baseUrl}/api/users/withdraw`,
            method: 'POST',
            data: {
              balance: amount
            },
            header: {
              'token': wx.getStorageSync('token'),
              'content-type': 'application/json'
            },
            success: (res) => {
              if (res.data.code === 1) {
                wx.showToast({
                  title: '提现成功',
                  icon: 'success'
                })
                this.onLoad()
              } else {
                wx.showToast({
                  title: res.data.msg || '提现失败',
                  icon: 'none'
                })
              }
            },
            fail: () => {
              wx.showToast({
                title: '提现失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 查看全部交易记录
  viewAllTransactions() {
    wx.navigateTo({
      url: '/pages/wallet/transactions/index'
    })
  },

  onPullDownRefresh() {
    this.loadWalletInfo()
    wx.stopPullDownRefresh()
  }
}) 
Page({
  data: {
    balance: 0.00,
    transactions: [
      {
        id: 1,
        type: 'recharge',
        amount: 50.00,
        status: 'success',
        time: '2024-03-20 14:30:00',
        desc: '充值'
      },
      {
        id: 2,
        type: 'payment',
        amount: -20.00,
        status: 'success',
        time: '2024-03-19 09:15:00',
        desc: '支付跑腿费'
      }
    ]
  },

  onLoad() {
    // TODO: 获取钱包余额和交易记录
  },

  onRecharge() {
    wx.navigateTo({
      url: '/pages/wallet/recharge/index'
    })
  },

  onWithdraw() {
    wx.navigateTo({
      url: '/pages/wallet/withdraw/index'
    })
  },

  formatAmount(amount) {
    return amount.toFixed(2)
  }
}) 
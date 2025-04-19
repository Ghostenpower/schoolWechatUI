Page({
  data: {
    order: null,
    loading: true
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '订单详情'
    })
    
    if (options.id) {
      this.fetchOrderDetail(options.id)
    }
  },

  // 获取订单详情
  fetchOrderDetail(orderId) {
    // TODO: 这里将来需要改为真实的API调用
    // 模拟API请求延迟
    wx.showLoading({
      title: '加载中...'
    })
    
    setTimeout(() => {
      // 模拟订单详情数据
      const orderDetail = {
        id: parseInt(orderId),
        type: 'express',
        title: '快递代取',
        description: '帮忙到菜鸟驿站取一个快递，送到6号宿舍楼',
        reward: 5.00,
        status: 'processing', // processing, completed, cancelled
        location: '菜鸟驿站',
        destination: '6号宿舍楼',
        packageInfo: {
          code: 'YT1234567890',
          size: '小件',
          weight: '1kg以内'
        },
        requirements: [
          '请在17:30前送达',
          '轻拿轻放，小心易碎',
          '送达后请联系收件人'
        ],
        user: {
          id: 1,
          name: '张三',
          avatar: '/images/default-avatar.png',
          phone: '13900139000'
        },
        orderNo: 'DD' + orderId + Date.now(),
        paymentMethod: '余额支付',
        paymentStatus: 'paid',
        totalAmount: 5.00,
        acceptTime: '2024-03-20 15:00',
        completedTime: null,
        cancelledTime: null,
        cancelReason: null
      }

      this.setData({
        order: orderDetail,
        loading: false
      })

      wx.hideLoading()
    }, 500)
  },

  // 确认完成
  onConfirmComplete() {
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用完成订单接口
          const order = this.data.order
          order.status = 'completed'
          order.completedTime = new Date().toLocaleString()
          this.setData({ order })
          wx.showToast({
            title: '订单已完成',
            icon: 'success'
          })
        }
      }
    })
  },

  // 联系下单用户
  onContactUser() {
    wx.makePhoneCall({
      phoneNumber: this.data.order.user.phone
    })
  },

  // 复制订单号
  onCopyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.orderNo,
      success: () => {
        wx.showToast({
          title: '已复制订单号',
          icon: 'success'
        })
      }
    })
  },

  // 复制取件码
  onCopyCode() {
    wx.setClipboardData({
      data: this.data.order.packageInfo.code,
      success: () => {
        wx.showToast({
          title: '已复制取件码',
          icon: 'success'
        })
      }
    })
  },

  // 格式化金额
  formatAmount(amount) {
    return amount.toFixed(2)
  }
}) 
Page({
  data: {
    task: null,
    loading: true
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '任务详情'
    })
    
    if (options.id) {
      this.fetchTaskDetail(options.id)
    }
  },

  // 获取任务详情
  fetchTaskDetail(taskId) {
    // TODO: 这里将来需要改为真实的API调用
    // 模拟API请求延迟
    wx.showLoading({
      title: '加载中...'
    })
    
    setTimeout(() => {
      // 模拟任务详情数据
      const taskDetail = {
        id: parseInt(taskId),
        type: 'express',
        title: '快递代取',
        description: '帮忙到菜鸟驿站取一个快递，送到6号宿舍楼',
        reward: 5.00,
        status: 'pending', // pending, accepted, completed
        location: '菜鸟驿站',
        destination: '6号宿舍楼',
        createTime: '2024-03-20 14:30',
        deadline: '2024-03-20 17:30',
        publisher: {
          id: 1,
          name: '张三',
          avatar: '/images/default-avatar.png',
          phone: '13900139000'
        },
        acceptor: null,
        requirements: [
          '请在17:30前送达',
          '轻拿轻放，小心易碎',
          '送达后请联系收件人'
        ],
        packageInfo: {
          code: 'YT1234567890',
          size: '小件',
          weight: '1kg以内'
        }
      }

      this.setData({
        task: taskDetail,
        loading: false
      })

      wx.hideLoading()
    }, 500)
  },

  // 接受任务
  onAcceptTask() {
    wx.showModal({
      title: '接受任务',
      content: '确定要接受这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用接受任务接口
          const task = this.data.task
          task.status = 'accepted'
          task.acceptor = {
            id: 2,
            name: '李四',
            avatar: '/images/default-avatar.png',
            phone: '13800138000',
            acceptTime: '2024-03-20 15:00'
          }
          this.setData({ task })
          wx.showToast({
            title: '已接受任务',
            icon: 'success'
          })
        }
      }
    })
  },

  // 完成任务
  onCompleteTask() {
    wx.showModal({
      title: '完成任务',
      content: '确认已完成任务吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用完成任务接口
          const task = this.data.task
          task.status = 'completed'
          this.setData({ task })
          wx.showToast({
            title: '任务已完成',
            icon: 'success'
          })
        }
      }
    })
  },

  // 联系发布者
  onContactPublisher() {
    wx.makePhoneCall({
      phoneNumber: this.data.task.publisher.phone
    })
  },

  // 联系接收者
  onContactAcceptor() {
    if (this.data.task.acceptor) {
      wx.makePhoneCall({
        phoneNumber: this.data.task.acceptor.phone
      })
    }
  },

  // 格式化金额
  formatAmount(amount) {
    return amount.toFixed(2)
  },

  // 复制取件码
  onCopyCode() {
    wx.setClipboardData({
      data: this.data.task.packageInfo.code,
      success: () => {
        wx.showToast({
          title: '已复制取件码',
          icon: 'success'
        })
      }
    })
  }
}) 
const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      phone: '',
      gender: '',
      school: '',
      studentId: ''
    },
    genderRange: ['男', '女']
  },

  onLoad() {
    // 获取用户信息
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: {
          ...app.globalData.userInfo
        }
      })
    }
  },

  // 输入事件处理函数
  onNicknameInput(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    })
  },

  onPhoneInput(e) {
    this.setData({
      'userInfo.phone': e.detail.value
    })
  },

  onGenderChange(e) {
    this.setData({
      'userInfo.gender': e.detail.value
    })
  },

  onSchoolInput(e) {
    this.setData({
      'userInfo.school': e.detail.value
    })
  },

  onStudentIdInput(e) {
    this.setData({
      'userInfo.studentId': e.detail.value
    })
  },

  // 保存用户信息
  onSave() {
    const userInfo = this.data.userInfo

    // 表单验证
    if (!userInfo.nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    if (!userInfo.phone) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      })
      return
    }

    if (!userInfo.school) {
      wx.showToast({
        title: '请输入学校',
        icon: 'none'
      })
      return
    }

    if (!userInfo.studentId) {
      wx.showToast({
        title: '请输入学号',
        icon: 'none'
      })
      return
    }

    // TODO: 调用后端接口保存用户信息
    wx.showLoading({
      title: '保存中...'
    })

    // 模拟API调用
    setTimeout(() => {
      wx.hideLoading()
      
      // 更新全局用户信息
      app.globalData.userInfo = userInfo

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 返回上一页
      wx.navigateBack()
    }, 1000)
  }
}) 
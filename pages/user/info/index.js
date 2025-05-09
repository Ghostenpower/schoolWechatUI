const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      username: '',
      phone: '',
      email: '',
      userType: 1,
      balance: 88.88,
      status: 1,
      createdAt: '2025-04-08 12:00:00'
    },
    genderRange: ['男', '女']
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const baseUrl = app.globalData.baseUrl;
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.userId) {
      wx.showToast({ title: '未获取到用户ID', icon: 'none' });
      return;
    }
    wx.request({
      url: `${baseUrl}/api/users/getOneById?userId=${userInfo.userId}`,
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          this.setData({ userInfo: res.data.data });
        } else {
          wx.showToast({ title: res.data.msg || '获取失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
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
  },

  goToEdit() {
    console.log('点击了编辑资料');
    wx.navigateTo({ url: '/pages/user/edit/index' });
  },

  getUserTypeText(type) {
    return type === 1 ? '学生' : type === 2 ? '商家' : '管理员';
  },

  getStatusText(status) {
    return status === 1 ? '正常' : '禁用';
  }
}) 
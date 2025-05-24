const app = getApp()

Page({
  data: {
    userInfo: {}
  },
  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`userInfo.${field}`]: e.detail.value
    });
  },
  submitEdit() {
    const { userInfo } = this.data;

    // 输入校验
    if (!userInfo.username) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    if (!userInfo.phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    // 手机号格式校验（简单校验，只检查是否是11位数字）
    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(userInfo.phone)) {
      wx.showToast({ title: '请输入有效的手机号', icon: 'none' });
      return;
    }

    if (!userInfo.email) {
      wx.showToast({ title: '请输入邮箱', icon: 'none' });
      return;
    }
    // 邮箱格式校验（简单校验）
    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(userInfo.email)) {
      wx.showToast({ title: '请输入有效的邮箱地址', icon: 'none' });
      return;
    }

    wx.request({
      url: `${app.globalData.baseUrl}/api/users/update`,
      method: 'POST',
      data: {
        userId: userInfo.userId,
        username: userInfo.username,
        phone: userInfo.phone,
        email: userInfo.email,
        avatarUrl: userInfo.avatarUrl
        // 如果API需要，可以添加其他字段，例如 password，但目前数据中没有此字段
      },
      header: {
        'content-type': 'application/json',
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 1) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          // 更新本地存储的用户信息
          wx.setStorageSync('userInfo', userInfo);
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        } else {
          wx.showToast({ title: res.data.msg || '保存失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
}); 
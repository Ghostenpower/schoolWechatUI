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
    wx.request({
      url: 'http://10.34.80.151:8051/api/users/update',
      method: 'POST',
      data: userInfo,
      header: {
        'content-type': 'application/json',
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 1) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          wx.setStorageSync('userInfo', userInfo);
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        } else {
          wx.showToast({ title: res.data.msg || '保存失败', icon: 'none' });
        }
      }
    });
  }
}); 
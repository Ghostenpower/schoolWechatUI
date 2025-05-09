Page({
  data: {
    addressList: [],
    loading: false
  },

  onLoad() {
    console.log('页面加载');
    this.getAddressList();
  },

  onShow() {
    console.log('页面显示');
    this.getAddressList();
  },

  // 获取地址列表
  getAddressList() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;

    console.log('开始获取地址列表', { baseUrl, token });

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: baseUrl + '/api/addresses/getByUserId',
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      success: (res) => {
        console.log('获取地址列表成功', res.data);
        wx.hideLoading();
        if (res.data.code === 1) {
          this.setData({
            addressList: res.data.data.list || []
          });
          console.log('设置地址列表数据', this.data.addressList);
        } else {
          wx.showToast({
            title: res.data.msg || '获取地址列表失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取地址列表失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 跳转到新增地址页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/address/edit/index'
    });
  },

  // 跳转到编辑地址页面
  goToEdit(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/address/edit/index?id=${addressId}`
    });
  },

  // 删除地址
  deleteAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;

    wx.showModal({
      title: '提示',
      content: '确定要删除该地址吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          wx.request({
            url: baseUrl + '/api/addresses/delete',
            method: 'POST',
            data: `addressId=${addressId}`,
            header: {
              'content-type': 'application/x-www-form-urlencoded',
              'token': token
            },
            success: (res) => {
              wx.hideLoading();
              if (res.data.code === 1) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                this.getAddressList();
              } else {
                wx.showToast({
                  title: res.data.msg || '删除失败',
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({
                title: '网络错误',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
}); 
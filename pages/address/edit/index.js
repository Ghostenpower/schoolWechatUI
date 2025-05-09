Page({
  data: {
    addressId: null,
    formData: {
      recipientName: '',
      phone: '',
      detailedAddress: '',
      pickupCoordinates: '',
      deliveryCoordinates: '',
      isDefault: false
    },
    isEdit: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        addressId: options.id,
        isEdit: true
      });
      this.getAddressInfo(options.id);
    }
  },

  // 获取地址详情（只获取基本信息）
  getAddressInfo(addressId) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;

    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: baseUrl + '/api/addresses/getAddressInfo?addressId=' + addressId,
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 1) {
          this.setData({
            formData: {
              ...this.data.formData,
              recipientName: res.data.data.recipientName || '',
              phone: res.data.data.phone || '',
              detailedAddress: res.data.data.detailedAddress || '',
              isDefault: res.data.data.isDefault === 1
            }
          });
        } else {
          wx.showToast({
            title: res.data.msg || '获取地址详情失败',
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
  },

  // 输入框内容变化
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 切换默认地址
  toggleDefault() {
    this.setData({
      'formData.isDefault': !this.data.formData.isDefault
    });
  },

  // 选择地址
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.detailedAddress': res.address,
          'formData.pickupCoordinates': `${res.latitude},${res.longitude}`
        });
      }
    });
  },

  // 表单提交
  submitForm() {
    const { formData, isEdit, addressId } = this.data;
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;
    
    // 表单验证
    if (!formData.recipientName) {
      return wx.showToast({
        title: '请输入收货人姓名',
        icon: 'none'
      });
    }
    if (!formData.phone) {
      return wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      });
    }
    if (!formData.detailedAddress) {
      return wx.showToast({
        title: '请选择详细地址',
        icon: 'none'
      });
    }

    const url = isEdit ? baseUrl + '/api/addresses/update' : baseUrl + '/api/addresses/add';
    const data = isEdit ? { ...formData, addressId } : formData;

    wx.showLoading({ title: '处理中...' });
    wx.request({
      url,
      method: 'POST',
      data,
      header: {
        'content-type': 'application/json',
        'token': token
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 1) {
          wx.showToast({
            title: isEdit ? '修改成功' : '添加成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.msg || '操作失败',
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
  },

  

  // 删除地址
  deleteAddress() {
    const { addressId } = this.data;
    console.log('删除传递的 addressId:', addressId);
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;

    wx.showLoading({ title: '删除中...' });
    wx.request({
      url: baseUrl + '/api/addresses/delete',
      method: 'POST',
      data: `addressId=${addressId}`,
      header: {
        'content-type': 'application/x-www-form-urlencoded',
        'token': token
      },
      success: (res) => {
        console.log('删除返回：', res);
        wx.hideLoading();
        if (res.data.code === 1) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
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
}); 
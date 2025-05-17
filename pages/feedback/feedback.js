// pages/feedback/feedback.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    content: '',
    images: [],
    contact: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 内容输入
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    })
  },

  // 联系方式输入
  onContactInput(e) {
    this.setData({
      contact: e.detail.value
    })
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 3 - this.data.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      this.setData({
        images: [...this.data.images, ...res.tempFilePaths]
      })
    } catch (error) {
      console.error('选择图片失败', error)
    }
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.images
    })
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({ images })
  },

  // 上传图片到服务器
  async uploadImages(tempFilePaths) {
    wx.showLoading({ title: '上传中...', mask: true });
    const app = getApp();
    const token = wx.getStorageSync('token');
    const uploadPromises = tempFilePaths.map(tempFilePath => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${app.globalData.baseUrl}/api/file/upload`,
          filePath: tempFilePath,
          name: 'file',
          header: {
            'token': token
          },
          success: (uploadRes) => {
            try {
              const result = JSON.parse(uploadRes.data);
              if (result.code === 1) {
                resolve(result.data); // 返回图片url
              } else {
                wx.showToast({ title: result.msg || '上传失败', icon: 'none' });
                reject(result.msg || '上传失败');
              }
            } catch (e) {
              wx.showToast({ title: '响应解析失败', icon: 'none' });
              reject('响应解析失败');
            }
          },
          fail: () => {
            wx.showToast({ title: '上传请求失败', icon: 'none' });
            reject('上传请求失败');
          }
        });
      });
    });
    return Promise.all(uploadPromises);
  },

  // 提交反馈
  async submitFeedback() {
    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '提交中...'
    })

    try {
      // 上传图片
      let imageUrls = [];
      if (this.data.images.length > 0) {
        imageUrls = await this.uploadImages(this.data.images);
      }
      // 拼接图片url字符串
      const imagesUrl = imageUrls.join(',');
      // 提交反馈
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/feedback/submit`,
          method: 'POST',
          data: {
            id: 0,
            suggestion: this.data.content,
            contact: this.data.contact,
            imagesUrl: imagesUrl,
            createTime: ''
          },
          header: {
            'token': wx.getStorageSync('token'),
            'content-type': 'application/json'
          },
          success: resolve,
          fail: reject
        })
      });
      if (res.data && res.data.code === 1) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.data.msg || '提交失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
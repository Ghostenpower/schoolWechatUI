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
      const imageUrls = []
      for (const imagePath of this.data.images) {
        const uploadRes = await wx.uploadFile({
          url: `http://10.34.80.151:8051/api/upload`,
          filePath: imagePath,
          name: 'file',
          header: {
            'Authorization': wx.getStorageSync('token')
          }
        })
        const data = JSON.parse(uploadRes.data)
        imageUrls.push(data.url)
      }

      // 提交反馈
      const res = await wx.request({
        url: `http://10.34.80.151:8051/api/feedback`,
        method: 'POST',
        data: {
          content: this.data.content,
          images: imageUrls,
          contact: this.data.contact
        },
        header: {
          'Authorization': wx.getStorageSync('token')
        }
      })

      if (res.statusCode === 200) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error('提交失败')
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
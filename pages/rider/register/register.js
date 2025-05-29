const app = getApp()

Page({
  data: {
    idCard: '',
    idCardFront: '',
    idCardBack: '',
    studentCard: '',
    uploading: false
  },

  onLoad(options) {
    // 页面加载时执行
  },

  onReady() {
    // 页面初次渲染完成时执行
  },

  onShow() {
    // 页面显示时执行
  },

  onHide() {
    // 页面隐藏时执行
  },

  onUnload() {
    // 页面卸载时执行
  },

  // 选择图片
  chooseImage(e) {
    const type = e.currentTarget.dataset.type
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadImage(tempFilePath, type)
      }
    })
  },

  // 上传图片
  uploadImage(tempFilePath, type) {
    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中',
        icon: 'none'
      })
      return
    }

    this.setData({ uploading: true })
    wx.showLoading({
      title: '上传中...',
      mask: true
    })

    wx.uploadFile({
      url: `${app.globalData.baseUrl}/api/file/upload`,
      filePath: tempFilePath,
      name: 'file',
      formData: {},
      header: {
        'token': wx.getStorageSync('token'),
        'content-type': 'multipart/form-data'
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.code === 1) {
          console.log('图片上传成功，URL:', data.data)
          this.setData({
            [type]: data.data
          }, () => {
            // 在setData回调中检查状态
            console.log('当前状态:', this.data)
          })
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: data.msg || '上传失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ uploading: false })
        wx.hideLoading()
      }
    })
  },

  // 提交表单
  submitForm() {
    const { idCard, idCardFront, idCardBack, studentCard } = this.data

    // 表单验证
    if (!idCard) {
      wx.showToast({
        title: '请输入身份证号',
        icon: 'none'
      })
      return
    }
    if (!idCardFront) {
      wx.showToast({
        title: '请上传身份证正面照片',
        icon: 'none'
      })
      return
    }
    if (!idCardBack) {
      wx.showToast({
        title: '请上传身份证反面照片',
        icon: 'none'
      })
      return
    }
    if (!studentCard) {
      wx.showToast({
        title: '请上传学生证照片',
        icon: 'none'
      })
      return
    }

    // 提交数据
    wx.showLoading({
      title: '提交中...',
      mask: true
    })

    wx.request({
      url: `${app.globalData.baseUrl}/api/couriers/apply`,
      method: 'POST',
      data: {
        idCard,
        idCardFront,
        idCardBack,
        studentCard
      },
      header: {
        'content-type': 'application/json',
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.data.code === 1) {
          wx.showToast({
            title: '提交成功',
            icon: 'success',
            duration: 2000
          })
          // 延迟返回上一页
          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        } else {
          wx.showToast({
            title: res.data.msg || '提交失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  }
}) 
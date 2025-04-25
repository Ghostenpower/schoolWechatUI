// pages/tasks/publish/index.js
Page({
  data: {
    taskType: null, // 任务类型：1-快递代取，2-跑腿代办，3-代购服务，4-打印服务，5-其他服务
    formData: {
      title: '',
      description: '',
      pickupLocation: '',
      pickupCoordinates: '',
      deliveryLocation: '',
      deliveryCoordinates: '',
      deadline: '',
      reward: '',
      remark: ''
    },
    titleLength: 0,
    descriptionLength: 0,
    remarkLength: 0,
    uploadedImages: [],
    deadlineArray: [
      ['今天', '明天', '后天'],
      new Array(24).fill(0).map((_, index) => index + '时'),
      new Array(60).fill(0).map((_, index) => index + '分')
    ],
    deadlineIndex: [0, 12, 0]
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '发布任务'
    });
  },

  // 选择任务类型
  selectTaskType(e) {
    const type = parseInt(e.currentTarget.dataset.type);
    this.setData({
      taskType: type
    });
  },

  // 监听标题输入
  onInputTitle(e) {
    const value = e.detail.value;
    this.setData({
      'formData.title': value,
      titleLength: value.length
    });
  },

  // 监听描述输入
  onInputDescription(e) {
    const value = e.detail.value;
    this.setData({
      'formData.description': value,
      descriptionLength: value.length
    });
  },

  // 监听备注输入
  onInputRemark(e) {
    const value = e.detail.value;
    this.setData({
      'formData.remark': value,
      remarkLength: value.length
    });
  },

  // 监听悬赏金额输入
  onInputReward(e) {
    const value = e.detail.value;
    this.setData({
      'formData.reward': value
    });
  },

  // 选择取件位置
  choosePickupLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.pickupLocation': res.name || res.address,
          'formData.pickupCoordinates': `${res.longitude},${res.latitude}`
        });
      },
      fail: (err) => {
        if (err.errMsg !== 'chooseLocation:fail cancel') {
          wx.showToast({
            title: '选择位置失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 选择送达位置
  chooseDeliveryLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.deliveryLocation': res.name || res.address,
          'formData.deliveryCoordinates': `${res.longitude},${res.latitude}`
        });
      },
      fail: (err) => {
        if (err.errMsg !== 'chooseLocation:fail cancel') {
          wx.showToast({
            title: '选择位置失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 截止时间选择变化
  onDeadlineChange(e) {
    const [dayIndex, hourIndex, minuteIndex] = e.detail.value;
    const days = ['今天', '明天', '后天'];
    const hours = this.data.deadlineArray[1][hourIndex];
    const minutes = this.data.deadlineArray[2][minuteIndex];
    
    const deadlineText = `${days[dayIndex]} ${hours}:${minutes.padStart(2, '0')}`;
    
    // 根据选择的日期构建截止时间对象
    const now = new Date();
    const deadlineDate = new Date(now);
    deadlineDate.setDate(now.getDate() + dayIndex);
    deadlineDate.setHours(hourIndex);
    deadlineDate.setMinutes(minuteIndex);
    deadlineDate.setSeconds(0);
    
    // 格式化为ISO标准格式（兼容iOS）
    const year = deadlineDate.getFullYear();
    const month = (deadlineDate.getMonth() + 1).toString().padStart(2, '0');
    const day = deadlineDate.getDate().toString().padStart(2, '0');
    const formattedHours = hourIndex.toString().padStart(2, '0');
    const formattedMinutes = minuteIndex.toString().padStart(2, '0');
    
    // 使用ISO标准格式 (YYYY-MM-DDTHH:MM:SS)
    const isoDeadline = `${year}-${month}-${day}T${formattedHours}:${formattedMinutes}:00`;
    
    this.setData({
      deadlineIndex: [dayIndex, hourIndex, minuteIndex],
      'formData.deadline': deadlineText,
      'formData.deadlineDate': isoDeadline
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 3 - this.data.uploadedImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        
        // 上传图片到服务器
        this.uploadImages(tempFilePaths);
      }
    });
  },

  // 上传图片到服务器
  uploadImages(tempFilePaths) {
    wx.showLoading({
      title: '上传中...',
      mask: true
    });
    
    // 实际的图片上传流程
    const uploadPromises = tempFilePaths.map(path => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'http://localhost:8051/api/upload/image', // 替换为实际的上传API
          filePath: path,
          name: 'file',
          success: (res) => {
            // 解析返回的JSON
            try {
              const data = JSON.parse(res.data);
              if (data.code === 1 && data.data) {
                resolve(data.data.url);
              } else {
                reject(new Error(data.msg || '上传失败'));
              }
            } catch (e) {
              reject(new Error('解析响应失败'));
            }
          },
          fail: () => {
            reject(new Error('上传请求失败'));
          }
        });
      });
    });
    
    // 由于现在是模拟环境，我们使用原始路径作为上传成功的结果
    // 在实际环境中应该使用 Promise.all(uploadPromises) 处理多图上传
    setTimeout(() => {
      const uploadedImages = [...this.data.uploadedImages, ...tempFilePaths];
      this.setData({
        uploadedImages
      });
      wx.hideLoading();
    }, 1000);
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.uploadedImages[index],
      urls: this.data.uploadedImages
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const uploadedImages = [...this.data.uploadedImages];
    uploadedImages.splice(index, 1);
    this.setData({
      uploadedImages
    });
  },

  // 表单提交
  submitForm(e) {
    const formData = this.data.formData;
    
    // 表单验证
    if (!this.data.taskType) {
      this.showToast('请选择任务类型');
      return;
    }
    
    if (!formData.title || formData.title.length < 5) {
      this.showToast('任务标题不能少于5个字符');
      return;
    }
    
    if (!formData.description || formData.description.length < 10) {
      this.showToast('任务描述不能少于10个字符');
      return;
    }
    
    if (!formData.pickupLocation) {
      this.showToast('请选择取件位置');
      return;
    }
    
    if (!formData.deliveryLocation) {
      this.showToast('请选择送达位置');
      return;
    }
    
    if (!formData.deadline) {
      this.showToast('请选择截止时间');
      return;
    }
    
    if (!formData.reward || isNaN(formData.reward) || parseFloat(formData.reward) <= 0) {
      this.showToast('请输入有效的悬赏金额');
      return;
    }
    
    // 准备提交数据
    const submitData = {
      taskType: this.data.taskType,
      title: formData.title,
      description: formData.description,
      pickupLocation: formData.pickupLocation,
      pickupCoordinates: formData.pickupCoordinates,
      deliveryLocation: formData.deliveryLocation,
      deliveryCoordinates: formData.deliveryCoordinates,
      deadline: formData.deadlineDate, // ISO格式的日期字符串
      reward: parseFloat(formData.reward),
      remark: formData.remark,
      imagesUrl: this.data.uploadedImages.join(',') // 图片URL以逗号分隔
    };
    
    // 提交表单
    this.submitTaskData(submitData);
  },

  // 提交任务数据
  submitTaskData(data) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    
    // 调用实际的API提交任务
    wx.request({
      url: baseUrl + '/api/tasks/add',
      method: 'POST',
      header: {
        'token': token
      },
      data: {
        taskType: data.taskType,
        title: data.title,
        description: data.description,
        pickupLocation: data.pickupLocation,
        pickupCoordinates: data.pickupCoordinates,
        deliveryLocation: data.deliveryLocation,
        deliveryCoordinates: data.deliveryCoordinates,
        deadline: data.deadline,
        remark: data.remark,
        imagesUrl: data.imagesUrl
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.data.code === 1) {
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              // 延迟返回，让用户看到成功提示
              setTimeout(() => {
                wx.navigateBack({
                  delta: 1
                });
              }, 2000);
            }
          });
        } else {
          wx.showToast({
            title: res.data.msg || '发布失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        console.error('任务提交失败', err);
      }
    });
  },

  // 显示提示信息
  showToast(title) {
    wx.showToast({
      title,
      icon: 'none',
      duration: 2000
    });
  }
}); 
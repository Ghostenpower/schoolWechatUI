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
    deadlineArray: [],
    deadlineIndex: [0, 12, 0],
    showPickupInput: false, // 是否显示取件位置手动输入
    showDeliveryInput: false // 是否显示送达位置手动输入
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '发布任务'
    });
    
    // 初始化截止日期选择器
    this.initDeadlinePicker();
  },
  
  // 初始化截止日期选择器
  initDeadlinePicker() {
    const days = [];
    const hours = [];
    const minutes = [];
    
    // 生成未来30天的日期选项
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      // 格式化为 MM月DD日
      if (i === 0) {
        days.push('今天');
      } else if (i === 1) {
        days.push('明天');
      } else if (i === 2) {
        days.push('后天');
      } else {
        days.push(`${month}月${day}日`);
      }
    }
    
    // 生成小时选项
    for (let i = 0; i < 24; i++) {
      hours.push(i + '时');
    }
    
    // 生成分钟选项
    for (let i = 0; i < 60; i++) {
      minutes.push(i + '分');
    }
    
    this.setData({
      deadlineArray: [days, hours, minutes]
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

  // 监听取件位置手动输入
  onInputPickupLocation(e) {
    const value = e.detail.value;
    this.setData({
      'formData.pickupLocation': value,
      'formData.pickupCoordinates': '' // 手动输入位置时，坐标为空
    });
  },

  // 监听送达位置手动输入
  onInputDeliveryLocation(e) {
    const value = e.detail.value;
    this.setData({
      'formData.deliveryLocation': value,
      'formData.deliveryCoordinates': '' // 手动输入位置时，坐标为空
    });
  },

  // 切换取件位置手动输入模式
  togglePickupInputMode() {
    this.setData({
      showPickupInput: !this.data.showPickupInput
    });
  },

  // 切换送达位置手动输入模式
  toggleDeliveryInputMode() {
    this.setData({
      showDeliveryInput: !this.data.showDeliveryInput
    });
  },

  // 选择取件位置
  choosePickupLocation() {
    // 增加授权检查
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.selectLocation('pickup');
            },
            fail: () => {
              wx.showModal({
                title: '提示',
                content: '需要获取您的地理位置，请确认授权',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting({
                      success: (res) => {
                        if (res.authSetting['scope.userLocation']) {
                          this.selectLocation('pickup');
                        }
                      }
                    });
                  }
                }
              });
            }
          });
        } else {
          this.selectLocation('pickup');
        }
      }
    });
  },

  // 选择送达位置
  chooseDeliveryLocation() {
    // 增加授权检查
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.selectLocation('delivery');
            },
            fail: () => {
              wx.showModal({
                title: '提示',
                content: '需要获取您的地理位置，请确认授权',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting({
                      success: (res) => {
                        if (res.authSetting['scope.userLocation']) {
                          this.selectLocation('delivery');
                        }
                      }
                    });
                  }
                }
              });
            }
          });
        } else {
          this.selectLocation('delivery');
        }
      }
    });
  },

  // 提取选择位置的公共方法
  selectLocation(type) {
    wx.chooseLocation({
      success: (res) => {
        if (type === 'pickup') {
          this.setData({
            'formData.pickupLocation': res.name || res.address,
            'formData.pickupCoordinates': `${res.longitude},${res.latitude}`
          });
        } else if (type === 'delivery') {
          this.setData({
            'formData.deliveryLocation': res.name || res.address,
            'formData.deliveryCoordinates': `${res.longitude},${res.latitude}`
          });
        }
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
    const days = this.data.deadlineArray[0];
    const hours = this.data.deadlineArray[1][hourIndex];
    const minutes = this.data.deadlineArray[2][minuteIndex];
    
    const deadlineText = `${days[dayIndex]} ${hours}:${minutes.padStart(2, '0').replace('分', '')}`;
    
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
    
    // 注意：图片上传接口尚未实现，目前只是模拟上传
    // TODO: 接入真实的图片上传API
    /*
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
    */
    
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
    
    if (!formData.title) {
      this.showToast('请输入任务标题');
      return;
    }
    
    if (!formData.description) {
      this.showToast('请输入任务描述');
      return;
    }
    
    if (!formData.pickupLocation) {
      this.showToast('请输入或选择取件位置');
      return;
    }
    
    if (!formData.deliveryLocation) {
      this.showToast('请输入或选择送达位置');
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
      pickupCoordinates: formData.pickupCoordinates || '',
      deliveryLocation: formData.deliveryLocation,
      deliveryCoordinates: formData.deliveryCoordinates || '',
      deadline: formData.deadlineDate, // ISO格式的日期字符串
      reward: parseFloat(formData.reward),
      remark: formData.remark,
      imagesUrl: this.data.uploadedImages.length > 0 ? this.data.uploadedImages.join(',') : '', // 图片URL以逗号分隔，允许为空
      price: parseFloat(formData.reward) // 添加price参数，与reward保持一致
    };
    
    // 提交表单
    this.submitTaskData(submitData);
  },

  // 提交任务数据
  submitTaskData(data) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const token = wx.getStorageSync('token');
    
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    // 使用wx.request直接调用API
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
        pickupCoordinates: data.pickupCoordinates || '',
        deliveryLocation: data.deliveryLocation,
        deliveryCoordinates: data.deliveryCoordinates || '',
        deadline: data.deadline,
        remark: data.remark,
        imagesUrl: data.imagesUrl, // 注意：图片上传接口尚未实现
        price: data.price
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
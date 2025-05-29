// pages/tasks/publish/index.js
Page({
  data: {
    taskId: null, // 新增：当前编辑的任务id，新增为null
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
      title: options.taskId ? '编辑任务' : '发布任务'
    });
    
    // 初始化截止日期选择器
    this.initDeadlinePicker();
    if (options.taskId) {
      this.setData({ taskId: options.taskId });
      this.fetchTaskDetail(options.taskId);
    }
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
    console.log('点击的任务类型值为:', type);
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

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 3 - this.data.uploadedImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.uploadImages(tempFilePaths);
      }
    });
  },

  // 上传图片到服务器
  uploadImages(tempFilePaths) {
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

    Promise.all(uploadPromises)
      .then(urls => {
        const uploadedImages = [...this.data.uploadedImages, ...urls];
        this.setData({ uploadedImages });
        wx.hideLoading();
      })
      .catch(() => {
        wx.hideLoading();
      });
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

  // 新增：获取任务详情并填充表单
  fetchTaskDetail(taskId) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const token = wx.getStorageSync('token');
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: baseUrl + '/api/tasks/getOneById',
      method: 'GET',
      header: { 'token': token },
      data: { taskId },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 1 && res.data.data) {
          const task = res.data.data;
          // 解析截止时间
          let deadlineIndex = [0, 12, 0];
          let deadlineText = '';
          let deadlineDate = '';
          if (task.deadline) {
            const d = new Date(task.deadline);
            const now = new Date();
            const dayDiff = Math.floor((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / (24*60*60*1000));
            deadlineIndex = [dayDiff, d.getHours(), d.getMinutes()];
            deadlineText = `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours()}时:${d.getMinutes().toString().padStart(2,'0')}`;
            deadlineDate = task.deadline;
          }
          this.setData({
            taskType: task.taskType,
            formData: {
              title: task.title,
              description: task.description,
              pickupLocation: task.pickupLocation,
              pickupCoordinates: task.pickupCoordinates,
              deliveryLocation: task.deliveryLocation,
              deliveryCoordinates: task.deliveryCoordinates,
              deadline: deadlineText,
              deadlineDate: deadlineDate,
              reward: task.reward,
              remark: task.remark
            },
            titleLength: task.title ? task.title.length : 0,
            descriptionLength: task.description ? task.description.length : 0,
            remarkLength: task.remark ? task.remark.length : 0,
            uploadedImages: task.imagesUrl ? task.imagesUrl.split(',') : [],
            deadlineIndex
          });
        } else {
          wx.showToast({ title: res.data.msg || '加载失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
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
      taskId: this.data.taskId, // 新增：编辑时带上taskId
      taskType: this.data.taskType - 1, // 将任务类型数值减1以匹配后端映射
      title: formData.title,
      description: formData.description,
      pickupLocation: formData.pickupLocation,
      pickupCoordinates: formData.pickupCoordinates || '',
      deliveryLocation: formData.deliveryLocation,
      deliveryCoordinates: formData.deliveryCoordinates || '',
      deadline: formData.deadlineDate, // ISO格式的日期字符串
      reward: parseFloat(formData.reward),
      remark: formData.remark,
      imagesUrl: this.data.uploadedImages.length > 0 ? this.data.uploadedImages.join(',') : '',
      price: parseFloat(formData.reward)
    };
    
    // 提交表单
    this.submitTaskData(submitData);
  },

  // 提交任务数据
  submitTaskData(data) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const token = wx.getStorageSync('token');
    
    // 显示加载提示
    wx.showLoading({
      title: '检查余额...',
      mask: true
    });

    // 获取最新余额
    wx.request({
      url: `${app.globalData.baseUrl}/api/users/getOneById`,
      method: 'GET',
      header: {
        'token': token
      },
      data: {
        userId: wx.getStorageSync('userInfo').userId
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 1 && res.data.data) {
          const currentBalance = parseFloat(res.data.data.balance || 0);
          const taskReward = parseFloat(data.reward);

          // 检查余额是否足够
          if (currentBalance < taskReward) {
            wx.showModal({
              title: '余额不足',
              content: `当前余额${currentBalance.toFixed(2)}元，发布任务需要${taskReward.toFixed(2)}元，是否前往充值？`,
              confirmText: '去充值',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({
                    url: '/pages/wallet/wallet'
                  });
                }
              }
            });
            return;
          }

          // 余额充足，继续发布任务
          this.publishTask(data);
        } else {
          wx.showToast({
            title: res.data.msg || '获取余额失败',
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

  // 发布任务
  publishTask(data) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const token = wx.getStorageSync('token');

    wx.showLoading({
      title: '发布中...',
      mask: true
    });
    
    wx.request({
      url: baseUrl + '/api/tasks/add',
      method: 'POST',
      header: {
        'token': token
      },
      data: data,
      success: (res) => {
        wx.hideLoading();
        
        if (res.data.code === 1) {
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            duration: 2000,
            success: () => {
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
  },

  // 选择取件位置
  choosePickupLocation() {
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
        if (err.errMsg.indexOf('auth deny') !== -1 || err.errMsg.indexOf('auth denied') !== -1) {
          wx.showModal({
            title: '授权失败',
            content: '请在小程序设置中打开"地理位置"权限',
            showCancel: false
          });
        } else if (err.errMsg !== 'chooseLocation:fail cancel') {
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
}); 
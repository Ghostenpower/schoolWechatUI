Page({
  /**
   * 页面的初始数据
   * 存储订单详情页面的状态和数据
   */
  data: {
    orderId: null,
    taskId: null,
    courierId: null,
    customerId: null,
    orderInfo: null,
    taskInfo: null, 
    courierInfo: null,
    customerInfo: null,
    loading: true,
    // 订单状态映射
    orderStatusMap: {
      1: '待开始',
      2: '待完成',
      3: '已完成',
      4: '已取消'
    },
    // 任务状态映射
    taskStatusMap: {
      0: '待接单',
      1: '已接单',
      2: '进行中',
      3: '已完成',
      4: '已取消'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log('页面加载，options:', options);
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadOrderDetail(options.id);
    } else {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载订单详情
   */
  loadOrderDetail: function (orderId) {
    this.setData({ loading: true });
    console.log('开始加载订单详情，ID:', orderId);
    
    // 获取订单信息
    wx.request({
      url: 'http://10.34.80.151:8051/api/orders/getOneById',
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      data: {
        orderId: orderId
      },
      success: (res) => {
        console.log('订单信息API响应:', res.data);
        if (res.data.code === 1 && res.data.data) {
          const orderData = res.data.data;
          
          // 预处理时间字段
          if (orderData.acceptTime) {
            orderData.acceptTimeFormatted = this.formatTime(orderData.acceptTime);
            console.log('格式化接单时间:', orderData.acceptTime, '->', orderData.acceptTimeFormatted);
          }
          
          if (orderData.completionTime) {
            orderData.completionTimeFormatted = this.formatTime(orderData.completionTime);
            console.log('格式化完成时间:', orderData.completionTime, '->', orderData.completionTimeFormatted);
          }
          
          if (orderData.cancelTime) {
            orderData.cancelTimeFormatted = this.formatTime(orderData.cancelTime);
            console.log('格式化取消时间:', orderData.cancelTime, '->', orderData.cancelTimeFormatted);
          }
          
          this.setData({
            orderInfo: orderData,
            taskId: orderData.taskId,
            courierId: orderData.courierId
          });
          
          // 加载任务信息
          this.loadTaskInfo(orderData.taskId);
          
          // 加载配送员信息
          this.loadCourierInfo(orderData.courierId);
        } else {
          wx.showToast({
            title: res.data.msg || '获取订单信息失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('订单信息请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 加载任务信息
   */
  loadTaskInfo: function (taskId) {
    console.log('开始加载任务信息，ID:', taskId);
    wx.request({
      url: 'http://10.34.80.151:8051/api/tasks/getOneById',
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      data: {
        taskId: taskId
      },
      success: (res) => {
        console.log('任务信息API响应:', res.data);
        if (res.data.code === 1 && res.data.data) {
          const taskData = res.data.data;
          
          // 预处理时间字段
          if (taskData.deadline) {
            taskData.deadlineFormatted = this.formatTime(taskData.deadline);
            console.log('格式化截止时间:', taskData.deadline, '->', taskData.deadlineFormatted);
          }
          
          // 处理坐标信息 - 坐标格式为"经度,纬度"
          if (taskData.pickupCoordinates) {
            const coords = taskData.pickupCoordinates.split(',');
            taskData.pickupLongitude = parseFloat(coords[0]);
            taskData.pickupLatitude = parseFloat(coords[1]);
            console.log('取件坐标(经度,纬度):', taskData.pickupLongitude, taskData.pickupLatitude);
          }
          
          if (taskData.deliveryCoordinates) {
            const coords = taskData.deliveryCoordinates.split(',');
            taskData.deliveryLongitude = parseFloat(coords[0]);
            taskData.deliveryLatitude = parseFloat(coords[1]);
            console.log('送达坐标(经度,纬度):', taskData.deliveryLongitude, taskData.deliveryLatitude);
          }
          
          this.setData({
            taskInfo: taskData,
            customerId: taskData.userId
          });
          
          // 加载任务发布者信息
          this.loadCustomerInfo(taskData.userId);
        } else {
          wx.showToast({
            title: res.data.msg || '获取任务信息失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('任务信息请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 加载配送员信息
   */
  loadCourierInfo: function (courierId) {
    console.log('开始加载配送员信息，ID:', courierId);
    wx.request({
      url: 'http://10.34.80.151:8051/api/users/getOneById',
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      data: {
        userId: courierId
      },
      success: (res) => {
        console.log('配送员信息API响应:', res.data);
        if (res.data.code === 1 && res.data.data) {
          this.setData({
            courierInfo: res.data.data
          });
        } else {
          wx.showToast({
            title: res.data.msg || '获取配送员信息失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('配送员信息请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 加载客户信息
   */
  loadCustomerInfo: function (customerId) {
    console.log('开始加载客户信息，ID:', customerId);
    wx.request({
      url: 'http://10.34.80.151:8051/api/users/getOneById',
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token')
      },
      data: {
        userId: customerId
      },
      success: (res) => {
        console.log('客户信息API响应:', res.data);
        if (res.data.code === 1 && res.data.data) {
          this.setData({
            customerInfo: res.data.data,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.data.msg || '获取客户信息失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('客户信息请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 确认完成订单
   */
  onConfirmComplete: function () {
    wx.showModal({
      title: '确认完成订单',
      content: '确认该订单已经完成了吗？',
      confirmText: '确认完成',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          // 显示加载中
          wx.showLoading({
            title: '提交中...',
            mask: true
          });
          
          // 获取订单ID
          const orderId = Number(this.data.orderId);
          
          console.log('正在提交完成订单请求，orderId:', orderId);
          
          // 按照API文档格式发送请求
          wx.request({
            url: 'http://10.34.80.151:8051/api/orders/complete',
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'token': wx.getStorageSync('token')
            },
            data: orderId, // 直接发送订单ID
            success: (res) => {
              console.log('完成订单API响应:', res.data);
              if (res.data.code === 1) { // 后端返回code为1表示成功
                // 先隐藏加载中
                wx.hideLoading();
                
                // 本地更新状态
                this.updateOrderStatus(2);
                
                // 展示成功动画
                wx.showToast({
                  title: '订单已完成',
                  icon: 'success',
                  duration: 2000
                });
                
                // 等待动画完成后刷新数据
                setTimeout(() => {
                  // 刷新当前页面的订单详情
                  this.loadOrderDetail(orderId);
                  
                  // 检查是否有上一页，并更新列表中的订单状态（不刷新整个列表）
                  const pages = getCurrentPages();
                  if (pages.length > 1) {
                    const prevPage = pages[pages.length - 2];
                    // 如果上一页是订单列表页且有updateLocalOrderStatus方法
                    if (prevPage && prevPage.route.includes('order/order') && prevPage.updateLocalOrderStatus) {
                      console.log('通知列表页更新订单状态:', orderId, 2);
                      prevPage.updateLocalOrderStatus(orderId, 2);
                    }
                    // 如果上一页有refreshOrders方法但不支持更新单个订单
                    else if (prevPage && prevPage.refreshOrders) {
                      prevPage.refreshOrders();
                    }
                  }
                }, 1500);
              } else {
                wx.hideLoading();
                wx.showToast({
                  title: res.data.msg || '操作失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: (err) => {
              console.error('完成订单请求失败:', err);
              wx.hideLoading();
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none',
                duration: 2000
              });
            }
          });
        }
      }
    });
  },

  /**
   * 返回订单列表
   */
  onBackToList: function() {
    const pages = getCurrentPages();
    
    // 如果有上一页，直接返回
    if (pages.length > 1) {
      // 检查上一页是否是订单列表页
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.route.includes('order/order')) {
        // 不触发刷新，只更新当前操作的订单状态
        const orderId = this.data.orderId;
        const orderStatus = this.data.orderInfo ? this.data.orderInfo.orderStatus : null;
        
        // 如果上一页有updateLocalOrderStatus方法，直接更新对应订单
        if (prevPage.updateLocalOrderStatus && orderStatus) {
          console.log('通知列表页更新订单状态:', orderId, orderStatus);
          prevPage.updateLocalOrderStatus(Number(orderId), orderStatus);
        }
      }
      
      wx.navigateBack({
        delta: 1
      });
    } else {
      // 如果没有上一页，跳转到订单列表页
      wx.redirectTo({
        url: '/pages/order/order'
      });
    }
  },

  /**
   * 取消订单
   */
  onCancelOrder: function () {
    wx.showModal({
      title: '取消订单',
      content: '确认要取消该订单吗？',
      confirmText: '确认取消',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '取消原因',
            editable: true,
            placeholderText: '请输入取消原因',
            success: (modalRes) => {
              if (modalRes.confirm) {
                const cancelReason = modalRes.content || '用户主动取消';
                
                // 显示加载中
                wx.showLoading({
                  title: '提交中...',
                  mask: true
                });
                
                // 获取订单ID
                const orderId = Number(this.data.orderId);
                
                // 按照API文档格式构建请求参数
                wx.request({
                  url: 'http://10.34.80.151:8051/api/orders/cancel',
                  method: 'POST',
                  header: {
                    'Content-Type': 'application/json',
                    'token': wx.getStorageSync('token')
                  },
                  data: {
                    orderId: orderId,
                    cancelReason: cancelReason  // 修改参数名称为cancelReason
                  },
                  success: (res) => {
                    console.log('取消订单API响应:', res.data);
                    
                    // 先隐藏加载中
                    wx.hideLoading();
                    
                    if (res.data.code === 1) {
                      // 本地更新订单状态
                      this.updateOrderStatus(3, cancelReason);
                      
                      // 展示成功动画
                      wx.showToast({
                        title: '订单已取消',
                        icon: 'success',
                        duration: 2000
                      });
                      
                      // 通知上级页面刷新列表
                      setTimeout(() => {
                        // 刷新当前页面的订单详情
                        this.loadOrderDetail(orderId);
                        
                        // 检查是否有上一页，并更新列表中的订单状态（不刷新整个列表）
                        const pages = getCurrentPages();
                        if (pages.length > 1) {
                          const prevPage = pages[pages.length - 2];
                          // 如果上一页是订单列表页且有updateLocalOrderStatus方法
                          if (prevPage && prevPage.route.includes('order/order') && prevPage.updateLocalOrderStatus) {
                            console.log('通知列表页更新订单状态:', orderId, 3);
                            prevPage.updateLocalOrderStatus(orderId, 3, cancelReason);
                          }
                          // 如果上一页有refreshOrders方法但不支持更新单个订单
                          else if (prevPage && prevPage.refreshOrders) {
                            prevPage.refreshOrders();
                          }
                        }
                      }, 1500);
                    } else {
                      wx.showToast({
                        title: res.data.msg || '操作失败',
                        icon: 'none',
                        duration: 2000
                      });
                    }
                  },
                  fail: (err) => {
                    console.error('取消订单请求失败:', err);
                    wx.hideLoading();
                    wx.showToast({
                      title: '网络错误，请重试',
                      icon: 'none',
                      duration: 2000
                    });
                  }
                });
              }
            }
          });
        }
      }
    });
  },

  /**
   * 拨打电话
   */
  onCallPhone: function (e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      });
    } else {
      wx.showToast({
        title: '电话号码不可用',
        icon: 'none'
      });
    }
  },

  /**
   * 开始在线聊天
   */
  onStartChat: function (e) {
    const targetUserId = this.data.taskInfo.userId;
    console.log('开始聊天，发布者ID:', targetUserId);
    
    if (!targetUserId) {
      wx.showToast({
        title: '用户信息不可用',
        icon: 'none'
      });
      return;
    }

    // 跳转到聊天详情页面
    wx.navigateTo({
      url: `/pages/chat/detail/index?targetId=${targetUserId}&orderId=${this.data.orderId}`,
      fail: (err) => {
        console.error('导航到聊天页面失败:', err);
        wx.showToast({
          title: '打开聊天失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 格式化时间
   */
  formatTime: function (timestamp) {
    const date = new Date(timestamp);
        const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
        
    const formatNumber = n => {
      n = n.toString();
      return n[1] ? n : '0' + n;
    };
    
    return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute].map(formatNumber).join(':');
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '订单详情',
      path: '/pages/order/detail/index?id=' + this.data.orderId
    };
  },

  /**
   * 订单状态变更后的UI更新
   */
  updateOrderStatus: function(newStatus, message) {
    // 先更新本地状态
    const orderInfo = this.data.orderInfo;
    orderInfo.orderStatus = newStatus;
    
    // 根据新状态设置格式化文本
    orderInfo.orderStatusText = this.data.orderStatusMap[newStatus] || '未知状态';
    
    // 如果是完成状态，设置完成时间
    if (newStatus === 2) {
      const now = new Date();
      orderInfo.completionTime = now.toISOString();
      orderInfo.completionTimeFormatted = this.formatTime(now);
    }
    
    // 如果是取消状态，设置取消时间和原因
    if (newStatus === 3 && message) {
      const now = new Date();
      orderInfo.cancelTime = now.toISOString();
      orderInfo.cancelTimeFormatted = this.formatTime(now);
      orderInfo.cancelReason = message;
    }
    
    // 更新UI
    this.setData({ orderInfo });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    // 下拉刷新，重新加载数据
    this.loadOrderDetail(this.data.orderId);
    wx.stopPullDownRefresh();
  },

  /**
   * 跳转到地图查看取件位置
   */
  onViewPickupLocation: function() {
    const { taskInfo } = this.data;
    if (taskInfo.pickupLatitude && taskInfo.pickupLongitude) {
      console.log('打开取件位置地图，坐标:', taskInfo.pickupLatitude, taskInfo.pickupLongitude, '类型:', typeof taskInfo.pickupLatitude, typeof taskInfo.pickupLongitude);
      
      // 确保经纬度是数字类型
      const latitude = Number(taskInfo.pickupLatitude);
      const longitude = Number(taskInfo.pickupLongitude);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        wx.showToast({
          title: '坐标格式错误',
          icon: 'none'
        });
        return;
      }
      
      // 使用微信自带的地图功能打开位置
      // 注意: wx.openLocation 要求使用火星坐标系(GCJ-02)，与 wx.getLocation 的 type: 'gcj02' 对应
      console.log('打开取件位置地图，坐标:', latitude, longitude);
      wx.openLocation({
        latitude: latitude,
        longitude: longitude,
        name: '取件地点',
        address: taskInfo.pickupLocation || '未知地址',
        scale: 18,
        type: 'gcj02'
      });
    } else {
      wx.showToast({
        title: '无位置信息',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到地图查看送达位置
   */
  onViewDeliveryLocation: function() {
    const { taskInfo } = this.data;
    if (taskInfo.deliveryLatitude && taskInfo.deliveryLongitude) {
      console.log('打开送达位置地图，坐标:', taskInfo.deliveryLatitude, taskInfo.deliveryLongitude, '类型:', typeof taskInfo.deliveryLatitude, typeof taskInfo.deliveryLongitude);
      
      // 确保经纬度是数字类型
      const latitude = Number(taskInfo.deliveryLatitude);
      const longitude = Number(taskInfo.deliveryLongitude);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        wx.showToast({
          title: '坐标格式错误',
          icon: 'none'
        });
        return;
      }
      
      // 使用微信自带的地图功能打开位置
      // 注意: wx.openLocation 要求使用火星坐标系(GCJ-02)，与 wx.getLocation 的 type: 'gcj02' 对应
      console.log('打开送达位置地图，坐标:', latitude, longitude);
      wx.openLocation({
        latitude: latitude,
        longitude: longitude,
        name: '送达地点',
        address: taskInfo.deliveryLocation || '未知地址',
        scale: 18
      });
    } else {
      wx.showToast({
        title: '无位置信息',
        icon: 'none'
      });
    }
  },

  /**
   * 开始任务
   */
  onStartTask: function () {
    wx.showModal({
      title: '开始任务',
      content: '确认开始该任务吗？',
      confirmText: '确认开始',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          // 显示加载中
          wx.showLoading({
            title: '提交中...',
            mask: true
          });
          
          // 获取订单ID
          const orderId = Number(this.data.orderId);
          
          console.log('正在提交开始任务请求，orderId:', orderId);
          
          // 按照API文档格式发送请求
          wx.request({
            url: 'http://10.34.80.151:8051/api/orders/start',
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'token': wx.getStorageSync('token')
            },
            data: orderId,
            success: (res) => {
              console.log('开始任务API响应:', res.data);
              if (res.data.code === 1) {
                // 先隐藏加载中
                wx.hideLoading();
                
                // 本地更新状态
                this.updateOrderStatus(2);
                
                // 展示成功动画
                wx.showToast({
                  title: '任务已开始，请及时完成跑腿任务',
                  icon: 'none',
                  duration: 3000
                });
                
                // 等待动画完成后刷新数据
                setTimeout(() => {
                  // 刷新当前页面的订单详情
                  this.loadOrderDetail(orderId);
                  
                  // 检查是否有上一页，并更新列表中的订单状态
                  const pages = getCurrentPages();
                  if (pages.length > 1) {
                    const prevPage = pages[pages.length - 2];
                    if (prevPage && prevPage.route.includes('order/order') && prevPage.updateLocalOrderStatus) {
                      console.log('通知列表页更新订单状态:', orderId, 2);
                      prevPage.updateLocalOrderStatus(orderId, 2);
                    }
                    else if (prevPage && prevPage.refreshOrders) {
                      prevPage.refreshOrders();
                    }
                  }
                }, 1500);
              } else {
                wx.hideLoading();
                wx.showToast({
                  title: res.data.msg || '操作失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: (err) => {
              console.error('开始任务请求失败:', err);
              wx.hideLoading();
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none',
                duration: 2000
              });
            }
          });
        }
      }
    });
  }
}) // 使用微信原生地图API - 需要火星坐标系(GCJ-02)

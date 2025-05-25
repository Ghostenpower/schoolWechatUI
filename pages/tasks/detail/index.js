Page({
  data: {
    task: null,
    loading: true,
    showPublisher: true,
    showCompleteBtn: true,
    pickupLocationObj: null,
    deliveryLocationObj: null,
    mapMarkers: [],
    includePoints: [],
    polyline: [],
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '任务详情'
    })
    
    // 控制显示
    if (options.from === 'published') {
      this.setData({
        showPublisher: false,
        showCompleteBtn: false
      })
    }
    if (options.id) {
      this.fetchTaskDetail(options.id)
    }
  },

  // 获取任务详情
  fetchTaskDetail(taskId) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: `${baseUrl}/api/tasks/getOneById`,
      method: 'GET',
      data: { taskId },
      header: { 
        'token': token,
        'content-type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 1 && res.data.data) {
          const found = res.data.data;
          // 映射字段到页面所需格式
          const t = {};
          // 类型映射
          switch (found.taskType) {
            case 0: t.type = 'express'; break;
            case 1: t.type = 'errand'; break;
            case 2: t.type = 'shopping'; break;
            case 3: t.type = 'print'; break;
            default: t.type = 'other';
          }
          t.id = found.taskId;
          t.userId = found.userId;
          t.title = found.title || '未命名任务';
          t.description = found.description || '暂无描述';
          t.reward = found.price != null ? parseFloat(found.price) : 0;
          // 直接生成带符号的价格文本
          t.rewardText = '¥ ' + t.reward.toFixed(2);
          // 状态映射
          switch (found.status) {
            case 0: t.status = 'pending'; break;      // 待接单
            case 1: t.status = 'accepted'; break;     // 已接单
            case 2: t.status = 'in_progress'; break;  // 进行中
            case 3: t.status = 'completed'; break;    // 已完成
            case 4: t.status = 'cancelled'; break;    // 已取消
            default: t.status = 'pending';
          }
          
          t.location = found.pickupLocation || '未指定位置';
          t.destination = found.deliveryLocation || '';
          // 坐标字段
          t.pickupCoordinates = found.pickupCoordinates || '';
          t.deliveryCoordinates = found.deliveryCoordinates || '';
          // 格式化时间
          try {
            if (found.deadline) {
              const d = new Date(found.deadline.replace('T', ' '));
              const m = d.getMonth() + 1;
              const day = d.getDate();
              const hh = d.getHours();
              const mm = d.getMinutes();
              t.deadline = `${m}月${day}日 ${hh}:${mm < 10 ? '0' + mm : mm}`;
            } else {
              t.deadline = '未设置截止时间';
            }
          } catch (err) {
            console.error('日期解析错误:', err);
            t.deadline = found.deadline || '未设置截止时间';
          }
          t.createTime = (found.createdAt || '').replace('T', ' ');
          // 解析任务图片列表
          t.images = found.imagesUrl ? found.imagesUrl
            .split(',')
            .filter(url => url)
            .map(url => url.startsWith('http') || url.startsWith('https') ? url : baseUrl + url) : [];
          // 发布者信息（当前用户）
          t.publisher = { avatar: '/images/default-avatar.png', nickname: `用户${found.userId}` };
          // 接单者信息
          t.acceptor = null;
          t.packageInfo = {
            code: found.remark || '',
            size: '',
            weight: ''
          };
          // 备注信息
          t.remark = found.remark || '';
          
          // 获取发布者信息
          wx.request({
            url: `${baseUrl}/api/users/getOneById?userId=${found.userId}`,
            method: 'GET',
            header: { 'token': token },
            success: (userRes) => {
              if (userRes.data && userRes.data.code === 1 && userRes.data.data) {
                t.publisher = {
                  avatar: userRes.data.data.avatarUrl || '/images/default-avatar.png',
                  nickname: userRes.data.data.username || `用户${found.userId}`
                };
              }
              this.setData({ task: t, loading: false }, () => {
                this.parseTaskCoordinates(t);
              });
            },
            fail: () => {
              this.setData({ task: t, loading: false }, () => {
                this.parseTaskCoordinates(t);
              });
            }
          });
        } else {
          wx.showToast({ 
            title: res.data.msg || '任务不存在', 
            icon: 'none' 
          });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.hideLoading();
        wx.showToast({ 
          title: '网络错误', 
          icon: 'none' 
        });
        this.setData({ loading: false });
      }
    });
  },

  // 接受任务
  onAcceptTask() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const taskId = this.data.task.id;
    const myUserId = wx.getStorageSync('userInfo')?.userId;
    if (myUserId && this.data.task && String(this.data.task.userId) === String(myUserId)) {
      wx.showToast({
        title: '不能接收自己发布的任务',
        icon: 'none'
      });
      return;
    }
    wx.showModal({
      title: '接受任务',
      content: '确定要接受这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          const baseUrl = app.globalData.baseUrl;
          // 先获取courierId
          wx.request({
            url: `${baseUrl}/api/couriers/getCourierId`,
            method: 'GET',
            header: { 'token': token },
            success: (courierRes) => {
              if (courierRes.data && courierRes.data.code === 1 && courierRes.data.data) {
                const courierId = courierRes.data.data;
                // 再调用接单API
                console.log('准备请求 /api/orders/add', { taskId, courierId });
                wx.request({
                  url: `${baseUrl}/api/orders/add`,
                  method: 'POST',
                  header: { 'token': token, 'content-type': 'application/json' },
                  data: { taskId, courierId },
                  success: (res) => {
                    console.log('/api/orders/add 响应:', res);
                    wx.hideLoading();
                    if (res.data && res.data.code === 1) {
                      wx.showToast({
                        title: '接单成功',
                        icon: 'success'
                      });
                      this.setData({ 'task.status': 'accepted', showCompleteBtn: false, successTip: '接单成功，可在"我的订单"处完成任务' });
                      wx.setStorageSync('shouldRefreshList', true);
                    } else {
                      wx.showToast({
                        title: res.data.msg || '接单失败',
                        icon: 'none'
                      });
                    }
                  },
                  fail: () => {
                    wx.hideLoading();
                    wx.showToast({ title: '网络请求失败', icon: 'none' });
                  }
                });
              } else {
                // 用户不是骑手
                wx.hideLoading();
                wx.showToast({ title: '您还不是骑手，请先注册', icon: 'none' });
                setTimeout(() => {
                  wx.navigateTo({
                    url: '/pages/rider/register/register'
                  });
                }, 1500);
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '网络请求失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 联系TA，支持电话联系和在线联系
  onContactTA() {
    wx.showActionSheet({
      itemList: ['电话联系', '在线联系'],
      success: res => {
        if (res.tapIndex === 0) {
          // 电话联系
          if (this.data.task.publisher.phone) {
            wx.makePhoneCall({ phoneNumber: this.data.task.publisher.phone });
          } else {
            wx.showToast({ title: '无效的电话号码', icon: 'none' });
          }
        } else if (res.tapIndex === 1) {
          // 在线联系
          wx.showToast({ title: '在线联系功能暂未实现', icon: 'none' });
        }
      },
      fail: err => {
        console.error('操作取消或出错', err);
      }
    });
  },

  // 联系发布者
  onContactPublisher() {
    wx.makePhoneCall({
      phoneNumber: this.data.task.publisher.phone
    })
  },

  // 联系接收者
  onContactAcceptor() {
    if (this.data.task.acceptor) {
      wx.makePhoneCall({
        phoneNumber: this.data.task.acceptor.phone
      })
    }
  },

  // 格式化金额
  formatAmount(amount) {
    return amount.toFixed(2)
  },

  // 复制取件码
  onCopyCode() {
    wx.setClipboardData({
      data: this.data.task.packageInfo.code,
      success: () => {
        wx.showToast({
          title: '已复制取件码',
          icon: 'success'
        })
      }
    })
  },

  parseTaskCoordinates(data) {
    const markers = [];
    const includePoints = [];
    let polyline = [];
    let pickup = null, delivery = null;

    if (data.pickupCoordinates) {
      const [longitude, latitude] = data.pickupCoordinates.split(',').map(Number);
      pickup = { longitude, latitude };
      this.setData({ pickupLocationObj: pickup });
      markers.push({
        id: 1,
        longitude,
        latitude,
        title: '取件点',
        iconPath: '/images/pickup.png',
        width: 32,
        height: 32
      });
      includePoints.push({ longitude, latitude });
    }
    if (data.deliveryCoordinates) {
      const [longitude, latitude] = data.deliveryCoordinates.split(',').map(Number);
      delivery = { longitude, latitude };
      this.setData({ deliveryLocationObj: delivery });
      markers.push({
        id: 2,
        longitude,
        latitude,
        title: '送达点',
        iconPath: '/images/delivery.png',
        width: 32,
        height: 32
      });
      includePoints.push({ longitude, latitude });
    }

    // 路线polyline和配送员marker
    if (pickup && delivery) {
      // 控制点，决定曲线弯曲方向和幅度
      const control = {
        longitude: (pickup.longitude + delivery.longitude) / 2 + 0.003, // 横向偏移
        latitude: (pickup.latitude + delivery.latitude) / 2 - 0.003    // 纵向偏移
      };
      const N = 100; // 点数，越多越平滑
      const routePoints = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        // 二次贝塞尔曲线插值公式
        const lng = (1 - t) * (1 - t) * pickup.longitude +
                    2 * (1 - t) * t * control.longitude +
                    t * t * delivery.longitude;
        const lat = (1 - t) * (1 - t) * pickup.latitude +
                    2 * (1 - t) * t * control.latitude +
                    t * t * delivery.latitude;
        routePoints.push({ longitude: lng, latitude: lat });
      }

      polyline = [{
        points: routePoints,
        color: '#27ba9b',
        width: 6,
        dottedLine: false
      }];

      // 配送员marker放在路线中点
      const courierIdx = Math.floor(routePoints.length / 2);
      const courierPos = routePoints[courierIdx];
      markers.push({
        id: 99,
        longitude: courierPos.longitude,
        latitude: courierPos.latitude,
        iconPath: '/images/courier.png',
        width: 28,
        height: 28,
        title: '配送员'
      });
    }

    this.setData({ mapMarkers: markers, includePoints, polyline });
  },

  openPickupLocation() {
    const loc = this.data.pickupLocationObj;
    if (loc) {
      wx.openLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: '取件地点',
        scale: 16
      });
    }
  },

  openDeliveryLocation() {
    const loc = this.data.deliveryLocationObj;
    if (loc) {
      wx.openLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: '送达地点',
        scale: 16
      });
    }
  },
}) 
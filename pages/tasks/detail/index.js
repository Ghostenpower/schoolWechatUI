Page({
  data: {
    task: null,
    loading: true
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '任务详情'
    })
    
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
      url: baseUrl + '/api/tasks/all',
      method: 'GET',
      header: { token },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 1 && res.data.data && Array.isArray(res.data.data.list)) {
          // 使用通用获取列表接口并过滤
          const apiList = res.data.data.list;
          const found = apiList.find(item => String(item.taskId) === String(taskId));
          if (found) {
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
            t.title = found.title;
            t.description = found.description || '暂无描述';
            t.reward = found.price != null ? parseFloat(found.price) : 0;
            // 直接生成带符号的价格文本
            t.rewardText = '¥ ' + t.reward.toFixed(2);
            // 状态映射
            switch (found.status) {
              case 0: t.status = 'pending'; break;
              case 1: t.status = 'accepted'; break;
              case 2: t.status = 'completed'; break;
              case 3: t.status = 'cancelled'; break;
              default: t.status = 'pending';
            }
            t.location = found.pickupLocation || '未指定位置';
            t.destination = found.deliveryLocation || '';
            // 格式化时间
            try {
              const d = new Date(found.deadline);
              const m = d.getMonth()+1;
              const day = d.getDate();
              const hh = d.getHours();
              const mm = d.getMinutes();
              t.deadline = `${m}月${day}日 ${hh}:${mm <10?'0'+mm:mm}`;
            } catch (err) {
              t.deadline = found.deadline;
            }
            t.createTime = (found.createdAt || '').replace('T',' ');
            // 解析任务图片列表
            t.images = found.imagesUrl ? found.imagesUrl
              .split(',')
              .filter(url => url)
              .map(url => url.startsWith('http') || url.startsWith('https') ? url : baseUrl + url) : [];
            // 发布者信息（当前用户）
            t.publisher = {
              avatar: found.imagesUrl || '/images/default-avatar.png',
              name: wx.getStorageSync('userNickname') || ('用户'+found.userId),
              phone: ''
            };
            // 接单者信息
            t.acceptor = null;
            t.packageInfo = {
              code: found.remark || '',
              size: '',
              weight: ''
            };
            // 备注信息
            t.remark = found.remark || '';
            this.setData({ task: t, loading: false });
          } else {
            wx.showToast({ title: '任务不存在', icon:'none' });
            this.setData({ loading: false });
          }
        } else {
          wx.showToast({ title: res.data.msg || '加载失败', icon:'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon:'none' });
        this.setData({ loading: false });
      }
    });
  },

  // 接受任务
  onAcceptTask() {
    wx.showModal({
      title: '接受任务',
      content: '确定要接受这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用接受任务接口
          const task = this.data.task
          task.status = 'accepted'
          task.acceptor = {
            id: 2,
            name: '李四',
            avatar: '/images/default-avatar.png',
            phone: '13800138000',
            acceptTime: '2024-03-20 15:00'
          }
          this.setData({ task })
          wx.showToast({
            title: '已接受任务',
            icon: 'success'
          })
        }
      }
    })
  },

  // 完成任务
  onCompleteTask() {
    wx.showModal({
      title: '完成任务',
      content: '确认已完成任务吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用完成任务接口
          const task = this.data.task
          task.status = 'completed'
          this.setData({ task })
          wx.showToast({
            title: '任务已完成',
            icon: 'success'
          })
        }
      }
    })
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
  }
}) 
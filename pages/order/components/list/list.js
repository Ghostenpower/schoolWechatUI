const app = getApp();

Component({
  properties: {
    // 外部传入的初始活动标签页
    initialActiveTab: {
      type: Number,
      value: 0
    }
  },

  data: {
    activeTab: 0,
    tabs: ['全部', '待开始', '进行中', '已完成', '已取消'],
    orders: [],
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    // 订单状态映射 (0=全部,1=待开始,2=进行中,3=已完成,4=已取消)
    orderStatusMap: {
      0: '全部',
      1: '待开始',
      2: '进行中',
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

  lifetimes: {
    attached() {
      this.setData({ activeTab: this.properties.initialActiveTab });
      this.loadOrders();
    }
  },

  methods: {
    // 切换标签
    onTabChange(e) {
      const index = e.currentTarget.dataset.index;
      this.setData({
        activeTab: index,
        pageNum: 1,
        orders: [],
        hasMore: true
      });
      this.loadOrders();
    },

    // 查看订单详情
    onViewOrder(e) {
      const id = e.currentTarget.dataset.id;
      this.triggerEvent('viewOrder', { id });
    },

    // 确认完成
    onConfirmComplete(e) {
      const id = e.currentTarget.dataset.id;

      wx.showModal({
        title: '确认完成',
        content: '确认订单已完成吗？',
        confirmText: '确认完成',
        confirmColor: '#07c160',
        success: (res) => {
          if (res.confirm) {
            this._completeOrder(id);
          }
        }
      });
    },

    // 刷新订单列表
    refreshOrders() {
      this.setData({
        orders: [],
        pageNum: 1,
        hasMore: true
      });
      return this.loadOrders();
    },

    // 加载更多订单
    loadMore() {
      if (this.data.hasMore && !this.data.loading) {
        this.loadOrders();
      }
    },

    // 开始任务
    onStartTask(e) {
      const id = e.currentTarget.dataset.id;

      wx.showModal({
        title: '开始任务',
        content: '确认开始该任务吗？',
        confirmText: '确认开始',
        confirmColor: '#07c160',
        success: (res) => {
          if (res.confirm) {
            this._startOrder(id);
          }
        }
      });
    },

    // 加载订单列表
    loadOrders() {
      if (this.data.loading) return Promise.resolve();

      this.setData({ loading: true });

      let orderStatus;
      switch (this.data.activeTab) {
        case 1: orderStatus = 1; break;
        case 2: orderStatus = 2; break;
        case 3: orderStatus = 3; break;
        case 4: orderStatus = 4; break;
        default: orderStatus = 0;
      }

      return new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.baseUrl}/api/orders/getList`,
          method: 'GET',
          header: {
            'token': wx.getStorageSync('token') || 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjIsImV4cCI6MTc0NTExNzgxNX0.EmNpLFqFYpGlpftfiaeRyDWDmHFVzqhZ5G-sQURohrE'
          },
          data: {
            pageNum: this.data.pageNum,
            pageSize: this.data.pageSize,
            orderStatus: orderStatus
          },
          success: (res) => {
            if (res.data.code === 1) {
              const newOrders = this._processOrderData(res.data.data.list || []);
              const currentOrders = this.data.pageNum === 1 ? 
                newOrders : this.data.orders.concat(newOrders);
              const total = res.data.data.total || 0;
              app.globalData.orderCount = total; // 保存订单总数到全局数据
              this.setData({
                orders: currentOrders,
                pageNum: this.data.pageNum + 1,
                hasMore: res.data.data.hasNextPage
              });
            } else if (res.data.code === 401) {
              this.triggerEvent('authError');
            } else {
              wx.showToast({
                title: res.data.msg || '获取订单失败',
                icon: 'none',
                duration: 2000
              });
            }
          },
          fail: (err) => {
            console.error('获取订单列表失败:', err);
            wx.showToast({
              title: '网络错误，请重试',
              icon: 'none',
              duration: 2000
            });
            reject(err);
          },
          complete: () => {
            this.setData({ loading: false });
            resolve();
          }
        });
      });
    },

    // 处理订单数据
    _processOrderData(list) {
      return list.map(order => ({
        orderId: order.orderId,
        taskTitle: order.taskTitle,
        taskStatus: order.taskStatus,
        orderStatus: order.orderStatus,
        pickupLocation: order.pickupLocation,
        deliveryLocation: order.deliveryLocation,
        taskDescription: order.taskDescription,
        customerAvatarUrl: order.customerAvatarUrl,
        customerName: order.customerName,
        orderStatusText: this.data.orderStatusMap[order.orderStatus] || '未知状态',
        taskStatusText: this.data.taskStatusMap[order.taskStatus] || '未知状态',
        statusClass: this._getStatusClass(order.orderStatus),
        acceptTime: order.acceptTime ? this._formatTime(new Date(order.acceptTime)) : '',
        deadline: order.deadline ? this._formatTime(new Date(order.deadline)) : '',
        cancelReason: order.cancelReason || '',
        cancelTime: order.cancelTime ? this._formatTime(new Date(order.cancelTime)) : ''
      }));
    },

    // 完成订单
    _completeOrder(orderId) {
      wx.showLoading({ title: '提交中...', mask: true });

      wx.request({
        url: `${app.globalData.baseUrl}/api/orders/complete`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'token': wx.getStorageSync('token')
        },
        data: Number(orderId),
        success: (res) => {
          wx.hideLoading();
          if (res.data.code === 1) {
            this._updateLocalOrderStatus(orderId, 2);
            wx.showToast({
              title: '订单已完成',
              icon: 'success',
              duration: 2000
            });
          } else if (res.data.code === 401) {
            this.triggerEvent('authError');
          } else {
            wx.showToast({
              title: res.data.msg || '操作失败',
              icon: 'none',
              duration: 2000
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      });
    },

    // 本地更新订单状态
    _updateLocalOrderStatus(orderId, newStatus, cancelReason) {
      const orders = this.data.orders.map(order => {
        if (order.orderId === orderId) {
          const updatedOrder = {
            ...order,
            orderStatus: newStatus,
            orderStatusText: this.data.orderStatusMap[newStatus] || '未知状态',
            statusClass: this._getStatusClass(newStatus)
          };

          if (newStatus === 2) {
            updatedOrder.completionTime = this._formatTime(new Date());
          }

          if (newStatus === 3 && cancelReason) {
            updatedOrder.cancelTime = this._formatTime(new Date());
            updatedOrder.cancelReason = cancelReason;
          }

          return updatedOrder;
        }
        return order;
      });

      this.setData({ orders });
    },

    // 获取状态样式类
    _getStatusClass(orderStatus) {
      switch (orderStatus) {
        case 1: return 'pending';      // 待开始
        case 2: return 'processing';   // 进行中
        case 3: return 'completed';    // 已完成
        case 4: return 'cancelled';    // 已取消
        default: return '';
      }
    },

    // 格式化时间
    _formatTime(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    },

    // 开始订单
    _startOrder(orderId) {
      wx.showLoading({ title: '提交中...', mask: true });

      wx.request({
        url: `${app.globalData.baseUrl}/api/orders/start`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'token': wx.getStorageSync('token')
        },
        data: Number(orderId),
        success: (res) => {
          wx.hideLoading();
          if (res.data.code === 1) {
            this._updateLocalOrderStatus(orderId, 2);
            wx.showToast({
              title: '任务已开始，请及时完成跑腿任务',
              icon: 'none',
              duration: 3000
            });
          } else if (res.data.code === 401) {
            this.triggerEvent('authError');
          } else {
            wx.showToast({
              title: res.data.msg || '操作失败',
              icon: 'none',
              duration: 2000
            });
          }
        },
        fail: (err) => {
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
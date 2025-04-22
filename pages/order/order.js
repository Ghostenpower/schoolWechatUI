// pages/order/order.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    tabs: ['全部', '进行中', '已完成', '已取消'],
    orders: [],
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    // 订单状态映射 (0=全部,1=待完成,2=已完成,3=已取消)
    orderStatusMap: {
      0: '全部',
      1: '待完成',
      2: '已完成',
      3: '已取消'
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
  onLoad(options) {
    // 初始化滚动位置记录
    this.savedScrollPosition = 0;
    this.loadOrders();
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
    // 如果是从订单详情页返回，恢复之前保存的滚动位置
    const pages = getCurrentPages();
    if (pages.length > 1 && pages[pages.length - 1].route.includes('order/order')) {
      console.log('从其他页面返回订单列表，恢复滚动位置');
      // 如果有保存的滚动位置，延迟一小段时间再恢复
      if (this.savedScrollPosition > 0) {
        setTimeout(() => {
          console.log('恢复保存的滚动位置:', this.savedScrollPosition);
          wx.pageScrollTo({
            scrollTop: this.savedScrollPosition,
            duration: 0
          });
        }, 300);
      }
    } else {
      // 第一次加载页面时刷新数据
      this.refreshOrders();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 在页面隐藏时保存当前滚动位置
    wx.createSelectorQuery()
      .selectViewport()
      .scrollOffset(res => {
        this.savedScrollPosition = res.scrollTop || 0;
        console.log('页面隐藏时保存滚动位置:', this.savedScrollPosition);
      })
      .exec();
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
    this.refreshOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrders();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      activeTab: index,
      pageNum: 1, // 重置页码
      orders: [], // 清空现有订单
      hasMore: true // 重置加载状态
    });
    // 直接加载而不是调用refreshOrders避免重复重置
    this.loadOrders();
  },

  // 查看订单详情
  onViewOrder(e) {
    const id = e.currentTarget.dataset.id;
    
    // 保存当前滚动位置，供返回时使用
    wx.createSelectorQuery()
      .selectViewport()
      .scrollOffset(res => {
        this.savedScrollPosition = res.scrollTop || 0;
        console.log('进入详情页前保存滚动位置:', this.savedScrollPosition);
      })
      .exec();
    
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${id}`
    });
  },

  // 确认完成
  onConfirmComplete(e) {
    // 不使用e.stopPropagation()，微信小程序中通过catchtap已经阻止了冒泡
    
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成吗？',
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
          const orderId = Number(id);
          
          console.log('正在提交完成订单请求，orderId:', orderId);
          
          // 按照API文档格式发送请求
          wx.request({
            url: 'http://localhost:8051/api/orders/complete',
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'token': wx.getStorageSync('token')
            },
            data: orderId, // 直接发送订单ID
            success: (res) => {
              console.log('完成订单API响应:', res.data);
              
              // 隐藏加载提示
              wx.hideLoading();
              
              if (res.data.code === 1) { // 后端返回code为1表示成功
                // 本地更新操作的订单状态，避免重新加载整个列表
                this.updateLocalOrderStatus(orderId, 2); // 2表示已完成
                
                // 展示成功动画
                wx.showToast({
                  title: '订单已完成',
                  icon: 'success',
                  duration: 2000
                });
              } else {
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
  
  // 本地更新订单状态，而不是重新加载整个列表
  updateLocalOrderStatus(orderId, newStatus, cancelReason) {
    console.log('开始本地更新订单状态:', orderId, newStatus, cancelReason);
    const orders = this.data.orders;
    
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].orderId === orderId) {
        // 更新状态相关字段
        orders[i].orderStatus = newStatus;
        orders[i].orderStatusText = this.data.orderStatusMap[newStatus] || '未知状态';
        orders[i].statusClass = this.getStatusClass(newStatus);
        
        // 如果是完成状态，设置完成时间
        if (newStatus === 2) {
          const now = new Date();
          orders[i].completionTime = this.formatTime(now);
        }
        
        // 如果是取消状态，设置取消原因和时间
        if (newStatus === 3 && cancelReason) {
          const now = new Date();
          orders[i].cancelTime = this.formatTime(now);
          orders[i].cancelReason = cancelReason;
        }
        
        console.log('订单状态更新成功:', orders[i].orderId, orders[i].orderStatusText);
        break;
      }
    }
    
    this.setData({ orders });
  },

  // 格式化金额
  formatAmount(amount) {
    return amount.toFixed(2)
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending_payment': '待付款',
      'processing': '进行中',
      'completed': '已完成'
    }
    return statusMap[status] || status
  },

  // 刷新订单列表
  refreshOrders() {
    // 记录当前的滚动位置
    this.scrollPosition = undefined;
    wx.createSelectorQuery()
      .selectViewport()
      .scrollOffset(res => {
        this.scrollPosition = res.scrollTop || 0;
        console.log('记录当前滚动位置:', this.scrollPosition);
      })
      .exec();

    this.setData({
      orders: [],
      pageNum: 1,
      hasMore: true
    });

    // 返回加载订单的Promise，在加载完成后恢复滚动位置
    return this.loadOrders().then(() => {
      // 加载完成后，延迟一小段时间再恢复滚动位置，确保DOM已更新
      setTimeout(() => {
        if (this.scrollPosition !== undefined) {
          console.log('恢复滚动位置到:', this.scrollPosition);
          wx.pageScrollTo({
            scrollTop: this.scrollPosition,
            duration: 0 // 立即滚动，没有动画
          });
        }
      }, 300);
    });
  },

  // 加载订单列表
  loadOrders() {
    if (this.data.loading) return Promise.resolve();
    
    this.setData({ loading: true });
    
    // 根据当前标签页获取对应状态的订单
    // 订单状态(0=全部,1=待完成,2=已完成,3=已取消)
    let orderStatus;
    switch (this.data.activeTab) {
      case 1: // 进行中
        orderStatus = 1; // 待完成状态
        break;
      case 2: // 已完成
        orderStatus = 2; // 已完成状态
        break;
      case 3: // 已取消
        orderStatus = 3; // 已取消状态
        break;
      default: // 全部
        orderStatus = 0; // 使用0代表全部
    }

    console.log('使用的orderStatus值:', orderStatus, '类型:', typeof orderStatus);

    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:8051/api/orders/getList',
        method: 'GET',
        header: {
          'token': wx.getStorageSync('token') || 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjIsImV4cCI6MTc0NTExNzgxNX0.EmNpLFqFYpGlpftfiaeRyDWDmHFVzqhZ5G-sQURohrE'
        },
        data: {
          pageNum: this.data.pageNum,
          pageSize: this.data.pageSize,
          orderStatus: orderStatus // 确保发送数字类型的状态值
        },
        success: (res) => {
          console.log('订单列表响应:', res.data);
          if (res.data.code === 1) {
            const newOrders = [];
            const list = res.data.data.list || [];
            
            for (let i = 0; i < list.length; i++) {
              const order = list[i];
              const newOrder = {
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
                statusClass: this.getStatusClass(order.orderStatus),
                acceptTime: order.acceptTime ? this.formatTime(new Date(order.acceptTime)) : '',
                deadline: order.deadline ? this.formatTime(new Date(order.deadline)) : '',
                cancelReason: order.cancelReason || '',
                cancelTime: order.cancelTime ? this.formatTime(new Date(order.cancelTime)) : ''
              };
              newOrders.push(newOrder);
            }

            // 根据页码决定是替换还是追加
            const currentOrders = this.data.pageNum === 1 ? 
              newOrders : this.data.orders.concat(newOrders);
            
            this.setData({
              orders: currentOrders,
              pageNum: this.data.pageNum + 1,
              hasMore: res.data.data.hasNextPage
            });
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

  // 获取状态样式类
  getStatusClass(orderStatus) {
    switch (orderStatus) {
      case 1: // 待完成
        return 'pending';
      case 2: // 已完成
        return 'completed';
      case 3: // 已取消
        return 'cancelled';
      default:
        return '';
    }
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
})
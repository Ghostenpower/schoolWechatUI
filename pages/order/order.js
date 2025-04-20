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
    // 每次显示页面时刷新数据
    this.refreshOrders();
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
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${id}`
    });
  },

  // 确认完成
  onConfirmComplete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认完成',
      content: '确认订单已完成吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用完成订单接口
          wx.request({
            url: 'YOUR_API_BASE_URL/api/orders/complete',
            method: 'POST',
            data: { orderId: id },
            success: (res) => {
              if (res.data.code === 1) {
                wx.showToast({
                  title: '订单已完成',
                  icon: 'success'
                });
                this.refreshOrders();
              } else {
                wx.showToast({
                  title: res.data.msg || '操作失败',
                  icon: 'none'
                });
              }
            }
          });
        }
      }
    });
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
    this.setData({
      orders: [],
      pageNum: 1,
      hasMore: true
    });
    return this.loadOrders();
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
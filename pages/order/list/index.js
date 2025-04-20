// pages/order/list/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    orders: [],
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    // 订单状态映射
    orderStatusMap: {
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
    this.setData({
      pageNum: 1,
      hasMore: true,
      orders: []
    }, () => {
      this.loadOrders().then(() => {
        wx.stopPullDownRefresh();
      });
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

  loadOrders: function() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'YOUR_API_BASE_URL/api/orders/getList',
        method: 'GET',
        data: {
          pageNum: this.data.pageNum,
          pageSize: this.data.pageSize
        },
        success: (res) => {
          if (res.data.code === 1) {
            const newOrders = res.data.data.list.map(order => ({
              ...order,
              orderStatusText: this.data.orderStatusMap[order.orderStatus] || '未知状态',
              taskStatusText: this.data.taskStatusMap[order.taskStatus] || '未知状态',
              statusClass: this.getStatusClass(order.orderStatus),
              acceptTime: order.acceptTime ? this.formatTime(new Date(order.acceptTime)) : '',
              deadline: order.deadline ? this.formatTime(new Date(order.deadline)) : ''
            }));

            this.setData({
              orders: [...this.data.orders, ...newOrders],
              pageNum: this.data.pageNum + 1,
              hasMore: res.data.data.hasNextPage
            });
          } else {
            wx.showToast({
              title: res.data.msg || '获取订单失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          wx.showToast({
            title: '网络错误',
            icon: 'none'
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

  getStatusClass: function(orderStatus) {
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

  formatTime: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  onTapOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${orderId}`
    });
  }
})
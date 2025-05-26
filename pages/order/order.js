Page({
  /**
   * 页面的初始数据
   */
  data: {
    savedScrollPosition: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.savedScrollPosition = 0;
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新订单列表
    const orderList = this.selectComponent('#orderList');
    if (orderList) {
      orderList.refreshOrders();
    }
    
    // 恢复滚动位置
    const pages = getCurrentPages();
    if (pages.length > 1 && pages[pages.length - 1].route.includes('order/order')) {
      if (this.savedScrollPosition > 0) {
        setTimeout(() => {
          wx.pageScrollTo({
            scrollTop: this.savedScrollPosition,
            duration: 0
          });
        }, 300);
      }
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    wx.createSelectorQuery()
      .selectViewport()
      .scrollOffset(res => {
        this.savedScrollPosition = res.scrollTop || 0;
      })
      .exec();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.selectComponent('#orderList').refreshOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.selectComponent('#orderList').loadMore();
  },

  // 处理查看订单详情事件
  onViewOrderDetail(e) {
    const id = e.detail.id;

    wx.createSelectorQuery()
      .selectViewport()
      .scrollOffset(res => {
        this.savedScrollPosition = res.scrollTop || 0;
      })
      .exec();

    wx.navigateTo({
      url: `/pages/order/detail/index?id=${id}`
    });
  },

  // 处理认证错误事件
  onAuthError() {
    wx.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 1000,
    });
  }
});
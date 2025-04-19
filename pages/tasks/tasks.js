// pages/tasks/tasks.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    tabs: ['全部任务', '我发布的', '我接收的'],
    searchKeyword: '',
    tasks: [
      {
        id: 1,
        type: 'express',
        title: '帮取快递',
        description: '菜鸟驿站有一个快递，需要帮忙取一下',
        reward: 5,
        status: 'pending',
        location: '菜鸟驿站',
        destination: '6号宿舍楼',
        createTime: '2024-03-20 14:30',
        deadline: '2024-03-20 17:30',
        publisher: {
          avatar: '/images/default-avatar.png',
          nickname: '张三'
        }
      }
    ],
    originalTasks: [] // 用于存储未过滤的任务列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // TODO: 获取任务列表
    this.setData({
      originalTasks: this.data.tasks
    })
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

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.filterTasks()
  },

  // 确认搜索
  onSearch() {
    this.filterTasks()
  },

  // 过滤任务
  filterTasks() {
    const keyword = this.data.searchKeyword.toLowerCase()
    if (!keyword) {
      this.setData({
        tasks: this.data.originalTasks
      })
      return
    }

    const filteredTasks = this.data.originalTasks.filter(task => 
      task.title.toLowerCase().includes(keyword) ||
      task.description.toLowerCase().includes(keyword) ||
      task.location.toLowerCase().includes(keyword) ||
      task.destination.toLowerCase().includes(keyword)
    )

    this.setData({
      tasks: filteredTasks
    })
  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index,
      searchKeyword: '' // 切换标签时清空搜索关键词
    })
    // TODO: 根据标签获取对应的任务列表
  },

  // 发布任务
  onPublishTask() {
    wx.navigateTo({
      url: '/pages/tasks/publish/index'
    })
  },

  // 查看任务详情
  onViewTask(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/tasks/detail/index?id=${id}`
    })
  },

  // 格式化金额
  formatAmount(amount) {
    return amount.toFixed(2)
  }
})
// pages/tasks/my/index.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 'all', // 默认显示全部
    tasks: [],
    filteredTasks: [], // 新增：用于页面展示的筛选后任务
    loading: false,
    page: 1,
    hasMore: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadTasks()
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
    this.refreshTasks()
    wx.stopPullDownRefresh()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadTasks()
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 切换任务类型标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({
      activeTab: tab
    })
    this.filterTasks()
  },

  // 新增：筛选任务
  filterTasks() {
    let filtered = [];
    if (this.data.activeTab === 'all') {
      filtered = this.data.tasks;
    } else {
      // tab与status的映射
      const statusMap = {
        pending: 'pending',
        accepted: 'accepted',
        in_progress: 'in_progress',
        completed: 'completed',
        cancelled: 'cancelled'
      };
      filtered = this.data.tasks.filter(t => t.status === statusMap[this.data.activeTab]);
    }
    this.setData({ filteredTasks: filtered });
  },

  // 加载任务列表
  loadTasks() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })
    let url = `${app.globalData.baseUrl}/api/tasks/myPublic`;
    let from = 'published';
    let showEditDelete = true;

    wx.request({
      url,
      method: 'GET',
      data: {
        page: this.data.page,
        pageSize: 10
      },
      header: {
        'token': wx.getStorageSync('token')
      },
      success: (res) => {
        console.log('接口返回：', res);
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          let taskList = []
          const data = res.data.data
          if (Array.isArray(data)) {
            taskList = data
          } else if (data && Array.isArray(data.list)) {
            taskList = data.list
          } else {
            taskList = []
          }

          const newTasks = taskList.map(task => ({
            id: task.taskId,
            userId: task.userId,
            title: task.title,
            description: task.description,
            type: this.getTaskType(task.taskType),
            status: this.getTaskStatus(task.status),
            statusText: this.getStatusText(task.status),
            price: task.price,
            location: task.pickupLocation,
            destination: task.deliveryLocation,
            deadline: this.formatTime(task.deadline),
            createTime: this.formatTime(task.createdAt),
            remark: task.remark,
            imagesUrl: task.imagesUrl,
            from: from
          }))

          // 批量获取头像昵称
          const baseUrl = app.globalData.baseUrl;
          console.log('批量请求用户信息 userIds:', newTasks.map(t => t.userId));
          Promise.all(newTasks.map(task => {
            return new Promise((resolve) => {
              if (!task.userId) {
                console.warn('任务缺少userId:', task);
                resolve({
                  ...task,
                  publisher: {
                    avatar: '/images/default-avatar.png',
                    nickname: `用户${task.userId}`
                  }
                });
                return;
              }
              wx.request({
                url: `${baseUrl}/api/users/getOneById?userId=${task.userId}`,
                method: 'GET',
                header: {
                  'token': wx.getStorageSync('token')
                },
                success: (userRes) => {
                  console.log('用户信息接口响应:', userRes);
                  if (userRes.data && userRes.data.code === 1 && userRes.data.data) {
                    resolve({
                      ...task,
                      publisher: {
                        avatar: userRes.data.data.avatarUrl || '/images/default-avatar.png',
                        nickname: userRes.data.data.username || `用户${task.userId}`
                      }
                    });
                  } else {
                    resolve({
                      ...task,
                      publisher: {
                        avatar: '/images/default-avatar.png',
                        nickname: `用户${task.userId}`
                      }
                    });
                  }
                },
                fail: (err) => {
                  console.log('用户信息请求失败:', err);
                  resolve({
                    ...task,
                    publisher: {
                      avatar: '/images/default-avatar.png',
                      nickname: `用户${task.userId}`
                    }
                  });
                }
              });
            });
          })).then(tasksWithUser => {
            console.log('批量用户信息合并后:', tasksWithUser);
            // 判断是否还有更多数据
            let hasMore = false;
            if (typeof data.hasNextPage !== 'undefined') {
              hasMore = data.hasNextPage;
            } else if (typeof data.pages !== 'undefined' && typeof data.pageNum !== 'undefined') {
              hasMore = data.pageNum < data.pages;
            } else if (Array.isArray(data.list) && typeof data.pageSize !== 'undefined') {
              hasMore = data.list.length === data.pageSize;
            } else {
              hasMore = false;
            }

            this.setData({
              tasks: this.data.page === 1 ? tasksWithUser : [...this.data.tasks, ...tasksWithUser],
              page: this.data.page + 1,
              hasMore: hasMore,
              showEditDelete: showEditDelete
            }, () => {
              this.filterTasks();
            })
          });
        } else {
          wx.showToast({
            title: (res.data && res.data.msg) ? res.data.msg : '请求失败',
            icon: 'none'
          })
        }
        this.setData({ loading: false })
      },
      fail: (error) => {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 获取任务类型
  getTaskType(type) {
    const typeMap = {
      0: 'express',
      1: 'errand',
      2: 'shopping',
      3: 'print',
      4: 'other',
      5: 'other'
    }
    return typeMap[type] || 'other'
  },

  // 获取任务状态
  getTaskStatus(status) {
    const statusMap = {
      0: 'pending',      // 待接单
      1: 'accepted',     // 已接单
      2: 'in_progress',  // 进行中
      3: 'completed',    // 已完成
      4: 'cancelled'     // 已取消
    }
    return statusMap[status] || 'pending'
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      0: '待接单',
      1: '已接单',
      2: '进行中',
      3: '已完成',
      4: '已取消'
    }
    return statusMap[status] || '未知状态'
  },

  // 格式化时间
  formatTime(dateStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 点击任务项
  onTaskTap(e) {
    const task = e.currentTarget.dataset.task
    wx.navigateTo({
      url: `/pages/tasks/detail/index?id=${task.id}&from=${task.from}`
    })
  },

  // 编辑任务
  onEditTask(e) {
    const taskId = e.currentTarget.dataset.id;
    console.log('编辑任务，taskId:', taskId);
    wx.navigateTo({
      url: `/pages/tasks/publish/index?taskId=${taskId}`
    });
  },

  // 取消任务
  onDeleteTask(e) {
    const taskId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个任务吗？',
      success: (modalRes) => {
        if (modalRes.confirm) {
          wx.request({
            url: `${app.globalData.baseUrl}/api/tasks/cancel`,
            method: 'POST',
            data: { taskId },
            header: {
              'token': wx.getStorageSync('token'),
              'content-type': 'application/x-www-form-urlencoded'
            },
            success: (res) => {
              if (res.statusCode === 200 && res.data && res.data.code === 1) {
                wx.showToast({
                  title: '取消成功',
                  icon: 'success'
                })
                this.refreshTasks()
              } else {
                wx.showToast({
                  title: (res.data && res.data.msg) ? res.data.msg : '取消失败',
                  icon: 'none'
                })
              }
            },
            fail: () => {
              wx.showToast({
                title: '取消失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 确认完成任务
  async onCompleteTask(e) {
    const taskId = e.currentTarget.dataset.id
    try {
      const res = await wx.request({
        url: `${app.globalData.baseUrl}/api/orders/complete`,
        method: 'POST',
        data: { taskId },
        header: {
          'token': wx.getStorageSync('token'),
          'content-type': 'application/x-www-form-urlencoded'
        }
      })

      if (res.statusCode === 200) {
        wx.showToast({
          title: '操作成功',
          icon: 'success'
        })
        this.refreshTasks()
      } else {
        throw new Error('操作失败')
      }
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 提交完成任务
  onSubmitTask(e) {
    const taskId = e.currentTarget.dataset.id
    wx.request({
      url: `${app.globalData.baseUrl}/api/tasks/complete`,
      method: 'POST',
      data: { taskId },
      header: {
        'token': wx.getStorageSync('token'),
        'content-type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          wx.showToast({
            title: '提交成功',
            icon: 'success'
          })
          this.refreshTasks()
        } else {
          wx.showToast({
            title: (res.data && res.data.msg) ? res.data.msg : '提交失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '提交失败',
          icon: 'none'
        })
      }
    })
  },

  // 刷新任务列表
  refreshTasks() {
    this.setData({
      tasks: [],
      page: 1,
      hasMore: true
    })
    this.loadTasks()
  }
})
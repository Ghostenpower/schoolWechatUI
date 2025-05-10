Page({
  /**
   * 页面的初始数据
   */
  data: {
    tasks: [],
    loading: true,
    hasMore: true,
    currentCategory: 'all',
    sortBy: 'latest',
    page: 1,
    pageSize: 10,
    keyword: '',
    from: '', // 来源：recommend, hot
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.setNavigationBarTitle({
      title: '任务列表'
    });
    
    // 处理页面参数
    if (options.category) {
      this.setData({
        currentCategory: options.category
      });
    }
    
    if (options.type) {
      this.setData({
        currentCategory: options.type
      });
    }
    
    if (options.keyword) {
      this.setData({
        keyword: options.keyword
      });
    }
    
    if (options.from) {
      this.setData({
        from: options.from
      });
      
      // 设置页面标题
      if (options.from === 'recommend') {
        wx.setNavigationBarTitle({
          title: '推荐任务'
        });
      } else if (options.from === 'hot') {
        wx.setNavigationBarTitle({
          title: '热门任务'
        });
      }
    }
    
    // 加载任务数据
    this.loadTasks();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if (wx.getStorageSync('shouldRefreshList')) {
      wx.setStorageSync('shouldRefreshList', false);
      this.setData({
        page: 1,
        tasks: [],
        hasMore: true
      });
      this.loadTasks();
    }
  },

  /**
   * 加载任务数据
   */
  loadTasks: function (isRefresh = false) {
    const app = getApp();
    // 获取存储的token
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;
    
    if (isRefresh) {
      this.setData({
        page: 1,
        tasks: [],
        hasMore: true
      });
    }
    
    this.setData({
      loading: true
    });
    
    wx.request({
      url: baseUrl + '/api/tasks/all',
      method: 'GET',
      data: {
        pageNum: this.data.page,
        pageSize: this.data.pageSize
      },
      header: {
        'token': token
      },
      success: (res) => {
        console.log('API响应数据:', res.data);
        if (res.data.code === 1 && res.data.data) {
          const { total, list } = res.data.data;
          const formattedTasks = this.formatApiTasks(list);
          // 分类过滤
          let filteredTasks = formattedTasks;
          if (this.data.currentCategory && this.data.currentCategory !== 'all') {
            filteredTasks = formattedTasks.filter(task => task.type === this.data.currentCategory);
          }
          const now = new Date();
          filteredTasks = filteredTasks.filter(task => {
            let deadline = task.deadline;
            if (typeof deadline === 'string' && deadline.indexOf('月') > -1) {
              // 兼容"11月15日 14:30"格式
              const match = deadline.match(/(\d+)月(\d+)日 (\d+):(\d+)/);
              if (match) {
                const month = parseInt(match[1], 10) - 1;
                const day = parseInt(match[2], 10);
                const hour = parseInt(match[3], 10);
                const minute = parseInt(match[4], 10);
                const year = new Date().getFullYear();
                deadline = new Date(year, month, day, hour, minute);
              } else {
                deadline = now; // 解析失败，直接不过滤
              }
            } else {
              deadline = new Date(deadline.replace(/-/g, '/'));
            }
            return task.status === 'pending' && deadline > now;
          });
          const hasMore = this.data.tasks.length + filteredTasks.length < total;

          // 批量获取头像昵称
          console.log('批量请求用户信息 userIds:', filteredTasks.map(t => t.userId));
          Promise.all(filteredTasks.map(task => {
            return new Promise((resolve) => {
              if (!task.userId) {
                console.warn('任务缺少userId:', task);
                resolve({
                  ...task,
                  publisher: {
                    avatar: '/images/default-avatar.png',
                    nickname: `用户${task.userId || task.id}`
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
            let newTasks;
            if (this.data.page === 1) {
              newTasks = tasksWithUser;
            } else {
              // 只在末尾追加新数据，且用id去重，顺序不变
              const idSet = new Set(this.data.tasks.map(item => item.id));
              newTasks = [...this.data.tasks];
              tasksWithUser.forEach(item => {
                if (!idSet.has(item.id)) {
                  newTasks.push(item);
                }
              });
            }
            const hasMore = newTasks.length < total;
            this.setData({
              loading: false,
              tasks: newTasks,
              hasMore: hasMore
            });
          });
        } else {
          console.error('API返回错误:', res.data);
          this.setData({ loading: false });
          wx.showToast({
            title: res.data.msg || '获取任务列表失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('API请求失败:', err);
        this.setData({
          loading: false
        });
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  /**
   * 将API返回的任务数据转换为页面需要的格式
   */
  formatApiTasks: function (apiTasks) {
    return apiTasks.map(task => {
      // 将API返回的任务类型转换为前端使用的类型
      let taskType = 'other';
      switch (task.taskType) {
        case 0:
          taskType = 'express';
          break;
        case 1:
          taskType = 'errand';
          break;
        case 2:
          taskType = 'shopping';
          break;
        case 3:
          taskType = 'print';
          break;
        case 4:
          taskType = 'other';
          break;
      }
      
      // 将API返回的任务状态转换为前端使用的状态
      let status = 'pending';
      switch (task.status) {
        case 0:
          status = 'pending';
          break;
        case 1:
          status = 'accepted';
          break;
        case 2:
          status = 'completed';
          break;
        case 3:
          status = 'cancelled';
          break;
      }
      
      // 格式化截止时间
      // 修复iOS设备上日期格式解析问题
      let deadline;
      try {
        // 首先尝试标准的ISO格式解析
        if (task.deadline) {
          // 确保日期格式兼容iOS设备
          const dateStr = task.deadline.replace(' ', 'T');
          deadline = new Date(dateStr);
          
          // 检查日期是否有效
          if (isNaN(deadline.getTime())) {
            // 如果日期无效，尝试替代解析方法
            const parts = task.deadline.split(/[- :T]/);
            // 注意：月份在 JavaScript Date 中是从 0 开始的
            deadline = new Date(parts[0], parts[1] - 1, parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
          }
        } else {
          deadline = new Date(); // 默认为当前时间
        }
      } catch (error) {
        console.error('日期解析错误:', error, task.deadline);
        deadline = new Date(); // 出错时使用当前时间作为后备
      }
      
      const month = deadline.getMonth() + 1;
      const day = deadline.getDate();
      const hours = deadline.getHours();
      const minutes = deadline.getMinutes();
      const formattedDeadline = `${month}月${day}日 ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
      
      return {
        id: task.taskId,
        userId: task.userId,
        type: taskType,
        title: task.title,
        description: task.description || '暂无描述',
        reward: task.price,
        status: status,
        location: task.pickupLocation || '未指定位置',
        deadline: formattedDeadline,
        publisher: {
          avatar: task.userAvatar || '/images/default-avatar.png',
          nickname: task.userNickname || `用户${task.userId}`
        }
      };
    });
  },

  /**
   * 分类选择
   */
  onCategorySelect: function (e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;
    
    this.setData({
      currentCategory: category,
      page: 1,
      tasks: [],
      hasMore: true
    });
    
    this.loadTasks();
  },

  /**
   * 排序方式切换
   */
  onSortChange: function (e) {
    const sortBy = e.currentTarget.dataset.sort;
    if (sortBy === this.data.sortBy) return;
    
    this.setData({
      sortBy: sortBy,
      page: 1,
      tasks: [],
      hasMore: true
    });
    
    this.loadTasks();
  },

  /**
   * 查看任务详情
   */
  onViewTask: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/tasks/detail/index?id=${id}`
    });
  },

  /**
   * 接受任务
   */
  onAcceptTask: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认接单',
      content: '确定要接受这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          const token = wx.getStorageSync('token');
          const baseUrl = getApp().globalData.baseUrl;
          // 先获取courierId
          wx.request({
            url: `${baseUrl}/api/couriers/getCourierId`,
            method: 'GET',
            header: { 'token': token },
            success: (courierRes) => {
              if (courierRes.data && courierRes.data.code === 1 && courierRes.data.data) {
                const courierId = courierRes.data.data;
                console.log('准备请求 /api/orders/add', { taskId: id, courierId });
                wx.request({
                  url: `${baseUrl}/api/orders/add`,
                  method: 'POST',
                  header: { 'token': token, 'content-type': 'application/json' },
                  data: { taskId: id, courierId },
                  success: (res) => {
                    console.log('/api/orders/add 响应:', res);
                    wx.hideLoading();
                    if (res.data.code === 1) {
                      // 更新本地任务状态
                      const tasks = this.data.tasks.map(task => {
                        if (task.id === id) {
                          return { ...task, status: 'accepted' };
                        }
                        return task;
                      });
                      this.setData({ tasks });
                      wx.showToast({ title: '接单成功', icon: 'success' });
                      wx.setStorageSync('myTaskActiveTab', 'received');
                      wx.switchTab({ url: '/pages/tasks/my/index' });
                    } else {
                      wx.showToast({ title: res.data.msg || '接单失败', icon: 'none' });
                    }
                  },
                  fail: () => {
                    wx.hideLoading();
                    wx.showToast({ title: '网络请求失败', icon: 'none' });
                  }
                });
              } else {
                wx.hideLoading();
                wx.showToast({ title: courierRes.data.msg || '获取快递员ID失败', icon: 'none' });
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

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.setData({
      page: 1,
      tasks: [],
      hasMore: true
    });
    this.loadTasks(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      });
      this.loadTasks();
    }
  },
  
  /**
   * 格式化金额
   */
  formatAmount(amount) {
    return amount.toFixed(2);
  }
}) 
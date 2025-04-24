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
    
    // 调用实际API获取任务列表
    wx.request({
      url: baseUrl + '/api/tasks/all',
      method: 'GET',
      header: {
        'token': token
      },
      success: (res) => {
        console.log('API响应数据:', res.data);
        if (res.data.code === 1 && res.data.data) {
          const { total, list } = res.data.data;
          
          // 转换API返回的数据为页面需要的格式
          const formattedTasks = this.formatApiTasks(list);
          
          // 判断是否还有更多数据
          const hasMore = this.data.tasks.length + formattedTasks.length < total;
          
          this.setData({
            loading: false,
            tasks: [...this.data.tasks, ...formattedTasks],
            hasMore: hasMore
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
          wx.showLoading({
            title: '处理中...',
          });
          
          // 使用固定的测试token
          const token = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjIsImV4cCI6MTc0NTQyNTA1NX0.kouYqgUY47UYo6iZOOeTD1Mmc_-zbIxK-viqEs0p9T0';
          
          // 调用接单API
          wx.request({
            url: `http://localhost:8051/api/tasks/accept/${id}`,
            method: 'POST',
            header: {
              'Authorization': 'Bearer ' + token
            },
            success: (res) => {
              wx.hideLoading();
              
              if (res.data.code === 1) {
                // 更新本地任务状态
                const tasks = this.data.tasks.map(task => {
                  if (task.id === id) {
                    return {
                      ...task,
                      status: 'accepted'
                    };
                  }
                  return task;
                });
                
                this.setData({
                  tasks: tasks
                });
                
                wx.showToast({
                  title: '接单成功',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: res.data.msg || '接单失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
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
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
    isSearchMode: false,
    total: 0, // 添加总数记录
    currentStatus: 0, // 当前选中的状态：0-待接单，1-进行中，2-已完成，3-已取消
    tasksType: -1, // 当前任务类型：-1-全部, 0-快递, 1-跑腿, 2-代购, 3-打印, 4-其他
    statusList: [
      { id: 0, name: '待接单' },
      { id: 1, name: '进行中' },
      { id: 2, name: '已完成' },
      { id: 3, name: '已取消' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.setNavigationBarTitle({
      title: '任务列表'
    });
    
    // 处理页面参数
    if (options.keyword) {
      this.setData({
        keyword: options.keyword,
        page: 1,
        tasks: [],
        hasMore: false,
        isSearchMode: true
      });
      this.searchTasks(options.keyword);
    } else {
      this.setData({ isSearchMode: false });
      if (options.category) {
        this.setData({ currentCategory: options.category });
      }
      if (options.type) {
        this.setData({ currentCategory: options.type });
      }
      if (options.from) {
        this.setData({ from: options.from });
        
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
    }
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
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;
    
    if (isRefresh) {
      this.setData({
        page: 1,
        tasks: [],
        hasMore: true,
        total: 0
      });
    }
    
    if (!this.data.hasMore && !isRefresh) {
      return;
    }
    
    this.setData({
      loading: true
    });
    
    wx.request({
      url: baseUrl + '/api/tasks/getListByStatus',
      method: 'POST',
      data: {
        pageNum: this.data.page,
        pageSize: this.data.pageSize,
        taskStatus: this.data.currentStatus,
        tasksType: this.data.tasksType
      },
      header: {
        'token': token,
        'content-type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          const { total, list } = res.data.data;
          const formattedTasks = this.formatApiTasks(list);
          
          // 只有待接单状态才需要过滤过期任务
          let filteredTasks = formattedTasks;
          if (this.data.currentStatus === 0) {
            const now = new Date();
            filteredTasks = formattedTasks.filter(task => {
              let deadline = this.parseDeadline(task.deadline);
              return deadline > now;
            });
          }

          // 批量获取头像昵称
          Promise.all(filteredTasks.map(task => {
            return new Promise((resolve) => {
              if (!task.userId) {
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
            let newTasks;
            if (this.data.page === 1) {
              newTasks = tasksWithUser;
            } else {
              const idSet = new Set(this.data.tasks.map(item => item.id));
              newTasks = [...this.data.tasks];
              tasksWithUser.forEach(item => {
                if (!idSet.has(item.id)) {
                  newTasks.push(item);
                }
              });
            }
            
            // 修正hasMore的判断逻辑
            const hasMore = newTasks.length < total;
            
            this.setData({
              loading: false,
              tasks: newTasks,
              hasMore: hasMore,
              total: total
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
    if (this.data.isSearchMode) return;
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;
    
    let tasksType = 4; // Default to 'other'
    switch (category) {
      case 'all':
        tasksType = -1; // 全部
        break;
      case 'express':
        tasksType = 0;
        break;
      case 'errand':
        tasksType = 1;
        break;
      case 'shopping':
        tasksType = 2;
        break;
      case 'print':
        tasksType = 3;
        break;
      case 'other':
        tasksType = 4;
        break;
    }
    
    this.setData({
      currentCategory: category,
      tasksType: tasksType,
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
    if (this.data.isSearchMode) return;
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

                      // 推送接单消息
                      const publisherId = this.data.tasks.find(task => task.id === id).userId;
                      const messageContent = `您的任务已被接单，任务号为${id}`;
                      const myUserInfo = wx.getStorageSync('userInfo');
                      const myUserId = myUserInfo ? myUserInfo.userId : null;
                      console.log('publisherId', publisherId);
                      console.log('myUserId', myUserId);
                      const chatUrl = getApp().globalData.chatUrl;
                      if (publisherId && myUserId) {
                        wx.request({
                          url: `${chatUrl}/api/userPushMsgToUser`,
                          method: 'POST', 
                          header: {'content-type': 'application/json' },
                          data: { userId: myUserId.toString(), content: messageContent, otherId: publisherId.toString() },
                          success: () => {
                            console.log('推送接单消息成功');
                          },
                          fail: () => {
                            console.error('推送接单消息失败');
                          }
                        });
                      } else {
                        console.error('推送接单消息失败: 未知的publisherId或myUserId');
                      }
                      
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
                // 用户不是骑手
                wx.hideLoading();
                wx.showToast({ title: '您还不是骑手，请先注册', icon: 'none' });
                setTimeout(() => {
                  wx.navigateTo({
                    url: '/pages/rider/register/register'
                  });
                }, 1500);
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
  },

  searchTasks: function (keyword) {
    console.log('实际请求的keyword:', keyword);
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;
    
    if (!this.data.hasMore && this.data.page > 1) {
      return;
    }
    
    this.setData({ loading: true });
    
    wx.request({
      url: `${baseUrl}/api/tasks/search`,
      method: 'GET',
      data: {
        keyword: keyword,
        pageNum: this.data.page,
        pageSize: this.data.pageSize
      },
      header: { 'token': token },
      success: (res) => {
        console.log('接口原始返回:', res.data);
        if (res.data.code === 1 && res.data.data && Array.isArray(res.data.data.list)) {
          const { total, list } = res.data.data;
          const formattedTasks = this.formatApiTasks(list);
          
          Promise.all(formattedTasks.map(task => {
            return new Promise((resolve) => {
              if (!task.userId) {
                resolve(task);
                return;
              }
              wx.request({
                url: `${baseUrl}/api/users/getOneById?userId=${task.userId}`,
                method: 'GET',
                header: { 'token': token },
                success: (userRes) => {
                  if (userRes.data && userRes.data.code === 1 && userRes.data.data) {
                    task.publisher = {
                      avatar: userRes.data.data.avatarUrl || '/images/default-avatar.png',
                      nickname: userRes.data.data.username || `用户${task.userId}`
                    };
                  }
                  resolve(task);
                },
                fail: () => {
                  resolve(task);
                }
              });
            });
          })).then(tasksWithUser => {
            console.log('搜索结果:', tasksWithUser);
            let newTasks;
            if (this.data.page === 1) {
              newTasks = tasksWithUser;
            } else {
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
              hasMore: hasMore,
              total: total
            });
          });
        } else {
          this.setData({ 
            loading: false,
            tasks: [],
            hasMore: false,
            total: 0
          });
        }
      },
      fail: () => {
        this.setData({ 
          loading: false,
          tasks: [],
          hasMore: false,
          total: 0
        });
        wx.showToast({ title: '搜索失败', icon: 'none' });
      }
    });
  },

  applyCategoryFilter: function(category) {
    if (this.data.isSearchMode) return;
    // ...原有分类过滤逻辑...
  },

  /**
   * 切换任务状态
   */
  onStatusChange(e) {
    const status = parseInt(e.currentTarget.dataset.status);
    if (status === this.data.currentStatus) return;
    
    this.setData({
      currentStatus: status,
      page: 1,
      tasks: [],
      hasMore: true,
      loading: true
    });
    
    this.loadTasks();
  },

  /**
   * 解析截止时间
   */
  parseDeadline(dateStr) {
    if (!dateStr) return new Date();
    
    try {
      // 处理"x月x日 xx:xx"格式
      if (typeof dateStr === 'string' && dateStr.indexOf('月') > -1) {
        const match = dateStr.match(/(\d+)月(\d+)日 (\d+):(\d+)/);
        if (match) {
          const month = parseInt(match[1], 10) - 1;
          const day = parseInt(match[2], 10);
          const hour = parseInt(match[3], 10);
          const minute = parseInt(match[4], 10);
          const year = new Date().getFullYear();
          return new Date(year, month, day, hour, minute);
        }
      }
      
      // 处理标准日期格式
      if (dateStr.includes(' ')) {
        dateStr = dateStr.replace(' ', 'T');
      }
      if (!dateStr.includes('T')) {
        dateStr += 'T00:00:00';
      }
      
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        // 如果日期无效，尝试替代解析方法
        const parts = dateStr.split(/[- :T]/).map(part => parseInt(part, 10));
        return new Date(parts[0], parts[1] - 1, parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
      }
      return d;
    } catch (e) {
      console.error('日期解析错误:', e);
      return new Date();
    }
  },
}) 
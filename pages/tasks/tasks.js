// pages/tasks/tasks.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    searchKeyword: '',
    searching: false,
    searchResults: [],
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
    originalTasks: [], // 用于存储未过滤的任务列表
    currentCampus: '主校区', // 当前校区
    currentCategory: 0, // 当前分类, 0表示全部
    userProfile: {
      location: '主校区',
      preferredCategories: ['express'],
      schedule: '全天'
    },
    recommendTasks: [], // 推荐任务
    hotTasks: [], // 热门任务
    activeFilter: 'latest', // 当前筛选条件，默认为最新发布
    isConnected: false, // WebSocket连接状态
    isLoading: true, // 加载状态
    loading: true,
    hasMore: true,
    sortBy: 'latest',
    page: 1,
    pageSize: 10,
    keyword: '',
    from: '' // 来源：recommend, hot
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 显示骨架屏
    this.setData({
      isLoading: true
    });
    
    // 模拟API请求延迟
    setTimeout(() => {
      // 获取任务列表
      this.fetchTasks();
      
      // 执行推荐算法
      this.matchTasks();
      
      // 获取热门任务
      this.fetchHotTasks();
      
      // 隐藏骨架屏
      this.setData({
        isLoading: false
      });
    }, 1500);

    const keyword = (options.keyword || '').trim();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 建立WebSocket连接
    this.setupRealTimeConnection();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 如果WebSocket断开，重新连接
    if (!this.data.isConnected) {
      this.setupRealTimeConnection();
    }
    
    // 调试输出当前热门任务数据
    if (this.data.hotTasks && this.data.hotTasks.length > 0) {
      console.log('当前热门任务数据:', JSON.stringify(this.data.hotTasks));
      this.data.hotTasks.forEach((task, index) => {
        console.log(`任务${index+1}价格:`, task.reward, typeof task.reward);
      });
    }
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
    // 关闭WebSocket连接
    if (this.socket) {
      this.socket.close();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    // 重新获取任务列表
    this.fetchTasks();
    
    // 重新获取热门任务
    this.fetchHotTasks();
    
    // 停止下拉刷新动画
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // 首页不需要加载更多任务
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 获取任务列表
   */
  fetchTasks() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;

    wx.request({
      url: baseUrl + '/api/tasks/all',
      method: 'GET',
      header: { 'token': token },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          const { list } = res.data.data;
          // 格式化任务对象，确保有 userId 字段
          const formattedTasks = list.map(task => ({
            id: task.taskId,
            userId: task.userId,
            type: ['express', 'errand', 'shopping', 'print', 'other'][task.taskType] || 'other',
            title: task.title,
            description: task.description || '暂无描述',
            reward: task.price,
            status: ['pending', 'accepted', 'completed', 'cancelled'][task.status] || 'pending',
            location: task.pickupLocation || '未指定位置',
            deadline: task.deadline,
            createTime: task.createdAt ? task.createdAt.replace('T', ' ') : '',
            publisher: {
              avatar: '/images/default-avatar.png',
              nickname: `用户${task.userId}`
            }
          }));

          // 批量获取用户信息
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
            this.setData({
              tasks: tasksWithUser,
              originalTasks: tasksWithUser
            });
            // 应用当前筛选条件
            this.applyFilter(this.data.activeFilter);
            
            // 应用当前分类
            this.applyCategoryFilter(this.data.currentCategory);
          });
        }
      }
    });
  },

  /**
   * 获取热门任务
   */
  fetchHotTasks() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const baseUrl = app.globalData.baseUrl;
    
    wx.request({
      url: baseUrl + '/api/tasks/all',
      method: 'GET',
      header: {
        'token': token
      },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          const { list } = res.data.data;
          // 转换API返回的数据
          const formattedTasks = list.map(task => ({
            id: task.taskId,
            userId: task.userId,
            type: ['express', 'errand', 'shopping', 'print', 'other'][task.taskType] || 'other',
            title: task.title,
            description: task.description || '暂无描述',
            reward: task.price,
            status: ['pending', 'accepted', 'completed', 'cancelled'][task.status] || 'pending',
            location: task.pickupLocation || '未指定位置',
            deadline: task.deadline,
            createTime: task.createdAt ? task.createdAt.replace('T', ' ') : '',
            publisher: {
              avatar: '/images/default-avatar.png',
              nickname: `用户${task.userId}`
            }
          })).filter(task => task.status === 'pending').slice(0, 2);

          // 批量获取用户信息
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
          })).then(hotTasksWithUser => {
            this.setData({
              hotTasks: hotTasksWithUser
            });
          });
        } else {
          console.error('获取热门任务失败:', res.data);
          this.useBackupHotTasks();
        }
      },
      fail: (err) => {
        console.error('获取热门任务请求失败:', err);
        this.useBackupHotTasks();
      }
    });
  },

  /**
   * 使用备用数据作为热门任务
   */
  useBackupHotTasks() {
    // 备用热门任务数据
    const hotTasks = [
      {
        id: 4,
        type: 'express',
        title: '急需帮取快递',
        description: '快递在即将超时，需要紧急取件！',
        reward: 10,
        status: 'pending',
        location: '北门快递点',
        destination: '9号宿舍楼',
        createTime: '2024-03-20 10:30',
        deadline: '今天 17:00',
        publisher: {
          avatar: '/images/default-avatar.png',
          nickname: '急需帮助'
        }
      },
      {
        id: 5,
        type: 'shopping',
        title: '代购生日礼物',
        description: '明天是室友生日，想帮忙代购一个蛋糕和礼物',
        reward: 20,
        status: 'pending',
        location: '校外商场',
        destination: '2号宿舍楼',
        createTime: '2024-03-20 12:00',
        deadline: '今天 20:00',
        publisher: {
          avatar: '/images/default-avatar.png',
          nickname: '好朋友'
        }
      }
    ];
    
    // 在控制台输出用于调试
    console.log('使用备用热门任务数据:', JSON.stringify(hotTasks));
    
    this.setData({
      hotTasks
    });
  },

  /**
   * 格式化API返回的任务列表数据
   */
  formatListTasks(apiTasks) {
    if (!Array.isArray(apiTasks)) {
      console.warn('formatListTasks received non-array input:', apiTasks);
      return [];
    }

    return apiTasks.map(task => {
      if (!task) {
        console.warn('Null task object encountered');
        return null;
      }

      let deadline;
      try {
        // 使用formatDateString确保日期格式兼容iOS
        deadline = new Date(this.formatDateString(task.deadline));
        if (isNaN(deadline.getTime())) {
          console.warn('Invalid date:', task.deadline);
          deadline = new Date(); // 使用当前时间作为后备
        }
      } catch (e) {
        console.error('Error parsing deadline:', e);
        deadline = new Date();
      }

      return {
        id: task.taskId,
        type: this.mapTaskType(task.taskType),
        title: task.title || '未命名任务',
        description: task.description || '',
        reward: task.price || 0,
        location: task.pickupLocation || '',
        deadline: deadline,
        status: this.mapTaskStatus(task.status),
        createTime: task.createdAt,
        updateTime: task.updatedAt
      };
    }).filter(Boolean); // 过滤掉null值
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const value = e.detail.value;
    this.setData({
      searchKeyword: value
    });
  },

  onSearch(e) {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入关键词', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/tasks/list/index?keyword=${encodeURIComponent(keyword)}`
    });
  },

  /**
   * 选择校区
   */
  onSelectCampus() {
    wx.showActionSheet({
      itemList: ['主校区', '南校区', '北校区', '东校区'],
      success: (res) => {
        const campuses = ['主校区', '南校区', '北校区', '东校区'];
        this.setData({
          currentCampus: campuses[res.tapIndex],
          isLoading: true
        });
        
        // 模拟切换校区后刷新数据
        setTimeout(() => {
          this.fetchTasks();
          this.fetchHotTasks();
          this.setData({
            isLoading: false
          });
        }, 1000);
      }
    });
  },

  /**
   * 切换分类
   */
  onCategoryChange(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      currentCategory: id,
      isLoading: true
    });
    
    // 模拟加载
    setTimeout(() => {
      this.applyCategoryFilter(id);
      this.setData({
        isLoading: false
      });
    }, 500);
  },

  /**
   * 应用分类筛选
   */
  applyCategoryFilter(categoryId) {
    if (categoryId === 0) {
      // 全部分类，应用当前的筛选条件
      this.applyFilter(this.data.activeFilter);
      return;
    }
    
    const categoryTypes = ['express', 'errand', 'food', 'other'];
    const targetType = categoryTypes[categoryId - 1];
    
    const filteredTasks = this.data.originalTasks.filter(task => task.type === targetType);
    
    // 应用当前筛选条件到已分类的任务
    this.applyFilter(this.data.activeFilter, filteredTasks);
  },

  /**
   * 设置筛选条件
   */
  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      activeFilter: filter,
      isLoading: true
    });
    
    // 模拟加载
    setTimeout(() => {
      this.applyFilter(filter);
      this.setData({
        isLoading: false
      });
    }, 300);
  },

  /**
   * 格式化日期字符串为iOS兼容格式
   */
  formatDateString(dateStr) {
    if (!dateStr) return '';
    // 将空格分隔的格式转换为T分隔
    if (dateStr.includes(' ')) {
      dateStr = dateStr.replace(' ', 'T');
    }
    // 如果没有T，添加时间部分
    if (!dateStr.includes('T')) {
      dateStr += 'T00:00:00';
    }
    return dateStr;
  },

  /**
   * 应用不同的排序规则
   */
  applyFilter(filter, taskList = null) {
    let tasks = taskList || this.data.tasks;
    
    // 应用不同的排序规则
    switch (filter) {
      case 'latest':
        // 按发布时间排序，最新的在前
        tasks.sort((a, b) => {
          const dateA = new Date(this.formatDateString(a.createTime));
          const dateB = new Date(this.formatDateString(b.createTime));
          return dateB - dateA;
        });
        break;
      case 'nearby':
        // 按距离排序
        tasks.sort((a, b) => {
          const distanceA = a.location.includes(this.data.currentCampus) ? 0 : 1;
          const distanceB = b.location.includes(this.data.currentCampus) ? 0 : 1;
          return distanceA - distanceB;
        });
        break;
      case 'reward':
        // 按赏金排序，高到低
        tasks.sort((a, b) => b.reward - a.reward);
        break;
    }
    
    this.setData({
      tasks
    });
  },

  /**
   * 点击分类
   */
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    
    // 跳转到任务列表页面，并传递分类参数
    wx.navigateTo({
      url: `/pages/tasks/list/index?category=${id}&type=${type}`
    });
  },

  /**
   * 点击"我的任务"
   */
  onMyTasks() {
    wx.navigateTo({
      url: '/pages/tasks/my/index'
    });
  },

  /**
   * 查看更多推荐
   */
  onMoreRecommend() {
    wx.navigateTo({
      url: '/pages/tasks/list/index?from=recommend'
    });
  },

  /**
   * 查看更多热门任务
   */
  onMoreHotTasks() {
    wx.navigateTo({
      url: '/pages/tasks/list/index?from=hot'
    });
  },

  /**
   * 点击校园服务
   */
  onServiceTap(e) {
    const type = e.currentTarget.dataset.type;
    
    // 根据服务类型执行相应操作
    switch (type) {
      case 'express':
        // 快递代取服务
        wx.navigateTo({
          url: '/pages/tasks/list/index?type=express'
        });
        break;
      case 'errand':
        // 跑腿代办服务
        wx.navigateTo({
          url: '/pages/tasks/list/index?type=errand'
        });
        break;
      case 'shopping':
        // 代购服务
        wx.navigateTo({
          url: '/pages/tasks/list/index?type=shopping'
        });
        break;
      case 'print':
        // 打印服务
        wx.navigateTo({
          url: '/pages/services/print/index'
        });
        break;
      case 'repair':
        // 维修服务
        wx.navigateTo({
          url: '/pages/services/repair/index'
        });
        break;
      case 'cleaning':
        // 清洁服务
        wx.navigateTo({
          url: '/pages/services/cleaning/index'
        });
        break;
      case 'tutor':
        // 学习辅导服务
        wx.navigateTo({
          url: '/pages/services/tutor/index'
        });
        break;
      case 'rental':
        // 物品租借服务
        wx.navigateTo({
          url: '/pages/services/rental/index'
        });
        break;
      default:
        // 默认导航到服务列表页
        wx.navigateTo({
          url: `/pages/services/${type}/index`
        });
    }
    
    // 记录用户点击的服务类型，用于个性化推荐
    this.recordUserPreference(type);
  },

  /**
   * 记录用户偏好
   */
  recordUserPreference(type) {
    // 实际应用中，应该调用API将用户偏好保存到服务器
    console.log('用户点击了服务类型:', type);
    
    // 更新本地用户配置文件，添加到偏好类别中
    const preferredCategories = this.data.userProfile.preferredCategories;
    if (!preferredCategories.includes(type)) {
      preferredCategories.push(type);
      
      this.setData({
        'userProfile.preferredCategories': preferredCategories
      });
    }
  },

  /**
   * 发布任务
   */
  onPublishTask() {
    wx.navigateTo({
      url: '/pages/tasks/publish/index'
    });
  },

  /**
   * 查看任务详情
   */
  onViewTask(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/tasks/detail/index?id=${id}`
    });
  },

  /**
   * 接受任务
   */
  onAcceptTask(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认接单',
      content: '确定要接受这个任务吗？接单后请务必完成任务',
      confirmText: '确认接单',
      confirmColor: '#27BA9B',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用接单API
          // 模拟接单成功
          wx.showLoading({
            title: '正在接单',
          });
          
          setTimeout(() => {
            wx.hideLoading();
            
            // 更新当前任务状态
            const updatedTasks = this.data.tasks.map(task => {
              if (task.id === id) {
                return { ...task, status: 'accepted' };
              }
              return task;
            });
            
            // 更新原始任务列表
            const updatedOriginalTasks = this.data.originalTasks.map(task => {
              if (task.id === id) {
                return { ...task, status: 'accepted' };
              }
              return task;
            });
            
            this.setData({
              tasks: updatedTasks,
              originalTasks: updatedOriginalTasks
            });
            
            wx.showToast({
              title: '接单成功',
              icon: 'success',
              duration: 2000
            });
          }, 1000);
        }
      }
    });
  },

  /**
   * 格式化金额
   */
  formatAmount(amount) {
    // 检查amount是否为有效数字
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return '---';
    }
    return Number(amount).toFixed(2);
  },

  /**
   * 智能匹配算法
   */
  matchTasks() {
    const userProfile = this.data.userProfile;
    const availableTasks = this.data.originalTasks.filter(task => task.status === 'pending');
    
    // 基于用户历史接单、位置、评分等计算匹配度
    const matchedTasks = availableTasks.map(task => {
      const locationScore = this.calculateDistance(userProfile.location, task.location) * 0.5;
      const categoryScore = userProfile.preferredCategories.includes(task.type) ? 0.3 : 0;
      const timeScore = this.isUserAvailable(userProfile.schedule, task.deadline) ? 0.2 : 0;
      
      return {
        ...task,
        matchScore: locationScore + categoryScore + timeScore
      };
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
    
    this.setData({ recommendTasks: matchedTasks });
  },

  /**
   * 计算距离分数（模拟实现）
   */
  calculateDistance(userLocation, taskLocation) {
    // 实际应用中应该使用真实的地理位置计算
    // 这里简单实现，相同位置得分为1，不同位置得分为0.5
    return userLocation === taskLocation ? 1 : 0.5;
  },

  /**
   * 检查用户是否有空（模拟实现）
   */
  isUserAvailable(userSchedule, taskDeadline) {
    // 实际应用中应该根据用户日程安排和任务截止时间判断
    // 这里简单实现，假设用户全天有空
    return userSchedule === '全天';
  },

  /**
   * 建立WebSocket连接实时更新任务状态
   */
  setupRealTimeConnection() {
    // 实际应用中，使用真实的WebSocket服务
    // 这里只是模拟实现
    this.socket = {
      onOpen: (callback) => {
        // 模拟连接成功
        setTimeout(() => {
          callback();
        }, 500);
      },
      onMessage: (callback) => {
        // 模拟接收消息
        this.messageCallback = callback;
      },
      close: () => {
        // 模拟关闭连接
        this.setData({ isConnected: false });
      }
    };
    
    this.socket.onOpen(() => {
      this.setData({ isConnected: true });
      
      // 模拟每隔30秒接收一次任务更新
      this.messageTimer = setInterval(() => {
        if (this.messageCallback && this.data.originalTasks.length > 0) {
          // 随机选择一个任务进行状态更新
          const randomIndex = Math.floor(Math.random() * this.data.originalTasks.length);
          const randomTask = this.data.originalTasks[randomIndex];
          
          // 只模拟待接单任务变为已接单
          if (randomTask.status === 'pending') {
            this.messageCallback({
              data: JSON.stringify({
                type: 'task_update',
                taskId: randomTask.id,
                newStatus: 'accepted'
              })
            });
          }
        }
      }, 30000);
    });
  },

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId, newStatus) {
    // 更新任务列表
    const updatedTasks = this.data.tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, status: newStatus };
      }
      return task;
    });
    
    // 更新原始任务列表
    const updatedOriginalTasks = this.data.originalTasks.map(task => {
      if (task.id === taskId) {
        return { ...task, status: newStatus };
      }
      return task;
    });
    
    this.setData({
      tasks: updatedTasks,
      originalTasks: updatedOriginalTasks
    });
    
    // 显示任务更新提示
    wx.showToast({
      title: '任务状态已更新',
      icon: 'none',
      duration: 2000
    });
  },

  // 映射任务类型
  mapTaskType(type) {
    const typeMap = {
      0: 'express',
      1: 'errand',
      2: 'shopping',
      3: 'print',
      4: 'other'
    };
    return typeMap[type] || 'other';
  },

  // 映射任务状态
  mapTaskStatus(status) {
    const statusMap = {
      0: 'pending',
      1: 'accepted',
      2: 'completed',
      3: 'cancelled'
    };
    return statusMap[status] || 'pending';
  }
})
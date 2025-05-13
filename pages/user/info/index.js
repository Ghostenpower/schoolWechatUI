const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      username: '',
      phone: '',
      email: '',
      userType: 1,
      balance: 88.88,
      status: 1,
      createdAt: '2025-04-08 12:00:00'
    },
    genderRange: ['男', '女']
  },

  onLoad() {
    this.loadUserInfo();
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('触发下拉刷新');
    this.loadUserInfo().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadUserInfo() {
    const baseUrl = app.globalData.baseUrl;
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.userId) {
      wx.showToast({ title: '未获取到用户ID', icon: 'none' });
      return Promise.reject('未获取到用户ID');
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}/api/users/getOneById?userId=${userInfo.userId}`,
        method: 'GET',
        header: {
          'token': wx.getStorageSync('token')
        },
        success: (res) => {
          if (res.data.code === 1 && res.data.data) {
            this.setData({ userInfo: res.data.data });
            resolve(res.data.data);
          } else {
            wx.showToast({ title: res.data.msg || '获取失败', icon: 'none' });
            reject(res.data.msg || '获取失败');
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络错误', icon: 'none' });
          reject(err);
        }
      });
    });
  },

  // 输入事件处理函数
  onNicknameInput(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    })
  },

  onPhoneInput(e) {
    this.setData({
      'userInfo.phone': e.detail.value
    })
  },

  onGenderChange(e) {
    this.setData({
      'userInfo.gender': e.detail.value
    })
  },

  onSchoolInput(e) {
    this.setData({
      'userInfo.school': e.detail.value
    })
  },

  onStudentIdInput(e) {
    this.setData({
      'userInfo.studentId': e.detail.value
    })
  },

  // 保存用户信息
  onSave() {
    const userInfo = this.data.userInfo

    // 表单验证
    if (!userInfo.nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    if (!userInfo.phone) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      })
      return
    }

    if (!userInfo.school) {
      wx.showToast({
        title: '请输入学校',
        icon: 'none'
      })
      return
    }

    if (!userInfo.studentId) {
      wx.showToast({
        title: '请输入学号',
        icon: 'none'
      })
      return
    }

    // TODO: 调用后端接口保存用户信息
    wx.showLoading({
      title: '保存中...'
    })

    // 模拟API调用
    setTimeout(() => {
      wx.hideLoading()
      
      // 更新全局用户信息
      app.globalData.userInfo = userInfo

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 返回上一页
      wx.navigateBack()
    }, 1000)
  },

  goToEdit() {
    console.log('点击了编辑资料');
    wx.navigateTo({ url: '/pages/user/edit/index' });
  },

  getUserTypeText(type) {
    return type === 1 ? '学生' : type === 2 ? '商家' : '管理员';
  },

  getStatusText(status) {
    return status === 1 ? '正常' : '禁用';
  },

  // 修改头像
  changeAvatar() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({
          title: '上传中...',
        });
        
        // 上传图片到服务器
        wx.uploadFile({
          url: `${app.globalData.baseUrl}/api/api/upload`,
          filePath: tempFilePath,
          name: 'file',
          header: {
            'token': wx.getStorageSync('token')
          },
          success: (uploadRes) => {
            const result = JSON.parse(uploadRes.data);
            if (result.code === 1) {
              // 更新用户头像URL到服务器
              const token = wx.getStorageSync('token');
              console.log('上传的头像URL:', result.data);
              
              wx.request({
                url: `${app.globalData.baseUrl}/api/users/updateAvatar`,
                method: 'POST',
                header: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'token': token
                },
                data: {
                  userAvatarUrl: result.data
                },
                success: (updateRes) => {
                  console.log('更新头像响应:', updateRes);
                  if (updateRes.data.code === 1) {
                    // 获取并更新本地存储的用户信息
                    const userInfo = wx.getStorageSync('userInfo') || {};
                    const updatedUserInfo = {
                      ...userInfo,  // 保留原有的所有信息
                      avatarUrl: result.data  // 只更新头像URL
                    };
                    
                    // 更新本地存储
                    wx.setStorageSync('userInfo', updatedUserInfo);
                    
                    // 更新页面显示
                    that.setData({
                      'userInfo.avatarUrl': result.data
                    });
                    
                    // 更新全局数据
                    if (app.globalData.userInfo) {
                      app.globalData.userInfo.avatarUrl = result.data;
                    }
                    
                    wx.showToast({
                      title: '头像更新成功',
                      icon: 'success',
                      success: () => {
                        setTimeout(() => {
                          wx.navigateBack({
                            delta: 1
                          });
                        }, 1500); // Wait for toast to finish
                      }
                    });
                  } else {
                    wx.showToast({
                      title: updateRes.data.msg || '更新失败',
                      icon: 'none'
                    });
                  }
                },
                fail: (err) => {
                  console.error('更新用户头像失败:', err);
                  wx.showToast({
                    title: '更新失败',
                    icon: 'none'
                  });
                }
              });
            } else {
              wx.showToast({
                title: result.msg || '上传失败',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('上传失败:', err);
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          },
          complete: () => {
            wx.hideLoading();
          }
        });
      }
    });
  },
}) 
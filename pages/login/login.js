Page({
    data: {
        username: '',
        password: '',
        rememberPassword: false,
        userInfo: {
            avatarUrl: '',
            username: '',
            phone: '',
            email: '',
            userType: 1, // mock
            balance: 88.88, // mock
            status: 1, // mock
            createdAt: '2025-04-08 12:00:00' // mock
        }
    },

    // Handle input changes
    onUsernameInput(e) {
        this.setData({ username: e.detail.value });
    },

    onPasswordInput(e) {
        this.setData({ password: e.detail.value });
    },

    onRememberChange(e) {
        this.setData({
            rememberPassword: e.detail.value.length > 0
        });
    },

    // Login function
    async login() {
        const { username, password, rememberPassword } = this.data;

        // 输入验证
        if (!username || !password) {
            wx.showToast({
                title: '请输入用户名和密码',
                icon: 'none',
                duration: 2000
            });
            return;
        }

        // 显示加载中状态
        wx.showLoading({
            title: '登录中...',
            mask: true
        });

        try {
            wx.request({
                url: 'http://localhost:8051/api/users/login',
                method: 'POST',
                data: { username, password },
                header: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10秒超时
                success: (res) => {
                    wx.hideLoading(); // 隐藏加载中
                    const resData = res.data;
                    console.log('请求成功:', resData);

                    if (res.statusCode === 200 && resData.code === 1) {
                        const userData = resData.data;

                        // 存储 token 和完整的用户信息
                        wx.setStorageSync('token', userData.token);
                        wx.setStorageSync('userInfo', {
                            userId: userData.userId,
                            username: userData.username,
                            phone: userData.phone,
                            email: userData.email,
                            avatarUrl: userData.avatarUrl,
                            userType: userData.userType,
                            status: userData.status,
                            createdAt: userData.createdAt,
                            updatedAt: userData.updatedAt,
                            balance: userData.balance
                        });

                        // 如果选择了记住密码，保存登录信息
                        if (rememberPassword) {
                            wx.setStorageSync('savedLoginInfo', {
                                username: username,
                                password: password
                            });
                        } else {
                            wx.removeStorageSync('savedLoginInfo');
                        }

                        wx.showToast({
                            title: '登录成功',
                            icon: 'success',
                            duration: 1500,
                            complete: () => {
                                const pages = getCurrentPages();
                                const targetPage = pages.find(page => page.route.includes('profile')); // 使用更宽松的匹配
                                if (targetPage && typeof targetPage.refreshData === 'function') {
                                    console.log('找到目标页面，refreshData存在:', !!targetPage.refreshData);
                                    targetPage.refreshData(); // 先执行刷新
                                    setTimeout(() => {
                                        wx.navigateBack({ delta: 1 });
                                    }, 1000);
                                }
                            }
                        });
                    } else {
                        console.log('登录失败:', resData);
                        const errorMsg = resData?.msg || `登录失败（错误码：${res.statusCode}）`;
                        wx.showToast({
                            title: errorMsg,
                            icon: 'none',
                            duration: 2000
                        });
                    }
                },
                fail: (error) => {
                    wx.hideLoading();
                    console.error('请求失败:', error);

                    let errorMessage = '网络连接失败';
                    if (error.errMsg.includes('timeout')) {
                        errorMessage = '请求超时，请重试';
                    } else if (error.errMsg.includes('fail')) {
                        errorMessage = '服务器连接失败';
                    }

                    wx.showToast({
                        title: errorMessage,
                        icon: 'none',
                        duration: 2000
                    });
                }
            });
        } catch (error) {
            wx.hideLoading();
            console.error('登录异常:', error);
            wx.showToast({
                title: '发生未知错误',
                icon: 'none',
                duration: 2000
            });
        }
    },

    // Check if user is already logged in
    onLoad() {
        // 检查是否有保存的登录信息
        const savedLoginInfo = wx.getStorageSync('savedLoginInfo');
        if (savedLoginInfo) {
            this.setData({
                username: savedLoginInfo.username,
                password: savedLoginInfo.password,
                rememberPassword: true
            });
        }

        const token = wx.getStorageSync('token');
        if (token) {
            wx.redirectTo({
                url: '/pages/home/home', // Replace with your target page
            });
        }
        this.loadUserInfo();
    },

    loadUserInfo() {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.userId) {
            wx.request({
                url: `http://localhost:8051/api/users/getOneById?userId=${userInfo.userId}`,
                method: 'GET',
                header: {
                    'token': wx.getStorageSync('token')
                },
                success: (res) => {
                    if (res.data.code === 1) {
                        // 只用接口返回的头像、用户名、手机号、邮箱，其他字段用mock
                        this.setData({
                            userInfo: {
                                ...this.data.userInfo,
                                avatarUrl: res.data.data.avatarUrl,
                                username: res.data.data.username,
                                phone: res.data.data.phone,
                                email: res.data.data.email
                            }
                        });
                    } else {
                        wx.showToast({ title: res.data.msg || '获取失败', icon: 'none' });
                    }
                }
            });
        }
    },

    goToEdit() {
        wx.navigateTo({ url: '/pages/user/edit/index' });
    }
});
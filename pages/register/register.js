Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    email: '',
    isAgreed: false,
    passwordError: false,
    confirmPasswordError: false,
  },

  // 统一输入处理
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value,
      ...(field === 'password' && { passwordError: false }),
      ...(field === 'confirmPassword' && { confirmPasswordError: false })
    });
  },

  // 密码一致性验证
  validatePasswords() {
    const { password, confirmPassword } = this.data;
    const isMatched = password === confirmPassword;
    this.setData({
      passwordError: !isMatched,
      confirmPasswordError: !isMatched
    });
    return isMatched;
  },

  async submitRegister() {
    // 表单验证
    if (!this.validatePasswords()) return this.showError('两次密码输入不一致');
    const { username, password, phone, email, isAgreed } = this.data;
    if (!username || !password || !phone) return this.showError('用户名、密码和手机号必填');
    if (!/^1[3-9]\d{9}$/.test(phone)) return this.showError('请输入正确的手机号');
    if (password.length < 6) return this.showError('密码至少6位字符');
    if (!isAgreed) return this.showError('请同意用户协议');

    wx.showLoading({ title: '注册中...', mask: true });

    try {
      const res = await this.registerUser({ username, password, phone, email });
      wx.hideLoading();

      res.data.code === 1
        ? this.handleRegisterSuccess()
        : this.showError(res.data.msg || '注册失败，请重试');
    } catch (error) {
      wx.hideLoading();
      this.showError('网络请求失败');
      console.error('注册错误:', error);
    }
  },

  // 辅助方法
  registerUser(data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:8051/api/users/register',
        method: 'POST',
        data,
        header: { 'Content-Type': 'application/json' },
        success: resolve,
        fail: reject
      });
    });
  },

  handleRegisterSuccess() {
    wx.showToast({
      title: '注册成功',
      icon: 'success',
      complete: () => setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 1500)
    });
  },

  showError(msg) {
    wx.showToast({ title: msg, icon: 'none', duration: 2000 });
  },

  handleAgreementChange() {
    this.setData({ isAgreed: !this.data.isAgreed });
  }
});
Page({
  data: {
    webviewUrl: ''
  },
  onLoad(options) {
    if (options.url) {
      this.setData({
        webviewUrl: decodeURIComponent(options.url)
      });
    }
  }
}); 
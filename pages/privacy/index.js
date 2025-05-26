import { privacyHtmlContent } from './privacy_content';

Page({
  data: {
    privacyContent: ''
  },
  onLoad(options) {
    this.setData({
      privacyContent: privacyHtmlContent
    });
  }
}); 
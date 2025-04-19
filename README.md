# 校园跑腿小程序

基于微信小程序开发的校园跑腿服务平台，为校园内的快递代取、外卖代拿等需求提供便捷服务。

## 项目结构

```
campus_running_group/
├── pages/                    # 页面文件夹
│   ├── index/               # 首页
│   ├── tasks/               # 任务相关页面
│   │   ├── tasks           # 任务列表
│   │   ├── publish/        # 发布任务
│   │   ├── detail/         # 任务详情
│   │   └── my/             # 我的任务
│   ├── order/              # 订单相关页面
│   │   ├── list/           # 订单列表
│   │   └── detail/         # 订单详情
│   ├── address/            # 地址相关页面
│   │   ├── list/           # 地址列表
│   │   ├── add/            # 新增地址
│   │   └── edit/           # 编辑地址
│   ├── profile/            # 个人中心
│   ├── user/               # 用户相关页面
│   │   └── info/           # 用户信息
│   ├── wallet/             # 钱包
│   ├── feedback/           # 意见反馈
│   └── settings/           # 设置
├── components/             # 自定义组件
├── images/                # 图片资源
│   ├── icons/            # 图标
│   └── tabs/             # 底部导航图标
├── utils/                # 工具函数
├── app.js               # 小程序入口文件
├── app.json            # 小程序配置文件
├── app.wxss            # 全局样式文件
└── project.config.json # 项目配置文件
```

## 功能模块

### 任务管理
- 浏览任务列表
- 发布新任务
- 接受任务
- 查看任务详情
- 管理我的任务

### 订单管理
- 查看订单列表
- 订单详情
- 订单状态跟踪

### 地址管理
- 地址列表
- 新增地址
- 编辑地址
- 设置默认地址

### 个人中心
- 用户信息管理
- 我的任务
- 我的订单
- 我的钱包
- 地址管理
- 意见反馈
- 系统设置

## 页面路由

| 页面 | 路径 | 说明 |
|------|------|------|
| 任务大厅 | /pages/tasks/tasks | 展示所有可接任务 |
| 发布任务 | /pages/tasks/publish/index | 发布新任务 |
| 任务详情 | /pages/tasks/detail/index | 查看任务详细信息 |
| 我的任务 | /pages/tasks/my/index | 查看我发布和接受的任务 |
| 订单列表 | /pages/order/list/index | 查看所有订单 |
| 订单详情 | /pages/order/detail/index | 查看订单详细信息 |
| 地址列表 | /pages/address/list/index | 管理收货地址 |
| 新增地址 | /pages/address/add/index | 添加新的收货地址 |
| 编辑地址 | /pages/address/edit/index | 修改已有地址 |
| 个人中心 | /pages/profile/profile | 用户个人信息中心 |
| 用户信息 | /pages/user/info/index | 编辑用户信息 |
| 钱包 | /pages/wallet/wallet | 余额和交易记录 |
| 意见反馈 | /pages/feedback/feedback | 提交意见反馈 |
| 设置 | /pages/settings/settings | 系统设置 |

## 开发环境

- 微信开发者工具
- Node.js
- npm/yarn

## 项目配置

1. 克隆项目
```bash
git clone [项目地址]
```

2. 安装依赖
```bash
npm install
```

3. 使用微信开发者工具打开项目

4. 开发者工具配置
- 设置服务器域名
- 配置开发环境
- 启用 ES6 转 ES5
- 启用增强编译

## 注意事项

1. 代码规范
- 遵循小程序开发规范
- 使用 ES6+ 语法
- 保持代码风格统一

2. 性能优化
- 合理使用分包加载
- 避免不必要的数据请求
- 优化图片资源

3. 安全
- 敏感数据加密处理
- 接口调用做好权限验证
- 用户信息安全存储

## 项目简介
这是一个面向校园师生的跑腿服务微信小程序，旨在为校园内师生提供便捷的跑腿服务平台。通过这个小程序，用户可以发布跑腿需求、接单赚取收益，实现校园内的互助服务。

## 主要功能
- 用户登录与认证
- 发布跑腿订单
- 接单与配送
- 订单状态追踪
- 在线支付功能
- 用户评价系统
- 个人中心管理

## 技术栈
- 前端：原生微信小程序
- 开发语言：JavaScript/WXML/WXSS
- 状态管理：小程序原生数据管理
- 组件：微信小程序内置组件

## 开发环境配置
1. 确保已安装以下工具：
   - 微信开发者工具（最新版本）
   - Node.js (可选，用于包管理)

2. 克隆项目：
```bash
git clone [项目地址]
```

3. 使用微信开发者工具打开项目目录

## 贡献指南
1. Fork 本仓库
2. 创建您的特性分支 (git checkout -b feature/AmazingFeature)
3. 提交您的更改 (git commit -m 'Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 开启一个 Pull Request

## 联系方式
如有任何问题或建议，请通过以下方式联系我们：
- 项目Issues
- 电子邮件：[待添加]

## 许可证
本项目采用 MIT 许可证 - 详情请参见 [LICENSE](LICENSE) 文件 
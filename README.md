# 校园跑腿小程序

基于微信小程序开发的校园跑腿服务平台，为校园内的快递代取、外卖代拿等需求提供便捷服务。

## 最近更新

### 2024年3月更新
- 任务列表API更新：
  - 更改任务列表API从`/api/tasks/all`到`/api/tasks/getListByStatus`
  - 新增任务状态和类型过滤功能
  - 支持分页查询
  - 优化了iOS设备上的日期解析兼容性
- 任务大厅优化：
  - 默认展示3条待接单任务
  - 新增任务状态切换功能
  - 支持按类型筛选任务
- 热门任务展示优化：
  - 展示2条热门待接单任务
  - 优化任务排序逻辑

## 项目结构

```
campus_running_group/
├── pages/                    # 页面文件夹
│   ├── address/             # 地址管理
│   ├── chat/                # 聊天功能
│   ├── feedback/            # 意见反馈
│   ├── index/               # 首页
│   ├── login/               # 登录
│   ├── message/             # 消息中心
│   ├── order/               # 订单管理
│   ├── profile/             # 个人中心
│   ├── register/            # 注册
│   ├── rider/               # 骑手相关
│   ├── settings/            # 设置
│   ├── tasks/               # 任务管理
│   ├── user/                # 用户管理
│   └── wallet/              # 钱包
├── components/              # 自定义组件
├── images/                  # 图片资源
├── utils/                   # 工具函数
├── app.js                   # 小程序入口文件
├── app.json                 # 小程序配置文件
└── app.wxss                 # 全局样式文件
```

## API接口说明

### 任务列表接口
**接口地址**：`/api/tasks/getListByStatus`  
**请求方式**：`POST`  
**数据类型**：`application/x-www-form-urlencoded`

**请求参数**：

| 参数名称 | 参数说明 | 是否必须 | 数据类型 |
|----------|----------|----------|-----------|
|taskStatus|任务状态(0-待接单,1-进行中,2-已完成,3-已取消)|是|integer|
|tasksType|任务类型(-1-全部,0-快递,1-跑腿,2-代购,3-打印,4-其他)|是|integer|
|pageNum|页码|是|integer|
|pageSize|每页数量|是|integer|

**响应示例**：
```javascript
{
    "code": 1,
    "msg": "success",
    "data": {
        "total": 100,
        "list": [
            {
                "taskId": 1,
                "userId": 1001,
                "title": "帮取快递",
                "description": "菜鸟驿站有一个快递",
                "taskType": 0,
                "status": 0,
                "price": 5.00,
                "pickupLocation": "菜鸟驿站",
                "deadline": "2024-03-21 17:30:00"
            }
        ]
    }
}
```

## 功能模块

### 用户系统
- 用户注册/登录
- 个人信息管理
- 骑手注册认证
- 消息通知

### 任务系统
- 任务大厅浏览
- 任务发布管理
- 任务状态追踪
- 任务分类筛选
- 任务搜索功能

### 订单系统
- 订单创建处理
- 订单状态管理
- 订单评价功能
- 订单历史记录

### 支付系统
- 余额管理
- 交易记录
- 在线支付
- 提现功能

### 通讯系统
- 即时消息
- 系统通知
- 订单通知
- 聊天记录

## 页面路由

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | /pages/index/index | 应用首页 |
| 登录 | /pages/login/login | 用户登录 |
| 注册 | /pages/register/register | 用户注册 |
| 任务大厅 | /pages/tasks/tasks | 浏览任务列表 |
| 发布任务 | /pages/tasks/publish/index | 发布新任务 |
| 任务详情 | /pages/tasks/detail/index | 查看任务信息 |
| 我的任务 | /pages/tasks/my/index | 管理个人任务 |
| 骑手注册 | /pages/rider/register/register | 骑手身份认证 |
| 个人中心 | /pages/profile/profile | 用户信息中心 |
| 钱包 | /pages/wallet/wallet | 资金管理 |
| 消息中心 | /pages/message/message | 消息通知 |
| 聊天 | /pages/chat/chat | 即时通讯 |

## 开发环境

- 微信开发者工具（最新版本）
- Node.js（可选，用于开发环境）

## 项目配置

1. 克隆项目
```bash
git clone [项目地址]
```

2. 使用微信开发者工具打开项目

3. 开发者工具配置
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

## 贡献指南
1. Fork 本仓库
2. 创建您的特性分支 (git checkout -b feature/AmazingFeature)
3. 提交您的更改 (git commit -m 'Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 开启一个 Pull Request

## 许可证
本项目采用 MIT 许可证 - 详情请参见 [LICENSE](LICENSE) 文件 
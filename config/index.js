const config = {
  development: {
    apiUrl: 'https://run-backend.megajam.online',
    chatUrl: 'https://campu-run-chat.megajam.online',
    wsUrl: 'wss://campu-run-chat.megajam.online'
  },
  production: {
    apiUrl: 'https://run-backend.megajam.online',
    chatUrl: 'https://campu-run-chat.megajam.online',
    wsUrl: 'wss://campu-run-chat.megajam.online'
  }
}

// 根据环境选择配置
const env = 'development' // 可以根据需要修改环境

module.exports = {
  ...config[env]
} 
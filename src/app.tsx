import Taro from '@tarojs/taro'
import './app.css'

// 初始化云开发
Taro.cloud.init({
  env: 'cloud1-d9gft4uzf53a76a32', // ← 替换为你的云开发环境ID
  traceUser: false,
})

function App({ children }) {
  return children
}

export default App

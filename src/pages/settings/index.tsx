import { View, Text } from '@tarojs/components'
import { C, S, F, R, cardStyle, dividerStyle } from '../../utils/theme'

export default function Settings() {
  return (
    <View style={{ minHeight: '100vh', backgroundColor: C.bg, paddingBottom: '80rpx' }}>
      {/* 配置指引 */}
      <View style={{ margin: S.page, ...cardStyle }}>
        <Text style={{ color: C.text, ...F.h3, marginBottom: S.sm }}>配置 DeepSeek API Key</Text>
        <Text style={{ color: C.muted, ...F.caption, marginBottom: S.md }}>API Key 保存在云函数环境变量中，不会暴露给用户</Text>
        <View style={dividerStyle} />
        <Text style={{ color: C.text, ...F.body, marginBottom: S.sm }}>操作步骤：</Text>
        {[
          '微信开发者工具 → 顶部 → 云开发',
          '开通云开发（免费）',
          '左侧 → 云函数 → evaluate → 设置',
          '环境变量添加 DEEPSEEK_API_KEY',
          '保存',
        ].map((step, i) => (
          <Text key={i} style={{ color: C.muted, ...F.caption, marginBottom: S.xs }}>{i + 1}. {step}</Text>
        ))}
      </View>

      {/* 获取密钥 */}
      <View style={{ marginHorizontal: S.page, ...cardStyle }}>
        <Text style={{ color: C.text, ...F.h3, marginBottom: S.sm }}>获取 API Key</Text>
        <Text style={{ color: C.muted, ...F.caption, marginBottom: S.md }}>打开 platform.deepseek.com</Text>
        {[
          '注册登录',
          '充值 10 元（够用几百次）',
          'API Keys → 创建 API Key',
          '复制 sk- 开头的密钥',
        ].map((step, i) => (
          <Text key={i} style={{ color: C.muted, ...F.caption, marginBottom: S.xs }}>{i + 1}. {step}</Text>
        ))}
      </View>

      {/* 关于 */}
      <View style={{ marginHorizontal: S.page, ...cardStyle }}>
        <Text style={{ color: C.text, ...F.h3, marginBottom: S.sm }}>关于 Project Judge</Text>
        <Text style={{ color: C.muted, ...F.caption, marginBottom: S.xs }}>版本 v1.5</Text>
        <Text style={{ color: C.muted, ...F.caption, marginBottom: S.xs }}>Taro + React + TypeScript + DeepSeek API</Text>
        <Text style={{ color: C.faint, ...F.caption }}>3 分钟判断一个项目值不值得做</Text>
      </View>
    </View>
  )
}

// Project Judge 设计系统
// 参考：Linear / Raycast / Vercel Dashboard

// ─── 颜色 ───────────────────────────────
export const C = {
  // 背景层级：bg > card > elevated
  bg:       '#0A0A0A',
  card:     '#111111',
  elevated: '#1A1A1A',

  // 边框
  border:     '#1F1F1F',
  borderHover:'#333333',

  // 文字层级：text > muted > faint
  text:  '#EDEDEF',
  muted: '#8A8A8E',
  faint: '#4A4A4E',

  // 品牌色
  primary:     '#3B82F6',
  primaryBg:   '#3B82F610',
  primaryHover:'#3B82F620',

  // 语义色
  success:     '#22C55E',
  successBg:   '#22C55E12',
  danger:      '#EF4444',
  dangerBg:    '#EF444412',
  warning:     '#EAB308',
  warningBg:   '#EAB30812',
} as const

// ─── 间距 ───────────────────────────────
export const S = {
  // 基础单位 = 8rpx
  xs:  '8rpx',    // 1
  sm:  '16rpx',   // 2
  md:  '24rpx',   // 3
  lg:  '32rpx',   // 4
  xl:  '48rpx',   // 6
  xxl: '64rpx',   // 8

  // 页面边距
  page: '24rpx',

  // 卡片内边距
  card: '32rpx',

  // 卡片间距
  gap: '16rpx',
} as const

// ─── 字号 ───────────────────────────────
export const F = {
  // 标题
  display: { fontSize: '52rpx', fontWeight: '700' as const, lineHeight: '1.15', letterSpacing: '-1.5rpx' },
  h1:      { fontSize: '40rpx', fontWeight: '700' as const, lineHeight: '1.2',  letterSpacing: '-1rpx' },
  h2:      { fontSize: '32rpx', fontWeight: '600' as const, lineHeight: '1.3' },
  h3:      { fontSize: '28rpx', fontWeight: '600' as const, lineHeight: '1.4' },

  // 正文
  body:    { fontSize: '28rpx', fontWeight: '400' as const, lineHeight: '1.6' },
  bodySm:  { fontSize: '26rpx', fontWeight: '400' as const, lineHeight: '1.6' },

  // 辅助
  caption: { fontSize: '24rpx', fontWeight: '400' as const, lineHeight: '1.5' },
  tiny:    { fontSize: '22rpx', fontWeight: '400' as const, lineHeight: '1.4' },
  micro:   { fontSize: '20rpx', fontWeight: '400' as const, lineHeight: '1.4' },

  // 数字
  scoreBig: { fontSize: '88rpx', fontWeight: '800' as const, lineHeight: '1', letterSpacing: '-4rpx' },
  score:    { fontSize: '32rpx', fontWeight: '700' as const, lineHeight: '1' },
} as const

// ─── 圆角 ───────────────────────────────
export const R = {
  sm:   '8rpx',
  md:   '12rpx',
  lg:   '16rpx',
  xl:   '20rpx',
  full: '999rpx',
} as const

// ─── 通用样式 ───────────────────────────
export const cardStyle = {
  backgroundColor: C.card,
  borderRadius: R.lg,
  borderWidth: '1rpx',
  borderStyle: 'solid' as const,
  borderColor: C.border,
  padding: S.card,
  marginBottom: S.gap,
}

export const pillStyle = {
  borderRadius: R.full,
  paddingHorizontal: S.lg,
  paddingVertical: S.sm,
}

// ─── 分隔线 ─────────────────────────────
export const dividerStyle = {
  height: '1rpx',
  backgroundColor: C.border,
  marginVertical: S.md,
}

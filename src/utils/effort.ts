// Phase 2: 开发周期规则引擎
// 基于项目特征估算基准工期，AI 负责微调

interface EffortInput {
  pageCount: number       // 页面数量
  apiCount: number        // API 数量
  hasAI: boolean          // 是否有 AI 能力
  hasCloudFn: boolean     // 是否有云函数
  hasDB: boolean          // 是否有数据库
  hasAuth: boolean        // 是否有登录
  hasPayment: boolean     // 是否有支付
}

// 每项基准工时（天）
const EFFORT_MAP = {
  pagePerUnit: 1.5,        // 每个页面
  apiPerUnit: 0.5,         // 每个 API
  aiSetup: 3,              // AI 能力接入
  cloudFn: 1.5,            // 云函数开发
  database: 2,             // 数据库设计+迁移
  auth: 3,                 // 登录注册系统
  payment: 5,              // 支付集成
  testing: 2,              // 测试+修复
  deploy: 1,               // 部署上线
}

export function calculateBaseEffort(input: EffortInput): number {
  let days = 0
  days += input.pageCount * EFFORT_MAP.pagePerUnit
  days += input.apiCount * EFFORT_MAP.apiPerUnit
  if (input.hasAI) days += EFFORT_MAP.aiSetup
  if (input.hasCloudFn) days += EFFORT_MAP.cloudFn
  if (input.hasDB) days += EFFORT_MAP.database
  if (input.hasAuth) days += EFFORT_MAP.auth
  if (input.hasPayment) days += EFFORT_MAP.payment
  days += EFFORT_MAP.testing
  days += EFFORT_MAP.deploy
  return Math.ceil(days)
}

// 将天数映射到 EstimatedDevTime 枚举
export function daysToEstimatedTime(days: number): string {
  if (days <= 3) return '1-3天'
  if (days <= 7) return '3-7天'
  if (days <= 14) return '1-2周'
  if (days <= 30) return '2-4周'
  return '1个月+'
}

// 从 AI 评估结果推断项目特征
export function inferEffortInput(result: any): EffortInput {
  const techStack = (result.techStack || []).map((t: string) => t.toLowerCase())
  const mvp = (result.mvpSuggestion || []).join(' ').toLowerCase()
  const roadmap = (result.roadmap || [])

  return {
    pageCount: Math.max(3, roadmap.length), // 至少3个页面
    apiCount: roadmap.length > 0 ? Math.max(1, Math.floor(roadmap.length / 2)) : 2,
    hasAI: true, // Project Judge 本身是 AI 项目
    hasCloudFn: techStack.some((t: string) => t.includes('cloud') || t.includes('lambda') || t.includes('function')),
    hasDB: techStack.some((t: string) => t.includes('sql') || t.includes('mongo') || t.includes('postgres') || t.includes('firebase')),
    hasAuth: mvp.includes('login') || mvp.includes('auth') || mvp.includes('user'),
    hasPayment: mvp.includes('payment') || mvp.includes('stripe') || mvp.includes('billing'),
  }
}

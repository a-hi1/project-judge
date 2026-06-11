import { transformResponse, clampScore, normalizeEstimatedDevTime } from '../services/parser'
import type { AIResponse } from '../types'

// ============================================================
// 辅助：简单断言（不依赖测试框架，可直接在控制台运行）
// ============================================================
let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}`)
    failed++
  }
}

// ============================================================
// Case 1: 正常返回
// ============================================================
function testValidResponse() {
  console.log('\n[Case 1] 正常返回')
  const raw: AIResponse = {
    project_name: 'AI简历助手',
    summary: '帮助优化简历',
    verdict: 'recommend',
    confidence: 78,
    one_line_conclusion: '市场需求大',
    estimated_dev_time: '7天',
    suitable_for: ['前端开发者'],
    not_suitable_for: ['零基础'],
    scores: {
      resume: { score: 85, reason: '简历加分明显' },
      learning: { score: 72, reason: '可学习LLM' },
      business: { score: 68, reason: '刚需市场' },
      difficulty: { score: 45, reason: '技术栈成熟' },
      innovation: { score: 55, reason: '有竞品' },
      recommendation: { score: 78, reason: '综合性价比高' },
    },
    pros: ['市场需求明确'],
    cons: ['竞品较多'],
    mvp_suggestion: ['先做单页优化'],
    tech_stack: ['React'],
    resume_text: '开发基于LLM的简历优化系统',
  }

  const result = transformResponse(raw)

  assert(result.projectName === 'AI简历助手', 'projectName 映射正确')
  assert(result.summary === '帮助优化简历', 'summary 映射正确')
  assert(result.verdict === 'recommend', 'verdict 映射正确')
  assert(result.confidence === 78, 'confidence 映射正确')
  assert(result.estimatedDevTime === '3-7天', 'estimatedDevTime 归一化: 7天 → 3-7天')
  assert(result.scores.resume.score === 85, 'scores.resume.score 正确')
  assert(result.scores.resume.reason === '简历加分明显', 'scores.resume.reason 正确')
  assert(result.suitableFor.length === 1, 'suitableFor 是数组')
  assert(result.pros.length === 1, 'pros 是数组')
}

// ============================================================
// Case 2: 缺失字段
// ============================================================
function testMissingFields() {
  console.log('\n[Case 2] 缺失字段')
  const raw = { project_name: 'AI简历助手' } as unknown as AIResponse

  const result = transformResponse(raw)

  assert(result.projectName === 'AI简历助手', 'projectName 保留')
  assert(result.summary === '暂无', 'summary 填充默认值')
  assert(result.verdict === 'not_recommend', 'verdict 默认 not_recommend')
  assert(result.confidence === 0, 'confidence 默认 0')
  assert(result.oneLineConclusion === '暂无评估结论', 'oneLineConclusion 填充')
  assert(result.estimatedDevTime === '1-2周', 'estimatedDevTime 默认 1-2周')
  assert(result.pros[0] === '暂无', 'pros 填充 [暂无]')
  assert(result.cons[0] === '暂无', 'cons 填充 [暂无]')
  assert(result.mvpSuggestion[0] === '暂无建议', 'mvpSuggestion 填充')
  assert(result.scores.resume.score === 0, 'scores.resume 默认 0')
  assert(result.scores.resume.reason === '暂无', 'scores.resume.reason 默认')
}

// ============================================================
// Case 3: 非法分数
// ============================================================
function testInvalidScores() {
  console.log('\n[Case 3] 非法分数')

  assert(clampScore(999) === 100, '999 → 100')
  assert(clampScore(-30) === 0, '-30 → 0')
  assert(clampScore('abc') === 0, '"abc" → 0')
  assert(clampScore(null) === 0, 'null → 0')
  assert(clampScore(undefined) === 0, 'undefined → 0')
  assert(clampScore(85) === 85, '85 → 85（正常值不变）')

  const raw = {
    project_name: '测试项目',
    scores: {
      resume: { score: 999, reason: '越界' },
      learning: { score: -30, reason: '负数' },
      business: { score: 'abc' as unknown as number, reason: '非数字' },
      difficulty: { score: null as unknown as number, reason: '' },
      innovation: {} as { score: number; reason: string },
      recommendation: { score: 80, reason: '正常' },
    },
  } as unknown as AIResponse

  const result = transformResponse(raw)

  assert(result.scores.resume.score === 100, '999 → 100 via transform')
  assert(result.scores.learning.score === 0, '-30 → 0 via transform')
  assert(result.scores.business.score === 0, '"abc" → 0 via transform')
  assert(result.scores.difficulty.score === 0, 'null → 0 via transform')
  assert(result.scores.innovation.score === 0, 'missing score → 0 via transform')
  assert(result.scores.innovation.reason === '暂无', 'missing reason → 暂无')
}

// ============================================================
// Case 4: 垃圾数据
// ============================================================
function testGarbageResponse() {
  console.log('\n[Case 4] 垃圾数据')
  const raw = { abc: 123, xyz: true } as unknown as AIResponse

  const result = transformResponse(raw)

  assert(result.projectName === '未命名项目', 'projectName 填充默认')
  assert(result.summary === '暂无', 'summary 填充默认')
  assert(result.verdict === 'not_recommend', 'verdict 默认')
  assert(typeof result.confidence === 'number', 'confidence 是数字')
  assert(Array.isArray(result.pros), 'pros 是数组')
  assert(Array.isArray(result.cons), 'cons 是数组')
  assert(Array.isArray(result.suitableFor), 'suitableFor 是数组')
  assert(result.scores.resume.score === 0, '所有分数默认 0')
}

// ============================================================
// 额外：normalizeEstimatedDevTime 边界测试
// ============================================================
function testNormalizeDevTime() {
  console.log('\n[额外] normalizeEstimatedDevTime 边界')

  assert(normalizeEstimatedDevTime('7天') === '3-7天', '"7天" → "3-7天"')
  assert(normalizeEstimatedDevTime('3天') === '1-3天', '"3天" → "1-3天"')
  assert(normalizeEstimatedDevTime('14天') === '1-2周', '"14天" → "1-2周"')
  assert(normalizeEstimatedDevTime('30天') === '2-4周', '"30天" → "2-4周"')
  assert(normalizeEstimatedDevTime('60天') === '1个月+', '"60天" → "1个月+"')
  assert(normalizeEstimatedDevTime('约1周') === '1-2周', '"约1周" → "1-2周"')
  assert(normalizeEstimatedDevTime('2个月') === '1个月+', '"2个月" → "1个月+"')
  assert(normalizeEstimatedDevTime(null) === '1-2周', 'null → "1-2周"')
  assert(normalizeEstimatedDevTime('') === '1-2周', '空串 → "1-2周"')
}

// ============================================================
// 运行
// ============================================================
export function runContractTests() {
  console.log('========== Schema Contract Test ==========')

  testValidResponse()
  testMissingFields()
  testInvalidScores()
  testGarbageResponse()
  testNormalizeDevTime()

  console.log('\n========== 结果 ==========')
  console.log(`通过: ${passed}  失败: ${failed}`)

  if (failed > 0) {
    throw new Error(`Contract Test 失败: ${failed} 项`)
  }

  console.log('✅ 全部通过\n')
}

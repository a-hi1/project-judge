import type { AIResponse, EvaluationResult, EstimatedDevTime, SimilarProject, Benchmark, RoadmapStep, InterviewQuestion, ResumeStar, DevelopmentTask, GitHubAnalysis } from '../types'

// ============================================================
// 工具函数
// ============================================================

export function clampScore(score: unknown): number {
  const n = Number(score)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function normalizeVerdict(v: unknown): 'recommend' | 'not_recommend' {
  if (typeof v === 'string' && v.toLowerCase().includes('not')) return 'not_recommend'
  if (typeof v === 'string' && v.toLowerCase().includes('recommend')) return 'recommend'
  return 'not_recommend'
}

export function normalizeEstimatedDevTime(raw: unknown): EstimatedDevTime {
  if (typeof raw !== 'string') return '1-2周'
  const s = raw.replace(/\s/g, '')
  const num = parseInt(s.match(/\d+/)?.[0] ?? '', 10)
  if (isNaN(num)) return '1-2周'
  if (s.includes('月')) return '1个月+'
  if (s.includes('周')) return num <= 2 ? '1-2周' : '2-4周'
  if (s.includes('天')) {
    if (num <= 3) return '1-3天'
    if (num <= 7) return '3-7天'
    if (num <= 14) return '1-2周'
    if (num <= 30) return '2-4周'
    return '1个月+'
  }
  if (num <= 3) return '1-3天'
  if (num <= 7) return '3-7天'
  if (num <= 14) return '1-2周'
  if (num <= 30) return '2-4周'
  return '1个月+'
}

function ensureStringArray(val: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(val)) return fallback
  return val.map(v => String(v)).filter(Boolean)
}

function ensureString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback
}

function parseSimilarProjects(val: unknown): SimilarProject[] {
  if (!Array.isArray(val)) return []
  return val
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      name: ensureString(item.name, '未知项目'),
      description: ensureString(item.description, '暂无介绍'),
      similarity: clampScore(item.similarity),
      whySuccess: ensureString(item.whySuccess, '暂无'),
    }))
    .slice(0, 3)
}

function parseBenchmark(val: unknown): Benchmark {
  if (!val || typeof val !== 'object') return { average: 65, percentile: 'Top 50%', version: '2026Q2' }
  const b = val as Record<string, unknown>
  return {
    average: clampScore(b.average),
    percentile: ensureString(b.percentile, 'Top 50%'),
    version: ensureString(b.version, '2026Q2'),
  }
}

function parseRoadmap(val: unknown): RoadmapStep[] {
  if (!Array.isArray(val)) return []
  return val
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      day: ensureString(item.day, 'Day?'),
      task: ensureString(item.task, '待定'),
    }))
    .slice(0, 7)
}

// P0-2: 面试问题解析（含 answer）
function parseInterviewQuestions(val: unknown): InterviewQuestion[] {
  if (!Array.isArray(val)) return []
  return val
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      question: ensureString(item.question, '未知问题'),
      answer: ensureString(item.answer, '暂无参考答案'),
      follow_up: ensureString(item.follow_up, ''),
      difficulty: typeof item.difficulty === 'number' ? Math.max(1, Math.min(5, Math.round(item.difficulty))) : 3,
      keywords: ensureStringArray(item.keywords),
      category: ensureString(item.category, '技术选型'),
    }))
    .slice(0, 5)
}

// P0-3: STAR 简历解析
function parseResumeStar(val: unknown): ResumeStar {
  if (!val || typeof val !== 'object') {
    return { situation: '', task: '', action: '', result: '', resumeText: '' }
  }
  const s = val as Record<string, unknown>
  return {
    situation: ensureString(s.situation),
    task: ensureString(s.task),
    action: ensureString(s.action),
    result: ensureString(s.result),
    resumeText: ensureString(s.resumeText),
  }
}

// P1-4: 开发周期拆解
function parseDevelopmentBreakdown(val: unknown): DevelopmentTask[] {
  if (!Array.isArray(val)) return []
  return val
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      task: ensureString(item.task, '待定'),
      days: typeof item.days === 'number' && item.days > 0 ? Math.round(item.days) : 1,
    }))
    .slice(0, 10)
}

// Phase 1: GitHub 深度分析
function parseGitHubAnalysis(val: unknown): GitHubAnalysis | null {
  if (!val || typeof val !== 'object') return null
  const g = val as Record<string, unknown>
  return {
    stars: typeof g.stars === 'number' ? g.stars : 0,
    forks: typeof g.forks === 'number' ? g.forks : 0,
    openIssues: typeof g.openIssues === 'number' ? g.openIssues : 0,
    contributors: typeof g.contributors === 'number' ? g.contributors : 0,
    lastCommit: ensureString(g.lastCommit, '未知'),
    releases: typeof g.releases === 'number' ? g.releases : 0,
    license: ensureString(g.license, '未知'),
    activityLevel: ensureString(g.activityLevel, '未知'),
    communityLevel: ensureString(g.communityLevel, '未知'),
    influenceLevel: ensureString(g.influenceLevel, '未知'),
    riskLevel: ensureString(g.riskLevel, '未知'),
  }
}

// ============================================================
// 默认值填充
// ============================================================

export function fillDefaultValues(partial: Partial<EvaluationResult>): EvaluationResult {
  const defaultScore = { score: 0, reason: '暂无' }

  return {
    projectName: ensureString(partial.projectName, '未命名项目'),
    summary: ensureString(partial.summary, '暂无'),
    verdict: partial.verdict ?? 'not_recommend',
    oneLineConclusion: ensureString(partial.oneLineConclusion, '暂无评估结论'),
    estimatedDevTime: partial.estimatedDevTime ?? '1-2周',
    scores: {
      resume: partial.scores?.resume ?? defaultScore,
      learning: partial.scores?.learning ?? defaultScore,
      business: partial.scores?.business ?? defaultScore,
      difficulty: partial.scores?.difficulty ?? defaultScore,
      innovation: partial.scores?.innovation ?? defaultScore,
      recommendation: partial.scores?.recommendation ?? defaultScore,
    },
    pros: ensureStringArray(partial.pros, ['暂无']),
    cons: ensureStringArray(partial.cons, ['暂无']),
    mvpSuggestion: ensureStringArray(partial.mvpSuggestion, ['暂无建议']),
    techStack: ensureStringArray(partial.techStack, ['暂无建议']),
    resumeText: ensureString(partial.resumeText, '暂无简历建议'),
    similarProjects: partial.similarProjects ?? [],
    whySuccess: ensureStringArray(partial.whySuccess, ['暂无']),
    whyFail: ensureStringArray(partial.whyFail, ['暂无']),
    benchmark: partial.benchmark ?? { average: 65, percentile: 'Top 50%', version: '2026Q2' },
    roadmap: partial.roadmap ?? [],
    interviewQuestions: partial.interviewQuestions ?? [],
    resumeStar: partial.resumeStar ?? { situation: '', task: '', action: '', result: '', resumeText: '' },
    developmentBreakdown: partial.developmentBreakdown ?? [],
    readmeSummary: ensureString(partial.readmeSummary),
    githubAnalysis: partial.githubAnalysis ?? null,
  }
}

// ============================================================
// 主转换函数
// ============================================================

export function transformResponse(raw: AIResponse): EvaluationResult {
  return fillDefaultValues({
    projectName: raw.project_name,
    summary: raw.summary,
    verdict: normalizeVerdict(raw.verdict),
    oneLineConclusion: raw.one_line_conclusion,
    estimatedDevTime: normalizeEstimatedDevTime(raw.estimated_dev_time),
    scores: {
      resume: { score: clampScore(raw.scores?.resume?.score), reason: ensureString(raw.scores?.resume?.reason, '暂无') },
      learning: { score: clampScore(raw.scores?.learning?.score), reason: ensureString(raw.scores?.learning?.reason, '暂无') },
      business: { score: clampScore(raw.scores?.business?.score), reason: ensureString(raw.scores?.business?.reason, '暂无') },
      difficulty: { score: clampScore(raw.scores?.difficulty?.score), reason: ensureString(raw.scores?.difficulty?.reason, '暂无') },
      innovation: { score: clampScore(raw.scores?.innovation?.score), reason: ensureString(raw.scores?.innovation?.reason, '暂无') },
      recommendation: { score: clampScore(raw.scores?.recommendation?.score), reason: ensureString(raw.scores?.recommendation?.reason, '暂无') },
    },
    pros: ensureStringArray(raw.pros),
    cons: ensureStringArray(raw.cons),
    mvpSuggestion: ensureStringArray(raw.mvp_suggestion),
    techStack: ensureStringArray(raw.tech_stack),
    resumeText: raw.resume_text,
    similarProjects: parseSimilarProjects(raw.similar_projects),
    whySuccess: ensureStringArray(raw.why_success),
    whyFail: ensureStringArray(raw.why_fail),
    benchmark: parseBenchmark(raw.benchmark),
    roadmap: parseRoadmap(raw.roadmap),
    interviewQuestions: parseInterviewQuestions(raw.interview_questions),
    resumeStar: parseResumeStar(raw.resume_star),
    developmentBreakdown: parseDevelopmentBreakdown(raw.development_breakdown),
    readmeSummary: ensureString(raw.readme_summary),
    githubAnalysis: parseGitHubAnalysis(raw.github_analysis),
  })
}

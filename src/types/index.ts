// ============================================================
// 共享类型（两端复用）
// ============================================================

export interface ScoreItem {
  score: number
  reason: string
}

export interface Scores {
  resume: ScoreItem
  learning: ScoreItem
  business: ScoreItem
  difficulty: ScoreItem
  innovation: ScoreItem
  recommendation: ScoreItem
}

export type EstimatedDevTime =
  | '1-3天'
  | '3-7天'
  | '1-2周'
  | '2-4周'
  | '1个月+'

export interface ProjectInput {
  content: string
  type: 'github' | 'idea' | 'description'
}

export interface SimilarProject {
  name: string
  description: string
  similarity: number
  whySuccess: string
}

export interface Benchmark {
  average: number
  percentile: string
  version: string    // "2026Q2" 格式
}

export interface RoadmapStep {
  day: string
  task: string
}

// P0-2: 面试官提问（含答案）
export interface InterviewQuestion {
  question: string
  answer: string
  follow_up: string
  difficulty: number
  keywords: string[]   // 关键技术词
  category: string
}

// Phase 1: GitHub 深度分析
export interface GitHubAnalysis {
  stars: number
  forks: number
  openIssues: number
  contributors: number
  lastCommit: string        // "3天前" 格式
  releases: number
  license: string
  activityLevel: string     // 活跃 / 一般 / 停滞
  communityLevel: string    // 成熟 / 成长中 / 萌芽
  influenceLevel: string    // 高 / 中 / 低
  riskLevel: string         // 低 / 中 / 高
}

// P0-3: STAR 简历格式
export interface ResumeStar {
  situation: string   // 项目背景
  task: string        // 你的任务
  action: string      // 你做了什么
  result: string      // 成果
  resumeText: string  // 80-120字，可直接写入简历
}

// P1-4: 开发周期拆解
export interface DevelopmentTask {
  task: string
  days: number
}

// ============================================================
// AI Response（snake_case，与 Prompt Schema 对齐）
// ============================================================
export interface AIResponse {
  project_name: string
  summary: string
  verdict: 'recommend' | 'not_recommend'
  one_line_conclusion: string
  estimated_dev_time: EstimatedDevTime
  scores: {
    resume: { score: number; reason: string }
    learning: { score: number; reason: string }
    business: { score: number; reason: string }
    difficulty: { score: number; reason: string }
    innovation: { score: number; reason: string }
    recommendation: { score: number; reason: string }
  }
  pros: string[]
  cons: string[]
  mvp_suggestion: string[]
  tech_stack: string[]
  resume_text: string
  similar_projects: SimilarProject[]
  why_success: string[]
  why_fail: string[]
  benchmark: Benchmark
  roadmap: RoadmapStep[]
  interview_questions: InterviewQuestion[]
  resume_star: ResumeStar
  development_breakdown: DevelopmentTask[]
  readme_summary: string
  category: string
  github_analysis: GitHubAnalysis | null   // 仅 GitHub 项目有值
}

// ============================================================
// EvaluationResult（camelCase，页面只用这个类型）
// ============================================================
export interface EvaluationResult {
  projectName: string
  summary: string
  verdict: 'recommend' | 'not_recommend'
  oneLineConclusion: string
  estimatedDevTime: EstimatedDevTime
  scores: Scores
  pros: string[]
  cons: string[]
  mvpSuggestion: string[]
  techStack: string[]
  resumeText: string
  similarProjects: SimilarProject[]
  whySuccess: string[]
  whyFail: string[]
  benchmark: Benchmark
  roadmap: RoadmapStep[]
  interviewQuestions: InterviewQuestion[]
  resumeStar: ResumeStar
  developmentBreakdown: DevelopmentTask[]
  readmeSummary: string
  githubAnalysis: GitHubAnalysis | null
}

// ============================================================
// 历史记录
// ============================================================
export interface HistoryRecord {
  id: string
  title: string
  recommendation: number
  verdict: 'recommend' | 'not_recommend'
  input: ProjectInput
  result: EvaluationResult
  createdAt: number
}

// ============================================================
// 批量对比
// ============================================================
export interface CompareItem {
  name: string
  score: number
  verdict: 'recommend' | 'not_recommend'
  estimatedDevTime: EstimatedDevTime
}

export interface ErrorResult {
  error: true
  message: string
}

const cloud = require('wx-server-sdk')
const fetch = require('node-fetch')
const benchmarkData = require('./benchmark.json')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'
const TIMEOUT_MS = 60000
const TEMPERATURE = 0.3

// ============================================================
// Benchmark Engine：基于真实基准数据计算百分位
// ============================================================
function calculateBenchmark(score, category) {
  const data = benchmarkData[category] || benchmarkData['default']
  let percentile = 'Top 50%'
  if (score >= data.top10) percentile = 'Top 10%'
  else if (score >= data.top20) percentile = 'Top 20%'
  else if (score >= data.top30) percentile = 'Top 30%'
  else if (score >= data.avg) percentile = 'Top 50%'
  else percentile = 'Bottom 50%'
  return { average: data.avg, percentile, version: '2026Q2' }
  return { average: data.avg, percentile }
}

// ============================================================
// GitHub 仓库信息 + README
// ============================================================
async function fetchGitHubRepo(url) {
  const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/)
  if (!match) return null
  const [, owner, repo] = match
  const headers = { 'User-Agent': 'project-judge-miniapp' }

  try {
    const [repoRes, readmeRes, pkgRes, contribRes, releasesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: { ...headers, 'Accept': 'application/vnd.github.raw' } }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers: { ...headers, 'Accept': 'application/vnd.github.raw' } }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`, { headers }),
    ])

    let readmeText = ''
    if (readmeRes.ok) {
      readmeText = await readmeRes.text()
      readmeText = readmeText.slice(0, 3000)
    }

    // 读取 package.json 提取技术栈
    let techStackFromPkg = []
    if (pkgRes.ok) {
      try {
        const pkgText = await pkgRes.text()
        const pkg = JSON.parse(pkgText)
        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        }
        // 过滤出知名框架/库
        const knownTech = [
          'react', 'vue', 'angular', 'next', 'nuxt', 'svelte', 'solid-js',
          'typescript', 'tailwindcss', 'sass', 'less',
          'express', 'koa', 'fastify', 'nestjs', 'hono',
          'prisma', 'drizzle-orm', 'sequelize', 'mongoose', 'typeorm',
          'openai', 'langchain', 'llamaindex', 'anthropic',
          'zustand', 'redux', 'jotai', 'recoil', 'mobx',
          'vite', 'webpack', 'esbuild', 'turbopack',
          'jest', 'vitest', 'playwright', 'cypress',
          'docker', 'kubernetes',
          'graphql', 'trpc', 'apollo',
          'stripe', 'supabase', 'firebase', 'aws-sdk',
          'taro', 'uni-app', 'react-native', 'expo', 'flutter',
        ]
        techStackFromPkg = Object.keys(allDeps)
          .filter(dep => knownTech.includes(dep))
          .slice(0, 8)
      } catch (_) {}
    }

    if (!repoRes.ok) return null
    const data = await repoRes.json()

    // 计算相对时间
    const lastCommitDate = data.pushed_at ? new Date(data.pushed_at) : null
    let lastCommit = '未知'
    if (lastCommitDate) {
      const diffDays = Math.floor((Date.now() - lastCommitDate.getTime()) / 86400000)
      if (diffDays === 0) lastCommit = '今天'
      else if (diffDays < 7) lastCommit = `${diffDays}天前`
      else if (diffDays < 30) lastCommit = `${Math.floor(diffDays / 7)}周前`
      else if (diffDays < 365) lastCommit = `${Math.floor(diffDays / 30)}个月前`
      else lastCommit = `${Math.floor(diffDays / 365)}年前`
    }

    // 读取 contributors 数量（从 Link header 解析）
    let contributors = 1
    if (contribRes.ok) {
      const link = contribRes.headers.get('link') || ''
      const match = link.match(/page=(\d+)>; rel="last"/)
      contributors = match ? parseInt(match[1]) : 1
    }

    // releases 数量
    let releases = 0
    if (releasesRes.ok) {
      const relData = await releasesRes.json()
      releases = Array.isArray(relData) ? relData.length : 0
    }

    const stars = data.stargazers_count || 0
    const forks = data.forks_count || 0
    const openIssues = data.open_issues_count || 0
    const license = data.license ? (data.license.spdx_id || data.license.name || '未知') : '无'

    // 分析等级计算
    const activityLevel = lastCommit === '今天' || lastCommit.includes('天') ? '活跃' : lastCommit.includes('周') ? '一般' : '停滞'
    const communityLevel = contributors >= 20 ? '成熟' : contributors >= 5 ? '成长中' : '萌芽'
    const influenceLevel = stars >= 5000 ? '高' : stars >= 500 ? '中' : '低'
    const riskLevel = activityLevel === '停滞' ? '高' : openIssues > 100 ? '中' : '低'

    return {
      name: data.name || repo,
      description: data.description || '',
      stars, forks, language: data.language || '',
      topics: data.topics || [],
      updated_at: data.updated_at || '',
      open_issues: openIssues,
      readme: readmeText,
      techStackFromPkg,
      githubAnalysis: {
        stars, forks, openIssues, contributors, lastCommit, releases, license,
        activityLevel, communityLevel, influenceLevel, riskLevel,
      },
    }
  } catch {
    return null
  }
}

// ============================================================
// Prompt 模板
// ============================================================
function getSystemPrompt(type, repoInfo) {
  let intro = ''
  if (type === 'github' && repoInfo) {
    intro = `你是一个专业的开源项目评估专家。以下是 GitHub 仓库的真实数据：

仓库名：${repoInfo.name}
描述：${repoInfo.description}
Stars：${repoInfo.stars}
Forks：${repoInfo.forks}
语言：${repoInfo.language}
Topics：${repoInfo.topics.join(', ') || '无'}
最近更新：${repoInfo.updated_at}
Open Issues：${repoInfo.open_issues}
${repoInfo.techStackFromPkg && repoInfo.techStackFromPkg.length > 0 ? `\n技术栈（来自 package.json）：${repoInfo.techStackFromPkg.join(', ')}` : ''}
${repoInfo.readme ? `\nREADME 摘要：\n${repoInfo.readme}` : ''}

请基于以上真实数据进行评估，不要编造数据。tech_stack 字段请优先使用上面列出的真实技术栈。`
  } else if (type === 'github') {
    intro = '你是一个专业的开源项目评估专家。用户给出了一个 GitHub 项目，你需要从开源价值、简历价值、学习价值等维度进行评估。'
  } else if (type === 'description') {
    intro = '你是一个专业的项目评估专家。用户给出了一个项目的详细描述，你需要综合评估这个项目的各维度价值。'
  } else {
    intro = '你是一个专业的项目评估专家。用户给出了一个项目想法（通常只有一句话），你需要从可行性、市场潜力、技术难度等维度评估这个想法是否值得投入开发。'
  }

  return `${intro}

你必须了解同类项目的真实市场情况。评估结果要基于真实数据和市场认知，不能凭空打分。

严格按以下 JSON 格式输出，不要输出任何其他内容：

{
  "project_name": "项目名称",
  "summary": "一句话总结，20字以内",
  "verdict": "recommend 或 not_recommend",
  "one_line_conclusion": "一句话结论，20字以内",
  "estimated_dev_time": "1-3天 或 3-7天 或 1-2周 或 2-4周 或 1个月+",
  "scores": {
    "resume":       { "score": 0-100, "reason": "理由，20字以内" },
    "learning":     { "score": 0-100, "reason": "理由，20字以内" },
    "business":     { "score": 0-100, "reason": "理由，20字以内" },
    "difficulty":   { "score": 0-100, "reason": "理由，20字以内" },
    "innovation":   { "score": 0-100, "reason": "理由，20字以内" },
    "recommendation": { "score": 0-100, "reason": "理由，20字以内" }
  },
  "pros": ["优势1", "优势2", "优势3"],
  "cons": ["风险1", "风险2", "风险3"],
  "mvp_suggestion": ["MVP建议1", "MVP建议2", "MVP建议3"],
  "tech_stack": ["技术1", "技术2", "技术3"],
  "resume_text": "简历描述，50-100字",
  "similar_projects": [
    { "name": "竞品名", "description": "一句话介绍", "similarity": 0-100, "whySuccess": "成功原因" }
  ],
  "why_success": ["成功原因1", "成功原因2"],
  "why_fail": ["失败原因1", "失败原因2"],
  "benchmark": { "average": 0-100, "percentile": "Top X%" },
  "roadmap": [
    { "day": "Day1", "task": "任务描述" }
  ],
  "interview_questions": [
    {
      "question": "面试官可能问的问题",
      "answer": "标准回答，100字以内，必须包含具体数据或技术细节",
      "follow_up": "面试官的追问，20字以内",
      "difficulty": 3,
      "keywords": ["关键词1", "关键词2"],
      "category": "架构设计 或 Prompt工程 或 性能优化 或 容错设计 或 技术选型"
    }
  ],
  "resume_star": {
    "situation": "项目背景，30字以内",
    "task": "你的任务，20字以内",
    "action": "你做了什么，必须包含具体技术方案，30字以内",
    "result": "成果，必须包含量化数据，如提升XX%、支持XX+、降低XX%，20字以内",
    "resumeText": "可直接写入简历的描述，80-120字，必须包含量化成果"
  },
  "development_breakdown": [
    { "task": "需求分析", "days": 1 },
    { "task": "具体任务", "days": 2 }
  ],
  "readme_summary": "如果是GitHub项目，用50字总结README核心内容；如果不是GitHub项目，返回空字符串",
  "category": "从以下选择最匹配的一个：ai_resume, ai_writing, ai_chatbot, ai_assistant, agent, rag, saas_tool, dev_tool, education, ecommerce, social, game, open_source_tool, data_analysis, automation"
}

评分标准：
- resume：对求职/简历的加分程度
- learning：能学到多少新技术/架构知识
- business：能否变现/有市场需求
- difficulty：难度越高分数越高，100=极难
- innovation：新颖程度，是否已有成熟竞品
- recommendation：综合推荐程度

重要规则：
- verdict：recommendation.score >= 60 为 recommend，< 60 为 not_recommend
- similar_projects：必须是真实存在的项目，不要编造
- interview_questions：
  · 必须5个，覆盖：技术选型、架构设计、Prompt工程、性能优化、容错设计
  · answer 必须像真实的校招面试回答，有具体技术细节，禁止空话套话
  · answer 示例格式："选择 DeepSeek 主要基于三点：第一，API 单价仅为 GPT-4o 的约 1/10，适合个人项目控制成本；第二，中文场景下 F1 评分接近；第三，支持 response_format=json_object，输出稳定性高。"
  · follow_up 是面试官听了你的回答后会追问的更深层问题，例如"如果并发量增大10倍，这个方案还成立吗？"
- resume_star：
  · action 必须包含具体技术方案，禁止"负责开发"、"实现功能"这种空话
  · result 必须包含量化数据，例如"累计评估 100+ 项目"、"平均响应时间 15 秒"、"Prompt 解析成功率 98%"
  · resumeText 示例："独立开发 AI 项目评估系统，基于 Taro + React + TypeScript 构建微信小程序前端，集成 DeepSeek API 实现五维智能评分。设计 Prompt 分层路由策略（GitHub/idea/description 三种输入场景），实现结构化 JSON 解析容错机制。累计支持 100+ 项目评估，平均生成时间 15 秒内，结果解析成功率 98%。"
- development_breakdown：5-8个具体任务，days总和应与estimated_dev_time匹配
- readme_summary：仅GitHub项目需要，其他类型返回空字符串
- 所有文本使用中文。`
}

// ============================================================
// extractJson 容错
// ============================================================
function extractJson(text) {
  const cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  try { return JSON.parse(cleaned) } catch (_) {}

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('未找到有效 JSON')
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}

// ============================================================
// DeepSeek 调用
// ============================================================
async function callDeepSeek(content, type, repoInfo) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  console.log('[evaluate] 开始调用 DeepSeek API, type:', type, 'repoInfo:', !!repoInfo)

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
  })

  const requestPromise = fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: getSystemPrompt(type, repoInfo) },
        { role: 'user', content: content },
      ],
    }),
  })

  const response = await Promise.race([requestPromise, timeoutPromise])

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek HTTP ${response.status}: ${errorText}`)
  }

  const json = await response.json()
  const messageContent = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content

  if (!messageContent) {
    throw new Error('DeepSeek 返回内容为空')
  }

  const result = extractJson(messageContent)

  // 用真实基准数据覆盖 AI 猜的 benchmark
  const category = result.category || 'default'
  const recScore = result.scores && result.scores.recommendation && result.scores.recommendation.score
  if (typeof recScore === 'number') {
    result.benchmark = calculateBenchmark(recScore, category)
  }

  console.log('[evaluate] 调用成功, category:', category)
  return { result, repoInfo }
}

// ============================================================
// 云函数入口
// ============================================================
exports.main = async (event) => {
  const { content, type } = event

  if (!content || typeof content !== 'string' || !content.trim()) {
    return { success: false, error: '请输入项目信息' }
  }

  if (content.length > 5000) {
    return { success: false, error: '输入过长，请精简到5000字以内' }
  }

  let repoInfo = null
  if (type === 'github') {
    repoInfo = await fetchGitHubRepo(content.trim())
    console.log('[evaluate] GitHub repo info:', repoInfo ? repoInfo.name : 'not found')
  }

  try {
    const { result, repoInfo: repo } = await callDeepSeek(content.trim(), type || 'idea', repoInfo)
    result.github_analysis = repo && repo.githubAnalysis ? repo.githubAnalysis : null
    return { success: true, data: result }
  } catch (err) {
    console.log('[evaluate] 调用失败:', err.message)

    if (err.message === 'TIMEOUT') {
      return { success: false, error: 'AI 思考超时，请稍后重试' }
    }

    return { success: false, error: err.message || '评估失败，请重试' }
  }
}

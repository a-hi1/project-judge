# GitHub 分析模块

> 5 路并行 API 调用，构建仓库全貌

---

## 背景

当用户输入一个 GitHub 仓库 URL 时，Project Judge 不只是让 AI "想象"这个项目的评估——它会**先从 GitHub 获取真实数据**，再把这些数据注入 Prompt，让 AI 基于事实评估。

## 设计目标

1. 从 GitHub 获取仓库的完整画像（元数据、README、技术栈、社区、活跃度）
2. 尽可能并行调用，减少用户等待时间
3. 计算可量化的分析指标（活跃度、社区成熟度、影响力、风险等级）
4. 将真实数据注入 Prompt，防止 AI 编造

## 实现细节

### 5 路并行 API 调用

**文件**：`cloud/evaluate/index.js:30-140`

```javascript
const [repoRes, readmeRes, pkgRes, contribRes, releasesRes] = await Promise.all([
  fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
  fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: { ...headers, 'Accept': 'application/vnd.github.raw' } }),
  fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers: { ...headers, 'Accept': 'application/vnd.github.raw' } }),
  fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1`, { headers }),
  fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`, { headers }),
])
```

**每个 API 的作用**：

| # | API | 获取内容 | 用途 |
|---|-----|---------|------|
| 1 | `/repos/:owner/:repo` | 元数据（stars, forks, issues, language, topics, pushed_at, license） | 基础信息 + 活跃度 + 影响力 |
| 2 | `/repos/:owner/:repo/readme` | README 原文（截取前 3000 字） | 注入 Prompt，让 AI 理解项目 |
| 3 | `/repos/:owner/:repo/contents/package.json` | 依赖列表 | 提取技术栈 |
| 4 | `/repos/:owner/:repo/contributors?per_page=1` | Link header | 计算贡献者总数 |
| 5 | `/repos/:owner/:repo/releases?per_page=1` | 发布列表 | 计算发布次数 |

### 技术栈提取

**文件**：`cloud/evaluate/index.js:52-79`

从 `package.json` 的 `dependencies` + `devDependencies` 中，过滤出 40+ 个已知框架/库：

```javascript
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
```

**为什么限制为已知技术？** 防止把内部包名（如 `@company/utils`）误识别为技术栈。只提取主流框架和库。

**截取前 8 个**：避免技术栈列表过长影响 Prompt 质量。

### 分析等级计算

**文件**：`cloud/evaluate/index.js:118-121`

```javascript
const activityLevel = lastCommit === '今天' || lastCommit.includes('天') ? '活跃' 
                    : lastCommit.includes('周') ? '一般' : '停滞'
const communityLevel = contributors >= 20 ? '成熟' : contributors >= 5 ? '成长中' : '萌芽'
const influenceLevel = stars >= 5000 ? '高' : stars >= 500 ? '中' : '低'
const riskLevel = activityLevel === '停滞' ? '高' : openIssues > 100 ? '中' : '低'
```

**阈值设计理由**：

| 指标 | 高/成熟/活跃 | 中/成长中/一般 | 低/萌芽/停滞 |
|------|-------------|---------------|-------------|
| activityLevel | 最近 7 天有提交 | 最近 4 周有提交 | 超过 1 个月无提交 |
| communityLevel | ≥20 贡献者 | ≥5 贡献者 | <5 贡献者 |
| influenceLevel | ≥5000 stars | ≥500 stars | <500 stars |
| riskLevel | 活跃停滞 或 >100 issues | 其他 | 低风险 |

**为什么用中文？** 因为最终展示给用户的是中文界面，直接用中文减少翻译层。

### 贡献者数量的巧妙获取

GitHub 的 contributors API 默认返回 30 个贡献者。要获取精确总数，有两个方案：

**方案 A**：请求所有页（`?per_page=100&page=N`）
- 优点：精确
- 缺点：多次请求，慢

**方案 B**：只请求第 1 页（`?per_page=1`），从 `Link` header 解析总数
- 优点：一次请求，快
- 缺点：依赖 Link header 格式

**最终决策**：方案 B。

```javascript
const link = contribRes.headers.get('link') || ''
const match = link.match(/page=(\d+)>; rel="last"/)
contributors = match ? parseInt(match[1]) : 1
```

这是 GitHub API 的一个技巧：`Link` header 中 `rel="last"` 的 page 值就是总页数。当 `per_page=1` 时，总页数 = 总贡献者数。

### User-Agent 设置

```javascript
const headers = { 'User-Agent': 'project-judge-miniapp' }
```

GitHub API 要求所有请求都带 `User-Agent` header。未设置会导致 403 错误。

**未认证限制**：60 次/小时/IP。对 MVP 阶段足够，但需要注意云函数的出口 IP 可能共享。

## 数据注入 Prompt

获取到的仓库信息会被注入到 Prompt 模板中：

```
仓库名：${repoInfo.name}
描述：${repoInfo.description}
Stars：${repoInfo.stars}
Forks：${repoInfo.forks}
语言：${repoInfo.language}
Topics：${repoInfo.topics.join(', ') || '无'}
最近更新：${repoInfo.updated_at}
Open Issues：${repoInfo.open_issues}
技术栈（来自 package.json）：${repoInfo.techStackFromPkg.join(', ')}
README 摘要：
${repoInfo.readme}
```

**关键约束**：Prompt 中明确写了 `"请基于以上真实数据进行评估，不要编造数据"`。

## 优缺点分析

| 优点 | 缺点 |
|------|------|
| 5 路并行，总耗时约 1-2 秒（取决于 GitHub 响应速度） | 未认证 API 限制 60 次/小时 |
| 真实数据注入，AI 评估更可靠 | package.json 可能不存在（非 Node.js 项目） |
| 贡献者数量通过 Link header 巧妙获取 | README 截取 3000 字可能丢失关键信息 |
| 技术栈提取覆盖 40+ 主流框架 | 内部包名可能被误识别 |

## 面试官可能追问

1. "GitHub API 限流了怎么办？"
2. "为什么不用 GraphQL API？"
3. "README 截取 3000 字会不会丢信息？"
4. "技术栈列表是硬编码的，怎么扩展？"

## 标准回答

> **Q：GitHub API 限流了怎么办？**
>
> 短期方案：云函数出口 IP 是共享的，60 次/小时是所有用户共享的额度。如果触发限流，会返回 null，前端展示"GitHub 数据获取失败"但评估仍然继续（只是没有真实数据）。长期方案：1）申请 GitHub Personal Access Token，额度提升到 5000 次/小时；2）引入缓存层（Redis 或云数据库），同一仓库 24 小时内不重复请求；3）只在用户明确输入 GitHub URL 时才调用 API，不做预请求。

---

**相关文档**：
- [[00 项目总览]] - 技术栈全局视图
- [[02 架构设计]] - 云函数中 GitHub API 的位置
- [[04 Prompt工程]] - GitHub 数据如何注入 Prompt
- [[11 工程踩坑记录]] - GitHub API 读取限制的踩坑经验

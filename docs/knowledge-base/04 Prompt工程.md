# Prompt 工程

> Prompt 从 V1 到最终版本的完整演化，每次升级解决的问题

---

## 背景

Project Judge 的 Prompt 是整个产品的**核心引擎**。所有功能——评估、评分、面试题、STAR 简历、开发周期——都依赖 Prompt 的输出质量。Prompt 的演化不是线性优化，而是在每次增加功能时重新设计。

## Prompt V1：单分评估（v0.1）

### 设计

最初的 Prompt 只要求 AI 输出一个总分和置信度：

```
你是一个项目评估专家。用户会给你一个项目想法，请评估这个想法的可行性。
输出 JSON 格式：
{
  "project_name": "项目名称",
  "score": 0-100,
  "confidence": 0-1,
  "verdict": "recommend" 或 "not_recommend",
  "pros": ["优势1", "优势2"],
  "cons": ["风险1", "风险2"]
}
```

### 问题

1. **score 定义模糊**：0-100 代表什么？简历价值？商业价值？技术难度？AI 每次理解不同
2. **confidence 不可靠**：详见 [[01 产品设计演化]]
3. **输出字段太少**：只有分数和优缺点，无法指导用户行动
4. **没有分类标准**：AI 对"什么算高分"没有共识

### 教训

**Prompt 的字段定义必须具体到无歧义**。"评估可行性"是一个模糊指令，不同 AI 会给出不同解读。

## Prompt V2：六维评分（v0.3 - v0.5）

### 设计变更

将单一 `score` 拆分为六个维度，并为每个维度给出明确的评分标准：

```
评分标准：
- resume：对求职/简历的加分程度
- learning：能学到多少新技术/架构知识
- business：能否变现/有市场需求
- difficulty：难度越高分数越高，100=极难
- innovation：新颖程度，是否已有成熟竞品
- recommendation：综合推荐程度
```

### 解决的问题

1. **维度明确**：每个分数有独立含义，不会混淆
2. **用户画像覆盖**：求职者看 resume，学习者看 learning，创业者看 business
3. **verdict 有据可依**：`recommendation.score >= 60 为 recommend`

### 新增的问题

1. **分数没有参考系**：resume = 75 分是高还是低？
2. **输出内容仍然单薄**：用户需要更多行动建议

## Prompt V3：增加 Benchmark + 同类项目（v0.5 - v0.8）

### 设计变更

新增字段：

```json
{
  "similar_projects": [
    { "name": "竞品名", "description": "一句话介绍", "similarity": 0-100, "whySuccess": "成功原因" }
  ],
  "benchmark": { "average": 0-100, "percentile": "Top X%" },
  "category": "从以下选择最匹配的一个：ai_resume, ai_writing, ai_chatbot, ..."
}
```

### 为什么增加 category

**问题**：不同类别的项目有不同的"正常分数范围"。一个 AI Agent 项目 recommendation = 75 可能是 Top 30%，但一个社交项目 75 分可能是 Top 10%。

**解决方案**：引入 `category` 字段，让 AI 将项目归入 15 个类别之一，然后用该类别的基准数据计算百分位。

**关键设计**：category 由 AI 分类，但 Benchmark 计算用真实数据（benchmark.json），不信任 AI 给出的百分位。这是一个重要的"AI 决策 + 规则校验"的混合模式。

### 为什么增加 similar_projects

**问题**：用户评估一个项目时，最常见的追问是"有没有类似的？"

**设计约束**：
```
similar_projects：必须是真实存在的项目，不要编造
```

这个约束在实践中有效但不完美——AI 仍然可能编造看似合理但不存在的项目。未来可能需要接入搜索 API 做验证。

### 为什么用 benchmark 覆盖 AI 的输出

**关键决策**：在 `callDeepSeek` 函数中，AI 返回 benchmark 后，代码会**用真实数据覆盖它**：

```javascript
// cloud/evaluate/index.js:320-325
const category = result.category || 'default'
const recScore = result.scores?.recommendation?.score
if (typeof recScore === 'number') {
  result.benchmark = calculateBenchmark(recScore, category)
}
```

**为什么**：AI 给出的 benchmark 数据（如 "Top 25%"）是猜测的，而 `calculateBenchmark` 基于真实的 benchmark.json 计算。这是一个"不信任 AI 的自我评估，用外部数据验证"的设计原则。

## Prompt V4：增加面试题 + STAR 简历（v0.8）

### 设计变更

新增两个大模块：

**面试题模块**：
```json
{
  "interview_questions": [
    {
      "question": "面试官可能问的问题",
      "answer": "标准回答，100字以内，必须包含具体数据或技术细节",
      "follow_up": "面试官的追问，20字以内",
      "difficulty": 3,
      "keywords": ["关键词1", "关键词2"],
      "category": "架构设计 或 Prompt工程 或 性能优化 或 容错设计 或 技术选型"
    }
  ]
}
```

**STAR 简历模块**：
```json
{
  "resume_star": {
    "situation": "项目背景，30字以内",
    "task": "你的任务，20字以内",
    "action": "你做了什么，必须包含具体技术方案，30字以内",
    "result": "成果，必须包含量化数据，如提升XX%、支持XX+、降低XX%，20字以内",
    "resumeText": "可直接写入简历的描述，80-120字，必须包含量化成果"
  }
}
```

### 为什么增加面试题

**用户洞察**：做项目的人中，超过 60% 是为了求职。面试官一定会问"你做了什么项目？怎么做的？"

**设计思路**：不只是给用户一个问题列表，而是给**完整的面试准备材料**：
- `answer`：像真实校招回答一样，有具体技术细节
- `follow_up`：面试官会追问的更深层问题
- `difficulty`：让用户知道哪些问题需要重点准备
- `keywords`：帮助用户快速定位技术要点
- `category`：分类便于针对性准备

### 为什么增加 STAR 简历

**用户洞察**：很多人不会用 STAR 格式写简历。他们写的是"负责开发了 XX 系统"，而不是"在 XX 背景下，通过 XX 技术方案，实现了 XX 成果"。

**Prompt 设计技巧**：
```
action 必须包含具体技术方案，禁止"负责开发"、"实现功能"这种空话
result 必须包含量化数据，例如"累计评估 100+ 项目"、"平均响应时间 15 秒"
```

通过**负面示例**（禁止什么）+ **正面示例**（应该怎样），显著提高了输出质量。

### answer 的示例格式设计

这是 Prompt V4 中最精妙的设计之一：

```
answer 示例格式："选择 DeepSeek 主要基于三点：第一，API 单价仅为 GPT-4o 的约 1/10，
适合个人项目控制成本；第二，中文场景下 F1 评分接近；第三，支持 response_format=json_object，
输出稳定性高。"
```

**为什么给示例而不是只说"要有具体数据"？**

因为"具体数据"对 AI 来说是一个模糊概念。给一个示例，AI 会自动模仿这个格式：分点论述 + 数据支撑 + 技术术语。这比任何抽象指令都有效。

## Prompt V5：增加开发周期拆解（v1.0）

### 设计变更

```json
{
  "development_breakdown": [
    { "task": "需求分析", "days": 1 },
    { "task": "具体任务", "days": 2 }
  ],
  "estimated_dev_time": "1-3天 或 3-7天 或 1-2周 或 2-4周 或 1个月+"
}
```

### 为什么增加 development_breakdown

**问题**：`estimated_dev_time = "1-2周"` 告诉用户要多久，但没有告诉他**时间花在哪里**。

**设计思路**：把工期拆成 5-8 个具体任务，每个任务有明确的天数。这样用户可以：
1. 知道整体工期的构成
2. 识别哪些任务最耗时
3. 砍掉某些任务来缩短工期（MVP 思维）

**约束设计**：
```
development_breakdown：5-8个具体任务，days总和应与estimated_dev_time匹配
```

这个约束防止 AI 给出"1-2 周"的总工期，但 breakdown 加起来只有 3 天。

## Prompt V6：最终版本（v1.5）

### 最终版本的关键设计总结

**1. 分层路由策略**（`getSystemPrompt` 函数）

根据输入类型选择不同的 intro：
- `github` + repoInfo：强调"基于真实数据评估"
- `github`（无 repoInfo）：通用开源评估
- `description`：综合评估
- `idea`：强调可行性分析

**2. 字段总数：20+**

```
project_name, summary, verdict, one_line_conclusion, estimated_dev_time,
scores (6维), pros, cons, mvp_suggestion, tech_stack, resume_text,
similar_projects, why_success, why_fail, benchmark, roadmap,
interview_questions (5题), resume_star, development_breakdown,
readme_summary, category, github_analysis
```

**3. 约束设计三层**：
1. **格式约束**：`response_format: { type: 'json_object' }`
2. **内容约束**：每个字段的字数限制、格式要求
3. **逻辑约束**：`verdict` 基于 `recommendation.score >= 60` 自动判定

## Prompt 设计原则总结

| 原则 | 说明 | 示例 |
|------|------|------|
| 具体胜过抽象 | 给示例比给规则更有效 | answer 示例格式 |
| 负面约束 | 明确禁止什么 | "禁止空话套话" |
| 外部验证 | 不信任 AI 的自我评估 | Benchmark 用真实数据覆盖 |
| 分层路由 | 不同输入用不同 Prompt | github / description / idea |
| 字段字数限制 | 防止 AI 输出过长 | "20字以内"、"100字以内" |
| 逻辑约束 | 用规则而非 AI 判断 | verdict = score >= 60 |

## 面试官可能追问

1. "Prompt 的 temperature 为什么是 0.3？"
2. "如果 AI 没有输出 JSON 格式怎么办？"
3. "20+ 个字段的 Prompt 会不会太长？"
4. "怎么保证 AI 不编造 similar_projects？"
5. "Prompt 的版本管理怎么做？"

## 标准回答

> **Q：20+ 个字段的 Prompt 会不会太长？**
>
> 会，这是当前架构的一个权衡。Prompt 约 2000 字（中文），加上用户输入和 GitHub 数据，单次请求的 input token 约 3000-5000。DeepSeek 的上下文窗口是 32K，所以远未触及上限。但更长的 Prompt 意味着：1）更高的 token 费用；2）AI 更容易遗漏某些字段；3）输出更不稳定。目前的缓解策略是：字段字数限制（减少 output token）、response_format 强制 JSON（减少格式错误）、parser 容错（兜底处理）。未来如果要增加更多字段，可能需要拆分为多次调用。

---

**相关文档**：
- [[01 产品设计演化]] - 功能如何驱动 Prompt 变化
- [[05 Benchmark Engine设计]] - Benchmark 如何覆盖 AI 输出
- [[06 GitHub分析模块]] - GitHub 数据如何注入 Prompt
- [[03 Claude协作开发记录]] - Claude 在 Prompt 工程中的角色
- [[Assets/Prompt版本演化]] - Prompt 版本对比可视化

# Prompt 版本演化

> 从 V1 到 V6 的完整版本对比

---

## 版本总览

| 版本 | 时间 | 字段数 | 核心变更 | 解决的问题 |
|------|------|--------|---------|-----------|
| V1 | Week 1 | 6 | 单分评估 | 快速验证概念 |
| V2 | Week 2 | 12 | 六维评分 | 分数维度不足 |
| V3 | Week 3 | 16 | +Benchmark +同类项目 +category | 分数无参考系 |
| V4 | Week 4 | 20+ | +面试题 +STAR简历 +开发周期 | 功能不完整 |
| V5 | Week 5 | 20+ | +development_breakdown +estimated_dev_time | 无行动建议 |
| V6 | Week 6 | 20+ | 优化约束 +示例格式 +字数限制 | 输出质量 |

## V1 → V2 差异

### 新增字段

```diff
 {
   "project_name": "...",
-  "score": 78,
-  "confidence": 0.85,
   "verdict": "recommend",
+  "scores": {
+    "resume":       { "score": 0-100, "reason": "理由" },
+    "learning":     { "score": 0-100, "reason": "理由" },
+    "business":     { "score": 0-100, "reason": "理由" },
+    "difficulty":   { "score": 0-100, "reason": "理由" },
+    "innovation":   { "score": 0-100, "reason": "理由" },
+    "recommendation": { "score": 0-100, "reason": "理由" }
+  },
   "pros": [...],
   "cons": [...]
 }
```

### 变更原因
- 单一 score 无法覆盖不同用户画像的需求
- confidence 不可靠（详见 [[01 产品设计演化]]）
- 每个维度需要独立的 reason 解释

## V2 → V3 差异

### 新增字段

```diff
 {
   ...V2 所有字段...,
+  "similar_projects": [
+    { "name": "竞品名", "description": "介绍", "similarity": 85, "whySuccess": "原因" }
+  ],
+  "benchmark": { "average": 65, "percentile": "Top 30%" },
+  "category": "agent",
+  "mvp_suggestion": ["建议1", "建议2"],
+  "tech_stack": ["React", "Node.js"],
+  "resume_text": "简历描述",
+  "why_success": ["原因1"],
+  "why_fail": ["原因1"]
 }
```

### 变更原因
- similar_projects：用户最常问"有没有类似的？"
- benchmark：分数没有参考系（75 分是高还是低？）
- category：不同类别有不同的"正常分数范围"
- mvp_suggestion：用户需要行动建议
- tech_stack：技术选型参考
- resume_text：简历写法参考

## V3 → V4 差异

### 新增字段

```diff
 {
   ...V3 所有字段...,
+  "interview_questions": [
+    {
+      "question": "面试问题",
+      "answer": "标准回答",
+      "follow_up": "追问",
+      "difficulty": 3,
+      "keywords": ["关键词"],
+      "category": "架构设计"
+    }
+  ],
+  "resume_star": {
+    "situation": "背景",
+    "task": "任务",
+    "action": "行动",
+    "result": "成果",
+    "resumeText": "完整简历描述"
+  }
 }
```

### 变更原因
- interview_questions：做项目的人中 60%+ 是为了求职
- resume_star：很多人不会用 STAR 格式写简历
- answer 的示例格式：比"要有具体数据"更有效

## V4 → V5 差异

### 新增字段

```diff
 {
   ...V4 所有字段...,
+  "estimated_dev_time": "1-2周",
+  "development_breakdown": [
+    { "task": "需求分析", "days": 1 },
+    { "task": "前端开发", "days": 3 }
+  ],
+  "readme_summary": "README 核心内容",
+  "one_line_conclusion": "一句话结论"
 }
```

### 变更原因
- estimated_dev_time：用户需要知道"做这个要多久"
- development_breakdown：把工期拆成具体任务，便于 MVP 规划
- readme_summary：GitHub 项目的 README 摘要
- one_line_conclusion：快速决策用的一句话结论

## V5 → V6 差异

### 约束优化

```diff
 "interview_questions": [
   {
     "question": "...",
-    "answer": "标准回答",
+    "answer": "标准回答，100字以内，必须包含具体数据或技术细节",
+    // 新增示例格式
     "follow_up": "追问，20字以内",
     "difficulty": 3,
     "keywords": ["关键词"],
     "category": "架构设计 或 Prompt工程 或 性能优化 或 容错设计 或 技术选型"
   }
 ]

 "resume_star": {
-  "action": "你做了什么",
+  "action": "你做了什么，必须包含具体技术方案，30字以内",
+  // 新增: "禁止'负责开发'、'实现功能'这种空话"
-  "result": "成果",
+  "result": "成果，必须包含量化数据，如提升XX%、支持XX+、降低XX%，20字以内"
 }
```

### 变更原因
- 字数限制：防止 AI 输出过长，减少 token 消耗
- 负面约束：明确禁止空话，提高输出质量
- 示例格式：给 AI 一个高质量示例，比抽象规则更有效
- 分类枚举：明确列出 5 个面试题类别，防止 AI 自由发挥

## 关键设计模式

### 模式 1：字段逐步增加
每次版本升级只增加 2-4 个字段，避免一次性增加太多导致 AI 输出不稳定。

### 模式 2：约束逐步收紧
先加字段（V3-V5），再加约束（V6）。因为没有约束时先观察 AI 的"自然输出"，再针对性地加约束。

### 模式 3：示例替代规则
V6 的关键改进是用示例格式替代抽象规则。"answer 示例格式：'选择 DeepSeek 主要基于三点……'" 比 "answer 要有具体数据" 有效 10 倍。

---

**相关文档**：
- [[04 Prompt工程]] - Prompt 设计的详细分析
- [[01 产品设计演化]] - 功能如何驱动 Prompt 变化
- [[03 Claude协作开发记录]] - Claude 在 Prompt 工程中的角色

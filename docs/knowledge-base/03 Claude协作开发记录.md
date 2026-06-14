# Claude 协作开发记录

> Claude 在 Project Judge 中承担的 5 个角色、被采纳和被否决的建议

---

## 背景

Project Judge 的整个开发过程由 **人 + Claude** 协作完成。Claude 不是简单的"代码生成器"，而是在不同阶段承担了不同的专业角色。本文记录了每个角色的具体职责、关键贡献、被采纳的建议以及被否决的建议。

## 角色一：架构师

### 职责
- 设计整体技术架构
- 选择技术栈
- 设计数据流
- 评估架构方案的可行性

### 关键贡献

**1. 推动从"前端直调"切换到"云函数中转"**

当项目还在 v0.1 阶段（前端直接 fetch DeepSeek API）时，Claude 指出了 API Key 暴露的安全风险，并给出了完整的迁移方案：

```
建议：将 DeepSeek API 调用移到微信云函数
原因：小程序代码打包下发到用户手机，API Key 可被提取
方案：wx.cloud.callFunction → 云函数 → DeepSeek API
```

这个建议被**立即采纳**，成为 v0.3 的核心变更。详见 [[02 架构设计]]。

**2. 设计双层类型系统（AIResponse vs EvaluationResult）**

Claude 建议将 AI 返回的 snake_case 格式与前端使用的 camelCase 格式分离，中间通过 parser.ts 做转换和容错。

被采纳原因：
- AI 输出风格不可控，snake_case 更稳定
- 前端 TypeScript 生态惯例是 camelCase
- 中间层可以统一处理异常

**3. 设计 Parser 容错体系**

Claude 提出了"每个字段一个解析函数"的设计模式，而非一个大的 try-catch。

被采纳原因：
- 单字段失败不影响其他字段
- 每个解析函数可以有独立的 fallback 逻辑
- 便于定位问题（哪个字段解析失败了？）

### 被否决的建议

**1. 引入 Redux 做全局状态管理**

Claude 建议使用 Redux Toolkit 管理评估状态、历史记录等全局数据。

被否决原因：
- 项目规模小（5 个页面），Redux 的 boilerplate 成本高于收益
- `useEvaluate` Hook + `wx.setStorageSync` 已经够用
- 过度工程（over-engineering）

**2. 使用 Zod 做运行时类型校验**

Claude 建议引入 Zod 库来替代手写的 parser 函数。

被否决原因：
- 云函数环境对 npm 包大小敏感
- 手写 parser 虽然繁琐，但逻辑完全可控
- 增加一个依赖 = 增加一个潜在的兼容性问题

## 角色二：产品经理

### 职责
- 定义功能需求
- 设计用户交互流程
- 评估功能优先级
- 推动产品方向调整

### 关键贡献

**1. 推动删除 confidence 字段**

Claude 分析了 confidence 字段的实际表现后，建议删除：

```
分析：AI 的 confidence 值在相同输入下波动超过 20%
建议：删除 confidence，用 Benchmark 百分位替代
理由：外部数据验证 > AI 自我评估
```

这个建议最初被犹豫（"用户可能想知道 AI 有多确定"），但最终被采纳。详见 [[01 产品设计演化]]。

**2. 设计 Benchmark 引擎**

Claude 提出了"用类别基准数据给分数加参考系"的方案：
- 15 个项目类别
- 每个类别 4 个百分位阈值
- AI 输出 recommendation.score 后，自动计算百分位

详见 [[05 Benchmark Engine设计]]。

**3. 设计输入类型自动检测**

Claude 建议在前端自动识别用户输入类型：
- GitHub URL → `type: 'github'`
- 长文本（>100 字）→ `type: 'description'`
- 短文本 → `type: 'idea'`

无需用户手动选择类型，降低认知负担。

### 被否决的建议

**1. 增加"项目打分历史趋势"功能**

Claude 建议记录同一项目多次评估的分数变化，展示趋势图。

被否决原因：
- 本地存储上限 30 条，数据量不足以支撑趋势分析
- 用户场景不匹配：评估一个项目通常只做一次
- ROI 低，开发成本高

**2. 增加"AI 对话追问"功能**

Claude 建议在评估结果页面增加对话功能，让用户可以针对结果追问。

被否决原因：
- 会显著增加 DeepSeek API 调用成本
- 对话状态管理复杂（需要上下文传递）
- MVP 阶段，先验证核心价值

## 角色三：Prompt 工程师

### 职责
- 设计 Prompt 模板
- 优化输出格式
- 调试 AI 输出质量
- 迭代 Prompt 版本

### 关键贡献

**1. 设计分层路由 Prompt 策略**

Claude 设计了 3 套 Prompt 模板，根据输入类型选择：
- `github` + repoInfo：注入真实仓库数据，要求基于事实评估
- `github`（无 repoInfo）：通用开源项目评估
- `description`：评估详细描述
- `idea`：评估一句话想法

这个设计的精妙之处在于：**同一个 AI 角色，根据信息量不同，给出不同深度的评估**。

详见 [[04 Prompt工程]]。

**2. 设计强制 JSON 输出策略**

Claude 建议同时使用两种约束：
1. `response_format: { type: 'json_object' }`（DeepSeek 原生支持）
2. Prompt 中给出完整的 JSON Schema 示例

双保险策略：即使 AI 在文本中夹杂了非 JSON 内容，`response_format` 也会强制输出合法 JSON。

**3. 设计面试题答案的质量约束**

Claude 在 Prompt 中加入了具体的质量要求：

```
answer 示例格式："选择 DeepSeek 主要基于三点：第一，API 单价仅为 GPT-4o 的约 1/10，
适合个人项目控制成本；第二，中文场景下 F1 评分接近；第三，支持 response_format=json_object，
输出稳定性高。"
```

通过给出示例格式，而非只说"要有具体数据"，显著提高了 AI 输出质量。

## 角色四：Code Reviewer

### 职责
- 审查代码质量
- 发现潜在 bug
- 建议代码优化
- 确保类型安全

### 关键贡献

**1. 发现 extractJson 的边界问题**

Claude 在 review 中指出，早期版本的 `extractJson` 函数只处理了 ```` ```json ``` ```` 包裹的情况，没有处理 AI 直接输出纯 JSON 或在 JSON 前后夹杂文本的情况。修正后增加了 `indexOf('{')` / `lastIndexOf('}')` 的 fallback 策略。

**2. 发现 Benchmark 计算的时序问题**

Claude 指出，Benchmark 计算必须在 AI 返回结果之后、返回给前端之前执行。如果放在前端做，用户可以篡改 Benchmark 数据。当前实现是正确的：在 `callDeepSeek` 函数内部，AI 返回后立即用 `calculateBenchmark` 覆盖。

**3. 发现 dead code**

`cloud/evaluate/index.js` 第 24 行有一个永远不会执行的 `return` 语句（第 23 行已经 return）。这是一个典型的复制粘贴遗留问题。

### 被否决的建议

**1. 将云函数拆分为多个文件**

Claude 建议将 `index.js` 拆分为：
- `github.js`（GitHub API 调用）
- `prompt.js`（Prompt 模板）
- `benchmark.js`（Benchmark 计算）
- `index.js`（入口）

被否决原因：
- 云函数打包时会合并所有文件，拆分只影响开发体验
- 当前 `index.js` 约 360 行，仍在可维护范围内
- 拆分后需要处理模块导入，增加复杂度

## 角色五：QA 测试

### 职责
- 设计测试用例
- 编写契约测试
- 模拟异常输入
- 验证容错逻辑

### 关键贡献

**1. 设计四层契约测试**

Claude 设计了 4 个测试场景，覆盖了 AI 输出的所有可能情况：

| 场景 | 输入 | 预期行为 |
|------|------|---------|
| 正常响应 | 完整 JSON，所有字段合法 | 正常解析，所有字段有值 |
| 缺失字段 | 只有 `project_name` | `fillDefaultValues` 补全所有缺失字段 |
| 非法分数 | score = 999, -30, "abc", null | `clampScore` 将非法值转为 0-100 |
| 完全乱码 | `{abc: 123, xyz: true}` | 不崩溃，返回默认值 |

**2. 设计中文时间字符串的边界测试**

Claude 发现 `normalizeEstimatedDevTime` 需要处理中文时间格式：
- "1-3天" → '1-3天'
- "大约两周" → '1-2周'
- "一个月左右" → '1个月+'
- "7天" → '3-7天'

测试覆盖了各种中文表达方式，确保解析器不会因为 AI 输出格式的微小变化而崩溃。

## 协作模式总结

| 角色 | 被采纳建议数 | 被否决建议数 | 关键洞察 |
|------|-------------|-------------|---------|
| 架构师 | 3 | 2 | 安全相关的建议被优先采纳 |
| 产品经理 | 3 | 2 | 用户价值高的建议被采纳，锦上添花的被否决 |
| Prompt 工程师 | 3 | 0 | Prompt 相关建议全部采纳 |
| Code Reviewer | 3 | 1 | bug 修复建议全部采纳，代码组织建议看情况 |
| QA 测试 | 2 | 0 | 测试设计建议全部采纳 |

**总体规律**：
1. 涉及安全、稳定性的建议，采纳率接近 100%
2. 涉及"是否要加新依赖/新功能"的建议，采纳率约 50%
3. Claude 的 Prompt 工程建议质量最高，可能因为这是 LLM 最擅长的领域

## 面试官可能追问

1. "Claude 的建议有没有导致过问题？"
2. "你怎么判断 Claude 的建议是否应该采纳？"
3. "人和 Claude 的分工是怎么决定的？"
4. "如果 Claude 给了错误的建议怎么办？"

## 标准回答

> **Q：你怎么判断 Claude 的建议是否应该采纳？**
>
> 三个判断标准：第一，安全性建议无条件采纳（如 API Key 暴露），因为安全问题的修复成本远高于预防成本；第二，功能建议看 ROI——如果开发成本 < 1 天且用户价值明确，就采纳；如果需要引入新依赖或重构架构，就谨慎评估；第三，Prompt 建议直接在 DeepSeek 上实验验证，用数据说话而非用直觉判断。

---

**相关文档**：
- [[00 项目总览]] - 项目全局视图
- [[02 架构设计]] - Claude 推动的架构决策
- [[04 Prompt工程]] - Claude 的 Prompt 工程贡献
- [[11 工程踩坑记录]] - Claude 发现的工程问题

# Benchmark Engine 设计

> 用真实基准数据让 AI 评分有参考系

---

## 背景

Benchmark Engine 是 Project Judge 中**唯一不依赖 AI 的核心模块**。它的存在解决了一个根本问题：AI 给出的分数没有参考系。resume = 75 分，是高还是低？比平均好多少？在同类项目中排第几？

## 设计目标

1. 让每个 recommendation.score 都有对应的百分位排名
2. 不同项目类别有不同的基准线（AI Agent 和 Game 的"正常分数"完全不同）
3. 基准数据由人工维护，不依赖 AI 输出
4. 版本化管理，每季度更新

## 实现细节

### 数据结构

**文件**：`cloud/evaluate/benchmark.json`

```json
{
  "ai_resume":      { "avg": 68, "top30": 75, "top20": 82, "top10": 88 },
  "agent":          { "avg": 75, "top30": 82, "top20": 88, "top10": 92 },
  "game":           { "avg": 52, "top30": 60, "top20": 68, "top10": 76 },
  "default":        { "avg": 65, "top30": 73, "top20": 80, "top10": 86 },
  // ... 共 15 个类别 + 1 个默认
}
```

每个类别有 4 个阈值：
- `avg`：平均水平（Top 50% 的分界线）
- `top30`：Top 30% 的分界线
- `top20`：Top 20% 的分界线
- `top10`：Top 10% 的分界线

### 15 个项目类别

| 类别 | avg | top30 | top20 | top10 | 设计理由 |
|------|-----|-------|-------|-------|---------|
| agent | 75 | 82 | 88 | 92 | 2026 年热门赛道，基准最高 |
| ai_assistant | 70 | 78 | 84 | 90 | 成熟赛道，竞争激烈 |
| rag | 72 | 79 | 85 | 90 | 技术门槛高，基准较高 |
| dev_tool | 73 | 80 | 86 | 91 | 开发者工具价值稳定 |
| ai_resume | 68 | 75 | 82 | 88 | 垂直场景，基准中高 |
| automation | 69 | 76 | 82 | 88 | 实用性强 |
| open_source_tool | 70 | 77 | 83 | 89 | 社区价值稳定 |
| data_analysis | 67 | 74 | 81 | 87 | 技术含量中高 |
| ai_writing | 65 | 73 | 80 | 87 | 赛道成熟 |
| saas_tool | 66 | 74 | 81 | 87 | 商业价值中高 |
| ai_chatbot | 62 | 70 | 78 | 85 | 同质化严重 |
| education | 60 | 68 | 75 | 82 | 市场需求稳定 |
| ecommerce | 58 | 66 | 73 | 80 | 竞争激烈，创新难 |
| social | 55 | 63 | 70 | 78 | 成功率低 |
| game | 52 | 60 | 68 | 76 | 开发周期长，基准最低 |

### 计算逻辑

**文件**：`cloud/evaluate/index.js:15-25`

```javascript
function calculateBenchmark(score, category) {
  const data = benchmarkData[category] || benchmarkData['default']
  let percentile = 'Top 50%'
  if (score >= data.top10) percentile = 'Top 10%'
  else if (score >= data.top20) percentile = 'Top 20%'
  else if (score >= data.top30) percentile = 'Top 30%'
  else if (score >= data.avg) percentile = 'Top 50%'
  else percentile = 'Bottom 50%'
  return { average: data.avg, percentile, version: '2026Q2' }
}
```

**关键设计决策**：

1. **AI 分类 + 规则计算**：category 由 AI 判断，但百分位计算完全由规则引擎完成。不信任 AI 给出的百分位数字。
2. **5 档百分位**：Top 10% / Top 20% / Top 30% / Top 50% / Bottom 50%。比连续百分位更直观，用户不需要精确数字。
3. **版本标记**：`version: '2026Q2'`。基准数据会过时，版本标记让用户知道数据的新旧。

### 覆盖时机

**关键**：Benchmark 计算发生在 `callDeepSeek` 函数内部，AI 返回结果之后、返回给前端之前。

```javascript
// cloud/evaluate/index.js:320-325
const category = result.category || 'default'
const recScore = result.scores?.recommendation?.score
if (typeof recScore === 'number') {
  result.benchmark = calculateBenchmark(recScore, category)
}
```

这意味着：**AI 返回的 benchmark 字段会被真实数据覆盖**。即使 AI 编造了 `{"percentile": "Top 5%"}`，最终返回给前端的也是基于真实阈值计算的结果。

## 备选方案

### 方案 A：完全由 AI 计算百分位

- 优点：零维护成本
- 缺点：AI 没有真实数据，给出的百分位是猜测
- 结论：不可靠

### 方案 B：接入外部 API（如 GitHub Trending 数据）

- 优点：数据实时更新
- 缺点：增加外部依赖、API 调用成本、数据格式不一致
- 结论：过度工程

### 方案 C：静态 JSON 文件 + 人工维护（最终方案）

- 优点：零运行时依赖、数据完全可控、更新成本低
- 缺点：数据会过时，需要定期人工更新
- 结论：**最优选择**。对一个 MVP 产品来说，季度级更新足够。

## 已知问题

### Dead Code

`cloud/evaluate/index.js` 第 24 行有一个永远不会执行的 return：

```javascript
return { average: data.avg, percentile, version: '2026Q2' }  // 第 23 行
return { average: data.avg, percentile }                       // 第 24 行 ← dead code
```

这是复制粘贴遗留。第 23 行已经 return 了完整对象（含 version），第 24 行永远执行不到。

### 基准数据的来源

当前 benchmark.json 的数据**并非来自真实统计**，而是基于行业经验和常识设定的估计值。例如：
- `agent` 类别的 `avg: 75` 是因为 2026 年 AI Agent 是热门赛道，整体质量较高
- `game` 类别的 `avg: 52` 是因为游戏开发周期长、成功率低

**未来改进方向**：接入真实数据源（如 GitHub Star 分布、Product Hunt 评分分布）来校准基准值。

## 优缺点分析

| 优点 | 缺点 |
|------|------|
| 让分数有了参考系，用户不再困惑"75 分是什么水平" | 基准数据是估计值，非真实统计 |
| 人工维护，数据完全可控 | 需要定期更新，否则过时 |
| 零运行时依赖（纯 JSON 文件） | 只有 recommendation 一个维度有 Benchmark |
| 版本化管理，用户知道数据新旧 | 类别分类依赖 AI，可能分错 |

## 面试官可能追问

1. "为什么只对 recommendation 做 Benchmark，其他维度不做？"
2. "基准数据怎么保证准确性？"
3. "如果 AI 把项目分到错误的类别怎么办？"
4. "百分位的阈值是怎么设定的？"

## 标准回答

> **Q：为什么只对 recommendation 做 Benchmark，其他维度不做？**
>
> 两个原因。第一，recommendation 是综合维度，它已经隐含了其他维度的信息——一个 resume=90 但 business=20 的项目，recommendation 不会太高。给 recommendation 做 Benchmark 就够用户做决策了。第二，如果对 6 个维度都做 Benchmark，基准数据量会从 15×4=60 个值膨胀到 15×4×6=360 个值，维护成本显著增加。这是一个 MVP 权衡。

---

**相关文档**：
- [[00 项目总览]] - 项目全局视图
- [[01 产品设计演化]] - 为什么增加 Benchmark
- [[04 Prompt工程]] - category 字段如何配合 Benchmark
- [[Assets/数据流图]] - Benchmark 计算在数据流中的位置

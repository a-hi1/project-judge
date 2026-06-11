# Project Judge

AI 项目评估与选题决策助手。

3 分钟判断一个项目值不值得做。

## 功能

- **AI 项目评估**：输入项目想法/GitHub 链接/产品描述，AI 输出多维度评估报告
- **五维评分**：简历价值、学习价值、商业潜力、开发难度、创新度，每项带评分理由
- **GitHub 深度分析**：自动读取 README、package.json，分析活跃度/社区/影响力/维护风险
- **Benchmark 引擎**：15 个分类基准数据，真实百分位排名
- **同类项目参考**：基于真实市场数据，展示 3 个相似竞品及成功/失败原因
- **面试辅导**：5 个面试问题 + 参考答案 + 追问 + 难度星级 + 关键词标签
- **STAR 简历**：自动生成 Situation-Task-Action-Result 格式简历描述
- **开发周期拆解**：规则引擎 + AI 修正，输出具体任务+天数
- **批量对比评估**：同时评估 5 个项目，按推荐指数排序
- **分享海报**：1080px 高清长图，包含完整评估报告

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Taro 4 + React 18 + TypeScript |
| 样式 | TailwindCSS 3 |
| 后端 | 微信云函数（Node.js） |
| AI | DeepSeek API |
| 存储 | wx.setStorageSync（本地） |

## 项目结构

```
project-judge/
├── cloud/evaluate/          # 云函数
│   ├── index.js             # DeepSeek 调用 + GitHub API
│   └── benchmark.json       # 15 分类基准数据
├── src/
│   ├── pages/
│   │   ├── home/            # 首页：输入 + 评估
│   │   ├── result/          # 结果页：完整评估报告
│   │   ├── history/         # 历史记录
│   │   ├── compare/         # 批量对比
│   │   └── settings/        # 设置
│   ├── services/
│   │   ├── ai.ts            # 云函数调用封装
│   │   └── parser.ts        # AI 响应解析（11 个容错函数）
│   ├── hooks/
│   │   └── useEvaluate.ts   # 评估状态机
│   ├── components/
│   │   └── ScoreBar.tsx     # 评分进度条
│   ├── utils/
│   │   ├── theme.ts         # 设计系统（颜色/间距/字号/圆角）
│   │   ├── score.ts         # 颜色映射
│   │   ├── input.ts         # 输入类型识别
│   │   ├── effort.ts        # 开发周期规则引擎
│   │   └── poster.ts        # 海报生成
│   ├── storage/
│   │   └── index.ts         # 本地存储（30 条上限）
│   └── types/
│       └── index.ts         # TypeScript 接口定义
└── config/
    └── index.ts             # Taro 构建配置
```

## 部署

### 1. 安装依赖

```bash
npm install
```

### 2. 编译

```bash
npx taro build --type weapp
```

### 3. 云函数部署

1. 微信开发者工具导入 `dist` 目录
2. 开通云开发
3. 右键 `cloud/evaluate` → 上传并部署：云端安装
4. 云函数环境变量添加 `DEEPSEEK_API_KEY`

### 4. 预览

微信开发者工具顶部 → 预览 → 手机扫码

## 设计系统

| Token | 值 | 用途 |
|-------|------|------|
| `C.bg` | `#0A0A0A` | 页面背景 |
| `C.card` | `#111111` | 卡片背景 |
| `C.primary` | `#3B82F6` | 品牌蓝 |
| `C.success` | `#22C55E` | 推荐/成功 |
| `C.danger` | `#EF4444` | 不推荐/风险 |
| `S.page` | `24rpx` | 页面边距 |
| `S.card` | `32rpx` | 卡片内边距 |
| `R.lg` | `16rpx` | 卡片圆角 |

## License

MIT

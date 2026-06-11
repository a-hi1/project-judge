import type { EvaluationResult } from '../types'
import { getScoreColor, getVerdictLabel } from './score'
import Taro from '@tarojs/taro'

// ─── 设计常量 ───────────────────────
const W = 1080
const PAD = 80
const FONT = 'sans-serif'
const C = {
  bg: '#0A0A0A',
  card: '#111111',
  border: '#1F1F1F',
  text: '#EDEDEF',
  muted: '#8A8A8E',
  faint: '#4A4A4E',
  primary: '#3B82F6',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#EAB308',
}

// ─── 绘制工具 ───────────────────────
function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
  ctx.lineTo(x + w, y + h - r)
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  ctx.lineTo(x + r, y + h)
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, -Math.PI / 2)
  ctx.closePath()
}

function fillRoundRect(ctx: any, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}

function text(ctx: any, str: string, x: number, y: number, color: string, size: number, weight = 'normal') {
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.fillText(str, x, y)
}

function measureText(ctx: any, str: string, size: number, weight = 'normal') {
  ctx.font = `${weight} ${size}px ${FONT}`
  return ctx.measureText(str).width
}

function wrapText(ctx: any, str: string, x: number, y: number, maxW: number, lineH: number, color: string, size: number, weight = 'normal'): number {
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px ${FONT}`
  let line = ''
  let curY = y
  for (const ch of str) {
    const test = line + ch
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY)
      line = ch
      curY += lineH
    } else {
      line = test
    }
  }
  ctx.fillText(line, x, curY)
  return curY + lineH
}

function divider(ctx: any, y: number) {
  ctx.strokeStyle = C.border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
}

// ─── 预计算高度 ─────────────────────
function calcHeight(r: EvaluationResult): number {
  let h = 100 // 顶部间距
  h += 60     // 标签
  h += 70     // 项目名
  h += 160    // 大分数
  h += 60     // verdict
  h += 80     // 一句话结论
  h += 70     // benchmark
  h += 40     // 分隔
  // 五维评分
  h += 50
  h += 5 * 60
  h += 40
  // 同类项目（最多3个）
  if (r.similarProjects.length > 0) {
    h += 50
    h += r.similarProjects.length * 65
    h += 30
  }
  // 成功关键
  if (r.whySuccess.length > 0) {
    h += 50
    h += Math.min(r.whySuccess.length, 3) * 36
    h += 30
  }
  // MVP + 周期
  h += 60
  h += Math.min(r.mvpSuggestion.length, 3) * 36
  h += 50
  h += 80 // 底部
  return h
}

// ─── 主绘制函数 ─────────────────────
function drawPoster(ctx: any, r: EvaluationResult, H: number) {
  const scoreColor = getScoreColor(r.scores.recommendation.score)
  const verdictColor = r.verdict === 'recommend' ? C.success : C.danger
  const cardW = W - PAD * 2
  let y = PAD

  // 背景
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  // 标签
  fillRoundRect(ctx, PAD, y, 280, 48, 10, C.primary)
  text(ctx, 'PROJECT JUDGE', PAD + 20, y + 33, '#FFF', 24, 'bold')
  y += 70

  // 项目名
  text(ctx, r.projectName, PAD, y + 40, C.text, 44, 'bold')
  y += 70

  // 大分数
  ctx.fillStyle = scoreColor
  ctx.font = `bold 140px ${FONT}`
  ctx.fillText(String(r.scores.recommendation.score), PAD, y + 120)
  ctx.fillStyle = C.faint
  ctx.font = `normal 36px ${FONT}`
  ctx.fillText('/ 100', PAD + measureText(ctx, String(r.scores.recommendation.score), 140, 'bold') + 16, y + 80)
  y += 160

  // Verdict
  text(ctx, `${getVerdictLabel(r.verdict)} ${r.verdict === 'recommend' ? '✓' : '✗'}`, PAD, y + 32, verdictColor, 32, 'bold')
  y += 55

  // 一句话结论
  y = wrapText(ctx, r.oneLineConclusion, PAD, y + 10, cardW, 40, C.text, 28)
  y += 15

  // Benchmark
  const diff = r.scores.recommendation.score - r.benchmark.average
  text(ctx, `高于同类平均 ${diff} 分 · ${r.benchmark.percentile} · 基准 ${r.benchmark.version}`, PAD, y + 24, C.muted, 22)
  y += 50

  divider(ctx, y)
  y += 30

  // 五维评分
  text(ctx, '五维评分', PAD, y + 28, C.text, 30, 'bold')
  y += 50
  const dims = [
    { label: '简历价值', score: r.scores.resume.score, reason: r.scores.resume.reason },
    { label: '学习价值', score: r.scores.learning.score, reason: r.scores.learning.reason },
    { label: '商业潜力', score: r.scores.business.score, reason: r.scores.business.reason },
    { label: '开发难度', score: r.scores.difficulty.score, reason: r.scores.difficulty.reason },
    { label: '创新度',   score: r.scores.innovation.score, reason: r.scores.innovation.reason },
  ]
  for (const d of dims) {
    const dColor = getScoreColor(d.score)
    text(ctx, d.label, PAD, y + 24, C.text, 24)
    text(ctx, String(d.score), W - PAD - 60, y + 24, dColor, 24, 'bold')
    // 进度条
    fillRoundRect(ctx, PAD, y + 34, cardW - 80, 12, 6, '#1A1A1A')
    fillRoundRect(ctx, PAD, y + 34, (cardW - 80) * d.score / 100, 12, 6, dColor)
    text(ctx, d.reason, PAD, y + 64, C.muted, 20)
    y += 60
  }
  y += 20

  // 同类项目
  if (r.similarProjects.length > 0) {
    text(ctx, '同类项目参考', PAD, y + 28, C.text, 30, 'bold')
    y += 50
    for (const p of r.similarProjects) {
      text(ctx, p.name, PAD, y + 24, C.primary, 26, 'bold')
      text(ctx, `${p.similarity}% 相似`, W - PAD - 120, y + 24, C.primary, 22)
      text(ctx, `↑ ${p.whySuccess}`, PAD, y + 54, C.success, 22)
      y += 65
    }
    y += 15
  }

  // 成功关键
  if (r.whySuccess.length > 0) {
    text(ctx, '成功关键', PAD, y + 28, C.text, 30, 'bold')
    y += 50
    for (const s of r.whySuccess.slice(0, 3)) {
      text(ctx, '●', PAD, y + 24, C.success, 22, 'bold')
      text(ctx, s, PAD + 28, y + 24, C.text, 24)
      y += 36
    }
    y += 15
  }

  // MVP + 周期
  divider(ctx, y)
  y += 30
  text(ctx, `MVP 周期：${r.estimatedDevTime}`, PAD, y + 28, C.primary, 28, 'bold')
  y += 45
  for (const s of r.mvpSuggestion.slice(0, 3)) {
    text(ctx, '→', PAD, y + 24, C.muted, 22)
    text(ctx, s, PAD + 28, y + 24, C.text, 24)
    y += 36
  }
  y += 30

  // 底部
  divider(ctx, y)
  y += 30
  text(ctx, 'Powered by DeepSeek · Project Judge', PAD, y + 24, C.faint, 20)
}

// ─── 导出接口 ───────────────────────
export function generatePoster(record: { result: EvaluationResult }): Promise<string> {
  return new Promise((resolve, reject) => {
    const query = Taro.createSelectorQuery()
    query.select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) { reject(new Error('Canvas not found')); return }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = 2
        const H = calcHeight(record.result)

        canvas.width = W * dpr
        canvas.height = H * dpr
        ctx.scale(dpr, dpr)

        drawPoster(ctx, record.result, H)

        Taro.canvasToTempFilePath({
          canvas,
          success: (fileRes) => resolve(fileRes.tempFilePath),
          fail: (err) => reject(err),
        })
      })
  })
}

export function savePoster(record: { result: EvaluationResult }): void {
  Taro.showLoading({ title: '生成海报中...' })
  generatePoster(record)
    .then((filePath) => {
      Taro.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          Taro.hideLoading()
          Taro.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: (err) => {
          Taro.hideLoading()
          if (err?.errMsg?.includes('cancel')) {
            Taro.showToast({ title: '已取消保存', icon: 'none' })
          } else {
            Taro.showToast({ title: '请授权相册权限', icon: 'none' })
          }
        },
      })
    })
    .catch(() => {
      Taro.hideLoading()
      Taro.showToast({ title: '生成失败', icon: 'none' })
    })
}

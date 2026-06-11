// 颜色规则：>=80 绿，>=60 黄，>=40 橙，<40 红
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#EAB308'
  if (score >= 40) return '#F97316'
  return '#EF4444'
}

// 颜色对应的 Tailwind 类名（用于文字）
export function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  if (score >= 40) return 'text-orange'
  return 'text-danger'
}

// 标签文本
export function getVerdictLabel(verdict: string): string {
  return verdict === 'recommend' ? '推荐开发' : '不推荐开发'
}

// 自动识别输入类型
export function detectInputType(content: string): 'github' | 'description' | 'idea' {
  const trimmed = content.trim()

  // GitHub 链接
  if (/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/i.test(trimmed)) return 'github'

  // 超过 100 字视为详细描述
  if (trimmed.length > 100) return 'description'

  // 其他视为 idea
  return 'idea'
}

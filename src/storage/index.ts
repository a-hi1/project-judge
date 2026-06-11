import Taro from '@tarojs/taro'
import type { HistoryRecord } from '../types'

const STORAGE_KEY = 'pj_history'
const MAX_RECORDS = 30

// 类型守卫：校验单条记录结构完整
function isHistoryRecord(item: unknown): item is HistoryRecord {
  if (!item || typeof item !== 'object') return false
  const r = item as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.createdAt === 'number'
  )
}

// 读取历史记录，异常或数据损坏时返回空数组
export function getHistory(): HistoryRecord[] {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY)
    if (!Array.isArray(data)) return []
    return data.filter(isHistoryRecord)
  } catch {
    return []
  }
}

// 读取最近 N 条记录，Home 页预览用
export function getRecentHistory(limit = 3): HistoryRecord[] {
  return getHistory().slice(0, limit)
}

// 保存历史记录，自动淘汰最旧记录，保持最多 MAX_RECORDS 条
export function saveHistory(record: HistoryRecord): void {
  try {
    const list = getHistory()
    list.unshift(record)
    Taro.setStorageSync(STORAGE_KEY, list.slice(0, MAX_RECORDS))
  } catch {
    // 静默失败，不阻塞用户流程
  }
}

// 删除指定记录，返回新数组
export function deleteHistory(id: string): HistoryRecord[] {
  const list = getHistory().filter(r => r.id !== id)
  try {
    Taro.setStorageSync(STORAGE_KEY, list)
  } catch {
    // 静默失败
  }
  return list
}

// 按 ID 查询单条记录，Result 页面用
export function getHistoryById(id: string): HistoryRecord | null {
  return getHistory().find(r => r.id === id) ?? null
}

// 清空全部历史
export function clearHistory(): void {
  try {
    Taro.removeStorageSync(STORAGE_KEY)
  } catch {
    // 静默失败
  }
}

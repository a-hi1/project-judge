import Taro from '@tarojs/taro'
import type { AIResponse } from '../types'

export interface AICallResult {
  success: true
  data: AIResponse
}

export interface AICallError {
  success: false
  error: string
}

export type AIResult = AICallResult | AICallError

// 前端不感知 DeepSeek，只调云函数
export async function evaluateProject(
  content: string,
  type: 'github' | 'idea' | 'description' = 'idea',
): Promise<AIResult> {
  try {
    const res = await Taro.cloud.callFunction({
      name: 'evaluate',
      data: { content, type },
    })

    const result = res.result as AIResult
    return result
  } catch (err: any) {
    const message = err?.message || '网络异常，请重试'
    return { success: false, error: message }
  }
}

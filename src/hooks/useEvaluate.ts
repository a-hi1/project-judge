import { useState } from 'react'
import type { ProjectInput, EvaluationResult, HistoryRecord } from '../types'
import { evaluateProject } from '../services/ai'
import { transformResponse } from '../services/parser'
import { saveHistory } from '../storage'
import { detectInputType } from '../utils/input'

export type EvaluateState = 'idle' | 'loading' | 'success' | 'error'

export function useEvaluate() {
  const [state, setState] = useState<EvaluateState>('idle')
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [error, setError] = useState<string>('')

  // 返回 recordId，不负责跳转
  async function evaluate(input: ProjectInput): Promise<string | null> {
    if (state === 'loading') return null  // 防重复提交

    setState('loading')
    setError('')

    const inputType = detectInputType(input.content)
    const aiResult = await evaluateProject(input.content, inputType)

    if (!aiResult.success) {
      setState('error')
      setError(aiResult.error)
      return null
    }

    try {
      const evaluation = transformResponse(aiResult.data)

      const record: HistoryRecord = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: evaluation.projectName,
        recommendation: evaluation.scores.recommendation.score,
        verdict: evaluation.verdict,
        input,
        result: evaluation,
        createdAt: Date.now(),
      }

      saveHistory(record)
      setResult(evaluation)
      setState('success')

      return record.id
    } catch {
      setState('error')
      setError('结果解析失败，请重试')
      return null
    }
  }

  function reset() {
    setState('idle')
    setResult(null)
    setError('')
  }

  return { state, result, error, evaluate, reset }
}

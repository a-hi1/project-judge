import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { evaluateProject } from '../../services/ai'
import { transformResponse } from '../../services/parser'
import { saveHistory } from '../../storage'
import type { EvaluationResult } from '../../types'
import { getScoreColor, getVerdictLabel } from '../../utils/score'
import { detectInputType } from '../../utils/input'
import { C, S, F, R, cardStyle, dividerStyle } from '../../utils/theme'

type CompareStatus = 'idle' | 'loading' | 'done'
type CompareItem = { evaluation: EvaluationResult; recordId: string }

export default function Compare() {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<CompareStatus>('idle')
  const [items, setItems] = useState<CompareItem[]>([])
  const [failed, setFailed] = useState<string[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  async function handleCompare() {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { Taro.showToast({ title: '请输入至少一个项目', icon: 'none' }); return }
    if (lines.length > 5) { Taro.showToast({ title: '最多对比5个项目', icon: 'none' }); return }

    setStatus('loading')
    setProgress({ done: 0, total: lines.length })
    const collected: CompareItem[] = []
    const failedNames: string[] = []

    for (let i = 0; i < lines.length; i++) {
      setProgress({ done: i, total: lines.length })
      const inputType = detectInputType(lines[i])
      const aiResult = await evaluateProject(lines[i], inputType)
      if (aiResult.success) {
        const evaluation = transformResponse(aiResult.data)
        const recordId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        saveHistory({
          id: recordId,
          title: evaluation.projectName,
          recommendation: evaluation.scores.recommendation.score,
          verdict: evaluation.verdict,
          input: { content: lines[i], type: inputType },
          result: evaluation,
          createdAt: Date.now(),
        })
        collected.push({ evaluation, recordId })
      } else {
        failedNames.push(lines[i].slice(0, 20))
      }
    }

    collected.sort((a, b) => b.evaluation.scores.recommendation.score - a.evaluation.scores.recommendation.score)
    setItems(collected)
    setFailed(failedNames)
    setProgress({ done: lines.length, total: lines.length })
    setStatus('done')

    if (failedNames.length > 0) {
      Taro.showToast({ title: `${failedNames.length} 个项目评估失败`, icon: 'none' })
    }
  }

  function handleReset() {
    setContent(''); setItems([]); setFailed([]); setStatus('idle'); setProgress({ done: 0, total: 0 })
  }

  function handleItemClick(recordId: string) {
    Taro.navigateTo({ url: `/pages/result/index?id=${recordId}` })
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: C.bg, paddingBottom: '80rpx' }}>
      {/* 输入区 */}
      {status === 'idle' && (
        <View style={{ margin: S.page, ...cardStyle }}>
          <Text style={{ color: C.text, ...F.h3, marginBottom: S.xs }}>批量对比评估</Text>
          <Text style={{ color: C.muted, ...F.caption, marginBottom: S.md }}>每行输入一个项目，最多 5 个</Text>
          <Textarea
            className='w-full'
            style={{ color: C.text, backgroundColor: 'transparent', minHeight: '320rpx', ...F.body }}
            placeholder={'AI英语助手\nAI简历助手\nAgent运营系统\nAI记账助手\n项目发现雷达'}
            placeholderClass='text-dark-muted'
            value={content}
            onInput={(e) => setContent(e.detail.value)}
          />
          <View style={dividerStyle} />
          <View style={{ paddingVertical: S.md, backgroundColor: C.primary, borderRadius: R.full, display: 'flex', justifyContent: 'center' }} onClick={handleCompare}>
            <Text style={{ color: '#fff', ...F.body, textAlign: 'center', fontWeight: '500' }}>开始对比</Text>
          </View>
        </View>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <View style={{ margin: S.page, ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingVertical: S.xl }}>
          <View className='loading-spinner' style={{ width: '64rpx', height: '64rpx', borderRadius: '32rpx', borderWidth: '3rpx', borderStyle: 'solid', borderColor: C.border, borderTopColor: C.primary, marginBottom: S.md }} />
          <Text style={{ color: C.text, ...F.body, fontWeight: '500', marginBottom: S.xs }}>AI 正在分析 {progress.done + 1}/{progress.total}</Text>
          <Text style={{ color: C.muted, ...F.caption }}>每个项目约需 15 秒</Text>
        </View>
      )}

      {/* 结果 */}
      {status === 'done' && items.length > 0 && (
        <View>
          {/* 冠军 */}
          <View style={{ margin: S.page, padding: S.xl, backgroundColor: C.card, borderRadius: R.xl, borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.border }}>
            <Text style={{ color: C.faint, ...F.tiny, marginBottom: S.sm }}>最推荐</Text>
            <Text style={{ color: getScoreColor(items[0].evaluation.scores.recommendation.score), ...F.h1, marginBottom: S.sm }}>{items[0].evaluation.projectName}</Text>
            <Text style={{ color: C.text, ...F.body }}>{items[0].evaluation.oneLineConclusion}</Text>
            <Text style={{ color: C.primary, ...F.tiny, marginTop: S.md }} onClick={() => handleItemClick(items[0].recordId)}>查看详情 →</Text>
          </View>

          {/* 对比表 */}
          <View style={{ marginHorizontal: S.page, ...cardStyle }}>
            <Text style={{ color: C.text, ...F.h3, marginBottom: S.md }}>对比结果</Text>
            <Text style={{ color: C.faint, ...F.tiny, marginBottom: S.md }}>点击任意项目查看完整评估</Text>
            {items.map((item, i) => {
              const r = item.evaluation
              const color = getScoreColor(r.scores.recommendation.score)
              const isFirst = i === 0
              return (
                <View key={i} style={{
                  padding: S.md, marginBottom: S.sm,
                  backgroundColor: isFirst ? C.elevated : C.card,
                  borderRadius: R.md,
                  borderWidth: '1rpx', borderStyle: 'solid',
                  borderColor: isFirst ? color + '30' : C.border,
                  display: 'flex', alignItems: 'center',
                }} onClick={() => handleItemClick(item.recordId)}>
                  <View style={{
                    width: '44rpx', height: '44rpx', borderRadius: R.sm,
                    backgroundColor: isFirst ? color + '20' : C.elevated,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: S.md, flexShrink: 0,
                  }}>
                    <Text style={{ color: isFirst ? color : C.muted, ...F.caption, fontWeight: '600' }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, ...F.body, fontWeight: '500' }}>{r.projectName}</Text>
                    <Text style={{ color: C.muted, ...F.tiny, marginTop: '2rpx' }}>{r.estimatedDevTime}</Text>
                  </View>
                  <View style={{ paddingHorizontal: S.md, paddingVertical: S.xs, backgroundColor: color + '12', borderRadius: R.sm }}>
                    <Text style={{ color, ...F.h3 }}>{r.scores.recommendation.score}</Text>
                  </View>
                </View>
              )
            })}
          </View>

          <View style={{ marginHorizontal: S.page, marginTop: S.lg }}>
            <View style={{ paddingVertical: S.md, backgroundColor: C.primary, borderRadius: R.full, display: 'flex', justifyContent: 'center' }} onClick={handleReset}>
              <Text style={{ color: '#fff', ...F.body, textAlign: 'center', fontWeight: '500' }}>重新对比</Text>
            </View>
          </View>
        </View>
      )}

      {/* 失败 */}
      {status === 'done' && items.length === 0 && (
        <View style={{ margin: S.page, ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingVertical: S.xl }}>
          <Text style={{ color: C.text, ...F.body, marginBottom: S.lg }}>评估失败，请重试</Text>
          <View style={{ paddingHorizontal: S.xl, paddingVertical: S.sm, backgroundColor: C.primary, borderRadius: R.full }} onClick={handleReset}>
            <Text style={{ color: '#fff', ...F.body }}>重新输入</Text>
          </View>
        </View>
      )}
    </View>
  )
}

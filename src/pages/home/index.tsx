import { useState, useEffect } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEvaluate } from '../../hooks/useEvaluate'
import { getRecentHistory } from '../../storage'
import { detectInputType } from '../../utils/input'
import { getScoreColor } from '../../utils/score'
import { C, S, F, R, cardStyle, dividerStyle } from '../../utils/theme'
import type { HistoryRecord, ProjectInput } from '../../types'

const MAX_INPUT_LENGTH = 3000

export default function Home() {
  const [content, setContent] = useState('')
  const [recentRecords, setRecentRecords] = useState<HistoryRecord[]>([])
  const { state, error, evaluate } = useEvaluate()

  useEffect(() => { setRecentRecords(getRecentHistory(3)) }, [])
  Taro.useDidShow(() => { setRecentRecords(getRecentHistory(3)) })

  async function handleEvaluate() {
    const trimmed = content.trim()
    if (!trimmed) {
      Taro.showToast({ title: '请输入项目描述', icon: 'none' })
      return
    }
    const input: ProjectInput = { content: trimmed, type: detectInputType(trimmed) }
    const recordId = await evaluate(input)
    if (recordId) {
      Taro.navigateTo({ url: `/pages/result/index?id=${recordId}` })
    }
  }

  useEffect(() => {
    if (state === 'error' && error) {
      Taro.showToast({ title: error, icon: 'none', duration: 3000 })
    }
  }, [state, error])

  const isLoading = state === 'loading'
  const canSubmit = !isLoading && content.trim().length > 0

  return (
    <View style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      {/* ─── Header ─── */}
      <View style={{ paddingTop: '120rpx', paddingBottom: S.xl, paddingLeft: S.page, paddingRight: S.page }}>
        <View style={{
          alignSelf: 'flex-start',
          paddingHorizontal: S.sm,
          paddingVertical: S.xs,
          backgroundColor: C.primary,
          borderRadius: R.sm,
          marginBottom: S.lg,
        }}>
          <Text style={{ color: '#fff', ...F.micro, fontWeight: '600', letterSpacing: '2rpx' }}>PROJECT JUDGE</Text>
        </View>
        <Text style={{ color: C.text, ...F.display }}>3 分钟判断</Text>
        <Text style={{ color: C.text, ...F.display }}>一个项目值不值得做</Text>
        <Text style={{ color: C.muted, ...F.bodySm, marginTop: S.sm }}>
          AI 驱动 · 五维评分 · 同类项目参考
        </Text>
      </View>

      {/* ─── InputCard ─── */}
      <View style={{ marginHorizontal: S.page, ...cardStyle }}>
        <Textarea
          className='w-full'
          style={{ color: C.text, backgroundColor: 'transparent', minHeight: '180rpx', ...F.body }}
          placeholder='输入项目名称、描述或 GitHub 链接...'
          placeholderClass='text-dark-muted'
          maxlength={MAX_INPUT_LENGTH}
          value={content}
          onInput={(e) => setContent(e.detail.value)}
        />
        <View style={dividerStyle} />
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ display: 'flex', alignItems: 'center', gap: S.md }}>
            <Text style={{ color: C.faint, ...F.tiny }}>{content.length} / {MAX_INPUT_LENGTH}</Text>
            {content.length > 0 && (
              <Text style={{ color: C.muted, ...F.tiny }} onClick={() => setContent('')}>清空</Text>
            )}
          </View>
          <View
            style={{
              paddingHorizontal: S.xl,
              paddingVertical: S.sm,
              borderRadius: R.full,
              backgroundColor: canSubmit ? C.primary : C.elevated,
              opacity: canSubmit ? 1 : 0.4,
            }}
            onClick={canSubmit ? handleEvaluate : undefined}
          >
            <Text style={{ color: '#fff', ...F.body, fontWeight: '500' }}>
              {isLoading ? '分析中...' : '开始评估'}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── 快捷入口 ─── */}
      <View style={{ marginHorizontal: S.page, display: 'flex', gap: S.sm, marginBottom: S.lg }}>
        {[
          { label: '批量对比', desc: '多个项目同时评估', url: '/pages/compare/index' },
          { label: '历史记录', desc: '查看过往评估', url: '/pages/history/index' },
        ].map((item) => (
          <View
            key={item.label}
            style={{ flex: 1, ...cardStyle, marginBottom: 0, padding: S.md }}
            onClick={() => Taro.navigateTo({ url: item.url })}
          >
            <Text style={{ color: C.primary, ...F.bodySm, fontWeight: '600' }}>{item.label}</Text>
            <Text style={{ color: C.muted, ...F.tiny, marginTop: S.xs }}>{item.desc}</Text>
          </View>
        ))}
      </View>

      {/* ─── 最近评估 ─── */}
      {recentRecords.length > 0 && (
        <View style={{ marginHorizontal: S.page }}>
          <Text style={{ color: C.muted, ...F.caption, marginBottom: S.sm }}>最近评估</Text>
          {recentRecords.map((record) => {
            const color = getScoreColor(record.recommendation)
            return (
              <View
                key={record.id}
                style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: S.md }}
                onClick={() => Taro.navigateTo({ url: `/pages/result/index?id=${record.id}` })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, ...F.body, fontWeight: '500' }}>{record.title}</Text>
                  <Text style={{ color: C.muted, ...F.tiny, marginTop: S.xs }}>
                    {record.verdict === 'recommend' ? '推荐开发' : '谨慎评估'}
                  </Text>
                </View>
                <View style={{
                  width: '64rpx', height: '64rpx', borderRadius: R.md,
                  backgroundColor: color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color, ...F.score }}>{record.recommendation}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* ─── Footer ─── */}
      <View style={{ marginTop: S.xxl, marginBottom: S.xl, display: 'flex', justifyContent: 'center' }}>
        <Text style={{ color: C.faint, ...F.tiny }}>Powered by DeepSeek · v1.5</Text>
      </View>
    </View>
  )
}

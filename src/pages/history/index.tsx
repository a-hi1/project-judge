import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { getHistory, deleteHistory, clearHistory } from '../../storage'
import type { HistoryRecord } from '../../types'
import { getScoreColor, getVerdictLabel } from '../../utils/score'
import { C, S, F, R, cardStyle } from '../../utils/theme'

type FilterTab = 'all' | 'recommend' | 'not_recommend'

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>(getHistory)
  const [tab, setTab] = useState<FilterTab>('all')

  Taro.useDidShow(() => { setRecords(getHistory()) })

  const filtered = tab === 'all' ? records : records.filter(r => r.verdict === tab)

  function handleDelete(e: any, id: string) {
    e.stopPropagation()
    Taro.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: (res) => { if (res.confirm) setRecords(deleteHistory(id)) },
    })
  }

  function handleClear() {
    Taro.showModal({
      title: '清空全部记录',
      content: '确认清空？',
      success: (res) => { if (res.confirm) { clearHistory(); setRecords([]) } },
    })
  }

  // 空状态
  if (records.length === 0) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.page }}>
        <View style={{ width: '96rpx', height: '96rpx', borderRadius: R.lg, backgroundColor: C.card, borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: S.lg }}>
          <Text style={{ fontSize: '40rpx', opacity: 0.3 }}>📋</Text>
        </View>
        <Text style={{ color: C.text, ...F.h2, marginBottom: S.xs }}>暂无评估记录</Text>
        <Text style={{ color: C.muted, ...F.body, marginBottom: S.xl }}>去首页评估一个项目吧</Text>
        <View style={{ paddingHorizontal: S.xl, paddingVertical: S.sm, backgroundColor: C.primary, borderRadius: R.full }} onClick={() => Taro.reLaunch({ url: '/pages/home/index' })}>
          <Text style={{ color: '#fff', ...F.body }}>去评估</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: C.bg, paddingBottom: '80rpx' }}>
      {/* 顶部 */}
      <View style={{ paddingHorizontal: S.page, paddingTop: S.lg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: C.faint, ...F.caption }}>共 {records.length} 条记录</Text>
        <View style={{ paddingHorizontal: S.sm, paddingVertical: '4rpx', borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.danger + '30', borderRadius: R.sm }} onClick={handleClear}>
          <Text style={{ color: C.danger, ...F.tiny }}>清空</Text>
        </View>
      </View>

      {/* 筛选 Tab */}
      <View style={{ paddingHorizontal: S.page, paddingVertical: S.md, display: 'flex', gap: S.sm }}>
        {(['all', 'recommend', 'not_recommend'] as FilterTab[]).map(t => {
          const isActive = tab === t
          const label = t === 'all' ? '全部' : t === 'recommend' ? '推荐' : '不推荐'
          return (
            <View key={t} style={{
              paddingHorizontal: S.lg, paddingVertical: S.sm, borderRadius: R.full,
              backgroundColor: isActive ? C.primary : 'transparent',
              borderWidth: isActive ? '0' : '1rpx', borderStyle: 'solid', borderColor: C.border,
            }} onClick={() => setTab(t)}>
              <Text style={{ color: isActive ? '#fff' : C.muted, ...F.caption, fontWeight: isActive ? '500' : '400' }}>{label}</Text>
            </View>
          )
        })}
      </View>

      {/* 记录列表 */}
      {filtered.map((record) => {
        const color = getScoreColor(record.recommendation)
        return (
          <View key={record.id} style={{ marginHorizontal: S.page, ...cardStyle, padding: S.md }} onClick={() => Taro.navigateTo({ url: `/pages/result/index?id=${record.id}` })}>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: S.md }}>
                <Text style={{ color: C.text, ...F.body, fontWeight: '500' }}>{record.title}</Text>
                <View style={{ display: 'flex', alignItems: 'center', marginTop: S.xs }}>
                  <View style={{ width: '10rpx', height: '10rpx', borderRadius: '5rpx', backgroundColor: record.verdict === 'recommend' ? C.success : C.danger, marginRight: S.xs }} />
                  <Text style={{ color: C.muted, ...F.caption }}>{getVerdictLabel(record.verdict)}</Text>
                </View>
              </View>
              <View style={{ width: '72rpx', height: '72rpx', borderRadius: R.md, backgroundColor: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color, ...F.score }}>{record.recommendation}</Text>
              </View>
            </View>
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: S.sm }}>
              <Text style={{ color: C.faint, ...F.tiny }}>
                {new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={{ paddingHorizontal: S.sm }} onClick={(e) => handleDelete(e, record.id)}>
                <Text style={{ color: C.faint, ...F.tiny }}>删除</Text>
              </View>
            </View>
          </View>
        )
      })}

      {filtered.length === 0 && records.length > 0 && (
        <View style={{ display: 'flex', justifyContent: 'center', marginTop: S.xxl }}>
          <Text style={{ color: C.muted, ...F.body }}>该分类暂无记录</Text>
        </View>
      )}
    </View>
  )
}

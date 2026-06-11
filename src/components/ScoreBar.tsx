import { View, Text } from '@tarojs/components'
import type { ScoreItem } from '../types'
import { getScoreColor } from '../utils/score'
import { C, F, S } from '../utils/theme'

interface Props {
  label: string
  item: ScoreItem
}

export default function ScoreBar({ label, item }: Props) {
  const color = getScoreColor(item.score)

  return (
    <View style={{ marginBottom: S.lg }}>
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
        <Text style={{ color: C.text, ...F.body }}>{label}</Text>
        <Text style={{ color, ...F.h3 }}>{item.score}</Text>
      </View>
      <View style={{ width: '100%', height: '12rpx', backgroundColor: C.elevated, borderRadius: '6rpx', overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(item.score, 100)}%`, height: '100%', backgroundColor: color, borderRadius: '6rpx' }} />
      </View>
      <Text style={{ color: C.muted, ...F.tiny, marginTop: S.xs }}>{item.reason}</Text>
    </View>
  )
}

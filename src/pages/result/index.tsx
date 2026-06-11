import { View, Text, Canvas } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { getHistoryById } from '../../storage'
import type { HistoryRecord } from '../../types'
import { getScoreColor, getVerdictLabel } from '../../utils/score'
import { savePoster } from '../../utils/poster'
import ScoreBar from '../../components/ScoreBar'
import { C, S, F, R, cardStyle, dividerStyle } from '../../utils/theme'

export default function Result() {
  const router = useRouter()
  const [record, setRecord] = useState<HistoryRecord | null>(null)

  useEffect(() => {
    const id = router.params.id
    if (id) setRecord(getHistoryById(id))
  }, [router.params.id])

  if (!record) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.page }}>
        <Text style={{ color: C.muted, ...F.h2, marginBottom: S.sm }}>评估记录不存在</Text>
        <Text style={{ color: C.faint, ...F.body, marginBottom: S.xl }}>记录可能已被删除</Text>
        <View style={{ paddingHorizontal: S.xl, paddingVertical: S.sm, backgroundColor: C.primary, borderRadius: R.full }} onClick={() => Taro.reLaunch({ url: '/pages/home/index' })}>
          <Text style={{ color: '#fff', ...F.body }}>返回首页</Text>
        </View>
      </View>
    )
  }

  const { result } = record
  const scoreColor = getScoreColor(result.scores.recommendation.score)
  const verdictColor = result.verdict === 'recommend' ? C.success : C.danger

  function handleCopyResume() {
    Taro.setClipboardData({
      data: result.resumeText,
      success: () => Taro.showToast({ title: '已复制', icon: 'success' }),
    })
  }

  // 生成分享海报
  function handleSharePoster() {
    savePoster(record!)
  }

  // 通用区块标题
  function SectionTitle({ children }: { children: string }) {
    return <Text style={{ color: C.text, ...F.h3, marginBottom: S.md }}>{children}</Text>
  }

  // 列表项（带圆点）
  function BulletItem({ text, color }: { text: string; color: string }) {
    return (
      <View style={{ display: 'flex', marginBottom: S.sm, alignItems: 'flex-start' }}>
        <View style={{ width: '6rpx', height: '6rpx', borderRadius: '3rpx', backgroundColor: color, marginTop: '16rpx', marginRight: S.sm, flexShrink: 0 }} />
        <Text style={{ color: C.text, ...F.body, flex: 1 }}>{text}</Text>
      </View>
    )
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: C.bg, paddingBottom: '80rpx' }}>
      {/* ─── HeroCard ─── */}
      <View style={{ margin: S.page, padding: S.xl, paddingTop: S.xxl, backgroundColor: '#0F0F14', borderRadius: R.xl, borderWidth: '1rpx', borderStyle: 'solid', borderColor: '#1E1E2E' }}>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: S.sm, paddingVertical: '4rpx', backgroundColor: C.elevated, borderRadius: R.sm, marginBottom: S.md }}>
          <Text style={{ color: C.muted, ...F.tiny }}>{result.summary}</Text>
        </View>
        <View style={{ display: 'flex', alignItems: 'flex-end', marginBottom: S.sm }}>
          <Text style={{ color: scoreColor, ...F.scoreBig }}>{result.scores.recommendation.score}</Text>
          <Text style={{ color: C.faint, ...F.body, marginLeft: S.sm, marginBottom: '12rpx' }}>/ 100</Text>
        </View>
        <View style={{ display: 'flex', alignItems: 'center', marginBottom: S.md }}>
          <View style={{ paddingHorizontal: S.sm, paddingVertical: '6rpx', backgroundColor: verdictColor + '18', borderRadius: R.sm, marginRight: S.sm }}>
            <Text style={{ color: verdictColor, ...F.bodySm, fontWeight: '600' }}>{getVerdictLabel(result.verdict)}</Text>
          </View>
          <Text style={{ color: verdictColor, fontSize: '32rpx' }}>{result.verdict === 'recommend' ? '✓' : '✗'}</Text>
        </View>
        <Text style={{ color: C.text, ...F.body }}>{result.oneLineConclusion}</Text>
        <View style={dividerStyle} />
        <View style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: C.muted, ...F.caption }}>高于同类平均 {result.scores.recommendation.score - result.benchmark.average} 分 · {result.benchmark.percentile} · 基准 {result.benchmark.version}</Text>
          <Text style={{ color: scoreColor, ...F.caption, fontWeight: '600' }}>{result.benchmark.percentile}</Text>
        </View>
      </View>

      {/* ─── 五维评分 ─── */}
      <View style={{ marginHorizontal: S.page, ...cardStyle }}>
        <SectionTitle>五维评分</SectionTitle>
        <ScoreBar label='简历价值' item={result.scores.resume} />
        <ScoreBar label='学习价值' item={result.scores.learning} />
        <ScoreBar label='商业潜力' item={result.scores.business} />
        <ScoreBar label='开发难度' item={result.scores.difficulty} />
        <ScoreBar label='创新度' item={result.scores.innovation} />
      </View>

      {/* ─── 推荐理由 + 风险 ─── */}
      <View style={{ marginHorizontal: S.page, ...cardStyle }}>
        <SectionTitle>推荐理由</SectionTitle>
        {result.pros.map((pro, i) => <BulletItem key={i} text={pro} color={C.success} />)}
        <View style={dividerStyle} />
        <SectionTitle>风险分析</SectionTitle>
        {result.cons.map((con, i) => <BulletItem key={i} text={con} color={C.danger} />)}
      </View>

      {/* ─── 同类项目参考 ─── */}
      {result.similarProjects.length > 0 && (
        <View style={{ marginHorizontal: S.page, ...cardStyle }}>
          <SectionTitle>同类项目参考</SectionTitle>
          {result.similarProjects.map((p, i) => (
            <View key={i} style={{ padding: S.md, marginBottom: S.sm, backgroundColor: C.elevated, borderRadius: R.md }}>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xs }}>
                <Text style={{ color: C.primary, ...F.body, fontWeight: '600' }}>{p.name}</Text>
                <View style={{ paddingHorizontal: S.sm, paddingVertical: '4rpx', backgroundColor: C.primaryBg, borderRadius: R.sm }}>
                  <Text style={{ color: C.primary, ...F.tiny }}>{p.similarity}% 相似</Text>
                </View>
              </View>
              <Text style={{ color: C.muted, ...F.caption, marginBottom: S.xs }}>{p.description}</Text>
              <Text style={{ color: C.success, ...F.caption }}>↑ {p.whySuccess}</Text>
            </View>
          ))}
          <View style={{ display: 'flex', gap: S.md, marginTop: S.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.success, ...F.caption, fontWeight: '600', marginBottom: S.sm }}>成功的共同点</Text>
              {result.whySuccess.map((s, i) => <Text key={i} style={{ color: C.muted, ...F.caption, marginBottom: '6rpx' }}>• {s}</Text>)}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.danger, ...F.caption, fontWeight: '600', marginBottom: S.sm }}>失败的共同点</Text>
              {result.whyFail.map((f, i) => <Text key={i} style={{ color: C.muted, ...F.caption, marginBottom: '6rpx' }}>• {f}</Text>)}
            </View>
          </View>
        </View>
      )}

      {/* ─── README 摘要（仅 GitHub 项目） ─── */}
      {result.readmeSummary && (
        <View style={{ marginHorizontal: S.page, ...cardStyle }}>
          <SectionTitle>README 摘要</SectionTitle>
          <Text style={{ color: C.text, ...F.body }}>{result.readmeSummary}</Text>
        </View>
      )}

      {/* ─── GitHub 深度分析（仅 GitHub 项目） ─── */}
      {result.githubAnalysis && (() => {
        const g = result.githubAnalysis
        const metrics = [
          { label: '活跃度', value: g.activityLevel, color: g.activityLevel === '活跃' ? C.success : g.activityLevel === '一般' ? C.warning : C.danger },
          { label: '社区', value: g.communityLevel, color: g.communityLevel === '成熟' ? C.success : g.communityLevel === '成长中' ? C.warning : C.muted },
          { label: '影响力', value: g.influenceLevel, color: g.influenceLevel === '高' ? C.success : g.influenceLevel === '中' ? C.warning : C.muted },
          { label: '维护风险', value: g.riskLevel, color: g.riskLevel === '低' ? C.success : g.riskLevel === '中' ? C.warning : C.danger },
        ]
        return (
          <View style={{ marginHorizontal: S.page, ...cardStyle }}>
            <SectionTitle>GitHub 深度分析</SectionTitle>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md }}>
              {metrics.map((m, i) => (
                <View key={i} style={{ flex: 1, minWidth: '140rpx', padding: S.sm, backgroundColor: C.elevated, borderRadius: R.md, alignItems: 'center' }}>
                  <Text style={{ color: C.muted, ...F.tiny, marginBottom: '4rpx' }}>{m.label}</Text>
                  <Text style={{ color: m.color, ...F.bodySm, fontWeight: '600' }}>{m.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: S.md }}>
              {[
                { label: 'Stars', value: String(g.stars) },
                { label: 'Forks', value: String(g.forks) },
                { label: 'Contributors', value: String(g.contributors) },
                { label: 'Releases', value: String(g.releases) },
                { label: 'Issues', value: String(g.openIssues) },
                { label: 'License', value: g.license },
                { label: '最后更新', value: g.lastCommit },
              ].map((item, i) => (
                <View key={i} style={{ minWidth: '120rpx' }}>
                  <Text style={{ color: C.faint, ...F.micro }}>{item.label}</Text>
                  <Text style={{ color: C.text, ...F.caption, fontWeight: '500' }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )
      })()}

      {/* ─── 开发路线图 ─── */}
      {result.roadmap.length > 0 && (
        <View style={{ marginHorizontal: S.page, ...cardStyle }}>
          <SectionTitle>开发路线图</SectionTitle>
          {result.roadmap.map((step, i) => (
            <View key={i} style={{ display: 'flex', marginBottom: S.md }}>
              <View style={{ width: '100rpx', flexShrink: 0 }}>
                <Text style={{ color: C.primary, ...F.caption, fontWeight: '600' }}>{step.day}</Text>
              </View>
              <View style={{ flex: 1, borderLeftWidth: '2rpx', borderLeftStyle: 'solid', borderLeftColor: C.border, paddingLeft: S.md }}>
                <Text style={{ color: C.text, ...F.body }}>{step.task}</Text>
              </View>
            </View>
          ))}
          <Text style={{ color: C.muted, ...F.tiny, marginTop: S.xs }}>预计 {result.estimatedDevTime} 完成 MVP</Text>
        </View>
      )}

      {/* ─── 面试官提问 ─── */}
      {result.interviewQuestions.length > 0 && (
        <View style={{ marginHorizontal: S.page, ...cardStyle }}>
          <SectionTitle>面试官可能会问</SectionTitle>
          <Text style={{ color: C.faint, ...F.tiny, marginBottom: S.md }}>基于项目评估，预测面试官关注点</Text>
          {result.interviewQuestions.map((q, i) => (
            <View key={i} style={{ padding: S.md, marginBottom: S.sm, backgroundColor: C.elevated, borderRadius: R.md }}>
              <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm }}>
                <View style={{ display: 'flex', alignItems: 'center' }}>
                  <View style={{ paddingHorizontal: S.sm, paddingVertical: '2rpx', backgroundColor: C.primaryBg, borderRadius: R.sm, marginRight: S.sm }}>
                    <Text style={{ color: C.primary, ...F.micro }}>{q.category}</Text>
                  </View>
                </View>
                <Text style={{ color: C.warning, ...F.tiny }}>{'★'.repeat(q.difficulty || 3)}{'☆'.repeat(5 - (q.difficulty || 3))}</Text>
              </View>
              <Text style={{ color: C.text, ...F.body, marginBottom: S.sm }}>Q{i + 1}. {q.question}</Text>
              <View style={{ paddingLeft: S.sm, borderLeftWidth: '2rpx', borderLeftStyle: 'solid', borderLeftColor: C.border, marginBottom: S.sm }}>
                <Text style={{ color: C.muted, ...F.caption }}>{q.answer}</Text>
              </View>
              {q.follow_up ? (
                <View style={{ paddingLeft: S.sm, borderLeftWidth: '2rpx', borderLeftStyle: 'solid', borderLeftColor: C.primary, marginTop: S.xs, marginBottom: S.sm }}>
                  <Text style={{ color: C.primary, ...F.tiny }}>追问：{q.follow_up}</Text>
                </View>
              ) : null}
              {q.keywords && q.keywords.length > 0 && (
                <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginTop: S.xs }}>
                  {q.keywords.map((kw, ki) => (
                    <View key={ki} style={{ paddingHorizontal: S.sm, paddingVertical: '2rpx', backgroundColor: C.elevated, borderRadius: R.sm, borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.border }}>
                      <Text style={{ color: C.faint, ...F.micro }}>{kw}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ─── 行动建议 ─── */}
      <View style={{ marginHorizontal: S.page, ...cardStyle }}>
        <SectionTitle>MVP 建议</SectionTitle>
        {result.mvpSuggestion.map((s, i) => (
          <View key={i} style={{ display: 'flex', marginBottom: S.sm }}>
            <Text style={{ color: C.primary, ...F.caption, fontWeight: '600', marginRight: S.sm, width: '32rpx' }}>{i + 1}</Text>
            <Text style={{ color: C.text, ...F.body, flex: 1 }}>{s}</Text>
          </View>
        ))}

        <View style={dividerStyle} />
        <SectionTitle>技术栈建议</SectionTitle>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: S.sm }}>
          {result.techStack.map((tech, i) => (
            <View key={i} style={{ paddingHorizontal: S.md, paddingVertical: S.xs, backgroundColor: C.elevated, borderRadius: R.sm, borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.border }}>
              <Text style={{ color: C.text, ...F.caption }}>{tech}</Text>
            </View>
          ))}
        </View>

        <View style={dividerStyle} />
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: C.text, ...F.body }}>预计开发周期</Text>
          <Text style={{ color: C.primary, ...F.body, fontWeight: '600' }}>{result.estimatedDevTime}</Text>
        </View>

        <View style={dividerStyle} />
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
          <Text style={{ color: C.muted, ...F.caption }}>简历写法参考</Text>
          <View style={{ paddingHorizontal: S.sm, paddingVertical: '4rpx', borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.border, borderRadius: R.sm }} onClick={handleCopyResume}>
            <Text style={{ color: C.muted, ...F.tiny }}>复制</Text>
          </View>
        </View>
        <Text style={{ color: C.muted, ...F.caption }}>{result.resumeText}</Text>
      </View>

      {/* ─── STAR 简历 ─── */}
      {result.resumeStar && result.resumeStar.resumeText && (
        <View style={{ marginHorizontal: S.page, ...cardStyle }}>
          <SectionTitle>STAR 简历写法</SectionTitle>
          {[
            { label: 'S · 背景', value: result.resumeStar.situation, color: C.muted },
            { label: 'T · 任务', value: result.resumeStar.task, color: C.muted },
            { label: 'A · 行动', value: result.resumeStar.action, color: C.primary },
            { label: 'R · 成果', value: result.resumeStar.result, color: C.success },
          ].map((item, i) => (
            item.value ? (
              <View key={i} style={{ marginBottom: S.sm }}>
                <Text style={{ color: item.color, ...F.caption, fontWeight: '600', marginBottom: '4rpx' }}>{item.label}</Text>
                <Text style={{ color: C.text, ...F.body }}>{item.value}</Text>
              </View>
            ) : null
          ))}
          <View style={dividerStyle} />
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
            <Text style={{ color: C.text, ...F.caption, fontWeight: '600' }}>可直接写入简历</Text>
            <View style={{ paddingHorizontal: S.sm, paddingVertical: '4rpx', borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.border, borderRadius: R.sm }} onClick={() => {
              Taro.setClipboardData({ data: result.resumeStar.resumeText, success: () => Taro.showToast({ title: '已复制', icon: 'success' }) })
            }}>
              <Text style={{ color: C.muted, ...F.tiny }}>复制</Text>
            </View>
          </View>
          <Text style={{ color: C.text, ...F.body }}>{result.resumeStar.resumeText}</Text>
        </View>
      )}

      {/* ─── 开发周期拆解 ─── */}
      {result.developmentBreakdown && result.developmentBreakdown.length > 0 && (
        <View style={{ marginHorizontal: S.page, ...cardStyle }}>
          <SectionTitle>开发周期拆解</SectionTitle>
          {result.developmentBreakdown.map((item, i) => (
            <View key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
              <Text style={{ color: C.text, ...F.body, flex: 1 }}>{item.task}</Text>
              <Text style={{ color: C.primary, ...F.caption, fontWeight: '600', marginLeft: S.md }}>{item.days}天</Text>
            </View>
          ))}
          <View style={dividerStyle} />
          <View style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ color: C.muted, ...F.caption }}>合计</Text>
            <Text style={{ color: C.primary, ...F.body, fontWeight: '600' }}>
              {result.developmentBreakdown.reduce((sum, item) => sum + item.days, 0)}天
            </Text>
          </View>
        </View>
      )}

      {/* ─── 底部操作 ─── */}
      {/* 隐藏 Canvas（用于生成海报） */}
      <Canvas
        type='2d'
        id='posterCanvas'
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '750px', height: '3000px' }}
      />
      <View style={{ marginHorizontal: S.page, marginTop: S.lg, display: 'flex', gap: S.sm }}>
        <View style={{ flex: 1, paddingVertical: S.xl, backgroundColor: C.card, borderRadius: R.full, borderWidth: '1rpx', borderStyle: 'solid', borderColor: C.border, display: 'flex', justifyContent: 'center' }} onClick={() => Taro.reLaunch({ url: '/pages/home/index' })}>
          <Text style={{ color: C.text, ...F.body, textAlign: 'center', fontWeight: '500' }}>返回首页</Text>
        </View>
        <View style={{ flex: 2, paddingVertical: S.xl, backgroundColor: C.primary, borderRadius: R.full, display: 'flex', justifyContent: 'center' }} onClick={handleSharePoster}>
          <Text style={{ color: '#fff', ...F.body, textAlign: 'center', fontWeight: '600' }}>生成分享海报</Text>
        </View>
      </View>
    </View>
  )
}

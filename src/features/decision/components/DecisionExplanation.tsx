import { getDecisionResult } from '../model'
import type { Decision } from '../types'

type Props = { decision: Decision }

export const DecisionExplanation = ({ decision }: Props) => {
  const { winner, ranked, totalWeight, tied } = getDecisionResult(decision)
  if (!totalWeight || !winner) return null
  const runnerUp = ranked[1]
  const contributions = decision.criteria.map(criterion => ({
    ...criterion,
    points: winner.scores[criterion.id] * criterion.weight / totalWeight,
    advantage: runnerUp ? (winner.scores[criterion.id] - runnerUp.scores[criterion.id]) * criterion.weight / totalWeight : 0,
  }))
  const strongest = [...contributions].sort((a, b) => b.advantage - a.advantage)[0]
  const gap = runnerUp ? winner.score - runnerUp.score : null

  return (
    <section className="panel explanation">
      <h2>왜 이 선택일까요?</h2>
      <p>{tied ? '현재 기준으로 공동 1위예요. 취향에 따라 선택해보세요.'
        : runnerUp ? `2위보다 ${gap!.toFixed(2)}점 높아요. ${strongest.advantage > 0 ? `‘${strongest.name || '이름 없는 기준'}’에서 가장 큰 우위를 얻었어요.` : ''}`
        : '선택지를 더 추가하면 차이를 비교할 수 있어요.'}</p>
      {!tied && gap !== null && gap < 0.5 && <p className="close-call">차이가 작아요. 중요도를 조금 바꾸면 순위가 달라질 수 있어요.</p>}
      <p className="helper">1위 점수를 구성한 기준별 기여도</p>
      {contributions.map(item => <div className="contribution" key={item.id}><span>{item.name || '이름 없는 기준'}</span><strong>+{item.points.toFixed(2)}점</strong></div>)}
    </section>
  )
}

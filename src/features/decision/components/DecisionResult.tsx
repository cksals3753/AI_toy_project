import { LIMITS } from '../model'
import type { getDecisionResult } from '../model'

type Props = { result: ReturnType<typeof getDecisionResult> }

export const DecisionResult = ({ result }: Props) => {
  const { totalWeight, ranked, winner, tied } = result
  const hasResult = totalWeight > 0 && winner !== undefined
  const caption = !hasResult ? '중요도를 설정해주세요'
    : tied ? '마음이 향하는 선택은, 공동 1위' : '지금 가장 잘 맞는 선택은'

  return (
    <aside>
      <section className="result">
        <div className="result-heading">
          <span className="eyebrow">YOUR LITTLE CHOICE</span>
          <span className="live">● LIVE</span>
        </div>
        <div className="spark">✳</div>
        <p className="result-caption">{caption}</p>
        <h2>{hasResult ? winner.name || '이름 없는 선택지' : '아직 고민 중'}</h2>
        <div className="big-score">{hasResult ? winner.score.toFixed(1) : '—'}<span> / {LIMITS.maxScore}</span></div>
        <p className="result-note">
          {hasResult ? '내가 정한 중요도와 점수로 계산한 결과예요.' : '기준 하나 이상의 중요도를 높이면 결과가 나타나요.'}
        </p>
        <div className="ranking">
          {ranked.map(option => (
            <div className="rank" key={option.id}>
              <div className="rank-top">
                <span><b>{hasResult ? option.rank : '—'}</b>{option.name || '이름 없는 선택지'}</span>
                <strong>{hasResult ? option.score.toFixed(1) : '—'}</strong>
              </div>
              <div className="track">
                <div style={{ width: `${option.score / LIMITS.maxScore * 100}%` }} className={option.rank === 1 ? 'first' : ''} />
              </div>
            </div>
          ))}
        </div>
        <div className="tip">
          <span>↗</span>
          <p>중요도를 조금 바꿔보세요.<br />내 선택이 얼마나 달라지는지 알 수 있어요.</p>
        </div>
      </section>
      <p className="formula">점수 × 중요도의 합 ÷ 전체 중요도<br />최종 결정은 언제나 당신의 몫이에요.</p>
    </aside>
  )
}

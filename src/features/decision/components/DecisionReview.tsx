import type { Decision } from '../types'

type Props = {
  decision: Decision
  onChoose: (optionId: string | null) => void
  onRatingChange: (rating: number | null) => void
  onReflectionChange: (reflection: string) => void
}

export const DecisionReview = ({ decision, onChoose, onRatingChange, onReflectionChange }: Props) => {
  const chosen = decision.options.find(option => option.id === decision.chosenOptionId)
  return (
    <section className="panel review">
      <h2 className="section-label"><span>04</span> 나의 결정과 회고</h2>
      <p className="helper">순위와 달라도 괜찮아요. 실제로 고른 선택을 남겨주세요.</p>
      <div className="choice-buttons">
        {decision.options.map(option => (
          <button key={option.id} aria-pressed={option.id === decision.chosenOptionId} onClick={() => onChoose(option.id)}>
            {option.id === decision.chosenOptionId ? '✓ ' : ''}{option.name || '이름 없는 선택지'}
          </button>
        ))}
      </div>
      {chosen && <>
        <p className="chosen-message">선택 확정: <strong>{chosen.name || '이름 없는 선택지'}</strong><button className="text-button" onClick={() => onChoose(null)}>확정 취소</button></p>
        <label htmlFor="rating">선택하고 나니 어땠나요?</label>
        <select id="rating" value={decision.rating ?? ''} onChange={e => onRatingChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">아직 평가하지 않음</option>
          {[1, 2, 3, 4, 5].map(value => <option value={value} key={value}>{value} / 5</option>)}
        </select>
        <label htmlFor="reflection">다음 선택을 위한 메모</label>
        <textarea id="reflection" value={decision.reflection} maxLength={2000} placeholder="좋았던 점, 아쉬웠던 점, 다음에 챙길 것…" onChange={e => onReflectionChange(e.target.value)} />
      </>}
    </section>
  )
}

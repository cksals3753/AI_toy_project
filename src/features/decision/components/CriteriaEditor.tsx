import { LIMITS } from '../model'
import type { Criterion } from '../types'

type Props = {
  criteria: Criterion[]
  totalWeight: number
  onAdd: () => void
  onChange: (id: string, changes: Partial<Pick<Criterion, 'name' | 'weight'>>) => void
  onRemove: (id: string) => void
}

type RowProps = Omit<Props, 'criteria' | 'onAdd'> & { criterion: Criterion; canRemove: boolean }

const CriterionRow = ({ criterion, totalWeight, canRemove, onChange, onRemove }: RowProps) => {
  const { id, name, weight } = criterion
  const percentage = totalWeight ? Math.round(weight / totalWeight * 100) : 0

  return (
    <div className="criterion">
      <div className="criterion-top">
        <input
          aria-label="평가 기준 이름" value={name} placeholder="기준 이름" maxLength={40}
          onChange={event => onChange(id, { name: event.target.value })}
        />
        <button className="remove" disabled={!canRemove} aria-label={`${name || '기준'} 삭제`} onClick={() => onRemove(id)}>×</button>
      </div>
      <div className="slider-row">
        <input
          type="range" min={LIMITS.minWeight} max={LIMITS.maxWeight} value={weight}
          aria-label={`${name || '기준'} 중요도`}
          onChange={event => onChange(id, { weight: Number(event.target.value) })}
        />
        <span className="weight">{weight}<small> / {LIMITS.maxWeight}</small></span>
        <span className="percentage">{percentage}%</span>
      </div>
    </div>
  )
}

export const CriteriaEditor = ({ criteria, totalWeight, onAdd, onChange, onRemove }: Props) => {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2 className="section-label"><span>02</span> 무엇이 중요한가요?</h2>
        <span className="muted">중요도 {LIMITS.minWeight}–{LIMITS.maxWeight}</span>
      </div>
      <p className="helper">꼭 챙기고 싶은 기준일수록 중요도를 높여주세요.</p>
      <div className="criteria-list">
        {criteria.map(criterion => (
          <CriterionRow
            key={criterion.id} criterion={criterion} totalWeight={totalWeight}
            canRemove={criteria.length > 1} onChange={onChange} onRemove={onRemove}
          />
        ))}
      </div>
      <button className="add-button" onClick={onAdd}>＋ 평가 기준 추가</button>
    </section>
  )
}

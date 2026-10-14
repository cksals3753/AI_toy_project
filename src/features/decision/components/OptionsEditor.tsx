import { LIMITS, SCORE_CHOICES } from '../model'
import type { Criterion, DecisionOption } from '../types'

type Props = {
  criteria: Criterion[]
  options: DecisionOption[]
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  onScoreChange: (optionId: string, criterionId: string, score: number) => void
}

type RowProps = Omit<Props, 'options' | 'onAdd'> & {
  option: DecisionOption
  index: number
  canRemove: boolean
}

const OptionRow = ({ option, index, criteria, canRemove, onRename, onRemove, onScoreChange }: RowProps) => {
  return (
    <tr>
      <td>
        <div className="option-name">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <input
            aria-label={`선택지 ${index + 1} 이름`} placeholder="선택지 이름" maxLength={60}
            value={option.name} onChange={event => onRename(option.id, event.target.value)}
          />
        </div>
      </td>
      {criteria.map(criterion => (
        <td key={criterion.id}>
          <select
            aria-label={`${option.name || `선택지 ${index + 1}`}의 ${criterion.name || '기준'} 점수`}
            value={option.scores[criterion.id]}
            onChange={event => onScoreChange(option.id, criterion.id, Number(event.target.value))}
          >
            {SCORE_CHOICES.map(score => <option key={score} value={score}>{score}</option>)}
          </select>
        </td>
      ))}
      <td>
        <button className="remove" disabled={!canRemove} aria-label={`${option.name || '선택지'} 삭제`} onClick={() => onRemove(option.id)}>×</button>
      </td>
    </tr>
  )
}

export const OptionsEditor = ({ criteria, options, onAdd, onRename, onRemove, onScoreChange }: Props) => {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2 className="section-label"><span>03</span> 선택지를 비교해요</h2>
        <span className="muted">점수 {LIMITS.minScore}–{LIMITS.maxScore}</span>
      </div>
      <p className="helper">각 기준에 얼마나 잘 맞나요? 잘 맞을수록 높은 점수예요.</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>선택지</th>
              {criteria.map(criterion => <th key={criterion.id}>{criterion.name || '새 기준'}</th>)}
              <th><span className="sr-only">삭제</span></th>
            </tr>
          </thead>
          <tbody>
            {options.map((option, index) => (
              <OptionRow
                key={option.id} option={option} index={index} criteria={criteria}
                canRemove={options.length > 1} onRename={onRename}
                onRemove={onRemove} onScoreChange={onScoreChange}
              />
            ))}
          </tbody>
        </table>
      </div>
      <button className="add-button" onClick={onAdd}>＋ 선택지 추가</button>
    </section>
  )
}

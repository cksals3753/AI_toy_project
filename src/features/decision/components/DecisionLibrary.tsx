import { useState } from 'react'
import { useCreateDecision, useDecisionsQuery } from '../queries'
import { createDecisionFromTemplate, templates } from '../templates'

type Props = { onOpen: (id: string) => void }

export const DecisionLibrary = ({ onOpen }: Props) => {
  const query = useDecisionsQuery()
  const create = useCreateDecision()
  const [templateId, setTemplateId] = useState('blank')
  const [filter, setFilter] = useState('all')
  const items = query.data?.filter(item => filter === 'all' || (filter === 'decided' ? item.chosenOptionId !== null : item.chosenOptionId === null)) ?? []

  return (
    <section className="library">
      <div className="library-heading"><div><span className="eyebrow">MY DECISIONS</span><h2>내 고민 보관함</h2></div></div>
      <div className="new-decision panel">
        <label htmlFor="template">어떤 고민부터 시작할까요?</label>
        <div>
          <select id="template" value={templateId} onChange={e => setTemplateId(e.target.value)}>
            {templates.map(template => <option value={template.id} key={template.id}>{template.name}</option>)}
          </select>
          <button className="primary-button" disabled={create.isPending} onClick={() => create.mutate(createDecisionFromTemplate(templateId), { onSuccess: item => onOpen(item.id) })}>
            {create.isPending ? '만드는 중…' : '＋ 새 고민 만들기'}
          </button>
        </div>
        {create.isError && <p role="alert">{create.error.message}</p>}
      </div>
      <div className="filters" aria-label="고민 필터">
        {[['all', '전체'], ['thinking', '고민 중'], ['decided', '결정 완료']].map(([value, label]) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>
      {query.isPending && <p role="status">고민을 불러오는 중…</p>}
      {query.isError && <div role="alert"><p>{query.error.message}</p><button onClick={() => void query.refetch()}>다시 불러오기</button></div>}
      {query.isSuccess && items.length === 0 && <p className="empty-state">아직 이곳에 고민이 없어요. 새 고민을 만들어보세요.</p>}
      <div className="decision-grid">
        {items.map(item => {
          const chosen = item.options.find(option => option.id === item.chosenOptionId)
          return (
            <button className="decision-card" key={item.id} onClick={() => onOpen(item.id)}>
              <span className="decision-badge">{chosen ? '결정 완료' : '고민 중'}</span>
              <h3>{item.title || '제목 없는 고민'}</h3>
              <p>{chosen ? `내 선택: ${chosen.name || '이름 없는 선택지'}` : `선택지 ${item.options.length}개 · 기준 ${item.criteria.length}개`}</p>
              <small>{new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' }).format(new Date(item.createdAt))}{item.rating ? ` · 만족도 ${item.rating}/5` : ''}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}

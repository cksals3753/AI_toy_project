type Props = { title: string; onChange: (title: string) => void }

export const DecisionTitle = ({ title, onChange }: Props) => {
  return (
    <section className="panel title-panel">
      <label className="section-label" htmlFor="title"><span>01</span> 어떤 고민이 있나요?</label>
      <input
        id="title"
        className="title-input"
        value={title}
        placeholder="예: 어떤 노트북을 살까?"
        maxLength={100}
        onChange={event => onChange(event.target.value)}
      />
    </section>
  )
}

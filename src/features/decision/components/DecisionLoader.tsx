import { useState } from 'react'
import { DecisionReview } from './DecisionReview'
import { DecisionExplanation } from './DecisionExplanation'
import { CriteriaEditor } from './CriteriaEditor'
import { DecisionResult } from './DecisionResult'
import { DecisionTitle } from './DecisionTitle'
import { OptionsEditor } from './OptionsEditor'
import { useDecisionQuery } from '../queries'
import type { Decision } from '../types'
import { useDecision } from '../useDecision'

export const DecisionLoader = ({ id, onBack }: { id: string; onBack: () => void }) => {
  const query = useDecisionQuery(id)
  if (query.isPending) return <div className="app"><p role="status">고민을 불러오는 중…</p></div>
  if (query.isError) return (
    <div className="app"><p role="alert">{query.error.message}</p><button onClick={() => void query.refetch()}>다시 불러오기</button><button onClick={onBack}>보관함으로</button></div>
  )
  return <DecisionWorkspace initialDecision={query.data} onBack={onBack} />
}

const DecisionWorkspace = ({ initialDecision, onBack }: { initialDecision: Decision; onBack: () => void }) => {
  const [leaving, setLeaving] = useState(false)
  const { decision, saveStatus, saveError, retrySave, result, actions, flushSave, isSaving } = useDecision(initialDecision)

  return (
    <div className="app">
      <header>
        <a className="brand" href="#">
          <span className="brand-icon">↗</span> little choice<span className="brand-dot">.</span>
        </a>
        <div className="save-state" role="status">
          ● {saveStatus}
          {saveError && <button onClick={retrySave}>저장 다시 시도</button>}
        </div>
      </header>
      <main>
        <button className="text-button back-button" disabled={isSaving || leaving} onClick={async () => {
          setLeaving(true)
          if (await flushSave()) onBack()
          else setLeaving(false)
        }}>← 저장하고 보관함으로</button>
        <div className="intro">
          <span className="eyebrow">LESS OVERTHINKING, MORE DOING</span>
          <h1>고민은 가볍게.<br />결정은 나답게.</h1>
          <p>중요한 것부터 골라보세요. 마음에 가까운 선택을 함께 찾아요.</p>
        </div>
        <div className="workspace">
          <fieldset className="editor" disabled={leaving}>
            <DecisionTitle title={decision.title} onChange={actions.changeTitle} />
            <CriteriaEditor
              criteria={decision.criteria} totalWeight={result.totalWeight}
              onAdd={actions.addCriterion} onChange={actions.changeCriterion}
              onRemove={actions.removeCriterion}
            />
            <OptionsEditor
              criteria={decision.criteria} options={decision.options}
              onAdd={actions.addOption} onRename={actions.renameOption}
              onRemove={actions.removeOption} onScoreChange={actions.changeScore}
            />
            <DecisionReview decision={decision} onChoose={actions.chooseOption} onRatingChange={actions.changeRating} onReflectionChange={actions.changeReflection} />
            <DecisionExplanation decision={decision} />
          </fieldset>
          <DecisionResult result={result} />
        </div>
        <footer>
          <span>작은 선택이 만드는, 나다운 하루.</span>
          <span>little choice · made for your everyday</span>
        </footer>
      </main>
    </div>
  )
}


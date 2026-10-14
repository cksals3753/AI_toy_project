import { useState } from 'react'
import { DecisionLibrary } from './features/decision/components/DecisionLibrary'
import { DecisionLoader } from './features/decision/components/DecisionLoader'
import './App.css'

const App = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return selectedId
    ? <DecisionLoader key={selectedId} id={selectedId} onBack={() => setSelectedId(null)} />
    : <div className="app">
        <header><a className="brand" href="#"><span className="brand-icon">↗</span>little choice.</a></header>
        <main>
          <div className="intro"><span className="eyebrow">LESS OVERTHINKING, MORE DOING</span><h1>고민은 가볍게.<br />결정은 나답게.</h1><p>비교하고, 선택하고, 다음의 나를 위해 기록해요.</p></div>
          <DecisionLibrary onOpen={setSelectedId} />
        </main>
      </div>
}

export default App

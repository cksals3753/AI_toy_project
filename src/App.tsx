import { Chapter3Panels } from './components/Chapter3Panels'
import type { Chapter3Panel } from './components/Chapter3Panels'
import { isChapter3Area, platformObjects, platformQuestions, survivor } from './game/chapter3'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { characters, episode, objects, questions, routes } from './game/data'
import { hallObjects, hallQuestions, powerDevices } from './game/chapter2'
import { loadGame, reducer, SAVE_KEY } from './game/engine'
import type { Message } from './game/dialogue'
import type { Entity, Point } from './game/world'
import { Exploration } from './components/Exploration'
import { Portrait } from './components/Portrait'
import { Overlay } from './components/Overlay'
import { DodgeGame } from './components/DodgeGame'
import './App.css'

type Panel = 'phone' | 'bag' | 'reset' | 'door' | 'lock' | 'staff' | 'power' | Chapter3Panel | null
function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadGame)
  const [panel, setPanel] = useState<Panel>(() => state.stage === 'lock' ? 'lock' : null)
  const [door, setDoor] = useState('west')
  const [code, setCode] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [completionDismissed, setCompletionDismissed] = useState(state.chapter2.completed)
  const [escapeDismissed, setEscapeDismissed] = useState(state.chapter3.escaped)
  const [worldKey, setWorldKey] = useState(0)
  const end = useRef<HTMLDivElement>(null)
  const dialogueButton = useRef<HTMLButtonElement>(null)
  const { stage, area, clues, asked, battery, chapter2, chapter3, scene, sceneIndex } = state
  const showResult = area === 'first' && stage === 'result' && !resultDismissed
  const showCompletion = area === 'stairs' && chapter2.completed && !completionDismissed
  const hazard = chapter2.staffEvent === 'active'
  const thirdChapter = isChapter3Area(area)
  const showEscape = chapter3.escaped && !escapeDismissed
  const npcChoice = area === 'platform' && chapter3.npc === 'found' && !scene.length
  const paused = panel !== null || scene.length > 0 || stage === 'intro' || showResult || hazard || showCompletion || npcChoice || showEscape
  const current = scene[sceneIndex]
  const speaker = current?.who === 'survivor' ? survivor : characters.find(c => c.id === current?.who)
  const currentQuestions = area === 'first' ? questions : thirdChapter ? platformQuestions : hallQuestions
  const route = routes.find(r => r.id === door)!
  const canRoute = clues.includes(route.requires) && asked.length > 0
  const lights = chapter2.power.includes('lights'), gateOpen = chapter2.power.includes('gate')

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); setSaveError(false) }
      catch { setSaveError(true) }
    })
    return () => { cancelled = true }
  }, [state])
  useEffect(() => { if (panel === 'phone') end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [state.messages.length, panel])
  useEffect(() => {
    if (!scene.length) return
    const previous = document.activeElement as HTMLElement | null
    dialogueButton.current?.focus()
    const trap = (event: KeyboardEvent) => { if (event.key === 'Tab') { event.preventDefault(); dialogueButton.current?.focus() } }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); previous?.focus() }
  }, [scene, sceneIndex])
  useEffect(() => {
    if (chapter3.signal !== 'changing' || scene.length) return
    const timer = window.setTimeout(() => dispatch({ type: 'signal-ready' }), 1400)
    return () => window.clearTimeout(timer)
  }, [chapter3.signal, scene.length])
  const closeEscape = useCallback(() => setEscapeDismissed(true), [])
  const closePanel = useCallback(() => setPanel(null), [])
  const closeResult = useCallback(() => setResultDismissed(true), [])
  const closeCompletion = useCallback(() => setCompletionDismissed(true), [])
  const savePosition = useCallback((position: Point) => dispatch({ type: 'position', position, area }), [area])
  const talk = useCallback((lines: Message[]) => dispatch({ type: 'talk', lines }), [])
  const finishDodge = useCallback((success: boolean) => dispatch({ type: 'staff-result', success }), [])
  const interact = useCallback((entity: Entity) => {
    if (area === 'platform') {
      if (entity.id === 'survivor') {
        if (chapter3.npc === 'unseen') dispatch({ type: 'discover-survivor' })
        else setPanel('survivor')
      } else if (entity.id === 'approval') setPanel('approval')
      else if (entity.id === 'front-b') setPanel('depart')
      else if (entity.id === 'call-b') dispatch({ type: 'call-train-b' })
      else if (entity.id === 'train-a' || entity.id === 'train-b') { dispatch({ type: 'inspect', id: entity.id }); setPanel(entity.id) }
      else if (entity.id === 'platform-stairs') talk([{ who: 'player', text: '계단에서 따라온 발소리는 이 승강장까지 이어졌다. 기둥 뒤에서 사람이 기침한다.' }])
      else { const object = platformObjects.find(o => o.id === entity.id); if (object) { dispatch({ type: 'inspect', id: object.id }); talk([{ who: 'player', text: object.id === 'platform-signal' && chapter3.signal === 'green' ? object.clue + ' 지금 확인한 ◇-2 신호는 녹색이다.' : object.clue }]) } }
      return
    }
    if (area === 'trainA') {
      if (entity.id === 'exit-a') dispatch({ type: 'leave-train-a' })
      else { const object = platformObjects.find(o => o.id === entity.id)!; dispatch({ type: 'inspect', id: object.id }); talk([{ who: 'player', text: object.clue }]) }
      return
    }
    if (area === 'trainB') { talk([{ who: entity.id === 'survivor' ? 'survivor' : 'player', text: entity.id === 'survivor' ? '제 발소리도 멈췄어요. 그런데… 저쪽에서 무슨 소리 들리지 않아요?' : '신도림역은 멀어졌다. 다음 역: 미확인.' }]); return }
    if (area === 'hall') {
      if (entity.id === 'staff') {
        if (chapter2.staffEvent === 'unseen') setPanel('staff')
        else talk([{ who: 'player', text: '방화문이 완전히 내려왔다. 직원 통로로는 더 갈 수 없다. 전기실을 통해 개찰구를 열어야 한다.' }])
      } else if (entity.id === 'electrical') dispatch({ type: 'enter-electrical' })
      else if (entity.id === 'gate') dispatch({ type: 'pass-gate' })
      else if (entity.id === 'sealed') talk([{ who: 'player', text: '합선 때문에 차단문이 내려왔다. 손잡이까지 뜨겁다. 첫 방으로 돌아갈 수 없다.' }])
      else if (entity.kind === 'npc') talk([{ who: 'oh', text: '열쇠는 안내 데스크 서랍을 봐요. 난 여기 있을 테니… 방송 장치도 살아 있는지 확인해 봐요. 그렇다고 여기 말을 다 믿지는 말고요.' }])
      else {
        const object = hallObjects.find(o => o.id === entity.id)
        if (object) { dispatch({ type: 'inspect', id: object.id }); talk([{ who: 'player', text: object.clue }]) }
      }
      return
    }
    if (area === 'electrical') {
      if (entity.id === 'powerboard') setPanel('power')
      else dispatch({ type: 'return-hall' })
      return
    }
    if (area === 'stairs') { dispatch({ type: 'enter-platform' }); return }
    if (entity.kind === 'object') {
      const object = objects.find(o => o.id === entity.id)!
      if (stage !== 'explore') { talk([{ who: 'player', text: clues.includes(object.id) ? object.clue : '이 구간의 조사는 끝났다. 정비문을 통해 대합실로 이동하자.' }]); return }
      dispatch({ type: 'inspect', id: entity.id })
      talk([{ who: 'player', text: battery < object.battery && !clues.includes(object.id) ? '배터리가 부족해 조사할 수 없다.' : object.clue }])
    } else if (entity.kind === 'npc') {
      talk(clues.includes('cabinet') ? [
        { who: 'oh', text: '물품함 기록을 봤군요. 서쪽 통로가 없는 건 아니에요. 비축품 때문에… 숨겼어요.' },
        { who: 'player', text: '현장의 기록과 단톡방의 말이 다르다. 휴대폰으로 이 모순을 물어보자.' },
      ] : [
        { who: 'oh', text: '깨어났군요. 난 이 근처 상가를 관리하던 사람이에요. 서쪽은 볼 것 없으니 구조대 말을 들어요.' },
        { who: 'player', text: '단톡방의 오반장이다. 왜 자꾸 서쪽으로 가지 말라고 할까? 주변부터 조사해 보자.' },
      ])
    } else if (stage === 'lock') {
      if (entity.id === 'west') setPanel('lock')
      else talk([{ who: 'player', text: '이미 서쪽 경로를 선택했다. 정비문으로 돌아가 잠금을 해제하자.' }])
    } else if (stage === 'result') {
      if (entity.id === 'west' && state.outcome !== 'failed') dispatch({ type: 'enter-hall' })
      else talk([{ who: 'player', text: '동쪽 계단에서는 여전히 물소리가 난다.' }])
    } else { setDoor(entity.id); setPanel('door') }
  }, [area, stage, clues, battery, chapter2.staffEvent, chapter3.npc, chapter3.signal, state.outcome, talk])
  const reset = () => {
    dispatch({ type: 'reset' }); setPanel(null); setCode(''); setResultDismissed(false); setCompletionDismissed(false); setEscapeDismissed(false); setWorldKey(key => key + 1)
  }
  const notebook = <><h3 className="section-label">현장 기록 <span>{clues.length}개</span></h3>{[...objects, ...hallObjects, ...platformObjects].filter(o => clues.includes(o.id)).map(o => <article className="clue" key={o.id}><strong>{o.title}</strong><p>{o.clue}</p></article>)}{thirdChapter && <article className="clue"><strong>현장 생존자 기록</strong><p>{chapter3.npc === 'unseen' ? '기둥 뒤의 발소리는 아직 확인하지 못했다.' : chapter3.npcBoarded ? '다친 생존자가 B-04에 함께 탑승했다.' : chapter3.npc === 'waiting' ? '본인의 뜻에 따라 비상 부스 옆 의자에서 구조를 기다린다.' : ['helped', 'invited'].includes(chapter3.npc) ? '부스 옆 의자에서 동행을 기다린다.' : '기둥 뒤에서 만났다. 대피 방향을 알려줄 수 있다.'}</p></article>}{!clues.length && <p className="muted">사물 가까이 이동한 뒤 조사하세요.</p>}</>
  const objective = thirdChapter ? chapter3.escaped ? '신도림역 탈출 완료 · 다음 역: 미확인' : area === 'trainA' ? '선두 차량의 운행 중지 안내를 확인하고 아래 문으로 돌아가세요.' : area === 'trainB' ? '신도림역 표지판이 창밖으로 멀어진다.' : chapter3.npc === 'unseen' ? '기둥 뒤의 사람과 차량 번호·선로 표식을 확인하세요.' : chapter3.signal === 'green' ? 'B-04 비상 호출로 문을 열고 선두 차량에서 출발을 확인하세요.' : '비상 부스 기록과 차량·선로를 대조해 운행 승인을 요청하세요.' : area === 'first' ? state.outcome ? state.outcome === 'failed' ? '탈출 실패 · 이번 회차 종료' : '정비문 개방 · 대합실로 이동하세요.' : clues.length === 0 ? '위쪽 벽의 안내도와 감지 패널을 찾아보세요.' : asked.length === 0 ? '휴대폰에서 현장 단서와 다른 주장에 대해 질문하세요.' : '문 가까이 다가가 경로를 선택하세요.' : area === 'electrical' ? '위쪽 배전반에서 회로 두 개까지 선택할 수 있습니다.' : area === 'stairs' ? chapter2.completed ? '챕터 2 완료 · 계단에 다가가 챕터 3로 이동하세요.' : '멈춰 서서 발소리에 귀를 기울인다.' : !state.inventory.includes('전기실 열쇠') ? '역 안내도와 점검창을 조사하고 안내 데스크를 찾아보세요.' : !lights || !gateOpen ? '전기실에서 조명과 개찰구 전원을 연결하세요. 방송 기록도 남길 수 있습니다.' : '조명과 개찰구가 켜졌습니다. 오른쪽 개찰구로 이동하세요.'
  return <div className="app-shell">
    <header className="header"><div className="brand"><span className="brand-mark">↗</span><span>마지막 환승<small>THE LAST TRANSFER</small></span></div><div className="header-right"><span className="connection"><i/> 로컬 플레이</span><button className="icon-button" onClick={() => setPanel('reset')} disabled={paused}>↻ <span>초기화</span></button></div></header>
    <main>
      <div className="episode-bar"><div><span className="chapter">CHAPTER {area === 'first' ? '01' : thirdChapter ? '03' : '02'}</span><h1>{area === 'first' ? episode.title : thirdChapter ? '누군가 있는 승강장' : '불 꺼진 대합실'}</h1></div><div className="resources"><span>♡ <b>{state.health}</b><small>체력</small></span><span>▰ <b>{battery}%</b><small>배터리</small></span></div></div>
      <div className="workspace-heading"><span className="overline">EXPLORE · OBSERVE · SURVIVE</span><span>{area === 'electrical' ? '직원 전용 전기실' : area === 'stairs' ? '승강장 계단 앞' : '신도림역을 모티브로 한 가상 공간'}</span></div>
      {area !== 'first' && !thirdChapter && <div className="power-status" aria-label="예비 전원 상태">{powerDevices.map(d => <span key={d.id} className={chapter2.power.includes(d.id) ? 'on' : ''}><i/>{d.title} {chapter2.power.includes(d.id) ? 'ON' : 'OFF'}</span>)}<small>{chapter2.power.length}/2 회로</small></div>}
      {thirdChapter && <div className="power-status train-status"><span>B-04 / ◇-2</span><span className={chapter3.signal === 'green' ? 'on' : ''}><i/>{chapter3.signal === 'green' ? '녹색 신호' : chapter3.signal === 'changing' ? '신호 전환 중' : '붉은 신호'}</span><small>{chapter3.escaped ? '탈출 완료' : chapter3.doorOpen ? '문 개방' : '문 닫힘'}</small></div>}
      <div className={`world-frame area-${area}`}><Exploration key={`${worldKey}:${area}:${chapter2.staffEvent}`} area={area} power={chapter2.power} staffEvent={chapter2.staffEvent} chapter3={chapter3} initialPosition={state.position} paused={paused} clues={clues} outcome={state.outcome} onInteract={interact} onPosition={savePosition}/>
        <div className="world-toolbar"><button disabled={paused} onClick={() => setPanel('phone')}>▯ <span>휴대폰</span><small>{state.messages.length}</small></button><button disabled={paused} onClick={() => setPanel('bag')}>⊞ <span>소지품·단서</span><small>{clues.length}</small></button></div>
        {area === 'trainB' && chapter3.ending === 'departing' && sceneIndex >= 1 && <div className="departure-window" aria-label="열차 창밖으로 멀어지는 신도림역 표지판"><span>신도림 SINDORIM →</span></div>}
        {current && <div className="vn-layer">{area === 'stairs' && chapter2.ending === 'echo' && sceneIndex === 1 && <div className="footstep-echo" key="echo" aria-label="멈춘 뒤 한 번 더 들린 발소리"><span>… 또각.</span><i/></div>}<div className="vn-portrait"><Portrait who={current.who}/></div><div className="vn-dialogue" role="dialog" aria-modal="true" aria-label={`${speaker?.name ?? '나'} 대화`}><span className="overline">{speaker?.role ?? '현장 기록'} · 탐색 일시정지</span><h2>{speaker?.name ?? '나'}</h2><p aria-live="polite" key={`${sceneIndex}:${current.text}`}>{current.text}</p><button ref={dialogueButton} className="primary" onClick={() => dispatch({ type: 'advance' })}>{sceneIndex + 1 < scene.length ? '다음 대화' : '탐색 계속'} <span>▸</span></button><small>{sceneIndex + 1} / {scene.length}</small></div></div>}
      </div>
      <div className="below-map"><div><span className="status-light"/><p>{objective}</p></div><span className="keyboard-help"><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> 이동 · <kbd>E</kbd> 상호작용</span></div>
      <footer><span role="status">{saveError ? '저장 실패 · 브라우저 저장 공간을 확인하세요.' : '자동 저장 · 위치·대화·전원 상태를 이 기기에 저장합니다.'}</span><div>{(stage === 'result' && area === 'first') && <button disabled={paused} onClick={() => setResultDismissed(false)}>결과 보기 ↗</button>}{area === 'stairs' && chapter2.completed && <button disabled={paused} onClick={() => setCompletionDismissed(false)}>챕터 완료 기록 ↗</button>}{chapter3.escaped && <button disabled={paused} onClick={() => setEscapeDismissed(false)}>탈출 기록 ↗</button>}<span>{chapter3.escaped ? '다음 역: 미확인' : '신도림역 · B2'}</span></div></footer>
    </main>
    {stage === 'intro' && <Overlay title="차가운 바닥에서 눈을 떴다."><p className="intro-text">{episode.intro}</p><div className="intro-instructions"><p><b>01</b> 직접 걸으며 사물과 인물을 찾으세요.</p><p><b>02</b> 가까이에서 E 또는 조사 버튼을 누르세요.</p><p><b>03</b> 휴대폰 단톡방에서 주장과 단서를 비교하세요.</p></div><p className="muted">PC: WASD / 방향키 · 모바일: 가상 조이스틱<br/>대화·휴대폰·메뉴가 열리면 탐색이 멈춥니다.</p><button className="primary full" onClick={() => { dispatch({ type: 'start' }); talk([{ who: 'player', text: '간신히 몸을 일으켰다. 저쪽에 사람이 보인다. 휴대폰에는 네 사람의 메시지가 와 있다.' }]) }}>몸을 일으키기 →</button></Overlay>}
    {panel === 'phone' && <Overlay title="신도림 생존자 · 5명" onClose={closePanel} wide><div className="members">{characters.map(c => <span key={c.id}><span style={{ background: `${c.color}22`, color: c.color }}>{c.initial}</span><b>{c.name}<small>{c.role}</small></b></span>)}</div><div className="chat-messages" role="log" aria-label="단톡방 메시지"><p className="chat-system">로컬 채널 · 현장의 단서와 비교하세요.</p>{state.messages.map((message, i) => { const c = characters.find(c => c.id === message.who); return <article key={i} className={`message ${c ? '' : 'mine'}`}><span className="avatar" style={{ color: c?.color }}>{c?.initial ?? '나'}</span><div><strong>{c?.name ?? '나'}<small>{c?.role ?? '생존자'}</small></strong><p>{message.text}</p></div></article> })}<div ref={end}/></div><div className="question-area"><h3>단서를 바탕으로 질문하기 <small>배터리 소모 없음</small></h3>{currentQuestions.map(q => <button key={q.id} disabled={stage !== 'explore' || area === 'stairs' || chapter3.boarded || !clues.includes(q.requires) || asked.includes(q.id)} onClick={() => dispatch({ type: 'ask', id: q.id })}><span>{asked.includes(q.id) ? '✓' : '↗'}</span>{q.label}<small>{asked.includes(q.id) ? '완료' : clues.includes(q.requires) ? '질문' : '단서 필요'}</small></button>)}</div></Overlay>}
    {panel === 'bag' && <Overlay title="소지품과 현장 기록" onClose={closePanel}><div className="inventory"><span>▯ 휴대폰 · {battery}%</span>{state.inventory.map(item => <span key={item}>♧ {item}</span>)}</div>{notebook}</Overlay>}
    {panel === 'door' && <Overlay title={route.title} onClose={closePanel}><span className="overline">{route.voice}</span><p className="intro-text">{route.text}</p><p className="muted">{!clues.includes(route.requires) ? '관련 현장 단서를 먼저 조사해야 합니다.' : !asked.length ? '휴대폰에서 질문을 하나 이상 해보세요.' : '이 경로를 선택하면 되돌릴 수 없습니다.'}</p><button className="primary full" disabled={!canRoute} onClick={() => { dispatch({ type: 'route', id: door }); setPanel(door === 'west' ? 'lock' : null); setResultDismissed(false) }}>이 경로 선택 →</button></Overlay>}
    {panel === 'lock' && <Overlay title="서쪽 정비문 · 전자 잠금" onClose={closePanel}><span className="overline">MAINTENANCE ACCESS</span><p className="intro-text">마지막 경보 시각 네 자리.<br/>닫힌 문 너머에서 바람이 스민다.</p><form className="lock-form" onSubmit={event => { event.preventDefault(); const next = reducer(state, { type: 'code', code }); dispatch({ type: 'code', code }); setCode(''); if (next.stage === 'result') { setPanel(null); setResultDismissed(false) } }}><label htmlFor="code">암호 입력 · 남은 기회 {3 - state.attempts}회</label><input id="code" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} value={code} placeholder="0000" onChange={event => setCode(event.target.value.replace(/\D/g, ''))}/><button className="primary" disabled={code.length !== 4}>잠금 해제 →</button></form><p role="status" className="notice">{state.notice}</p><details><summary>수집한 단서 확인</summary>{notebook}</details></Overlay>}
    {showResult && panel !== 'reset' && <Overlay title={state.outcome === 'failed' ? '마지막 신호가 끊겼다.' : '정비문이 열렸다.'} onClose={closeResult}><span className="overline">{state.outcome === 'failed' ? 'SIGNAL LOST' : 'CHAPTER 01 CLEAR'}</span><p className="intro-text">{state.notice}</p><p className="result-stats">체력 {state.health} · 배터리 {battery}% · 단서 {clues.length}개</p>{state.outcome !== 'failed' && <button className="primary full" onClick={() => dispatch({ type: 'enter-hall' })}>대합실로 이동 →</button>}<button className="text-button" onClick={() => setPanel('reset')}>처음부터 다시 플레이</button></Overlay>}
    {panel === 'staff' && <Overlay title="파란 불빛을 따라갈까요?" onClose={closePanel}><p className="intro-text">강태오가 안내한 직원 통로. 안쪽에서 환풍기 소리와 금속이 삐걱이는 소리가 들립니다.</p><p className="muted">이 경로에서는 한 번의 회피 사건이 발생합니다. 실패해도 체력 20이 감소한 상태로 대합실에 복귀합니다.</p><button className="primary full" onClick={() => { setPanel(null); dispatch({ type: 'staff-start' }) }}>직원 통로 진입 →</button></Overlay>}
    {hazard && <DodgeGame onFinish={finishDodge}/>}
    {panel === 'power' && <Overlay title="예비 전원 · 회로 분배" onClose={closePanel}><div className="power-capacity"><span>{chapter2.power.length} <small>/ 2 회로 연결</small></span><p>세 장치 중 최대 두 개.<br/>켜진 장치를 끄면 다른 회로를 연결할 수 있습니다.</p></div><div className="power-devices">{powerDevices.map(device => { const enabled = chapter2.power.includes(device.id); return <button key={device.id} aria-pressed={enabled} onClick={() => dispatch({ type: 'power', device: device.id })}><span className="device-icon">{device.icon}</span><span><strong>{device.title}</strong><small>{device.description}</small></span><b>{enabled ? 'ON' : 'OFF'}</b></button> })}</div><p className="notice" role="status">{state.notice}</p><p className="muted">안전 통과 조건: 조명 {lights ? '✓' : '—'} + 개찰구 {gateOpen ? '✓' : '—'}<br/>방송 기록은 전원을 꺼도 현장 노트에 남습니다.</p><button className="primary full" onClick={closePanel}>설정 유지하고 탐색 계속 →</button></Overlay>}
    {showCompletion && panel !== 'reset' && <Overlay title="챕터 2 · 불 꺼진 대합실 완료" onClose={closeCompletion}><span className="overline">CHAPTER 02 CLEAR · SAVED</span><p className="intro-text">개찰구 너머, 계단 앞에 도착했습니다.<br/>한 번 더 울린 발소리의 주인은 아직 알 수 없습니다.</p><p className="result-stats">체력 {state.health} · 수집한 기록 {clues.length}개</p><div className="chapter-preview"><span>CHAPTER 03</span><h3>누군가 있는 승강장</h3><p>계단을 내려가 발소리의 주인을 확인하세요.</p></div><button className="primary full" onClick={() => { closeCompletion(); dispatch({ type: 'enter-platform' }) }}>챕터 3 · 승강장으로 이동 →</button><button className="text-button" onClick={closeCompletion}>완료 기록 저장 · 현장으로 →</button><button className="text-button" onClick={() => setPanel('reset')}>처음부터 다시 플레이</button></Overlay>}
    <Chapter3Panels state={state} panel={panel} onClose={closePanel} dispatch={dispatch} notebook={notebook}/>
    {showEscape && panel !== 'reset' && <Overlay title="신도림역 탈출 완료" onClose={closeEscape}><span className="overline">CHAPTER 03 CLEAR · NEXT STATION UNKNOWN</span><p className="intro-text">차창 밖의 신도림역 표지판이 멀어졌습니다.<br/>{chapter3.npcBoarded ? '다친 생존자와 함께 열차에 올랐습니다.' : '혼자 탑승했습니다. 생존자는 비상 부스 옆 의자에서 구조를 기다립니다.'}</p><div className="chapter-preview"><span>다음 역: 미확인</span><h3>“지금 객실에 몇 명 있어요?”</h3><p>다음 이야기는 준비 중입니다.</p></div><button className="primary full" onClick={closeEscape}>탈출 기록 저장 · 객실 둘러보기 →</button><button className="text-button" onClick={() => setPanel('reset')}>처음부터 다시 플레이</button></Overlay>}
    {panel === 'reset' && <Overlay title="처음부터 다시 시작할까요?" onClose={closePanel}><p className="intro-text">현재 회차의 위치, 단서, 대화와 저장 기록이 초기화됩니다.</p><button className="primary full" onClick={reset}>초기화하고 시작 ↻</button><button className="text-button" onClick={closePanel}>계속 플레이</button></Overlay>}
  </div>
}
export default App

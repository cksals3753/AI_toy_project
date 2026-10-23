import { DismissButton } from './ui/TouchActionButton'
import { EpisodeResult } from './EpisodeResult'
import { RecordEntry } from './ui/Records'
import { Button } from './ui/Button'
import { useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Action, State } from '../game/engine'
import { Overlay } from './Overlay'
import { finalObjects } from '../game/chapter6'
export const Chapter6Panels = ({
  state,
  panel,
  onClose,
  dispatch,
  notebook,
}: {
  state: State
  panel: string | null
  onClose: () => void
  dispatch: Dispatch<Action>
  notebook: ReactNode
}) => {
  const [door, setDoor] = useState('S-01'),
    [mode, setMode] = useState('local'),
    [power, setPower] = useState(true)
  const c = state.chapter6
  const [confirm, setConfirm] = useState(false)
  if (!c.started) return null
  if (panel === 'episode-result' && c.result)
    return <EpisodeResult result={c.result} onClose={onClose} />
  if (panel === 'final-review')
    return (
      <Overlay title="최종 판단 · 확보한 현장 기록" onClose={onClose} wide>
        {notebook}
        <p className="muted">
          획득한 단서만 표시합니다. 과거 선택 단서는 통행의 필수 조건이 아닙니다.
        </p>
      </Overlay>
    )
  if (panel !== 'final-control') return null
  const evidence = finalObjects.filter(
    (o) => state.clues.includes(o.id) && o.area === 'maintenance',
  )
  if (confirm && c.settings)
    return (
      <Overlay title="경로 이동 최종 확인" onClose={() => setConfirm(false)} footerClose={false}>
        <p className="intro-text">
          선택한 문: {c.settings.door} ·{' '}
          {c.settings.mode === 'local' ? '현장 수동 승인' : '외부 자동 승인'} · 전원 유지
        </p>
        <p>
          실제 목적지:{' '}
          {state.clues.includes('final-map')
            ? c.settings.door === 'S-01'
              ? '지상 대피소 정문'
              : '지하 등록 확인 구역'
            : '미확인 · 현행 대피도를 조사하세요.'}
        </p>
        {c.settings.door === 'G-01' && state.clues.includes('final-window') && (
          <p className="notice">점검창에서 진입 뒤 차단문 폐쇄 안내를 확인했습니다.</p>
        )}
        <p className="muted">
          이동하면 경로가 확정됩니다. 설정 수정과 기록 확인은 지금 할 수 있습니다.
        </p>
        <details open>
          <summary>발견한 근거 다시 확인</summary>
          {evidence.map((o) => (
            <RecordEntry key={o.id} title={o.title}>
              <p>{o.clue}</p>
            </RecordEntry>
          ))}
        </details>
        <Button
          full
          onClick={() => {
            dispatch({ type: 'maintenance-commit' })
            setConfirm(false)
            onClose()
          }}
        >
          이 경로로 이동 확정
        </Button>
        <DismissButton variant="text" onDismiss={() => setConfirm(false)}>
          설정으로 돌아가기
        </DismissButton>
        <DismissButton
          variant="text"
          onDismiss={() => {
            setConfirm(false)
            onClose()
          }}
        >
          이동 보류 · 현장 더 조사
        </DismissButton>
      </Overlay>
    )
  const settingsMatch =
    !!c.settings &&
    c.settings.door === door &&
    c.settings.mode === mode &&
    c.settings.power === power
  return (
    <Overlay title="정비 통로 · 경로 제어반" onClose={onClose}>
      <p>설정은 자유롭게 바꿀 수 있습니다. 이동은 별도로 확정합니다.</p>
      <label htmlFor="final-door">문 번호</label>
      <select id="final-door" value={door} onChange={(e) => setDoor(e.target.value)}>
        <option>S-01</option>
        <option>G-01</option>
      </select>
      <label htmlFor="final-mode">승인 방식</label>
      <select id="final-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="local">현장 수동 승인</option>
        <option value="remote">외부 자동 승인</option>
      </select>
      <label>
        <input type="checkbox" checked={power} onChange={(e) => setPower(e.target.checked)} />
        지역 전원 유지
      </label>
      <Button full onClick={() => dispatch({ type: 'maintenance-configure', door, mode, power })}>
        장치 설정 대조·저장
      </Button>
      <p className="notice" role="status">
        {state.notice}
      </p>
      <Button full disabled={!settingsMatch} onClick={() => setConfirm(true)}>
        이동 전 근거 확인 →
      </Button>
      {!settingsMatch && (
        <p className="muted">
          현재 설정을 먼저 대조·저장해야 이동 전 확인을 열 수 있습니다. 설정 오류는 위 안내를 보고
          수정하세요.
        </p>
      )}
      <details>
        <summary>확보한 현장 노트</summary>
        {notebook}
      </details>
    </Overlay>
  )
}

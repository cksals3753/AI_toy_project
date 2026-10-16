import { useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Action, State } from '../game/engine'
import { Overlay } from './Overlay'
import { finalObjects } from '../game/chapter6'
import { objects } from '../game/data'
import { hallObjects } from '../game/chapter2'
import { platformObjects } from '../game/chapter3'
import { trainObjects } from '../game/chapter4'
import { moonObjects } from '../game/chapter5'
const catalog = [
  ...objects,
  ...hallObjects,
  ...platformObjects,
  ...trainObjects,
  ...moonObjects,
  ...finalObjects,
]
export function Chapter6Panels({
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
}) {
  const [door, setDoor] = useState('S-01'),
    [mode, setMode] = useState('local'),
    [power, setPower] = useState(true)
  const c = state.chapter6
  const [confirm, setConfirm] = useState(false)
  if (!c.started) return null
  if (panel === 'episode-result' && c.result) {
    const r = c.result
    return (
      <Overlay title="에피소드 1 완료 · 지상 대피소 도착" onClose={onClose} wide>
        <div className="episode-arrival" aria-hidden="true">
          지상 · 새벽빛이 창 안으로 들어온다.
        </div>
        <span className="overline">도착 시점의 저장된 결과 · 다시 보기로 변경되지 않음</span>
        <p className="intro-text">
          {r.route === 'manual'
            ? 'S-01 현장 수동 경로 → 대피소 정문'
            : 'G-01 자동 확인 → 배수·빗장 복구 → S-02 측면 해치'}
        </p>
        <p>
          체력 {r.health} · 배터리 {r.battery}% · 소지품 {r.inventory.join(', ') || '없음'}
        </p>
        <h3>동행과 마지막 확인 위치</h3>
        <p>
          {r.npcTogether
            ? '생존자와 함께 도착 · ' +
              (r.npcHelp === 'helped'
                ? '처음 의자까지 부축함'
                : r.npcHelp === 'invited'
                  ? '탑승 전에 동행을 제안함'
                  : '이전 도움 방식 기록 없음')
            : '생존자 비동행'}
        </p>
        <p>{r.npcLocation}</p>
        <h3>이번 회차의 주요 선택</h3>
        <ul>
          {r.choices.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <h3>확인된 사실</h3>
        <ul>
          {r.facts.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <h3>미확인 사항</h3>
        <ul>
          {r.unknowns.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <details>
          <summary>실제로 획득한 단서 · {r.clues.length}개</summary>
          {r.clues.map((id) => (
            <article className="clue" key={id}>
              <strong>{catalog.find((o) => o.id === id)?.title ?? id}</strong>
              <p>{r.clueTexts[id]}</p>
            </article>
          ))}
        </details>
        <details>
          <summary>도착 시점 단톡방 기록 · {r.messages.length}개</summary>
          {r.messages.map((m, i) => (
            <article className="clue" key={i}>
              <strong>
                {{
                  seo: '서윤',
                  kang: '강태오',
                  min: '민재',
                  oh: '오반장',
                  player: '나',
                  survivor: '다친 생존자',
                }[m.who] ?? m.who}
              </strong>
              <p>{m.text}</p>
              {m.kind === 'mock-answer' && <small>모의 응답 · 검증용</small>}
              {m.kind === 'ai-answer' && <small>AI 생성 대사 · 현장 판정 아님</small>}
            </article>
          ))}
        </details>
        <p className="muted">
          이 회차의 탈출 목표는 해결되었습니다. 전체 재난의 진실은 아직 확인되지 않았습니다.
        </p>
        <button className="primary full" onClick={onClose}>
          결과 저장 · 대피소 보기
        </button>
      </Overlay>
    )
  }
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
      <Overlay title="경로 이동 최종 확인" onClose={() => setConfirm(false)}>
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
            <article className="clue" key={o.id}>
              <strong>{o.title}</strong>
              <p>{o.clue}</p>
            </article>
          ))}
        </details>
        <button
          className="primary full"
          onClick={() => {
            dispatch({ type: 'maintenance-commit' })
            setConfirm(false)
            onClose()
          }}
        >
          이 경로로 이동 확정
        </button>
        <button className="text-button" onClick={() => setConfirm(false)}>
          설정으로 돌아가기
        </button>
        <button
          className="text-button"
          onClick={() => {
            setConfirm(false)
            onClose()
          }}
        >
          이동 보류 · 현장 더 조사
        </button>
      </Overlay>
    )
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
      <button
        className="primary full"
        onClick={() => dispatch({ type: 'maintenance-configure', door, mode, power })}
      >
        장치 설정 대조·저장
      </button>
      <p className="notice" role="status">
        {state.notice}
      </p>
      <button
        className="primary full"
        disabled={
          !c.settings ||
          c.settings.door !== door ||
          c.settings.mode !== mode ||
          c.settings.power !== power
        }
        onClick={() => setConfirm(true)}
      >
        이동 전 근거 확인 →
      </button>
      <details>
        <summary>확보한 현장 노트</summary>
        {notebook}
      </details>
    </Overlay>
  )
}

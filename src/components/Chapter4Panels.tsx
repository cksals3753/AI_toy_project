import { DismissButton } from './ui/TouchActionButton'
import { Button } from './ui/Button'
import type { Dispatch, ReactNode } from 'react'
import type { Action, State } from '../game/engine'
import { trainLinks, trainPanelStatus } from '../game/chapter4'
import { Overlay } from './Overlay'
import { SignalSync } from './SignalSync'

export type Chapter4Panel = 'train-links' | 'train-panel'
type Props = {
  state: State
  panel: string | null
  dispatch: Dispatch<Action>
  onClose: () => void
  notebook: ReactNode
}
export const Chapter4Panels = ({ state, panel, dispatch, onClose, notebook }: Props) => {
  const c = state.chapter4
  if (!c.started) return null
  if (c.sync === 'active')
    return (
      <SignalSync
        chapter={c}
        onHit={(marker) => dispatch({ type: 'train-sync-hit', marker })}
        onAssist={() => dispatch({ type: 'train-assist' })}
        onClose={() => dispatch({ type: 'train-sync-cancel' })}
      />
    )
  if (state.scene.length) return null
  if (c.entryPrompt)
    return (
      <Overlay
        title={`${c.destination} · 역 진입 확인`}
        footerClose={false}
        onClose={() => dispatch({ type: 'train-entry', confirm: false })}
      >
        <p className="intro-text">
          열린 문 앞. 플랫폼에는 같은 방향으로 놓인 신발 여러 켤레가 보인다.
        </p>
        <p>“거기서는 안내방송에 대답하지 마세요.”</p>
        <p className="muted">
          승인하면 챕터 4 완료와 도착 상태를 저장합니다. 역 안 본격 탐색은 챕터 5에서 이어집니다.
        </p>
        <Button full onClick={() => dispatch({ type: 'train-entry', confirm: true })}>
          진입 승인 · 챕터 4 완료
        </Button>
        <DismissButton
          variant="text"
          onDismiss={() => dispatch({ type: 'train-entry', confirm: false })}
        >
          문 앞에서 더 생각하기
        </DismissButton>
      </Overlay>
    )
  if (panel === 'train-links')
    return (
      <Overlay title="통신 장치함 · 연결 검증" onClose={onClose}>
        <p className="muted">
          글자 표식과 식별자를 노트와 대조하세요. 분리·복구는 무제한이며 전원이 꺼져도 이 장치함을
          찾을 수 있습니다.
        </p>
        <div className="power-devices">
          {trainLinks.map((link) => (
            <button
              key={link.id}
              disabled={c.sync === 'accepted' || c.completed}
              aria-pressed={c.links[link.id]}
              onClick={() => {
                dispatch({ type: 'train-link', id: link.id })
                if (link.id === 'external' && c.links.external && c.interruption === 'none')
                  onClose()
              }}
            >
              <span>
                <strong>{link.mark}</strong>
                <small>
                  {link.identifier} · {link.description}
                </small>
              </span>
              <b>{c.links[link.id] ? '연결됨 · 분리' : '분리됨 · 복구'}</b>
            </button>
          ))}
        </div>
        <p className="notice" role="status">
          {state.notice}
        </p>
        <details>
          <summary>발견한 식별자·기록 대조</summary>
          {notebook}
        </details>
      </Overlay>
    )
  if (panel === 'train-panel')
    return (
      <Overlay title="가상 비상 운행 · 정차 요청" onClose={onClose}>
        <p className="intro-text">{trainPanelStatus(c)}</p>
        <p className="muted">운전실에는 들어가지 않습니다. 게임 전용 시스템에 정차를 요청합니다.</p>
        <Button
          full
          disabled={!c.links.power || !c.links.relay || c.links.external || c.sync !== 'idle'}
          onClick={() => {
            onClose()
            dispatch({ type: 'train-sync-start' })
          }}
        >
          신호 동기화 시작
        </Button>
        <details>
          <summary>현장 기록 확인</summary>
          {notebook}
        </details>
      </Overlay>
    )
  return null
}

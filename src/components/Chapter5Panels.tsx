import { useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Action, State } from '../game/engine'
import {
  defaultDisplayName,
  displayNameLimit,
  matchingRegistration,
  maintenanceRule,
  moonEvidence,
  moonStation,
  registrationCases,
} from '../game/chapter5'
import { Overlay } from './Overlay'

export type Chapter5Panel =
  'moon-response' | 'moon-registration' | 'moon-cancel' | 'moon-route-controller'
type Props = {
  state: State
  panel: string | null
  dispatch: Dispatch<Action>
  onClose: () => void
  notebook: ReactNode
}

const RegistrationChoice = ({
  caseId,
  onChange,
  name,
  disabled = false,
}: {
  caseId: string
  onChange: (id: string) => void
  name: string
  disabled?: boolean
}) => (
  <label className="moon-field">
    등록 건 선택
    <select
      value={caseId}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      aria-label="등록 건 선택"
    >
      {registrationCases.map((record) => (
        <option key={record.id} value={record.id}>
          {record.id} · {record.vehicle} · {record.source} · {record.time} ·{' '}
          {record.ownProfile ? name : '다른 표시 이름'}
        </option>
      ))}
    </select>
  </label>
)

export const Chapter5Panels = ({ state, panel, dispatch, onClose, notebook }: Props) => {
  const c = state.chapter5
  const [caseId, setCaseId] = useState<string>('REG-409')
  const [door, setDoor] = useState('D-03')
  const [mode, setMode] = useState('remote')
  if (!c.started || state.scene.length) return null
  if (!c.displayName)
    return (
      <Overlay title="휴대폰 프로필 · 내 표시 이름">
        <p className="intro-text">이전부터 사용하던 단톡방 표시 이름을 확인합니다.</p>
        <p className="muted">
          실제 이름을 입력할 필요는 없어요. 게임용 이름을 사용하세요. 프로필 확인은 새 자료를
          전송하는 절차가 아닙니다. 이 회차에 저장하며 확인 뒤에는 방송과 등록 원본에서 같은 이름을
          사용합니다.
        </p>
        <form
          className="moon-form"
          onSubmit={(event) => {
            event.preventDefault()
            dispatch({ type: 'moon-profile-confirm' })
          }}
        >
          <label htmlFor="moon-name">게임용 표시 이름 · 1~{displayNameLimit}자</label>
          <input
            id="moon-name"
            maxLength={displayNameLimit * 2}
            autoComplete="off"
            value={c.profileDraft}
            onChange={(event) => dispatch({ type: 'moon-profile-edit', name: event.target.value })}
          />
          <p className="notice" role="status">
            {state.notice}
          </p>
          <button className="primary full">이 표시 이름 확인 · 승강장으로</button>
        </form>
        <button
          className="text-button"
          onClick={() => dispatch({ type: 'moon-profile-confirm', useDefault: true })}
        >
          기본 이름 ‘{defaultDisplayName}’ 사용
        </button>
      </Overlay>
    )
  if (c.exitPrompt)
    return (
      <Overlay
        title={`${moonStation} · 정비 통로 이동 확인`}
        onClose={() => dispatch({ type: 'moon-finish', confirm: false })}
      >
        <p className="intro-text">D-02 정비 통로가 열렸습니다. 다음 구역으로 이동할까요?</p>
        <p className="muted">
          승인하면 챕터 5 완료와 이동 승인을 저장합니다. 통로 안 탐색은 다음 챕터에서 이어집니다.
        </p>
        <button
          className="primary full"
          onClick={() => dispatch({ type: 'moon-finish', confirm: true })}
        >
          정비 통로 이동 승인 · 챕터 5 완료
        </button>
        <button
          className="text-button"
          onClick={() => dispatch({ type: 'moon-finish', confirm: false })}
        >
          승강장에서 더 확인하기
        </button>
      </Overlay>
    )
  if (panel === 'moon-response')
    return (
      <Overlay title="방송에 응답할까요?" onClose={onClose}>
        <p className="intro-text">“{c.displayName} 님, 대피자 확인을 위해 대답해 주십시오.”</p>
        <p className="moon-warning">
          경고: 응답하면 출구가 아닌 확인 구역 차단문이 작동합니다. 무응답으로 안내 부스를 조사할
          수도 있습니다.
        </p>
        {c.response === 'undecided' ? (
          <>
            <p className="muted">
              먼저 전광판 경고와 응답 감지기를 조사하세요. 아래 버튼을 명시적으로 선택할 때만
              응답으로 판정합니다.
            </p>
            <button
              className="primary full"
              disabled={!['moon-warning', 'moon-sensor'].every((id) => state.clues.includes(id))}
              onClick={() => {
                onClose()
                dispatch({ type: 'moon-respond', choice: 'answered' })
              }}
            >
              경고를 확인했으며 대답한다
            </button>
            <button
              className="text-button"
              disabled={!['moon-warning', 'moon-sensor'].every((id) => state.clues.includes(id))}
              onClick={() => {
                onClose()
                dispatch({ type: 'moon-respond', choice: 'silent' })
              }}
            >
              응답하지 않는다 · 안내 부스 조사
            </button>
          </>
        ) : (
          <p>
            이미 {c.response === 'answered' ? '응답' : '무응답'}을 선택했습니다. 선택 결과는
            유지됩니다.
          </p>
        )}
      </Overlay>
    )
  if (panel === 'moon-cancel')
    return (
      <Overlay title="확인 구역 · 내부 등록 취소" onClose={onClose}>
        <p>활성 등록 표시와 내부 해제 안내를 조사한 뒤 해당 등록을 취소하세요.</p>
        <RegistrationChoice
          caseId={c.registration === 'cancelled' ? matchingRegistration.id : caseId}
          onChange={setCaseId}
          name={c.displayName}
          disabled={c.registration !== 'active'}
        />
        <button
          className="primary full"
          disabled={c.registration !== 'active'}
          onClick={() => {
            dispatch({ type: 'moon-cancel', caseId })
            if (
              caseId === registrationCases[0].id &&
              ['moon-active-record', 'moon-cancel-note'].every((id) => state.clues.includes(id))
            )
              onClose()
          }}
        >
          활성 등록 취소
        </button>
        <p className="notice" role="status">
          {state.notice}
        </p>
        <details>
          <summary>내부 조사 기록 확인</summary>
          {notebook}
        </details>
      </Overlay>
    )
  if (panel === 'moon-registration')
    return (
      <Overlay title="안내 부스 · 등록 건 대조" onClose={onClose} wide>
        <p>
          발신 식별자·차량·등록 건·표시 이름·수동 첨부 원본을 대조하세요. 같은 시각만으로 판단하면
          안 됩니다.
        </p>
        <p className="muted">
          방송 재생 / 외부 수신 / 수동 첨부 조사:{' '}
          {moonEvidence.filter((id) => state.clues.includes(id)).length}/3
        </p>
        <RegistrationChoice
          caseId={c.matched ? matchingRegistration.id : caseId}
          onChange={setCaseId}
          name={c.displayName}
          disabled={c.matched}
        />
        <button
          className="primary full"
          disabled={c.matched}
          onClick={() => dispatch({ type: 'moon-match', caseId })}
        >
          {c.matched ? '등록 건 대조 완료' : '등록 건·첨부 원본 대조'}
        </button>
        <button
          className="primary full"
          disabled={!c.matched || c.externalPaused || c.registration === 'active'}
          onClick={() => dispatch({ type: 'moon-process' })}
        >
          {c.externalPaused
            ? '외부 유도 보류 완료'
            : c.response === 'answered'
              ? '취소된 등록의 외부 유도 보류'
              : '미확인 등록 보류'}
        </button>
        <p className="notice" role="status">
          {state.notice}
        </p>
        <details>
          <summary>열차·방송·첨부 증거 비교</summary>
          {notebook}
        </details>
      </Overlay>
    )
  if (panel === 'moon-route-controller')
    return (
      <Overlay title="D-02 · 현장 통행 절차" onClose={onClose}>
        <p className="muted">
          등록 처리만으로는 열리지 않습니다. 승강장 M-12 현장 표식을 별도로 조사하고 문 번호와 승인
          방식을 맞추세요.
        </p>
        <label className="moon-field">
          통행 문
          <select
            value={c.routeOpen ? maintenanceRule.door : door}
            disabled={c.routeOpen}
            onChange={(e) => setDoor(e.target.value)}
            aria-label="통행 문"
          >
            <option>D-03</option>
            <option>D-02</option>
          </select>
        </label>
        <label className="moon-field">
          승인 방식
          <select
            value={c.routeOpen ? maintenanceRule.mode : mode}
            disabled={c.routeOpen}
            onChange={(e) => setMode(e.target.value)}
            aria-label="승인 방식"
          >
            <option value="remote">원격 승인</option>
            <option value="local">지역 수동 승인</option>
          </select>
        </label>
        <button
          className="primary full"
          disabled={c.routeOpen}
          onClick={() => dispatch({ type: 'moon-unlock', door, mode })}
        >
          {c.routeOpen ? '정비 통로 개방됨' : '현장 통행 조건 대조'}
        </button>
        {c.routeOpen && (
          <button
            className="primary full"
            onClick={() => {
              onClose()
              dispatch({ type: 'moon-exit' })
            }}
          >
            열린 정비 통로 앞에서 이동 확인
          </button>
        )}
        <p className="notice" role="status">
          {state.notice}
        </p>
        <details>
          <summary>현장 표식과 기록</summary>
          {notebook}
        </details>
      </Overlay>
    )
  return null
}

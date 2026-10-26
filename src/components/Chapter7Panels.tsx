import type { Dispatch } from 'react'
import type { Action, State } from '../game/engine'
import { RESPONSE_SECONDS, BRACE_SECONDS, remaining7, rearOpen } from '../game/chapter7'
import { Overlay } from './Overlay'
import { Button } from './ui/Button'
import { DismissButton } from './ui/TouchActionButton'
import type { Field7Action } from './useChapter7Field'
export const Chapter7Panels = ({
  state: s,
  panel,
  onClose,
  dispatch,
  onWork,
}: {
  state: State
  panel: string | null
  onClose: () => void
  dispatch: Dispatch<Action>
  onWork: (a: Field7Action) => void
}) => {
  const c = s.chapter7
  const act = (a: Action) => {
    dispatch(a)
    onClose()
  }
  if (panel === 's7-start')
    return (
      <Overlay title="에피소드 2 시작" onClose={onClose}>
        <p>
          지상 대피소 도착 결과는 그대로 보존됩니다. 현재 자원·표시 이름·동행과 실제 기록을
          이어갑니다. 새 게임을 시작하지 않습니다.
        </p>
        <Button full onClick={() => act({ type: 's7-start' })}>
          에피소드 2 시작 · 기존 기록 이어가기
        </Button>
      </Overlay>
    )
  if (!c.started) return null
  if (c.phase === 'failed')
    return (
      <Overlay title="대응 중단 · 외부문 방어 한계" footerClose={false}>
        <p>
          외부 반입문이 더는 버티지 못해 작업을 중단했습니다. 안전 체크포인트에서 자원을 잃지 않고
          다시 준비할 수 있습니다.
        </p>
        <p>
          대응 시작 직전으로 돌아갑니다. 이번 시도의 물자·문·시간만 복구하며 휴식·이름·이전
          기록·확인한 사실은 유지합니다.
        </p>
        <label className="my-4 flex gap-3">
          <input
            type="checkbox"
            checked={c.relaxed}
            onChange={(e) => dispatch({ type: 's7-assist', enabled: e.target.checked })}
          />
          시간 압박 완화 · 시간 감소 없음 / 불이익 없음
        </label>
        <Button full onClick={() => act({ type: 's7-retry' })}>
          안전 체크포인트에서 재시도
        </Button>
      </Overlay>
    )
  if (panel === 's7-response')
    return (
      <Overlay title="현장 대응 · 작업과 재시도 규칙" onClose={onClose}>
        <p>
          ① 지지대 한 세트 운반 → ② 설치 위치 확정 → ③ 후면 통로 확보 → ④ 안전측 방화문 폐쇄·빗장
          고정.
        </p>
        <p>
          입구 우선: +{BRACE_SECONDS}초를 확보하고 중앙 우회로에서 수동 윈치를 조작합니다. 후면
          우선: 지름길을 먼저 열고 방화문 격리를 서두릅니다.
        </p>
        <p>
          기본 여유 {RESPONSE_SECONDS}초. 대화·단톡방·기록·메뉴·포커스 이탈·탐색 복귀 대기에는
          시간이 정지합니다. 실패하면 대응 시작 전으로 복구하며 자원 손실은 없습니다.
        </p>
        <label className="my-4 flex gap-3">
          <input
            type="checkbox"
            checked={c.relaxed}
            onChange={(e) => dispatch({ type: 's7-assist', enabled: e.target.checked })}
          />
          시간 압박 완화 · 시간 감소 없음 / 불이익 없음
        </label>
        {c.phase === 'prepare' && (
          <Button full onClick={() => act({ type: 's7-begin' })}>
            현장 대응 시작
          </Button>
        )}
        {c.phase === 'respond' && (
          <p>남은 활성 시간 {Math.ceil(remaining7(c))}초 · 닫아도 작업은 초기화되지 않습니다.</p>
        )}
      </Overlay>
    )
  if (panel === 's7-entrance' || panel === 's7-rear') {
    const destination = panel === 's7-entrance' ? 'entrance' : 'rear'
    return (
      <Overlay
        title={destination === 'entrance' ? '입구 보강 설치 확인' : '후면 지름길 설치 확인'}
        onClose={onClose}
      >
        <p>
          {destination === 'entrance'
            ? '반입문에 지지대를 고정하면 유지 여유가 120초 증가합니다. 후면은 중앙 우회로의 수동 윈치로 열어야 합니다.'
            : '뒤틀린 후면 문을 지지대로 열어 지름길을 확보합니다. 입구 추가 시간은 없으며 안쪽 방화문을 닫고 빗장으로 고정해야 합니다.'}
        </p>
        <p>
          설치 확정 후에는 위치를 바꿀 수 없습니다. 설치 전에는 선반에서 반납할 수 있습니다.
          이동·메뉴로 현장 작업을 중단하면 운반 상태가 유지됩니다.
        </p>
        <Button
          full
          disabled={c.kit !== 'carried' || c.phase !== 'respond'}
          onClick={() => {
            onClose()
            onWork({ type: 's7-install', destination })
          }}
        >
          이 위치에 지지대 설치 · 확정 후 현장 작업
        </Button>
        {c.kit !== 'carried' && (
          <p>먼저 선반에서 지지대를 집으세요. 이미 설치했다면 추가 설치할 수 없습니다.</p>
        )}
      </Overlay>
    )
  }
  if (panel === 's7-finish')
    return (
      <Overlay title="다음 이동 준비 완료 확인" onClose={onClose}>
        <p>
          후면 이동로 {rearOpen(c) ? '확보' : '미확보'} · 방화문{' '}
          {c.fireDoor === 'bolted' ? '고정 / 안전 확보' : '고정 전'} ·{' '}
          {c.ready ? '이동 준비 확인 완료' : '준비 확인 전'}
        </p>
        <p>
          {s.chapter6.result?.npcTogether
            ? '동행 생존자와 함께 준비 구획에 있습니다.'
            : '비동행자의 마지막 확인 위치: ' + s.chapter6.result?.npcLocation}
        </p>
        <p>챕터 8은 아직 구현되지 않았습니다. 이 확인은 챕터 7 준비 완료만 저장합니다.</p>
        <Button
          full
          disabled={c.phase !== 'secured' || !c.ready}
          onClick={() => act({ type: 's7-complete' })}
        >
          다음 이동 준비 완료
        </Button>
      </Overlay>
    )
  if (panel === 's7-completion')
    return (
      <Overlay title="챕터 7 완료 · 안전하지 않은 대피소" onClose={onClose} footerClose={false}>
        <p>
          {c.priority === 'entrance'
            ? '입구 보강 → 중앙 우회 → 윈치 개방'
            : '후면 보강 → 지름길 확보'}{' '}
          → 방화문 격리 → 다음 이동 준비 완료
        </p>
        <p>
          {s.chapter6.result?.npcTogether
            ? '생존자와 함께 후면 준비 구획에 도착했습니다.'
            : s.chapter6.result?.npcLocation}
        </p>
        <p>
          대피소는 휴식과 방어를 제공했습니다. 에피소드 1 도착 기록은 보존됩니다. 챕터 8은
          미구현입니다.
        </p>
        <DismissButton full onDismiss={onClose}>
          완료 기록 저장 · 현장으로
        </DismissButton>
      </Overlay>
    )
  return null
}

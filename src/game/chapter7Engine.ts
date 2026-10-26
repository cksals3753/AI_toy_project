import type { State, Action } from './engine'
import {
  defaultChapter7,
  chapter7Objects,
  chapter7Questions,
  answer7,
  rearOpen,
  remaining7,
} from './chapter7'
import { worlds } from './world'
export type Chapter7Action =
  | { type: 's7-start' }
  | { type: 's7-rest' }
  | { type: 's7-observe' }
  | { type: 's7-begin' }
  | { type: 's7-assist'; enabled: boolean }
  | { type: 's7-kit' }
  | { type: 's7-install'; destination: 'entrance' | 'rear' }
  | { type: 's7-winch' }
  | { type: 's7-firedoor' }
  | { type: 's7-tick'; dt: number }
  | { type: 's7-retry' }
  | { type: 's7-ready' }
  | { type: 's7-complete' }
const say = (s: State, text: string, who: 'player' | 'survivor' = 'player'): State => ({
  ...s,
  notice: text,
  scene: [{ who, text }],
  sceneIndex: 0,
})
export const reduceChapter7 = (s: State, a: Action): State | undefined => {
  const c = s.chapter7
  if (a.type === 's7-start') {
    if (c.started || !s.chapter6.completed || !s.chapter6.result) return s
    return say(
      {
        ...s,
        area: 'shelterDefense',
        position: worlds.shelterDefense.spawn,
        view3d: null,
        stage: 'explore',
        chapter7: { ...defaultChapter7, started: true, warnings: [] },
      },
      '지상 대피소에서 숨을 돌렸다. 지하에서 벗어난 것은 분명하다. 의자에서 쉬고 주변을 살펴보자. 위협 시간은 아직 흐르지 않는다.',
    )
  }
  if (!c.started || s.area !== 'shelterDefense') return undefined
  if (a.type === 's7-assist')
    return {
      ...s,
      chapter7: { ...c, relaxed: a.enabled },
      notice: a.enabled
        ? '시간 압박 완화 · 남은 시간이 줄지 않습니다. 진행과 기록에 불이익이 없습니다.'
        : '시간 압박 적용 · 활성 탐색 시간에만 감소합니다.',
    }
  if (a.type === 's7-tick') {
    if (c.phase !== 'respond' || c.relaxed || !Number.isFinite(a.dt) || a.dt <= 0) return s
    const elapsed = c.elapsed + Math.min(a.dt, 0.1)
    const next = { ...c, elapsed }
    const left = remaining7(next)
    const warnings = [60, 30, 15].filter((n) => left <= n && !c.warnings.includes(n))
    return {
      ...s,
      chapter7: {
        ...next,
        phase: left <= 0 ? 'failed' : 'respond',
        warnings: [...c.warnings, ...warnings],
      },
      notice:
        left <= 0
          ? '외부 반입문의 방어 한계에 도달했습니다. 대응 작업을 중단하고 안전 체크포인트에서 재시도하세요. 자원 손실은 없습니다.'
          : warnings.length
            ? `⚠ 반입문 유지 여유 ${Math.ceil(left)}초 · 후면 통로와 방화문을 확보하세요.`
            : s.notice,
    }
  }
  if (a.type === 's7-retry') {
    if (c.phase !== 'failed') return s
    return say(
      {
        ...s,
        position: worlds.shelterDefense.spawn,
        view3d: null,
        chapter7: {
          ...defaultChapter7,
          started: true,
          rested: true,
          observed: true,
          phase: 'prepare',
          relaxed: c.relaxed,
          attempt: c.attempt + 1,
          warnings: [],
        },
      },
      '대응 시작 직전으로 돌아왔습니다. 이번 시도의 물자·설치·문·시간을 복구했습니다. 휴식, 이름, 이전 기록과 이미 확인한 사실은 유지됩니다. 관측창에서 다시 시작하세요.',
    )
  }
  if (c.phase === 'failed' || c.phase === 'complete') return s
  if (a.type === 'inspect') {
    const o = chapter7Objects.find((o) => o.id === a.id)
    if (!o) return s
    return say({ ...s, clues: s.clues.includes(o.id) ? s.clues : [...s.clues, o.id] }, o.clue)
  }
  if (a.type === 'ask') {
    if (!c.observed) return s
    const q = chapter7Questions.find((q) => q.id === a.id)
    if (!q || !s.clues.includes(q.requires) || s.asked.includes(q.id)) return s
    return { ...s, asked: [...s.asked, q.id], messages: [...s.messages, ...answer7(q.id)] }
  }
  if (a.type === 's7-rest') {
    if (c.rested)
      return say(s, '대피소에서 휴식과 충전을 마쳤다. 반복 휴식으로 자원이 추가되지는 않는다.')
    return say(
      {
        ...s,
        health: Math.max(30, s.health),
        battery: Math.max(20, s.battery),
        chapter7: { ...c, rested: true, phase: 'prepare' },
      },
      `대피소에서 쉬었다. 체력 +${Math.max(0, 30 - s.health)}, 배터리 +${Math.max(0, 20 - s.battery)}%. ${s.chapter6.result?.npcTogether ? '함께 온 생존자도 의자에서 쉬고 있다.' : '다음 이동은 혼자 준비한다. 비동행자의 마지막 확인 기록은 그대로 남아 있다.'}`,
    )
  }
  if (a.type === 's7-observe') {
    if (!c.rested || !chapter7Objects.every((o) => s.clues.includes(o.id)))
      return say(
        s,
        '먼저 휴식하고 반입문·후면 문·물자 선반을 살펴보세요. 안전하게 읽을 시간은 충분합니다.',
      )
    if (c.observed) return s
    return say(
      {
        ...s,
        chapter7: { ...c, observed: true },
        messages: [
          ...s.messages,
          {
            who: 'player',
            text: '지상 대피소에서 쉬었어요. 관측창 밖에 감염자가 보여요. 여기서 다음 이동을 준비하려고 해요.',
          },
          { who: 'kang', text: '입구를 버티며 대응을 기다리는 게 낫지 않을까요?' },
          {
            who: 'seo',
            text: '그 안의 구조는 모르겠어요. 버틸 수 있는 문과 실제 나갈 수 있는 길을 현장에서 비교해요.',
          },
          {
            who: 'min',
            text: '보통 비상문은 안에서 열 수 있지 않나요? 지금 상태는 직접 봐야겠지만요.',
          },
          { who: 'oh', text: '남은 보강 물자와 쓸 수 있는 설비부터 확인해.' },
        ],
      },
      '관측창 밖에 감염자 한 명이 보인다. 반입문 쪽으로 접근할 수 있다. 아직 대응 시간은 시작되지 않았다. 작업과 재시도 규칙을 확인하고 명시적으로 시작하자.',
    )
  }
  if (a.type === 's7-begin') {
    if (!c.observed || c.phase !== 'prepare') return s
    return {
      ...s,
      chapter7: { ...c, phase: 'respond' },
      notice: '대응 시작 · 활성 탐색 시간만 흐릅니다. 지지대 한 세트의 설치 위치를 선택하세요.',
    }
  }
  if (c.phase !== 'respond' && c.phase !== 'secured') return s
  if (a.type === 's7-kit') {
    if (c.priority) return s
    return {
      ...s,
      chapter7: { ...c, kit: c.kit === 'rack' ? 'carried' : 'rack' },
      notice:
        c.kit === 'rack'
          ? '지지대 1/1 운반 중 · 설치 전에는 선반에 반납 가능.'
          : '지지대를 선반에 반납했습니다. 아직 우선순위는 확정되지 않았습니다.',
    }
  }
  if (a.type === 's7-install') {
    if (c.kit !== 'carried' || c.priority) return s
    return {
      ...s,
      chapter7: { ...c, kit: a.destination, priority: a.destination },
      notice:
        a.destination === 'entrance'
          ? '입구 지지대 고정 · 유지 여유 +120초. 중앙 우회로의 수동 윈치로 후면 문을 여세요.'
          : '후면 지지대 고정 · 지름길 개방. 통로 안쪽 방화문을 닫고 빗장을 고정하세요.',
    }
  }
  if (a.type === 's7-winch') {
    if (c.priority !== 'entrance' || c.winch === 'open') return s
    return {
      ...s,
      chapter7: { ...c, winch: c.winch === 'pinned' ? 'released' : 'open' },
      notice:
        c.winch === 'pinned'
          ? '윈치 고정핀 해제 · 이제 손잡이를 돌려 문을 당길 수 있습니다.'
          : '수동 윈치로 후면 문을 열고 걸쇠에 고정했습니다.',
    }
  }
  if (a.type === 's7-firedoor') {
    if (!c.priority || !rearOpen(c) || c.fireDoor === 'bolted' || s.position.x < 760)
      return say(s, '후면 이동로를 확보하고 안전한 안쪽 통로로 이동한 뒤 조작하세요.')
    const fireDoor = c.fireDoor === 'open' ? 'closed' : 'bolted'
    return {
      ...s,
      chapter7: { ...c, fireDoor, phase: fireDoor === 'bolted' ? 'secured' : c.phase },
      notice:
        fireDoor === 'closed'
          ? '방화문 폐쇄 · 빗장을 고정하면 외부 위협을 격리할 수 있습니다.'
          : '방화문 빗장 고정 · 안전 확보. 타이머 종료. 준비 구획에서 천천히 동행/단독 준비를 확인하세요.',
    }
  }
  if (a.type === 's7-ready') {
    if (c.phase !== 'secured' || s.position.x < 760) return s
    return say(
      { ...s, chapter7: { ...c, ready: true } },
      s.chapter6.result?.npcTogether
        ? '저도 안전한 준비 구획에 왔어요. 같이 이동할 준비가 됐어요.'
        : '후면 통로와 장비를 확인했다. 혼자 다음 이동을 준비할 수 있다.',
      s.chapter6.result?.npcTogether ? 'survivor' : 'player',
    )
  }
  if (a.type === 's7-complete') {
    if (c.phase !== 'secured' || !c.ready || s.position.x < 760) return s
    return say(
      { ...s, chapter7: { ...c, phase: 'complete' } },
      `챕터 7 완료 · ${c.priority === 'entrance' ? '입구 보강 → 중앙 우회 → 윈치 개방' : '후면 보강 → 지름길 확보'} · 방화문 격리 / 다음 이동 준비 완료. 대피소는 휴식과 방어를 제공했다. 챕터 8은 아직 구현되지 않았습니다.`,
    )
  }
  return undefined
}

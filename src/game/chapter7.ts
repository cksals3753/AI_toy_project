import type { Message } from './dialogue'

export const RESPONSE_SECONDS = 180
export const BRACE_SECONDS = 120
export type Chapter7 = {
  started: boolean
  rested: boolean
  observed: boolean
  phase: 'rest' | 'prepare' | 'respond' | 'failed' | 'secured' | 'complete'
  kit: 'rack' | 'carried' | 'entrance' | 'rear'
  priority: 'entrance' | 'rear' | null
  winch: 'pinned' | 'released' | 'open'
  fireDoor: 'open' | 'closed' | 'bolted'
  elapsed: number
  relaxed: boolean
  ready: boolean
  attempt: number
  warnings: number[]
}
export const defaultChapter7: Chapter7 = {
  started: false,
  rested: false,
  observed: false,
  phase: 'rest',
  kit: 'rack',
  priority: null,
  winch: 'pinned',
  fireDoor: 'open',
  elapsed: 0,
  relaxed: false,
  ready: false,
  attempt: 0,
  warnings: [],
}
export const rearOpen = (c: Chapter7) => c.kit === 'rear' || c.winch === 'open'
export const remaining7 = (c: Chapter7) =>
  Math.max(0, RESPONSE_SECONDS + (c.kit === 'entrance' ? BRACE_SECONDS : 0) - c.elapsed)
export const chapter7Objects = [
  {
    id: 's7-entrance-note',
    title: '반입문 손상',
    clue: '외부 반입문의 잠금부가 손상됐다. 지지대를 이곳에 설치하면 버티는 여유가 120초 늘어난다. 후면 문은 중앙 우회로의 수동 윈치로 열어야 한다.',
  },
  {
    id: 's7-rear-note',
    title: '후면 비상문',
    clue: '뒤틀린 후면 문은 그냥 밀어 열 수 없다. 지지대 한 세트를 설치하면 지름길이 열린다. 입구의 추가 여유는 없으므로 안전한 안쪽 방화문을 닫고 빗장으로 고정해야 한다.',
  },
  {
    id: 's7-kit-note',
    title: '보강재 한 세트',
    clue: '금속 지지대는 한 세트다. 설치 전에는 선반에 반납할 수 있다. 입구 방어와 후면 통로 중 먼저 확보할 곳에 설치한다. 어느 경로든 추가 물자나 과거 소지품 없이 마칠 수 있다.',
  },
]
export const chapter7Questions = [
  { id: 's7-support', label: '지원이 온다는 확인을 받았나요?', requires: 's7-entrance-note' },
  { id: 's7-warped', label: '후면 문이 뒤틀려 그냥 밀어서는 안 열려요.', requires: 's7-rear-note' },
  { id: 's7-one-kit', label: '지지대는 한 세트뿐이에요.', requires: 's7-kit-note' },
]
export const answer7 = (id: string): Message[] => {
  const q = chapter7Questions.find((q) => q.id === id)!
  const replies: Record<string, Message[]> = {
    's7-support': [
      {
        who: 'kang',
        text: '도착 시간을 확인받은 건 아니에요. 입구를 버틸 수 있으면 기다릴 여지가 있다는 뜻이었어요.',
      },
      {
        who: 'seo',
        text: '지원이 확정되지 않았다면 기다리는 것만 계획으로 삼기는 어려워요. 현장에서 확보할 수 있는 길도 확인해요.',
      },
    ],
    's7-warped': [
      {
        who: 'min',
        text: '보통 비상문 생각으로 말했어요. 지금 뒤틀려 있다는 건 몰랐네요. 현장 장치를 먼저 봐야겠어요.',
      },
    ],
    's7-one-kit': [
      {
        who: 'oh',
        text: '한 세트라면 양쪽에 쓸 수는 없겠군. 설치 안 한 쪽을 움직일 고정 설비가 있는지 봐. 내가 그 안을 볼 수 있는 건 아니야.',
      },
    ],
  }
  return [{ who: 'player', text: q.label }, ...replies[id]]
}
export const objective7 = (c: Chapter7) => {
  if (c.phase === 'complete')
    return '챕터 7 완료 · 다음 이동 준비 완료. 챕터 8은 아직 구현되지 않았습니다.'
  if (c.phase === 'failed') return '반입문 방어 한계 · 대응 시작 전 체크포인트에서 재시도하세요.'
  if (c.phase === 'secured')
    return c.ready
      ? '후면 준비 구획에서 다음 이동 준비 완료를 확인하세요.'
      : '안전 확보 · 후면 준비 구획에서 동행 또는 단독 준비를 확인하세요.'
  if (!c.rested) return '휴식 의자에서 쉬고 주변을 확인하세요. 아직 위협 시간은 흐르지 않습니다.'
  if (!c.observed) return '반입문과 후면 문을 살핀 뒤 관측창에서 외부 접근을 확인하세요.'
  if (c.phase === 'prepare') return '대응 규칙을 확인하고 관측창에서 현장 대응 시작을 선택하세요.'
  if (!c.priority) return '선반에서 지지대를 집어 입구 또는 후면 문에 설치하세요.'
  if (!rearOpen(c)) return '중앙 우회로로 이동해 수동 윈치의 고정핀과 손잡이를 조작하세요.'
  return '후면 통로를 지나 안전한 쪽에서 방화문을 닫고 빗장을 고정하세요.'
}
export const normalizeChapter7 = (value: unknown, eligible: boolean): Chapter7 => {
  if (!eligible || !value || typeof value !== 'object') return { ...defaultChapter7, warnings: [] }
  const v = value as Partial<Chapter7>
  if (v.started !== true) return { ...defaultChapter7, warnings: [] }
  const kit = ['rack', 'carried', 'entrance', 'rear'].includes(v.kit ?? '') ? v.kit! : 'rack'
  const priority = kit === 'entrance' || kit === 'rear' ? kit : null
  const winch = ['pinned', 'released', 'open'].includes(v.winch ?? '') ? v.winch! : 'pinned'
  const fireDoor = ['open', 'closed', 'bolted'].includes(v.fireDoor ?? '') ? v.fireDoor! : 'open'
  const rested = v.rested === true,
    observed = rested && v.observed === true
  let phase = ['rest', 'prepare', 'respond', 'failed', 'secured', 'complete'].includes(
    v.phase ?? '',
  )
    ? v.phase!
    : 'rest'
  const secured = !!priority && (kit === 'rear' || winch === 'open') && fireDoor === 'bolted'
  const ready = secured && v.ready === true
  if (!rested) phase = 'rest'
  else if (!observed) phase = 'prepare'
  else if (phase === 'rest') phase = 'prepare'
  if ((phase === 'secured' || phase === 'complete') && !secured) phase = 'prepare'
  if (phase === 'complete' && !ready) phase = 'secured'
  const elapsed =
    typeof v.elapsed === 'number' && Number.isFinite(v.elapsed)
      ? Math.min(300, Math.max(0, v.elapsed))
      : 0
  if (
    phase === 'respond' &&
    !v.relaxed &&
    elapsed >= RESPONSE_SECONDS + (kit === 'entrance' ? BRACE_SECONDS : 0)
  )
    phase = 'failed'
  return {
    started: true,
    rested,
    observed,
    phase,
    kit,
    priority,
    winch,
    fireDoor,
    elapsed,
    relaxed: v.relaxed === true,
    ready,
    attempt: Number.isSafeInteger(v.attempt) ? Math.max(0, v.attempt!) : 0,
    warnings: Array.isArray(v.warnings) ? v.warnings.filter((n) => [60, 30, 15].includes(n)) : [],
  }
}

export const companionRestLine = (help: string | undefined) =>
  help === 'helped'
    ? '처음 부축해 준 덕분에 여기까지 왔어요. 여기서 쉬며 기다릴게요.'
    : help === 'invited'
      ? '함께 가자고 해 줘서 고마워요. 준비되면 같이 움직일게요.'
      : '함께 지상까지 왔네요. 여기서 쉬며 기다릴게요.'

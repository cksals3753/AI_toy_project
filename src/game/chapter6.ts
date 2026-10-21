import type { Message } from './dialogue'
import type { State } from './engine'

export const maintenanceAreas = ['maintenance', 'recovery', 'shelter'] as const
export const isChapter6Area = (area: string) => maintenanceAreas.includes(area as never)
export type EscapeRoute = 'manual' | 'automatic'
export const finalObjects = [
  {
    id: 'final-map',
    area: 'maintenance',
    title: '현행 지상 대피도',
    clue: '현장 갱신 대피도: S-01은 지상 대피소 정문으로 이어지는 수동 대피 경로. G-01은 지상이 아닌 등록 확인 구역. 그 내부에는 지상 S-02 비상 해치가 있다. D-02는 지나온 문래역 연결문이다.',
  },
  {
    id: 'final-manual',
    area: 'maintenance',
    title: '지역 설비 운용 설명판',
    clue: 'S-01: 전원 유지 / 현장 수동 승인. G-01: 전원 유지 / 외부 자동 승인. 전체 전원을 끄면 두 문 모두 열리지 않는다. 외부 안내와 지역 설비 전원은 별개다. 이 구역의 수동 대피는 휴대폰·소지품을 요구하지 않는다.',
  },
  {
    id: 'final-window',
    area: 'maintenance',
    title: 'G-01 점검창',
    clue: '창 너머 표식은 “등록 확인 구역 / 진입 뒤 차단문 폐쇄”. 지상 출구가 아니다. 내부 해제 장치와 S-02 비상 해치 표식이 보인다. 녹색 개방등은 목적지의 안전을 보장하지 않는다.',
  },
  {
    id: 'recovery-note',
    area: 'recovery',
    title: '내부 복구 안내',
    clue: 'S-02 비상 해치 해제 순서: 배수 상태를 조사 → 배수 밸브 조작 → 수위 낮음 확인 → 빗장 해제. 내부에서 모두 조작 가능. 휴대폰 배터리·열쇠·장갑이 필요하지 않다. 동행자는 안전 의자에서 기다린 뒤 함께 이동한다.',
  },
  {
    id: 'recovery-water',
    area: 'recovery',
    title: '배수 상태창',
    clue: '바닥 배수로에 물이 고여 해치 빗장에 압력이 걸렸다. 배수 밸브를 열어야 한다. 배수 설비는 지역 전원으로 작동하며 전화기 배터리와 무관하다.',
  },
  {
    id: 'shelter-sign',
    area: 'shelter',
    title: '지상 대피소 내부 표식',
    clue: '지상 대피소 안쪽. 마른 바닥과 대기 의자, 외부로 열린 환기창이 보인다. 도착 확인대는 대피소 내부에 있다. 안내방송만 듣고 도착했다고 판정하지 않는다.',
  },
] as const
export const finalQuestions = [
  {
    id: 'final-route-question',
    requires: 'final-map',
    label: '자동 경로는 지상이 아니라 확인 구역인데요?',
  },
  {
    id: 'final-power-question',
    requires: 'final-manual',
    label: '전체 전원과 외부 승인은 별개라고 적혀 있어요.',
  },
  {
    id: 'final-window-question',
    requires: 'final-window',
    label: '개방 표시 뒤에 차단문 폐쇄 안내가 있어요.',
  },
] as const
export const finalAnswer = (id: string): Message[] => {
  const q = finalQuestions.find((q) => q.id === id)!
  return [
    { who: 'player', text: q.label },
    ...(id === 'final-route-question'
      ? [
          {
            who: 'kang',
            text: '일단 확인을 받으라는 뜻이었어요. 지금 그 지도를 직접 보고 있는 건 아니고요.',
          },
          {
            who: 'min',
            text: '제가 기억하던 출구와 다르네요. 오늘의 현장 지도를 따르는 게 맞겠어요.',
          },
        ]
      : id === 'final-power-question'
        ? [
            {
              who: 'seo',
              text: '그 설명이라면 지역 전원은 남겨야겠네요. 목적지와 승인 방식도 같이 대조해요.',
            },
            {
              who: 'oh',
              text: '문 여는 전원까지 끄면 곤란하죠. 현장 장치에 적힌 조건을 확인해요.',
            },
          ]
        : [
            {
              who: 'kang',
              text: '잠깐 확인하는 절차겠죠. 지상으로 바로 열린다고까지 한 건 아니에요.',
            },
            {
              who: 'seo',
              text: '개방 표시와 목적지는 달라요. 지금 확인한 폐쇄 안내도 기록해 둬요.',
            },
          ]),
  ]
}
export type EpisodeResult = {
  route: EscapeRoute
  health: number
  battery: number
  inventory: string[]
  clues: string[]
  clueTexts: Record<string, string>
  messages: Message[]
  asked: string[]
  npcTogether: boolean
  npcHelp: string
  npcLocation: string
  choices: string[]
  facts: string[]
  unknowns: string[]
  completedAt: string
}
export type Chapter6 = {
  started: boolean
  settings: { door: string; mode: string; power: boolean } | null
  route: EscapeRoute | null
  drained: boolean
  boltOpen: boolean
  completed: boolean
  result: EpisodeResult | null
}
export const defaultChapter6: Chapter6 = {
  started: false,
  settings: null,
  route: null,
  drained: false,
  boltOpen: false,
  completed: false,
  result: null,
}
export const routeEvidence = ['final-map', 'final-manual']
export const finalObjective = (s: State) => {
  const c = s.chapter6
  if (c.completed)
    return '에피소드 1 완료 · 지상 대피소에 도착했습니다. 저장된 결과와 기록을 확인하세요.'
  if (s.area === 'shelter') return '대피소 안쪽의 도착 확인대를 조사해 이번 여정을 마무리하세요.'
  if (s.area === 'recovery')
    return !s.clues.includes('recovery-note')
      ? '내부 복구 안내와 배수 상태창을 조사하세요.'
      : !c.drained
        ? '배수 상태를 확인하고 밸브를 조작하세요.'
        : !c.boltOpen
          ? '수위가 낮아졌습니다. 해치 빗장을 해제하세요.'
          : '열린 비상 해치를 통해 동행자와 함께 지상으로 이동하세요.'
  return !routeEvidence.every((id) => s.clues.includes(id))
    ? '현행 대피도와 지역 설비 설명판을 조사하고 단톡방 주장과 비교하세요.'
    : !c.settings
      ? '제어반에서 문·승인 방식·전원을 대조하세요. 이동은 별도 확인합니다.'
      : '현장 기록을 다시 확인한 뒤 경로 이동을 확정하세요.'
}
export const normalizeChapter6 = (value: unknown, eligible: boolean): Chapter6 => {
  if (!eligible || !value || typeof value !== 'object') return { ...defaultChapter6 }
  const c = value as Partial<Chapter6>
  const started = c.started === true
  if (!started) return { ...defaultChapter6 }
  const settings =
    c.settings &&
    ((c.settings.door === 'S-01' && c.settings.mode === 'local') ||
      (c.settings.door === 'G-01' && c.settings.mode === 'remote')) &&
    c.settings.power === true
      ? c.settings
      : null
  const route = c.route === 'manual' || c.route === 'automatic' ? c.route : null
  const r = c.result
  const validResult = !!(
    r &&
    route !== null &&
    r.route === route &&
    Number.isInteger(r.health) &&
    r.health >= 0 &&
    r.health <= 100 &&
    Number.isInteger(r.battery) &&
    r.battery >= 0 &&
    r.battery <= 100 &&
    ['inventory', 'clues', 'asked', 'choices', 'facts', 'unknowns'].every(
      (k) =>
        Array.isArray(r[k as keyof EpisodeResult]) &&
        (r[k as keyof EpisodeResult] as unknown[]).every((x) => typeof x === 'string'),
    ) &&
    r.clueTexts &&
    typeof r.clueTexts === 'object' &&
    r.clues.every((id) => typeof r.clueTexts[id] === 'string') &&
    Array.isArray(r.messages) &&
    r.messages.every((m) => m && typeof m.who === 'string' && typeof m.text === 'string') &&
    typeof r.npcTogether === 'boolean' &&
    typeof r.npcLocation === 'string' &&
    typeof r.npcHelp === 'string' &&
    typeof r.completedAt === 'string'
  )
  const completed = c.completed === true && validResult
  return {
    started,
    settings,
    route,
    drained: route === 'automatic' && c.drained === true,
    boltOpen: route === 'automatic' && c.drained === true && c.boltOpen === true,
    completed,
    result: completed ? structuredClone(r!) : null,
  }
}

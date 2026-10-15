import { trainEvidence } from './trainEvidence'
import { episode } from './data'
import type { Message } from './dialogue'

// Fictional equipment. These immutable rules are independent of dialogue providers.
export const trainLinks = [
  {
    id: 'relay',
    mark: 'R-01 / 객실 중계기',
    identifier: 'CAB-R01',
    description: '정차 요청을 전달하는 객실 내부 중계 연결',
    required: true,
  },
  {
    id: 'external',
    mark: 'X-09 / 외부 송신기',
    identifier: trainEvidence.external,
    description: '객실 장치 상태를 외부로 보내는 별도 송신 연결',
    required: false,
  },
  {
    id: 'power',
    mark: 'P-02 / 객실 전원',
    identifier: 'PWR-P02',
    description: '조명과 정차 요청 장치에 전원을 공급',
    required: true,
  },
] as const
export type TrainLink = (typeof trainLinks)[number]['id']
export type Chapter4 = {
  started: boolean
  links: Record<TrainLink, boolean>
  powerAdvice: boolean
  interruption: 'none' | 'interrupted' | 'restored'
  suspicion: boolean
  sync: 'idle' | 'active' | 'accepted'
  failures: number
  assisted: boolean
  arrived: boolean
  doorSeen: boolean
  entryPrompt: boolean
  completed: boolean
  destination: string
}
export const defaultChapter4: Chapter4 = {
  started: false,
  links: { relay: true, external: true, power: true },
  powerAdvice: false,
  interruption: 'none',
  suspicion: false,
  sync: 'idle',
  failures: 0,
  assisted: false,
  arrived: false,
  doorSeen: false,
  entryPrompt: false,
  completed: false,
  destination: episode.next,
}
export const isChapter4Area = (area: string) => ['trainB', 'trainRear', 'trainFront'].includes(area)
export const syncRules = {
  min: 0.28,
  max: 0.72,
  cycleSeconds: 6,
  assistedCycleSeconds: 10,
  assistAfter: 2,
} as const
export const inSyncTarget = (marker: number) =>
  Number.isFinite(marker) && marker >= syncRules.min && marker <= syncRules.max
export const trainObjects = [
  {
    id: 'train-phone',
    area: 'trainB',
    title: '좌석 아래 유실 휴대폰',
    clue: `소유자 미상. 잠금화면: “객실 중계 연결됨”. 연결 대상 ${trainEvidence.external}. 마지막 전송 ${trainEvidence.transmissions[1]}, 이전 전송 ${trainEvidence.transmissions[0]}. 단톡방 최근 메시지 시각과 일부 겹친다. 수신자의 이름은 없다. 화면 열람만 했으며 연결 요청은 실행하지 않았다.`,
  },
  {
    id: 'train-route',
    area: 'trainB',
    title: '객실 노선 표시기',
    clue: '“비상 회송 / 정차 요청 없음”. 다음 역 자동 정차는 예약되어 있지 않다. 가만히 기다린다고 정차하지 않는다. 실제 시간제한은 없다.',
  },
  {
    id: 'train-manual',
    area: 'trainRear',
    title: '가상 비상 운행 설명서',
    clue: '게임 전용 비상 운행 시스템: 정차 요청은 R-01 / CAB-R01 객실 중계기로 전달된다. P-02 / PWR-P02 객실 전원을 유지해야 패널이 작동한다. 별도 송신 연결 X-09만 분리하면 외부 명령 우선이 해제된다. 통신 연결 분리와 객실 전체 전원 차단은 서로 다르다. 모든 연결은 이 장치함에서 복구할 수 있다.',
  },
  {
    id: 'train-devices',
    area: 'trainRear',
    title: '통신 장치함 · 식별자 기록',
    clue: 'R-01 객실 중계기: CAB-R01. X-09 외부 송신기: EXT-X09. P-02 객실 전원: PWR-P02. X-09는 객실 장치 상태를 외부로 전송한다. 휴대폰 연결 대상 EXT-X09와 일치한다. 외부 수신자는 미확인이다. 표식의 글자와 기능으로 비교해야 한다.',
  },
  {
    id: 'train-stop',
    area: 'trainFront',
    title: '선두 정차 요청 패널',
    clue: '“외부 명령 우선 / 수동 요청 대기”. 객실 전원과 중계 연결이 있어야 작동하며, 외부 송신 연결을 분리해야 수동 정차 요청이 가능하다. 기관실 진입이나 직접 운전은 필요하지 않다.',
  },
] as const
export const trainOpening: Message[] = [
  {
    who: 'kang',
    time: trainEvidence.transmissions[0],
    text: '좌석 아래 휴대폰은 건드리지 마세요. 위치 추적 장치일 수 있어요.',
  },
  {
    who: 'seo',
    time: '02:31:06',
    text: '열어보더라도 연결 요청은 누르지 마세요. 화면에 뭐가 뜨는지부터 확인해요.',
  },
  {
    who: 'min',
    time: trainEvidence.transmissions[1],
    text: '이 열차는 다음 역에 자동으로 서는 거 아닌가요?',
  },
  {
    who: 'oh',
    time: '02:31:10',
    text: '정차 표시가 없으면 선두 패널을 찾아봐요. 객실 전원은 끄지 말고요. 비상 운행 장치는 평소하고 다를 수 있어요.',
  },
]
export const trainQuestions = [
  {
    id: 'train-auto-question',
    requires: 'train-route',
    label: '정차 요청이 없다고 뜨는데, 자동으로 선다는 정보는 어디서 들었어요?',
  },
  {
    id: 'train-power-question',
    requires: 'train-devices',
    label: '왜 객실 전원을 끄라고 한 거예요?',
  },
  {
    id: 'train-target-question',
    requires: 'train-phone',
    label: '이 휴대폰이 객실 상태를 어디로 보내고 있는 거죠?',
  },
  {
    id: 'train-time-question',
    requires: 'train-phone',
    label: '우리 메시지가 온 시간과 전송 기록이 겹쳐요.',
  },
] as const
export const availableTrainQuestion = (id: string, clues: string[], chapter: Chapter4) => {
  const question = trainQuestions.find((q) => q.id === id)
  return (
    !!question &&
    clues.includes(question.requires) &&
    (id !== 'train-power-question' || chapter.powerAdvice) &&
    (id !== 'train-target-question' || clues.includes('train-devices'))
  )
}
export const trainAnswer = (id: string, asked: string[], chapter: Chapter4): Message[] => {
  const question = trainQuestions.find((q) => q.id === id)!
  const reply: Record<string, Message[]> = {
    'train-auto-question': [
      {
        who: 'min',
        text: '재난 전에 타던 일반 열차를 떠올렸어요. 지금 회송 운행 기록은 보지 못했어요. 현장 표시와 다르네요.',
      },
      {
        who: 'seo',
        text: '정차 요청 없음이라는 표시는 확인됐어요. 설명서와 선두 패널 조건을 비교해요.',
      },
    ],
    'train-power-question': [
      {
        who: 'kang',
        text: '추적 신호도 같이 끊길 거라고 생각했어요. 정차 요청 장치까지 꺼지는지는 몰랐어요.',
      },
      {
        who: 'seo',
        text: asked.includes('train-auto-question')
          ? '자동 정차도 확인되지 않았고, 전원까지 끄면 요청을 못 보내요. 장치 표식별로 구분해야 해요.'
          : '전원 차단과 송신 연결 분리는 달라요. 설명서에서 정차 요청 장치의 전원 조건부터 확인해요.',
      },
    ],
    'train-target-question': [
      {
        who: 'oh',
        text: 'EXT-X09라면 외부 송신 장치 표식과 같네요. 하지만 그 너머의 수신자가 누군지는 나도 몰라요.',
      },
      {
        who: 'seo',
        text: chapter.suspicion
          ? '분리 직후의 반응도 기록해 둬요. 장치 상태를 안다는 의심과, 수신자의 신원을 확인하는 것은 별개예요.'
          : '연결 대상 장치는 대조할 수 있어요. 그 장치를 누가 받는지까지는 이 기록으로 알 수 없어요.',
      },
    ],
    'train-time-question': [
      {
        who: 'min',
        text: asked.includes('train-target-question')
          ? '대상은 외부 장치라고 했죠. 제 메시지 시각도 겹치지만 그 장치가 제 것이라는 뜻은 아니에요.'
          : '제 메시지 시각도 겹치네요. 전송 시각만으로 소유자나 수신자를 알 수는 없겠어요.',
      },
      {
        who: 'seo',
        text: '02:31:04, 02:31:08을 현장 노트에 남겨요. 같은 시각이라는 사실과 정체에 대한 추측은 구분해요.',
      },
    ],
  }
  return [{ who: 'player', text: question.label }, ...reply[id]]
}

export const normalizeChapter4 = (value: unknown): Chapter4 => {
  const c = value && typeof value === 'object' ? (value as Partial<Chapter4>) : {}
  const started = c.started === true
  const sync = started && ['idle', 'active', 'accepted'].includes(c.sync ?? '') ? c.sync! : 'idle'
  const arrived = started && sync === 'accepted' && c.arrived === true
  return {
    ...defaultChapter4,
    started,
    links: {
      relay: c.links?.relay !== false,
      external: c.links?.external !== false,
      power: c.links?.power !== false,
    },
    powerAdvice: c.powerAdvice === true,
    suspicion: c.suspicion === true,
    interruption: ['interrupted', 'restored'].includes(c.interruption ?? '')
      ? c.interruption!
      : 'none',
    sync,
    failures: Number.isInteger(c.failures) && c.failures! >= 0 ? c.failures! : 0,
    assisted: c.assisted === true,
    arrived,
    doorSeen: arrived && c.doorSeen === true,
    entryPrompt: arrived && c.entryPrompt === true && c.completed !== true,
    completed: arrived && c.doorSeen === true && c.completed === true,
    destination:
      typeof c.destination === 'string' && c.destination.trim()
        ? c.destination
        : defaultChapter4.destination,
  }
}

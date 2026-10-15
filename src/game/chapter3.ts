import type { Message } from './dialogue'
export const survivor = {
  id: 'survivor',
  name: '다친 생존자',
  role: '승강장에서 만난 사람',
  color: '#ba947b',
}
export const trains = [
  { id: 'A-17', track: '△-1', label: '열차 A', status: '대기·대피 / 운행 중지' },
  { id: 'B-04', track: '◇-2', label: '열차 B', status: '가상 비상 운행 대상' },
] as const
export const platformObjects = [
  {
    id: 'train-a',
    title: '열차 A · A-17 / △-1',
    clue: 'A-17 / 선로 △-1. 문은 열려 있고 객실 조명이 켜져 있다. 가까이 본 운전실 표식에는 “운행 중지 / 대기·대피용”이라고 쓰여 있다. 조명 전원과 운행 가능 여부는 별개다.',
  },
  {
    id: 'train-b',
    title: '열차 B · B-04 / ◇-2',
    clue: 'B-04 / 선로 ◇-2. 문은 닫혔고 객실은 어둡다. 문 옆에는 “비상 호출 / 승인 후 개방” 장치가 있다. 문이나 조명 상태만으로 운행 여부를 판단할 수 없다.',
  },
  {
    id: 'platform-record',
    title: '비상 부스 · 오늘의 운행 기록',
    clue: '오늘의 비상 운행 기록: B-04 / 선로 ◇-2 / 비상 운행 / 출발 전 선로 신호 확인 필요. A-17은 운행 중지, 대기·대피 용도. 승인 차량과 선로를 확인한 뒤 출발 요청을 접수한다.',
  },
  {
    id: 'platform-signal',
    title: '안전 난간 · 선로 신호 표식',
    clue: '안전 난간 안쪽에서 확인했다. A-17 옆에는 △-1, B-04 옆에는 ◇-2 표식이 있다. 처음 확인한 B-04의 신호는 붉었다. 비상 부스 승인 후 녹색 신호를 확인해야 출발할 수 있다. 선로로 내려갈 필요는 없다.',
  },
  {
    id: 'train-a-stop',
    title: 'A-17 선두 차량 · 운행 중지 안내',
    clue: 'A-17 운전실은 잠겨 있다. “견인 계통 차단 / 운행 중지. 객실 조명은 대피용 전원” 안내가 켜졌다. 이 열차는 출발할 수 없다. 열린 출입문으로 승강장에 돌아갈 수 있다.',
  },
] as const
export const platformOpening: Message[] = [
  {
    who: 'kang',
    text: '문 열린 열차로 타세요. 방송 기다리다가는 못 나가요. 객실 불도 켜져 있잖아요.',
  },
  {
    who: 'seo',
    text: '문이 열려 있다는 것만으로는 출발하는 열차인지 몰라요. 차량 번호부터 확인해요.',
  },
  { who: 'min', text: '이 시간대면 반대편이 먼저 출발했을 텐데요. 반대편 열차도 확인해 봐요.' },
  {
    who: 'oh',
    text: '비상 운행이면 역무원 쪽에 기록이 남아 있을 거예요. 부스부터 보세요. 거기 보관품은… 건드리지 말고요.',
  },
]
export const platformQuestions = [
  {
    id: 'platform-a-question',
    requires: 'train-a',
    label: 'A-17은 운행 중지라고 적혀 있는데요?',
    replies: [
      {
        who: 'player',
        text: 'A-17은 운행 중지라고 적혀 있는데요? 문이 열린 것과 출발 가능한 건 다른 것 같아요.',
      },
      {
        who: 'kang',
        text: '문이 열려 있다는 말은 맞잖아요. 일단 대피하라는 뜻이었어요. 출발까지 된다고 한 건 아니고요.',
      },
      { who: 'seo', text: '그 표식은 놓치면 안 되겠어요. 다른 차량 번호도 현장에서 확인해요.' },
    ],
  },
  {
    id: 'platform-today-question',
    requires: 'platform-record',
    label: '오늘 비상 운행 정보가 맞나요?',
    replies: [
      {
        who: 'player',
        text: '지금 말씀하신 건 오늘 비상 운행 정보인가요? 부스 기록은 평소 운행과 다르게 나와요.',
      },
      {
        who: 'min',
        text: '아뇨… 예전에 제가 타던 시간표 생각을 했어요. 오늘 비상 운행은 몰라요. 그 기록을 먼저 봐야겠어요.',
      },
      {
        who: 'oh',
        text: '평소 시간표는 여기서 소용없겠네요. 부스 기록의 차량과 선로를 같이 맞춰 봐요.',
      },
    ],
  },
  {
    id: 'platform-b-question',
    requires: 'platform-record',
    label: 'B-04가 출발 대상이라는 기록을 찾았어요.',
    replies: [
      {
        who: 'player',
        text: 'B-04가 출발 대상이라는 기록을 찾았어요. 출발 전 선로 신호 확인이 필요하대요.',
      },
      {
        who: 'kang',
        text: '그럼 문 여는 절차가 더 있는 거겠네요. 나는 열린 쪽으로 먼저 대피하라고 한 거예요.',
      },
      {
        who: 'seo',
        text: '차량 번호를 찾았군요. 실제 차량 옆 선로 표식과 대조하고, 승인 후에도 신호가 바뀌었는지 확인해요.',
      },
    ],
  },
] as const
export const survivorIntro: Message[] = [
  {
    who: 'survivor',
    text: '사람인 줄 확신이 안 서서 바로 말을 못 걸었어요. 뒤에서 따라온 건 저예요. 다리를 다쳐서… 기둥 뒤에 잠깐 앉았어요.',
  },
  {
    who: 'survivor',
    text: '곧 출발하는 비상 열차가 있다는 방송을 들었어요. 차량 번호까지는 못 들었어요.',
  },
  {
    who: 'player',
    text: '공격할 생각은 없어 보인다. 얼굴은 창백하고 발목에 피가 묻어 있다. 어떻게 할까?',
  },
]
export type Chapter3 = {
  started: boolean
  npc: 'unseen' | 'found' | 'helped' | 'directed' | 'invited' | 'waiting'
  aExplained: boolean
  approved: boolean
  signal: 'red' | 'changing' | 'green'
  doorOpen: boolean
  boarded: boolean
  npcBoarded: boolean
  escaped: boolean
  ending: 'none' | 'departing' | 'complete'
}
export const defaultChapter3: Chapter3 = {
  started: false,
  npc: 'unseen',
  aExplained: false,
  approved: false,
  signal: 'red',
  doorOpen: false,
  boarded: false,
  npcBoarded: false,
  escaped: false,
  ending: 'none',
}
export const approvalClues = ['train-a', 'train-b', 'platform-record', 'platform-signal']
export const isChapter3Area = (area: string) => ['platform', 'trainA', 'trainB'].includes(area)

import type { Message } from './dialogue'
export { hallObjects } from '../chat/chapter2Public'
export const hallOpening: Message[] = [
  {
    who: 'kang',
    text: '대합실에 왔군요. 왼쪽 직원 통로로 오세요. 제가 지나왔어요. 안쪽에 파란 안내등 보이죠?',
  },
  {
    who: 'seo',
    text: '잠깐. 그 불빛이 안내등인지 먼저 확인해요. 예비 회로는 살아 있을 수도 있어요. 현장 표식을 봐요.',
  },
  {
    who: 'min',
    text: '정전이면 개찰구를 그냥 밀어서 열 수 있는 거 아닌가요? 예전에는 그렇게 나갔는데…',
  },
  {
    who: 'oh',
    text: '거기서 오래 머무르지 마세요. 배터리는 얼마나 남았어요? 안내 데스크 서랍은 아직 안 잠겼을 거예요.',
  },
]
export const hallQuestions = [
  {
    id: 'hall-path',
    requires: 'hall-map',
    label: '직원 통로 끝에 뭐가 있었어요?',
    replies: [
      { who: 'player', text: '직원 통로 끝에 뭐가 있었어요? 안내도에는 설비 구역으로 나와요.' },
      {
        who: 'kang',
        text: '설비 구역을 지나면 연결돼요. 제가 지나왔을 때는 갈 수 있었어요. 표기가 오래됐나 보네요.',
      },
      { who: 'oh', text: '그 안쪽은 원래 직원들도 잘 안 들어갔어요. 지금 상태는 나도 몰라요.' },
    ],
  },
  {
    id: 'hall-blue',
    requires: 'hall-window',
    label: '파란 불빛은 설비 표시등인데요?',
    replies: [
      {
        who: 'player',
        text: '파란 불빛은 안내등이 아니라 설비 표시등인데요? 누전과 자동 폐쇄 경고도 있어요.',
      },
      {
        who: 'kang',
        text: '어두워서 제가 잘못 봤을 수도 있겠네요. 제가 지나왔을 때는 안 그랬어요.',
      },
      {
        who: 'seo',
        text: '그렇다면 빛의 색만 보고 움직이면 안 되겠어요. 다른 경로의 개방 조건도 확인해요.',
      },
    ],
  },
  {
    id: 'hall-power',
    requires: 'hall-gate-note',
    label: '개찰구는 예비 전원이 필요하대요.',
    replies: [
      { who: 'player', text: '개찰구는 예비 전원이 필요하다고 적혀 있어요. 그냥 밀면 안 열려요.' },
      { who: 'min', text: '제가 본 건 다른 개찰구였나 봐요. 또 옛날 생각만 했네요. 미안해요.' },
      { who: 'oh', text: '안내 데스크에 전기실 열쇠가 있을 거예요. 전원만은 함부로 만지지 마요.' },
    ],
  },
] as const
export const powerDevices = [
  {
    id: 'lights',
    title: '조명',
    description: '대합실과 승강장 접근 구역의 시야를 확보합니다.',
    icon: '☀',
  },
  { id: 'gate', title: '개찰구', description: '개찰구를 비상 개방 상태로 전환합니다.', icon: '↗' },
  {
    id: 'broadcast',
    title: '방송',
    description: '사고 당시 녹음을 재생해 기록을 확보합니다.',
    icon: '◉',
  },
] as const
export type PowerDevice = (typeof powerDevices)[number]['id']
export const chapter2Intro: Message[] = [
  {
    who: 'player',
    text: '정비문 너머는 지상이 아니라 대합실로 이어졌다. 오반장이 먼저 빠져나온 뒤, 합선 불꽃과 함께 뒤쪽 차단문이 내려왔다. 돌아갈 수 없다.',
  },
  {
    who: 'oh',
    text: '아직 대합실이네요. 전기실은 아래쪽, 개찰구는 오른쪽이에요. 난 안내 데스크 옆에서 기다릴게요.',
  },
  {
    who: 'player',
    text: '휴대폰이 다시 진동한다. 파란 불빛이 보이는 직원 통로와 잠긴 개찰구. 이번에도 먼저 현장을 확인하자.',
  },
]

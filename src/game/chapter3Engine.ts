import { approvalClues, platformObjects, platformOpening, survivorIntro } from './chapter3'
import type { Action, State } from './engine'
import { worlds } from './world'
const scene = (lines: State['scene']) => ({ scene: lines, sceneIndex: 0 })
export function reduceChapter3(state: State, action: Action): State | undefined {
  const c = state.chapter3
  if (
    action.type === 'enter-platform' &&
    state.area === 'stairs' &&
    state.chapter2.completed &&
    !c.started
  )
    return {
      ...state,
      area: 'platform',
      position: worlds.platform.spawn,
      chapter3: { ...c, started: true },
      messages: [...state.messages, ...platformOpening],
      ...scene([
        {
          who: 'player',
          text: '계단을 내려오자 두 대의 열차가 보인다. A-17의 문은 열려 있고, B-04는 어둡다. 기둥 뒤에서 짧은 기침 소리가 들렸다. 발소리의 주인일까?',
        },
      ]),
      notice: '기둥 뒤의 기침 소리를 확인하고 차량·선로 표식을 조사하자.',
    }
  if (!c.started || c.boarded) return undefined
  if (action.type === 'discover-survivor' && state.area === 'platform' && c.npc === 'unseen')
    return { ...state, chapter3: { ...c, npc: 'found' }, ...scene(survivorIntro) }
  if (action.type === 'survivor-choice' && state.area === 'platform') {
    if (c.npc === 'found' && ['help', 'direct'].includes(action.choice)) {
      const help = action.choice === 'help'
      return {
        ...state,
        chapter3: { ...c, npc: help ? 'helped' : 'directed' },
        ...scene([
          {
            who: 'player',
            text: help
              ? '어깨를 빌려 부스 옆 의자까지 천천히 부축했다. 구급품을 쓰지 않고도 앉힐 수 있었다.'
              : '부스 옆 의자와 안전한 이동 방향을 가리켰다. 먼저 열차와 기록을 확인하겠다고 설명했다.',
          },
          {
            who: 'survivor',
            text: help
              ? '고마워요. 출발할 열차를 찾으면 저도 함께 가고 싶어요. 여기서 기다릴게요.'
              : '알겠어요. 조금 쉬었다가 부스 옆 의자로 옮길게요. 전 혼자 결정하기 무서워요. 탑승 전에 한 번만 더 와 주실래요?',
          },
        ]),
        notice: help
          ? '생존자가 의자에서 동행을 기다립니다.'
          : '생존자에게 위치와 대피 방향을 알려주었습니다. 탑승 전에 동행을 제안할 수 있습니다.',
      }
    }
    if (['directed', 'waiting'].includes(c.npc) && ['invite', 'wait'].includes(action.choice))
      return {
        ...state,
        chapter3: { ...c, npc: action.choice === 'invite' ? 'invited' : 'waiting' },
        ...scene([
          {
            who: 'survivor',
            text:
              action.choice === 'invite'
                ? '함께 가도 된다고요? 고마워요. 문이 열리면 따라갈게요. 부스 옆 의자에서 기다릴게요.'
                : '전 발목이 너무 아파서 이번에는 여기서 구조를 기다릴게요. 부스 옆 의자에 남아 있을 테니 제 위치를 기록해 주세요. 먼저 가세요.',
          },
        ]),
      }
    return state
  }
  if (action.type === 'inspect' && (state.area === 'platform' || state.area === 'trainA')) {
    const object = platformObjects.find((o) => o.id === action.id)
    if (
      !object ||
      state.clues.includes(object.id) ||
      (object.id === 'train-a-stop' ? state.area !== 'trainA' : state.area !== 'platform')
    )
      return state
    const explain = object.id === 'train-a-stop' && !c.aExplained
    return {
      ...state,
      clues: [...state.clues, object.id],
      chapter3: explain ? { ...c, aExplained: true } : c,
      messages: explain
        ? [
            ...state.messages,
            {
              who: 'player',
              text: 'A-17 안에 들어왔지만 운전실에 운행 중지라고 나와요. 이 열차는 출발할 수 없어요.',
            },
            {
              who: 'kang',
              text: '일단 열린 곳으로 대피하라고 한 거였어요. 불이 켜진 건 맞잖아요. 운행 여부는 따로 확인해야겠네요.',
            },
          ]
        : state.messages,
      notice: object.clue,
    }
  }
  if (action.type === 'enter-train-a' && state.area === 'platform')
    return {
      ...state,
      area: 'trainA',
      position: worlds.trainA.spawn,
      notice: 'A-17 객실. 위쪽 선두 차량 안내를 확인하고 아래 문으로 돌아갈 수 있습니다.',
    }
  if (action.type === 'leave-train-a' && state.area === 'trainA')
    return {
      ...state,
      area: 'platform',
      position: { x: 260, y: 200 },
      notice: '승강장으로 돌아왔다. 자원은 소모되지 않았다.',
    }
  if (action.type === 'approve-train' && state.area === 'platform') {
    if (c.approved) return state
    const missing = approvalClues.filter((id) => !state.clues.includes(id))
    if (missing.length)
      return {
        ...state,
        notice: `차량·기록·신호를 먼저 확인하세요. 미확인: ${missing.map((id) => platformObjects.find((o) => o.id === id)!.title).join(', ')}`,
      }
    if (action.vehicle !== 'B-04' || action.track !== '◇-2')
      return {
        ...state,
        notice: `승인 불일치: ${[action.vehicle !== 'B-04' ? '운행 차량' : '', action.track !== '◇-2' ? '선로 표식' : ''].filter(Boolean).join(' / ')}. 현장 기록과 대조해 다시 입력하세요. 재시도 제한이나 자원 차감은 없습니다.`,
      }
    return {
      ...state,
      chapter3: { ...c, approved: true, signal: 'changing' },
      notice: 'B-04 / ◇-2 출발 요청 접수. 선로 신호 전환을 기다리세요.',
    }
  }
  if (action.type === 'signal-ready' && c.signal === 'changing' && c.approved)
    return {
      ...state,
      chapter3: { ...c, signal: 'green' },
      notice: '◇-2 선로의 신호가 녹색으로 전환되었습니다. B-04 외부 비상 호출 장치를 사용하세요.',
    }
  if (action.type === 'call-train-b' && state.area === 'platform') {
    if (!c.approved || c.signal !== 'green')
      return {
        ...state,
        ...scene([
          {
            who: 'player',
            text: '비상 호출 장치가 응답했다. “승인과 녹색 신호가 필요합니다.” 비상 부스 기록과 안전 난간의 선로 표식을 먼저 확인하자.',
          },
        ]),
      }
    if (c.doorOpen) return state
    return {
      ...state,
      chapter3: { ...c, doorOpen: true },
      ...scene([
        {
          who: 'player',
          text: '비상 호출을 누르자 B-04의 문이 열렸다. 객실 비상등이 켜진다. 탑승 전에 동행 여부와 출발 준비를 확인하자.',
        },
      ]),
      notice: 'B-04 문 개방. 선두 차량 출발 확인 후 탑승할 수 있습니다.',
    }
  }
  if (action.type === 'board-train-b' && state.area === 'platform') {
    if (!c.approved || c.signal !== 'green' || !c.doorOpen) return state
    if (c.npc === 'unseen' || c.npc === 'found')
      return {
        ...state,
        ...scene([
          {
            who: 'player',
            text: '기둥 뒤의 기침 소리가 마음에 걸린다. 발소리의 주인을 확인하고 어떻게 도울지 결정한 뒤 출발하자.',
          },
        ]),
      }
    const together = ['helped', 'invited'].includes(c.npc)
    return {
      ...state,
      area: 'trainB',
      position: worlds.trainB.spawn,
      chapter3: {
        ...c,
        boarded: true,
        npcBoarded: together,
        npc: together ? c.npc : 'waiting',
        ending: 'departing',
      },
      ...scene([
        {
          who: 'survivor',
          text: together
            ? c.npc === 'helped'
              ? '같이 가요. 아까 의자까지 도와줘서… 여기까지 올 수 있었어요.'
              : '함께 가자고 해 줘서 고마워요. 혼자 남을 줄 알았어요. 천천히 따라갈게요.'
            : '전 부스 옆 의자에서 구조를 기다릴게요. 발목이 너무 아파서 이번에는 남고 싶어요. 제 대기 장소를 기록해 주세요. 먼저 가세요.',
        },
        {
          who: 'player',
          text: '문이 닫히고 열차가 움직인다. 창밖의 신도림역 표지판이 천천히 뒤로 밀려났다. 다음 역: 미확인.',
        },
        { who: 'oh', text: '그 열차에 탔어요?' },
        { who: 'seo', text: '잠깐. 지금 객실에 몇 명 있어요?' },
      ]),
      messages: [
        ...state.messages,
        { who: 'oh', text: '그 열차에 탔어요?' },
        { who: 'seo', text: '잠깐. 지금 객실에 몇 명 있어요?' },
      ],
      notice: together
        ? 'B-04 탑승 · 다친 생존자 동행.'
        : 'B-04 단독 탑승 · 생존자는 승강장 비상 부스 옆 의자에서 구조 대기.',
    }
  }
  return undefined
}

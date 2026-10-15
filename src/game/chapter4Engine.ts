import {
  availableTrainQuestion,
  defaultChapter4,
  inSyncTarget,
  isChapter4Area,
  trainAnswer,
  trainLinks,
  trainObjects,
  trainOpening,
} from './chapter4'
import type { Action, State } from './engine'
import { worlds } from './world'

const scene = (lines: State['scene']) => ({ scene: lines, sceneIndex: 0 })
export const reduceChapter4 = (state: State, action: Action): State | undefined => {
  const c = state.chapter4
  if (
    action.type === 'train-start' &&
    state.area === 'trainB' &&
    state.chapter3.escaped &&
    !c.started
  )
    return {
      ...state,
      stage: 'explore',
      chapter4: { ...defaultChapter4, links: { ...defaultChapter4.links }, started: true },
      messages: [
        ...state.messages,
        {
          who: 'player',
          text: state.chapter3.npcBoarded
            ? '저와 함께 탄 생존자, 두 명이에요. 단톡방 사람들은 객실에 없어요.'
            : '객실에는 저 혼자예요. 단톡방 사람들은 여기 없어요.',
        },
        ...trainOpening,
      ],
      ...scene([
        {
          who: 'player',
          text: '“잠깐. 지금 객실에 몇 명 있어요?” 마지막 메시지가 화면에 남아 있다. 열차는 터널을 달린다. 조명이 잠깐 꺼졌다 켜지고, 비어 있는 뒤쪽 좌석 아래에서 부르르— 휴대폰 진동음이 들렸다.',
        },
        ...(state.chapter3.npcBoarded
          ? [
              {
                who: 'survivor',
                text:
                  state.chapter3.npc === 'helped'
                    ? '아까 의자까지 부축해 준 것, 기억해요. 지금도 저와 같이 들은 거죠? 저 좌석 아래에서요…'
                    : '함께 타자고 해 줘서 고마워요. 저도 진동을 들었어요. 다리가 떨려서 천천히 따라갈게요.',
              },
            ]
          : [
              {
                who: 'player',
                text: '객실에는 나 혼자다. 진동은 좌석 아래 남겨진 기기에서 난다. 누군가 숨어 있다고 단정할 근거는 없다.',
              },
            ]),
      ]),
      notice: '챕터 4 · 중앙 객실. 좌석 아래 휴대폰과 노선 표시기를 확인하자.',
    }
  if (!c.started || !isChapter4Area(state.area)) return undefined
  if (action.type === 'advance') {
    if (!state.scene.length || state.sceneIndex + 1 < state.scene.length) return undefined
    if (c.sync === 'accepted' && !c.arrived)
      return {
        ...state,
        scene: [],
        sceneIndex: 0,
        chapter4: { ...c, arrived: true },
        notice: `${c.destination} — 비상 정차. 중앙 객실의 열린 문 앞으로 이동할 수 있다.`,
      }
    if (c.interruption === 'interrupted')
      return {
        ...state,
        scene: [],
        sceneIndex: 0,
        chapter4: { ...c, interruption: 'restored', suspicion: true },
        messages: [
          ...state.messages,
          { who: 'oh', text: '지금 뭘 끊었어요?' },
          {
            who: 'seo',
            text: '사용자 휴대폰의 독립 연결로 대화가 복구됐어요. 방금 반응도 기록해 둬요. 누가 받는지는 아직 몰라요.',
          },
        ],
        notice:
          '독립 연결 복구. 분리 사실을 알리기 전에 오반장이 장치 변화에 반응했다. 수신자의 신원은 미확인.',
      }
    return undefined
  }
  if (c.completed) return state
  if (action.type === 'train-move') {
    if (c.sync === 'active' || c.entryPrompt) return state
    const neighbors = {
      trainB: ['trainRear', 'trainFront'],
      trainRear: ['trainB'],
      trainFront: ['trainB'],
    }
    if (!neighbors[state.area as keyof typeof neighbors]?.includes(action.area)) return state
    return {
      ...state,
      area: action.area,
      position: worlds[action.area].spawn,
      notice:
        action.area === 'trainRear'
          ? '후방 객실 · 비상등 아래 장치함과 설명서가 보인다.'
          : action.area === 'trainFront'
            ? '선두 연결 구역 · 운전실은 잠겨 있다. 외부 패널에서 정차를 요청할 수 있다.'
            : '중앙 객실로 돌아왔다.',
    }
  }
  if (action.type === 'inspect') {
    const object = trainObjects.find((o) => o.id === action.id && o.area === state.area)
    if (!object) return state
    const first = !state.clues.includes(object.id)
    const advice = object.id === 'train-devices' && first && !c.powerAdvice
    return {
      ...state,
      clues: first ? [...state.clues, object.id] : state.clues,
      chapter4: advice ? { ...c, powerAdvice: true } : c,
      messages: advice
        ? [
            ...state.messages,
            {
              who: 'kang',
              text: '중계 장치가 의심스러우면 객실 전원을 꺼요. 그러면 추적 신호도 멎을 거예요.',
            },
          ]
        : state.messages,
      ...scene([
        {
          who: 'player',
          text:
            object.id === 'train-route' && c.arrived
              ? `${c.destination} — 비상 정차. 출입문 개방.`
              : object.id === 'train-stop'
                ? `${object.clue} 현재 상태: ${!c.links.power ? '패널 꺼짐 / 객실 전원 없음' : !c.links.relay ? '연결 오류 / CAB-R01 중계기 없음' : c.links.external ? '외부 명령 우선 / 수동 요청 대기' : '수동 정차 요청 가능'}.`
                : object.clue,
        },
      ]),
      notice: object.clue,
    }
  }
  if (action.type === 'ask') {
    if (!availableTrainQuestion(action.id, state.clues, c) || state.asked.includes(action.id))
      return state
    return {
      ...state,
      asked: [...state.asked, action.id],
      messages: [...state.messages, ...trainAnswer(action.id, state.asked, c)],
      notice: '답변을 기록했다. 현장 기록과 비교하자. 인물의 정체는 아직 확인되지 않았다.',
    }
  }
  if (
    action.type === 'train-link' &&
    state.area === 'trainRear' &&
    state.clues.includes('train-devices') &&
    c.sync !== 'accepted'
  ) {
    if (!trainLinks.some((link) => link.id === action.id)) return state
    const connected = !c.links[action.id]
    const firstDisconnect = action.id === 'external' && !connected && c.interruption === 'none'
    return {
      ...state,
      chapter4: {
        ...c,
        links: { ...c.links, [action.id]: connected },
        interruption: firstDisconnect ? 'interrupted' : c.interruption,
      },
      ...(firstDisconnect
        ? scene([
            {
              who: 'player',
              text: 'EXT-X09 연결을 분리했다. 단톡방 수신 표시가 잠깐 멈춘다. 아직 분리 사실을 보내지 않았다. 사용자 휴대폰이 독립 연결로 전환 중이다. 다른 연결로 대화를 다시 받을 수 있을 것 같다.',
            },
          ])
        : {}),
      notice:
        !connected && action.id === 'power'
          ? '객실 전원 차단. 비상등과 반사 표식은 남아 있다. P-02를 다시 연결하면 즉시 복구된다.'
          : !connected && action.id === 'relay'
            ? '객실 중계기 분리. 선두 패널 연결 오류. R-01을 다시 연결하면 복구된다.'
            : `${trainLinks.find((link) => link.id === action.id)!.mark} ${connected ? '복구' : '분리'}.`,
    }
  }
  if (action.type === 'train-sync-start' && state.area === 'trainFront') {
    if (
      !state.clues.includes('train-stop') ||
      !c.links.power ||
      !c.links.relay ||
      c.links.external ||
      c.sync !== 'idle'
    )
      return {
        ...state,
        notice: !c.links.power
          ? '패널 꺼짐: P-02 객실 전원을 복구하세요.'
          : !c.links.relay
            ? '연결 오류: R-01 객실 중계기를 복구하세요.'
            : c.links.external
              ? '외부 명령 우선: 연결 기록을 대조하세요.'
              : '패널 상태를 먼저 조사하세요.',
      }
    return {
      ...state,
      chapter4: { ...c, sync: 'active' },
      notice: '신호 동기화. 목표 구간 안에서 한 번 누르세요. 시간제한은 없습니다.',
    }
  }
  if (action.type === 'train-assist' && c.sync === 'active' && c.failures >= 2)
    return { ...state, chapter4: { ...c, assisted: !c.assisted } }
  if (action.type === 'train-sync-cancel' && c.sync === 'active')
    return { ...state, chapter4: { ...c, sync: 'idle' } }
  if (action.type === 'train-sync-hit' && c.sync === 'active') {
    if (!inSyncTarget(action.marker))
      return {
        ...state,
        chapter4: { ...c, failures: c.failures + 1 },
        notice:
          '동기화 실패. 자원 소모 없음. 다시 시도하거나 두 번 실패 후 느린 신호 보조를 켤 수 있다.',
      }
    return {
      ...state,
      chapter4: { ...c, sync: 'accepted' },
      ...scene([
        {
          who: 'player',
          text: '정차 요청 수락 / 다음 안전 정차 지점 진입. 가상 비상 운행 시스템이 요청을 접수했다. 운전실 문은 여전히 잠겨 있다.',
        },
        {
          who: 'player',
          text: `열차가 감속한다. 터널의 불빛이 느리게 스쳐 간다. 문이 열리기 전 노선 표시기가 바뀐다. “${c.destination} — 비상 정차”. 마침내 열차가 멈추고 중앙 객실 출입문이 열린다.`,
        },
      ]),
      notice: '정차 요청 수락 / 다음 안전 정차 지점 진입.',
    }
  }
  if (action.type === 'train-door' && state.area === 'trainB') {
    if (!c.arrived)
      return {
        ...state,
        ...scene([
          {
            who: 'player',
            text: '아직 터널을 달리고 있다. 문을 열 수 없다. 선두 패널에서 정차 요청을 보내야 한다.',
          },
        ]),
      }
    if (c.doorSeen) return { ...state, chapter4: { ...c, entryPrompt: true } }
    return {
      ...state,
      chapter4: { ...c, doorSeen: true, entryPrompt: true },
      messages: [...state.messages, { who: 'seo', text: '거기서는 안내방송에 대답하지 마세요.' }],
      ...scene([
        { who: 'seo', text: '거기서는 안내방송에 대답하지 마세요.' },
        {
          who: 'player',
          text: '메시지가 먼저 도착했다. 열린 문 앞에서 플랫폼을 살핀다. 사람은 보이지 않고, 같은 방향으로 놓인 신발 여러 켤레만 보인다. 아직 역 안으로 들어가지 않았다.',
        },
      ]),
    }
  }
  if (action.type === 'train-entry' && c.arrived && c.doorSeen && c.entryPrompt)
    return {
      ...state,
      chapter4: { ...c, entryPrompt: false, completed: action.confirm },
      notice: action.confirm
        ? `챕터 4 완료 · ${c.destination} 도착 상태 저장. 플랫폼 본격 탐색은 챕터 5에서 이어집니다.`
        : '진입을 보류했다. 열린 문 앞에서 다시 확인할 수 있다.',
    }
  return undefined
}

import {
  cleanDisplayName,
  defaultChapter5,
  defaultDisplayName,
  isChapter5Area,
  maintenanceRule,
  matchingRegistration,
  moonAnswer,
  moonBroadcast,
  moonClueText,
  moonEvidence,
  moonObjects,
  moonOpening,
  moonQuestions,
  moonStation,
  validDisplayName,
} from './chapter5'
import type { Action, State } from './engine'
import { worlds } from './world'

const scene = (lines: State['scene']) => ({ scene: lines, sceneIndex: 0 })
export const reduceChapter5 = (state: State, action: Action): State | undefined => {
  const c = state.chapter5
  if (
    action.type === 'moon-start' &&
    state.area === 'trainB' &&
    state.chapter4.arrived &&
    state.chapter4.completed &&
    !c.started
  )
    return {
      ...state,
      chapter5: { ...defaultChapter5, started: true },
      notice:
        '이전부터 사용하던 단톡방 표시 이름을 휴대폰 프로필에서 확인하세요. 새 자료를 전송하는 절차가 아닙니다.',
    }
  if (!c.started) return undefined
  if (!c.displayName) {
    if (action.type === 'moon-profile-edit')
      return { ...state, chapter5: { ...c, profileDraft: action.name.slice(0, 128) }, notice: '' }
    if (action.type === 'moon-profile-confirm') {
      const name = action.useDefault ? defaultDisplayName : cleanDisplayName(c.profileDraft)
      if (!validDisplayName(name))
        return {
          ...state,
          notice: '게임용 표시 이름을 1~16자로 입력하세요. 공백만 입력할 수 없어요.',
        }
      const broadcast = moonBroadcast.intro(name)
      return {
        ...state,
        area: 'moonPlatform',
        position: worlds.moonPlatform.spawn,
        chapter5: { ...c, displayName: name, profileDraft: name },
        clues: [...state.clues, 'moon-broadcast'],
        messages: [
          ...state.messages,
          { who: 'player', text: `문래역 방송이 제 단톡방 표시 이름 “${name}”을 불렀어요.` },
          ...moonOpening,
        ],
        ...scene([
          {
            who: 'player',
            text: `휴대폰 프로필에 이전부터 사용하던 표시 이름 “${name}”이 보인다. 확인을 마치고 ${moonStation} 승강장으로 내려선다. 이름을 새로 보내지는 않았다.`,
          },
          { who: 'broadcast', text: broadcast },
          {
            who: 'player',
            text: '“안내방송에 대답하지 마세요.” 직전 경고가 떠오른다. 같은 방향의 신발들과 전광판이 보인다. 대답하기 전에 현장 경고를 확인할 수 있다.',
          },
          ...(state.chapter3.npcBoarded
            ? [
                {
                  who: 'survivor',
                  text:
                    state.chapter3.npc === 'helped'
                      ? '아까 부축해 준 것 잊지 않았어요. 이름을 부르니 대답할 뻔했어요. 먼저 같이 살펴봐요.'
                      : '함께 타자고 해 줘서 여기까지 왔어요. 제 이름을 부른 건 아니죠? 대답하지 않고 기다릴게요.',
                },
              ]
            : []),
        ]),
        notice: broadcast,
      }
    }
    return state
  }
  if (!isChapter5Area(state.area)) return undefined
  if (c.completed) return state
  if (action.type === 'inspect') {
    const object = moonObjects.find(
      (item) => item.id === action.id && item.area === state.area && item.id !== 'moon-disclosure',
    )
    if (!object) return state
    const text = moonClueText(object.id, c)
    return {
      ...state,
      clues: state.clues.includes(object.id) ? state.clues : [...state.clues, object.id],
      ...scene([{ who: 'player', text }]),
      notice: text,
    }
  }
  if (action.type === 'ask') {
    const question = moonQuestions.find((q) => q.id === action.id)
    if (!question || !state.clues.includes(question.requires) || state.asked.includes(question.id))
      return state
    return {
      ...state,
      asked: [...state.asked, question.id],
      messages: [...state.messages, ...moonAnswer(question.id, state.asked, c)],
      notice: '답변을 기록했다. 확인된 증거와 추측을 구분하자.',
    }
  }
  if (action.type === 'moon-move') {
    if (c.exitPrompt) return state
    const to = action.area
    const valid =
      (state.area === 'moonPlatform' && to === 'moonBooth') ||
      (state.area === 'moonBooth' && to === 'moonPlatform') ||
      (state.area === 'moonHolding' && to === 'moonPlatform' && c.registration === 'cancelled')
    if (!valid)
      return {
        ...state,
        notice:
          state.area === 'moonHolding'
            ? '차단문이 닫혀 있다. 내부 활성 등록과 해제 안내를 조사하면 취소할 수 있다.'
            : '현재 구역에서 이어지는 문을 사용하세요.',
      }
    return {
      ...state,
      area: to,
      position: worlds[to].spawn,
      notice: `${moonStation} · ${to === 'moonBooth' ? '안내 부스' : '승강장'}에 도착했다.`,
    }
  }
  if (action.type === 'moon-respond' && state.area === 'moonPlatform') {
    if (c.response !== 'undecided') return state
    if (!['moon-warning', 'moon-sensor'].every((id) => state.clues.includes(id)))
      return { ...state, notice: '전광판의 차단문 작동 경고와 응답 감지기를 먼저 확인하세요.' }
    if (action.choice === 'answered')
      return {
        ...state,
        area: 'moonHolding',
        position: worlds.moonHolding.spawn,
        chapter5: { ...c, response: 'answered', registration: 'active' },
        ...scene([
          {
            who: 'player',
            text: `“${c.displayName}입니다.” 명시적으로 응답했다. 확인 구역 문이 열려 안으로 들어서자 뒤의 차단문이 닫힌다. 신발과 소지품은 그대로 지녔다.`,
          },
          {
            who: 'broadcast',
            text: moonBroadcast.confirmed,
          },
          ...(state.chapter3.npcBoarded
            ? [
                {
                  who: 'survivor',
                  text: '저도 같이 들어왔어요. 닫혔네요… 벽에 내부 해제 안내가 있어요. 천천히 같이 확인해요.',
                },
              ]
            : []),
        ]),
        notice: '확인 대기 구역 내부. 체력·배터리·아이템 소모 없음. 내부 취소 장치를 찾자.',
      }
    return {
      ...state,
      chapter5: { ...c, response: 'silent' },
      ...scene([
        {
          who: 'player',
          text: '입을 다물었다. 방송은 이름을 한 번 더 부른 뒤 응답 대기로 남는다. 차단문은 움직이지 않는다. 안내 부스에 직접 걸어가 등록 기록을 확인하자.',
        },
      ]),
      notice: '무응답 선택. 차단문은 작동하지 않았다. 안내 부스에서 대기 등록을 보류할 수 있다.',
    }
  }
  if (
    action.type === 'moon-cancel' &&
    state.area === 'moonHolding' &&
    c.registration === 'active'
  ) {
    if (!['moon-active-record', 'moon-cancel-note'].every((id) => state.clues.includes(id)))
      return { ...state, notice: '내부 활성 등록 번호와 해제 안내를 먼저 조사하세요.' }
    if (action.caseId !== matchingRegistration.id)
      return {
        ...state,
        notice: '활성 등록 번호 불일치. 내부 표시와 대조하세요. 재시도 제한 없음.',
      }
    return {
      ...state,
      chapter5: { ...c, registration: 'cancelled' },
      ...scene([
        {
          who: 'player',
          text: '내부 활성 등록을 취소하자 차단문이 열린다. 승강장으로 돌아갈 수 있다. 외부 유도는 아직 보류되지 않았다. 안내 부스에서 원본을 확인하자.',
        },
      ]),
      notice: '등록 취소 · 차단문 해제. 아래쪽 문으로 승강장 복귀 가능.',
    }
  }
  if (action.type === 'moon-match' && state.area === 'moonBooth') {
    if (c.matched) return state
    if (c.response === 'undecided' || !moonEvidence.every((id) => state.clues.includes(id)))
      return {
        ...state,
        notice: '응답 여부를 선택하고 방송 재생·외부 수신·수동 첨부 기록을 모두 조사하세요.',
      }
    if (action.caseId !== matchingRegistration.id)
      return {
        ...state,
        notice:
          '등록 건 불일치. 차량·발신 식별자·표시 이름을 함께 비교하세요. 시각 일치만으로는 부족합니다. 재시도 제한 없음.',
      }
    return {
      ...state,
      chapter5: { ...c, matched: true },
      clues: [...state.clues, 'moon-disclosure'],
      messages: [
        ...state.messages,
        {
          who: 'player',
          text: '발신 장치와 등록 건, 수동 첨부 원본이 모두 일치해요. 누군가 제 표시 이름과 탑승 정보를 수동 전달했어요. 제출자 계정은 가려져 있어요.',
        },
      ],
      notice: moonClueText('moon-disclosure', c),
    }
  }
  if (action.type === 'moon-process' && state.area === 'moonBooth') {
    if (!c.matched || c.externalPaused || c.response === 'undecided' || c.registration === 'active')
      return state
    return {
      ...state,
      chapter5: {
        ...c,
        externalPaused: true,
        registration: c.response === 'silent' ? 'held' : 'cancelled',
      },
      notice:
        c.response === 'silent'
          ? '미확인 등록 보류 · 외부 유도 중단. 정비 통로의 현장 표식을 별도로 확인하세요.'
          : '취소된 등록의 외부 유도 보류 완료. 정비 통로의 현장 표식을 별도로 확인하세요.',
    }
  }
  if (action.type === 'moon-unlock' && state.area === 'moonPlatform') {
    if (c.routeOpen) return state
    if (!c.externalPaused || !state.clues.includes('moon-route'))
      return { ...state, notice: '등록 처리와 정비 통로 현장 표식 조사가 모두 필요합니다.' }
    if (action.door !== maintenanceRule.door || action.mode !== maintenanceRule.mode)
      return {
        ...state,
        notice:
          '현장 통행 조건 불일치. M-12 표식의 문 번호와 승인 방식을 대조하세요. 재시도 제한 없음.',
      }
    return {
      ...state,
      chapter5: { ...c, routeOpen: true },
      notice: 'D-02 정비 통로 개방. 문 앞에서 이동을 확인할 수 있다.',
    }
  }
  if (action.type === 'moon-exit' && state.area === 'moonPlatform') {
    if (!c.routeOpen)
      return {
        ...state,
        notice: '통로가 잠겨 있다. 안내 부스의 등록 처리와 현장 표식을 확인하세요.',
      }
    const lines: State['scene'] = [
      {
        who: 'player',
        text: `등록 화면에는 “${c.displayName} / 현장 확인: ${c.response === 'answered' ? '취소' : '보류'} / 자료 제출: 외부 중계 / 제출자 비공개”가 남아 있다. 정비 통로 문이 열렸다.`,
      },
      {
        who: 'broadcast',
        text: moonBroadcast.ending(c.response),
      },
      {
        who: 'player',
        text: '재생 표시등이 같은 순서로 깜빡인다. 자동 재시도 방송이다. 통로 안으로 이동할지 결정하자.',
      },
    ]
    return {
      ...state,
      chapter5: { ...c, exitSeen: true, exitPrompt: true },
      ...(c.exitSeen ? {} : scene(lines)),
    }
  }
  if (action.type === 'moon-finish' && c.exitPrompt)
    return {
      ...state,
      chapter5: { ...c, exitPrompt: false, completed: action.confirm },
      notice: action.confirm
        ? `챕터 5 완료 · ${moonStation} 정비 통로 이동 승인 저장. 통로 안 탐색은 다음 챕터에서 이어집니다.`
        : '이동을 보류했다. 정비 통로 앞에서 다시 확인할 수 있다.',
    }
  return undefined
}

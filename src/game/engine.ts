import { applyEntryView } from './entryView'
import { makeView3d, normalizeView3d } from './view3d'
import { toWorldPosition } from './firstPerson'
import type { View3d } from './firstPerson'
import {
  defaultChapter6,
  finalObjects,
  finalQuestions,
  normalizeChapter6,
  isChapter6Area,
} from './chapter6'
import type { Chapter6 } from './chapter6'
import { reduceChapter6 } from './chapter6Engine'
import { normalizeReading } from './progress'
import type { Reading } from './progress'
import { defaultAiChat } from '../chat/contracts'
import type { AiChatState, ChatReply, ChatRequest } from '../chat/contracts'
import { normalizeAiChat } from '../chat/client'
import { reduceAiChat } from '../chat/reducer'
import {
  defaultChapter5,
  isChapter5Area,
  moonObjects,
  moonQuestions,
  normalizeChapter5,
} from './chapter5'
import type { Chapter5 } from './chapter5'
import { reduceChapter5 } from './chapter5Engine'
import {
  defaultChapter4,
  isChapter4Area,
  normalizeChapter4,
  trainObjects,
  trainQuestions,
} from './chapter4'
import type { Chapter4, TrainLink } from './chapter4'
import { reduceChapter4 } from './chapter4Engine'
import { defaultChapter3, platformObjects, platformQuestions, isChapter3Area } from './chapter3'
import type { Chapter3 } from './chapter3'
import { reduceChapter3 } from './chapter3Engine'
import { room, walkable, worlds, getWorld } from './world'
import type { Area, Point } from './world'
import { episode, objects, questions, routes } from './data'
import { chapter2Intro, hallObjects, hallOpening, hallQuestions, powerDevices } from './chapter2'
import type { PowerDevice } from './chapter2'
import { dialogue } from './dialogue'
import type { Message } from './dialogue'

export type Stage = 'intro' | 'explore' | 'lock' | 'result'
export type Chapter2 = {
  staffEvent: 'unseen' | 'active' | 'success' | 'failed'
  power: PowerDevice[]
  ending: 'none' | 'question' | 'echo' | 'complete'
  completed: boolean
}
export type State = {
  view3d: View3d | null

  chapter6: Chapter6
  reading: Reading
  savedAt?: string
  aiChat: AiChatState
  version: 1
  area: Area
  position: Point
  stage: Stage
  health: number
  battery: number
  clues: string[]
  inventory: string[]
  asked: string[]
  messages: Message[]
  route: string | null
  attempts: number
  outcome: 'escaped' | 'injured' | 'failed' | null
  notice: string
  chapter2: Chapter2
  chapter3: Chapter3
  chapter4: Chapter4
  chapter5: Chapter5
  scene: Message[]
  sceneIndex: number
}
export type Action =
  | { type: 'maintenance-start' }
  | { type: 'maintenance-configure'; door: string; mode: string; power: boolean }
  | { type: 'maintenance-commit' }
  | { type: 'maintenance-drain' }
  | { type: 'maintenance-bolt' }
  | { type: 'maintenance-hatch' }
  | { type: 'maintenance-arrive' }
  | { type: 'read'; target: 'clues' | 'messages' }
  | { type: 'ai-start'; request: ChatRequest }
  | { type: 'ai-retry' }
  | { type: 'ai-dismiss' }
  | { type: 'ai-success'; reply: ChatReply }
  | { type: 'ai-error'; requestId: string; error: string }
  | { type: 'moon-start' }
  | { type: 'moon-profile-edit'; name: string }
  | { type: 'moon-profile-confirm'; useDefault?: boolean }
  | { type: 'moon-move'; area: 'moonPlatform' | 'moonBooth' }
  | { type: 'moon-respond'; choice: 'answered' | 'silent' }
  | { type: 'moon-cancel'; caseId: string }
  | { type: 'moon-match'; caseId: string }
  | { type: 'moon-process' }
  | { type: 'moon-unlock'; door: string; mode: string }
  | { type: 'moon-exit' }
  | { type: 'moon-finish'; confirm: boolean }
  | { type: 'train-start' }
  | { type: 'train-move'; area: 'trainB' | 'trainRear' | 'trainFront' }
  | { type: 'train-link'; id: TrainLink }
  | { type: 'train-sync-start' }
  | { type: 'train-sync-cancel' }
  | { type: 'train-sync-hit'; marker: number }
  | { type: 'train-assist' }
  | { type: 'train-door' }
  | { type: 'train-entry'; confirm: boolean }
  | { type: 'enter-platform' }
  | { type: 'discover-survivor' }
  | { type: 'survivor-choice'; choice: 'help' | 'direct' | 'invite' | 'wait' }
  | { type: 'enter-train-a' }
  | { type: 'leave-train-a' }
  | { type: 'approve-train'; vehicle: string; track: string }
  | { type: 'signal-ready' }
  | { type: 'call-train-b' }
  | { type: 'board-train-b' }
  | { type: 'view3d'; view: View3d }
  | { type: 'position'; position: Point; area?: Area }
  | { type: 'start' }
  | { type: 'inspect'; id: string }
  | { type: 'ask'; id: string }
  | { type: 'route'; id: string }
  | { type: 'code'; code: string }
  | { type: 'reset' }
  | { type: 'enter-hall' }
  | { type: 'enter-electrical' }
  | { type: 'return-hall' }
  | { type: 'staff-start' }
  | { type: 'staff-result'; success: boolean }
  | { type: 'power'; device: PowerDevice }
  | { type: 'pass-gate' }
  | { type: 'talk'; lines: Message[] }
  | { type: 'advance' }
export const defaultChapter2: Chapter2 = {
  staffEvent: 'unseen',
  power: [],
  ending: 'none',
  completed: false,
}
export const initialState: State = {
  chapter6: defaultChapter6,
  reading: { clues: [], messages: 0 },
  aiChat: defaultAiChat,
  version: 1,
  area: 'first',
  position: room.spawn,
  view3d: null,
  stage: 'intro',
  health: 100,
  battery: 64,
  clues: [],
  inventory: [],
  asked: [],
  messages: [],
  route: null,
  attempts: 0,
  outcome: null,
  notice: '',
  chapter2: defaultChapter2,
  chapter3: defaultChapter3,
  chapter4: defaultChapter4,
  chapter5: defaultChapter5,
  scene: [],
  sceneIndex: 0,
}
const scene = (lines: Message[]) => ({ scene: lines, sceneIndex: 0 })
const reduceState = (state: State, action: Action): State => {
  if (action.type === 'read')
    return {
      ...state,
      reading:
        action.target === 'clues'
          ? { ...state.reading, clues: [...state.clues] }
          : { ...state.reading, messages: state.messages.length },
    }
  if (action.type === 'reset') return { ...initialState }
  const aiChatResult = reduceAiChat(state, action)
  if (aiChatResult) return aiChatResult
  if (action.type === 'view3d') {
    const view = normalizeView3d(
      action.view,
      state.area,
      state.chapter2.power,
      state.chapter3,
      state.chapter4,
      state.chapter5,
      state.chapter6,
    )
    if (!view || (state.chapter2.staffEvent === 'active' && state.view3d?.area === state.area))
      return state
    const previous = state.view3d
    if (
      previous?.area === view.area &&
      Math.abs(previous.position.x - view.position.x) < 1e-8 &&
      Math.abs(previous.position.z - view.position.z) < 1e-8 &&
      Math.abs(previous.yaw - view.yaw) < 1e-8 &&
      Math.abs(previous.pitch - view.pitch) < 1e-8
    )
      return state
    return { ...state, view3d: view, position: toWorldPosition(view.position, view.area) }
  }
  if (action.type === 'position') {
    if (
      state.scene.length ||
      state.chapter4.sync === 'active' ||
      state.chapter4.entryPrompt ||
      (state.chapter5.started && !state.chapter5.displayName) ||
      state.chapter5.exitPrompt
    )
      return state
    if (
      (action.area && action.area !== state.area) ||
      !walkable(
        action.position,
        getWorld(
          state.area,
          state.chapter3.npc,
          state.chapter3.npcBoarded,
          state.chapter2.power,
          state.chapter3.doorOpen,
          state.chapter4,
          state.chapter5,
          state.chapter6,
        ),
      ) ||
      (state.position.x === action.position.x && state.position.y === action.position.y)
    )
      return state
    return { ...state, position: action.position, view3d: null }
  }
  if (action.type === 'advance') {
    const chapter4Advance = reduceChapter4(state, action)
    if (chapter4Advance) return chapter4Advance
    if (!state.scene.length) return state
    const index = state.sceneIndex + 1
    if (index < state.scene.length)
      return {
        ...state,
        sceneIndex: index,
        chapter2:
          state.chapter2.ending === 'question'
            ? { ...state.chapter2, ending: 'echo' }
            : state.chapter2,
      }
    if (state.area === 'trainB' && state.chapter3.ending === 'departing')
      return {
        ...state,
        scene: [],
        sceneIndex: 0,
        chapter3: { ...state.chapter3, escaped: true, ending: 'complete' },
        notice: '신도림역 탈출 완료 · 다음 역: 미확인.',
      }
    const finished = state.area === 'stairs' && state.chapter2.ending === 'echo'
    return {
      ...state,
      scene: [],
      sceneIndex: 0,
      chapter2: finished
        ? { ...state.chapter2, ending: 'complete', completed: true }
        : state.chapter2,
      notice: finished
        ? '챕터 2 완료 · 계단을 통해 챕터 3 “누군가 있는 승강장”으로 이동할 수 있습니다.'
        : state.notice,
    }
  }
  // UI dialogue cannot change puzzle answers, inventory, or chapter flags.
  if (action.type === 'talk')
    return state.scene.length ||
      state.chapter4.sync === 'active' ||
      state.chapter4.entryPrompt ||
      (state.chapter5.started && !state.chapter5.displayName) ||
      state.chapter5.exitPrompt
      ? state
      : { ...state, ...scene(action.lines) }
  if (state.scene.length || state.chapter2.staffEvent === 'active') {
    if (action.type !== 'staff-result') return state
  }
  if (
    state.chapter4.sync === 'active' &&
    !['train-sync-hit', 'train-sync-cancel', 'train-assist'].includes(action.type)
  )
    return state
  if (state.chapter4.entryPrompt && action.type !== 'train-entry') return state
  if (state.chapter5.exitPrompt && action.type !== 'moon-finish') return state
  const chapter6Result = reduceChapter6(state, action)
  if (chapter6Result) return chapter6Result
  const chapter5Result = reduceChapter5(state, action)
  if (chapter5Result) return chapter5Result
  const chapter4Result = reduceChapter4(state, action)
  if (chapter4Result) return chapter4Result
  const chapter3Result = reduceChapter3(state, action)
  if (chapter3Result) return chapter3Result
  if (
    action.type === 'enter-hall' &&
    state.area === 'first' &&
    state.stage === 'result' &&
    (state.outcome === 'escaped' || state.outcome === 'injured')
  ) {
    return {
      ...state,
      area: 'hall',
      stage: 'explore',
      position: worlds.hall.spawn,
      messages: [...state.messages, ...hallOpening],
      ...scene(chapter2Intro),
      notice: '뒤쪽 차단문이 내려왔다. 대합실에서 새 경로를 찾아야 한다.',
    }
  }
  if (action.type === 'enter-electrical' && state.area === 'hall') {
    if (!state.inventory.includes('전기실 열쇠'))
      return {
        ...state,
        ...scene([
          { who: 'player', text: '문이 잠겨 있다. 문패에 “열쇠 보관: 안내 데스크”라고 적혀 있다.' },
        ]),
      }
    return {
      ...state,
      area: 'electrical',
      position: worlds.electrical.spawn,
      notice: '열쇠로 전기실을 열었다. 위쪽 배전반에서 예비 전원을 조작할 수 있다.',
    }
  }
  if (action.type === 'return-hall' && state.area === 'electrical')
    return {
      ...state,
      area: 'hall',
      position: { x: 215, y: 480 },
      notice: '대합실로 돌아왔다. 전원 설정은 유지된다.',
    }
  if (
    action.type === 'staff-start' &&
    state.area === 'hall' &&
    state.chapter2.staffEvent === 'unseen'
  ) {
    return {
      ...state,
      chapter2: { ...state.chapter2, staffEvent: 'active' },
      notice: '삐—! 자동 방화문이 내려온다. 안전 구간에 맞춰 몸을 빼야 한다.',
    }
  }
  if (
    action.type === 'staff-result' &&
    state.area === 'hall' &&
    state.chapter2.staffEvent === 'active'
  ) {
    return {
      ...state,
      position: { x: 115, y: 300 },
      view3d: state.view3d ? makeView3d('hall', { x: 115, y: 300 }) : null,
      health: Math.max(1, state.health - (action.success ? 0 : 20)),
      chapter2: { ...state.chapter2, staffEvent: action.success ? 'success' : 'failed' },
      messages: [
        ...state.messages,
        {
          who: 'kang',
          text: '방화문이 내려왔다고요? 제가 지나왔을 때는 안 그랬어요. 일단 대합실로 돌아오세요.',
        },
      ],
      ...scene([
        {
          who: 'player',
          text: action.success
            ? '몸을 굴려 방화문 아래에서 빠져나왔다. 통로가 완전히 닫혔다. 대합실로 돌아왔다.'
            : '방화문을 피하다 잔해에 부딪혔다. 체력 −20. 간신히 대합실로 돌아왔다. 이 통로로는 더 갈 수 없다.',
        },
      ]),
      notice: '직원 통로는 폐쇄되었다. 전기실에서 다른 경로를 열어야 한다.',
    }
  }
  if (
    action.type === 'power' &&
    state.area === 'electrical' &&
    powerDevices.some((d) => d.id === action.device)
  ) {
    const enabled = state.chapter2.power.includes(action.device)
    if (!enabled && state.chapter2.power.length >= 2)
      return { ...state, notice: '예비 회로 용량은 두 장치입니다. 켜진 장치 하나를 먼저 끄세요.' }
    const power = enabled
      ? state.chapter2.power.filter((id) => id !== action.device)
      : [...state.chapter2.power, action.device]
    const newRecording = power.includes('broadcast') && !state.clues.includes('hall-recording')
    return {
      ...state,
      chapter2: { ...state.chapter2, power },
      clues: newRecording ? [...state.clues, 'hall-recording'] : state.clues,
      notice: newRecording
        ? hallObjects.find((o) => o.id === 'hall-recording')!.clue
        : `${powerDevices.find((d) => d.id === action.device)!.title} ${enabled ? '전원 차단' : '전원 연결'}. ${power.length}/2 회로 사용 중.`,
    }
  }
  if (action.type === 'pass-gate' && state.area === 'hall') {
    if (!state.chapter2.power.includes('gate'))
      return {
        ...state,
        ...scene([
          {
            who: 'player',
            text: '개찰구가 잠겨 있다. 전기실에서 개찰구 예비 전원을 켜야 한다. 열쇠는 안내 데스크에 있을 것이다.',
          },
        ]),
      }
    if (!state.chapter2.power.includes('lights'))
      return {
        ...state,
        ...scene([
          {
            who: 'player',
            text: '개찰구는 열렸지만 그 너머가 보이지 않는다. 안전하게 내려가려면 조명 회로도 켜야 한다.',
          },
        ]),
      }
    return {
      ...state,
      area: 'stairs',
      position: worlds.stairs.spawn,
      chapter2: { ...state.chapter2, ending: 'question' },
      messages: [
        ...state.messages,
        { who: 'seo', text: '내려가기 전에 하나만 확인해요. 지금 발소리, 몇 명 거예요?' },
      ],
      ...scene([
        { who: 'seo', text: '내려가기 전에 하나만 확인해요. 지금 발소리, 몇 명 거예요?' },
        {
          who: 'player',
          text: '나는 걸음을 멈췄다. …또각. 내가 멈춘 뒤에도, 발소리가 한 번 더 울렸다.',
        },
        {
          who: 'player',
          text: '분명 혼자 계단 앞에 섰는데. 어둠 아래에 누군가 있다. 숨을 고르고, 조심해서 내려가 보자.',
        },
      ]),
      notice: '개찰구를 통과해 승강장 계단 앞에 도착했다.',
    }
  }
  if (action.type === 'start' && state.stage === 'intro')
    return {
      ...state,
      stage: 'explore',
      messages: dialogue.opening(),
      notice: '단톡방에 연결됐습니다. 현장 단서를 확인하세요.',
    }
  if (action.type === 'inspect' && state.stage === 'explore') {
    if (state.area === 'hall') {
      const object = hallObjects.find((o) => o.id === action.id && o.id !== 'hall-recording')
      if (!object || state.clues.includes(object.id)) return state
      return {
        ...state,
        clues: [...state.clues, object.id],
        inventory:
          object.item && !state.inventory.includes(object.item)
            ? [...state.inventory, object.item]
            : state.inventory,
        notice: object.clue,
      }
    }
    if (state.area !== 'first') return state
    const object = objects.find((item) => item.id === action.id)
    if (!object || state.clues.includes(object.id)) return state
    if (state.battery < object.battery)
      return { ...state, notice: '조사에 필요한 배터리가 부족합니다.' }
    return {
      ...state,
      battery: state.battery - object.battery,
      clues: [...state.clues, object.id],
      inventory: object.item ? [...state.inventory, object.item] : state.inventory,
      notice: object.clue,
    }
  }
  if (action.type === 'ask' && state.stage === 'explore') {
    const available =
      state.area === 'first'
        ? questions
        : state.area === 'hall' || state.area === 'electrical'
          ? hallQuestions
          : isChapter3Area(state.area)
            ? platformQuestions
            : []
    const question = available.find((item) => item.id === action.id)
    if (!question || !state.clues.includes(question.requires) || state.asked.includes(question.id))
      return state
    return {
      ...state,
      asked: [...state.asked, question.id],
      messages: [...state.messages, ...dialogue.answer(question.id)],
      notice: '새로운 답변이 도착했습니다. 주장과 단서를 비교하세요.',
    }
  }
  if (state.area !== 'first') return state
  if (action.type === 'route' && state.stage === 'explore') {
    const route = routes.find((item) => item.id === action.id)
    if (!route || !state.clues.includes(route.requires) || !state.asked.length) return state
    if (route.id === 'east')
      return {
        ...state,
        route: route.id,
        stage: 'result',
        health: 0,
        outcome: 'failed',
        notice: '배수되지 않은 계단에서 급류에 휩쓸렸다. 구조대는 없었다.',
      }
    return {
      ...state,
      route: route.id,
      stage: 'lock',
      notice: '서쪽 정비문에 도착했습니다. 경보 기록에 암호의 단서가 있습니다.',
    }
  }
  if (action.type === 'code' && state.stage === 'lock') {
    if (!/^\d{4}$/.test(action.code)) return { ...state, notice: '숫자 네 자리를 입력하세요.' }
    if (action.code === episode.code) {
      const protectedHand = state.inventory.includes('절연 장갑')
      return {
        ...state,
        stage: 'result',
        health: state.health - (protectedHand ? 0 : 25),
        outcome: protectedHand ? 'escaped' : 'injured',
        notice: protectedHand
          ? '절연 장갑으로 누전된 손잡이를 잡았다. 정비문 너머로 대합실이 보인다.'
          : '누전된 손잡이에 손을 다쳤다. 체력 −25. 문 너머에 더 넓은 대합실이 보인다.',
      }
    }
    const attempts = state.attempts + 1
    return {
      ...state,
      attempts,
      battery: Math.max(0, state.battery - 10),
      stage: attempts >= 3 ? 'result' : 'lock',
      outcome: attempts >= 3 ? 'failed' : null,
      notice:
        attempts >= 3
          ? '세 번의 오류. 보안 잠금이 작동했다. 탈출 기회를 놓쳤다.'
          : `잘못된 암호입니다. 남은 기회 ${3 - attempts}회. 배터리 10% 소모.`,
    }
  }
  return state
}
export const reducer = (state: State, action: Action): State =>
  applyEntryView(state, reduceState(state, action))

export const SAVE_KEY = 'last-transfer-save-v1'
const validMessages = (value: unknown): value is Message[] =>
  Array.isArray(value) &&
  value.every((m) => m && typeof m.who === 'string' && typeof m.text === 'string')
export const loadGame = (): State => {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
    if (
      !value ||
      value.version !== 1 ||
      !['intro', 'explore', 'lock', 'result'].includes(value.stage) ||
      !Number.isInteger(value.health) ||
      value.health < 0 ||
      value.health > 100 ||
      !Number.isInteger(value.battery) ||
      value.battery < 0 ||
      value.battery > 100 ||
      !Number.isInteger(value.attempts) ||
      value.attempts < 0 ||
      value.attempts > 3
    )
      return { ...initialState }
    if (
      !['clues', 'inventory', 'asked'].every((key) => Array.isArray(value[key])) ||
      !validMessages(value.messages)
    )
      return { ...initialState }
    if (
      !value.clues.every((id: unknown) =>
        [
          ...objects,
          ...hallObjects,
          ...platformObjects,
          ...trainObjects,
          ...moonObjects,
          ...finalObjects,
        ].some((o) => o.id === id),
      ) ||
      !value.asked.every((id: unknown) =>
        [
          ...questions,
          ...hallQuestions,
          ...platformQuestions,
          ...trainQuestions,
          ...moonQuestions,
          ...finalQuestions,
        ].some((q) => q.id === id),
      ) ||
      !value.inventory.every((item: unknown) => item === '절연 장갑' || item === '전기실 열쇠') ||
      typeof value.notice !== 'string' ||
      ![null, 'west', 'east'].includes(value.route) ||
      ![null, 'escaped', 'injured', 'failed'].includes(value.outcome)
    )
      return { ...initialState }
    const area: Area = Object.hasOwn(worlds, value.area) ? value.area : 'first'
    const c = value.chapter2 ?? {}
    const power: PowerDevice[] = Array.isArray(c.power)
      ? [
          ...new Set<PowerDevice>(
            c.power.filter((id: unknown) => powerDevices.some((d) => d.id === id)),
          ),
        ].slice(0, 2)
      : []
    const chapter2: Chapter2 = {
      staffEvent: ['unseen', 'active', 'success', 'failed'].includes(c.staffEvent)
        ? c.staffEvent
        : 'unseen',
      power,
      ending: ['none', 'question', 'echo', 'complete'].includes(c.ending) ? c.ending : 'none',
      completed: c.completed === true,
    }
    const d = value.chapter3 ?? {}
    const npc = ['unseen', 'found', 'helped', 'directed', 'invited', 'waiting'].includes(d.npc)
      ? d.npc
      : 'unseen'
    const approved = d.approved === true
    const signal = approved ? (d.signal === 'green' ? 'green' : 'changing') : 'red'
    const doorOpen = approved && signal === 'green' && d.doorOpen === true
    const boarded =
      doorOpen &&
      d.boarded === true &&
      (isChapter4Area(area) || isChapter5Area(area) || isChapter6Area(area))
    const chapter3: Chapter3 = {
      ...defaultChapter3,
      started: d.started === true || isChapter3Area(area),
      npc,
      aExplained: d.aExplained === true,
      approved,
      signal,
      doorOpen,
      boarded,
      npcBoarded: boarded && d.npcBoarded === true,
      escaped: boarded && d.escaped === true,
      ending: boarded && ['departing', 'complete'].includes(d.ending) ? d.ending : 'none',
    }
    const chapter4 = normalizeChapter4(value.chapter4)
    if (!chapter3.escaped)
      Object.assign(chapter4, defaultChapter4, { links: { ...defaultChapter4.links } })
    const chapter5 = chapter4.completed ? normalizeChapter5(value.chapter5) : { ...defaultChapter5 }
    const chapter6 = normalizeChapter6(value.chapter6, chapter5.completed)
    const restoredArea: Area =
      isChapter6Area(area) && !chapter6.started
        ? chapter5.completed
          ? 'moonPlatform'
          : 'first'
        : area
    const savedScene = restoredArea === area && validMessages(value.scene) ? value.scene : []
    const sceneIndex =
      Number.isInteger(value.sceneIndex) &&
      value.sceneIndex >= 0 &&
      value.sceneIndex < savedScene.length
        ? value.sceneIndex
        : 0
    const view3d = normalizeView3d(
      value.view3d,
      restoredArea,
      chapter2.power,
      chapter3,
      chapter4,
      chapter5,
      chapter6,
    )
    return {
      ...initialState,
      ...value,
      view3d,
      area: restoredArea,
      chapter2,
      chapter3,
      chapter4,
      chapter5,
      chapter6,
      aiChat: normalizeAiChat(value.aiChat),
      reading: normalizeReading(value.reading, value.clues, value.messages.length),
      clues: [...new Set<string>(value.clues)],
      asked: [...new Set<string>(value.asked)],
      inventory: [...new Set<string>(value.inventory)],
      scene: savedScene,
      sceneIndex,
      position: view3d
        ? toWorldPosition(view3d.position, restoredArea)
        : value.position &&
            Number.isFinite(value.position.x) &&
            Number.isFinite(value.position.y) &&
            walkable(
              value.position,
              getWorld(
                restoredArea,
                chapter3.npc,
                chapter3.npcBoarded,
                chapter2.power,
                chapter3.doorOpen,
                chapter4,
                chapter5,
                chapter6,
              ),
            )
          ? value.position
          : worlds[restoredArea].spawn,
    }
  } catch {
    return { ...initialState }
  }
}

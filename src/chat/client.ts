import { hallObjects, scriptedDisclosures } from './chapter2Public'
import { chapter2Areas, chatCharacterIds, chatLimits, defaultAiChat, isRecord } from './contracts'
import type { AiChatState, ChatCharacterId, ChatRequest } from './contracts'
import type { State } from '../game/engine'
import { hallOpening } from '../game/chapter2'

export const isAiChapter2 = (state: State) =>
  state.stage === 'explore' &&
  chapter2Areas.includes(state.area as never) &&
  !state.chapter3.started &&
  !state.chapter4.started &&
  !state.chapter5.started
export const sharedChapter2Clues = (state: State) =>
  state.aiChat.shared.filter((id) => state.clues.includes(id))
export const buildChatRequest = (
  state: State,
  characterId: ChatCharacterId,
  text: string,
  share: string[],
  requestId: string,
): ChatRequest => {
  const beginning = state.messages.findIndex((m) => m.text === hallOpening[0].text)
  let remaining: number = chatLimits.historyTotal
  const recent = state.messages
    .slice(Math.max(0, beginning))
    .filter((m) => ['player', ...chatCharacterIds].includes(m.who as never))
    .slice(-chatLimits.history)
    .reverse()
    .flatMap((m) => {
      const part = m.text.slice(0, Math.min(chatLimits.historyText, remaining))
      remaining -= part.length
      return part ? [{ who: m.who, text: part }] : []
    })
    .reverse()
  return {
    requestId,
    characterId,
    text: text.trim(),
    context: {
      chapter: 2,
      area: state.area as ChatRequest['context']['area'],
      discovered: hallObjects.filter((o) => state.clues.includes(o.id)).map((o) => o.id),
      asked: state.asked.filter((id) => Object.hasOwn(scriptedDisclosures, id)),
      shared: [...new Set([...sharedChapter2Clues(state), ...share])].filter(
        (id) => state.clues.includes(id) && hallObjects.some((o) => o.id === id),
      ),
      recent,
    },
  }
}
export const normalizeAiChat = (value: unknown): AiChatState => {
  if (!isRecord(value)) return { ...defaultAiChat }
  const shared = Array.isArray(value.shared)
    ? value.shared.filter(
        (id): id is string => typeof id === 'string' && hallObjects.some((o) => o.id === id),
      )
    : []
  const p = value.pending
  if (!isRecord(p) || !isRecord(p.request) || !isRecord(p.request.context))
    return { shared, pending: null }
  const r = p.request
  if (
    typeof r.requestId !== 'string' ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(r.requestId) ||
    !chatCharacterIds.includes(r.characterId as never) ||
    typeof r.text !== 'string' ||
    !r.text.trim() ||
    r.text.length > chatLimits.input ||
    !isRecord(r.context) ||
    r.context.chapter !== 2 ||
    !chapter2Areas.includes(r.context.area as never)
  )
    return { shared, pending: null }
  const c = r.context
  if (
    !['discovered', 'shared', 'asked'].every(
      (key) =>
        Array.isArray(c[key]) &&
        c[key].length <= 5 &&
        c[key].every((id: unknown) => typeof id === 'string'),
    ) ||
    !Array.isArray(c.recent) ||
    c.recent.length > chatLimits.history ||
    !c.recent.every(
      (m) =>
        isRecord(m) &&
        typeof m.who === 'string' &&
        typeof m.text === 'string' &&
        m.text.length <= chatLimits.historyText,
    )
  )
    return { shared, pending: null }
  return {
    shared,
    pending: {
      request: r as unknown as ChatRequest,
      status: 'error',
      error: '이전 질문을 아직 완료하지 못했어요. 같은 질문으로 재시도하거나 취소할 수 있어요.',
    },
  }
}

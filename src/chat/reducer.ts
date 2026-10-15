import { chatCharacterIds, chatLimits } from './contracts'
import type { State, Action } from '../game/engine'
import { hallObjects } from './chapter2Public'
import { isAiChapter2 } from './client'

export const reduceAiChat = (state: State, action: Action): State | undefined => {
  const pending = state.aiChat.pending
  if (action.type === 'ai-start') {
    const r = action.request
    if (
      !isAiChapter2(state) ||
      state.scene.length ||
      pending ||
      !chatCharacterIds.includes(r.characterId) ||
      !r.text.trim() ||
      r.text.length > chatLimits.input ||
      state.messages.some((m) => m.id === `q-${r.requestId}`)
    )
      return state
    return {
      ...state,
      aiChat: {
        shared: [...new Set([...state.aiChat.shared, ...r.context.shared])].filter((id) =>
          state.clues.includes(id),
        ),
        pending: { request: r, status: 'pending', error: null },
      },
      messages: [
        ...state.messages,
        {
          id: `q-${r.requestId}`,
          who: 'player',
          text:
            r.text +
            (r.context.shared.length
              ? `\n[공유한 현장 단서: ${hallObjects
                  .filter((o) => r.context.shared.includes(o.id))
                  .map((o) => o.title)
                  .join(', ')}]`
              : ''),
          chapter: 2,
          kind: 'ai-question',
          target: r.characterId,
        },
      ],
    }
  }
  if (action.type === 'ai-retry' && pending?.status === 'error')
    return {
      ...state,
      aiChat: { ...state.aiChat, pending: { ...pending, status: 'pending', error: null } },
    }
  if (action.type === 'ai-dismiss' && pending?.status === 'error')
    return { ...state, aiChat: { ...state.aiChat, pending: null } }
  if (action.type === 'ai-success') {
    const r = action.reply
    if (
      !pending ||
      pending.request.requestId !== r.requestId ||
      pending.request.characterId !== r.characterId ||
      !r.text.trim() ||
      r.text.length > chatLimits.answer ||
      state.messages.some((m) => m.id === `a-${r.requestId}`)
    )
      return state
    return {
      ...state,
      aiChat: { ...state.aiChat, pending: null },
      messages: [
        ...state.messages,
        {
          id: `a-${r.requestId}`,
          who: r.characterId,
          text: r.text,
          chapter: 2,
          kind: r.mode === 'mock' ? 'mock-answer' : 'ai-answer',
        },
      ],
    }
  }
  if (action.type === 'ai-error' && pending?.request.requestId === action.requestId)
    return {
      ...state,
      aiChat: {
        ...state.aiChat,
        pending: { ...pending, status: 'error', error: action.error.slice(0, 200) },
      },
    }
  return undefined
}

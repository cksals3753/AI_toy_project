import { hallQuestions } from '../game/chapter2'
import { scriptedEvidence } from './chapter2Public'
import { describe, it, expect } from 'vitest'
import { initialState, reducer, loadGame } from '../game/engine'
import type { State } from '../game/engine'
import { buildChatRequest, normalizeAiChat, isAiChapter2 } from './client'
const hall = (): State => ({
  ...initialState,
  stage: 'explore',
  area: 'hall',
  scene: [],
  clues: ['hall-window'],
})
const id = '12345678-1234-1234-1234-123456789012'
describe('AI dialogue game integration', () => {
  it('matches disclosure excerpts to the existing player dialogue', () => {
    for (const q of hallQuestions)
      expect(scriptedEvidence[q.id].text).toBe(q.replies.find((m) => m.who === 'player')?.text)
  })

  it('only appears in chapter 2 and preserves world state', () => {
    expect(isAiChapter2(initialState)).toBe(false)
    const before = hall()
    expect(isAiChapter2(before)).toBe(true)
    const request = buildChatRequest(before, 'kang', '질문', [], id)
    expect(request.context.shared).toEqual([])
    const pending = reducer(before, { type: 'ai-start', request })
    expect(pending.messages.at(-1)?.target).toBe('kang')
    const after = reducer(pending, {
      type: 'ai-success',
      reply: { requestId: id, characterId: 'kang', text: '확인하세요.', mode: 'mock' },
    })
    expect({ ...after, messages: before.messages, aiChat: before.aiChat }).toEqual(before)
    expect(after.messages.at(-1)?.who).toBe('kang')
    expect(
      reducer(after, {
        type: 'ai-success',
        reply: { requestId: id, characterId: 'kang', text: '중복', mode: 'mock' },
      }),
    ).toBe(after)
  })
  it('retains the original request through failure, reload and retry', () => {
    const request = buildChatRequest(hall(), 'seo', '질문', ['hall-window'], id)
    let state = reducer(hall(), { type: 'ai-start', request })
    state = reducer(state, { type: 'ai-error', requestId: id, error: 'timeout' })
    expect(normalizeAiChat(JSON.parse(JSON.stringify(state.aiChat))).pending?.request).toEqual(
      request,
    )
    state = { ...state, aiChat: normalizeAiChat(state.aiChat) }
    state = reducer(state, { type: 'ai-retry' })
    expect(state.messages.filter((m) => m.id === `q-${id}`)).toHaveLength(1)
    expect(state.aiChat.pending?.request.requestId).toBe(id)
    expect(state.aiChat.shared).toEqual(['hall-window'])
    expect(
      reducer(initialState, {
        type: 'ai-success',
        reply: { requestId: id, characterId: 'seo', text: 'late', mode: 'mock' },
      }),
    ).toBe(initialState)
  })
  it('defaults old saves and loads completed AI messages', () => {
    const old = { ...hall() } as Partial<State>
    delete old.aiChat
    const storage = { getItem: () => JSON.stringify(old) }
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
    try {
      expect(loadGame().aiChat).toEqual({ shared: [], pending: null })
      const request = buildChatRequest(hall(), 'seo', '저장 확인', ['hall-window'], id)
      const pending = reducer(hall(), { type: 'ai-start', request })
      const completed = reducer(pending, {
        type: 'ai-success',
        reply: { requestId: id, characterId: 'seo', text: '기록을 확인해요.', mode: 'mock' },
      })
      storage.getItem = () => JSON.stringify(completed)
      const loaded = loadGame()
      expect(loaded.messages).toEqual(completed.messages)
      expect(loaded.aiChat).toEqual(completed.aiChat)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true })
    }
  })
  it('bounds history and does not turn a scripted excerpt into a full disclosure', () => {
    const state = hall()
    state.asked = ['hall-blue']
    state.messages = Array.from({ length: 40 }, () => ({ who: 'player', text: 'x'.repeat(1000) }))
    const r = buildChatRequest(state, 'min', '안녕', [], id)
    expect(r.context.shared).toEqual([])
    expect(r.context.asked).toEqual(['hall-blue'])
    expect(r.context.recent.length).toBeLessThanOrEqual(12)
    expect(r.context.recent.reduce((n, m) => n + m.text.length, 0)).toBeLessThanOrEqual(4500)
  })
})

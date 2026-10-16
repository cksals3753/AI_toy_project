import { afterEach, expect, it, vi } from 'vitest'
import { fetchChatStatus, sendChatRequest } from './api'
import { buildChatRequest } from './client'
import { initialState } from '../game/engine'
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
it('paused AI never sends status or generation requests, even after retry', async () => {
  vi.stubEnv('VITE_AI_CHAT_ENABLED', 'false')
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect((await fetchChatStatus()).available).toBe(false)
  const request = buildChatRequest(
    { ...initialState, stage: 'explore', area: 'hall' },
    'seo',
    '연결 확인',
    [],
    'request-1234567890',
  )
  for (let i = 0; i < 2; i++)
    await expect(sendChatRequest(request, new AbortController().signal)).rejects.toThrow(
      '선택형 질문',
    )
  expect(fetch).not.toHaveBeenCalled()
})
it('explicitly enabled AI preserves server availability and reason', async () => {
  vi.stubEnv('VITE_AI_CHAT_ENABLED', 'true')
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ available: false, mode: 'openai', reason: 'quota' }),
  })
  vi.stubGlobal('fetch', fetch)
  expect(await fetchChatStatus()).toEqual({ available: false, mode: 'openai', reason: 'quota' })
  expect(fetch).toHaveBeenCalledTimes(1)
})

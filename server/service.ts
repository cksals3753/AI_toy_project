import { createHash } from 'node:crypto'
import type { ChatReply, ChatRequest } from '../src/chat/contracts.ts'
import type { DialogueAdapter } from './providers/types.ts'
import {
  asksForPrivateSettings,
  buildCharacterContext,
  buildInstructions,
  ChatError,
  safeModelText,
  safeRefusal,
} from './context.ts'

type Cached = { fingerprint: string; expires: number; result: Promise<ChatReply> }
export const createChatService = (
  adapter: DialogueAdapter,
  options: {
    timeoutMs?: number
    now?: () => number
    perMinute?: number
    maxConcurrent?: number
    maxEntries?: number
  } = {},
) => {
  const now = options.now ?? Date.now
  const cache = new Map<string, Cached>()
  const rates = new Map<string, number[]>()
  const activeSessions = new Set<string>()
  let active = 0
  const limit = options.perMinute ?? 6
  const generate = async (session: string, request: ChatRequest): Promise<ChatReply> => {
    const time = now()
    for (const [key, entry] of cache) if (entry.expires < time) cache.delete(key)
    for (const [key, times] of rates) if (!times.some((t) => t > time - 60_000)) rates.delete(key)
    const key = `${session}:${request.requestId}`
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex')
    const existing = cache.get(key)
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new ChatError(409, '같은 요청 번호의 내용이 달라졌어요.')
      return existing.result
    }
    if (!adapter.ready)
      throw new ChatError(503, 'AI 키가 설정되지 않았어요. 기존 선택형 질문은 사용할 수 있어요.')
    if (activeSessions.has(session) || active >= (options.maxConcurrent ?? 2))
      throw new ChatError(429, '답변을 기다리는 중이에요. 잠시 뒤 재시도해주세요.')
    const sessions = (rates.get(`s:${session}`) ?? []).filter((t) => t > time - 60_000)
    const global = (rates.get('global') ?? []).filter((t) => t > time - 60_000)
    if (sessions.length >= limit || global.length >= 30)
      throw new ChatError(429, '호출 한도에 도달했어요. 1분 뒤 재시도해주세요.')
    if (cache.size >= (options.maxEntries ?? 500))
      throw new ChatError(429, '대화 요청이 많아요. 잠시 뒤 재시도해주세요.')
    rates.set(`s:${session}`, [...sessions, time])
    rates.set('global', [...global, time])
    active++
    activeSessions.add(session)
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const result = (async () => {
      try {
        const text = asksForPrivateSettings(request.text)
          ? safeRefusal
          : await Promise.race([
              adapter.generate({
                instructions: buildInstructions(request),
                context: JSON.stringify(buildCharacterContext(request)),
                signal: controller.signal,
              }),
              new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                  controller.abort()
                  reject(
                    new ChatError(504, '답변 시간이 초과됐어요. 같은 질문으로 재시도할 수 있어요.'),
                  )
                }, options.timeoutMs ?? 20_000)
              }),
            ])
        return {
          requestId: request.requestId,
          characterId: request.characterId,
          text: safeModelText(text),
          mode: adapter.mode,
        }
      } catch (error) {
        if (error instanceof ChatError) throw error
        throw new ChatError(502, 'AI 연결에 실패했어요. 같은 질문으로 다시 시도해주세요.')
      } finally {
        clearTimeout(timer)
        active--
        activeSessions.delete(session)
      }
    })()
    cache.set(key, { fingerprint, expires: time + 30 * 60_000, result })
    try {
      return await result
    } catch (error) {
      cache.delete(key)
      if (error instanceof ChatError) throw error
      throw new ChatError(502, 'AI 연결에 실패했어요. 같은 질문으로 다시 시도해주세요.')
    }
  }
  return { generate }
}

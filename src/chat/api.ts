import { chatLimits, isRecord } from './contracts'
import type { ChatReply, ChatRequest } from './contracts'

export const fetchChatStatus = async (signal?: AbortSignal) => {
  if (import.meta.env.VITE_AI_CHAT_ENABLED !== 'true')
    return { available: false, mode: 'openai' as const, reason: 'disabled' }
  const response = await fetch('/api/chat/status', { signal, cache: 'no-store' })
  if (!response.ok)
    throw new Error('대화 서버에 연결하지 못했어요. 기존 선택형 질문은 계속 사용할 수 있어요.')
  const data: unknown = await response.json()
  if (
    !isRecord(data) ||
    typeof data.available !== 'boolean' ||
    !['openai', 'mock'].includes(data.mode as never)
  )
    throw new Error('대화 서버 응답을 확인하지 못했어요.')
  return {
    available: data.available,
    mode: data.mode as 'openai' | 'mock',
    reason: typeof data.reason === 'string' ? data.reason : 'unavailable',
  }
}
export const sendChatRequest = async (
  request: ChatRequest,
  signal: AbortSignal,
): Promise<ChatReply> => {
  const status = await fetchChatStatus(signal)
  if (!status.available)
    throw new Error('AI 자유 대화를 사용할 수 없어요. 기존 선택형 질문으로 계속하세요.')
  const response = await fetch('/api/chat', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data: unknown = await response.json()
  if (!response.ok)
    throw new Error(
      isRecord(data) && typeof data.error === 'string' ? data.error : '대화 요청에 실패했어요.',
    )
  if (
    !isRecord(data) ||
    data.requestId !== request.requestId ||
    data.characterId !== request.characterId ||
    typeof data.text !== 'string' ||
    !data.text.trim() ||
    data.text.length > chatLimits.answer ||
    !['openai', 'mock'].includes(data.mode as never)
  )
    throw new Error('AI 답변 형식이 올바르지 않아요.')
  return data as unknown as ChatReply
}

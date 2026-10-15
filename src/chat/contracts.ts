// Public transport schema only. No character secrets or provider credentials belong here.
export const chatCharacterIds = ['seo', 'kang', 'min', 'oh'] as const
export type ChatCharacterId = (typeof chatCharacterIds)[number]
export const chatLimits = {
  input: 600,
  answer: 700,
  history: 12,
  historyText: 700,
  historyTotal: 4500,
  bodyBytes: 24_000,
} as const
export const chapter2Areas = ['hall', 'electrical', 'stairs'] as const
export type ChatArea = (typeof chapter2Areas)[number]
export type ChatHistory = { who: string; text: string }
export type ChatRequest = {
  requestId: string
  characterId: ChatCharacterId
  text: string
  context: {
    chapter: 2
    area: ChatArea
    discovered: string[]
    asked: string[]
    shared: string[]
    recent: ChatHistory[]
  }
}
export type ChatReply = {
  requestId: string
  characterId: ChatCharacterId
  text: string
  mode: 'openai' | 'mock'
}
export type PendingChat = {
  request: ChatRequest
  status: 'pending' | 'error'
  error: string | null
}
export type AiChatState = { shared: string[]; pending: PendingChat | null }
export const defaultAiChat: AiChatState = { shared: [], pending: null }
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

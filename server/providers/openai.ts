import type { DialogueAdapter } from './types.ts'
import { ChatError } from '../context.ts'
import { isRecord } from '../../src/chat/contracts.ts'

export const createOpenAIAdapter = (options: {
  key?: string
  model?: string
  fetcher?: typeof fetch
}): DialogueAdapter => ({
  mode: 'openai',
  ready: !!options.key?.trim(),
  generate: async ({ instructions, context, signal }) => {
    if (!options.key?.trim())
      throw new ChatError(
        503,
        '서버에 AI 키가 설정되지 않았어요. 기존 선택형 질문으로 계속 진행할 수 있어요.',
      )
    const response = await (options.fetcher ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${options.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || 'gpt-5.4-mini',
        instructions,
        input: [{ role: 'user', content: context }],
        reasoning: { effort: 'none' },
        max_output_tokens: 600,
        store: false,
      }),
    })
    if (!response.ok)
      throw new ChatError(
        response.status === 429 ? 429 : 502,
        'AI 제공자 요청에 실패했어요. 잠시 뒤 같은 질문으로 재시도해주세요.',
      )
    const data: unknown = await response.json()
    if (!isRecord(data) || data.status !== 'completed' || !Array.isArray(data.output))
      throw new ChatError(502, 'AI 답변이 완성되지 않았어요. 다시 시도해주세요.')
    const text = data.output
      .flatMap((item) =>
        isRecord(item) && item.type === 'message' && Array.isArray(item.content)
          ? item.content.flatMap((part) =>
              isRecord(part) && part.type === 'output_text' && typeof part.text === 'string'
                ? [part.text]
                : [],
            )
          : [],
      )
      .join('\n')
      .trim()
    if (!text) throw new ChatError(502, 'AI 답변이 비어 있어요. 다시 시도해주세요.')
    return text
  },
})

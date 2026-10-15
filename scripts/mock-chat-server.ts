// Browser verification fixture only; never selected by production AI_PROVIDER.
import { createChatServer } from '../server/app.ts'
const failed = new Set<string>()
const server = createChatServer({
  origins: ['http://127.0.0.1:5175'],
  adapter: {
    mode: 'mock',
    ready: true,
    generate: async ({ context }) => {
      const text = JSON.parse(context).unverifiedPlayerQuestion as string
      await new Promise((resolve) => setTimeout(resolve, 350))
      if (text === '재시도 검증' && !failed.has(text)) {
        failed.add(text)
        throw new Error('fixture failure')
      }
      return '모의 검증 응답입니다. 현장의 표식을 직접 확인해 주세요.'
    },
  },
})
server.listen(3301, '127.0.0.1')

import { createChatServer } from './app.ts'
import { createOpenAIAdapter } from './providers/openai.ts'

const port = Number(process.env.API_PORT || 3001)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('API_PORT 범위를 확인해주세요.')
if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'openai')
  throw new Error('지원하는 AI_PROVIDER는 openai입니다.')
const server = createChatServer({
  adapter: createOpenAIAdapter({ key: process.env.OPENAI_API_KEY, model: process.env.AI_MODEL }),
  origins: process.env.CHAT_ALLOWED_ORIGINS?.trim()
    ? process.env.CHAT_ALLOWED_ORIGINS.split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : undefined,
  serveStatic: process.env.NODE_ENV === 'production',
  secureCookie: process.env.CHAT_SECURE_COOKIE === 'true',
})
server.listen(port, process.env.API_HOST || '127.0.0.1', () =>
  console.log(`Game API listening on port ${port}.`),
)
server.on('error', () => {
  console.error('Game API could not start. Check host and port.')
  process.exitCode = 1
})

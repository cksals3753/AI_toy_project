import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chatLimits } from '../src/chat/contracts.ts'
import type { DialogueAdapter } from './providers/types.ts'
import { ChatError, validateChatRequest } from './context.ts'
import { createChatService } from './service.ts'

type Options = {
  adapter: DialogueAdapter
  origins?: string[]
  serveStatic?: boolean
  secureCookie?: boolean
  timeoutMs?: number
}
export const createChatServer = (options: Options) => {
  const origins = options.origins ?? ['http://localhost:5173', 'http://127.0.0.1:5173']
  const sessions = new Map<string, number>()
  const traffic = new Map<string, number[]>()
  const service = createChatService(options.adapter, { timeoutMs: options.timeoutMs })
  const json = (response: ServerResponse, status: number, value: unknown) => {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(JSON.stringify(value))
  }
  const readBody = async (request: IncomingMessage) => {
    if (!request.headers['content-type']?.startsWith('application/json'))
      throw new ChatError(415, 'JSON 요청만 지원합니다.')
    let size = 0
    const chunks: Buffer[] = []
    for await (const chunk of request) {
      size += chunk.length
      if (size > chatLimits.bodyBytes) throw new ChatError(413, '대화 기록이 너무 커요.')
      chunks.push(Buffer.from(chunk))
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
    } catch {
      throw new ChatError(400, '요청 형식을 확인해주세요.')
    }
  }
  const session = (request: IncomingMessage) => {
    const token = request.headers.cookie?.match(
      /(?:^|;\s*)last_transfer_chat=([a-zA-Z0-9-]{36})(?:;|$)/,
    )?.[1]
    return token && (sessions.get(token) ?? 0) > Date.now() ? token : null
  }
  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname
      if (!path.startsWith('/api/')) {
        if (!options.serveStatic || !['GET', 'HEAD'].includes(request.method ?? ''))
          return json(response, 404, { error: 'Not found' })
        const root = resolve('dist')
        const file = resolve(root, `.${decodeURIComponent(path)}`)
        if (file !== root && !file.startsWith(root + sep))
          return json(response, 404, { error: 'Not found' })
        const extension = extname(file)
        const target = extension ? file : resolve(root, 'index.html')
        const body = await readFile(target)
        const mime: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
        }
        response.writeHead(200, {
          'Content-Type': mime[extname(target)] ?? 'application/octet-stream',
          'X-Content-Type-Options': 'nosniff',
        })
        response.end(request.method === 'HEAD' ? undefined : body)
        return
      }
      const now = Date.now()
      for (const [key, expires] of sessions) if (expires <= now) sessions.delete(key)
      for (const [key, times] of traffic)
        if (!times.some((t) => t > now - 60_000)) traffic.delete(key)
      const ip = request.socket.remoteAddress ?? 'local'
      const times = (traffic.get(ip) ?? []).filter((t) => t > now - 60_000)
      if (times.length >= 100 || (traffic.size >= 1000 && !traffic.has(ip)))
        throw new ChatError(429, '요청이 많아요. 잠시 뒤 다시 시도해주세요.')
      traffic.set(ip, [...times, now])
      if (request.headers.origin && !origins.includes(request.headers.origin))
        throw new ChatError(403, '허용되지 않은 출처입니다.')
      if (request.method === 'GET' && path === '/api/chat/status') {
        let token = session(request)
        if (!token) {
          if (sessions.size >= 1000)
            throw new ChatError(429, '대화 세션이 많아요. 잠시 뒤 시도해주세요.')
          token = randomUUID()
          sessions.set(token, now + 30 * 60_000)
          response.setHeader(
            'Set-Cookie',
            `last_transfer_chat=${token}; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=1800${options.secureCookie ? '; Secure' : ''}`,
          )
        }
        return json(response, 200, { available: options.adapter.ready, mode: options.adapter.mode })
      }
      if (request.method === 'POST' && path === '/api/chat') {
        if (!request.headers.origin || !origins.includes(request.headers.origin))
          throw new ChatError(403, '같은 게임 화면에서 요청해주세요.')
        const token = session(request)
        if (!token) throw new ChatError(401, '대화 연결을 다시 확인해주세요.')
        const input = validateChatRequest(await readBody(request))
        const reply = await service.generate(token, input)
        return json(response, 200, reply)
      }
      json(response, 404, { error: 'Not found' })
    } catch (error) {
      if (!response.headersSent)
        json(response, error instanceof ChatError ? error.status : 500, {
          error: error instanceof ChatError ? error.message : '서버 요청을 처리하지 못했어요.',
        })
      else response.end()
    }
  }
  const server = createServer((request, response) => {
    void handler(request, response)
  })
  server.requestTimeout = 25_000
  server.headersTimeout = 10_000
  return server
}

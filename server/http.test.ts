import { it, expect } from 'vitest'
import { createChatServer } from './app.ts'
import { createOpenAIAdapter } from './providers/openai.ts'
import type { AddressInfo } from 'node:net'
it('HTTP validates origin/session, serves status without a key and deduplicates mock replies', async () => {
  let calls = 0
  const server = createChatServer({
    adapter: {
      mode: 'mock',
      ready: true,
      generate: async () => {
        calls++
        return '현장 안내를 확인해요.'
      },
    },
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const status = await fetch(`${base}/api/chat/status`)
    expect(await status.json()).toEqual({ available: true, mode: 'mock' })
    const cookie = status.headers.get('set-cookie')!.split(';')[0]
    const body = JSON.stringify({
      requestId: '12345678-1234-1234-1234-123456789012',
      characterId: 'seo',
      text: '안녕',
      context: { chapter: 2, area: 'hall', discovered: [], shared: [], asked: [], recent: [] },
    })
    const post = (origin: string, token = cookie) =>
      fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { origin, cookie: token, 'content-type': 'application/json' },
        body,
      })
    expect((await post('https://evil.example')).status).toBe(403)
    expect((await post('http://localhost:5173', '')).status).toBe(401)
    const one = await post('http://localhost:5173')
    expect(one.status).toBe(200)
    expect(await (await post('http://localhost:5173')).json()).toEqual(await one.json())
    expect(calls).toBe(1)
    const invalid = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { origin: 'http://localhost:5173', cookie, 'content-type': 'application/json' },
      body: body.replace('"seo"', '"invalid"'),
    })
    expect(invalid.status).toBe(400)
    const huge = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { origin: 'http://localhost:5173', cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'x'.repeat(25_000) }),
    })
    expect(huge.status).toBe(413)
    expect((await fetch(`${base}/server/characters.ts`)).status).toBe(404)
    expect((await fetch(`${base}/.env.server`)).status).toBe(404)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  const keyless = createChatServer({ adapter: createOpenAIAdapter({}) })
  await new Promise<void>((resolve) => keyless.listen(0, '127.0.0.1', resolve))
  try {
    expect(
      await (
        await fetch(`http://127.0.0.1:${(keyless.address() as AddressInfo).port}/api/chat/status`)
      ).json(),
    ).toEqual({ available: false, mode: 'openai' })
  } finally {
    await new Promise<void>((resolve) => keyless.close(() => resolve()))
  }
})

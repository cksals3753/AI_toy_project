import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { createExampleDecision } from '../features/decision/example'

const storage = vi.hoisted(() => new Map<string, string>())
const server = setupServer(...handlers)
const collection = 'http://localhost/api/decisions'
const endpoint = `${collection}/example`

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
})
afterEach(() => {
  server.resetHandlers()
  vi.unstubAllGlobals()
})

const put = (body: string) => {
  return fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
}

describe('decision mock API', () => {
  it('creates independent decisions and lists them', async () => {
    const created = { ...createExampleDecision(), id: 'new', title: '다른 고민' }
    const response = await fetch(collection, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) })
    expect(response.status).toBe(201)
    expect(await (await fetch(`${collection}/new`)).json()).toEqual(created)
    expect(await (await fetch(collection)).json()).toHaveLength(2)
    expect((await fetch(`${collection}/missing`)).status).toBe(404)
    expect((await fetch(collection, { method: 'POST', body: JSON.stringify(created) })).status).toBe(409)
  })

  it('migrates the original single decision', async () => {
    const { title, criteria, options } = createExampleDecision()
    storage.set('little-choice-v1', JSON.stringify({ title: '이전 고민', criteria, options }))
    const response = await fetch(collection)
    const list = await response.json()
    expect(list[0].title).toBe('이전 고민')
    expect(list[0].id).toBe('example')
    expect(title).toBeTruthy()
  })

  it('does not overwrite malformed collection data', async () => {
    storage.set('little-choice-v2', '{broken')
    expect((await fetch(collection)).status).toBe(500)
    expect((await put(JSON.stringify(createExampleDecision()))).status).toBe(500)
    expect(storage.get('little-choice-v2')).toBe('{broken')
  })

  it('loads the example, saves changes, and reads them back', async () => {
    expect(await (await fetch(endpoint)).json()).toEqual(createExampleDecision())
    const updated = { ...createExampleDecision(), title: '새 고민' }
    const response = await put(JSON.stringify(updated))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(updated)
    expect(await (await fetch(endpoint)).json()).toEqual(updated)
  })

  it('rejects invalid JSON and invalid scores without overwriting data', async () => {
    expect((await put('{')).status).toBe(400)
    const invalid = createExampleDecision()
    invalid.options[0].scores.fun = 99
    expect((await put(JSON.stringify(invalid))).status).toBe(400)
    expect(await (await fetch(endpoint)).json()).toEqual(createExampleDecision())
  })

  it('reports persistence failures', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('Storage blocked') },
    })
    expect((await put(JSON.stringify(createExampleDecision()))).status).toBe(500)
  })
})

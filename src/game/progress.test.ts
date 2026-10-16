import { describe, expect, it } from 'vitest'
import { initialState, reducer, loadGame, SAVE_KEY } from './engine'
import { chapterInfo, clueGroups, normalizeReading } from './progress'

describe('player-facing progress', () => {
  it('records only acquired clues and does not reveal future notebook entries', () => {
    expect(clueGroups(initialState)).toEqual([])
    const s = { ...initialState, clues: ['hall-map'] }
    expect(clueGroups(s).flatMap((g) => g.items.map((o) => o.id))).toEqual(['hall-map'])
    expect(chapterInfo(initialState).number).toBe(1)
    expect(chapterInfo({ ...s, area: 'hall' }).number).toBe(2)
  })
  it('acknowledges current entries without marking future discoveries read or changing resources', () => {
    const s = { ...initialState, clues: ['hall-map'] }
    const read = reducer(s, { type: 'read', target: 'clues' })
    expect(read.reading.clues).toEqual(['hall-map'])
    expect(read.health).toBe(s.health)
    expect(read.battery).toBe(s.battery)
    expect([...read.clues, 'hall-window'].filter((id) => !read.reading.clues.includes(id))).toEqual(
      ['hall-window'],
    )
    expect(reducer(read, { type: 'reset' }).reading).toEqual({ clues: [], messages: 0 })
  })
  it('loads legacy saves with unread defaults and clamps invalid reading state', () => {
    expect(normalizeReading(undefined, ['hall-map'], 3)).toEqual({ clues: [], messages: 0 })
    expect(
      normalizeReading({ clues: ['unknown', 'hall-map'], messages: 999 }, ['hall-map'], 3),
    ).toEqual({ clues: ['hall-map'], messages: 3 })
    const stored = new Map<string, string>()
    const previous = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (key: string) => stored.get(key) ?? null },
    })
    try {
      const legacy = { ...initialState } as Partial<typeof initialState>
      delete legacy.reading
      stored.set(SAVE_KEY, JSON.stringify(legacy))
      expect(loadGame().reading).toEqual({ clues: [], messages: 0 })
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous })
    }
  })
})

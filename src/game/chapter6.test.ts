import { describe, it, expect, afterEach } from 'vitest'
import { initialState, reducer, loadGame, SAVE_KEY } from './engine'
import type { State, Action } from './engine'
import { finalObjects } from './chapter6'
import { getWorld, walkable, nearestEntity } from './world'
const finish = (s: State) => {
  for (let i = 0; i < 20 && s.scene.length; i++) s = reducer(s, { type: 'advance' })
  return s
}
const act = (s: State, a: Action) => finish(reducer(s, a))
export const chapter5Complete = (together = false, answered = false): State => ({
  ...initialState,
  stage: 'explore',
  area: 'moonPlatform',
  health: 1,
  battery: 0,
  inventory: [],
  chapter2: { ...initialState.chapter2, completed: true },
  chapter3: {
    ...initialState.chapter3,
    started: true,
    npc: together ? (answered ? 'invited' : 'helped') : 'waiting',
    approved: true,
    signal: 'green',
    doorOpen: true,
    boarded: true,
    npcBoarded: together,
    escaped: true,
    ending: 'complete',
  },
  chapter4: {
    ...initialState.chapter4,
    started: true,
    sync: 'accepted',
    arrived: true,
    doorSeen: true,
    completed: true,
  },
  chapter5: {
    ...initialState.chapter5,
    started: true,
    displayName: '한결',
    response: answered ? 'answered' : 'silent',
    registration: answered ? 'cancelled' : 'held',
    matched: true,
    externalPaused: true,
    routeOpen: true,
    exitSeen: true,
    completed: true,
  },
})
const saved = (s: State) => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(s))
  return loadGame()
}
const previous = globalThis.localStorage
const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  },
})
afterEach(() => store.clear())
import { afterAll } from 'vitest'
afterAll(() =>
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous }),
)
describe('chapter 6 episode completion', () => {
  for (const together of [false, true])
    for (const answered of [false, true])
      for (const automatic of [false, true])
        it(`completes and resumes ${JSON.stringify({ together, answered, automatic })}`, () => {
          let s = act(saved(chapter5Complete(together, answered)), { type: 'maintenance-start' })
          expect(s.area).toBe('maintenance')
          expect(s.chapter3.npcBoarded).toBe(together)
          s = saved(s)
          expect(s.chapter5.completed).toBe(true)
          expect(s.chapter3.escaped).toBe(true)
          expect(
            getWorld(s.area, s.chapter3.npc, s.chapter3.npcBoarded).entities.some(
              (e) => e.id === 'survivor',
            ),
          ).toBe(together)
          const blocked = act(s, {
            type: 'maintenance-configure',
            door: 'S-01',
            mode: 'local',
            power: true,
          })
          expect(blocked.chapter6.settings).toBeNull()
          for (const id of ['final-map', 'final-manual']) s = act(s, { type: 'inspect', id })
          s = act(s, { type: 'ask', id: 'final-route-question' })
          const count = s.messages.length
          expect(act(s, { type: 'ask', id: 'final-route-question' }).messages.length).toBe(count)
          s = act(s, { type: 'maintenance-configure', door: 'S-01', mode: 'remote', power: true })
          expect(s.chapter6.settings).toBeNull()
          s = act(s, {
            type: 'maintenance-configure',
            door: automatic ? 'G-01' : 'S-01',
            mode: automatic ? 'remote' : 'local',
            power: true,
          })
          expect(s.area).toBe('maintenance')
          s = act(saved(s), { type: 'maintenance-commit' })
          expect(s.area).toBe(automatic ? 'recovery' : 'shelter')
          expect(s.chapter6.completed).toBe(false)
          if (automatic) {
            s = saved(s)
            expect(s.chapter3.npcBoarded).toBe(together)
            expect(act(s, { type: 'maintenance-bolt' }).chapter6.boltOpen).toBe(false)
            expect(act(s, { type: 'maintenance-hatch' }).area).toBe('recovery')
            for (const id of ['recovery-note', 'recovery-water'])
              s = act(s, { type: 'inspect', id })
            s = act(s, { type: 'maintenance-drain' })
            s = saved(s)
            expect(s.chapter6.drained).toBe(true)
            const observed = reducer(s, { type: 'inspect', id: 'recovery-water' })
            expect(observed.scene[0].text).toContain('수위 낮음')
            s = finish(observed)
            s = act(s, { type: 'maintenance-bolt' })
            s = saved(s)
            expect(s.chapter6.boltOpen).toBe(true)
            s = act(s, { type: 'maintenance-hatch' })
          }
          expect(s.area).toBe('shelter')
          expect(s.chapter6.completed).toBe(false)
          expect(act(s, { type: 'maintenance-arrive' }).chapter6.completed).toBe(false)
          s = act(s, { type: 'inspect', id: 'shelter-sign' })
          s = saved(s)
          s = act(s, { type: 'maintenance-arrive' })
          const result = structuredClone(s.chapter6.result)
          expect(result?.npcTogether).toBe(together)
          expect(result?.health).toBe(1)
          expect(result?.battery).toBe(0)
          expect(result?.clues.includes('moon-disclosure')).toBe(false)
          expect(result?.unknowns.join(' ')).not.toContain('수동 제출자')
          expect(result?.asked).toEqual(['final-route-question'])
          for (const a of [
            { type: 'maintenance-arrive' },
            { type: 'maintenance-commit' },
            { type: 'maintenance-drain' },
            { type: 'read', target: 'clues' },
          ] as Action[])
            s = act(s, a)
          expect(saved(s).chapter6.result).toEqual(result)
          expect(s.chapter3.npcBoarded).toBe(together)
          expect(s.chapter6.result?.facts.join(' ')).not.toContain('수동 전달')
        })
  it('preserves legacy saves and blocks chapter 6 before chapter 5 completion', () => {
    const s = { ...initialState } as Partial<State>
    delete s.chapter6
    expect(saved(s as State).chapter6.started).toBe(false)
    expect(reducer(initialState, { type: 'maintenance-start' })).toBe(initialState)
  })
  it('loads chapter 5 saves without new fields and safely repairs orphaned new areas', () => {
    const legacy = { ...chapter5Complete(true, true) } as Partial<State>
    delete legacy.chapter6
    const restored = saved(legacy as State)
    expect(restored.area).toBe('moonPlatform')
    expect(restored.chapter5.completed).toBe(true)
    expect(restored.chapter3.npcBoarded).toBe(true)
    expect(restored.chapter6.started).toBe(false)
    const orphan = saved({ ...legacy, area: 'recovery' } as State)
    expect(orphan.area).toBe('moonPlatform')
    expect(orphan.chapter3.npcBoarded).toBe(true)
  })
  it('every object and companion is reachable through collisions', () => {
    for (const area of ['maintenance', 'recovery', 'shelter'] as const)
      for (const together of [false, true]) {
        const w = getWorld(area, 'helped', together),
          queue = [w.spawn],
          seen = new Set<string>(),
          reached = new Set<string>()
        for (let i = 0; i < queue.length; i++) {
          const p = queue[i],
            key = `${p.x},${p.y}`
          if (seen.has(key)) continue
          seen.add(key)
          const e = nearestEntity(p, w)
          if (e) reached.add(e.id)
          for (const [x, y] of [
            [10, 0],
            [-10, 0],
            [0, 10],
            [0, -10],
          ]) {
            const n = { x: p.x + x, y: p.y + y }
            if (walkable(n, w) && !seen.has(`${n.x},${n.y}`)) queue.push(n)
          }
        }
        expect([...reached].sort()).toEqual(w.entities.map((e) => e.id).sort())
      }
    expect(finalObjects.length).toBe(6)
  })
})

import { describe, expect, it, vi, afterEach } from 'vitest'
import { getWorld, walkable, movePlayer, nearestEntity } from './world'
import { initialHallEnvironment, outsideRisingWater } from './hallEnvironment'
import { initialState, reducer, loadGame, SAVE_KEY } from './engine'
import { threatPath, createThreat, stepThreat } from './threat'
import type { Point } from './world'
afterEach(() => vi.unstubAllGlobals())
const world = (water: 0 | 1, shutter: 'locked' | 'unlatched' | 'open', gate = false) =>
  getWorld('hall', undefined, false, gate ? ['gate'] : [], false, undefined, undefined, undefined, {
    ...initialHallEnvironment,
    water,
    shutter,
  })
const reachable = (w: ReturnType<typeof world>) => {
  const nodes: Point[] = [],
    seen = new Set<string>(),
    key = (p: Point) => `${p.x},${p.y}`
  const start = { x: 470, y: 480 }
  const queue = [start]
  seen.add(key(start))
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]
    nodes.push(p)
    for (const d of [
      { x: 10, y: 0 },
      { x: -10, y: 0 },
      { x: 0, y: 10 },
      { x: 0, y: -10 },
    ]) {
      const n = { x: p.x + d.x, y: p.y + d.y }
      if (!seen.has(key(n)) && walkable(n, w)) {
        seen.add(key(n))
        queue.push(n)
      }
    }
  }
  return nodes
}
describe('chapter 2 dry navigation before and after leak', () => {
  for (const water of [0, 1] as const)
    for (const shutter of ['locked', 'unlatched', 'open'] as const)
      for (const gate of [false, true]) {
        it(`keeps mandatory approaches and bypass pockets: water=${water}, shutter=${shutter}, gate=${gate}`, () => {
          const w = world(water, shutter, gate),
            nodes = reachable(w)
          for (const id of [
            'hall-map',
            'hall-window',
            'hall-desk',
            'hall-gate-note',
            'staff',
            'gate',
            'oh',
            'hall-shutter',
            ...(shutter === 'open' ? ['electrical'] : []),
          ]) {
            const e = w.entities.find((e) => e.id === id)!
            expect(
              nodes.some(
                (p) =>
                  Math.hypot(
                    p.x - Math.max(e.x, Math.min(p.x, e.x + e.w)),
                    p.y - Math.max(e.y, Math.min(p.y, e.y + e.h)),
                  ) < 53,
              ),
              id,
            ).toBe(true)
          }
          for (const p of [
            { x: 110, y: 300 },
            { x: 210, y: 390 },
            { x: 470, y: 480 },
            { x: 100, y: 400 },
            { x: 470, y: 200 },
          ])
            expect(
              nodes.some((n) => Math.hypot(p.x - n.x, p.y - n.y) < 15),
              JSON.stringify(p),
            ).toBe(true)
          if (shutter !== 'open') expect(nodes.some((p) => p.x === 210 && p.y === 480)).toBe(false)
        })
      }
  it('uses real collision for lowest speed player and enemy routing', () => {
    const w = world(1, 'open', true),
      start = { x: 215, y: 480 },
      goal = { x: 810, y: 290 },
      path = threatPath(start, goal, w)
    expect(path.length).toBeGreaterThan(0)
    let p = start
    for (const n of path)
      for (let i = 0; i < 400 && Math.hypot(p.x - n.x, p.y - n.y) > 3; i++) {
        const d = { x: n.x - p.x, y: n.y - p.y },
          m = Math.hypot(d.x, d.y)
        p = movePlayer(p, { x: d.x / m, y: d.y / m }, 0.025, w, 0.6)
        expect(walkable(p, w)).toBe(true)
      }
    expect(Math.hypot(p.x - goal.x, p.y - goal.y)).toBeLessThan(15)
    let r = createThreat()
    for (let i = 0; i < 2400; i++) {
      r = stepThreat(r, { x: 215, y: 480 }, 0.05, w, false, 0.6)
      expect(walkable(r.position, w)).toBe(true)
    }
    expect(r.caught).toBe(false)
  })
})
describe('persistent hall environment transitions', () => {
  it('requires separate confirmed shutter steps, preserves stages on catch, and guards duplicates', () => {
    const s = {
      ...initialState,
      area: 'hall' as const,
      stage: 'explore' as const,
      scene: [],
      position: { x: 215, y: 390 },
    }
    const a = reducer(s, { type: 'hall-shutter', expected: 'locked' })
    expect(a.chapter2.shutter).toBe('unlatched')
    expect(reducer(a, { type: 'hall-shutter', expected: 'locked' })).toBe(a)
    expect(reducer(a, { type: 'threat-caught' }).chapter2.shutter).toBe('unlatched')
    const b = reducer(a, { type: 'hall-shutter', expected: 'unlatched' })
    expect(b.chapter2.shutter).toBe('open')
  })
  it('defers leak until actors leave its new footprint and never rewinds on power order', () => {
    const s = {
      ...initialState,
      area: 'electrical' as const,
      stage: 'explore' as const,
      scene: [],
      chapter2: { ...initialState.chapter2, shutter: 'open' as const, visited: true },
    }
    expect(outsideRisingWater({ x: 750, y: 380 })).toBe(false)
    expect(reducer(s, { type: 'hall-leak', enemy: { x: 750, y: 380 } })).toBe(s)
    const occupied = { ...s, area: 'hall' as const, position: { x: 750, y: 380 } }
    expect(reducer(occupied, { type: 'hall-leak', enemy: { x: 470, y: 190 } })).toBe(occupied)
    const unvisited = {
      ...s,
      chapter2: { ...s.chapter2, visited: false, power: ['lights' as const, 'gate' as const] },
    }
    expect(reducer(unvisited, { type: 'hall-leak', enemy: { x: 470, y: 190 } })).toBe(unvisited)
    const a = reducer(s, { type: 'hall-leak', enemy: { x: 470, y: 190 } })
    expect(a.chapter2.water).toBe(1)
    expect(reducer(a, { type: 'hall-leak', enemy: { x: 470, y: 190 } })).toBe(a)
    expect(reducer(a, { type: 'power', device: 'gate' }).chapter2.water).toBe(1)
  })
  it('migrates progressed legacy saves without new locks, and repairs newly submerged positions', () => {
    const s = {
      ...initialState,
      area: 'hall',
      stage: 'explore',
      chapter2: { power: ['lights'], staffEvent: 'failed', completed: false, ending: 'none' },
      position: { x: 750, y: 380 },
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === SAVE_KEY ? JSON.stringify(s) : null),
    })
    const loaded = loadGame()
    expect(loaded.chapter2.shutter).toBe('open')
    expect(loaded.chapter2.water).toBe(1)
    expect(walkable(loaded.position, world(1, 'open'))).toBe(true)
    expect(loaded.notice).toContain('안전 위치')
  })
})

describe('field operation uses the same reach and confirmed state as interaction', () => {
  it('2D interaction cannot bypass the shutter bay side wall', () => {
    const w = world(0, 'locked')
    expect(nearestEntity({ x: 280, y: 445 }, w)?.id).not.toBe('hall-shutter')
    expect(nearestEntity({ x: 215, y: 390 }, w)?.id).toBe('hall-shutter')
  })

  it('accepts edge approaches, cancels on movement/menu/capture, and never commits an unfinished save', async () => {
    const { stepShutterOperation, shutterReachable } = await import('./hallEnvironment')
    const p = { x: 110, y: 395 }
    expect(shutterReachable(p)).toBe(true)
    const op = { stage: 'locked' as const, time: 0, origin: p }
    const frame = { active: true, caught: false, stage: 'locked' as const, player: p, dt: 0.05 }
    let n = stepShutterOperation(op, frame)
    expect(n.status).toBe('running')
    expect(stepShutterOperation(op, { ...frame, active: false }).status).toBe('cancelled')
    expect(stepShutterOperation(op, { ...frame, caught: true }).status).toBe('cancelled')
    expect(stepShutterOperation(op, { ...frame, player: { x: 115, y: 395 } }).status).toBe(
      'cancelled',
    )
    for (let i = 0; i < 20 && n.operation; i++) n = stepShutterOperation(n.operation, frame)
    expect(n.status).toBe('complete')
    expect(op.stage).toBe('locked') // Runtime completion requests a separate reducer commit.
  })
  it('applies brightness bounds without changing world collision or gate power', async () => {
    const { normalizeComfort } = await import('./comfort')
    expect(normalizeComfort({ brightness: 999 }).brightness).toBe(1.25)
    expect(normalizeComfort({ brightness: -1 }).brightness).toBe(0.85)
    const w = world(1, 'open', false)
    const gate = w.entities.find((e) => e.id === 'gate')!
    expect('passable' in gate && gate.passable).not.toBe(true)
  })
})

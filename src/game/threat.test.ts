import { afterEach, describe, expect, it } from 'vitest'
import { canSee, createThreat, sightClear, stepThreat, threatPath, threatWalkable } from './threat'
import { hall, room, walkable } from './world'
import type { World } from './world'
import type { State } from './engine'
import { initialState, loadGame, reducer, SAVE_KEY } from './engine'
const empty: World = { ...room, obstacles: [], entities: [] }
const wall: World = {
  ...empty,
  obstacles: [
    { x: 70, y: 80, w: 1, h: 1 },
    { x: 72, y: 80, w: 1, h: 1 },
    { x: 300, y: 150, w: 22, h: 240 },
  ],
}
const actor = () => ({ ...createThreat(), position: { x: 220, y: 240 }, heading: 0 })
const run = (
  enemy: ReturnType<typeof createThreat>,
  p: { x: number; y: number },
  seconds: number,
  w: World = empty,
) => {
  for (let t = 0; t < seconds; t += 0.025) enemy = stepThreat(enemy, p, 0.025, w)
  return enemy
}
afterEach(() => Reflect.deleteProperty(globalThis, 'localStorage'))
describe('infection perception and movement', () => {
  it('requires range, field of view and unobstructed sight', () => {
    expect(canSee(actor(), { x: 350, y: 240 }, empty)).toBe(true)
    expect(canSee(actor(), { x: 100, y: 240 }, empty)).toBe(false)
    expect(canSee(actor(), { x: 800, y: 240 }, empty)).toBe(false)
    expect(canSee(actor(), { x: 350, y: 240 }, wall)).toBe(false)
  })
  it('does not depend on a wall being after furniture in the collision array', () => {
    const w: World = { ...empty, obstacles: [{ x: 300, y: 150, w: 22, h: 240 }] }
    expect(canSee(actor(), { x: 350, y: 240 }, w)).toBe(false)
  })
  it('blocks a thin diagonal corner intersection without ray sampling gaps', () => {
    const w: World = { ...empty, obstacles: [{ x: 150.1, y: 150, w: 1, h: 0.3 }] }
    expect(sightClear({ x: 100, y: 100 }, { x: 200, y: 200 }, w)).toBe(false)
  })
  it('keeps an entire patrol inside the shared collision bounds', () => {
    let e = createThreat()
    for (let i = 0; i < 1200; i++) {
      e = stepThreat(e, { x: 890, y: 530 }, 0.05, hall)
      expect(walkable(e.position, hall)).toBe(true)
    }
  })
  it('benches block movement but not sight; tall columns block both', () => {
    const e = { ...actor(), position: { x: 365, y: 235 }, heading: Math.PI / 2 }
    expect(sightClear(e.position, { x: 365, y: 330 }, hall)).toBe(true)
    expect(walkable({ x: 365, y: 280 }, hall)).toBe(false)
    expect(sightClear({ x: 300, y: 430 }, { x: 400, y: 430 }, hall)).toBe(false)
  })
  it('waits before chase and requires continuous contact to capture', () => {
    let e = run(actor(), { x: 250, y: 240 }, 0.5)
    expect(e.mode).toBe('suspect')
    expect(e.caught).toBe(false)
    e = run(e, { x: 250, y: 240 }, 3)
    expect(e.mode).toBe('chase')
    expect(e.caught).toBe(true)
  })
  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])(
    'retains contact at the exact target from heading %s',
    (heading) => {
      const e = { ...actor(), heading, mode: 'chase' as const, awareness: 2 }
      const p = {
        x: e.position.x + Math.cos(heading) * 40,
        y: e.position.y + Math.sin(heading) * 40,
      }
      expect(run(e, p, 3).caught).toBe(true)
    },
  )
  it('does not capture through a wall', () => {
    const e = { ...actor(), position: { x: 292, y: 240 }, mode: 'chase' as const, awareness: 2 }
    expect(run(e, { x: 316, y: 240 }, 4, wall).caught).toBe(false)
  })
  it('searches the last visible point without following hidden player coordinates', () => {
    const e = { ...actor(), mode: 'chase' as const, lastSeen: { x: 280, y: 240 } }
    const a = run(e, { x: 400, y: 240 }, 0.5, wall),
      b = run(e, { x: 430, y: 250 }, 0.5, wall)
    expect(a).toEqual(b)
    expect(a.lastSeen).toEqual(e.lastSeen)
    expect(a.mode).toBe('search')
  })
  it('finishes searching and returns to patrol', () => {
    const e = { ...actor(), mode: 'search' as const, lastSeen: { x: 220, y: 240 }, remaining: 0.1 }
    expect(run(e, { x: 850, y: 500 }, 1, empty).mode).toBe('return')
  })
  it('plans around the same expanded collision rectangles', () => {
    const p = threatPath({ x: 220, y: 240 }, { x: 400, y: 240 }, wall)
    expect(p.length).toBeGreaterThan(2)
    let previous = { x: 220, y: 240 }
    for (const next of p) {
      for (let t = 0; t <= 1; t += 0.05)
        expect(
          threatWalkable(
            {
              x: previous.x + (next.x - previous.x) * t,
              y: previous.y + (next.y - previous.y) * t,
            },
            wall,
          ),
        ).toBe(true)
      previous = next
    }
  })
  it('hears the gate location, not the unseen player, and consumes it once', () => {
    const a = stepThreat(createThreat(), { x: 100, y: 500 }, 0.025, hall, true)
    expect(a.lastSeen).toEqual({ x: 815, y: 300 })
    expect(a.gateHeard).toBe(true)
    const b = stepThreat(
      { ...a, lastSeen: { x: 400, y: 190 } },
      { x: 100, y: 500 },
      0.025,
      hall,
      true,
    )
    expect(b.lastSeen).toEqual({ x: 400, y: 190 })
  })
  it('does not advance with zero time or catch up a long background interval', () => {
    const e = createThreat()
    expect(stepThreat(e, { x: 850, y: 500 }, 0)).toBe(e)
    const n = stepThreat(e, { x: 850, y: 500 }, 3600)
    expect(
      Math.hypot(n.position.x - e.position.x, n.position.y - e.position.y),
    ).toBeLessThanOrEqual(3.26)
  })
})
describe('capture recovery and save compatibility', () => {
  const base = (): State => ({
    ...initialState,
    stage: 'explore' as const,
    area: 'hall' as const,
    inventory: ['전기실 열쇠'],
    clues: ['hall-map'],
    asked: ['hall-path'],
    health: 1,
    battery: 0,
    chapter2: { ...initialState.chapter2, power: ['lights', 'gate'] as ('lights' | 'gate')[] },
  })
  const reload = (s: unknown) => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (key: string) => (key === SAVE_KEY ? JSON.stringify(s) : null) },
    })
    return loadGame()
  }
  it('retries repeatedly without losing resources or duplicating records', () => {
    let s = base()
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'threat-caught' })
      expect(s.threat.caught).toBe(true)
      s = reducer(s, { type: 'threat-retry' })
      while (s.scene.length) s = reducer(s, { type: 'advance' })
      expect(s.health).toBe(1)
      expect(s.battery).toBe(0)
      expect(s.clues).toEqual(['hall-map'])
      expect(s.inventory).toEqual(['전기실 열쇠'])
      expect(s.asked).toEqual(['hall-path'])
      expect(s.chapter2.power).toEqual(['lights', 'gate'])
    }
  })
  it('uses the electrical checkpoint after entering it', () => {
    let s = reducer(base(), { type: 'enter-electrical' })
    expect(s.threat.checkpoint).toBe('electrical')
    s = reducer(s, { type: 'return-hall' })
    s = reducer(reducer(s, { type: 'threat-caught' }), { type: 'threat-retry' })
    expect(s.area).toBe('electrical')
    expect(s.threat.caught).toBe(false)
  })
  it('restores a pursuit to safety without offline simulation', () => {
    const s = base()
    const a = reload({ ...s, threat: { ...s.threat, alert: true, checkpoint: 'electrical' } })
    expect(a.area).toBe('electrical')
    expect(a.threat.alert).toBe(false)
    expect(a.scene[0].text).toContain('안전')
    expect(a.health).toBe(s.health)
    expect(a.chapter2.power).toEqual(s.chapter2.power)
  })
  it('legacy saves gain defaults and later chapters never relocate', () => {
    const s = base()
    const { threat: unused, ...legacy } = s
    void unused
    expect(reload(legacy).threat).toEqual(initialState.threat)
    const later = {
      ...s,
      area: 'stairs',
      chapter2: { ...s.chapter2, completed: true, ending: 'complete' },
      threat: { ...s.threat, alert: true },
    }
    expect(reload(later).area).toBe('stairs')
  })
  it('preserves one-time staff injury and messages through retries', () => {
    let s = reducer(reducer({ ...base(), health: 100 }, { type: 'staff-start' }), {
      type: 'staff-result',
      success: false,
    })
    while (s.scene.length) s = reducer(s, { type: 'advance' })
    const messages = s.messages
    for (let i = 0; i < 3; i++) {
      s = reducer(reducer(s, { type: 'threat-caught' }), { type: 'threat-retry' })
      while (s.scene.length) s = reducer(s, { type: 'advance' })
      s = reducer(s, { type: 'staff-result', success: false })
      expect(s.health).toBe(80)
      expect(s.chapter2.staffEvent).toBe('failed')
      expect(s.messages).toEqual(messages)
    }
  })
  it('first-room shocks are progress events and cannot be farmed or cause harm', () => {
    let s = reducer(initialState, { type: 'start' })
    s = reducer(s, { type: 'threat-room-beat' })
    expect(s.threat.roomBeat).toBe(1)
    expect(reducer(s, { type: 'threat-room-beat' })).toBe(s)
    s = reducer(s, { type: 'inspect', id: 'map' })
    s = reducer(s, { type: 'threat-room-beat' })
    expect(s.threat.roomBeat).toBe(2)
    expect(s.health).toBe(100)
    expect(reload(s).threat.roomBeat).toBe(2)
  })
  it('blocks repeated capture and repeat events', () => {
    const s = reducer(base(), { type: 'threat-caught' })
    expect(reducer(s, { type: 'threat-caught' })).toBe(s)
    const g = reducer(base(), { type: 'threat-gate-consumed' })
    expect(reducer(g, { type: 'threat-gate-consumed' })).toBe(g)
  })
})

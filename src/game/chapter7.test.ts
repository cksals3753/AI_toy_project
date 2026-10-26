import { afterAll, describe, expect, it } from 'vitest'
import { initialState, reducer, loadGame, SAVE_KEY } from './engine'
import type { State, Action } from './engine'
import { chapter7Objects, RESPONSE_SECONDS, remaining7, companionRestLine } from './chapter7'
import { workingFaceVisible, interactionSurface } from './interaction'
import { getWorld, walkable } from './world'
const finish = (s: State) => {
  for (let i = 0; i < 30 && s.scene.length; i++) s = reducer(s, { type: 'advance' })
  return s
}
const act = (s: State, a: Action) => finish(reducer(s, a))
const episode1 = (together = false, automatic = false): State => {
  let s: State = {
    ...initialState,
    stage: 'explore',
    area: 'shelter',
    health: together ? 0 : 1,
    battery: 0,
    inventory: [],
    chapter3: {
      ...initialState.chapter3,
      started: true,
      approved: true,
      signal: 'green',
      doorOpen: true,
      boarded: true,
      escaped: true,
      npcBoarded: together,
      npc: together ? 'helped' : 'waiting',
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
      response: automatic ? 'answered' : 'silent',
      registration: automatic ? 'cancelled' : 'held',
      matched: true,
      externalPaused: true,
      routeOpen: true,
      exitSeen: true,
      completed: true,
    },
    chapter6: {
      ...initialState.chapter6,
      started: true,
      route: automatic ? 'automatic' : 'manual',
      drained: automatic,
      boltOpen: automatic,
    },
    clues: ['shelter-sign'],
  }
  s = act(s, { type: 'maintenance-arrive' })
  return s
}
const prepare = (s: State) => {
  s = act(s, { type: 's7-start' })
  s = act(s, { type: 's7-rest' })
  for (const o of chapter7Objects) s = act(s, { type: 'inspect', id: o.id })
  return act(s, { type: 's7-observe' })
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
afterAll(() =>
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous }),
)
const restore = (s: State) => {
  store.set(SAVE_KEY, JSON.stringify(s))
  return loadGame()
}
describe('chapter7 episode bridge and work', () => {
  for (const together of [false, true])
    for (const automatic of [false, true])
      for (const priority of ['entrance', 'rear'] as const)
        it(`completes ${priority} companion=${together} priorAutomatic=${automatic}`, () => {
          const old = episode1(together, automatic),
            result = structuredClone(old.chapter6.result)
          let s = prepare(restore(old))
          expect(s.chapter7.phase).toBe('prepare')
          expect(s.health).toBe(30)
          expect(s.battery).toBe(20)
          expect(s.chapter5.displayName).toBe('한결')
          s = act(s, { type: 's7-begin' })
          s = act(s, { type: 's7-kit' })
          s = restore(s)
          expect(s.chapter7.kit).toBe('carried')
          s = act(s, { type: 's7-kit' })
          expect(s.chapter7.kit).toBe('rack')
          s = act(s, { type: 's7-kit' })
          s = act(s, { type: 's7-install', destination: priority })
          s = restore(s)
          const before = remaining7(s.chapter7)
          s = act(s, { type: 's7-install', destination: priority === 'rear' ? 'entrance' : 'rear' })
          expect(s.chapter7.priority).toBe(priority)
          expect(remaining7(s.chapter7)).toBe(before)
          const world = () =>
            getWorld(
              s.area,
              s.chapter3.npc,
              s.chapter6.result!.npcTogether,
              [],
              false,
              s.chapter4,
              s.chapter5,
              s.chapter6,
              s.chapter2,
              s.chapter7,
            )
          expect(walkable({ x: 620, y: 465 }, world())).toBe(priority === 'rear')
          s = { ...s, position: { x: 690, y: 160 } }
          if (priority === 'entrance') {
            s = act(s, { type: 's7-winch' })
            s = restore(s)
            expect(s.chapter7.winch).toBe('released')
            s = act(s, { type: 's7-winch' })
            expect(s.chapter7.winch).toBe('open')
          }
          s = { ...s, position: { x: 850, y: 340 } }
          s = act(s, { type: 's7-firedoor' })
          s = restore(s)
          expect(s.chapter7.fireDoor).toBe('closed')
          s = act(s, { type: 's7-firedoor' })
          expect(s.chapter7.phase).toBe('secured')
          const elapsed = s.chapter7.elapsed
          s = act(s, { type: 's7-tick', dt: 0.1 })
          expect(s.chapter7.elapsed).toBe(elapsed)
          expect(act(s, { type: 's7-complete' }).chapter7.phase).toBe('secured')
          s = act(s, { type: 's7-ready' })
          s = restore(s)
          s = act(s, { type: 's7-complete' })
          s = restore(s)
          expect(s.chapter7.phase).toBe('complete')
          expect(s.chapter6.result).toEqual(result)
          expect(s.chapter6.result?.npcTogether).toBe(together)
          expect(act(s, { type: 's7-start' })).toEqual(s)
        })
  it('does not ask for explanations before the chapter7 opening claims were shared', () => {
    let s = act(episode1(), { type: 's7-start' })
    s = act(s, { type: 's7-rest' })
    for (const o of chapter7Objects) s = act(s, { type: 'inspect', id: o.id })
    expect(act(s, { type: 'ask', id: 's7-support' }).asked).not.toContain('s7-support')
    s = act(s, { type: 's7-observe' })
    s = act(s, { type: 'ask', id: 's7-support' })
    expect(s.asked).toContain('s7-support')
  })
  it('does not invent an invitation or physical help for older companion records', () => {
    expect(companionRestLine('helped')).toContain('부축')
    expect(companionRestLine('invited')).toContain('함께 가자고')
    expect(companionRestLine(undefined)).not.toMatch(/부축|함께 가자고/)
  })
  it('isolates both merged routes from the rear preparation area when bolted', () => {
    const c = {
      ...initialState.chapter7,
      started: true,
      kit: 'rear' as const,
      priority: 'rear' as const,
      fireDoor: 'bolted' as const,
    }
    const w = getWorld(
      'shelterDefense',
      'unseen',
      false,
      [],
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      c,
    )
    for (let y = 83; y <= 537; y += 5) expect(walkable({ x: 746, y }, w)).toBe(false)
    const open = getWorld(
      'shelterDefense',
      'unseen',
      false,
      [],
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { ...c, fireDoor: 'open' },
    )
    expect(walkable({ x: 746, y: 320 }, open)).toBe(true)
  })
  it('uses reachable safe-side working surfaces for the vertical doors', () => {
    const world = getWorld('shelterDefense')
    const door = world.entities.find((e) => e.id === 's7-firedoor')!
    expect(workingFaceVisible({ x: 850, y: 340 }, door)).toBe(true)
    expect(workingFaceVisible({ x: 700, y: 380 }, door)).toBe(false)
    expect(interactionSurface(door)).toMatchObject({ x: door.x + door.w - 2, w: 2, h: door.h })
    const rear = world.entities.find((e) => e.id === 's7-rear')!
    expect(workingFaceVisible({ x: 540, y: 460 }, rear)).toBe(true)
    expect(workingFaceVisible({ x: 660, y: 460 }, rear)).toBe(false)
  })
  it('waits for explicit begin, expires, safely restores and retries without resource loss', () => {
    let s = prepare(episode1(true))
    const snapshot = structuredClone(s.chapter6.result)
    for (let i = 0; i < 2000; i++) s = act(s, { type: 's7-tick', dt: 0.1 })
    expect(s.chapter7.elapsed).toBe(0)
    s = act(s, { type: 'ask', id: 's7-one-kit' })
    const count = s.messages.length
    expect(act(s, { type: 'ask', id: 's7-one-kit' }).messages.length).toBe(count)
    s = act(s, { type: 's7-begin' })
    s = act(s, { type: 's7-kit' })
    for (let i = 0; i < RESPONSE_SECONDS * 10 + 2; i++) s = reducer(s, { type: 's7-tick', dt: 0.1 })
    expect(s.chapter7.phase).toBe('failed')
    s = restore(s)
    expect(s.chapter7.phase).toBe('failed')
    for (let i = 0; i < 3; i++) {
      s = act(s, { type: 's7-retry' })
      expect(s.chapter7.kit).toBe('rack')
      expect(s.chapter7.elapsed).toBe(0)
      expect(s.messages.length).toBe(count)
      expect(s.chapter6.result).toEqual(snapshot)
      expect(s.health).toBe(30)
      expect(s.battery).toBe(20)
      expect(act(s, { type: 's7-rest' }).health).toBe(30)
      s = act(s, { type: 's7-begin' })
      s = { ...s, chapter7: { ...s.chapter7, elapsed: 180, phase: 'failed' } }
    }
  })
  it('preserves active time, assistance, old saves and guards scene input', () => {
    const old = episode1()
    const legacy = JSON.parse(JSON.stringify(old))
    delete legacy.chapter7
    expect(restore(legacy).chapter7.started).toBe(false)
    let s = prepare(old)
    s = act(s, { type: 's7-assist', enabled: true })
    s = act(s, { type: 's7-begin' })
    s = act(s, { type: 's7-tick', dt: 10000 })
    expect(s.chapter7.elapsed).toBe(0)
    s = act(s, { type: 's7-assist', enabled: false })
    s = act(s, { type: 's7-tick', dt: 10000 })
    expect(s.chapter7.elapsed).toBe(0.1)
    expect(restore(s).chapter7.elapsed).toBe(0.1)
    const dialogue = reducer(s, { type: 'talk', lines: [{ who: 'player', text: '읽기' }] })
    expect(reducer(dialogue, { type: 's7-tick', dt: 0.1 }).chapter7.elapsed).toBe(0.1)
    expect(reducer(dialogue, { type: 's7-install', destination: 'rear' }).chapter7.kit).toBe('rack')
  })
})

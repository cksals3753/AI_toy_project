import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialState, reducer, loadGame } from './engine'
import { makeView3d, normalizeView3d } from './view3d'
import { usesFirstPerson, toWorldPosition, toScenePosition } from './firstPerson'
import { getWorld, walkable } from './world'
const hall = () => ({
  ...initialState,
  stage: 'explore' as const,
  area: 'hall' as const,
  scene: [],
})
const reload = (value: unknown) => {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(value) })
  return loadGame()
}
afterEach(() => vi.unstubAllGlobals())
describe('3D position schema and compatibility', () => {
  it('round-trips scene coordinates independently of legacy 2D fields', () => {
    const p = { x: 470, y: 460 },
      view = makeView3d('hall', p, 1, -0.2)
    expect(view.position).not.toEqual(p)
    expect(toWorldPosition(view.position, 'hall')).toEqual(p)
    expect(toScenePosition(p, 'first')).not.toEqual(view.position)
    const loaded = reload({ ...hall(), position: { x: 95, y: 300 }, view3d: view })
    expect(loaded.position).toEqual(p)
    expect(loaded.view3d?.yaw).toBe(1)
  })
  it('keeps legacy progress and defaults the missing camera schema', () => {
    const s = {
      ...hall(),
      position: { x: 760, y: 440 },
      clues: ['hall-map'],
      inventory: ['전기실 열쇠'],
      chapter2: { ...initialState.chapter2, power: ['lights'], staffEvent: 'failed' },
    }
    const loaded = reload(s)
    expect(loaded.view3d).toBeNull()
    expect(loaded.clues).toEqual(s.clues)
    expect(loaded.chapter2).toEqual(s.chapter2)
  })
  it('rejects walls, closed gates, obstacles, invalid formats and mismatched areas', () => {
    for (const p of [
      { x: 30, y: 250 },
      { x: 350, y: 280 },
      { x: 880, y: 300 },
    ])
      expect(normalizeView3d(makeView3d('hall', p), 'hall', [])).toBeNull()
    expect(normalizeView3d(makeView3d('electrical', { x: 480, y: 455 }), 'hall', [])).toBeNull()
    expect(
      normalizeView3d({ ...makeView3d('hall', { x: 470, y: 460 }), yaw: NaN }, 'hall', []),
    ).toBeNull()
    expect(
      normalizeView3d(
        { version: 1, area: 'hall', position: { x: 470, y: 460 }, yaw: 0, pitch: 0 },
        'hall',
        [],
      ),
    ).toBeNull()
  })
  it('uses the same gate flag for traversal and saved pose validation', () => {
    const p = { x: 880, y: 300 },
      view = makeView3d('hall', p)
    expect(walkable(p, getWorld('hall', 'unseen', false, []))).toBe(false)
    expect(walkable(p, getWorld('hall', 'unseen', false, ['gate']))).toBe(true)
    expect(normalizeView3d(view, 'hall', ['gate'])).toEqual(view)
    expect(normalizeView3d(view, 'hall', [])).toBeNull()
    expect(walkable({ x: 880, y: 260 }, getWorld('hall', 'unseen', false, ['gate']))).toBe(false)
  })
  it('ignores late callbacks and keeps resources, story and clues unchanged', () => {
    const before = hall(),
      view = makeView3d('hall', { x: 470, y: 460 }, 0.5, 0.1)
    const after = reducer(before, { type: 'view3d', view })
    expect(after.view3d).toEqual(view)
    expect(after.chapter2).toEqual(before.chapter2)
    expect(after.health).toBe(before.health)
    expect(after.clues).toEqual(before.clues)
    expect(reducer({ ...after, area: 'electrical' }, { type: 'view3d', view }).view3d).toEqual(view)
  })
  it('commits danger recovery once without restoring the pre-danger pose', () => {
    const active = reducer(
      { ...hall(), view3d: makeView3d('hall', { x: 100, y: 350 }) },
      { type: 'staff-start' },
    )
    const result = reducer(active, { type: 'staff-result', success: false })
    expect(result.position).toEqual({ x: 115, y: 300 })
    expect(result.view3d?.position).toEqual(toScenePosition(result.position, 'hall'))
    const loaded = reload(result)
    expect(loaded.health).toBe(80)
    expect(loaded.position).toEqual(result.position)
    expect(reducer(loaded, { type: 'staff-result', success: false })).toBe(loaded)
  })
})

describe('chapter 3 camera collision and migration', () => {
  it('validates survivor location against the current branch', () => {
    const atSeat = makeView3d('platform', { x: 625, y: 330 })
    expect(
      normalizeView3d(atSeat, 'platform', [], {
        npc: 'helped',
        npcBoarded: false,
        doorOpen: false,
      }),
    ).toBeNull()
    expect(
      normalizeView3d(atSeat, 'platform', [], {
        npc: 'unseen',
        npcBoarded: false,
        doorOpen: false,
      }),
    ).not.toBeNull()
  })
  it('opens only the B door threshold and never the car body', () => {
    const p = { x: 647, y: 505 }
    expect(walkable(p, getWorld('platform', 'helped', false, [], false))).toBe(false)
    expect(walkable(p, getWorld('platform', 'helped', false, [], true))).toBe(true)
    expect(walkable({ x: 750, y: 510 }, getWorld('platform', 'helped', false, [], true))).toBe(
      false,
    )
    expect(
      normalizeView3d(makeView3d('platform', p), 'platform', [], {
        npc: 'helped',
        npcBoarded: false,
        doorOpen: false,
      }),
    ).toBeNull()
    expect(
      normalizeView3d(makeView3d('platform', p), 'platform', [], {
        npc: 'helped',
        npcBoarded: false,
        doorOpen: true,
      }),
    ).not.toBeNull()
  })
})

it('uses 3D through chapter 6', () => {
  expect(usesFirstPerson('platform')).toBe(true)
  expect(usesFirstPerson('trainA')).toBe(true)
  expect(usesFirstPerson('trainB')).toBe(true)
  expect(usesFirstPerson('trainRear')).toBe(true)
  expect(usesFirstPerson('trainFront')).toBe(true)
  expect(usesFirstPerson('moonPlatform')).toBe(true)
  expect(usesFirstPerson('moonBooth')).toBe(true)
  expect(usesFirstPerson('moonHolding')).toBe(true)
  expect(usesFirstPerson('maintenance')).toBe(true)
  expect(usesFirstPerson('recovery')).toBe(true)
  expect(usesFirstPerson('shelter')).toBe(true)
})

describe('chapter 4 train camera and companion', () => {
  it('uses arrival state for the external door collision and restored camera', async () => {
    const { defaultChapter4 } = await import('./chapter4')
    const c = { ...defaultChapter4, started: true }
    const c3 = { ...initialState.chapter3, npc: 'helped' as const, npcBoarded: true }
    const view = makeView3d('trainB', { x: 470, y: 525 })
    expect(normalizeView3d(view, 'trainB', [], c3, c)).toBeNull()
    expect(normalizeView3d(view, 'trainB', [], c3, { ...c, arrived: true })).toEqual(view)
    expect(
      walkable(
        { x: 470, y: 560 },
        getWorld('trainB', 'helped', true, [], true, { ...c, arrived: true }),
      ),
    ).toBe(false)
  })
  it('keeps a single companion in the central car and preserves silent/solo progress', async () => {
    const { defaultChapter4 } = await import('./chapter4')
    const c = { ...defaultChapter4, started: true }
    expect(
      getWorld('trainB', 'helped', true, [], true, c).entities.filter((e) => e.kind === 'npc'),
    ).toHaveLength(1)
    for (const area of ['trainRear', 'trainFront'] as const)
      expect(
        getWorld(area, 'helped', true, [], true, c).entities.filter((e) => e.kind === 'npc'),
      ).toHaveLength(0)
    expect(
      getWorld('trainB', 'waiting', false, [], true, c).entities.filter((e) => e.kind === 'npc'),
    ).toHaveLength(0)
    for (const together of [true, false])
      expect(
        walkable(
          { x: 615, y: 345 },
          getWorld('trainB', 'helped', together, [], true, { ...c, arrived: true }),
        ),
      ).toBe(false)
    const waitingNpc = getWorld('trainB', 'helped', true, [], true, {
      ...c,
      arrived: true,
    }).entities.find((e) => e.id === 'survivor')!
    expect(waitingNpc.x).toBe(565)
    expect(
      walkable(
        { x: 580, y: 465 },
        getWorld('trainB', 'helped', true, [], true, { ...c, arrived: true }),
      ),
    ).toBe(false)
    const old = {
      ...hall(),
      area: 'trainRear',
      chapter3: {
        ...initialState.chapter3,
        started: true,
        approved: true,
        signal: 'green',
        doorOpen: true,
        boarded: true,
        escaped: true,
        ending: 'complete',
      },
      chapter4: {
        ...c,
        links: { relay: false, external: false, power: false },
        suspicion: true,
        interruption: 'restored',
      },
      view3d: null,
    }
    const restored = reload(old)
    expect(restored.chapter4.links).toEqual(old.chapter4.links)
    expect(restored.chapter4.suspicion).toBe(true)
    expect(restored.view3d).toBeNull()
    expect(
      normalizeView3d(
        makeView3d('trainB', { x: 615, y: 345 }),
        'trainB',
        [],
        { ...initialState.chapter3, npcBoarded: true },
        c,
      ),
    ).toBeNull()
  })
})

describe('chapter 5 branches and camera collision', () => {
  it('restores only valid sides of a shutter and preserves chapter progress', async () => {
    const { defaultChapter5 } = await import('./chapter5')
    const c = {
      ...defaultChapter5,
      started: true,
      displayName: '한결',
      response: 'answered' as const,
      registration: 'active' as const,
    }
    const c3 = { ...initialState.chapter3, npcBoarded: true }
    const threshold = makeView3d('moonHolding', { x: 470, y: 525 })
    expect(normalizeView3d(threshold, 'moonHolding', [], c3, undefined, c)).toBeNull()
    expect(
      normalizeView3d(threshold, 'moonHolding', [], c3, undefined, {
        ...c,
        registration: 'cancelled',
      }),
    ).toEqual(threshold)
    expect(
      normalizeView3d(
        makeView3d('moonHolding', { x: 600, y: 340 }),
        'moonHolding',
        [],
        c3,
        undefined,
        c,
      ),
    ).toBeNull()
    expect(
      normalizeView3d(
        makeView3d('moonPlatform', { x: 470, y: 525 }),
        'moonHolding',
        [],
        c3,
        undefined,
        c,
      ),
    ).toBeNull()
  })
  it('opens maintenance only from the canonical route flag and leaves shoes passable', async () => {
    const { defaultChapter5 } = await import('./chapter5')
    const c = { ...defaultChapter5, started: true, displayName: '한결' }
    expect(
      walkable(
        { x: 140, y: 520 },
        getWorld('moonPlatform', 'helped', false, [], false, undefined, c),
      ),
    ).toBe(false)
    expect(
      walkable(
        { x: 140, y: 520 },
        getWorld('moonPlatform', 'helped', false, [], false, undefined, { ...c, routeOpen: true }),
      ),
    ).toBe(true)
    expect(
      walkable(
        { x: 300, y: 310 },
        getWorld('moonPlatform', 'helped', false, [], false, undefined, c),
      ),
    ).toBe(true)
    for (const area of ['moonPlatform', 'moonBooth', 'moonHolding'] as const) {
      expect(
        getWorld(area, 'helped', true, [], false, undefined, c).entities.filter(
          (e) => e.kind === 'npc',
        ),
      ).toHaveLength(1)
      expect(
        getWorld(area, 'waiting', false, [], false, undefined, c).entities.filter(
          (e) => e.kind === 'npc',
        ),
      ).toHaveLength(0)
    }
    expect(
      getWorld('moonPlatform', 'helped', true, [], false, undefined, c).entities.some(
        (e) => e.id === 'moon-cancel-device',
      ),
    ).toBe(false)
  })
})

it.each([
  ['moonHolding', 'answered', 'active'],
  ['moonHolding', 'answered', 'cancelled'],
  ['moonBooth', 'silent', 'held'],
] as const)(
  'round-trips chapter 5 pose and %s/%s/%s progress',
  async (area, response, registration) => {
    const { defaultChapter5 } = await import('./chapter5')
    const { defaultChapter4 } = await import('./chapter4')
    const c5 = {
      ...defaultChapter5,
      started: true,
      displayName: '한결',
      response,
      registration,
      matched: registration === 'held',
      externalPaused: registration === 'held',
    }
    const position = { x: 450, y: 420 },
      view = makeView3d(area, position, 0.75, -0.2)
    const saved = {
      ...initialState,
      stage: 'explore',
      area,
      position,
      view3d: view,
      scene: [],
      chapter2: { ...initialState.chapter2, completed: true },
      chapter3: {
        ...initialState.chapter3,
        started: true,
        approved: true,
        signal: 'green',
        doorOpen: true,
        boarded: true,
        escaped: true,
        ending: 'complete',
        npc: 'helped',
        npcBoarded: true,
      },
      chapter4: {
        ...defaultChapter4,
        started: true,
        sync: 'accepted',
        arrived: true,
        doorSeen: true,
        completed: true,
      },
      chapter5: c5,
    }
    const loaded = reload(saved)
    expect(loaded.chapter5).toEqual(c5)
    expect(loaded.view3d).toEqual(view)
    expect(loaded.position).toEqual(position)
    expect(loaded.health).toBe(saved.health)
    expect(loaded.inventory).toEqual(saved.inventory)
  },
)

describe('chapter 6 doors, companion safety and arrival poses', () => {
  it('uses saved settings and bolt state for the same physical door validation', async () => {
    const { defaultChapter6 } = await import('./chapter6')
    const c = { ...defaultChapter6, started: true }
    const manual = { ...c, settings: { door: 'S-01', mode: 'local', power: true } }
    const view = makeView3d('maintenance', { x: 140, y: 520 })
    expect(normalizeView3d(view, 'maintenance', [], undefined, undefined, undefined, c)).toBeNull()
    expect(
      normalizeView3d(view, 'maintenance', [], undefined, undefined, undefined, manual),
    ).toEqual(view)
    const other = makeView3d('maintenance', { x: 820, y: 520 })
    expect(
      normalizeView3d(other, 'maintenance', [], undefined, undefined, undefined, manual),
    ).toBeNull()
    expect(
      normalizeView3d(other, 'maintenance', [], undefined, undefined, undefined, {
        ...c,
        settings: { door: 'G-01', mode: 'remote', power: true },
      }),
    ).toEqual(other)
    const hatch = makeView3d('recovery', { x: 190, y: 355 })
    expect(normalizeView3d(hatch, 'recovery', [], undefined, undefined, undefined, c)).toBeNull()
    expect(
      normalizeView3d(hatch, 'recovery', [], undefined, undefined, undefined, {
        ...c,
        route: 'automatic',
        drained: true,
        boltOpen: true,
      }),
    ).toEqual(hatch)
  })
  it('keeps a fixed dry chair, a safe companion waiting point and distinct shelter arrivals', async () => {
    const { defaultChapter6 } = await import('./chapter6')
    const c = {
      ...defaultChapter6,
      started: true,
      route: 'automatic' as const,
      drained: true,
      boltOpen: true,
    }
    const recovery = getWorld('recovery', 'helped', true, [], false, undefined, undefined, c)
    expect(recovery.entities.find((e) => e.id === 'survivor')).toMatchObject({ x: 565, y: 430 })
    expect(walkable({ x: 580, y: 445 }, recovery)).toBe(false)
    expect(
      walkable(
        { x: 615, y: 345 },
        getWorld('recovery', 'waiting', false, [], false, undefined, undefined, c),
      ),
    ).toBe(false)
    expect(getWorld('shelter', 'helped', true, [], false, undefined, undefined, c).spawn).toEqual({
      x: 160,
      y: 450,
    })
    expect(
      getWorld('shelter', 'helped', true, [], false, undefined, undefined, {
        ...c,
        route: 'manual',
      }).spawn,
    ).toEqual({ x: 450, y: 450 })
    expect(walkable(recovery.spawn, recovery)).toBe(true)
  })
})

it.each([
  ['maintenance', null, false, false, { x: 450, y: 450 }],
  ['recovery', 'automatic', false, false, { x: 450, y: 450 }],
  ['recovery', 'automatic', true, true, { x: 450, y: 450 }],
  ['shelter', 'automatic', true, true, { x: 160, y: 450 }],
  ['shelter', 'manual', false, false, { x: 450, y: 450 }],
] as const)(
  'restores chapter 6 %s route=%s drained=%s bolt=%s pose',
  async (area, route, drained, boltOpen, position) => {
    const { defaultChapter6 } = await import('./chapter6')
    const { defaultChapter5 } = await import('./chapter5')
    const { defaultChapter4 } = await import('./chapter4')
    const view = makeView3d(area, position, 0.5, -0.15)
    const c6 = { ...defaultChapter6, started: true, route, drained, boltOpen }
    const saved = {
      ...initialState,
      stage: 'explore',
      area,
      position,
      view3d: view,
      scene: [],
      health: 1,
      battery: 0,
      inventory: [],
      clues: [],
      chapter2: { ...initialState.chapter2, completed: true },
      chapter3: {
        ...initialState.chapter3,
        started: true,
        approved: true,
        signal: 'green',
        doorOpen: true,
        boarded: true,
        escaped: true,
        ending: 'complete',
        npc: 'helped',
        npcBoarded: true,
      },
      chapter4: {
        ...defaultChapter4,
        started: true,
        sync: 'accepted',
        arrived: true,
        doorSeen: true,
        completed: true,
      },
      chapter5: {
        ...defaultChapter5,
        started: true,
        displayName: '한결',
        response: 'silent',
        registration: 'held',
        matched: true,
        externalPaused: true,
        routeOpen: true,
        exitSeen: true,
        completed: true,
      },
      chapter6: c6,
    }
    const loaded = reload(saved)
    expect(loaded.chapter6).toEqual(c6)
    expect(loaded.view3d).toEqual(view)
    expect(loaded.position).toEqual(position)
    expect(loaded.health).toBe(1)
    expect(loaded.battery).toBe(0)
    expect(loaded.inventory).toEqual([])
    const legacy = reload({ ...saved, view3d: undefined })
    expect(legacy.view3d).toBeNull()
    expect(legacy.chapter6).toEqual(c6)
  },
)

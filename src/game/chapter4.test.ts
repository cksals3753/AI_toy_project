import { afterEach, describe, expect, it } from 'vitest'
import { initialState, loadGame, reducer } from './engine'
import type { Action, State } from './engine'
import { defaultChapter3 } from './chapter3'
import {
  availableTrainQuestion,
  defaultChapter4,
  inSyncTarget,
  normalizeChapter4,
  trainObjects,
  trainQuestions,
} from './chapter4'
import { episode } from './data'
import { getWorld, nearestEntity, walkable } from './world'

const apply = (state: State, ...actions: Action[]) => actions.reduce(reducer, state)
const finish = (state: State): State => {
  let next = state
  for (let i = 0; i < 20 && next.scene.length; i++) next = reducer(next, { type: 'advance' })
  return next
}
const boarded = (together = false): State => ({
  ...initialState,
  area: 'trainB',
  stage: 'explore',
  health: 75,
  battery: 0,
  inventory: ['절연 장갑', '전기실 열쇠'],
  clues: ['cabinet'],
  asked: ['west'],
  chapter2: { ...initialState.chapter2, completed: true },
  chapter3: {
    ...defaultChapter3,
    started: true,
    npc: together ? 'helped' : 'waiting',
    approved: true,
    signal: 'green',
    doorOpen: true,
    boarded: true,
    npcBoarded: together,
    escaped: true,
    ending: 'complete',
  },
})
const start = (together = false) => finish(reducer(boarded(together), { type: 'train-start' }))
const inspect = (s: State, id: string) => finish(reducer(s, { type: 'inspect', id }))
const rear = (s = start()) => reducer(s, { type: 'train-move', area: 'trainRear' })
const prepared = () => {
  let s = inspect(inspect(start(), 'train-phone'), 'train-route')
  s = inspect(inspect(rear(s), 'train-manual'), 'train-devices')
  s = finish(reducer(s, { type: 'train-link', id: 'external' }))
  return inspect(
    reducer(reducer(s, { type: 'train-move', area: 'trainB' }), {
      type: 'train-move',
      area: 'trainFront',
    }),
    'train-stop',
  )
}
const reload = (value: unknown) => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify(value) },
  })
  return loadGame()
}
afterEach(() => Reflect.deleteProperty(globalThis, 'localStorage'))

describe('chapter 4 continuity and knowledge', () => {
  it.each([true, false])(
    'starts with correct company (%s), with four remote characters excluded',
    (together) => {
      const previous = boarded(together)
      const opening = reducer(previous, { type: 'train-start' })
      expect(opening.scene.some((m) => m.who === 'survivor')).toBe(together)
      expect(opening.messages.some((m) => m.text.includes(together ? '두 명' : '저 혼자'))).toBe(
        true,
      )
      const s = finish(opening)
      expect(s.chapter3).toEqual(previous.chapter3)
      expect(s.chapter2).toEqual(previous.chapter2)
      expect(s.inventory).toEqual(previous.inventory)
      expect(s.health).toBe(75)
      expect(s.battery).toBe(0)
      expect(
        getWorld('trainB', s.chapter3.npc, together).entities.filter((e) => e.kind === 'npc'),
      ).toHaveLength(together ? 1 : 0)
      expect(reducer(s, { type: 'train-start' })).toBe(s)
    },
  )
  it('cannot start before chapter 3 completion or while departure dialogue is active', () => {
    expect(reducer(initialState, { type: 'train-start' })).toBe(initialState)
    const s = { ...boarded(), chapter3: { ...boarded().chapter3, escaped: false } }
    expect(reducer(s, { type: 'train-start' })).toBe(s)
  })
  it('only investigates objects in the current area without triggering dangerous actions', () => {
    const s = start()
    expect(reducer(s, { type: 'inspect', id: 'train-devices' })).toBe(s)
    const phone = inspect(s, 'train-phone')
    expect(phone.chapter4.links).toEqual(defaultChapter4.links)
    expect(phone.clues).toContain('train-phone')
    expect(trainObjects[0].clue).toContain('EXT-X09')
    expect(phone.messages.filter((m) => m.time).map((m) => m.time)).toContain('02:31:04')
    expect(phone.inventory).toEqual(s.inventory)
  })
  it('unlocks questions only after evidence and actual power advice', () => {
    let s = start()
    for (const q of trainQuestions) expect(reducer(s, { type: 'ask', id: q.id })).toBe(s)
    s = inspect(s, 'train-route')
    s = reducer(s, { type: 'ask', id: 'train-auto-question' })
    expect(s.asked).toContain('train-auto-question')
    expect(reducer(s, { type: 'ask', id: 'train-auto-question' })).toBe(s)
    expect(availableTrainQuestion('train-power-question', ['train-devices'], s.chapter4)).toBe(
      false,
    )
    s = inspect(rear(s), 'train-devices')
    expect(s.chapter4.powerAdvice).toBe(true)
    expect(s.messages.some((m) => m.who === 'kang' && m.text.includes('객실 전원을 꺼요'))).toBe(
      true,
    )
    s = reducer(s, { type: 'ask', id: 'train-power-question' })
    expect(s.messages.at(-1)?.text).toContain('자동 정차도')
  })
  it('answers reflect earlier target questions without inventing a recipient', () => {
    let s = inspect(start(), 'train-phone')
    s = inspect(rear(s), 'train-devices')
    s = apply(
      s,
      { type: 'ask', id: 'train-target-question' },
      { type: 'ask', id: 'train-time-question' },
    )
    expect(s.messages.at(-2)?.text).toContain('대상은 외부 장치')
    expect(s.messages.at(-1)?.text).toContain('정체에 대한 추측은 구분')
  })
})
describe('fixed connections and unlimited recovery', () => {
  it.each(['relay', 'power'] as const)(
    'recovers %s without consuming health, battery or inventory',
    (id) => {
      let s = inspect(rear(), 'train-devices')
      for (let i = 0; i < 6; i++) {
        s = reducer(s, { type: 'train-link', id })
        expect(s.chapter4.links[id]).toBe(false)
        const front = reducer(reducer(s, { type: 'train-move', area: 'trainB' }), {
          type: 'train-move',
          area: 'trainFront',
        })
        const checked = inspect(front, 'train-stop')
        expect(checked.scene).toHaveLength(0)
        expect(reducer(checked, { type: 'train-sync-start' }).chapter4.sync).toBe('idle')
        s = reducer(s, { type: 'train-link', id })
        expect(s.chapter4.links[id]).toBe(true)
      }
      expect(s.health).toBe(75)
      expect(s.battery).toBe(0)
      expect(s.inventory).toEqual(boarded().inventory)
    },
  )
  it('restores independent chat and emits suspicion once before player disclosure, even across reload', () => {
    let s = inspect(rear(), 'train-devices')
    s = reducer(s, { type: 'train-link', id: 'external' })
    expect(s.chapter4.interruption).toBe('interrupted')
    s = finish(reload(s))
    expect(s.chapter4.interruption).toBe('restored')
    expect(s.chapter4.suspicion).toBe(true)
    expect(s.messages.at(-2)).toMatchObject({ who: 'oh', text: '지금 뭘 끊었어요?' })
    s = apply(s, { type: 'train-link', id: 'external' }, { type: 'train-link', id: 'external' })
    expect(s.messages.filter((m) => m.text === '지금 뭘 끊었어요?')).toHaveLength(1)
  })
  it('cannot accept requests with external priority or disconnected equipment', () => {
    let s = inspect(reducer(start(), { type: 'train-move', area: 'trainFront' }), 'train-stop')
    expect(reducer(s, { type: 'train-sync-start' }).chapter4.sync).toBe('idle')
    expect(reducer(s, { type: 'train-sync-hit', marker: 0.5 })).toBe(s)
    s = prepared()
    expect(reducer(s, { type: 'train-sync-start' }).chapter4.sync).toBe('active')
  })
})
describe('sync, arrival and save migration', () => {
  it('retries, assists, blocks exploration/dialogue and arrives only after successful request', () => {
    let s = reducer(prepared(), { type: 'train-sync-start' })
    for (const action of [
      { type: 'train-move', area: 'trainB' },
      { type: 'position', position: { x: 400, y: 400 } },
      { type: 'talk', lines: [{ who: 'player', text: '우회' }] },
    ] as Action[])
      expect(reducer(s, action)).toBe(s)
    s = apply(
      s,
      { type: 'train-sync-hit', marker: 0 },
      { type: 'train-sync-hit', marker: 1 },
      { type: 'train-assist' },
    )
    expect(s.chapter4.failures).toBe(2)
    expect(s.chapter4.assisted).toBe(true)
    s = reload(s)
    expect(s.chapter4.sync).toBe('active')
    s = reducer(s, { type: 'train-sync-hit', marker: 0.5 })
    expect(s.chapter4.arrived).toBe(false)
    expect(s.chapter4.sync).toBe('accepted')
    s = finish(reload(s))
    expect(s.chapter4.arrived).toBe(true)
    expect(s.chapter4.destination).toBe(episode.next)
    expect(s.health).toBe(75)
    expect(s.battery).toBe(0)
    expect(s.chapter3.escaped).toBe(true)
  })
  it('saves warning, entry cancellation and explicit completion without exploring chapter 5', () => {
    let s = finish(
      apply(prepared(), { type: 'train-sync-start' }, { type: 'train-sync-hit', marker: 0.5 }),
    )
    s = reducer(s, { type: 'train-move', area: 'trainB' })
    s = reducer(s, { type: 'train-door' })
    expect(s.scene[0].text).toBe('거기서는 안내방송에 대답하지 마세요.')
    expect(s.scene[1].text).toContain('신발 여러 켤레')
    expect(s.chapter4.completed).toBe(false)
    s = finish(reload(s))
    expect(s.chapter4.entryPrompt).toBe(true)
    s = reducer(s, { type: 'train-entry', confirm: false })
    expect(s.chapter4.completed).toBe(false)
    s = apply(s, { type: 'train-door' }, { type: 'train-entry', confirm: true })
    expect(reload(s).chapter4.completed).toBe(true)
    expect(s.area).toBe('trainB')
    expect(
      s.messages.filter((m) => m.text === '거기서는 안내방송에 대답하지 마세요.'),
    ).toHaveLength(1)
  })
  it('resumes each investigation, connection and sync checkpoint in every room', () => {
    let s = start(true)
    const checkpoints = [s]
    s = inspect(s, 'train-phone')
    checkpoints.push(s)
    s = inspect(rear(s), 'train-devices')
    checkpoints.push(s)
    s = reducer(s, { type: 'train-link', id: 'power' })
    checkpoints.push(s)
    s = reducer(s, { type: 'train-link', id: 'power' })
    checkpoints.push(s)
    s = reducer(s, { type: 'train-link', id: 'external' })
    checkpoints.push(s)
    s = finish(s)
    checkpoints.push(s)
    s = inspect(
      reducer(reducer(s, { type: 'train-move', area: 'trainB' }), {
        type: 'train-move',
        area: 'trainFront',
      }),
      'train-stop',
    )
    checkpoints.push(s)
    s = reducer(s, { type: 'train-sync-start' })
    checkpoints.push(s)
    for (const checkpoint of checkpoints) {
      const resumed = reload(checkpoint)
      expect(resumed.chapter4).toEqual(checkpoint.chapter4)
      expect(resumed.chapter3).toEqual(checkpoint.chapter3)
      expect(resumed.area).toBe(checkpoint.area)
      expect(resumed.messages).toEqual(checkpoint.messages)
      expect(resumed.clues).toEqual(checkpoint.clues)
    }
  })
  it('migrates chapter 3 saves and validates timing boundaries', () => {
    const old: Partial<State> = boarded()
    delete old.chapter4
    const restored = reload(old)
    expect(restored.chapter4).toEqual(defaultChapter4)
    expect(reducer(restored, { type: 'train-start' }).chapter4.started).toBe(true)
    expect(normalizeChapter4({ failures: -1, completed: true, sync: 'invalid' })).toEqual(
      defaultChapter4,
    )
    expect(inSyncTarget(Number.NaN)).toBe(false)
    expect(inSyncTarget(0.28)).toBe(true)
    expect(inSyncTarget(0.72)).toBe(true)
    expect(inSyncTarget(0.27)).toBe(false)
  })
  it.each(['trainB', 'trainRear', 'trainFront'] as const)(
    'all interactions remain reachable in %s with or without NPC',
    (area) => {
      for (const together of [true, false]) {
        const world = getWorld(area, 'helped', together),
          queue = [world.spawn],
          seen = new Set<string>(),
          reached = new Set<string>()
        for (let i = 0; i < queue.length; i++) {
          const p = queue[i],
            key = `${p.x},${p.y}`
          if (seen.has(key)) continue
          seen.add(key)
          const entity = nearestEntity(p, world)
          if (entity) reached.add(entity.id)
          for (const d of [
            { x: 10, y: 0 },
            { x: -10, y: 0 },
            { x: 0, y: 10 },
            { x: 0, y: -10 },
          ]) {
            const next = { x: p.x + d.x, y: p.y + d.y }
            if (walkable(next, world) && !seen.has(`${next.x},${next.y}`)) queue.push(next)
          }
        }
        expect([...reached].sort()).toEqual(world.entities.map((e) => e.id).sort())
      }
    },
  )
})

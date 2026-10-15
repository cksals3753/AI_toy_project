import { afterEach, describe, expect, it } from 'vitest'
import { initialState, loadGame, reducer } from './engine'
import type { Action, State } from './engine'
import { chapter2Intro, hallOpening } from './chapter2'
import { nearestEntity, walkable, worlds } from './world'

const apply = (state: State, ...actions: Action[]) => actions.reduce(reducer, state)
const finishDialogue = (state: State): State => {
  let next = state
  while (next.scene.length) next = reducer(next, { type: 'advance' })
  return next
}
const firstClear = () => apply(initialState,
  { type: 'start' }, { type: 'inspect', id: 'panel' }, { type: 'inspect', id: 'map' },
  { type: 'inspect', id: 'cabinet' }, { type: 'ask', id: 'water' },
  { type: 'route', id: 'west' }, { type: 'code', code: '0218' })
const hall = () => finishDialogue(reducer(firstClear(), { type: 'enter-hall' }))
const withKey = () => apply(hall(), { type: 'inspect', id: 'hall-desk' })
const electrical = () => apply(withKey(), { type: 'enter-electrical' })
function reload(state: unknown) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify(state) } })
  return loadGame()
}
afterEach(() => Reflect.deleteProperty(globalThis, 'localStorage'))

describe('chapter transition and saved narrative', () => {
  it('carries chapter 1 resources and appends chapter 2 messages exactly once', () => {
    const first = firstClear(), entered = reducer(first, { type: 'enter-hall' })
    expect(entered.area).toBe('hall')
    expect(entered.health).toBe(first.health)
    expect(entered.battery).toBe(first.battery)
    expect(entered.inventory).toEqual(first.inventory)
    expect(entered.clues).toEqual(first.clues)
    expect(entered.messages).toEqual([...first.messages, ...hallOpening])
    expect(entered.scene).toEqual(chapter2Intro)
    const reloaded = reload(reducer(entered, { type: 'advance' }))
    expect(reloaded.sceneIndex).toBe(1)
    expect(reducer(reloaded, { type: 'enter-hall' })).toBe(reloaded)
  })
  it('cannot enter chapter 2 from an uncleared or failed first room', () => {
    expect(reducer(initialState, { type: 'enter-hall' })).toBe(initialState)
    const failed = { ...firstClear(), outcome: 'failed' as const }
    expect(reducer(failed, { type: 'enter-hall' })).toBe(failed)
  })
  it('blocks gameplay during dialogue', () => {
    const state = reducer(firstClear(), { type: 'enter-hall' })
    expect(reducer(state, { type: 'inspect', id: 'hall-desk' })).toBe(state)
    expect(reducer(state, { type: 'staff-start' })).toBe(state)
  })
})
describe('evidence, keys and questions', () => {
  it('unlocks only evidence-linked questions and never charges for them', () => {
    let state = hall()
    expect(reducer(state, { type: 'ask', id: 'hall-blue' })).toBe(state)
    state = apply(state, { type: 'inspect', id: 'hall-window' }, { type: 'ask', id: 'hall-blue' })
    expect(state.asked).toContain('hall-blue')
    expect(state.messages.some(m => m.text.includes('제가 잘못 봤을'))).toBe(true)
    expect(state.battery).toBe(hall().battery)
    expect(reducer(state, { type: 'ask', id: 'hall-blue' })).toBe(state)
  })
  it('requires key and does not duplicate it across reloads', () => {
    const locked = reducer(hall(), { type: 'enter-electrical' })
    expect(locked.area).toBe('hall')
    expect(locked.scene[0].text).toContain('안내 데스크')
    const state = reload(withKey())
    expect(reducer(state, { type: 'inspect', id: 'hall-desk' })).toBe(state)
    expect(state.inventory.filter(i => i === '전기실 열쇠')).toHaveLength(1)
    expect(reducer(state, { type: 'enter-electrical' }).area).toBe('electrical')
  })
})
describe('one-time staff passage event', () => {
  it.each([true, false])('returns from danger, success=%s, and resolves only once', success => {
    const active = reducer(hall(), { type: 'staff-start' })
    expect(active.chapter2.staffEvent).toBe('active')
    const restored = reload(active)
    const resolved = reducer(restored, { type: 'staff-result', success })
    expect(resolved.health).toBe(active.health - (success ? 0 : 20))
    expect(resolved.area).toBe('hall')
    const saved = reload(finishDialogue(resolved))
    expect(reducer(saved, { type: 'staff-result', success: false })).toBe(saved)
    expect(reducer(saved, { type: 'staff-start' })).toBe(saved)
    expect(apply(saved, { type: 'inspect', id: 'hall-desk' }, { type: 'enter-electrical' }).area).toBe('electrical')
  })
})
describe('power puzzle and chapter completion', () => {
  it('limits circuits to two while allowing all pairs and preserving recording', () => {
    let state = apply(electrical(), { type: 'power', device: 'lights' }, { type: 'power', device: 'broadcast' })
    expect(state.clues).toContain('hall-recording')
    const full = reducer(state, { type: 'power', device: 'gate' })
    expect(full.chapter2.power).toEqual(['lights', 'broadcast'])
    state = apply(full, { type: 'power', device: 'lights' }, { type: 'power', device: 'gate' })
    expect(state.chapter2.power).toEqual(['broadcast', 'gate'])
    state = apply(reload(state), { type: 'power', device: 'broadcast' }, { type: 'power', device: 'lights' })
    expect(state.chapter2.power).toEqual(['gate', 'lights'])
    expect(state.clues.filter(c => c === 'hall-recording')).toHaveLength(1)
  })
  it('requires both gate and lights and reports the missing condition', () => {
    const noGate = reducer(hall(), { type: 'pass-gate' })
    expect(noGate.area).toBe('hall')
    expect(noGate.scene[0].text).toContain('예비 전원')
    const gateOnly = apply(electrical(), { type: 'power', device: 'gate' }, { type: 'return-hall' }, { type: 'pass-gate' })
    expect(gateOnly.area).toBe('hall')
    expect(gateOnly.scene[0].text).toContain('조명')
  })
  it('plays saved footsteps once and commits completion after the ending', () => {
    let state = apply(electrical(), { type: 'power', device: 'lights' }, { type: 'power', device: 'gate' }, { type: 'return-hall' }, { type: 'pass-gate' })
    expect(state.area).toBe('stairs')
    expect(state.chapter2.ending).toBe('question')
    state = reload(reducer(state, { type: 'advance' }))
    expect(state.sceneIndex).toBe(1)
    expect(state.chapter2.ending).toBe('echo')
    state = reload(finishDialogue(state))
    expect(state.chapter2.completed).toBe(true)
    expect(state.scene).toEqual([])
    expect(reducer(state, { type: 'pass-gate' })).toBe(state)
    expect(state.messages.filter(m => m.text.includes('지금 발소리'))).toHaveLength(1)
  })
})
describe('legacy migration and room navigation', () => {
  it('loads old first-room clears with defaults and recovers invalid new fields', () => {
    const old = firstClear() as Partial<State>
    delete old.area; delete old.chapter2; delete old.scene; delete old.sceneIndex
    expect(reload(old).area).toBe('first')
    expect(reducer(reload(old), { type: 'enter-hall' }).area).toBe('hall')
    const invalid = { ...electrical(), position: { x: 0, y: 0 }, chapter2: { power: ['lights', 'gate', 'broadcast', 'unknown'], staffEvent: 'bad' } }
    const restored = reload(invalid)
    expect(restored.position).toEqual(worlds.electrical.spawn)
    expect(restored.chapter2.power).toHaveLength(2)
    expect(restored.chapter2.staffEvent).toBe('unseen')
  })
  it('ignores stale position callbacks from another area', () => {
    const state = hall()
    expect(reducer(state, { type: 'position', area: 'first', position: { x: 480, y: 400 } })).toBe(state)
  })
  it.each(['hall', 'electrical', 'stairs'] as const)('has reachable interactions in %s', area => {
    const world = worlds[area], queue = [world.spawn], seen = new Set<string>(), reached = new Set<string>()
    while (queue.length) {
      const p = queue.shift()!, key = `${p.x},${p.y}`
      if (seen.has(key)) continue
      seen.add(key)
      const entity = nearestEntity(p, world)
      if (entity) reached.add(entity.id)
      for (const d of [{ x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 10 }, { x: 0, y: -10 }]) {
        const next = { x: p.x + d.x, y: p.y + d.y }
        if (walkable(next, world) && !seen.has(`${next.x},${next.y}`)) queue.push(next)
      }
    }
    expect([...reached].sort()).toEqual(world.entities.map(e => e.id).sort())
  })
})

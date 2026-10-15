import { afterEach, describe, expect, it } from 'vitest'
import { initialState, loadGame, reducer } from './engine'
import type { Action, State } from './engine'
import { approvalClues, defaultChapter3, platformOpening, platformQuestions } from './chapter3'
import { getWorld, nearestEntity, walkable, worlds } from './world'
const apply = (state: State, ...actions: Action[]) => actions.reduce(reducer, state)
const finish = (state: State) => { let next = state; while (next.scene.length) next = reducer(next, { type: 'advance' }); return next }
function stairs() {
  let s = apply(initialState, { type: 'start' }, { type: 'inspect', id: 'panel' }, { type: 'inspect', id: 'map' }, { type: 'inspect', id: 'cabinet' }, { type: 'ask', id: 'water' }, { type: 'route', id: 'west' }, { type: 'code', code: '0218' }, { type: 'enter-hall' })
  s = apply(finish(s), { type: 'inspect', id: 'hall-desk' }, { type: 'enter-electrical' }, { type: 'power', device: 'lights' }, { type: 'power', device: 'gate' }, { type: 'return-hall' }, { type: 'pass-gate' })
  return finish(s)
}
const platform = () => finish(reducer(stairs(), { type: 'enter-platform' }))
function prepared(choice: 'help' | 'direct' = 'help') {
  let s = finish(reducer(platform(), { type: 'discover-survivor' }))
  s = finish(reducer(s, { type: 'survivor-choice', choice }))
  return apply(s, ...approvalClues.map((id): Action => ({ type: 'inspect', id })))
}
const ready = (choice: 'help' | 'direct' = 'help') => finish(apply(prepared(choice), { type: 'approve-train', vehicle: 'B-04', track: '◇-2' }, { type: 'signal-ready' }, { type: 'call-train-b' }))
function reload(state: unknown) { Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify(state) } }); return loadGame() }
afterEach(() => Reflect.deleteProperty(globalThis, 'localStorage'))

describe('chapter 2 → 3 and independent survivor', () => {
  it('preserves previous resources and does not replay entry messages', () => {
    const previous = stairs(), entered = reducer(previous, { type: 'enter-platform' })
    expect(entered.area).toBe('platform')
    expect(entered.messages).toEqual([...previous.messages, ...platformOpening])
    expect(entered.inventory).toEqual(previous.inventory)
    expect(entered.health).toBe(previous.health)
    expect(entered.battery).toBe(previous.battery)
    const resumed = reload(entered)
    expect(reducer(resumed, { type: 'enter-platform' })).toBe(resumed)
  })
  it('requires chapter 2 completion', () => {
    const s = { ...stairs(), chapter2: { ...stairs().chapter2, completed: false } }
    expect(reducer(s, { type: 'enter-platform' })).toBe(s)
  })
  it.each(['help', 'direct'] as const)('supports %s at low resources and persists choice without repeated benefits', choice => {
    const s = prepared(choice), zero = { ...s, health: 1, battery: 0, inventory: [] }
    expect(reload(zero).chapter3.npc).toBe(choice === 'help' ? 'helped' : 'directed')
    expect(reducer(zero, { type: 'survivor-choice', choice })).toBe(zero)
    expect(reducer(zero, { type: 'inspect', id: 'train-b' })).toBe(zero)
    expect(getWorld('platform', s.chapter3.npc).entities.find(e => e.id === 'survivor')?.x).toBe(choice === 'help' ? 610 : 200)
  })
  it('allows a later invitation or explicit waiting and records different company', () => {
    const direct = ready('direct')
    const invited = finish(reducer(direct, { type: 'survivor-choice', choice: 'invite' }))
    expect(reducer(invited, { type: 'board-train-b' }).chapter3.npcBoarded).toBe(true)
    const waiting = finish(reducer(direct, { type: 'survivor-choice', choice: 'wait' }))
    const alone = reducer(waiting, { type: 'board-train-b' })
    expect(alone.chapter3.npcBoarded).toBe(false)
    expect(alone.scene[0].text).toContain('부스 옆 의자'); expect(alone.scene[0].who).toBe('survivor')
  })
})
describe('train evidence and script knowledge', () => {
  it('gates every question on its own evidence and prevents repeated messages', () => {
    let s = platform()
    for (const q of platformQuestions) expect(reducer(s, { type: 'ask', id: q.id })).toBe(s)
    for (const q of platformQuestions) {
      s = apply(s, { type: 'inspect', id: q.requires }, { type: 'ask', id: q.id })
      expect(s.asked).toContain(q.id)
      expect(reducer(s, { type: 'ask', id: q.id })).toBe(s)
    }
    expect(s.battery).toBe(platform().battery)
  })
  it('allows train A inspection and return, with explanation exactly once across reload', () => {
    const before = platform()
    let s = apply(before, { type: 'enter-train-a' }, { type: 'inspect', id: 'train-a-stop' })
    expect(s.area).toBe('trainA'); expect(s.chapter3.aExplained).toBe(true)
    expect(s.health).toBe(before.health); expect(s.battery).toBe(before.battery)
    s = reload(s)
    expect(reducer(s, { type: 'inspect', id: 'train-a-stop' })).toBe(s)
    s = apply(s, { type: 'leave-train-a' }, { type: 'enter-train-a' }, { type: 'inspect', id: 'train-a-stop' }, { type: 'leave-train-a' })
    expect(s.area).toBe('platform')
    expect(s.messages.filter(m => m.text.includes('운행 여부는 따로'))).toHaveLength(1)
  })
  it('does not accept unseen train-interior evidence from the platform', () => {
    const s = platform(); expect(reducer(s, { type: 'inspect', id: 'train-a-stop' })).toBe(s)
  })
})
describe('approval, signal, boarding and ending', () => {
  it('requires evidence and allows repeated wrong combinations with no damage', () => {
    expect(reducer(platform(), { type: 'approve-train', vehicle: 'B-04', track: '◇-2' }).chapter3.approved).toBe(false)
    let s = prepared()
    for (let i = 0; i < 12; i++) s = reducer(s, { type: 'approve-train', vehicle: 'A-17', track: '△-1' })
    expect(s.chapter3.approved).toBe(false)
    expect(s.health).toBe(prepared().health); expect(s.battery).toBe(prepared().battery)
    expect(s.notice).toContain('운행 차량 / 선로 표식')
  })
  it('requires approval → green → call → board and persists each stage', () => {
    let s = prepared()
    expect(reducer(s, { type: 'board-train-b' })).toBe(s)
    expect(reducer(s, { type: 'signal-ready' })).toBe(s)
    s = finish(reducer(s, { type: 'call-train-b' })); expect(s.chapter3.doorOpen).toBe(false)
    s = reload(reducer(s, { type: 'approve-train', vehicle: 'B-04', track: '◇-2' }))
    expect(s.chapter3.signal).toBe('changing')
    expect(reducer(s, { type: 'board-train-b' })).toBe(s)
    s = reload(reducer(s, { type: 'signal-ready' })); expect(s.chapter3.signal).toBe('green')
    s = finish(reload(reducer(s, { type: 'call-train-b' }))); expect(s.chapter3.doorOpen).toBe(true)
    expect(reducer(s, { type: 'call-train-b' })).toBe(s)
    s = reducer(s, { type: 'board-train-b' }); expect(s.area).toBe('trainB')
    expect(s.chapter3.npcBoarded).toBe(true); expect(s.chapter3.escaped).toBe(false)
    s = reload(reducer(s, { type: 'advance' })); expect(s.sceneIndex).toBe(1)
    s = reload(finish(s)); expect(s.chapter3.escaped).toBe(true); expect(s.scene).toEqual([])
    expect(reducer(s, { type: 'board-train-b' })).toBe(s)
    expect(s.messages.filter(m => m.text === '그 열차에 탔어요?')).toHaveLength(1)
    expect(s.messages.filter(m => m.text.includes('지금 객실'))).toHaveLength(1)
  })
  it('finishes signal switching while the player inspects train A', () => {
    let s = apply(prepared(), { type: 'approve-train', vehicle: 'B-04', track: '◇-2' }, { type: 'enter-train-a' })
    s = reload(reducer(s, { type: 'signal-ready' }))
    expect(s.area).toBe('trainA'); expect(s.chapter3.signal).toBe('green')
    expect(reducer(s, { type: 'leave-train-a' }).chapter3.signal).toBe('green')
  })
  it('records the survivor waiting if the player departs without inviting', () => {
    const s = finish(reducer(ready('direct'), { type: 'board-train-b' }))
    expect(s.chapter3.escaped).toBe(true); expect(s.chapter3.npc).toBe('waiting'); expect(s.chapter3.npcBoarded).toBe(false)
  })
  it('stops chapter actions during dialogue', () => {
    const s = reducer(prepared(), { type: 'talk', lines: [{ who: 'player', text: '잠깐.' }] })
    expect(reducer(s, { type: 'approve-train', vehicle: 'B-04', track: '◇-2' })).toBe(s)
  })
})
describe('migration and collision accessibility', () => {
  it('adds defaults to old chapter 2 saves without losing data', () => {
    const old: Partial<State> = stairs(); delete old.chapter3
    const restored = reload(old)
    expect(restored.chapter3).toEqual(defaultChapter3)
    expect(reducer(restored, { type: 'enter-platform' }).area).toBe('platform')
  })
  it.each(['platform', 'trainA', 'trainB'] as const)('can reach every interaction in %s', area => {
    const world = getWorld(area, 'helped', true), queue = [world.spawn], seen = new Set<string>(), reached = new Set<string>()
    while (queue.length) {
      const p = queue.shift()!, key = `${p.x},${p.y}`
      if (seen.has(key)) continue
      seen.add(key); const e = nearestEntity(p, world); if (e) reached.add(e.id)
      for (const d of [{ x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 10 }, { x: 0, y: -10 }]) { const next = { x: p.x + d.x, y: p.y + d.y }; if (walkable(next, world) && !seen.has(`${next.x},${next.y}`)) queue.push(next) }
    }
    expect([...reached].sort()).toEqual(world.entities.map(e => e.id).sort())
    expect(walkable(worlds[area].spawn, world)).toBe(true)
  })
})

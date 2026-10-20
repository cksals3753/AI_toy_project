import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../game/engine'
import { audioRoom, chapter2Cues } from './chapter2Audio'
const hall = (): State => ({
  ...initialState,
  area: 'hall',
  chapter2: { ...initialState.chapter2, power: [] },
})
describe('chapter 2 committed audio events', () => {
  it('does not replay loaded events, reinspection or rejected power allocations', () => {
    const saved = hall()
    saved.inventory = ['전기실 열쇠']
    saved.chapter2 = { ...saved.chapter2, staffEvent: 'failed', power: ['gate', 'lights'] }
    expect(chapter2Cues(saved, saved)).toEqual([])
    expect(chapter2Cues(saved, { ...saved, notice: '두 장치' })).toEqual([])
  })
  it('emits acquisition only for the first actual inventory change', () => {
    const a = hall(),
      b = { ...a, inventory: ['전기실 열쇠'] }
    expect(chapter2Cues(a, b)).toEqual(['key'])
    expect(chapter2Cues(b, b)).toEqual([])
  })
  it('matches gate opening and light restoration to actual circuit transitions', () => {
    const a = hall()
    const gate: State = { ...a, chapter2: { ...a.chapter2, power: ['gate'] } }
    expect(chapter2Cues(a, gate)).toEqual(['switch', 'gate'])
    const lit: State = { ...gate, chapter2: { ...gate.chapter2, power: ['gate', 'lights'] } }
    expect(chapter2Cues(gate, lit)).toEqual(['switch', 'restore'])
    expect(chapter2Cues(lit, gate)).toEqual(['switch'])
    expect(chapter2Cues(gate, { ...gate, area: 'electrical' })).toEqual([])
  })
  it('sounds the staff danger once, never on recovery or active save restoration', () => {
    const a = hall(),
      active: State = { ...a, chapter2: { ...a.chapter2, staffEvent: 'active' } }
    expect(chapter2Cues(a, active)).toEqual(['warning', 'door'])
    expect(chapter2Cues(active, active)).toEqual([])
    expect(
      chapter2Cues(active, { ...active, chapter2: { ...active.chapter2, staffEvent: 'success' } }),
    ).toEqual([])
  })
  it('keeps the chapter 1–2 room classifier scoped', () => {
    for (const area of ['first', 'hall', 'electrical', 'stairs'] as const)
      expect(audioRoom(area)).toBe(true)
    expect(audioRoom('platform')).toBe(false)
  })
})

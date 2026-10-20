import { describe, expect, it } from 'vitest'
import { initialState, type State } from '../game/engine'
import { chapter56Cues } from './chapter56Audio'
const base = (): State => ({
  ...initialState,
  area: 'moonPlatform',
  scene: [],
  chapter5: { ...initialState.chapter5, started: true },
  chapter6: { ...initialState.chapter6, started: true },
})
describe('chapter 5–6 audio transitions', () => {
  it('chimes for a new scripted broadcast, never transcript inspection or loading', () => {
    const a = base(),
      b: State = {
        ...a,
        scene: [
          { who: 'player', text: '안내' },
          { who: 'broadcast', text: '방송' },
        ],
      }
    expect(chapter56Cues(a, b)).toEqual(['chime'])
    expect(chapter56Cues(b, b)).toEqual([])
    expect(
      chapter56Cues(a, { ...a, scene: [{ who: 'player', text: '방송 기록 다시 보기' }] }),
    ).toEqual([])
  })
  it('requires explicit answered state and distinguishes cancellation from silent hold', () => {
    const a = base(),
      b: State = {
        ...a,
        area: 'moonHolding',
        chapter5: { ...a.chapter5, response: 'answered', registration: 'active' },
      }
    expect(chapter56Cues(a, b)).toEqual(['sensor', 'door'])
    const c: State = { ...b, chapter5: { ...b.chapter5, registration: 'cancelled' } }
    expect(chapter56Cues(b, c)).toEqual(['processed', 'door'])
    const held: State = {
      ...a,
      chapter5: { ...a.chapter5, response: 'silent', registration: 'held', externalPaused: true },
    }
    expect(chapter56Cues(a, held)).toEqual(['processed'])
    expect(chapter56Cues(held, held)).toEqual([])
  })
  it('uses successful settings and route commits, not rejected attempts or reinspection', () => {
    const a = { ...base(), area: 'maintenance' as const },
      b: State = {
        ...a,
        chapter6: { ...a.chapter6, settings: { door: 'G-01', mode: 'remote', power: true } },
      }
    expect(chapter56Cues(a, b)).toEqual(['switch', 'door'])
    const c: State = { ...b, area: 'recovery', chapter6: { ...b.chapter6, route: 'automatic' } }
    expect(chapter56Cues(b, c)).toEqual(['door', 'warning'])
    expect(chapter56Cues(c, c)).toEqual([])
  })
  it('opens the manual route at successful settings, not at later movement confirmation', () => {
    const a: State = { ...base(), area: 'maintenance' }
    const b: State = {
      ...a,
      chapter6: { ...a.chapter6, settings: { door: 'S-01', mode: 'local', power: true } },
    }
    expect(chapter56Cues(a, b)).toEqual(['switch', 'door'])
    const c: State = { ...b, area: 'shelter', chapter6: { ...b.chapter6, route: 'manual' } }
    expect(chapter56Cues(b, c)).toEqual([])
  })
  it('drains, unlatches and completes only once, independent of NPC presence', () => {
    for (const companion of [true, false]) {
      const a: State = {
        ...base(),
        area: 'recovery',
        chapter3: { ...initialState.chapter3, npcBoarded: companion },
      }
      const b: State = { ...a, chapter6: { ...a.chapter6, drained: true } }
      expect(chapter56Cues(a, b)).toEqual(['valve'])
      const c: State = { ...b, chapter6: { ...b.chapter6, boltOpen: true } }
      expect(chapter56Cues(b, c)).toEqual(['latch', 'door'])
      const d: State = { ...c, area: 'shelter', chapter6: { ...c.chapter6, completed: true } }
      expect(chapter56Cues(c, d)).toEqual(['complete'])
      expect(chapter56Cues(d, d)).toEqual([])
    }
  })
})

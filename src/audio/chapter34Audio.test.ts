import { describe, expect, it } from 'vitest'
import { initialState, reducer, type State } from '../game/engine'
import { chapter34Cues, trainMotion } from './chapter34Audio'
const base = (): State => ({
  ...initialState,
  stage: 'explore',
  area: 'platform',
  chapter3: {
    ...initialState.chapter3,
    started: true,
    approved: true,
    signal: 'green',
    npc: 'helped',
  },
})
const finish = (state: State): State => {
  while (state.scene.length) state = reducer(state, { type: 'advance' })
  return state
}
describe('chapter 3–4 audio uses authoritative game transitions', () => {
  it('call and door sound once, departure only after confirmed boarding, with either NPC branch', () => {
    for (const npc of ['helped', 'waiting'] as const) {
      const a = { ...base(), chapter3: { ...base().chapter3, npc } }
      const open = reducer(a, { type: 'call-train-b' })
      expect(chapter34Cues(a, open)).toEqual(['call', 'door'])
      expect(chapter34Cues(open, reducer(open, { type: 'call-train-b' }))).toEqual([])
      const boarded = reducer(finish(open), { type: 'board-train-b' })
      expect(chapter34Cues(open, boarded)).toEqual(['door', 'depart'])
      expect(trainMotion(boarded)).toBe('moving')
    }
  })
  it('preserves rolling across chapter transition, carriages and power cuts', () => {
    const a = reducer(finish(reducer(base(), { type: 'call-train-b' })), { type: 'board-train-b' })
    const escaped = finish(a)
    const started = reducer(escaped, { type: 'train-start' })
    expect(chapter34Cues(escaped, started)).toEqual(['vibration'])
    const rear = reducer(finish(started), { type: 'train-move', area: 'trainRear' })
    const inspected = finish(reducer(rear, { type: 'inspect', id: 'train-devices' }))
    const off = reducer(inspected, { type: 'train-link', id: 'power' })
    expect(trainMotion(off)).toBe('moving')
    expect(chapter34Cues(inspected, off)).toEqual(['switch'])
    expect(chapter34Cues(off, reducer(off, { type: 'train-link', id: 'power' }))).toEqual([
      'switch',
      'restore',
    ])
    expect(chapter34Cues(started, rear)).toEqual([])
  })
  it('aligns request, slowing, stop and door to their existing scene states, never save restoration', () => {
    const a: State = {
      ...base(),
      area: 'trainFront',
      clues: ['train-stop'],
      chapter3: { ...base().chapter3, boarded: true, escaped: true },
      chapter4: {
        ...initialState.chapter4,
        started: true,
        links: { power: true, relay: true, external: false },
        sync: 'active',
      },
    }
    const accepted = reducer(a, { type: 'train-sync-hit', marker: 0.5 })
    expect(chapter34Cues(a, accepted)).toEqual(['request'])
    const slowing = reducer(accepted, { type: 'advance' })
    expect(chapter34Cues(accepted, slowing)).toEqual(['brake'])
    expect(trainMotion(slowing)).toBe('slowing')
    const arrived = reducer(slowing, { type: 'advance' })
    expect(chapter34Cues(slowing, arrived)).toEqual(['stop', 'door'])
    expect(trainMotion(arrived)).toBe('stopped')
    expect(chapter34Cues(arrived, arrived)).toEqual([])
    expect(chapter34Cues(accepted, accepted)).toEqual([])
  })
  it('adds the single existing boundary footstep only when its subtitle first becomes current', () => {
    const a: State = {
      ...base(),
      area: 'stairs',
      chapter2: { ...initialState.chapter2, ending: 'question' },
      scene: [
        { who: 'seo', text: '지금 발소리' },
        { who: 'player', text: '…또각.' },
      ],
      sceneIndex: 0,
    }
    const b = reducer(a, { type: 'advance' })
    expect(chapter34Cues(a, b)).toEqual(['echo'])
    expect(chapter34Cues(b, b)).toEqual([])
  })
})

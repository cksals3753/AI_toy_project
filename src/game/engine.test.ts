import { describe, expect, it } from 'vitest'
import { initialState, loadGame, reducer } from './engine'
import type { Action } from './engine'
const play = (...actions: Action[]) => actions.reduce(reducer, initialState)
const preparation: Action[] = [{ type: 'start' }, { type: 'inspect', id: 'panel' }, { type: 'inspect', id: 'map' }, { type: 'ask', id: 'water' }]
describe('episode rules', () => {
  it('requires evidence and questioning before committing to a route', () => {
    const state = play({ type: 'start' })
    expect(reducer(state, { type: 'route', id: 'west' })).toBe(state)
    expect(reducer(state, { type: 'ask', id: 'water' })).toBe(state)
  })
  it('charges investigations once and never charges messages', () => {
    const state = play(...preparation)
    expect(state.battery).toBe(56)
    expect(reducer(state, { type: 'inspect', id: 'panel' })).toBe(state)
    expect(reducer(state, { type: 'ask', id: 'water' })).toBe(state)
  })
  it('escapes safely with the gloves and correct code', () => {
    const state = play(...preparation, { type: 'inspect', id: 'cabinet' }, { type: 'route', id: 'west' }, { type: 'code', code: '0218' })
    expect(state.outcome).toBe('escaped')
    expect(state.health).toBe(100)
    expect(state.battery).toBe(51)
  })
  it('escapes injured without gloves', () => {
    const state = play(...preparation, { type: 'route', id: 'west' }, { type: 'code', code: '0218' })
    expect(state.outcome).toBe('injured')
    expect(state.health).toBe(75)
  })
  it('fails on the flooded eastern route', () => {
    expect(play(...preparation, { type: 'route', id: 'east' }).outcome).toBe('failed')
  })
  it('locks after three incorrect attempts and prevents further mutations', () => {
    const state = play(...preparation, { type: 'route', id: 'west' }, ...Array.from({ length: 3 }, (): Action => ({ type: 'code', code: '0000' })))
    expect(state.stage).toBe('result')
    expect(state.outcome).toBe('failed')
    expect(state.battery).toBe(26)
    expect(reducer(state, { type: 'code', code: '0218' })).toBe(state)
  })
  it('rejects malformed code without consuming attempts', () => {
    expect(play(...preparation, { type: 'route', id: 'west' }, { type: 'code', code: 'abc' }).attempts).toBe(0)
  })
  it('resets an existing game', () => {
    expect(reducer(play(...preparation), { type: 'reset' })).toEqual(initialState)
  })
})
describe('save loading', () => {
  it('restores a saved run and falls back on broken data or unavailable storage', () => {
    const state = play(...preparation, { type: 'route', id: 'west' })
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify(state) } })
    expect(loadGame()).toEqual(state)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '{broken' } })
    expect(loadGame()).toEqual(initialState)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ ...state, battery: -5 }) } })
    expect(loadGame()).toEqual(initialState)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => { throw new Error('blocked') } } })
    expect(loadGame()).toEqual(initialState)
    Reflect.deleteProperty(globalThis, 'localStorage')
  })
})

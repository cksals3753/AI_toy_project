import { describe, expect, it } from 'vitest'
import { gameKey } from './explorationInput'
import { clampPitch, firstPersonDirection } from './firstPerson'
import { movePlayer } from './world'

describe('physical exploration input and first-person projection', () => {
  it('uses the physical E and movement keys regardless of Korean/Latin layout', () => {
    expect(gameKey({ code: 'KeyE', key: 'ㄷ' })).toBe('e')
    expect(gameKey({ code: 'KeyE', key: 'E' })).toBe('e')
    expect(gameKey({ code: 'KeyW', key: 'ㅈ' })).toBe('w')
    expect(gameKey({ code: 'ArrowUp', key: 'ArrowUp' })).toBe('arrowup')
    expect(gameKey({ code: '', key: 'e' })).toBe('e')
  })
  it('projects movement into existing saved coordinates and preserves collisions', () => {
    const north = firstPersonDirection({ x: 0, y: -1 }, 0)
    const west = firstPersonDirection({ x: 0, y: -1 }, Math.PI / 2)
    expect(north).toEqual({ x: 0, y: -1 })
    expect(west.x).toBeCloseTo(-1)
    expect(west.y).toBeCloseTo(0)
    let position = { x: 350, y: 330 }
    for (let i = 0; i < 200; i++) position = movePlayer(position, north, 0.016)
    expect(position.y).toBeGreaterThanOrEqual(305)
    let door = { x: 80, y: 265 }
    for (let i = 0; i < 200; i++) door = movePlayer(door, west, 0.016)
    expect(door.x).toBeGreaterThanOrEqual(67)
    expect(clampPitch(99)).toBe(1.1)
    expect(clampPitch(-99)).toBe(-1.1)
  })
})

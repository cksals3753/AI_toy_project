import { describe, expect, it } from 'vitest'
import { joystickCenter, joystickVector } from './joystick'
describe('floating joystick geometry', () => {
  it('starts neutral, ignores tremor and normalizes diagonal motion', () => {
    expect(joystickVector(0, 0)).toEqual({ x: 0, y: 0 })
    expect(joystickVector(3, 2)).toEqual({ x: 0, y: 0 })
    const v = joystickVector(90, -90)
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1)
    expect(v.x).toBeCloseTo(-v.y)
  })
  it('keeps the ring inside the initial quarter at screen edges', () => {
    expect(joystickCenter(1, 1, 195, 422)).toEqual({ x: 56, y: 56 })
    expect(joystickCenter(194, 421, 195, 422)).toEqual({ x: 139, y: 366 })
    expect(joystickCenter(90, 220, 195, 422)).toEqual({ x: 90, y: 220 })
  })
})

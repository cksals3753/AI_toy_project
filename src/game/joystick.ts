import type { Point } from './world'
export const joystickVector = (dx: number, dy: number): Point => {
  const length = Math.hypot(dx, dy)
  return length < 5
    ? { x: 0, y: 0 }
    : { x: dx / Math.max(33, length), y: dy / Math.max(33, length) }
}
export const joystickCenter = (x: number, y: number, width: number, height: number): Point => ({
  x: Math.max(Math.min(56, width / 2), Math.min(width - Math.min(56, width / 2), x)),
  y: Math.max(Math.min(56, height / 2), Math.min(height - Math.min(56, height / 2), y)),
})

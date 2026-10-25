import { interactionReach, surfaceDistance } from './interaction'
import type { Point, Rect } from './world'
export type HallEnvironment = {
  water: 0 | 1
  visited: boolean
  leakShown: boolean
  shutter: 'locked' | 'unlatched' | 'open'
}
export const initialHallEnvironment: HallEnvironment = {
  water: 0,
  visited: false,
  leakShown: false,
  shutter: 'locked',
}
export const centralWater: Rect = { x: 390, y: 320, w: 220, h: 100 }
export const risingWater: Rect = { x: 690, y: 330, w: 220, h: 140 }
export const shutterRect: Rect = { x: 144, y: 430, w: 106, h: 12 }
export const hallPartitions: Rect[] = [
  { x: 130, y: 430, w: 14, h: 120 },
  { x: 250, y: 430, w: 14, h: 120 },
  { x: 180, y: 300, w: 80, h: 22 },
]
export const waterRects = (water: number) =>
  water === 1 ? [centralWater, risingWater] : [centralWater]
export const outsideRisingWater = (p: Point) =>
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  (p.x < risingWater.x - 14 ||
    p.x > risingWater.x + risingWater.w + 14 ||
    p.y < risingWater.y - 14 ||
    p.y > risingWater.y + risingWater.h + 14)
export const shutterSeconds = 0.9

export const shutterReachable = (p: Point) =>
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  surfaceDistance(p, { ...shutterRect, id: 'hall-shutter' }) < interactionReach('hall-shutter')
export type ShutterOperation = { stage: HallEnvironment['shutter']; origin?: Point; time: number }
export const stepShutterOperation = (
  op: ShutterOperation,
  frame: {
    active: boolean
    caught: boolean
    stage: HallEnvironment['shutter']
    player: Point
    dt: number
  },
) => {
  const origin = op.origin ?? { ...frame.player }
  if (
    !frame.active ||
    frame.caught ||
    frame.stage !== op.stage ||
    Math.hypot(frame.player.x - origin.x, frame.player.y - origin.y) > 4 ||
    !shutterReachable(frame.player)
  )
    return { status: 'cancelled' as const, operation: null, progress: 0 }
  const time = op.time + Math.min(0.05, Math.max(0, frame.dt)),
    progress = Math.min(100, Math.round((time / shutterSeconds) * 100))
  return time >= shutterSeconds
    ? { status: 'complete' as const, operation: null, progress: 100 }
    : { status: 'running' as const, operation: { ...op, origin, time }, progress }
}

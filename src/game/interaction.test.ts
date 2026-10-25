import { expect, it } from 'vitest'
import { interactionReach, surfaceDistance } from './interaction'
import { getWorld, nearestEntity } from './world'
import { shutterReachable } from './hallEnvironment'
it('uses distinct observation/operation distances and the visible front surface in 2D too', () => {
  const w = getWorld('hall')
  const map = w.entities.find((e) => e.id === 'hall-map')!
  expect(surfaceDistance({ x: 480, y: 210 }, map)).toBe(124)
  expect(nearestEntity({ x: 480, y: 210 }, w)?.id).toBe('hall-map')
  expect(nearestEntity({ x: 480, y: 212 }, w)?.id).not.toBe('hall-map')
  expect(interactionReach('hall-map')).toBe(125)
  expect(interactionReach('powerboard')).toBe(135)
  expect(interactionReach('hall-shutter')).toBe(75)
  expect(interactionReach('train-phone')).toBe(60)
  expect(interactionReach('west')).toBe(60)
  expect(interactionReach('panel')).toBe(90)
  expect(shutterReachable({ x: 197, y: 360 })).toBe(true)
  expect(shutterReachable({ x: 197, y: 350 })).toBe(false)
  expect(nearestEntity({ x: 280, y: 445 }, w)?.id).not.toBe('hall-shutter')
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cameraFov, defaultComfort, normalizeComfort, touchLookScale } from './comfort'
import { movePlayer, room } from './world'
import { createThreat, stepThreat } from './threat'
import { sceneScale, toScenePosition } from './firstPerson'
import { createThreatVisual } from './threatVisual'
import * as T from 'three'

afterEach(() => vi.unstubAllGlobals())

describe('comfort settings and movement', () => {
  it('recovers invalid or partial separate settings', () => {
    expect(normalizeComfort(null)).toEqual(defaultComfort)
    expect(normalizeComfort({ fov: NaN, moveSpeed: 0 })).toEqual({
      ...defaultComfort,
      moveSpeed: 0.6,
    })
    expect(normalizeComfort({ mouseSensitivity: Infinity, fov: 999 }).fov).toBe(80)
  })
  it('uses vertical FOV and bounds horizontal distortion across aspect ratios', () => {
    expect(cameraFov(64, 16 / 9)).toBeCloseTo(64)
    for (const aspect of [0.2, 390 / 844, 1, 16 / 9, 32 / 9, 6.4]) {
      const v = cameraFov(64, aspect)
      const h = (2 * Math.atan(Math.tan((v * Math.PI) / 360) * aspect) * 180) / Math.PI
      expect(h).toBeGreaterThanOrEqual(39.999)
      expect(h).toBeLessThanOrEqual(105.001)
    }
    expect(100 * touchLookScale(390, 844)).toBeCloseTo(200 * touchLookScale(780, 1688))
  })
  it('preserves normalized diagonal speed and collision at minimum speed', () => {
    const world = { ...room, obstacles: [], entities: [] }
    const p = { x: 480, y: 310 }
    for (const speed of [0.6, 0.8, 1]) {
      const straight = movePlayer(p, { x: 1, y: 0 }, 0.05, world, speed)
      const diagonal = movePlayer(p, { x: 1, y: 1 }, 0.05, world, speed)
      expect(Math.hypot(diagonal.x - p.x, diagonal.y - p.y)).toBeCloseTo(straight.x - p.x)
      expect(straight.x - p.x).toBeCloseTo(165 * 0.05 * speed)
    }
    const w = { ...world, obstacles: [{ x: 500, y: 200, w: 10, h: 220 }] }
    let p2 = p
    for (let i = 0; i < 200; i++) p2 = movePlayer(p2, { x: 1, y: 0 }, 0.05, w, 0.6)
    expect(p2.x).toBeLessThan(500)
  })
  it('scales chasing speed without accelerating detection or contact clocks', () => {
    const world = { ...room, obstacles: [], entities: [] }
    const r = {
      ...createThreat(),
      mode: 'chase' as const,
      position: { x: 220, y: 240 },
      heading: 0,
      route: [{ x: 400, y: 240 }],
      replanning: 1,
    }
    const fast = stepThreat(r, { x: 400, y: 240 }, 0.05, world, false, 1)
    const slow = stepThreat(r, { x: 400, y: 240 }, 0.05, world, false, 0.6)
    expect(slow.position.x - 220).toBeCloseTo((fast.position.x - 220) * 0.6)
    expect(slow.clock).toBe(fast.clock)
    expect(165 * 0.6).toBeGreaterThan(115 * 0.6)
  })
  it('renders infected at the same hall coordinates as collisions and camera', () => {
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => ({ fillRect: () => {}, fillText: () => {} }) }),
    })
    const scene = new T.Scene()
    const visual = createThreatVisual(scene, 'hall')
    const enemy = createThreat()
    visual.update(enemy, 0.01, true, 0, false)
    const expected = toScenePosition(enemy.position, 'hall')
    expect(sceneScale('hall')).toBe(40)
    scene.updateMatrixWorld(true)
    expect(
      scene.children[0].children.some(
        (child) =>
          Math.abs(child.position.x - expected.x) < 0.001 &&
          Math.abs(child.position.z - expected.z) < 0.001,
      ),
    ).toBe(true)
    visual.dispose()
  })
})

import { describe, expect, it } from 'vitest'
import * as T from 'three'
import { registerFacilityTarget, createSceneTarget } from './sceneInteraction'
import { interactionReach, interactionSurface, interactionBounds } from './interaction'
import { getWorld, nearestEntity, worlds } from './world'
const dispose = (scene: T.Scene) =>
  scene.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose()
      const m = Array.isArray(o.material) ? o.material : [o.material]
      m.forEach((x) => x.dispose())
    }
  })
describe('episode facility surfaces', () => {
  it.each([
    ['first', 'map', 110],
    ['first', 'panel', 90],
    ['first', 'cabinet', 70],
    ['platform', 'approval', 95],
    ['platform', 'call-b', 65],
    ['trainRear', 'train-devices', 100],
    ['trainFront', 'train-stop', 90],
    ['moonPlatform', 'moon-sensor', 70],
    ['moonBooth', 'moon-terminal', 90],
    ['moonHolding', 'moon-cancel-device', 65],
    ['maintenance', 'final-control', 100],
    ['recovery', 'recovery-valve', 65],
    ['recovery', 'recovery-bolt', 70],
    ['shelter', 'shelter-arrival', 80],
  ] as const)(
    'keeps %s/%s usable from its face and rejects distance/air/occlusion',
    (area, id, reach) => {
      const e = worlds[area].entities.find((e) => e.id === id)!,
        scene = new T.Scene(),
        targets: T.Object3D[] = [],
        blocks: T.Object3D[] = []
      const r = interactionSurface(e),
        bounds = interactionBounds(id, 2.4)
      registerFacilityTarget(scene, 50, e, 2.4, targets, blocks)
      const north = id === 'call-b',
        p = { x: r.x + r.w / 2, y: north ? r.y - (reach - 8) : r.y + r.h + reach - 8 }
      const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
      camera.position.set((p.x - 480) / 50, bounds.bottom + bounds.height / 2, (p.y - 310) / 50)
      camera.rotation.y = north ? Math.PI : 0
      scene.updateMatrixWorld(true)
      camera.updateMatrixWorld()
      const choose = createSceneTarget({ ...worlds[area], entities: [e] }, 50, targets, blocks)
      expect(choose(camera)?.id).toBe(id)
      camera.position.z += (north ? -1 : 1) * 0.4
      camera.updateMatrixWorld()
      expect(choose(camera)).toBeNull()
      camera.position.z -= (north ? -1 : 1) * 0.4
      camera.position.y = bounds.bottom + bounds.height + 0.3
      camera.updateMatrixWorld()
      expect(choose(camera)).toBeNull()
      camera.position.y = bounds.bottom + bounds.height / 2
      const wall = new T.Mesh(
        new T.BoxGeometry(4, 4, 0.1),
        new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }),
      )
      wall.position.copy(camera.position)
      wall.position.z += (north ? 1 : -1) * 0.2
      scene.add(wall)
      scene.updateMatrixWorld(true)
      camera.updateMatrixWorld()
      expect(
        createSceneTarget({ ...worlds[area], entities: [e] }, 50, targets, [...blocks, wall])(
          camera,
        ),
      ).toBeNull()
      expect(interactionReach(id)).toBe(reach)
      dispose(scene)
    },
  )
  it('retains existing travel, NPC, small phone and chapter2 ranges', () => {
    for (const id of [
      'train-a',
      'train-b',
      'train-exit',
      'moon-maintenance',
      'recovery-hatch',
      'survivor',
      'train-phone',
      'moon-shoes',
    ])
      expect(interactionReach(id)).toBe(60)
    expect(interactionReach('hall-map')).toBe(125)
    expect(interactionReach('hall-shutter')).toBe(75)
    const phone = worlds.trainB.entities.find((e) => e.id === 'train-phone')!
    expect(interactionSurface(phone)).toMatchObject({ x: 207, y: 273, w: 19, h: 28 })
  })
  it('keeps NPC conversation accessible over its own chair but cannot inspect other objects through it', () => {
    const w = getWorld('trainB', 'helped', true, [], false, { started: true, arrived: false })
    expect(nearestEntity({ x: 615, y: 390 }, w)?.id).toBe('survivor')
    const blocked = { ...worlds.first, obstacles: [{ x: 400, y: 140, w: 150, h: 20 }] }
    expect(nearestEntity({ x: 482, y: 180 }, blocked)?.id).not.toBe('map')
  })
  it('does not allow the back of one body to become transparent after its face is reduced', () => {
    const e = worlds.moonHolding.entities.find((e) => e.id === 'moon-cancel-device')!,
      scene = new T.Scene(),
      targets: T.Object3D[] = [],
      blocks: T.Object3D[] = []
    registerFacilityTarget(scene, 50, e, 2.4, targets, blocks)
    const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
    camera.position.set((e.x + 40 - 480) / 50, 1.3, (e.y - 20 - 310) / 50)
    camera.rotation.y = Math.PI
    camera.updateMatrixWorld()
    scene.updateMatrixWorld(true)
    expect(createSceneTarget(worlds.moonHolding, 50, targets, blocks)(camera)).toBeNull()
    dispose(scene)
  })
  it('uses the operating side in the 2D fallback as well', () => {
    const e = worlds.moonHolding.entities.find((e) => e.id === 'moon-cancel-device')!
    const w = { ...worlds.moonHolding, obstacles: [], entities: [e] }
    expect(nearestEntity({ x: e.x + e.w / 2, y: e.y - 25 }, w)).toBeNull()
    expect(nearestEntity({ x: e.x + e.w / 2, y: e.y + e.h + 40 }, w)?.id).toBe(e.id)
    const call = worlds.platform.entities.find((e) => e.id === 'call-b')!
    const platform = { ...worlds.platform, obstacles: [], entities: [call] }
    expect(nearestEntity({ x: call.x + call.w / 2, y: call.y - 45 }, platform)?.id).toBe(call.id)
    expect(nearestEntity({ x: call.x + call.w / 2, y: call.y + call.h + 25 }, platform)).toBeNull()
  })
})

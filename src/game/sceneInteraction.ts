import { facilityProfiles } from './facilityProfiles'
import * as T from 'three'
import { interactionReach, interactionBounds, interactionSurface } from './interaction'
import type { Entity, World } from './world'

export const createSceneTarget = (
  layout: World,
  scale: number,
  interactables: T.Object3D[],
  blockers: T.Object3D[],
) => {
  const ray = new T.Raycaster()
  // Existing invisible entity proxies own the hit area; never merge nearby IDs.
  // A small screen-space disk provides aim tolerance without extending reach.
  const solids = [...interactables, ...blockers]
  const point = new T.Vector2()
  const projected = new T.Vector3()
  let previous: string | null = null
  const offsets = [new T.Vector2(0, 0)]
  for (const radius of [0.025, 0.05, 0.075])
    for (let i = 0; i < 8; i++)
      offsets.push(
        new T.Vector2(Math.cos((i * Math.PI) / 4) * radius, Math.sin((i * Math.PI) / 4) * radius),
      )
  return (camera: T.Camera): Entity | null => {
    const aspect = camera instanceof T.PerspectiveCamera ? camera.aspect : 1
    const candidates = new Map<string, { entity: Entity; score: number }>()
    for (const offset of offsets) {
      ray.setFromCamera(point.set(offset.x / aspect, offset.y), camera)
      // Every assist ray uses the same solid blockers as the exact center ray.
      const hit = ray.intersectObjects(solids, false)[0]
      if (!hit || !hit.object.userData.entityId) continue
      const entity = layout.entities.find((e) => e.id === hit.object.userData.entityId)
      if (!entity) continue
      const reach = interactionReach(entity.id)
      // Ray hit, not model/pivot center: wide panels remain usable at their edge.
      const distance =
        Math.hypot(hit.point.x - camera.position.x, hit.point.z - camera.position.z) * scale
      if (distance >= reach || hit.distance > Math.hypot(reach / scale, 2.7)) continue
      projected.copy(hit.point).project(camera)
      const score =
        Math.hypot(projected.x * aspect, projected.y) / 0.075 + (distance / reach) * 0.15
      if (score < (candidates.get(entity.id)?.score ?? Infinity))
        candidates.set(entity.id, { entity, score })
    }
    const ranked = [...candidates.values()].sort(
      (a, b) =>
        a.score -
          (a.entity.id === previous ? 0.4 : 0) -
          (b.score - (b.entity.id === previous ? 0.4 : 0)) ||
        a.entity.id.localeCompare(b.entity.id),
    )
    previous = ranked[0]?.entity.id ?? null
    return ranked[0]?.entity ?? null
  }
}
export const disposeSceneObject = (root: T.Object3D) => {
  root.traverse((obj) => {
    if (obj instanceof T.Mesh || obj instanceof T.Sprite) {
      if (obj instanceof T.Mesh) obj.geometry.dispose()
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      materials.forEach((material) => {
        for (const value of Object.values(material)) if (value instanceof T.Texture) value.dispose()
        material.dispose()
      })
    }
  })
}

// A thin working face must not make the rest of a cabinet transparent to
// selection. Keep a slightly recessed body as an invisible occluder.
export const registerFacilityTarget = (
  scene: T.Scene,
  scale: number,
  e: Entity,
  top: number,
  interactables: T.Object3D[],
  blockers: T.Object3D[],
) => {
  const bounds = interactionBounds(e.id, top),
    r = interactionSurface(e)
  const make = (rect: { x: number; y: number; w: number; h: number }, material: T.Material) => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(rect.w / scale, bounds.height, rect.h / scale),
      material,
    )
    mesh.position.set(
      (rect.x + rect.w / 2 - 480) / scale,
      bounds.bottom + bounds.height / 2,
      (rect.y + rect.h / 2 - 310) / scale,
    )
    scene.add(mesh)
    return mesh
  }
  const proxy = make(r, new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }))
  proxy.userData.entityId = e.id
  interactables.push(proxy)
  if (facilityProfiles[e.id] && e.id !== 'train-phone') {
    const north = facilityProfiles[e.id].north
    const body = make(
      { ...e, y: e.y + (north ? 0.5 : 0), h: e.h - 0.5 },
      new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }),
    )
    body.name = `facility-body-occluder-${e.id}`
    blockers.push(body)
  }
  return proxy
}

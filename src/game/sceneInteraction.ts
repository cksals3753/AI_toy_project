import * as T from 'three'
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
      if (!hit || hit.distance > Math.max(2.1, 65 / scale) || !hit.object.userData.entityId)
        continue
      const entity = layout.entities.find((e) => e.id === hit.object.userData.entityId)
      if (!entity) continue
      const px = camera.position.x * scale + 480,
        py = camera.position.z * scale + 310
      const distance = Math.hypot(
        px - Math.max(entity.x, Math.min(px, entity.x + entity.w)),
        py - Math.max(entity.y, Math.min(py, entity.y + entity.h)),
      )
      if (distance >= 60) continue
      hit.object.getWorldPosition(projected).project(camera)
      const score = Math.hypot(projected.x * aspect, projected.y) / 0.075 + (distance / 60) * 0.15
      if (score < (candidates.get(entity.id)?.score ?? Infinity))
        candidates.set(entity.id, { entity, score })
    }
    const ranked = [...candidates.values()].sort(
      (a, b) =>
        a.score -
          (a.entity.id === previous ? 0.2 : 0) -
          (b.score - (b.entity.id === previous ? 0.2 : 0)) ||
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

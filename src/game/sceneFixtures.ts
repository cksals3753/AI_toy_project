import * as T from 'three'
import type { Rect } from './world'

// Thin trim must sit outside the host's faces, not at the same depth.
export const raisedTrim = (r: Rect): Rect => ({
  x: r.x - 0.5,
  y: r.y - 0.5,
  w: r.w + 1,
  h: r.h + 1,
})
export const trainWindow = (r: Rect, x: number): Rect => ({
  x,
  y: r.y === 75 ? r.y + r.h + 0.5 : r.y - 2.5,
  w: 35,
  h: 2,
})

// Preserve the full authoritative chair collision footprint as a hidden proxy.
// The visible chair has an open underside and its back is behind the north-facing actor.
export const addNpcChair = (
  scene: T.Scene,
  r: Rect,
  scale: number,
  seat: T.Material,
  back: T.Material,
) => {
  const part = (rect: Rect, height: number, bottom: number, material: T.Material) => {
    const mesh = new T.Mesh(new T.BoxGeometry(rect.w / scale, height, rect.h / scale), material)
    mesh.position.set(
      (rect.x + rect.w / 2 - 480) / scale,
      bottom + height / 2,
      (rect.y + rect.h / 2 - 310) / scale,
    )
    scene.add(mesh)
    return mesh
  }
  const proxy = part(r, 0.9, 0, new T.MeshBasicMaterial({ visible: false }))
  proxy.name = 'npc-chair-collision'
  part(r, 0.06, 0.3, seat).name = 'npc-chair-seat'
  part({ ...r, y: r.y + r.h - 4, h: 4 }, 0.48, 0.36, back).name = 'npc-chair-back'
  for (const x of [r.x + 2, r.x + r.w - 5])
    for (const y of [r.y + 2, r.y + r.h - 5]) part({ x, y, w: 3, h: 3 }, 0.3, 0, seat)
  return proxy
}

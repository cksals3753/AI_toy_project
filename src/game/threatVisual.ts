import { sceneScale } from './firstPerson'
import * as T from 'three'
import { exitMarkers } from './threat'
import type { ThreatRuntime } from './threat'

// Original low-poly rig: articulated hips/shoulders, gait driven by actual travelled distance.
export const createThreatVisual = (scene: T.Scene, area: string) => {
  const root = new T.Group(),
    actor = new T.Group(),
    geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = []
  const material = (color: string) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.94 })
    materials.push(m)
    return m
  }
  const skin = material('#829387'),
    cloth = material('#8a5434'),
    dark = material('#282f30'),
    light = material('#b6b6a5')
  const box = (
    parent: T.Object3D,
    w: number,
    h: number,
    d: number,
    m: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const g = new T.BoxGeometry(w, h, d)
    geometries.push(g)
    const mesh = new T.Mesh(g, m)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  const textures: T.Texture[] = []
  const label = (parent: T.Object3D, text: string, y: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 96
    const c = canvas.getContext('2d')!
    c.fillStyle = '#111a15'
    c.fillRect(0, 0, 512, 96)
    c.fillStyle = '#e1c495'
    c.font = 'bold 36px sans-serif'
    c.textAlign = 'center'
    c.fillText(text, 256, 62)
    const texture = new T.CanvasTexture(canvas)
    texture.colorSpace = T.SRGBColorSpace
    textures.push(texture)
    const mat = new T.SpriteMaterial({ map: texture, depthWrite: false })
    materials.push(mat)
    const sprite = new T.Sprite(mat)
    sprite.position.y = y
    sprite.scale.set(1.5, 0.28, 1)
    parent.add(sprite)
  }
  const limbs: T.Group[] = []
  if (area === 'hall') {
    box(actor, 0.43, 0.64, 0.26, cloth, 0, 1.08)
    box(actor, 0.28, 0.31, 0.29, skin, 0, 1.58, 0.07).rotation.x = 0.25
    box(actor, 0.32, 0.04, 0.04, dark, 0, 1.63, 0.23)
    for (const [x, y, length] of [
      [-0.13, 0.72, 0.72],
      [0.13, 0.72, 0.72],
      [-0.29, 1.36, 0.62],
      [0.29, 1.36, 0.62],
    ]) {
      const hinge = new T.Group()
      hinge.position.set(x, y, 0)
      actor.add(hinge)
      box(hinge, 0.12, length, 0.14, y < 1 ? dark : cloth, 0, -length / 2)
      limbs.push(hinge)
    }
    box(actor, 0.05, 0.45, 0.02, light, 0.1, 1.15, 0.145).rotation.z = 0.35
    box(actor, 0.05, 0.035, 0.025, light, -0.07, 1.64, 0.224)
    box(actor, 0.05, 0.035, 0.025, light, 0.07, 1.64, 0.224)
    label(actor, '⚠ 감염자', 2.0)
    root.add(actor)
    for (const r of exitMarkers.slice(0, 1)) {
      const m = material('#6b846b')
      box(
        root,
        r.w / sceneScale(area),
        0.012,
        r.h / sceneScale(area),
        m,
        (r.x + r.w / 2 - 480) / sceneScale(area),
        0.018,
        (r.y + r.h / 2 - 310) / sceneScale(area),
      )
    }
  }
  let door: T.Mesh | undefined, shadow: T.Mesh | undefined, dust: T.Points | undefined
  if (area === 'first') {
    const sign = new T.Group()
    sign.position.set(2.85, 0, -4.5)
    label(sign, '시설문 · 임시 봉쇄', 2.25)
    root.add(sign)
    door = box(root, 1.15, 2.05, 0.09, dark, 2.85, 1.04, -4.61)
    box(root, 1.22, 0.13, 0.12, cloth, 2.85, 1.35, -4.54).rotation.z = -0.1
    const sm = new T.MeshBasicMaterial({ color: '#070b09', transparent: true, opacity: 0.8 })
    materials.push(sm)
    shadow = box(root, 0.38, 0.05, 0.85, sm, 2.85, 0.035, -4.2)
    const g = new T.BufferGeometry(),
      v = new Float32Array(36)
    for (let i = 0; i < 12; i++) {
      v[i * 3] = 2.35 + (i % 5) * 0.22
      v[i * 3 + 1] = 1.9 + (i % 3) * 0.1
      v[i * 3 + 2] = -4.5
    }
    g.setAttribute('position', new T.BufferAttribute(v, 3))
    geometries.push(g)
    const m = new T.PointsMaterial({
      color: '#afa18a',
      size: 0.025,
      transparent: true,
      opacity: 0.5,
    })
    materials.push(m)
    dust = new T.Points(g, m)
    root.add(dust)
  }
  scene.add(root)
  let frozenStride = 0
  let last = { x: 470, y: 190 },
    distance = 0,
    beat = -1,
    pulse = 0
  return {
    update: (r: ThreatRuntime, dt: number, active: boolean, progress: number, reduced: boolean) => {
      if (area === 'hall') {
        const moved = Math.hypot(r.position.x - last.x, r.position.y - last.y)
        distance += moved
        last = { ...r.position }
        actor.position.set(
          (r.position.x - 480) / sceneScale(area),
          0,
          (r.position.y - 310) / sceneScale(area),
        )
        actor.rotation.y = -r.heading + Math.PI / 2
        if (active) frozenStride = moved > 0.001 ? Math.sin(distance * 0.065) : 0
        const stride = frozenStride
        limbs.forEach((limb, i) => {
          limb.rotation.x =
            (i < 2 ? 1 : -0.65) * stride * (i % 2 ? -0.48 : 0.48) + (i >= 2 ? -0.4 : 0)
        })
        actor.rotation.z = reduced ? 0 : Math.sin(distance * 0.033) * 0.045
        if (import.meta.env.DEV) scene.userData.threatGait = limbs[0]?.rotation.x ?? 0
      } else if (area === 'first') {
        if (beat === -1) beat = progress
        else if (beat !== progress) {
          beat = progress
          pulse = 1.4
        }
        if (active) {
          pulse = Math.max(0, pulse - dt)
          if (door) door.position.z = -4.61 + (reduced ? 0 : Math.sin(pulse * 30) * pulse * 0.015)
          if (shadow) shadow.position.x = 2.85 + Math.sin(pulse * 2) * 0.2
          if (dust) dust.position.y = -(1.4 - pulse) * 0.4
        }
        if (dust) dust.visible = pulse > 0
      }
    },
    dispose: () => {
      scene.remove(root)
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
    },
  }
}

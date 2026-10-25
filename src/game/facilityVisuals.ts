import * as T from 'three'
import type { Entity, Rect } from './world'
export type FacilityKind =
  | 'console'
  | 'records'
  | 'button'
  | 'sensor'
  | 'links'
  | 'valve'
  | 'bolt'
  | 'notice'
  | 'arrival'
  | 'gauge'
export type FacilityMaterials = { metal: T.Material; dark: T.Material; warm: T.Material }

// Local procedural parts reuse the existing palette and authoritative footprint.
// None is an additional interaction target or collision body.
export const addFacilityModel = (
  scene: T.Scene,
  scale: number,
  e: Entity,
  kind: FacilityKind,
  m: FacilityMaterials,
) => {
  const { metal, dark, warm } = m,
    center = e.x + e.w / 2,
    front = e.y + e.h,
    north = e.id === 'call-b'
  const parts: T.Mesh[] = []
  const box = (r: Rect, h: number, mat: T.Material, bottom = 0) => {
    const mesh = new T.Mesh(new T.BoxGeometry(r.w / scale, h, r.h / scale), mat)
    mesh.position.set((r.x + r.w / 2 - 480) / scale, bottom + h / 2, (r.y + r.h / 2 - 310) / scale)
    mesh.name = `facility-${e.id}-${kind}`
    scene.add(mesh)
    parts.push(mesh)
    return mesh
  }
  const cylinder = (
    radius: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: T.Material,
    face = false,
  ) => {
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, h, 12), mat)
    if (face) mesh.rotation.x = Math.PI / 2
    mesh.position.set((x - 480) / scale, y, (z - 310) / scale)
    scene.add(mesh)
    parts.push(mesh)
    return mesh
  }
  box(e, 0.06, dark)
  const levers: T.Mesh[] = [],
    plugs: T.Mesh[] = []
  let wheel: T.Mesh | null = null,
    bolt: T.Mesh | null = null
  if (kind === 'console') {
    for (const x of [center - 24, center + 19]) box({ x, y: e.y + 8, w: 5, h: 18 }, 0.95, metal)
    box({ x: center - 32, y: e.y + 1, w: 64, h: Math.min(36, e.h - 2) }, 0.08, dark, 0.95)
    box({ x: center - 27, y: e.y + 3, w: 54, h: 5 }, 0.48, metal, 1.04)
    box({ x: center - 23, y: e.y + 9, w: 46, h: 2 }, 0.36, dark, 1.1)
    const count = e.id === 'final-control' ? 3 : e.id === 'approval' ? 2 : 1
    for (let i = 0; i < count; i++)
      levers.push(
        box({ x: center - (count - 1) * 9 + i * 18, y: front - 14, w: 5, h: 6 }, 0.09, warm, 1.02),
      )
    box({ x: center - 16, y: front - 5, w: 32, h: 3 }, 0.025, warm, 0.97)
  } else if (kind === 'records' || kind === 'arrival') {
    for (const x of [e.x + 8, e.x + e.w - 13])
      box({ x, y: e.y + 5, w: 5, h: e.h - 10 }, 0.87, metal)
    box(e, 0.07, dark, 0.87)
    box({ x: center - 20, y: e.y + 5, w: 40, h: 23 }, 0.035, warm, 0.94)
    box({ x: center - 2, y: front - 5, w: 4, h: 5 }, 1.15, metal)
    box({ x: center - 30, y: front - 3, w: 60, h: 3 }, 0.5, dark, 1.05)
    if (kind === 'records')
      for (let i = 0; i < 3; i++)
        box(
          { x: e.x + 10 + i * 5, y: front - 10 - i * 3, w: 24, h: 10 },
          0.035,
          metal,
          0.97 + i * 0.045,
        )
    else cylinder(0.07, 0.19, center + 24, 1.04, front - 10, metal)
  } else if (kind === 'button' || kind === 'sensor') {
    box({ x: center - 7, y: e.y + 10, w: 14, h: 12 }, 1.05, metal)
    const z = north ? e.y + 4 : front - 4
    box({ x: center - 18, y: z - 5, w: 36, h: 10 }, 0.45, dark, 1.05)
    if (kind === 'sensor') {
      cylinder(0.14, 0.1, center, 1.37, north ? e.y - 3 : front + 3, metal, true)
      for (let i = 0; i < 4; i++)
        box(
          { x: center - 6 + i * 4, y: north ? e.y - 6 : front + 6, w: 1.4, h: 1 },
          0.17,
          warm,
          1.28,
        )
      box({ x: center + 11, y: z + 5, w: 4, h: 2 }, 0.055, metal, 1.3)
    } else {
      cylinder(0.085, 0.055, center, 1.3, north ? e.y : front + 1, warm, true)
      for (const x of [center - 13, center + 10])
        box({ x, y: z - 6, w: 3, h: 12 }, 0.37, metal, 1.09)
      box({ x: center - 13, y: z - 6, w: 26, h: 12 }, 0.05, metal, 1.46)
    }
  } else if (kind === 'links') {
    for (const x of [e.x + 2, e.x + e.w - 6]) box({ x, y: e.y + 3, w: 4, h: e.h - 6 }, 1.85, metal)
    for (const h of [0.3, 0.85, 1.7])
      box({ x: e.x + 2, y: e.y + 3, w: e.w - 4, h: e.h - 6 }, 0.05, dark, h)
    for (let i = 0; i < 3; i++) {
      const x = e.x + 6 + i * 25
      box({ x, y: front - 7, w: 18, h: 5 }, 0.34, metal, 1.15)
      const plug = box({ x: x + 3, y: front - 1, w: 12, h: 5 }, 0.13, warm.clone(), 1.22)
      plug.userData.connectedZ = plug.position.z
      plugs.push(plug)
      const wire = new T.Mesh(new T.TorusGeometry(0.13, 0.016, 4, 12, Math.PI), dark)
      wire.rotation.z = Math.PI
      wire.position.set((x + 9 - 480) / scale, 1.15, (front - 310) / scale)
      scene.add(wire)
      parts.push(wire)
    }
  } else if (kind === 'valve') {
    cylinder(0.085, 1.5, center, 0.8, e.y + 12, metal)
    cylinder(0.09, 0.36, center, 1.25, front - 3, metal, true)
    wheel = new T.Mesh(new T.TorusGeometry(0.23, 0.035, 6, 16), warm)
    wheel.position.set((center - 480) / scale, 1.3, (front + 1 - 310) / scale)
    scene.add(wheel)
    parts.push(wheel)
    for (let i = 0; i < 3; i++) {
      const spoke = new T.Mesh(new T.BoxGeometry(0.4, 0.025, 0.035), warm)
      spoke.rotation.z = (i * Math.PI) / 3
      wheel.add(spoke)
    }
  } else if (kind === 'bolt') {
    for (const x of [e.x + 12, e.x + e.w - 20])
      box({ x, y: front - 7, w: 8, h: 7 }, 0.38, metal, 0.88)
    bolt = box({ x: e.x + 10, y: front - 2, w: e.w - 20, h: 4 }, 0.08, warm, 1.03)
    const grip = box({ x: center + 5, y: front + 2, w: 4, h: 4 }, 0.2, dark, 0.94)
    scene.updateMatrixWorld(true)
    bolt.attach(grip)
  } else if (kind === 'gauge') {
    box({ x: center - 23, y: front - 5, w: 46, h: 5 }, 0.65, dark, 1.03)
    cylinder(0.035, 0.9, center + 28, 1.15, front - 2, warm)
    for (let i = 0; i < 5; i++)
      box({ x: center + 22, y: front, w: 12, h: 2 }, 0.018, metal, 0.75 + i * 0.16)
  } else {
    // Shallow framed notice with supports, never a floor-height solid cube.
    for (const x of [e.x + 7, e.x + e.w - 12]) box({ x, y: e.y + 6, w: 5, h: 8 }, 1.05, metal)
    box({ x: e.x, y: front - 4, w: e.w, h: 4 }, 0.85, dark, 0.9)
  }
  const boltX = bolt?.position.x ?? 0
  return {
    levers,
    plugs,
    parts,
    update: (state: { active?: boolean; open?: boolean } = {}) => {
      levers.forEach((mesh) => {
        mesh.rotation.x = state.active ? -0.35 : 0.35
      })
      if (wheel) wheel.rotation.z = state.active ? Math.PI / 2 : 0
      if (bolt) bolt.position.x = boltX + (state.open ? 0.3 : 0)
    },
  }
}

// Labels are actual facility plates; detailed instructions remain in existing UI.
export const facilityLabel = (
  scene: T.Scene,
  scale: number,
  initial: string,
  x: number,
  y: number,
  height: number,
  width: number,
  rotation = 0,
) => {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  const c = canvas.getContext('2d')!,
    texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  const mesh = new T.Mesh(
    new T.PlaneGeometry(width, 0.25),
    new T.MeshBasicMaterial({ map: texture, side: T.FrontSide }),
  )
  mesh.position.set((x - 480) / scale, height, (y - 310) / scale)
  mesh.rotation.y = rotation
  scene.add(mesh)
  let previous: string | null = null
  const text = (value: string) => {
    if (value === previous) return
    previous = value
    const lines = value.split('\n')
    canvas.height = Math.max(128, lines.length * 80)
    c.fillStyle = '#182b32'
    c.fillRect(0, 0, 768, canvas.height)
    c.strokeStyle = '#9fac9f'
    c.lineWidth = 6
    c.strokeRect(4, 4, 760, canvas.height - 8)
    c.fillStyle = '#e1dfc6'
    c.font = 'bold 50px sans-serif'
    c.textAlign = 'center'
    lines.forEach((line, i) =>
      c.fillText(line, 384, canvas.height / 2 + 18 + (i - (lines.length - 1) / 2) * 64, 710),
    )
    mesh.geometry.dispose()
    mesh.geometry = new T.PlaneGeometry(width, Math.min(0.62, (width * canvas.height) / 768))
    texture.needsUpdate = true
  }
  text(initial)
  return Object.assign(text, { mesh })
}
export const addDoorHardware = (
  scene: T.Scene,
  scale: number,
  e: Entity,
  slab: T.Mesh,
  material: T.Material,
  hatch = false,
) => {
  const parts: T.Mesh[] = []
  const part = (w: number, h: number, x: number, y: number) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, 0.06), material)
    mesh.position.set((x - 480) / scale, y, (e.y + e.h + 1 - 310) / scale)
    scene.add(mesh)
    parts.push(mesh)
    return mesh
  }
  part(0.08, 0.48, e.x + e.w * 0.7, 1.05)
  if (hatch) {
    const brace = part((e.w / scale) * 0.75, 0.065, e.x + e.w / 2, 1.5)
    brace.rotation.z = 0.25
    part((e.w / scale) * 0.75, 0.065, e.x + e.w / 2, 0.6).rotation.z = -0.25
  } else for (let i = 0; i < 3; i++) part(0.36, 0.025, e.x + e.w / 2, 1.9 + i * 0.08)
  scene.updateMatrixWorld(true)
  parts.forEach((mesh) => slab.attach(mesh))
}

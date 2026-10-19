import * as T from 'three'
import type { Rect } from './world'
type Box = (rect: Rect, height: number, material: T.Material, bottom?: number) => T.Mesh
export function addMaintenanceDetails(scene: T.Scene, box: Box) {
  const metal = new T.MeshStandardMaterial({ color: '#52636a', roughness: 0.86, metalness: 0.25 })
  const cable = new T.MeshStandardMaterial({ color: '#1d2a30', roughness: 1 })
  const trim = new T.MeshStandardMaterial({ color: '#7a898a', roughness: 0.9 })
  const warning = new T.MeshStandardMaterial({ color: '#a89357', roughness: 0.98 })
  // Shallow wall-mounted details stay outside the walkable capsule; ceiling services are overhead.
  for (const y of [72, 545]) {
    box({ x: 60, y, w: 840, h: 3 }, 0.18, metal, 0.02)
    box({ x: 60, y, w: 840, h: 2 }, 0.06, trim, 2.15)
    for (const px of [120, 360, 600, 840]) {
      box({ x: px, y, w: 3, h: 4 }, 0.32, trim, 2.6)
      for (const h of [0.35, 1.8]) box({ x: px, y: y + 1, w: 3, h: 3 }, 0.025, cable, h)
    }
  }
  // Ceiling cable tray, supply/return ducts, brackets and a caged service light.
  for (const dy of [190, 218]) box({ x: 70, y: dy, w: 820, h: 7 }, 0.09, metal, 3.04)
  box({ x: 70, y: 195, w: 820, h: 18 }, 0.025, cable, 3.03)
  for (let px = 90; px < 900; px += 70) box({ x: px, y: 186, w: 4, h: 44 }, 0.035, trim, 3.02)
  for (const px of [90, 875]) {
    box({ x: px, y: 78, w: 7, h: 455 }, 0.09, metal, 2.73)
    for (let py = 100; py < 530; py += 90) box({ x: px - 1, y: py, w: 9, h: 4 }, 0.14, trim, 2.7)
  }
  // Wall junction boxes and conduit runs; visual props are not new investigation targets.
  for (const px of [300, 650]) {
    box({ x: px, y: 72, w: 30, h: 7 }, 0.48, metal, 1.7)
    box({ x: px + 2, y: 80, w: 26, h: 1 }, 0.4, trim, 1.74)
    box({ x: px + 14, y: 72, w: 3, h: 3 }, 0.75, cable, 2.18)
    for (let j = 0; j < 4; j++) box({ x: px + 6 + j * 5, y: 82, w: 2, h: 1 }, 0.16, cable, 1.83)
  }
  for (const py of [215, 305]) {
    box({ x: 65, y: py, w: 20, h: 3 }, 0.006, warning, 0.008)
    box({ x: 872, y: py, w: 20, h: 3 }, 0.006, warning, 0.008)
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 3, 128, 128, 120)
  gradient.addColorStop(0, '#161d20aa')
  gradient.addColorStop(0.6, '#27352d66')
  gradient.addColorStop(1, '#27352d00')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#18222b88'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(50, 80)
  ctx.lineTo(110, 100)
  ctx.lineTo(130, 180)
  ctx.lineTo(185, 190)
  ctx.stroke()
  const texture = new T.CanvasTexture(canvas)
  const stain = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  })
  for (const [x, z] of [
    [-6, -2.7],
    [5.6, -3.2],
  ]) {
    const mesh = new T.Mesh(new T.PlaneGeometry(2.7, 1.6), stain)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, 0.012, z)
    scene.add(mesh)
  }
}

// Shallow marks/paper have no volume to collide with. The bag stays inside a bench footprint.
// These are scenery only: no entity IDs, target proxies, highlights or story records.
export const addAftermathDetails = (scene: T.Scene, box: Box) => {
  const fabric = new T.MeshStandardMaterial({ color: '#514d3e', roughness: 1 })
  const seam = new T.MeshStandardMaterial({ color: '#282e2b', roughness: 1 })
  box({ x: 365, y: 264, w: 29, h: 20 }, 0.28, fabric, 0.44)
  box({ x: 367, y: 279, w: 25, h: 4 }, 0.12, seam, 0.49)
  const handle = new T.Mesh(new T.TorusGeometry(0.09, 0.018, 5, 12, Math.PI), seam)
  handle.position.set((379.5 - 480) / 50, 0.72, (274 - 310) / 50)
  scene.add(handle)
  const paperCanvas = document.createElement('canvas')
  paperCanvas.width = 256
  paperCanvas.height = 192
  const p = paperCanvas.getContext('2d')!
  p.fillStyle = '#9c9b84'
  p.fillRect(0, 0, 256, 192)
  p.fillStyle = '#576357'
  p.fillRect(15, 16, 226, 25)
  for (let i = 0; i < 5; i++) p.fillRect(18, 62 + i * 20, 150 + (i % 2) * 60, 4)
  p.fillStyle = '#817d67'
  p.beginPath()
  p.moveTo(215, 192)
  p.lineTo(256, 142)
  p.lineTo(256, 192)
  p.fill()
  const paperTexture = new T.CanvasTexture(paperCanvas)
  paperTexture.colorSpace = T.SRGBColorSpace
  const paper = new T.Mesh(
    new T.PlaneGeometry(0.47, 0.34),
    new T.MeshStandardMaterial({ map: paperTexture, roughness: 1, side: T.DoubleSide }),
  )
  paper.rotation.set(-Math.PI / 2, 0, -0.3)
  paper.position.set(5.9, 0.014, 0.9)
  scene.add(paper)

  const marks = document.createElement('canvas')
  marks.width = 512
  marks.height = 256
  const m = marks.getContext('2d')!
  const dust = m.createRadialGradient(200, 128, 15, 210, 128, 220)
  dust.addColorStop(0, '#a291663d')
  dust.addColorStop(1, '#a2916600')
  m.fillStyle = dust
  m.fillRect(0, 0, 512, 256)
  m.strokeStyle = '#16232966'
  m.lineWidth = 5
  for (const offset of [0, 22]) {
    m.beginPath()
    m.moveTo(40, 160 + offset)
    m.bezierCurveTo(145, 168 + offset, 240, 85 + offset, 450, 90 + offset)
    m.stroke()
  }
  for (let i = 0; i < 65; i++) {
    m.fillStyle = i % 2 ? '#b0a17833' : '#15222844'
    m.fillRect((i * 73) % 490, (i * 41) % 245, 2 + (i % 4), 2)
  }
  const marksTexture = new T.CanvasTexture(marks)
  const dustMaterial = new T.MeshBasicMaterial({
    map: marksTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  })
  for (const [px, py, rotation] of [
    [192, 156, 0.3],
    [770, 470, -0.7],
  ]) {
    const floor = new T.Mesh(new T.PlaneGeometry(2.1, 0.95), dustMaterial)
    floor.rotation.set(-Math.PI / 2, 0, rotation)
    floor.position.set((px - 480) / 50, 0.016, (py - 310) / 50)
    scene.add(floor)
  }
  // A plaster scuff on an existing solid wall, not an opening or a new route.
  const plaster = new T.MeshStandardMaterial({ color: '#737b76', roughness: 1 })
  const exposed = new T.MeshStandardMaterial({ color: '#333e40', roughness: 1 })
  for (let i = 0; i < 6; i++) {
    box(
      { x: 252 + i * 6, y: 70, w: 8, h: 1 },
      0.09 + (i % 3) * 0.055,
      plaster,
      0.52 + (i % 2) * 0.05,
    )
    box({ x: 257 + i * 6, y: 71, w: 3, h: 0.6 }, 0.025, exposed, 0.65 + (i % 2) * 0.07)
  }
  // Soft contact shade grounds the benches without enabling expensive shadow maps.
  const shade = document.createElement('canvas')
  shade.width = 256
  shade.height = 128
  const c = shade.getContext('2d')!
  const g = c.createRadialGradient(128, 64, 5, 128, 64, 115)
  g.addColorStop(0, '#07131899')
  g.addColorStop(1, '#07131800')
  c.fillStyle = g
  c.fillRect(0, 0, 256, 128)
  const shadeMaterial = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(shade),
    transparent: true,
    depthWrite: false,
  })
  for (const px of [350, 610]) {
    const mesh = new T.Mesh(new T.PlaneGeometry(2.8, 1.2), shadeMaterial)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set((px - 480) / 50, 0.01, (271 - 310) / 50)
    scene.add(mesh)
  }
}

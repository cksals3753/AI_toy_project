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

import * as T from 'three'
import type { Entity } from './world'
import { FIRST_PERSON_SCALE as SCALE } from './firstPerson'

// Facility faces carry in-world information; interaction instructions belong to the HUD.
export const addFacilityFace = (scene: T.Scene, entity: Entity, resources: T.Texture[]) => {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 576
  const ctx = canvas.getContext('2d')!
  const map = entity.id === 'map'
  ctx.fillStyle = map ? '#b3b9a6' : '#243438'
  ctx.fillRect(0, 0, 768, 576)
  ctx.strokeStyle = map ? '#344742' : '#7a8c85'
  ctx.lineWidth = 12
  ctx.strokeRect(8, 8, 752, 560)
  ctx.fillStyle = map ? '#293b36' : '#c5d2bf'
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText(map ? 'B2 구역 안내' : '침수 감지 / FD-01', 40, 66)
  ctx.font = '22px sans-serif'
  ctx.fillText(map ? '신도림  SINDORIM · 시설 연결도' : '시설 상태 · 비상 회로', 40, 103)
  if (map) {
    ctx.fillStyle = '#91a293'
    for (const [x, y, w, h] of [
      [65, 155, 175, 105],
      [300, 175, 175, 110],
      [525, 160, 175, 105],
      [300, 375, 175, 90],
    ])
      ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#38694e'
    ctx.lineWidth = 17
    ctx.beginPath()
    ctx.moveTo(90, 320)
    ctx.lineTo(650, 320)
    ctx.moveTo(385, 320)
    ctx.lineTo(385, 425)
    ctx.stroke()
    ctx.fillStyle = '#233f35'
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText('서쪽 정비', 65, 213)
    ctx.fillText('대합실', 335, 225)
    ctx.fillText('2번 출구', 550, 213)
    ctx.fillText('정비 대기실', 311, 430)
    for (const x of [145, 385, 630]) {
      ctx.fillStyle = '#c9cebb'
      ctx.beginPath()
      ctx.arc(x, 320, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#38694e'
      ctx.lineWidth = 5
      ctx.stroke()
    }
    ctx.fillStyle = '#a65b3d'
    ctx.beginPath()
    ctx.arc(385, 424, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '22px sans-serif'
    ctx.fillText('현 위치', 420, 470)
    // Worn paper and a torn corner, without adding new story or exposing puzzle answers.
    ctx.fillStyle = '#636c61'
    ctx.beginPath()
    ctx.moveTo(685, 576)
    ctx.lineTo(768, 490)
    ctx.lineTo(768, 576)
    ctx.fill()
    ctx.strokeStyle = '#7c8675'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(278, 122)
    ctx.lineTo(296, 252)
    ctx.lineTo(276, 365)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#111f24'
    ctx.fillRect(40, 138, 688, 235)
    ctx.fillStyle = '#deac79'
    ctx.font = 'bold 53px monospace'
    ctx.fillText('02:18   1.8 m', 65, 215)
    ctx.font = 'bold 31px sans-serif'
    ctx.fillText('동쪽 2번 출구', 65, 273)
    ctx.fillStyle = '#d58c66'
    ctx.fillText('경보 기록 · 펌프 정지', 65, 330)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 0 ? '#e18d62' : '#59756a'
      ctx.beginPath()
      ctx.arc(85 + i * 220, 421, 14, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#bdc9b6'
    ctx.font = '22px sans-serif'
    ctx.fillText('경보', 115, 429)
    ctx.fillText('감지', 335, 429)
    ctx.fillText('회로', 555, 429)
    ctx.fillStyle = '#919c91'
    ctx.font = '20px sans-serif'
    ctx.fillText('FD-01   ·   SENSOR UNIT', 42, 525)
  }
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  resources.push(texture)
  const face = new T.Mesh(
    new T.PlaneGeometry((entity.w - 6) / SCALE, 1.08),
    new T.MeshBasicMaterial({ map: texture }),
  )
  face.position.set(
    (entity.x + entity.w / 2 - 480) / SCALE,
    1.13,
    (entity.y + entity.h + 1 - 310) / SCALE,
  )
  scene.add(face)
}

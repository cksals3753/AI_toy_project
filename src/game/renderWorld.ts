import type { Chapter6 } from './chapter6'
import { isChapter5Area, moonStation } from './chapter5'
import type { Chapter5 } from './chapter5'
import { drawMoonEnvironment, drawMoonObject } from './renderChapter5'
import { isChapter4Area } from './chapter4'
import type { Chapter4 } from './chapter4'
import { getWorld, finalAreaLabels } from './world'
import type { Area, Point, Rect } from './world'
import type { Chapter3 } from './chapter3'
import type { Chapter2 } from './engine'
export type Facing = 'down' | 'up' | 'left' | 'right'
export type RenderOptions = {
  area: Area
  chapter3: Chapter3
  chapter4?: Chapter4
  chapter5?: Chapter5
  chapter6?: Chapter6
  power: Chapter2['power']
  staffEvent: Chapter2['staffEvent']
  facing: Facing
  moving: boolean
  clock: number
}
let actors: HTMLImageElement | undefined, tiles: HTMLImageElement | undefined
function assets() {
  if (!actors) {
    actors = new Image()
    actors.src = '/art/survivors.svg'
  }
  if (!tiles) {
    tiles = new Image()
    tiles.src = '/art/station-atlas.svg'
  }
}
function tile(ctx: CanvasRenderingContext2D, index: number, r: Rect) {
  if (tiles?.complete && tiles.naturalWidth)
    ctx.drawImage(tiles, index * 64, 0, 64, 64, r.x, r.y, r.w, r.h)
  else {
    ctx.fillStyle = '#60735c'
    ctx.fillRect(r.x, r.y, r.w, r.h)
  }
}
function actor(
  ctx: CanvasRenderingContext2D,
  p: Point,
  row: number,
  facing: Facing,
  moving: boolean,
  clock: number,
) {
  const frame = moving ? Math.floor(clock * 9) % 4 : 0
  const direction = ['down', 'up', 'left', 'right'].indexOf(facing)
  const breath = moving ? 0 : Math.sin(clock * 2) * 0.55
  if (actors?.complete && actors.naturalWidth)
    ctx.drawImage(
      actors,
      (direction * 4 + frame) * 48,
      row * 64,
      48,
      64,
      p.x - 24,
      p.y - 46 + breath,
      48,
      64,
    )
  else {
    ctx.fillStyle = '#bdd2a0'
    ctx.fillRect(p.x - 12, p.y - 25, 24, 36)
  }
}
export function renderWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: Point,
  clues: string[],
  outcome: string | null,
  near: string | null,
  options: RenderOptions,
) {
  assets()
  const world = getWorld(options.area, options.chapter3.npc, options.chapter3.npcBoarded),
    lit =
      finalAreaLabels[options.area] || isChapter5Area(options.area)
        ? true
        : options.chapter4?.started && isChapter4Area(options.area)
          ? options.chapter4.links.power
          : options.power.includes('lights') ||
            options.area === 'electrical' ||
            options.area === 'trainA' ||
            (options.area === 'trainB' && options.chapter3.doorOpen)
  const scale = width < 640 ? 0.85 : Math.min(width / world.width, height / world.height)
  const vw = width / scale,
    vh = height / scale
  const cx =
    vw >= world.width
      ? (world.width - vw) / 2
      : Math.max(0, Math.min(world.width - vw, p.x - vw / 2))
  const cy =
    vh >= world.height
      ? (world.height - vh) / 2
      : Math.max(0, Math.min(world.height - vh, p.y - vh / 2))
  ctx.fillStyle = '#0b1412'
  ctx.fillRect(0, 0, width, height)
  ctx.save()
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)
  ctx.fillStyle = '#415547'
  ctx.fillRect(30, 45, 900, 525)
  ctx.save()
  ctx.beginPath()
  ctx.rect(54, 70, 852, 480)
  ctx.clip()
  for (let x = 54; x < 906; x += 64)
    for (let y = 70; y < 550; y += 64) tile(ctx, 0, { x, y, w: 64, h: 64 })
  ctx.restore()
  ctx.fillStyle = '#15291e'
  ctx.fillRect(30, 45, 900, 25)
  ctx.fillRect(30, 550, 900, 20)
  ctx.fillStyle = '#cfddb9'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(
    finalAreaLabels[options.area]
      ? finalAreaLabels[options.area]!
      : isChapter5Area(options.area)
        ? `${moonStation} / 가상 대피 안내`
        : options.chapter4?.started && isChapter4Area(options.area)
          ? 'B-04 / 가상 비상 운행 시스템'
          : options.area === 'hall'
            ? 'B2   대 합 실   /   CONCOURSE'
            : options.area === 'electrical'
              ? '직 원 전 용   /   EMERGENCY POWER'
              : options.area === 'stairs'
                ? '2호선 승강장   /   PLATFORM ↓'
                : '신 도 림   /   S I N D O R I M',
    480,
    62,
  )
  ctx.fillStyle = '#d8bc7555'
  ctx.fillRect(76, 482, 810, 5)
  ctx.fillRect(76, 489, 810, 2)
  if (options.area === 'stairs') {
    ctx.fillStyle = '#152a24'
    ctx.fillRect(365, 80, 230, 260)
    for (let i = 0; i < 11; i++) {
      ctx.fillStyle = i % 2 ? '#3b5144' : '#566650'
      ctx.fillRect(370, 88 + i * 22, 220, 6)
    }
    ctx.strokeStyle = '#9baa85'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(360, 90)
    ctx.lineTo(360, 335)
    ctx.moveTo(600, 90)
    ctx.lineTo(600, 335)
    ctx.stroke()
  }
  if (options.area === 'electrical') {
    ctx.strokeStyle = '#7d8d62'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(480, 130)
    ctx.lineTo(480, 95)
    ctx.lineTo(220, 95)
    ctx.lineTo(220, 170)
    ctx.moveTo(480, 95)
    ctx.lineTo(725, 95)
    ctx.lineTo(725, 170)
    ctx.stroke()
    ctx.fillStyle = '#cccd9b'
    ctx.font = '10px monospace'
    ctx.fillText('E-02 / RESERVE CIRCUIT', 480, 226)
  }
  // Emergency lamps, light pools, and visible travel markings.
  for (const x of [100, 480, 850]) {
    const glow = ctx.createRadialGradient(x, 86, 0, x, 86, lit ? 180 : 90)
    glow.addColorStop(0, lit ? '#d9e6ad28' : '#cf986c20')
    glow.addColorStop(1, '#00000000')
    ctx.fillStyle = glow
    ctx.fillRect(x - 180, 70, 360, 220)
    ctx.fillStyle = lit ? '#dbebaf' : '#c58d65'
    ctx.fillRect(x - 13, 73, 26, 3)
  }
  if (options.area === 'platform') {
    for (const train of [
      { x: 110, y: 75, w: 300, h: 80, id: 'A-17', mark: '△-1', lit: true },
      { x: 495, y: 483, w: 350, h: 65, id: 'B-04', mark: '◇-2', lit: options.chapter3.doorOpen },
    ]) {
      ctx.fillStyle = '#a3b09a'
      ctx.fillRect(train.x, train.y, train.w, train.h)
      ctx.fillStyle = train.id === 'A-17' ? '#a39162' : '#3d7b7b'
      ctx.fillRect(train.x, train.y + 44, train.w, 8)
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = train.lit ? '#e3d8a5' : '#142727'
        ctx.fillRect(train.x + 12 + i * 57, train.y + 12, 38, 26)
      }
      ctx.fillStyle = '#182c23'
      ctx.font = '12px monospace'
      ctx.fillText(`${train.id} / ${train.mark}`, train.x + train.w / 2, train.y + train.h - 7)
    }
    ctx.fillStyle = '#dfc379'
    ctx.fillRect(108, 168, 303, 4)
    ctx.fillRect(493, 471, 354, 4)
    ctx.fillStyle = options.chapter3.signal === 'green' ? '#b9ef93' : '#e48c72'
    ctx.beginPath()
    ctx.arc(863, 456, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c8dbc1'
    ctx.font = '11px monospace'
    ctx.fillText('◇-2', 863, 439)
    ctx.fillStyle = '#647e73'
    ctx.fillRect(580, 325, 95, 25)
  }
  if (options.area === 'trainA' || isChapter4Area(options.area)) {
    ctx.fillStyle = '#1c302a'
    ctx.fillRect(170, 85, 620, 75)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#728c7e'
      ctx.fillRect(185 + i * 120, 95, 100, 55)
      ctx.fillStyle = '#152922'
      ctx.fillRect(190 + i * 120, 100, 90, 45)
      if (options.chapter4?.started && !options.chapter4.arrived) {
        ctx.fillStyle = '#8d9c7955'
        const slide = (options.clock * (options.chapter4.sync === 'accepted' ? 30 : 100)) % 80
        ctx.fillRect(192 + i * 120 + slide, 103, 3, 38)
      }
    }
    ctx.fillStyle = '#c8dcb0'
    ctx.font = '13px monospace'
    ctx.fillText(
      options.area === 'trainA'
        ? 'A-17 / 운행 중지 · 대피 전원'
        : options.chapter4?.arrived
          ? `${options.chapter4.destination} — 비상 정차`
          : 'B-04 / 터널 운행 중',
      480,
      187,
    )
  }
  if (options.area === 'shelter') {
    ctx.fillStyle = '#afc8b8'
    ctx.fillRect(100, 76, 700, 30)
    ctx.fillStyle = '#dce9d7'
    ctx.font = '14px sans-serif'
    ctx.fillText('지상 대피소 · 내부 대기 공간', 480, 230)
  }
  drawMoonEnvironment(ctx, options.area, options.chapter5)
  for (const r of world.obstacles) {
    if (options.area === 'platform' && r.w >= 300) continue
    ctx.fillStyle = '#020b0788'
    ctx.fillRect(r.x + 8, r.y + 9, r.w, r.h)
    tile(ctx, r.w > 90 ? 1 : 2, r)
  }
  for (const e of world.entities.filter((e) => e.kind !== 'npc')) {
    const opened =
      (e.id === 'recovery-hatch' && options.chapter6?.boltOpen) ||
      (e.id === 'moon-maintenance' && options.chapter5?.routeOpen) ||
      (e.id === 'moon-platform-door' &&
        options.area === 'moonHolding' &&
        options.chapter5?.registration === 'cancelled') ||
      (e.id === 'train-exit' && options.chapter4?.arrived) ||
      (e.id === 'west' && (outcome === 'escaped' || outcome === 'injured')) ||
      (e.id === 'gate' && options.power.includes('gate')) ||
      e.id === 'train-a' ||
      (e.id === 'train-b' && options.chapter3.doorOpen)
    const closedStaff = e.id === 'staff' && ['success', 'failed'].includes(options.staffEvent)
    if (e.kind === 'object') {
      if (!drawMoonObject(ctx, e)) {
        const index = e.id.includes('map')
          ? 4
          : e.id.includes('cabinet')
            ? 5
            : e.id.includes('desk')
              ? 6
              : e.id === 'powerboard'
                ? 7
                : 3
        tile(ctx, index, e)
        if (e.id === 'hall-window') {
          ctx.fillStyle = '#102b32'
          ctx.fillRect(e.x + 5, e.y + 5, e.w - 10, e.h - 10)
          ctx.save()
          ctx.translate(e.x + e.w / 2, e.y + e.h / 2)
          ctx.rotate(options.clock * 2)
          ctx.strokeStyle = '#6ba9b5'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(-12, 0)
          ctx.lineTo(12, 0)
          ctx.moveTo(0, -12)
          ctx.lineTo(0, 12)
          ctx.stroke()
          ctx.restore()
        }
        if (e.id === 'panel') {
          ctx.fillStyle = '#cce29c'
          ctx.font = '12px monospace'
          ctx.fillText('02:18', e.x + e.w / 2, e.y + 24)
        }
        if (e.id === 'powerboard') {
          options.power.forEach((_, i) => {
            ctx.fillStyle = '#c9eaa3'
            ctx.fillRect(e.x + 14 + i * 35, e.y + 8, 16, 6)
          })
        }
      }
    } else if (opened) {
      ctx.fillStyle = '#182d21'
      ctx.fillRect(e.x, e.y, e.w, e.h)
      ctx.strokeStyle = '#93c985'
      ctx.lineWidth = 3
      ctx.strokeRect(e.x, e.y, e.w, e.h)
      ctx.fillStyle = '#bfec9e'
      ctx.font = '18px sans-serif'
      ctx.fillText('→', e.x + e.w / 2, e.y + e.h / 2 + 5)
    } else {
      tile(ctx, 8, e)
      ctx.fillStyle = e.id === 'sealed' || closedStaff ? '#d48c73' : e.color
      ctx.globalAlpha = 0.65 + Math.sin(options.clock * 3) * 0.2
      ctx.fillRect(e.x + 4, e.y + 4, Math.max(4, e.w - 8), 3)
      ctx.globalAlpha = 1
    }
    if (e.id === 'recovery-water' || e.id === 'recovery-valve') {
      ctx.fillStyle = options.chapter6?.drained ? '#b8d99c' : '#79aabd'
      ctx.fillRect(e.x + 8, e.y + 8, e.w - 16, 7)
      ctx.fillStyle = '#e6ead8'
      ctx.font = '10px sans-serif'
      ctx.fillText(options.chapter6?.drained ? '배수 완료' : '수위 높음', e.x + e.w / 2, e.y - 9)
    }
    if (e.id === 'recovery-bolt') {
      ctx.fillStyle = '#dbe8bd'
      ctx.font = '10px sans-serif'
      ctx.fillText(options.chapter6?.boltOpen ? '빗장 해제' : '빗장 잠김', e.x + e.w / 2, e.y - 9)
    }
    if (near === e.id) {
      ctx.strokeStyle = '#d5e7af'
      ctx.lineWidth = 1.5
      ctx.strokeRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12)
    }
    const label =
      e.id === 'train-exit' && opened
        ? '열린 문 · 역 진입 확인'
        : e.id === 'gate' && opened
          ? '개방된 개찰구'
          : e.id === 'train-b' && opened
            ? 'B-04 / ◇-2 · 문 개방'
            : e.label
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    const name = label
    const text = `${clues.includes(e.id) ? '✓ ' : ''}${name}`
    const textX = Math.max(110, Math.min(850, e.x + e.w / 2)),
      textY = e.kind === 'object' ? e.y + e.h + 17 : e.y - 14
    const measure = ctx.measureText(text).width
    ctx.fillStyle = '#0c1a13d9'
    ctx.fillRect(textX - measure / 2 - 5, textY - 11, measure + 10, 17)
    ctx.fillStyle = clues.includes(e.id) ? '#adcd93' : '#dae3c9'
    ctx.fillText(text, textX, textY)
  }
  if (options.chapter4?.doorSeen && options.area === 'trainB') {
    ctx.fillStyle = '#d3c5a1'
    ctx.font = '11px sans-serif'
    ctx.fillText('문 밖 플랫폼 · 같은 방향의 신발', 680, 500)
    for (let i = 0; i < 4; i++) {
      for (const dx of [0, 10]) {
        ctx.fillRect(600 + i * 40 + dx, 515, 7, 17)
        ctx.fillRect(600 + i * 40 + dx, 512, 7, 5)
      }
    }
  }
  const people = [
    ...world.entities
      .filter((e) => e.kind === 'npc')
      .map((e) => ({
        p: { x: e.x + e.w / 2, y: e.y + e.h / 2 },
        row: e.id === 'survivor' ? 5 : 1,
      })),
    { p, row: 0 },
  ].sort((a, b) => a.p.y - b.p.y)
  for (const person of people) {
    actor(
      ctx,
      person.p,
      person.row,
      person.row ? 'down' : options.facing,
      !person.row && options.moving,
      options.clock,
    )
    if (person.row) {
      ctx.fillStyle = '#d4c6dc'
      ctx.font = '10px sans-serif'
      ctx.fillText(person.row === 5 ? '다친 생존자' : '오반장', person.p.x, person.p.y - 51)
      if (near === (person.row === 5 ? 'survivor' : 'oh')) {
        ctx.strokeStyle = '#d5e7af'
        ctx.lineWidth = 1.5
        ctx.strokeRect(person.p.x - 21, person.p.y - 45, 42, 62)
      }
    }
  }
  ctx.fillStyle = '#d9ecc0'
  ctx.font = '9px monospace'
  ctx.fillText('YOU', p.x, p.y - 50)
  const glow = ctx.createRadialGradient(p.x, p.y, lit ? 240 : 85, p.x, p.y, 650)
  glow.addColorStop(0, '#00000000')
  glow.addColorStop(1, lit ? '#020a0433' : '#020a047f')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, world.width, world.height)
  ctx.restore()
}

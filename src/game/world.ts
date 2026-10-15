export type Point = { x: number; y: number }
export type Rect = Point & { w: number; h: number }
export type Entity = Rect & { id: string; label: string; kind: 'object' | 'npc' | 'door'; color: string }
export type Area = 'first' | 'hall' | 'electrical' | 'stairs' | 'platform' | 'trainA' | 'trainB'
export const room = {
  width: 960, height: 600, spawn: { x: 480, y: 460 }, radius: 13, speed: 165,
  obstacles: [
    { x: 290, y: 250, w: 120, h: 42 }, { x: 550, y: 250, w: 120, h: 42 },
    { x: 280, y: 390, w: 42, h: 48 }, { x: 640, y: 390, w: 42, h: 48 },
  ] satisfies Rect[],
  entities: [
    { id: 'panel', label: '침수 감지 패널', kind: 'object', x: 740, y: 78, w: 70, h: 38, color: '#ac765e' },
    { id: 'map', label: '찢어진 안내도', kind: 'object', x: 442, y: 78, w: 80, h: 38, color: '#b4bf93' },
    { id: 'cabinet', label: '비상 물품함', kind: 'object', x: 150, y: 78, w: 70, h: 38, color: '#99ad94' },
    { id: 'oh', label: '오반장', kind: 'npc', x: 205, y: 330, w: 30, h: 30, color: '#b09ab2' },
    { id: 'west', label: '서쪽 정비문', kind: 'door', x: 30, y: 220, w: 24, h: 90, color: '#a9bd83' },
    { id: 'east', label: '동쪽 2번 출구', kind: 'door', x: 906, y: 220, w: 24, h: 90, color: '#b78b76' },
  ] satisfies Entity[],
}
export type World = typeof room
export const hall: World = {
  ...room, spawn: { x: 470, y: 460 },
  obstacles: [
    { x: 310, y: 260, w: 115, h: 42 }, { x: 550, y: 260, w: 115, h: 42 },
    { x: 330, y: 410, w: 36, h: 45 }, { x: 640, y: 410, w: 36, h: 45 },
  ],
  entities: [
    { id: 'hall-map', label: '역 안내도', kind: 'object', x: 440, y: 78, w: 80, h: 38, color: '#bccd98' },
    { id: 'hall-window', label: '통로 점검창', kind: 'object', x: 112, y: 120, w: 75, h: 40, color: '#89c5d7' },
    { id: 'hall-desk', label: '안내 데스크', kind: 'object', x: 580, y: 115, w: 120, h: 48, color: '#b9aa8a' },
    { id: 'hall-gate-note', label: '비상 개방 안내문', kind: 'object', x: 790, y: 150, w: 48, h: 40, color: '#d6cd98' },
    { id: 'staff', label: '직원 전용 통로', kind: 'door', x: 30, y: 240, w: 24, h: 90, color: '#8bbed4' },
    { id: 'gate', label: '잠긴 개찰구', kind: 'door', x: 856, y: 255, w: 48, h: 95, color: '#c3a980' },
    { id: 'electrical', label: '전기실', kind: 'door', x: 170, y: 526, w: 90, h: 24, color: '#becb94' },
    { id: 'sealed', label: '내려온 차단문', kind: 'door', x: 435, y: 526, w: 90, h: 24, color: '#b7836c' },
    { id: 'oh', label: '오반장', kind: 'npc', x: 730, y: 220, w: 30, h: 30, color: '#b09ab2' },
  ],
}
export const electrical: World = {
  ...room, spawn: { x: 480, y: 455 },
  obstacles: [{ x: 180, y: 165, w: 85, h: 120 }, { x: 680, y: 165, w: 85, h: 120 }],
  entities: [
    { id: 'powerboard', label: '예비 전원 배전반', kind: 'object', x: 390, y: 130, w: 180, h: 55, color: '#bccea0' },
    { id: 'hall-return', label: '대합실로', kind: 'door', x: 435, y: 526, w: 90, h: 24, color: '#adc895' },
  ],
}
export const stairs: World = {
  ...room, spawn: { x: 480, y: 440 },
  obstacles: [{ x: 240, y: 130, w: 110, h: 190 }, { x: 610, y: 130, w: 110, h: 190 }],
  entities: [{ id: 'next-chapter', label: '승강장 계단 · CHAPTER 03', kind: 'door', x: 410, y: 90, w: 140, h: 65, color: '#c3d6a7' }],
}
export const platform: World = {
  ...room, spawn: { x: 450, y: 240 },
  obstacles: [
    { x: 110, y: 75, w: 300, h: 80 }, { x: 495, y: 483, w: 350, h: 65 },
    { x: 250, y: 300, w: 34, h: 50 }, { x: 440, y: 315, w: 115, h: 38 },
    { x: 630, y: 210, w: 34, h: 48 },
  ],
  entities: [
    { id: 'train-a', label: 'A-17 / △-1 · 문 열림', kind: 'door', x: 195, y: 115, w: 95, h: 38, color: '#d8bd80' },
    { id: 'train-b', label: 'B-04 / ◇-2 · 문 닫힘', kind: 'door', x: 600, y: 486, w: 95, h: 38, color: '#84b7be' },
    { id: 'platform-record', label: '역무원 비상 부스', kind: 'object', x: 760, y: 155, w: 95, h: 48, color: '#bfcaa0' },
    { id: 'approval', label: '비상 운행 승인 장치', kind: 'object', x: 760, y: 265, w: 95, h: 40, color: '#bacb9a' },
    { id: 'platform-signal', label: '안전 난간 · 선로 표식', kind: 'object', x: 105, y: 425, w: 70, h: 35, color: '#b9cdab' },
    { id: 'call-b', label: 'B-04 비상 호출', kind: 'object', x: 775, y: 420, w: 45, h: 32, color: '#8bbcc2' },
    { id: 'front-b', label: 'B-04 선두 · 출발 확인', kind: 'door', x: 565, y: 400, w: 110, h: 35, color: '#a8d09c' },
    { id: 'survivor', label: '기둥 뒤의 사람', kind: 'npc', x: 200, y: 340, w: 30, h: 30, color: '#ba947b' },
    { id: 'platform-stairs', label: '승강장 진입 계단', kind: 'door', x: 70, y: 220, w: 40, h: 65, color: '#bcc7a3' },
  ],
}
export const trainA: World = {
  ...room, spawn: { x: 480, y: 450 },
  obstacles: [{ x: 170, y: 210, w: 140, h: 40 }, { x: 650, y: 210, w: 140, h: 40 }],
  entities: [
    { id: 'train-a-stop', label: 'A-17 선두 차량 · 운행 중지', kind: 'object', x: 420, y: 95, w: 120, h: 50, color: '#dbbb87' },
    { id: 'exit-a', label: '승강장으로 돌아가기', kind: 'door', x: 430, y: 522, w: 100, h: 28, color: '#b6cf96' },
  ],
}
export const trainB: World = { ...trainA, spawn: { x: 450, y: 420 }, entities: [{ id: 'train-window', label: '창밖 · 다음 역 미확인', kind: 'object', x: 410, y: 100, w: 140, h: 48, color: '#a6c9bb' }] }
export const worlds: Record<Area, World> = { first: room, hall, electrical, stairs, platform, trainA, trainB }
export function getWorld(area: Area, npc = 'unseen', npcBoarded = false): World {
  if (area === 'platform') return { ...platform, entities: platform.entities.map(e => e.id === 'survivor' && ['helped', 'invited', 'waiting'].includes(npc) ? { ...e, x: 610, y: 315, label: '다친 생존자 · 대기 의자' } : e) }
  if (area === 'trainB' && npcBoarded) return { ...trainB, entities: [...trainB.entities, { id: 'survivor', label: '함께 탄 생존자', kind: 'npc', x: 600, y: 330, w: 30, h: 30, color: '#ba947b' }] }
  return worlds[area]
}
export function overlaps(p: Point, rect: Rect, radius = room.radius) {
  return p.x + radius > rect.x && p.x - radius < rect.x + rect.w && p.y + radius > rect.y && p.y - radius < rect.y + rect.h
}
export function walkable(p: Point, world: World = room) {
  return p.x >= 54 + room.radius && p.x <= 906 - room.radius && p.y >= 70 + room.radius && p.y <= 550 - room.radius && ![...world.obstacles, ...world.entities].some(rect => overlaps(p, rect))
}
// Resolve axes separately for sliding; substeps prevent tunnelling after slow frames.
export function movePlayer(position: Point, direction: Point, seconds: number, world: World = room): Point {
  const magnitude = Math.hypot(direction.x, direction.y)
  if (!magnitude) return position
  const dt = Math.min(Math.max(seconds, 0), .1)
  const distance = room.speed * dt
  const steps = Math.max(1, Math.ceil(distance / 5))
  const dx = direction.x / Math.max(1, magnitude) * distance / steps
  const dy = direction.y / Math.max(1, magnitude) * distance / steps
  let p = { ...position }
  for (let i = 0; i < steps; i++) {
    if (walkable({ x: p.x + dx, y: p.y }, world)) p = { ...p, x: p.x + dx }
    if (walkable({ x: p.x, y: p.y + dy }, world)) p = { ...p, y: p.y + dy }
  }
  return p
}
export function nearestEntity(p: Point, world: World = room): Entity | null {
  const candidates = world.entities.map(entity => ({ entity, distance: Math.hypot(p.x - Math.max(entity.x, Math.min(p.x, entity.x + entity.w)), p.y - Math.max(entity.y, Math.min(p.y, entity.y + entity.h))) })).filter(candidate => candidate.distance < 60).sort((a, b) => a.distance - b.distance)
  return candidates[0]?.entity ?? null
}

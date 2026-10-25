import { hall, walkable } from './world'
import type { Point, Rect, World } from './world'

export type ThreatSave = {
  checkpoint: 'entry' | 'electrical'
  revision: number
  gateHeard: boolean
  caught: boolean
  roomBeat: number
  alert: boolean
}
export const defaultThreat: ThreatSave = {
  checkpoint: 'entry',
  revision: 0,
  gateHeard: false,
  caught: false,
  roomBeat: 0,
  alert: false,
}
export type ThreatMode = 'patrol' | 'suspect' | 'chase' | 'search' | 'return'
export type ThreatRuntime = {
  position: Point
  heading: number
  mode: ThreatMode
  awareness: number
  contact: number
  remaining: number
  lastSeen: Point
  route: Point[]
  replanning: number
  patrol: number
  clock: number
  gateHeard: boolean
  caught: boolean
}
export const threatRules = {
  patrolSpeed: 65,
  chaseSpeed: 115,
  range: 230,
  halfAngle: Math.PI / 3,
  noticeSeconds: 1.1,
  catchSeconds: 0.8,
  catchDistance: 28,
  searchSeconds: 3.5,
}
export const exitMarkers: Rect[] = [{ x: 70, y: 440, w: 240, h: 95 }]
export const checkpointPoint = (checkpoint: ThreatSave['checkpoint']): Point =>
  checkpoint === 'electrical' ? { x: 480, y: 455 } : { x: 470, y: 480 }
export const patrolPoints: Point[] = [
  { x: 470, y: 190 },
  { x: 820, y: 230 },
  { x: 470, y: 230 },
  { x: 210, y: 210 },
]
export const createThreat = (): ThreatRuntime => ({
  position: { ...patrolPoints[0] },
  heading: -Math.PI / 2,
  mode: 'patrol',
  awareness: 0,
  contact: 0,
  remaining: 0,
  lastSeen: { ...patrolPoints[0] },
  route: [],
  replanning: 0,
  patrol: 1,
  clock: 0,
  gateHeard: false,
  caught: false,
})
export const threatWalkable = (p: Point, w: World = hall) => walkable(p, w)
const clearSegment = (a: Point, b: Point, valid: (p: Point) => boolean) => {
  const n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 5))
  for (let i = 0; i <= n; i++)
    if (!valid({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n })) return false
  return true
}
const segmentHitsRect = (a: Point, b: Point, r: Rect) => {
  let enter = 0,
    exit = 1
  for (const axis of ['x', 'y'] as const) {
    const delta = b[axis] - a[axis],
      min = r[axis],
      max = min + (axis === 'x' ? r.w : r.h)
    if (Math.abs(delta) < 1e-9) {
      if (a[axis] < min || a[axis] > max) return false
    } else {
      const t1 = (min - a[axis]) / delta,
        t2 = (max - a[axis]) / delta
      enter = Math.max(enter, Math.min(t1, t2))
      exit = Math.min(exit, Math.max(t1, t2))
      if (enter > exit) return false
    }
  }
  return true
}
export const sightClear = (a: Point, b: Point, w: World = hall) => {
  const blockers = [
    ...w.obstacles.filter(
      (r) =>
        !w.waterZones?.some((z) => z.x === r.x && z.y === r.y && z.w === r.w && z.h === r.h) &&
        !hall.obstacles
          .slice(0, 2)
          .some(
            (bench) => r.x === bench.x && r.y === bench.y && r.w === bench.w && r.h === bench.h,
          ),
    ),
    ...w.entities.filter(
      (e) => (e.kind === 'door' && !('passable' in e && e.passable)) || e.id === 'hall-desk',
    ),
  ]
  return !blockers.some((r) => segmentHitsRect(a, b, r))
}
export const canSee = (enemy: ThreatRuntime, player: Point, w: World = hall) => {
  if (Math.hypot(player.x - enemy.position.x, player.y - enemy.position.y) > threatRules.range)
    return false
  if (Math.hypot(player.x - enemy.position.x, player.y - enemy.position.y) < 1)
    return sightClear(enemy.position, player, w)
  const angle = Math.atan2(player.y - enemy.position.y, player.x - enemy.position.x) - enemy.heading
  return (
    Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) <= threatRules.halfAngle &&
    sightClear(enemy.position, player, w)
  )
}
// Small 20-unit grid, built from the same expanded collision rectangles as actor movement.
export const threatPath = (start: Point, goal: Point, w: World = hall): Point[] => {
  if (clearSegment(start, goal, (p) => threatWalkable(p, w))) return [{ ...goal }]
  const nodes: Point[] = []
  for (let y = 90; y <= 530; y += 20)
    for (let x = 70; x <= 890; x += 20) if (threatWalkable({ x, y }, w)) nodes.push({ x, y })
  const nearest = (p: Point) =>
    [...nodes]
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
      .find((n) => clearSegment(p, n, (q) => threatWalkable(q, w)))
  const a = nearest(start),
    b =
      nearest(goal) ??
      nodes.sort(
        (a, b) => Math.hypot(a.x - goal.x, a.y - goal.y) - Math.hypot(b.x - goal.x, b.y - goal.y),
      )[0]
  if (!a || !b) return []
  const key = (p: Point) => `${p.x},${p.y}`,
    byKey = new Map(nodes.map((n) => [key(n), n])),
    parents = new Map<string, string>(),
    queue = [a],
    seen = new Set([key(a)])
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]
    if (key(p) === key(b)) break
    for (const d of [
      { x: 20, y: 0 },
      { x: -20, y: 0 },
      { x: 0, y: 20 },
      { x: 0, y: -20 },
    ]) {
      const n = byKey.get(key({ x: p.x + d.x, y: p.y + d.y }))
      if (n && !seen.has(key(n)) && clearSegment(p, n, (q) => threatWalkable(q, w))) {
        seen.add(key(n))
        parents.set(key(n), key(p))
        queue.push(n)
      }
    }
  }
  if (!seen.has(key(b))) return []
  const result = [b]
  let cursor = key(b)
  while (parents.has(cursor)) {
    cursor = parents.get(cursor)!
    result.unshift(byKey.get(cursor)!)
  }
  return result
}
export const stepThreat = (
  r: ThreatRuntime,
  player: Point,
  seconds: number,
  w: World = hall,
  gateHeard = false,
  speed = 1,
): ThreatRuntime => {
  const dt = Math.min(0.05, Math.max(0, seconds))
  if (!dt || r.caught) return r
  const n = {
    ...r,
    position: { ...r.position },
    route: [...r.route],
    clock: r.clock + dt,
    replanning: r.replanning - dt,
  }
  if (gateHeard && !n.gateHeard) {
    n.gateHeard = true
    n.mode = 'search'
    n.lastSeen = { x: 815, y: 300 }
    n.remaining = threatRules.searchSeconds
    n.route = []
    n.replanning = 0
  }
  const visible = canSee(n, player, w)
  if (visible) {
    n.lastSeen = { ...player }
    if (n.mode !== 'chase') {
      n.mode = 'suspect'
      n.awareness += dt
      if (n.awareness >= threatRules.noticeSeconds) {
        n.mode = 'chase'
        n.replanning = 0
      }
    }
  } else if (n.mode === 'suspect') {
    n.mode = 'search'
    n.remaining = threatRules.searchSeconds
    n.awareness = 0
    n.replanning = 0
  } else if (n.mode === 'chase') {
    n.mode = 'search'
    n.remaining = threatRules.searchSeconds
    n.awareness = 0
    n.replanning = 0
  }
  const close =
    n.mode === 'chase' &&
    visible &&
    sightClear(n.position, player, w) &&
    Math.hypot(n.position.x - player.x, n.position.y - player.y) < threatRules.catchDistance
  n.contact = close ? n.contact + dt : 0
  if (n.contact >= threatRules.catchSeconds) {
    n.caught = true
    return n
  }
  const goal =
    n.mode === 'chase' || n.mode === 'search' || n.mode === 'suspect'
      ? n.lastSeen
      : threatWalkable(patrolPoints[n.patrol], w)
        ? patrolPoints[n.patrol]
        : { x: 820, y: 230 }
  if (n.mode === 'suspect') {
    n.heading = Math.atan2(goal.y - n.position.y, goal.x - n.position.x)
    return n
  }
  if (
    Math.hypot(n.position.x - goal.x, n.position.y - goal.y) < 12 ||
    (n.mode === 'search' && !n.route.length && n.replanning > 0)
  ) {
    if (n.mode === 'search') {
      n.remaining -= dt
      n.heading += dt * 0.9
      if (n.remaining <= 0) {
        n.mode = 'return'
        n.route = []
        n.replanning = 0
      }
    } else if (n.mode === 'patrol' || n.mode === 'return') {
      n.mode = 'patrol'
      n.patrol = (n.patrol + 1) % patrolPoints.length
      n.route = []
      n.replanning = 0
    }
    return n
  }
  if (n.replanning <= 0) {
    n.route = threatPath(n.position, goal, w)
    n.replanning = 0.6
  }
  let next = n.route[0]
  while (next && Math.hypot(next.x - n.position.x, next.y - n.position.y) < 3) {
    n.route.shift()
    next = n.route[0]
  }
  if (next) {
    const distance = Math.hypot(next.x - n.position.x, next.y - n.position.y),
      step = Math.min(
        distance,
        (n.mode === 'chase' ? threatRules.chaseSpeed : threatRules.patrolSpeed) *
          dt *
          Math.max(0.6, Math.min(1, speed)),
      )
    n.heading = Math.atan2(next.y - n.position.y, next.x - n.position.x)
    const substeps = Math.max(1, Math.ceil(step / 5))
    const before = { ...n.position }
    for (let i = 0; i < substeps; i++) {
      const x = { x: n.position.x + (Math.cos(n.heading) * step) / substeps, y: n.position.y }
      if (threatWalkable(x, w)) n.position = x
      const y = { x: n.position.x, y: n.position.y + (Math.sin(n.heading) * step) / substeps }
      if (threatWalkable(y, w)) n.position = y
    }
    if (Math.hypot(n.position.x - before.x, n.position.y - before.y) < 0.01) n.replanning = 0
  }
  return n
}

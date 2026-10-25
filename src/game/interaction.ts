import { facilityProfiles } from './facilityProfiles'
import type { Entity, Point, Rect } from './world'
// World units, measured horizontally from the visible working surface.
// Unlisted chapters/targets retain the existing 60-unit reach.
export const interactionReach = (id: string) =>
  ({
    'hall-map': 125,
    'hall-window': 100,
    'hall-gate-note': 110,
    'hall-desk': 85,
    powerboard: 135,
    'hall-shutter': 75,
  })[id] ??
  facilityProfiles[id]?.reach ??
  60
export const interactionSurface = (e: Pick<Entity, 'id' | 'x' | 'y' | 'w' | 'h'>): Rect => {
  if (e.id === 'hall-shutter') return { ...e, y: 425, h: 5 }
  if (e.id === 'hall-map') return { ...e, y: 84, h: 2 }
  if (e.id === 'hall-window') return { ...e, y: 157, h: 3 }
  if (e.id === 'hall-gate-note') return { ...e, y: 187, h: 3 }
  if (e.id === 'powerboard') return { ...e, y: 181, h: 4 }
  if (e.id === 'train-phone') return { ...e, x: e.x + 17, y: e.y + 3, w: 19, h: 28 }
  if (facilityProfiles[e.id])
    return { ...e, y: facilityProfiles[e.id].north ? e.y : e.y + e.h - 2, h: 2 }
  return e
}
export const surfaceDistance = (p: Point, e: Pick<Entity, 'id' | 'x' | 'y' | 'w' | 'h'>) => {
  const r = interactionSurface(e)
  return Math.hypot(
    p.x - Math.max(r.x, Math.min(p.x, r.x + r.w)),
    p.y - Math.max(r.y, Math.min(p.y, r.y + r.h)),
  )
}

export const interactionBounds = (id: string, fallbackTop: number) => {
  const p = facilityProfiles[id]
  return p ? { bottom: p.bottom, height: p.top - p.bottom } : { bottom: 0, height: fallbackTop }
}
export const interactionAim = (id: string) => facilityProfiles[id]?.aim ?? 1.5

// A cabinet's back is not its operating face, in either renderer.
export const workingFaceVisible = (p: Point, e: Entity) => {
  const profile = facilityProfiles[e.id]
  if (!profile || e.id === 'train-phone') return true
  return profile.north ? p.y <= e.y : p.y >= e.y + e.h
}

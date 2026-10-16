import type { Point } from './world'

export const FIRST_PERSON_SCALE = 50
export const firstRoomAssets = {
  bench: '/art/kenney-furniture/bench.glb',
  cabinet: '/art/kenney-furniture/bookcaseClosedDoors.glb',
  door: '/art/kenney-furniture/doorwayFront.glb',
  characters: {
    oh: { sprite: '/art/survivors.svg', row: 1, portrait: '' },
  },
}

// Camera rotation is presentation only. The authoritative position remains world.ts coordinates.
export function firstPersonDirection(stick: Point, yaw: number): Point {
  return {
    x: Math.cos(yaw) * stick.x + Math.sin(yaw) * stick.y,
    y: -Math.sin(yaw) * stick.x + Math.cos(yaw) * stick.y,
  }
}
export function clampPitch(pitch: number) {
  return Math.max(-1.1, Math.min(1.1, pitch))
}

import type { Point } from './world'

export const FIRST_PERSON_SCALE = 50
export const firstRoomAssets = {
  bench: '/art/kenney-furniture/bench.glb',
  cabinet: '/art/kenney-furniture/bookcaseClosedDoors.glb',
  door: '/art/kenney-furniture/doorwayFront.glb',
  characters: {
    survivor: {
      model: '/art/kenney-characters/characterMedium.fbx',
      idle: '/art/kenney-characters/idle.fbx',
      skin: '/art/kenney-characters/survivor-skin.svg',
      portrait: '',
    },
    oh: {
      model: '/art/kenney-characters/characterMedium.fbx',
      idle: '/art/kenney-characters/idle.fbx',
      skin: '/art/kenney-characters/oh-skin.svg',
      portrait: '',
    },
  },
}

// Camera rotation is presentation only. The authoritative position remains world.ts coordinates.
export const firstPersonDirection = (stick: Point, yaw: number): Point => {
  return {
    x: Math.cos(yaw) * stick.x + Math.sin(yaw) * stick.y,
    y: -Math.sin(yaw) * stick.x + Math.cos(yaw) * stick.y,
  }
}
export const clampPitch = (pitch: number) => {
  return Math.max(-1.1, Math.min(1.1, pitch))
}

export const immersiveAreas = [
  'first',
  'hall',
  'electrical',
  'stairs',
  'platform',
  'trainA',
  'trainB',
  'trainRear',
  'trainFront',
  'moonPlatform',
  'moonBooth',
  'moonHolding',
  'maintenance',
  'recovery',
  'shelter',
] as const
export type ImmersiveArea = (typeof immersiveAreas)[number]
export type View3d = {
  version: 1
  area: ImmersiveArea
  position: { x: number; z: number }
  yaw: number
  pitch: number
}
export const isImmersiveArea = (area: string): area is ImmersiveArea =>
  immersiveAreas.includes(area as ImmersiveArea)
export const sceneScale = (area: string) => (area === 'hall' ? 40 : area === 'stairs' ? 45 : 50)
export const toScenePosition = (p: Point, area: string) => ({
  x: (p.x - 480) / sceneScale(area),
  z: (p.y - 310) / sceneScale(area),
})
export const toWorldPosition = (p: { x: number; z: number }, area: string): Point => ({
  x: p.x * sceneScale(area) + 480,
  y: p.z * sceneScale(area) + 310,
})

export const usesFirstPerson = (area: string) => isImmersiveArea(area)

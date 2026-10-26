import type { Chapter7 } from './chapter7'
import type { HallEnvironment } from './hallEnvironment'
import { clampPitch, isImmersiveArea, toWorldPosition, toScenePosition } from './firstPerson'
import type { View3d } from './firstPerson'
import { getWorld, walkable } from './world'
import type { Chapter6 } from './chapter6'
import type { Chapter5 } from './chapter5'
import type { Chapter4 } from './chapter4'
import type { Chapter3 } from './chapter3'
import type { Area } from './world'

export const normalizeView3d = (
  value: unknown,
  area: Area,
  power: readonly string[],
  chapter3?: Pick<Chapter3, 'npc' | 'npcBoarded' | 'doorOpen'>,
  chapter4?: Pick<Chapter4, 'started' | 'arrived'>,
  chapter5?: Pick<Chapter5, 'routeOpen' | 'registration'>,
  chapter6?: Pick<Chapter6, 'settings' | 'route' | 'drained' | 'boltOpen'>,
  environment?: HallEnvironment,
  chapter7?: Chapter7,
): View3d | null => {
  const v = value as View3d | null
  if (
    !v ||
    v.version !== 1 ||
    v.area !== area ||
    !isImmersiveArea(area) ||
    !v.position ||
    !Number.isFinite(v.position.x) ||
    !Number.isFinite(v.position.z) ||
    !Number.isFinite(v.yaw) ||
    !Number.isFinite(v.pitch) ||
    !walkable(
      toWorldPosition(v.position, area),
      getWorld(
        area,
        chapter3?.npc,
        chapter3?.npcBoarded,
        power,
        chapter3?.doorOpen,
        chapter4,
        chapter5,
        chapter6,
        environment,
        chapter7,
      ),
    )
  )
    return null
  return {
    version: 1,
    area,
    position: { ...v.position },
    yaw: ((((v.yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI,
    pitch: clampPitch(v.pitch),
  }
}
export const makeView3d = (
  area: View3d['area'],
  position: { x: number; y: number },
  yaw = 0,
  pitch = 0,
): View3d => ({ version: 1, area, position: toScenePosition(position, area), yaw, pitch })

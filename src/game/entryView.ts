import type { State } from './engine'
import { getWorld, walkable } from './world'
import { isImmersiveArea } from './firstPerson'
import { makeView3d } from './view3d'

// Door transitions use the receiving doorway, never a per-room last position.
// Save loading remains normalizeView3d's responsibility and does not run here.
export const applyEntryView = (previous: State, next: State): State => {
  if (
    next.stage === 'intro' ||
    previous.area === next.area ||
    !previous.view3d ||
    !isImmersiveArea(next.area)
  )
    return next
  const world = getWorld(
    next.area,
    next.chapter3.npc,
    next.chapter3.npcBoarded,
    next.chapter2.power,
    next.chapter3.doorOpen,
    next.chapter4,
    next.chapter5,
    next.chapter6,
    next.chapter2,
    next.chapter7,
  )
  const receivingDoor: Record<string, string> = {
    'electrical:hall': 'electrical',
    'hall:electrical': 'hall-return',
    'trainA:platform': 'train-a',
    'platform:trainA': 'exit-a',
    'trainRear:trainB': 'train-rear-door',
    'trainFront:trainB': 'train-front-door',
    'trainB:trainRear': 'train-central-door',
    'trainB:trainFront': 'train-central-door',
    'moonBooth:moonPlatform': 'moon-booth-door',
    'moonHolding:moonPlatform': 'moon-holding-door',
    'moonPlatform:moonBooth': 'moon-platform-door',
    'moonPlatform:moonHolding': 'moon-platform-door',
  }
  const door = world.entities.find((e) => e.id === receivingDoor[`${previous.area}:${next.area}`])
  let position = next.position,
    yaw = next.area === 'platform' ? -1.45 : 0
  if (door) {
    const center = { x: door.x + door.w / 2, y: door.y + door.h / 2 }
    // Doors at a side wall open inward horizontally; top/bottom doors vertically.
    const direction =
      center.x < 170
        ? { x: 1, y: 0 }
        : center.x > 780
          ? { x: -1, y: 0 }
          : center.y < 200
            ? { x: 0, y: 1 }
            : { x: 0, y: -1 }
    const distance = (direction.x ? door.w : door.h) / 2 + 48
    const candidate = { x: center.x + direction.x * distance, y: center.y + direction.y * distance }
    if (walkable(candidate, world)) position = candidate
    yaw = Math.atan2(-direction.x, -direction.y)
  }
  if (!walkable(position, world)) position = world.spawn
  // The side hatch in the shelter faces into the room from the west wall.
  if (next.area === 'shelter' && next.chapter6.route === 'automatic') yaw = -Math.PI / 2
  return { ...next, position, view3d: makeView3d(next.area, position, yaw) }
}

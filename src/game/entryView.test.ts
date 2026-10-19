import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './engine'
import { applyEntryView } from './entryView'
import { makeView3d, normalizeView3d } from './view3d'
import { getWorld, walkable } from './world'
import type { Area } from './world'

describe('door entry versus saved view', () => {
  it('keeps a new game reset free of entry state from the previous room', () => {
    const s = {
      ...initialState,
      stage: 'explore' as const,
      area: 'hall' as const,
      view3d: makeView3d('hall', { x: 470, y: 460 }, 1),
    }
    expect(reducer(s, { type: 'reset' })).toEqual(initialState)
  })
  it.each([
    ['electrical', 'hall', 215, 478, 0],
    ['hall', 'electrical', 480, 478, 0],
    ['platform', 'trainA', 480, 474, 0],
    ['trainB', 'trainRear', 470, 462, 0],
    ['trainB', 'trainFront', 470, 462, 0],
    ['moonPlatform', 'moonBooth', 470, 462, 0],
    ['moonPlatform', 'moonHolding', 470, 462, 0],
    ['moonHolding', 'moonPlatform', 752, 117.5, Math.PI / 2],
    ['moonBooth', 'moonPlatform', 752, 427.5, Math.PI / 2],
    ['trainRear', 'trainB', 752, 397.5, Math.PI / 2],
    ['trainFront', 'trainB', 213, 397.5, -Math.PI / 2],
    ['trainA', 'platform', 242.5, 201, Math.PI],
  ] as const)('places %s → %s at the receiving doorway facing inward', (from, to, x, y, yaw) => {
    const previous = {
      ...initialState,
      stage: 'explore' as const,
      area: from,
      view3d: makeView3d(from, { x: 450, y: 420 }, 2),
    }
    const next = applyEntryView(previous, { ...previous, area: to, position: { x: 450, y: 420 } })
    expect(next.position).toEqual({ x, y })
    expect(Math.abs(Math.sin(next.view3d!.yaw) - Math.sin(yaw))).toBeLessThan(0.001)
    expect(Math.abs(Math.cos(next.view3d!.yaw) - Math.cos(yaw))).toBeLessThan(0.001)
    expect(walkable(next.position, getWorld(to))).toBe(true)
    expect(normalizeView3d(next.view3d, to, [])).not.toBeNull()
  })
  it('preserves same-area menu/save angles and leaves legacy load policy separate', () => {
    const s = { ...initialState, view3d: makeView3d('first', { x: 480, y: 460 }, 1.2, -0.3) }
    expect(applyEntryView(s, s)).toBe(s)
    expect(reducer(s, { type: 'read', target: 'messages' }).view3d).toEqual(s.view3d)
    const legacy = { ...s, view3d: null }
    const to = { ...legacy, area: 'hall' as Area }
    expect(applyEntryView(legacy, to)).toBe(to)
  })
})

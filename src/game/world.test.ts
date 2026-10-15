import { describe, expect, it } from 'vitest'
import { movePlayer, nearestEntity, room, walkable } from './world'
import { initialState, reducer } from './engine'

describe('top-down exploration', () => {
  it('moves consistently and normalizes diagonal input', () => {
    const start = room.spawn
    const straight = movePlayer(start, { x: 1, y: 0 }, 0.1)
    const diagonal = movePlayer(start, { x: 1, y: 1 }, 0.1)
    expect(Math.hypot(straight.x - start.x, straight.y - start.y)).toBeCloseTo(16.5)
    expect(Math.hypot(diagonal.x - start.x, diagonal.y - start.y)).toBeCloseTo(16.5)
    expect(movePlayer(start, { x: 0, y: 0 }, 0.1)).toBe(start)
  })
  it('stops at walls even after a long frame', () => {
    let p = { x: 80, y: 160 }
    for (let i = 0; i < 100; i++) p = movePlayer(p, { x: -1, y: -1 }, 5)
    expect(walkable(p)).toBe(true)
    expect(p.x).toBeGreaterThanOrEqual(67)
    expect(p.y).toBeGreaterThanOrEqual(83)
  })
  it('blocks benches and slides along them', () => {
    let p = { x: 275, y: 230 }
    for (let i = 0; i < 8; i++) p = movePlayer(p, { x: 1, y: 1 }, 0.05)
    expect(p.x).toBeGreaterThan(300)
    expect(p.y).toBeLessThanOrEqual(237)
    expect(walkable(p)).toBe(true)
  })
  it('only offers nearby objects', () => {
    expect(nearestEntity(room.spawn)).toBeNull()
    expect(nearestEntity({ x: 480, y: 150 })?.id).toBe('map')
    expect(nearestEntity({ x: 250, y: 350 })?.id).toBe('oh')
  })
  it('has a traversable route from spawn to every interaction', () => {
    const queue = [room.spawn],
      seen = new Set<string>(),
      reached = new Set<string>()
    while (queue.length) {
      const p = queue.shift()!,
        key = `${p.x},${p.y}`
      if (seen.has(key)) continue
      seen.add(key)
      const entity = nearestEntity(p)
      if (entity) reached.add(entity.id)
      for (const d of [
        { x: 10, y: 0 },
        { x: -10, y: 0 },
        { x: 0, y: 10 },
        { x: 0, y: -10 },
      ]) {
        const next = { x: p.x + d.x, y: p.y + d.y }
        if (walkable(next) && !seen.has(`${next.x},${next.y}`)) queue.push(next)
      }
    }
    expect([...reached].sort()).toEqual(room.entities.map((e) => e.id).sort())
  })
  it('keeps only valid saved positions', () => {
    expect(reducer(initialState, { type: 'position', position: { x: 0, y: 0 } })).toBe(initialState)
    const position = { x: 480, y: 400 }
    expect(reducer(initialState, { type: 'position', position }).position).toEqual(position)
  })
})

import { defaultComfort } from '../game/comfort'
import { useCallback, useLayoutEffect, useRef, useState, useMemo } from 'react'
import type { ExplorationProps } from './Exploration'
import { createThreat, stepThreat, patrolPoints } from '../game/threat'
import { walkable } from '../game/world'
import type { Point, World } from '../game/world'
import { firstRoomAudio } from '../audio/firstRoomAudio'

export const useThreat = (props: ExplorationProps) => {
  const latest = useRef(props),
    runtime = useRef(props.threatSession?.runtime.current ?? createThreat()),
    identity = useRef(props.threatSession?.identity.current ?? ''),
    roomBeat = useRef(-1),
    [mode, setMode] = useState(props.threatSession?.runtime.current.mode ?? 'patrol')
  useLayoutEffect(() => {
    latest.current = props
  })
  const travelled = useRef(0)
  const advance = useCallback((dt: number, player: Point, world: World, active: boolean) => {
    const p = latest.current,
      key = `${p.area}:${p.threat?.revision ?? 0}`
    if (
      identity.current !== key &&
      !(
        identity.current.split(':')[1] === String(p.threat?.revision ?? 0) &&
        ['hall', 'electrical'].includes(identity.current.split(':')[0]) &&
        ['hall', 'electrical'].includes(p.area)
      )
    ) {
      identity.current = key
      runtime.current = createThreat()
      setMode(runtime.current.mode)
      // Safe initial placement happens only when entering/loading a scene, behind its transition.
      if (
        Math.hypot(
          p.initialPosition.x - runtime.current.position.x,
          p.initialPosition.y - runtime.current.position.y,
        ) < 180
      ) {
        const index = patrolPoints
          .map((point, i) => ({
            i,
            distance: walkable(point, world)
              ? Math.hypot(point.x - p.initialPosition.x, point.y - p.initialPosition.y)
              : -Infinity,
          }))
          .sort((a, b) => b.distance - a.distance)[0].i
        runtime.current.position = { ...patrolPoints[index] }
        runtime.current.patrol = (index + 1) % patrolPoints.length
      }
      runtime.current.gateHeard = p.threat?.gateHeard ?? false
    }
    identity.current = key
    const fieldActive =
      active &&
      !p.paused &&
      !p.threat?.caught &&
      document.hasFocus() &&
      document.visibilityState !== 'hidden'
    if (p.area !== 'hall' || !fieldActive)
      p.onFieldFrame?.(dt, player, runtime.current.position, fieldActive)
    if (
      p.area === 'first' &&
      active &&
      !p.paused &&
      document.hasFocus() &&
      document.visibilityState !== 'hidden'
    ) {
      const beat = p.clues.filter((id) => ['map', 'panel', 'cabinet'].includes(id)).length + 1
      if (beat > (p.threat?.roomBeat ?? 0) && roomBeat.current !== beat) {
        roomBeat.current = beat
        firstRoomAudio.cue('door')
        p.onRoomBeat?.()
      }
    }
    if (
      p.area !== 'hall' ||
      p.paused ||
      !active ||
      p.threat?.caught ||
      document.visibilityState === 'hidden' ||
      !document.hasFocus()
    ) {
      runtime.current.contact = 0
      if (p.threatSession) {
        p.threatSession.runtime.current = runtime.current
        p.threatSession.identity.current = identity.current
      }
      return runtime.current
    }
    const gate = p.power.includes('gate')
    const before = runtime.current
    runtime.current = stepThreat(
      before,
      player,
      dt,
      world,
      gate,
      p.comfort?.moveSpeed ?? defaultComfort.moveSpeed,
    )
    p.onFieldFrame?.(dt, player, runtime.current.position, !runtime.current.caught && fieldActive)
    travelled.current += Math.hypot(
      runtime.current.position.x - before.position.x,
      runtime.current.position.y - before.position.y,
    )
    if (travelled.current > 55) {
      travelled.current = 0
      if (
        Math.hypot(player.x - runtime.current.position.x, player.y - runtime.current.position.y) <
        280
      )
        firstRoomAudio.cue('infected')
    }
    if (gate && !p.threat?.gateHeard) p.onGateHeard?.()
    if (before.mode !== runtime.current.mode) {
      setMode(runtime.current.mode)
      p.onThreatAlert?.(['suspect', 'chase', 'search'].includes(runtime.current.mode))
      if (runtime.current.mode === 'suspect' || runtime.current.mode === 'chase')
        firstRoomAudio.cue('warning')
    }
    if (!before.caught && runtime.current.caught) p.onCaught?.()
    if (p.threatSession) {
      p.threatSession.runtime.current = runtime.current
      p.threatSession.identity.current = identity.current
    }
    return runtime.current
  }, [])
  return useMemo(() => ({ runtime, advance, mode }), [advance, mode])
}

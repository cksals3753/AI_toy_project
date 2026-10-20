import type { State } from '../game/engine'
import type { AudioCue } from './chapter2Audio'
export const chapter56Room = (area: string) =>
  ['moonPlatform', 'moonBooth', 'moonHolding', 'maintenance', 'recovery', 'shelter'].includes(area)
export const chapter56Cues = (before: State, after: State): AudioCue[] => {
  const cues: AudioCue[] = []
  if (!chapter56Room(after.area)) return cues
  const a = before.chapter5,
    b = after.chapter5,
    c = before.chapter6,
    d = after.chapter6
  // A new scripted scene announces its upcoming broadcast; transcript/record inspection does not.
  if (
    before.scene !== after.scene &&
    after.sceneIndex === 0 &&
    after.scene.some((line) => line.who === 'broadcast')
  )
    cues.push('chime')
  if (a.response !== 'answered' && b.response === 'answered') cues.push('sensor', 'door')
  if (a.registration !== 'cancelled' && b.registration === 'cancelled')
    cues.push('processed', 'door')
  if (!a.externalPaused && b.externalPaused) cues.push('processed')
  if (!a.routeOpen && b.routeOpen) cues.push('door')
  if (d.settings && JSON.stringify(c.settings) !== JSON.stringify(d.settings)) {
    cues.push('switch')
    if (c.settings?.door !== d.settings.door) cues.push('door')
  }
  if (!c.route && d.route === 'automatic') cues.push('door', 'warning')
  if (!c.drained && d.drained) cues.push('valve')
  if (!c.boltOpen && d.boltOpen) cues.push('latch', 'door')
  if (!c.completed && d.completed) cues.push('complete')
  return cues
}

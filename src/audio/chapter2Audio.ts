import type { State } from '../game/engine'

export type AudioCue =
  | 'infected'
  | 'key'
  | 'switch'
  | 'restore'
  | 'gate'
  | 'warning'
  | 'door'
  | 'call'
  | 'approved'
  | 'echo'
  | 'depart'
  | 'vibration'
  | 'request'
  | 'brake'
  | 'stop'
  | 'chime'
  | 'sensor'
  | 'processed'
  | 'valve'
  | 'latch'
  | 'complete'
export const audioRoom = (area: State['area']) =>
  ['first', 'hall', 'electrical', 'stairs'].includes(area)

// Compare committed game states, never inspection attempts or UI button presses.
// The initial state is the baseline, so loading a completed event stays silent.
export const chapter2Cues = (before: State, after: State): AudioCue[] => {
  if (!['hall', 'electrical', 'stairs'].includes(after.area)) return []
  const cues: AudioCue[] = []
  if (!before.inventory.includes('전기실 열쇠') && after.inventory.includes('전기실 열쇠'))
    cues.push('key')
  const oldPower = before.chapter2.power
  const power = after.chapter2.power
  if (oldPower.length !== power.length || oldPower.some((device) => !power.includes(device))) {
    cues.push('switch')
    if (!oldPower.includes('lights') && power.includes('lights')) cues.push('restore')
    if (!oldPower.includes('gate') && power.includes('gate')) cues.push('gate')
  }
  if (before.chapter2.staffEvent === 'unseen' && after.chapter2.staffEvent === 'active')
    cues.push('warning', 'door')
  return cues
}

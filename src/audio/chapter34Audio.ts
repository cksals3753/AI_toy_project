import type { State } from '../game/engine'
import type { AudioCue } from './chapter2Audio'

export const trainRoom = (area: string) => ['trainB', 'trainRear', 'trainFront'].includes(area)
export const chapter34Room = (area: string) =>
  ['platform', 'trainA'].includes(area) || trainRoom(area)
export type TrainMotion = 'stopped' | 'moving' | 'slowing'
export const trainMotion = (state: State): TrainMotion => {
  if (!trainRoom(state.area) || !state.chapter3.boarded || state.chapter4.arrived) return 'stopped'
  return state.chapter4.sync === 'accepted' && state.sceneIndex >= 1 ? 'slowing' : 'moving'
}
export const chapter34Cues = (before: State, after: State): AudioCue[] => {
  const cues: AudioCue[] = []
  // The existing extra footstep belongs to the chapter 2→3 boundary, not a new encounter.
  if (
    after.area === 'stairs' &&
    after.sceneIndex === 1 &&
    after.scene.length &&
    before.sceneIndex !== after.sceneIndex &&
    after.chapter2.ending === 'echo'
  )
    cues.push('echo')
  if (!chapter34Room(after.area)) return cues
  if (!before.chapter3.approved && after.chapter3.approved) cues.push('approved')
  if (!before.chapter3.doorOpen && after.chapter3.doorOpen) cues.push('call', 'door')
  else if (
    before.scene !== after.scene &&
    after.scene[0]?.text.startsWith('비상 호출 장치가 응답했다.')
  )
    cues.push('call')
  if (!before.chapter3.boarded && after.chapter3.boarded) cues.push('door', 'depart')
  if (!before.chapter4.started && after.chapter4.started) cues.push('vibration')
  if (after.chapter4.started) {
    if (
      Object.keys(after.chapter4.links).some((key) => {
        const id = key as keyof State['chapter4']['links']
        return before.chapter4.links[id] !== after.chapter4.links[id]
      })
    )
      cues.push('switch')
    if (before.chapter4.started && !before.chapter4.links.power && after.chapter4.links.power)
      cues.push('restore')
    if (before.chapter4.sync !== 'accepted' && after.chapter4.sync === 'accepted')
      cues.push('request')
    if (trainMotion(before) === 'moving' && trainMotion(after) === 'slowing') cues.push('brake')
    if (!before.chapter4.arrived && after.chapter4.arrived) cues.push('stop', 'door')
  }
  return cues
}

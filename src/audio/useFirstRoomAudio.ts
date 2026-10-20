import { chapter56Room, chapter56Cues } from './chapter56Audio'
import { useEffect, useRef, useState } from 'react'
import { chapter34Room, chapter34Cues, trainMotion } from './chapter34Audio'
import { audioRoom, chapter2Cues } from './chapter2Audio'
import type { State } from '../game/engine'
import { firstRoomAudio, loadSound, SOUND_KEY } from './firstRoomAudio'

export const useFirstRoomAudio = (state: State, welcome: boolean, paused: boolean) => {
  const [settings, setSettings] = useState(loadSound)
  const [status, setStatus] = useState(firstRoomAudio.getStatus)
  const previous = useRef(state)
  const motion = trainMotion(state)
  const powered = state.chapter4.started
    ? state.chapter4.links.power
    : state.chapter2.power.length > 0
  useEffect(() => {
    firstRoomAudio.configure(
      settings,
      (audioRoom(state.area) || chapter34Room(state.area) || chapter56Room(state.area)) &&
        state.stage !== 'intro' &&
        !welcome,
      paused,
      state.area,
      powered,
      motion,
      state.area === 'recovery' && !state.chapter6.drained,
      state.chapter6.completed,
    )
    try {
      localStorage.setItem(SOUND_KEY, JSON.stringify(settings))
    } catch {
      /* Sound preference never blocks game saving. */
    }
  }, [
    settings,
    state.area,
    state.stage,
    powered,
    motion,
    welcome,
    paused,
    state.chapter6.drained,
    state.chapter6.completed,
  ])
  useEffect(() => {
    if (
      previous.current.area === 'first' &&
      state.area === 'first' &&
      !previous.current.outcome &&
      ['escaped', 'injured'].includes(state.outcome ?? '')
    )
      firstRoomAudio.door()
    chapter2Cues(previous.current, state).forEach(firstRoomAudio.cue)
    chapter34Cues(previous.current, state).forEach(firstRoomAudio.cue)
    chapter56Cues(previous.current, state).forEach((cue) => {
      if (cue === 'complete') void firstRoomAudio.complete()
      else firstRoomAudio.cue(cue)
    })
    previous.current = state
  }, [state])
  useEffect(() => {
    const unsubscribe = firstRoomAudio.subscribe(() => setStatus(firstRoomAudio.getStatus()))
    const unlock = () => {
      void firstRoomAudio.unlock()
    }
    const blur = () => firstRoomAudio.focus(false)
    const focus = () => firstRoomAudio.focus(document.visibilityState !== 'hidden')
    const visibility = () =>
      firstRoomAudio.focus(document.visibilityState !== 'hidden' && document.hasFocus())
    document.addEventListener('pointerdown', unlock, { capture: true })
    document.addEventListener('pointerup', unlock, { capture: true })
    document.addEventListener('keydown', unlock, { capture: true })
    window.addEventListener('blur', blur)
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      unsubscribe()
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('pointerup', unlock, true)
      document.removeEventListener('keydown', unlock, true)
      window.removeEventListener('blur', blur)
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', visibility)
      firstRoomAudio.dispose()
    }
  }, [])
  return { settings, setSettings, status }
}

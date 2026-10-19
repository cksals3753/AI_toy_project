import { useEffect, useRef, useState } from 'react'
import type { State } from '../game/engine'
import { firstRoomAudio, loadSound, SOUND_KEY } from './firstRoomAudio'

export const useFirstRoomAudio = (state: State, welcome: boolean, paused: boolean) => {
  const [settings, setSettings] = useState(loadSound)
  const [status, setStatus] = useState(firstRoomAudio.getStatus)
  const previous = useRef({ area: state.area, outcome: state.outcome })
  useEffect(() => {
    firstRoomAudio.configure(
      settings,
      state.area === 'first' && state.stage !== 'intro' && !welcome,
      paused,
    )
    try {
      localStorage.setItem(SOUND_KEY, JSON.stringify(settings))
    } catch {
      /* Sound preference never blocks game saving. */
    }
  }, [settings, state.area, state.stage, welcome, paused])
  useEffect(() => {
    if (
      previous.current.area === 'first' &&
      state.area === 'first' &&
      !previous.current.outcome &&
      ['escaped', 'injured'].includes(state.outcome ?? '')
    )
      firstRoomAudio.door()
    previous.current = { area: state.area, outcome: state.outcome }
  }, [state.area, state.outcome])
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

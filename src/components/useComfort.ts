import { useState } from 'react'
import { COMFORT_KEY, defaultComfort, normalizeComfort } from '../game/comfort'
import type { ComfortSettings as Settings } from '../game/comfort'
export const useComfort = () => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return normalizeComfort(JSON.parse(localStorage.getItem(COMFORT_KEY) ?? 'null'))
    } catch {
      return { ...defaultComfort }
    }
  })
  const [error, setError] = useState(false)
  const change = (value: Settings) => {
    const next = normalizeComfort(value)
    setSettings(next)
    try {
      localStorage.setItem(COMFORT_KEY, JSON.stringify(next))
      setError(false)
    } catch {
      setError(true)
    }
  }
  return { settings, change, error }
}

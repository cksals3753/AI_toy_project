import { createExampleDecision } from './example'
import { isDecision, isDecisionContent } from './model'
import type { Decision } from './types'

const STORAGE_KEY = 'little-choice-v2'
const LEGACY_KEY = 'little-choice-v1'

export const loadDecisions = (): Decision[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== null) {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data) || !data.every(isDecision) || new Set(data.map(d => d.id)).size !== data.length) {
      throw new Error('저장된 고민 데이터를 읽을 수 없어요.')
    }
    return data
  }
  const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null')
  if (isDecisionContent(legacy)) return [{ ...createExampleDecision(), ...legacy }]
  return [createExampleDecision()]
}

export const saveDecisions = (decisions: Decision[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions))
    return true
  } catch { return false }
}

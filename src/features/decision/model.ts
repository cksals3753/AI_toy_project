import type { Decision, DecisionContent, RankedOption } from './types'

export const LIMITS = { minScore: 1, maxScore: 10, minWeight: 0, maxWeight: 5 } as const
export const DEFAULT_SCORE = 5
export const DEFAULT_WEIGHT = 3
export const SCORE_CHOICES = Array.from({ length: LIMITS.maxScore }, (_, i) => i + 1)

export const getDecisionResult = (decision: Decision) => {
  const totalWeight = decision.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  const sorted = decision.options.map(option => ({
    ...option,
    score: totalWeight === 0 ? 0 : decision.criteria.reduce(
      (sum, criterion) => sum + option.scores[criterion.id] * criterion.weight, 0,
    ) / totalWeight,
  })).sort((a, b) => b.score - a.score)

  const ranked: RankedOption[] = []
  sorted.forEach((option, index) => {
    const previous = ranked[index - 1]
    const rank = previous && Math.abs(previous.score - option.score) < 1e-6
      ? previous.rank : index + 1
    ranked.push({ ...option, rank })
  })

  return {
    totalWeight,
    ranked,
    winner: ranked[0],
    tied: totalWeight > 0 && ranked.filter(option => option.rank === 1).length > 1,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const inRange = (value: unknown, min: number, max: number): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

export const isDecisionContent = (value: unknown): value is DecisionContent => {
  if (!isRecord(value) || typeof value.title !== 'string') return false
  const { criteria, options } = value
  if (!Array.isArray(criteria) || !criteria.length || !Array.isArray(options) || !options.length) return false
  if (!criteria.every(c => isRecord(c) && typeof c.id === 'string' && typeof c.name === 'string'
    && inRange(c.weight, LIMITS.minWeight, LIMITS.maxWeight))) return false
  if (new Set(criteria.map(c => c.id)).size !== criteria.length) return false
  if (!options.every(o => isRecord(o) && typeof o.id === 'string' && typeof o.name === 'string'
    && isRecord(o.scores) && criteria.every(c => inRange((o.scores as Record<string, unknown>)[c.id], LIMITS.minScore, LIMITS.maxScore)))) return false
  return new Set(options.map(o => o.id)).size === options.length
}

export const isDecision = (value: unknown): value is Decision => {
  if (!isDecisionContent(value) || !isRecord(value)) return false
  const record = value as unknown as Record<string, unknown>
  return typeof record.id === 'string' && record.id.length > 0
    && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt))
    && (record.chosenOptionId === null || value.options.some(option => option.id === record.chosenOptionId))
    && (record.rating === null || inRange(record.rating, 1, 5))
    && typeof record.reflection === 'string'
}

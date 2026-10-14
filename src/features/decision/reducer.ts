import { DEFAULT_SCORE, DEFAULT_WEIGHT } from './model'
import type { Criterion, Decision } from './types'

export type DecisionAction =
  | { type: 'choiceChanged'; optionId: string | null }
  | { type: 'reviewChanged'; rating?: number | null; reflection?: string }
  | { type: 'titleChanged'; title: string }
  | { type: 'criterionAdded'; id: string }
  | { type: 'criterionChanged'; id: string; changes: Partial<Pick<Criterion, 'name' | 'weight'>> }
  | { type: 'criterionRemoved'; id: string }
  | { type: 'optionAdded'; id: string }
  | { type: 'optionRenamed'; id: string; name: string }
  | { type: 'optionRemoved'; id: string }
  | { type: 'scoreChanged'; optionId: string; criterionId: string; score: number }

export const decisionReducer = (state: Decision, action: DecisionAction): Decision => {
  switch (action.type) {
    case 'choiceChanged':
      if (action.optionId !== null && !state.options.some(o => o.id === action.optionId)) return state
      return { ...state, chosenOptionId: action.optionId }
    case 'reviewChanged':
      return { ...state, ...('rating' in action ? { rating: action.rating! } : {}), ...('reflection' in action ? { reflection: action.reflection! } : {}) }
    case 'titleChanged':
      return { ...state, title: action.title }
    case 'criterionAdded':
      return {
        ...state,
        criteria: [...state.criteria, { id: action.id, name: '', weight: DEFAULT_WEIGHT }],
        options: state.options.map(option => ({ ...option, scores: { ...option.scores, [action.id]: DEFAULT_SCORE } })),
      }
    case 'criterionChanged':
      return { ...state, criteria: state.criteria.map(c => c.id === action.id ? { ...c, ...action.changes } : c) }
    case 'criterionRemoved':
      if (state.criteria.length === 1) return state
      return {
        ...state,
        criteria: state.criteria.filter(c => c.id !== action.id),
        options: state.options.map(option => ({
          ...option,
          scores: Object.fromEntries(Object.entries(option.scores).filter(([id]) => id !== action.id)),
        })),
      }
    case 'optionAdded':
      return {
        ...state,
        options: [...state.options, {
          id: action.id, name: '',
          scores: Object.fromEntries(state.criteria.map(c => [c.id, DEFAULT_SCORE])),
        }],
      }
    case 'optionRenamed':
      return { ...state, options: state.options.map(o => o.id === action.id ? { ...o, name: action.name } : o) }
    case 'optionRemoved':
      if (state.options.length === 1) return state
      return { ...state, options: state.options.filter(o => o.id !== action.id), chosenOptionId: state.chosenOptionId === action.id ? null : state.chosenOptionId }
    case 'scoreChanged':
      return {
        ...state,
        options: state.options.map(o => o.id === action.optionId
          ? { ...o, scores: { ...o.scores, [action.criterionId]: action.score } } : o),
      }
  }
}

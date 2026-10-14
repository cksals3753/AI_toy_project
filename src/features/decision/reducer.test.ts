import { describe, expect, it } from 'vitest'
import { createExampleDecision } from './example'
import { getDecisionResult, isDecision } from './model'
import { decisionReducer } from './reducer'
import { createDecisionFromTemplate, templates } from './templates'

describe('decision lifecycle', () => {
  it('creates valid independent documents from every template', () => {
    for (const template of templates) {
      const first = createDecisionFromTemplate(template.id)
      const second = createDecisionFromTemplate(template.id)
      expect(isDecision(first)).toBe(true)
      expect(first.id).not.toBe(second.id)
      expect(first.criteria[0].id).not.toBe(second.criteria[0].id)
    }
  })

  it('allows choosing a lower-ranked option and recording a review', () => {
    const initial = createExampleDecision()
    expect(getDecisionResult(initial).winner.id).toBe('c')
    let state = decisionReducer(initial, { type: 'choiceChanged', optionId: 'a' })
    state = decisionReducer(state, { type: 'reviewChanged', rating: 4, reflection: '즐거웠음' })
    expect(state.chosenOptionId).toBe('a')
    expect(state.rating).toBe(4)
    expect(state.reflection).toBe('즐거웠음')
    expect(initial.chosenOptionId).toBeNull()
    expect(isDecision(state)).toBe(true)
  })

  it('clears a deleted selection and rejects invalid selected IDs', () => {
    const chosen = decisionReducer(createExampleDecision(), { type: 'choiceChanged', optionId: 'a' })
    expect(decisionReducer(chosen, { type: 'choiceChanged', optionId: 'missing' })).toBe(chosen)
    expect(decisionReducer(chosen, { type: 'optionRemoved', id: 'a' }).chosenOptionId).toBeNull()
    expect(isDecision({ ...chosen, chosenOptionId: 'missing' })).toBe(false)
  })

  it('retains last items and removes criterion scores consistently', () => {
    const initial = createDecisionFromTemplate('blank')
    expect(decisionReducer(initial, { type: 'criterionRemoved', id: initial.criteria[0].id })).toBe(initial)
    const added = decisionReducer(initial, { type: 'criterionAdded', id: 'new' })
    expect(added.options.every(o => o.scores.new === 5)).toBe(true)
    expect(decisionReducer(added, { type: 'criterionRemoved', id: 'new' })).toEqual(initial)
  })

  it('handles tied ranks and zero weights', () => {
    const initial = createDecisionFromTemplate('blank')
    expect(getDecisionResult(initial).tied).toBe(true)
    expect(getDecisionResult(initial).ranked.map(o => o.rank)).toEqual([1, 1])
    const zero = { ...initial, criteria: initial.criteria.map(c => ({ ...c, weight: 0 })) }
    expect(getDecisionResult(zero).totalWeight).toBe(0)
    expect(getDecisionResult(zero).tied).toBe(false)
  })
})

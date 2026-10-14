import { useEffect, useReducer, useRef, useState } from 'react'
import { getDecisionResult } from './model'
import { decisionReducer } from './reducer'
import { useSaveDecision } from './queries'
import type { Criterion, Decision } from './types'

export const useDecision = (initialDecision: Decision) => {
  const [decision, dispatch] = useReducer(decisionReducer, initialDecision)
  const [savedDecision, setSavedDecision] = useState(initialDecision)
  const save = useSaveDecision()
  const { mutate } = save
  const lastAttempt = useRef(initialDecision)

  useEffect(() => {
    if (decision === savedDecision || save.isPending || lastAttempt.current === decision) return
    const timer = window.setTimeout(() => {
      lastAttempt.current = decision
      mutate(decision, { onSuccess: () => setSavedDecision(decision) })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [decision, savedDecision, save.isPending, mutate])

  return {
    decision,
    isSaving: save.isPending,
    flushSave: async () => {
      if (save.isPending) return false
      if (decision === savedDecision) return true
      lastAttempt.current = decision
      try {
        await save.mutateAsync(decision)
        setSavedDecision(decision)
        return true
      } catch { return false }
    },
    saveStatus: save.isPending ? '저장 중…'
      : save.isError ? '저장 실패'
      : decision !== savedDecision ? '저장 대기 중…' : '저장 완료',
    saveError: save.error,
    retrySave: () => mutate(decision, { onSuccess: () => setSavedDecision(decision) }),
    result: getDecisionResult(decision),
    actions: {
      chooseOption: (optionId: string | null) => dispatch({ type: 'choiceChanged', optionId }),
      changeRating: (rating: number | null) => dispatch({ type: 'reviewChanged', rating }),
      changeReflection: (reflection: string) => dispatch({ type: 'reviewChanged', reflection }),
      changeTitle: (title: string) => dispatch({ type: 'titleChanged', title }),
      addCriterion: () => dispatch({ type: 'criterionAdded', id: crypto.randomUUID() }),
      changeCriterion: (id: string, changes: Partial<Pick<Criterion, 'name' | 'weight'>>) =>
        dispatch({ type: 'criterionChanged', id, changes }),
      removeCriterion: (id: string) => dispatch({ type: 'criterionRemoved', id }),
      addOption: () => dispatch({ type: 'optionAdded', id: crypto.randomUUID() }),
      renameOption: (id: string, name: string) => dispatch({ type: 'optionRenamed', id, name }),
      removeOption: (id: string) => dispatch({ type: 'optionRemoved', id }),
      changeScore: (optionId: string, criterionId: string, score: number) =>
        dispatch({ type: 'scoreChanged', optionId, criterionId, score }),
    },
  }
}

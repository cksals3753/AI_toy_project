import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createDecision, fetchDecision, fetchDecisions, updateDecision } from './api'
import type { Decision } from './types'

export const decisionKeys = {
  list: ['decisions', 'list'] as const,
  detail: (id: string) => ['decisions', 'detail', id] as const,
}

export const useDecisionsQuery = () => useQuery({
  queryKey: decisionKeys.list, queryFn: ({ signal }) => fetchDecisions(signal),
})

export const useDecisionQuery = (id: string) => useQuery({
  queryKey: decisionKeys.detail(id), queryFn: ({ signal }) => fetchDecision(id, signal), staleTime: Infinity,
})

export const useSaveDecision = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: updateDecision,
    onSuccess: decision => {
      client.setQueryData(decisionKeys.detail(decision.id), decision)
      client.setQueryData<Decision[]>(decisionKeys.list, list => list?.map(item => item.id === decision.id ? decision : item))
    },
  })
}

export const useCreateDecision = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: createDecision,
    onSuccess: async decision => {
      client.setQueryData(decisionKeys.detail(decision.id), decision)
      await client.invalidateQueries({ queryKey: decisionKeys.list })
    },
  })
}

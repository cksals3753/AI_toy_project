export type Criterion = { id: string; name: string; weight: number }
export type DecisionOption = { id: string; name: string; scores: Record<string, number> }
export type DecisionContent = { title: string; criteria: Criterion[]; options: DecisionOption[] }
export type Decision = DecisionContent & {
  id: string
  createdAt: string
  chosenOptionId: string | null
  rating: number | null
  reflection: string
}
export type RankedOption = DecisionOption & { score: number; rank: number }

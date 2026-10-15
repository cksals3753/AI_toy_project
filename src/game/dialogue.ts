import { platformQuestions } from './chapter3'
import { hallQuestions } from './chapter2'
import { openingMessages, questions } from './data'
export type Message = {
  who: string
  text: string
  time?: string
  id?: string
  chapter?: number
  kind?: 'ai-question' | 'ai-answer' | 'mock-answer'
  target?: string
}
// Future AI adapters may phrase these messages, but cannot mutate engine state.
export interface DialogueProvider {
  opening(): Message[]
  answer(questionId: string): Message[]
}
export const dialogue: DialogueProvider = {
  opening: () => openingMessages.map((message) => ({ ...message })),
  answer: (id) =>
    [...questions, ...hallQuestions, ...platformQuestions]
      .find((question) => question.id === id)
      ?.replies.map((message) => ({ ...message })) ?? [],
}

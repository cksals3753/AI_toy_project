import type { Decision } from './types'

export const createExampleDecision = (): Decision => {
  return {
    id: 'example',
    createdAt: '2026-10-14T00:00:00.000Z',
    chosenOptionId: null,
    rating: null,
    reflection: '',
    title: '이번 주말, 뭐 할까?',
    criteria: [
      { id: 'fun', name: '재미', weight: 5 },
      { id: 'cost', name: '비용 부담이 적음', weight: 3 },
      { id: 'ease', name: '편하게 다녀오기', weight: 2 },
    ],
    options: [
      { id: 'a', name: '근교로 당일치기 여행', scores: { fun: 9, cost: 5, ease: 6 } },
      { id: 'b', name: '카페에서 책 읽기', scores: { fun: 6, cost: 8, ease: 9 } },
      { id: 'c', name: '집에서 영화 마라톤', scores: { fun: 7, cost: 10, ease: 10 } },
    ],
  }
}

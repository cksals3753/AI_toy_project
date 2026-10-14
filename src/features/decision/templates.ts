import { DEFAULT_SCORE } from './model'
import type { Decision } from './types'

type Template = { id: string; name: string; title: string; criteria: string[]; options: string[] }
export const templates: Template[] = [
  { id: 'blank', name: '직접 만들기', title: '', criteria: ['나에게 중요함'], options: ['', ''] },
  { id: 'purchase', name: '제품 구매', title: '어떤 제품을 살까?', criteria: ['가격 만족도', '성능', '사용 편의성'], options: ['후보 A', '후보 B'] },
  { id: 'weekend', name: '주말 활동', title: '이번 주말 뭐 할까?', criteria: ['재미', '비용 부담이 적음', '편하게 다녀오기'], options: ['야외 활동', '집에서 쉬기'] },
  { id: 'travel', name: '여행지 선택', title: '어디로 여행 갈까?', criteria: ['가보고 싶은 정도', '예산에 맞음', '이동 편의성'], options: ['여행지 A', '여행지 B'] },
]

export const createDecisionFromTemplate = (templateId: string): Decision => {
  const template = templates.find(item => item.id === templateId) ?? templates[0]
  const criteria = template.criteria.map(name => ({ id: crypto.randomUUID(), name, weight: 3 }))
  return {
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), title: template.title,
    chosenOptionId: null, rating: null, reflection: '', criteria,
    options: template.options.map(name => ({
      id: crypto.randomUUID(), name, scores: Object.fromEntries(criteria.map(c => [c.id, DEFAULT_SCORE])),
    })),
  }
}

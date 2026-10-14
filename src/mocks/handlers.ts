import { delay, http, HttpResponse } from 'msw'
import { isDecision } from '../features/decision/model'
import { loadDecisions, saveDecisions } from '../features/decision/storage'

const failure = (message: string, status: number) => HttpResponse.json({ message }, { status })
const readBody = async (request: Request) => {
  try { const data: unknown = await request.json(); return isDecision(data) ? data : null }
  catch { return null }
}

export const handlers = [
  http.get('*/api/decisions', async () => {
    await delay(200)
    try { return HttpResponse.json(loadDecisions()) }
    catch (error) { return failure(error instanceof Error ? error.message : '브라우저 저장 데이터를 읽거나 저장할 수 없어요.', 500) }
  }),
  http.get('*/api/decisions/:id', async ({ params }) => {
    await delay(200)
    try {
      const decision = loadDecisions().find(item => item.id === params.id)
      return decision ? HttpResponse.json(decision) : failure('Not found', 404)
    } catch (error) { return failure(error instanceof Error ? error.message : '브라우저 저장 데이터를 읽거나 저장할 수 없어요.', 500) }
  }),
  http.post('*/api/decisions', async ({ request }) => {
    await delay(200)
    const data = await readBody(request)
    if (!data) return failure('Invalid decision', 400)
    try {
      const list = loadDecisions()
      if (list.some(item => item.id === data.id)) return failure('Already exists', 409)
      return saveDecisions([...list, data]) ? HttpResponse.json(data, { status: 201 }) : failure('브라우저 저장 데이터를 읽거나 저장할 수 없어요.', 500)
    } catch (error) { return failure(error instanceof Error ? error.message : '브라우저 저장 데이터를 읽거나 저장할 수 없어요.', 500) }
  }),
  http.put('*/api/decisions/:id', async ({ request, params }) => {
    await delay(200)
    const data = await readBody(request)
    if (!data || data.id !== params.id) return failure('Invalid decision', 400)
    try {
      const list = loadDecisions()
      if (!list.some(item => item.id === data.id)) return failure('Not found', 404)
      return saveDecisions(list.map(item => item.id === data.id ? data : item)) ? HttpResponse.json(data) : failure('브라우저 저장 데이터를 읽거나 저장할 수 없어요.', 500)
    } catch (error) { return failure(error instanceof Error ? error.message : '브라우저 저장 데이터를 읽거나 저장할 수 없어요.', 500) }
  }),
]

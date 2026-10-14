import { isDecision } from './model'
import type { Decision } from './types'

const endpoint = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/decisions`

const request = async (path: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(`${endpoint}${path}`, init)
  if (!response.ok) {
    let message = `요청에 실패했어요. (${response.status})`
    try {
      const error: unknown = await response.json()
      if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') message = error.message
    } catch { /* Keep the HTTP error when the body is not JSON. */ }
    throw new Error(message)
  }
  return response.json()
}

const readDecision = (data: unknown): Decision => {
  if (!isDecision(data)) throw new Error('서버 응답 형식이 올바르지 않아요.')
  return data
}

export const fetchDecisions = async (signal?: AbortSignal): Promise<Decision[]> => {
  const data = await request('', { signal })
  if (!Array.isArray(data) || !data.every(isDecision)) throw new Error('목록 응답 형식이 올바르지 않아요.')
  return data
}

export const fetchDecision = async (id: string, signal?: AbortSignal): Promise<Decision> =>
  readDecision(await request(`/${encodeURIComponent(id)}`, { signal }))

export const createDecision = async (decision: Decision): Promise<Decision> =>
  readDecision(await request('', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(decision),
  }))

export const updateDecision = async (decision: Decision): Promise<Decision> =>
  readDecision(await request(`/${encodeURIComponent(decision.id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(decision),
  }))

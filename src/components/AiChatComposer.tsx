import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, FormEvent } from 'react'
import type { Action, State } from '../game/engine'
import { characters } from '../game/data'
import { hallObjects } from '../chat/chapter2Public'
import { buildChatRequest, sharedChapter2Clues } from '../chat/client'
import { chatLimits } from '../chat/contracts'
import type { ChatCharacterId, ChatRequest } from '../chat/contracts'
import { fetchChatStatus, sendChatRequest } from '../chat/api'

type Props = { state: State; dispatch: Dispatch<Action> }
export const AiChatComposer = ({ state, dispatch }: Props) => {
  const [character, setCharacter] = useState<ChatCharacterId>('seo')
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [status, setStatus] = useState<{ available: boolean; mode: 'openai' | 'mock' } | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const network = useRef<AbortController | null>(null)
  const checking = useRef<AbortController | null>(null)
  const locked = useRef(false)
  const pending = state.aiChat.pending
  const shared = sharedChapter2Clues(state)
  const refresh = useCallback(async () => {
    checking.current?.abort()
    const controller = new AbortController()
    checking.current = controller
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const next = await fetchChatStatus(controller.signal)
      setStatus(next)
      setBlocked(!next.available)
      setConnectionError('')
    } catch {
      if (!controller.signal.aborted) {
        setStatus(null)
        setConnectionError('대화 서버에 연결하지 못했어요.')
      } else setConnectionError('대화 서버 연결 시간이 초과됐어요.')
    } finally {
      clearTimeout(timer)
    }
  }, [])
  useEffect(() => {
    const initialCheck = setTimeout(() => void refresh(), 0)
    return () => {
      clearTimeout(initialCheck)
      network.current?.abort()
      checking.current?.abort()
    }
  }, [refresh])
  const send = async (request: ChatRequest, retry: boolean) => {
    if (locked.current || blocked || !status?.available) return
    locked.current = true
    const controller = new AbortController()
    network.current = controller
    dispatch(retry ? { type: 'ai-retry' } : { type: 'ai-start', request })
    const timer = setTimeout(() => controller.abort(), 25_000)
    try {
      const reply = await sendChatRequest(request, controller.signal)
      dispatch({ type: 'ai-success', reply })
      setText('')
      setSelected([])
    } catch (error) {
      setBlocked(true)
      void refresh()
      dispatch({
        type: 'ai-error',
        requestId: request.requestId,
        error: controller.signal.aborted
          ? '요청이 중단되었거나 시간이 초과됐어요. 같은 질문으로 재시도할 수 있어요.'
          : error instanceof Error
            ? error.message
            : '답변을 받지 못했어요.',
      })
    } finally {
      clearTimeout(timer)
      locked.current = false
      network.current = null
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (pending || !text.trim() || text.trim().length > chatLimits.input || !status?.available)
      return
    void send(buildChatRequest(state, character, text, selected, crypto.randomUUID()), false)
  }
  return (
    <section className="ai-composer" aria-label="챕터 2 자유 대화">
      <h3>
        캐릭터에게 직접 질문하기{' '}
        <small>{status?.mode === 'mock' ? '모의 응답 · 검증용' : 'AI 대화 · 챕터 2'}</small>
      </h3>
      <p className="muted" role="status">
        {connectionError ||
          (status
            ? status.available
              ? '현재 위치·최근 단톡방·공유한 단서를 보내며 선택한 한 명이 답합니다.'
              : 'AI 자유 대화 사용 불가 · 선택형 질문과 탐색으로 계속하세요.'
            : '대화 서버 연결 확인 중…')}
      </p>
      <button type="button" className="text-button" onClick={() => void refresh()}>
        대화 연결 다시 확인
      </button>
      {pending ? (
        <div className="ai-pending">
          <p>
            {characters.find((c) => c.id === pending.request.characterId)?.name}에게 보낸 질문:{' '}
            {pending.request.text}
          </p>
          {pending.status === 'pending' ? (
            <p role="status">
              답변을 기다리고 있어요. 휴대폰을 닫고 탐색해도 진행은 막히지 않아요.
            </p>
          ) : (
            <>
              <p role="alert">{pending.error}</p>
              <button
                className="primary"
                disabled={blocked || !status?.available}
                onClick={() => void send(pending.request, true)}
              >
                같은 질문 재시도
              </button>
              <button className="text-button" onClick={() => dispatch({ type: 'ai-dismiss' })}>
                대기 취소 · 새 질문 작성
              </button>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="ai-character">답변할 캐릭터</label>
          <select
            id="ai-character"
            value={character}
            onChange={(e) => setCharacter(e.target.value as ChatCharacterId)}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.role}
              </option>
            ))}
          </select>
          <fieldset>
            <legend>함께 공유할 현장 단서</legend>
            {hallObjects
              .filter((o) => state.clues.includes(o.id))
              .map((o) => (
                <label className="ai-share" key={o.id}>
                  <input
                    type="checkbox"
                    checked={shared.includes(o.id) || selected.includes(o.id)}
                    disabled={shared.includes(o.id)}
                    onChange={(e) =>
                      setSelected((previous) =>
                        e.target.checked
                          ? [...previous, o.id]
                          : previous.filter((id) => id !== o.id),
                      )
                    }
                  />
                  {o.title}
                  {shared.includes(o.id) ? ' · 이미 단톡방에 공유함' : ''}
                </label>
              ))}
            {!hallObjects.some((o) => state.clues.includes(o.id)) && (
              <p className="muted">조사한 단서가 아직 없어요. 먼저 주변을 살펴볼 수 있어요.</p>
            )}
          </fieldset>
          <label htmlFor="ai-question">질문</label>
          <textarea
            id="ai-question"
            value={text}
            maxLength={chatLimits.input}
            disabled={blocked || !status?.available}
            placeholder={
              status?.available
                ? '현장에서 확인한 것과 궁금한 점을 물어보세요.'
                : '선택형 질문으로 계속 플레이할 수 있어요.'
            }
            onChange={(e) => setText(e.target.value)}
          />
          <div className="ai-send">
            <small>
              {text.length}/{chatLimits.input}
            </small>
            <button type="submit" className="primary" disabled={!status?.available || !text.trim()}>
              한 명에게 질문 보내기
            </button>
          </div>
        </form>
      )}
      <p className="muted">
        단톡방의 질문·답변과 공유한 단서는 모두에게 공개됩니다. AI 대사는 현장 검증이 아니며, 필수
        단서는 기존 조사와 선택형 질문으로 확보할 수 있어요.
      </p>
    </section>
  )
}

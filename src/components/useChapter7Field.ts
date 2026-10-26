import { rearOpen } from '../game/chapter7'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import type { Action, State } from '../game/engine'
import type { Point } from '../game/world'
export type Field7Action = Extract<Action, { type: 's7-install' | 's7-winch' | 's7-firedoor' }>
export const useChapter7Field = (state: State, paused: boolean, dispatch: Dispatch<Action>) => {
  const latest = useRef({ state, paused })
  useLayoutEffect(() => {
    latest.current = { state, paused }
  })
  const op = useRef<{
    action: Field7Action
    at: Point
    time: number
    duration: number
    started: boolean
  } | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const cancel = useCallback(() => {
    if (!op.current) return
    op.current = null
    setProgress(null)
    setStatus('작업 중단 · 마지막 확정 상태 보존. 같은 장치에서 재개하세요.')
  }, [])
  useEffect(() => {
    if (paused) cancel()
  }, [paused, cancel])
  useEffect(() => {
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', cancel)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
    }
  }, [cancel])
  const start = useCallback((action: Field7Action) => {
    if (op.current || latest.current.state.chapter7.phase !== 'respond') return
    const c = latest.current.state.chapter7
    if (action.type === 's7-winch' && (c.priority !== 'entrance' || c.winch === 'open')) {
      setStatus(
        '수동 윈치는 입구 보강 후 후면 문을 여는 대체 설비입니다. 후면 지지대 설치 시에는 이미 통로가 열립니다.',
      )
      return
    }
    if (
      action.type === 's7-firedoor' &&
      (!c.priority || !rearOpen(c) || latest.current.state.position.x < 760)
    ) {
      setStatus('먼저 후면 통로를 확보하고 안전한 안쪽 조작 위치로 이동하세요.')
      return
    }
    const duration =
      action.type === 's7-winch' ? (latest.current.state.chapter7.winch === 'pinned' ? 2 : 4) : 1.5
    op.current = { action, at: latest.current.state.position, time: 0, duration, started: false }
    setProgress(0)
    setStatus('현장 작업 중 · 이동 / 메뉴로 중단 · 마지막 완료 단계부터 다시 작업')
  }, [])
  const tick = useCallback(
    (dt: number, player: Point, _enemy: Point, active: boolean) => {
      const { state: s, paused: p } = latest.current
      if (s.area !== 'shelterDefense') return
      if (active && !p) dispatch({ type: 's7-tick', dt })
      const work = op.current
      if (!work) return
      if (!work.started && (p || !active)) return
      if (
        p ||
        !active ||
        s.chapter7.phase !== 'respond' ||
        Math.hypot(player.x - work.at.x, player.y - work.at.y) > 12
      ) {
        cancel()
        return
      }
      work.started = true
      work.time += Math.max(0, Math.min(dt, 0.1))
      setProgress(Math.min(100, Math.floor((100 * work.time) / work.duration)))
      if (work.time >= work.duration) {
        dispatch(work.action)
        op.current = null
        setProgress(null)
        setStatus('현장 작업 완료 · 상태 저장')
      }
    },
    [cancel, dispatch],
  )
  return { start, tick, cancel, progress, status }
}

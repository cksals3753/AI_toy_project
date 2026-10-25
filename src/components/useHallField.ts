import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import type { Action, State } from '../game/engine'
import type { ShutterOperation } from '../game/hallEnvironment'
import type { Point } from '../game/world'
import { outsideRisingWater, stepShutterOperation } from '../game/hallEnvironment'

export const useHallField = (state: State, paused: boolean, dispatch: Dispatch<Action>) => {
  const latest = useRef({ state, paused })
  useLayoutEffect(() => {
    latest.current = { state, paused }
  })
  const operation = useRef<ShutterOperation | null>(null)
  const [status, setStatus] = useState('IS-02 · 현장 조작 대기')
  const [progress, setProgress] = useState(0)
  const cancel = useCallback(() => {
    if (!operation.current) return
    operation.current = null
    setProgress(0)
    setStatus('조작 중단 · 마지막 확정 단계부터 다시 시작할 수 있습니다')
  }, [])
  useEffect(() => {
    cancel()
  }, [paused, state.area, state.threat.caught, cancel])
  useEffect(() => {
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', cancel)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
    }
  }, [cancel])
  const start = useCallback(() => {
    const { state: s, paused: p } = latest.current
    if (
      operation.current ||
      p ||
      s.threat.caught ||
      s.area !== 'hall' ||
      s.chapter2.shutter === 'open'
    )
      return
    operation.current = { stage: s.chapter2.shutter, time: 0 }
    setStatus(
      s.chapter2.shutter === 'locked'
        ? 'IS-02 · 빗장 해제 중 · 이동/메뉴로 취소'
        : 'IS-02 · 셔터 올림·걸쇠 고정 중 · 이동/메뉴로 취소',
    )
    setProgress(0)
  }, [])
  const tick = useCallback(
    (dt: number, player: Point, enemy: Point, active: boolean) => {
      const { state: s, paused: p } = latest.current
      if (
        active &&
        !p &&
        s.chapter2.visited &&
        s.chapter2.water === 0 &&
        ['hall', 'electrical'].includes(s.area) &&
        outsideRisingWater(enemy) &&
        (s.area !== 'hall' || outsideRisingWater(player))
      )
        dispatch({ type: 'hall-leak', enemy })
      const op = operation.current
      if (!op) return
      const next = stepShutterOperation(op, {
        active: active && !p && s.area === 'hall',
        caught: s.threat.caught,
        stage: s.chapter2.shutter,
        player,
        dt,
      })
      if (next.status === 'cancelled') {
        cancel()
        return
      }
      operation.current = next.operation
      setProgress(next.progress)
      if (next.status === 'complete') {
        dispatch({ type: 'hall-shutter', expected: op.stage })
        setStatus(
          op.stage === 'locked'
            ? '빗장 해제 완료 · 다음 입력으로 올림·고정'
            : 'IS-02 개방 완료 · E-01 접근 가능',
        )
        setProgress(100)
      }
    },
    [cancel, dispatch],
  )
  return { start, tick, cancel, status, progress }
}

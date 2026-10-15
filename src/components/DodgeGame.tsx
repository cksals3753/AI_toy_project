import { useEffect, useRef, useState } from 'react'
import { Overlay } from './Overlay'
// Local input timing produces a result event; only the reducer applies damage once.
export function DodgeGame({ onFinish }: { onFinish: (success: boolean) => void }) {
  const [started, setStarted] = useState(false)
  const [progress, setProgress] = useState(0)
  const elapsed = useRef(0)
  const resolved = useRef(false)
  useEffect(() => {
    if (!started) return
    let frame = 0,
      previous = 0
    const tick = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0
      previous = time
      if (document.visibilityState !== 'hidden' && document.hasFocus()) elapsed.current += dt
      setProgress(elapsed.current)
      if (elapsed.current >= 5 && !resolved.current) {
        resolved.current = true
        onFinish(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [started, onFinish])
  const marker = (Math.sin(progress * 2.6 - Math.PI / 2) + 1) / 2
  return (
    <Overlay title="삐—! 방화문이 내려온다">
      <p className="intro-text">
        직원 통로 안쪽에서 금속이 뒤틀리는 소리가 난다. 문이 닫히기 전에 몸을 빼야 한다.
      </p>
      <p className="muted">
        시작 후 표시점이 녹색 안전 구간에 들어오면 “몸 빼기”를 누르세요. Enter·Space 또는 터치로
        조작합니다. 제한 5초. 실패하면 체력 20이 감소하고 대합실로 돌아옵니다.
      </p>
      <div className={`dodge-visual ${started ? 'running' : ''}`}>
        <div className="shutter-slats" />
        <span>EMERGENCY SHUTTER</span>
      </div>
      <div
        className="dodge-track"
        role="progressbar"
        aria-label="안전 구간 34%에서 66% 사이"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(marker * 100)}
      >
        <span className="safe-zone" />
        <b style={{ left: `${marker * 100}%` }} />
      </div>
      <p className="dodge-time" aria-live="off">
        {started ? `남은 시간 ${Math.max(0, 5 - progress).toFixed(1)}초` : '초록색 구간에서 회피'}
      </p>
      <button
        className="primary full"
        onClick={() => {
          if (!started) {
            setStarted(true)
            return
          }
          if (resolved.current) return
          resolved.current = true
          onFinish(marker >= 0.34 && marker <= 0.66)
        }}
      >
        {started ? '몸 빼기!' : '회피 시작'}
      </button>
    </Overlay>
  )
}

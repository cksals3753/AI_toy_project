import { useEffect, useRef, useState } from 'react'
import { syncRules } from '../game/chapter4'
import type { Chapter4 } from '../game/chapter4'
import { Overlay } from './Overlay'

type Props = {
  chapter: Chapter4
  onHit: (marker: number) => void
  onAssist: () => void
  onClose: () => void
}
export const SignalSync = ({ chapter, onHit, onAssist, onClose }: Props) => {
  const [marker, setMarker] = useState(0)
  const markerRef = useRef(0)
  const button = useRef<HTMLButtonElement>(null)
  const cycle = chapter.assisted ? syncRules.assistedCycleSeconds : syncRules.cycleSeconds
  useEffect(() => {
    let frame = 0,
      previous = 0,
      elapsed = 0
    const tick = (time: number) => {
      if (previous && document.visibilityState !== 'hidden')
        elapsed += Math.min((time - previous) / 1000, 0.05)
      previous = time
      const next = (1 - Math.cos((elapsed * Math.PI * 2) / cycle)) / 2
      markerRef.current = next
      setMarker(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    button.current?.focus()
    return () => cancelAnimationFrame(frame)
  }, [cycle, chapter.failures])
  return (
    <Overlay title="정차 요청 · 신호 동기화" onClose={onClose}>
      <p className="intro-text">움직이는 표시가 양쪽 경계선 사이에 들어오면 한 번 누르세요.</p>
      <p className="muted">
        목표: 28–72%. 터치·클릭 또는 버튼에 초점을 두고 Enter·Space. 시간제한이나 자원 소모는
        없습니다. 탐색은 일시정지됩니다.
      </p>
      <div
        className="sync-track"
        role="meter"
        aria-label="정차 신호 위치, 목표 28에서 72퍼센트"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(marker * 100)}
      >
        <span className="sync-target">목표 구간</span>
        <b style={{ left: `${marker * 100}%` }} />
      </div>
      <p role="status">
        {chapter.failures
          ? `실패 ${chapter.failures}회 · 다시 시도할 수 있어요.`
          : '신호를 기다렸다가 눌러주세요.'}
      </p>
      <button
        ref={button}
        className="primary full"
        onKeyDown={(event) => {
          if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault()
        }}
        onClick={() => onHit(markerRef.current)}
      >
        이 신호에 맞추기
      </button>
      {chapter.failures >= syncRules.assistAfter && (
        <button className="text-button" aria-pressed={chapter.assisted} onClick={onAssist}>
          {chapter.assisted ? '느린 신호 보조 켜짐 · 끄기' : '느린 신호 보조 켜기'}
        </button>
      )}
      <button className="text-button" onClick={onClose}>
        중단하고 패널로 돌아가기
      </button>
    </Overlay>
  )
}

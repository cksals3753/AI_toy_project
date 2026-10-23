import { useLayoutEffect, useRef, useState } from 'react'
import { joystickCenter, joystickVector } from '../game/joystick'
import type { Point } from '../game/world'
// This component is mounted only while exploration accepts touch movement.
export const DynamicJoystick = ({
  onMove,
  onStart,
  onStop,
}: {
  onMove: (point: Point) => void
  onStart: () => void
  onStop?: () => void
}) => {
  const owner = useRef<{ id: number; x: number; y: number } | null>(null)
  const latest = useRef(onMove)
  useLayoutEffect(() => {
    latest.current = onMove
  })
  const [visual, setVisual] = useState<{ center: Point; knob: Point } | null>(null)
  useLayoutEffect(() => {
    const clear = () => {
      owner.current = null
      latest.current({ x: 0, y: 0 })
      setVisual(null)
    }
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    window.addEventListener('resize', clear)
    return () => {
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
      window.removeEventListener('resize', clear)
      owner.current = null
      latest.current({ x: 0, y: 0 })
    }
  }, [])
  const release = (id: number) => {
    if (owner.current?.id !== id) return
    owner.current = null
    latest.current({ x: 0, y: 0 })
    setVisual(null)
    onStop?.()
  }
  return (
    <div
      className="dynamic-move-zone"
      aria-label="좌하단 이동 터치 영역"
      data-move-zone
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' || owner.current || event.target !== event.currentTarget)
          return
        event.preventDefault()
        event.stopPropagation()
        const r = event.currentTarget.getBoundingClientRect()
        owner.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
        event.currentTarget.setPointerCapture(event.pointerId)
        onStart()
        latest.current({ x: 0, y: 0 })
        setVisual({
          center: joystickCenter(event.clientX - r.left, event.clientY - r.top, r.width, r.height),
          knob: { x: 0, y: 0 },
        })
      }}
      onPointerMove={(event) => {
        const p = owner.current
        if (!p || p.id !== event.pointerId) return
        event.preventDefault()
        const vector = joystickVector(event.clientX - p.x, event.clientY - p.y)
        latest.current(vector)
        setVisual((previous) =>
          previous ? { ...previous, knob: { x: vector.x * 33, y: vector.y * 33 } } : null,
        )
      }}
      onPointerUp={(event) => release(event.pointerId)}
      onPointerCancel={(event) => release(event.pointerId)}
      onLostPointerCapture={(event) => release(event.pointerId)}
    >
      {visual && (
        <div
          className="joystick dynamic-joystick"
          role="group"
          aria-label="이동 조이스틱"
          style={{ left: visual.center.x, top: visual.center.y }}
        >
          <span className="joystick-ring" />
          <span
            className="joystick-knob"
            style={{ transform: `translate(${visual.knob.x}px, ${visual.knob.y}px)` }}
          />
        </div>
      )}
    </div>
  )
}

import { useRef } from 'react'
import type { ButtonHTMLAttributes, ComponentProps, PointerEvent } from 'react'
import { Button } from './Button'
// Browsers may omit compatibility click for a secondary touch while movement is held.
// Preserve ordinary click/keyboard semantics; only complete a secondary tap inside the button.
const useSecondaryTap = (activate: () => void) => {
  const owner = useRef<number | null>(null)
  const consumed = useRef<{ id: number; time: number } | null>(null)
  const clear = (event: PointerEvent<HTMLButtonElement>) => {
    if (owner.current === event.pointerId) owner.current = null
  }
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      // A fresh gesture may reuse a pointerId (for example on another browser).
      consumed.current = null
      if (
        event.pointerType === 'touch' &&
        !event.isPrimary &&
        !event.currentTarget.disabled &&
        owner.current === null
      )
        owner.current = event.pointerId
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (owner.current !== event.pointerId || event.currentTarget.disabled) return
      owner.current = null
      const r = event.currentTarget.getBoundingClientRect()
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        return
      event.preventDefault()
      consumed.current = { id: event.pointerId, time: performance.now() }
      activate()
    },
    onPointerCancel: clear,
    onLostPointerCapture: clear,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      const native = event.nativeEvent as globalThis.PointerEvent
      if (
        consumed.current?.id === native.pointerId &&
        performance.now() - consumed.current.time < 800
      ) {
        consumed.current = null
        return
      }
      activate()
    },
  }
}
export const DismissButton = ({
  onDismiss,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick'> & { onDismiss: () => void }) => {
  const gestures = useSecondaryTap(onDismiss)
  return <Button {...props} {...gestures} />
}
export const MenuButton = ({
  onActivate,
  type = 'button',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { onActivate: () => void }) => {
  const gestures = useSecondaryTap(onActivate)
  return <button type={type} {...props} {...gestures} />
}

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
export function Overlay({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = container.current!
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled),input,summary,[tabindex="0"]'))
    ;(controls()[0] ?? element).focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) { event.preventDefault(); event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const items = controls(), first = items[0], last = items.at(-1)
        if (!first) { event.preventDefault(); element.focus() }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    element.addEventListener('keydown', key)
    return () => { element.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  return <div className="overlay-backdrop"><div className={`overlay-panel ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={container}><div className="overlay-heading"><div><span className="overline">EXPLORATION PAUSED</span><h2>{title}</h2></div>{onClose && <button className="close-button" onClick={onClose} aria-label="닫고 탐색 계속">✕</button>}</div>{children}</div></div>
}

import { DismissButton, MenuButton } from './ui/TouchActionButton'
import { editingText } from '../game/explorationInput'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
export const Overlay = ({
  title,
  children,
  onClose,
  wide = false,
  shortcutMenu,
  footerClose = true,
  closeLabel = '닫기 · 돌아가기',
}: {
  title: string
  children: ReactNode
  onClose?: () => void
  wide?: boolean
  shortcutMenu?: 'phone' | 'bag'
  footerClose?: boolean
  closeLabel?: string
}) => {
  const container = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useLayoutEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = container.current!
    const controls = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,summary,[tabindex="0"]',
        ),
      )
    ;(controls()[0] ?? element).focus()
    const key = (event: KeyboardEvent) => {
      if ((event.target as Element).closest('[role=dialog]') !== element) return
      if (event.code === 'Escape' && close.current && !event.repeat && !editingText(event.target)) {
        event.preventDefault()
        event.stopPropagation()
        close.current()
      }
      // Phone/bag Tab belongs to App's menu shortcut unless editing or Shift+Tab.
      if (event.key === 'Tab' && !(shortcutMenu && !event.shiftKey && !editingText(event.target))) {
        const items = controls(),
          first = items[0],
          last = items.at(-1)
        if (!first) {
          event.preventDefault()
          element.focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    element.addEventListener('keydown', key)
    return () => {
      element.removeEventListener('keydown', key)
      previous?.focus()
    }
  }, [title, shortcutMenu])
  return (
    <div className="overlay-backdrop">
      <div
        className={`overlay-panel ${wide ? 'wide' : ''}`}
        data-game-menu={shortcutMenu}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={container}
      >
        <div className="overlay-heading">
          <div>
            <span className="overline">EXPLORATION PAUSED</span>
            <h2>{title}</h2>
          </div>
          {onClose && (
            <MenuButton className="close-button" onActivate={onClose} aria-label="닫고 탐색 계속">
              ✕
            </MenuButton>
          )}
        </div>
        {children}
        {onClose && footerClose && (
          <div className="mt-5 border-t border-slate-600 pt-3">
            <DismissButton variant="text" data-overlay-dismiss onDismiss={onClose}>
              {closeLabel}
            </DismissButton>
          </div>
        )}
      </div>
    </div>
  )
}

// Physical codes work with both Korean and Latin keyboard layouts.
export function gameKey(event: Pick<KeyboardEvent, 'code' | 'key'>): string {
  const codes: Record<string, string> = {
    KeyW: 'w',
    KeyA: 'a',
    KeyS: 's',
    KeyD: 'd',
    KeyE: 'e',
    ArrowUp: 'arrowup',
    ArrowDown: 'arrowdown',
    ArrowLeft: 'arrowleft',
    ArrowRight: 'arrowright',
  }
  return codes[event.code] ?? event.key.toLowerCase()
}

export function editingText(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
  )
}

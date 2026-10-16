import { useState } from 'react'
export function ExplorationHud({
  chapter,
  health,
  battery,
  objective,
  onHelp,
  onFullscreen,
  paused,
}: {
  chapter: string
  health: number
  battery: number
  objective: string
  onHelp: () => void
  onFullscreen: () => void
  paused: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="compact-hud">
      <div className="hud-status" aria-label="현재 상태">
        <span>{chapter}</span>
        <span>
          ♡ {health}
          <small> 체력</small>
        </span>
        <span>
          ▰ {battery}%<small> 배터리</small>
        </span>
      </div>
      <div className="hud-objective">
        <button
          aria-expanded={expanded}
          aria-controls="current-objective"
          onClick={() => setExpanded((v) => !v)}
        >
          <span>⌖ 다음 목표</span>
          <span>{expanded ? '−' : '+'}</span>
        </button>
        {expanded && <p id="current-objective">{objective}</p>}
      </div>
      <div className="hud-utilities world-toolbar">
        <button onClick={onHelp} disabled={paused} aria-label="조작 도움말" title="조작 도움말">
          ?
        </button>
        {document.fullscreenEnabled && (
          <button
            onClick={onFullscreen}
            disabled={paused}
            aria-label="선택적 전체화면"
            title="선택적 전체화면"
          >
            ⛶
          </button>
        )}
      </div>
    </div>
  )
}

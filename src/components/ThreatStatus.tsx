import type { Area } from '../game/world'
export const ThreatStatus = ({
  area,
  mode,
  paused,
}: {
  area: Area
  mode: string
  paused: boolean
}) => {
  if (!['first', 'hall', 'electrical'].includes(area)) return null
  const text =
    area === 'first'
      ? '▧ 봉쇄문 밖 충격 · 이 방은 임시 안전 공간입니다'
      : area === 'electrical'
        ? '▣ 전기실 · 감염자가 들어오지 못하는 안전 구역'
        : ({
            patrol: '◉ 감염자 순찰 · 벤치 너머 움직임을 살피세요',
            suspect: '⚠ 의심 · 감염자가 이쪽을 살핍니다',
            chase: '⚠ 발견됨 · 기둥 뒤로 시야를 끊거나 전기실로 이동하세요',
            search: '⌕ 수색 · 마지막 목격 위치를 확인하고 있습니다',
            return: '↶ 감염자가 순찰로 돌아갑니다',
          }[mode] ?? '감염자 주의')
  return (
    <aside
      className="threat-status pointer-events-none absolute bottom-32 left-3 z-[3] max-w-[min(420px,75%)] rounded border border-amber-200/40 bg-black/85 px-3 py-2 text-xs leading-relaxed text-amber-100"
      role="status"
      aria-live="polite"
      data-threat-status={mode}
    >
      <strong>{text}</strong>
      <span className="block text-[10px] text-stone-200">
        {paused
          ? 'Ⅱ 탐색과 위협 정지 · 읽는 동안 안전합니다'
          : area === 'first'
            ? '대화·휴대폰·퍼즐·메뉴를 읽는 동안 위협도 멈춥니다'
            : '전기실 문을 닫아 거리를 벌릴 수 있습니다 · 읽기/메뉴 중 위협 정지'}
      </span>
    </aside>
  )
}

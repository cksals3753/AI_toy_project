import { isChapter5Area, moonStation } from './chapter5'
import type { Chapter5 } from './chapter5'
import type { Area, Entity } from './world'

export const drawMoonEnvironment = (
  ctx: CanvasRenderingContext2D,
  area: Area,
  chapter?: Chapter5,
) => {
  if (!isChapter5Area(area)) return
  ctx.fillStyle = '#d3dcbf'
  ctx.font = '13px monospace'
  ctx.fillText(
    `${moonStation} / ${area === 'moonPlatform' ? '대답 없는 승강장' : area === 'moonBooth' ? '안내 부스' : '확인 대기 구역'}`,
    480,
    180,
  )
  if (area === 'moonPlatform') {
    ctx.strokeStyle = '#a5ac80'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const x = 380 + i * 90,
        y = 320 - i * 35
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 35, y - 14)
      ctx.lineTo(x + 22, y - 18)
      ctx.moveTo(x + 35, y - 14)
      ctx.lineTo(x + 28, y)
      ctx.stroke()
    }
    ctx.fillStyle = '#c9bc90'
    ctx.font = '10px monospace'
    ctx.fillText('확인 대기 방향 →', 660, 370)
  }
  if (area === 'moonHolding') {
    ctx.fillStyle = chapter?.registration === 'active' ? '#bc8565' : '#a6c68a'
    ctx.font = '12px monospace'
    ctx.fillText(
      chapter?.registration === 'active'
        ? '차단문 잠김 · 내부 취소 가능'
        : '등록 취소 · 차단문 해제',
      480,
      480,
    )
  }
}

export const drawMoonObject = (ctx: CanvasRenderingContext2D, entity: Entity): boolean => {
  if (entity.id !== 'moon-shoes') return false
  ctx.fillStyle = '#c1b296'
  for (let i = 0; i < 4; i++)
    for (const side of [0, 9]) {
      ctx.fillRect(entity.x + i * 20 + side, entity.y, 6, 20)
      ctx.fillRect(entity.x + i * 20 + side, entity.y - 3, 6, 5)
    }
  return true
}

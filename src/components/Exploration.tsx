import { DynamicJoystick } from './DynamicJoystick'
import { defaultComfort } from '../game/comfort'
import type { ComfortSettings } from '../game/comfort'
import { useThreat } from './useThreat'
import { ThreatStatus } from './ThreatStatus'
import type { ThreatSave } from '../game/threat'
import { firstRoomAudio } from '../audio/firstRoomAudio'
import type { View3d } from '../game/firstPerson'
import { gameKey, editingText } from '../game/explorationInput'
import type { Chapter6 } from '../game/chapter6'
import type { Chapter5 } from '../game/chapter5'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  movePlayer,
  nearestEntity,
  getWorld,
  trainAreaLabels,
  moonAreaLabels,
  finalAreaLabels,
} from '../game/world'
import type { Area, Entity, Point } from '../game/world'
import type { Chapter4 } from '../game/chapter4'
import type { Chapter3 } from '../game/chapter3'
import type { Chapter2 } from '../game/engine'
import type { Facing } from '../game/renderWorld'
import { renderWorld } from '../game/renderWorld'

export type ExplorationControls = { resumeAfterUi: () => void }
export type ExplorationProps = {
  comfort?: ComfortSettings
  threat?: ThreatSave
  onThreatAlert?: (alert: boolean) => void
  onCaught?: () => void
  onGateHeard?: () => void
  onRoomBeat?: () => void
  view3d?: View3d | null
  onView3d?: (view: View3d) => void

  controlsRef?: RefObject<ExplorationControls | null>
  area: Area
  chapter3: Chapter3
  chapter4: Chapter4
  chapter5: Chapter5
  chapter6: Chapter6
  power: Chapter2['power']
  staffEvent: Chapter2['staffEvent']
  initialPosition: Point
  paused: boolean
  clues: string[]
  outcome: string | null
  onInteract: (entity: Entity) => void
  onPosition: (position: Point) => void
}
export const Exploration = ({
  comfort,
  threat,
  onThreatAlert,
  onCaught,
  onGateHeard,
  onRoomBeat,
  area,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  power,
  staffEvent,
  initialPosition,
  paused,
  clues,
  outcome,
  onInteract,
  onPosition,
}: ExplorationProps) => {
  const {
    runtime: enemyRuntime,
    advance: advanceThreat,
    mode: threatMode,
  } = useThreat({
    comfort,
    area,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
    power,
    staffEvent,
    initialPosition,
    paused,
    clues,
    outcome,
    onInteract,
    onPosition,
    threat,
    onThreatAlert,
    onCaught,
    onGateHeard,
    onRoomBeat,
  })
  const animation = useRef({ clock: 0, facing: 'down' as Facing, moving: false })
  const canvas = useRef<HTMLCanvasElement>(null)
  const position = useRef(initialPosition)
  const stick = useRef<Point>({ x: 0, y: 0 })
  const [near, setNear] = useState<Entity | null>(null)
  const activate = useRef(() => {})
  useEffect(() => {
    if (paused) onPosition(position.current)
  }, [paused, onPosition])
  useEffect(() => {
    const world = getWorld(
      area,
      chapter3.npc,
      chapter3.npcBoarded,
      power,
      chapter3.doorOpen,
      chapter4,
      chapter5,
      chapter6,
    )
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const element = canvas.current!
    const ctx = element.getContext('2d')!
    activate.current = () => {
      if (paused) return
      const entity = nearestEntity(position.current, world)
      if (entity) {
        onPosition(position.current)
        onInteract(entity)
      }
    }
    const keys = new Set<string>()
    let frame = 0,
      last = 0,
      lastSave = 0
    let nearId: string | null = null
    let width = 960,
      height = 600
    const resize = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width
      height = entries[0].contentRect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.round(width * dpr)
      element.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    })
    resize.observe(element)
    const clear = () => {
      keys.clear()
      stick.current = { x: 0, y: 0 }
      onPosition(position.current)
    }
    const keyboard = (event: KeyboardEvent) => {
      if (
        paused ||
        editingText(event.target) ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return
      const key = gameKey(event)
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e'].includes(key)
      )
        event.preventDefault()
      if (keys.has(key)) return
      keys.add(key)
      if (key === 'e') activate.current()
    }
    const keyup = (event: KeyboardEvent) => {
      if (keys.delete(gameKey(event))) onPosition(position.current)
    }
    const tick = (time: number) => {
      const dt = last ? (time - last) / 1000 : 0
      last = time
      if (!paused && document.visibilityState !== 'hidden' && document.hasFocus()) {
        const direction = {
          x:
            stick.current.x +
            Number(keys.has('d') || keys.has('arrowright')) -
            Number(keys.has('a') || keys.has('arrowleft')),
          y:
            stick.current.y +
            Number(keys.has('s') || keys.has('arrowdown')) -
            Number(keys.has('w') || keys.has('arrowup')),
        }
        const previous = position.current
        const beforeStep = position.current
        position.current = movePlayer(
          position.current,
          direction,
          dt,
          world,
          comfort?.moveSpeed ?? defaultComfort.moveSpeed,
        )
        if (
          [
            'first',
            'hall',
            'electrical',
            'stairs',
            'platform',
            'trainA',
            'trainB',
            'trainRear',
            'trainFront',
            'moonPlatform',
            'moonBooth',
            'moonHolding',
            'maintenance',
            'recovery',
            'shelter',
          ].includes(area)
        )
          firstRoomAudio.travel(
            Math.hypot(position.current.x - beforeStep.x, position.current.y - beforeStep.y),
          )
        animation.current.moving =
          Math.hypot(position.current.x - previous.x, position.current.y - previous.y) > 0.05
        if (direction.x || direction.y)
          animation.current.facing =
            Math.abs(direction.x) > Math.abs(direction.y)
              ? direction.x > 0
                ? 'right'
                : 'left'
              : direction.y > 0
                ? 'down'
                : 'up'
        if (!reducedMotion) animation.current.clock += Math.min(dt, 0.1)
        if (time - lastSave > 400 && (direction.x || direction.y)) {
          onPosition(position.current)
          lastSave = time
        }
      }
      advanceThreat(dt, position.current, world, !paused)
      const entity = nearestEntity(position.current, world)
      if ((entity?.id ?? '') !== nearId) {
        nearId = entity?.id ?? ''
        setNear(entity)
      }
      renderWorld(ctx, width, height, position.current, clues, outcome, entity?.id ?? null, {
        area,
        power,
        staffEvent,
        chapter3,
        chapter4,
        chapter5,
        chapter6,
        threat: enemyRuntime.current,
        ...animation.current,
        moving: !paused && animation.current.moving,
      })
      frame = requestAnimationFrame(tick)
    }
    window.addEventListener('keydown', keyboard)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      keys.clear()
      stick.current = { x: 0, y: 0 }
      window.removeEventListener('keydown', keyboard)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [
    area,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
    power,
    staffEvent,
    paused,
    clues,
    outcome,
    onInteract,
    onPosition,
    advanceThreat,
    enemyRuntime,
    comfort,
  ])
  return (
    <div className={`exploration ${paused ? 'is-paused' : ''}`}>
      <ThreatStatus area={area} mode={threatMode} paused={paused} />
      <canvas
        ref={canvas}
        tabIndex={0}
        onPointerDown={(event) => event.currentTarget.focus()}
        aria-label="탑다운 탐색. WASD 또는 방향키로 이동하고 사물 근처에서 E키로 조사하세요."
      />
      <div className="map-caption">
        <span>
          ⌾ B2 ·{' '}
          {finalAreaLabels[area] ??
            moonAreaLabels[area] ??
            trainAreaLabels[area] ??
            (area === 'first'
              ? '정비 대기실'
              : area === 'hall'
                ? '불 꺼진 대합실'
                : area === 'electrical'
                  ? '전기실'
                  : area === 'platform'
                    ? '누군가 있는 승강장'
                    : area === 'trainA'
                      ? 'A-17 대피 객실'
                      : area === 'trainB'
                        ? 'B-04 비상 객실'
                        : '승강장 계단 앞')}
        </span>
        <span>{paused ? 'Ⅱ 탐색 일시정지' : '● 탐색 중'}</span>
      </div>
      <div className="map-legend">
        {finalAreaLabels[area]
          ? '↑ 현장 기록·장치 · 가까이에서 E / 조사 · 소지품에서 기록 재확인'
          : moonAreaLabels[area]
            ? area === 'moonPlatform'
              ? '↑ 전광판·점검창 · 오른쪽 안내 부스 · 왼쪽 정비 통로'
              : area === 'moonBooth'
                ? '↑ 방송·수신·첨부 기록 · ↓ 승강장'
                : '↑ 활성 등록·내부 해제 안내 · ↓ 승강장 복귀'
            : chapter4.started && trainAreaLabels[area]
              ? area === 'trainB'
                ? '← 선두 패널 · 후방 장치함 → · ↓ 출입문'
                : '↑ 조사 대상 · ↓ 중앙 객실'
              : area === 'hall'
                ? '← 직원 통로 · ↓ 전기실 · 개찰구 →'
                : area === 'electrical'
                  ? '↑ 배전반 · ↓ 대합실'
                  : area === 'stairs'
                    ? 'CHAPTER 03 · 누군가 있는 승강장'
                    : area === 'platform'
                      ? '↑ A-17 / △-1 · B-04 / ◇-2 ↓ · 오른쪽 비상 부스'
                      : area === 'trainA'
                        ? '↑ 운행 중지 안내 · ↓ 승강장 복귀'
                        : area === 'trainB'
                          ? '다음 역: 미확인'
                          : '← 정비문 · 위쪽 벽의 사물을 조사하세요'}
      </div>
      {!paused && (
        <DynamicJoystick
          onStop={() => onPosition(position.current)}
          onMove={(point) => {
            stick.current = point
          }}
          onStart={() => canvas.current?.focus({ preventScroll: true })}
        />
      )}
      <div className="world-controls">
        <div className="interaction">
          <span aria-live="polite">
            {paused
              ? '화면을 닫으면 탐색을 계속합니다'
              : near
                ? `${clues.includes(near.id) ? '✓ 조사 완료 · ' : '⌕ '}${near.label}`
                : '사물이나 인물 가까이 이동하세요'}
          </span>
          <button disabled={paused || !near} onClick={() => activate.current()}>
            <kbd>E</kbd>{' '}
            {near?.kind === 'npc'
              ? '대화'
              : near?.kind === 'door'
                ? '문 확인'
                : near && clues.includes(near.id)
                  ? '단서 재확인'
                  : '조사'}
          </button>
        </div>
      </div>
    </div>
  )
}

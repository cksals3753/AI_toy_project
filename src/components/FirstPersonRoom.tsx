import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import * as T from 'three'
import type { ExplorationProps } from './Exploration'
import { Exploration } from './Exploration'
import { movePlayer, room } from '../game/world'
import type { Entity, Point } from '../game/world'
import { editingText, gameKey } from '../game/explorationInput'
import { clampPitch, firstPersonDirection, FIRST_PERSON_SCALE as SCALE } from '../game/firstPerson'
import { createFirstRoomScene } from '../game/firstRoomScene'

export function FirstPersonRoom(props: ExplorationProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const position = useRef(props.initialPosition)
  const latest = useRef(props)
  const stick = useRef<Point>({ x: 0, y: 0 })
  const joystickPointer = useRef<number | null>(null)
  const lookPointer = useRef<{ id: number; x: number; y: number } | null>(null)
  const angles = useRef({ yaw: 0, pitch: 0 })
  const runtime = useRef({
    active: false,
    clear: () => {},
    reset: () => {},
    interact: () => {},
    resume: () => {},
    unpause: () => {},
  })
  const [active, setActive] = useState(false)
  const [near, setNear] = useState<Entity | null>(null)
  const [knob, setKnob] = useState<Point>({ x: 0, y: 0 })
  const [fallback, setFallback] = useState(false)
  const [lockError, setLockError] = useState('')
  const [assetError, setAssetError] = useState(false)
  useLayoutEffect(() => {
    latest.current = props
  })
  useLayoutEffect(() => {
    if (props.paused) {
      runtime.current.clear()
      if (document.pointerLockElement === canvas.current) document.exitPointerLock()
    } else runtime.current.unpause()
  }, [props.paused])
  useEffect(() => {
    const element = canvas.current
    if (!element || fallback) return
    let renderer: T.WebGLRenderer
    try {
      renderer = new T.WebGLRenderer({
        canvas: element,
        antialias: true,
        powerPreference: 'low-power',
      })
    } catch {
      let cancelled = false
      queueMicrotask(() => {
        if (!cancelled) setFallback(true)
      })
      return () => {
        cancelled = true
      }
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    const world = createFirstRoomScene(() => setAssetError(true))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const camera = new T.PerspectiveCamera(72, 1, 0.05, 40)
    camera.rotation.order = 'YXZ'
    const keys = new Set<string>()
    let frame = 0,
      last = 0,
      lastSave = 0,
      target: Entity | null = null
    let targetId: string | null = null,
      skipLook = true
    const controls = runtime.current
    function resetInputs() {
      keys.clear()
      stick.current = { x: 0, y: 0 }
      joystickPointer.current = null
      lookPointer.current = null
      skipLook = true
      setKnob({ x: 0, y: 0 })
      latest.current.onPosition(position.current)
    }
    function clear() {
      resetInputs()
      controls.active = false
      setActive(false)
    }
    const touchDevice = () =>
      window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    let pendingLock = false
    let disposed = false
    const lockFailed = () => {
      if (disposed) return
      pendingLock = false
      clear()
      setLockError('화면을 클릭하면 탐색을 계속합니다.')
    }
    function interact() {
      if (!controls.active || latest.current.paused || !target) return
      latest.current.onPosition(position.current)
      latest.current.onInteract(target)
    }
    function resume() {
      if (disposed || latest.current.paused || pendingLock) return
      resetInputs()
      setLockError('')
      element!.focus({ preventScroll: true })
      if (touchDevice() || document.pointerLockElement === element) {
        controls.active = true
        setActive(true)
        return
      }
      pendingLock = true
      try {
        const request = element!.requestPointerLock()
        request?.catch(lockFailed).finally(() => {
          pendingLock = false
        })
      } catch {
        lockFailed()
      }
    }
    controls.clear = clear
    controls.reset = resetInputs
    controls.interact = interact
    controls.resume = resume
    controls.unpause = () => {
      resetInputs()
      if (touchDevice()) resume()
    }
    const handle = { resumeAfterUi: resume }
    if (latest.current.controlsRef) latest.current.controlsRef.current = handle
    function lock() {
      pendingLock = false
      clear()
      if (document.pointerLockElement === element) {
        if (latest.current.paused) document.exitPointerLock()
        else {
          controls.active = true
          setActive(true)
        }
      }
    }
    function keydown(event: KeyboardEvent) {
      if (event.code === 'Escape' && document.pointerLockElement === element) {
        document.exitPointerLock()
        clear()
        return
      }
      if (
        latest.current.paused ||
        !controls.active ||
        editingText(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return
      const key = gameKey(event)
      if (
        !['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e'].includes(key)
      )
        return
      event.preventDefault()
      if (event.repeat || keys.has(key)) return
      keys.add(key)
      if (key === 'e') interact()
    }
    function keyup(event: KeyboardEvent) {
      if (keys.delete(gameKey(event))) latest.current.onPosition(position.current)
    }
    function mouse(event: MouseEvent) {
      if (latest.current.paused || !controls.active || document.pointerLockElement !== element)
        return
      if (skipLook) {
        skipLook = false
        return
      }
      // Ignore a discontinuity on lock / browser focus restoration.
      if (Math.abs(event.movementX) > 500 || Math.abs(event.movementY) > 500) return
      angles.current.yaw -= event.movementX * 0.0025
      angles.current.pitch = clampPitch(angles.current.pitch - event.movementY * 0.0025)
    }
    const resize = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect()
      renderer.setSize(bounds.width, bounds.height, false)
      camera.aspect = bounds.width / Math.max(1, bounds.height)
      camera.updateProjectionMatrix()
    })
    resize.observe(element)
    function tick(time: number) {
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0
      last = time
      if (!latest.current.paused && controls.active && document.visibilityState !== 'hidden') {
        const local = {
          x:
            stick.current.x +
            Number(keys.has('d') || keys.has('arrowright')) -
            Number(keys.has('a') || keys.has('arrowleft')),
          y:
            stick.current.y +
            Number(keys.has('s') || keys.has('arrowdown')) -
            Number(keys.has('w') || keys.has('arrowup')),
        }
        position.current = movePlayer(
          position.current,
          firstPersonDirection(local, angles.current.yaw),
          dt,
          room,
        )
        if (time - lastSave > 400 && (local.x || local.y)) {
          latest.current.onPosition(position.current)
          lastSave = time
        }
      }
      camera.position.set(
        (position.current.x - 480) / SCALE,
        1.55,
        (position.current.y - 310) / SCALE,
      )
      camera.rotation.set(angles.current.pitch, angles.current.yaw, 0, 'YXZ')
      camera.updateMatrixWorld()
      if (import.meta.env.DEV) {
        element!.dataset.yaw = String(angles.current.yaw)
        element!.dataset.pitch = String(angles.current.pitch)
      }
      target = world.target(camera)
      if ((target?.id ?? null) !== targetId) {
        targetId = target?.id ?? null
        setNear(target)
      }
      world.highlight(targetId)
      world.animate(
        latest.current.outcome === 'escaped' || latest.current.outcome === 'injured',
        dt,
        reducedMotion,
      )
      if (document.visibilityState !== 'hidden') renderer.render(world.scene, camera)
      frame = requestAnimationFrame(tick)
    }
    const visibility = () => {
      clear()
      if (document.pointerLockElement === element) document.exitPointerLock()
    }
    const lost = (event: Event) => {
      event.preventDefault()
      clear()
      setFallback(true)
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('mousemove', mouse)
    window.addEventListener('blur', visibility)
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('pointerlockchange', lock)
    document.addEventListener('pointerlockerror', lockFailed)
    element.addEventListener('webglcontextlost', lost)
    frame = requestAnimationFrame(tick)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('mousemove', mouse)
      window.removeEventListener('blur', visibility)
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('pointerlockchange', lock)
      document.removeEventListener('pointerlockerror', lockFailed)
      if (latest.current.controlsRef?.current === handle) latest.current.controlsRef.current = null
      element.removeEventListener('webglcontextlost', lost)
      if (document.pointerLockElement === element) document.exitPointerLock()
      keys.clear()
      controls.active = false
      controls.resume =
        controls.interact =
        controls.clear =
        controls.reset =
        controls.unpause =
          () => {}
      world.dispose()
      renderer.dispose()
    }
  }, [fallback])
  function dragStick(event: PointerEvent<HTMLDivElement>) {
    if (joystickPointer.current !== event.pointerId || props.paused || !runtime.current.active)
      return
    const bounds = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - bounds.left - bounds.width / 2,
      dy = event.clientY - bounds.top - bounds.height / 2
    const length = Math.hypot(dx, dy),
      limit = 33
    const point = { x: dx / Math.max(limit, length), y: dy / Math.max(limit, length) }
    stick.current = length < 5 ? { x: 0, y: 0 } : point
    setKnob({ x: point.x * limit, y: point.y * limit })
  }
  function releaseStick() {
    joystickPointer.current = null
    stick.current = { x: 0, y: 0 }
    setKnob({ x: 0, y: 0 })
    props.onPosition(position.current)
  }
  if (fallback)
    return (
      <>
        <p className="renderer-notice">3D를 사용할 수 없어 2D 탐색으로 이어갑니다.</p>
        <Exploration {...props} initialPosition={props.initialPosition} />
      </>
    )
  return (
    <div className={`exploration first-person ${props.paused ? 'is-paused' : ''}`}>
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label="1인칭 정비 대기실. 클릭 후 WASD 이동, 마우스 시점, E 상호작용, Esc 잠금 해제."
        onPointerDown={(event) => {
          if (props.paused || (event.pointerType === 'mouse' && event.button !== 0)) return
          if (!runtime.current.active) {
            runtime.current.resume()
            return // Consume this gesture: do not investigate or start a look drag.
          }
          if (event.pointerType === 'mouse') {
            if (event.button === 0) runtime.current.interact()
            return
          }
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left + bounds.width * 0.4) return
          lookPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const look = lookPointer.current
          if (!look || look.id !== event.pointerId || props.paused || !runtime.current.active)
            return
          angles.current.yaw -= (event.clientX - look.x) * 0.006
          angles.current.pitch = clampPitch(angles.current.pitch - (event.clientY - look.y) * 0.006)
          lookPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
        }}
        onPointerUp={() => {
          lookPointer.current = null
        }}
        onPointerCancel={() => {
          lookPointer.current = null
        }}
        onLostPointerCapture={() => {
          lookPointer.current = null
        }}
      />
      <div className="map-caption">
        <span>⌾ B2 · 정비 대기실 / 1인칭</span>
        <span>{props.paused ? 'Ⅱ 일시정지' : active ? '● 탐색 중' : '클릭으로 탐색 복귀'}</span>
      </div>
      {!props.paused && !active && (
        <div className="exploration-resume" role="status">
          <strong>화면을 클릭하면 탐색을 계속합니다</strong>
          <span className="pc-input-help">
            PC · WASD 이동 / 마우스 시점 / E 조사
            <br />
            Tab 휴대폰 / I 소지품·단서 / Esc 닫기·해제
          </span>
          <span className="touch-input-help">
            모바일 · 왼쪽 이동 / 오른쪽 드래그 시점 / 휴대폰·소지품 버튼
          </span>
        </div>
      )}
      {!props.paused && active && (
        <div className={`crosshair ${near ? 'has-target' : ''}`} aria-hidden="true">
          {near ? '⊕' : '·'}
        </div>
      )}
      {lockError && <span className="asset-warning">마우스 잠금: {lockError}</span>}
      {assetError && (
        <span className="asset-warning">일부 소품 로딩 실패 · 조사와 진행은 가능합니다</span>
      )}
      <div className="world-controls" style={{ visibility: active ? undefined : 'hidden' }}>
        <div
          className="joystick"
          role="group"
          aria-label="이동 조이스틱"
          onPointerDown={(event) => {
            if (props.paused || !active || joystickPointer.current !== null) return
            joystickPointer.current = event.pointerId
            event.currentTarget.setPointerCapture(event.pointerId)
            dragStick(event)
          }}
          onPointerMove={dragStick}
          onPointerUp={releaseStick}
          onPointerCancel={releaseStick}
          onLostPointerCapture={releaseStick}
        >
          <span className="joystick-ring" />
          <span
            className="joystick-knob"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          />
          <small>이동</small>
        </div>
        <div className="interaction">
          <span aria-live="polite">
            {near
              ? `${props.clues.includes(near.id) ? '✓ 조사 완료 · ' : '⌕ 선택 대상 · '}${near.label}`
              : '중앙 조준점을 가까운 사물에 맞추세요'}
          </span>
          <button
            disabled={props.paused || !active || !near}
            onClick={() => runtime.current.interact()}
          >
            <kbd>E</kbd>{' '}
            {near?.kind === 'npc'
              ? '대화'
              : near?.kind === 'door'
                ? '문 확인'
                : near && props.clues.includes(near.id)
                  ? '단서 재확인'
                  : '조사'}
          </button>
        </div>
      </div>
    </div>
  )
}

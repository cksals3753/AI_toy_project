import { DynamicJoystick } from './DynamicJoystick'
import { cameraFov, defaultComfort, touchLookScale } from '../game/comfort'
import { useThreat } from './useThreat'
import { ThreatStatus } from './ThreatStatus'
import { createThreatVisual } from '../game/threatVisual'
import { firstRoomAudio } from '../audio/firstRoomAudio'
import { trackRendererLookup } from '../game/rendererResources'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as T from 'three'
import type { ExplorationProps } from './Exploration'
import { Exploration } from './Exploration'
import { movePlayer, getWorld } from '../game/world'
import type { Entity, Point } from '../game/world'
import { editingText, gameKey } from '../game/explorationInput'
import {
  clampPitch,
  firstPersonDirection,
  isImmersiveArea,
  sceneScale,
  toWorldPosition,
} from '../game/firstPerson'
import { createFirstRoomScene } from '../game/firstRoomScene'
import { createChapter2Scene, chapter2AreaNames } from '../game/chapter2Scene'
import { createChapter3Scene, chapter3AreaNames } from '../game/chapter3Scene'
import { createTrainScene, trainAreaNames } from '../game/trainScene'
import { createMoonScene, moonSceneNames } from '../game/moonScene'
import { createFinalScene, finalSceneNames } from '../game/finalScene'
import { normalizeView3d, makeView3d } from '../game/view3d'

export const FirstPersonExploration = (props: ExplorationProps) => {
  const { advance: advanceThreat, mode: threatMode } = useThreat(props)
  const area = isImmersiveArea(props.area) ? props.area : 'first'
  const SCALE = sceneScale(area)
  const savedView = normalizeView3d(
    props.view3d,
    area,
    props.power,
    props.chapter3,
    props.chapter4,
    props.chapter5,
    props.chapter6,
  )
  const initialPoint = savedView
    ? toWorldPosition(savedView.position, area)
    : area === 'first' || props.view3d
      ? props.initialPosition
      : getWorld(
          area,
          props.chapter3.npc,
          props.chapter3.npcBoarded,
          props.power,
          props.chapter3.doorOpen,
          props.chapter4,
          props.chapter5,
          props.chapter6,
        ).spawn
  const canvas = useRef<HTMLCanvasElement>(null)
  const position = useRef(initialPoint)
  const latest = useRef(props)
  const stick = useRef<Point>({ x: 0, y: 0 })
  const lookPointer = useRef<{ id: number; x: number; y: number } | null>(null)
  const angles = useRef({
    yaw: savedView?.yaw ?? (area === 'platform' ? -1.45 : 0),
    pitch: savedView?.pitch ?? 0,
  })
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
  const [fallback, setFallback] = useState(false)
  const [lockError, setLockError] = useState('')
  const [assetError, setAssetError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const persist = () =>
    latest.current.onView3d
      ? latest.current.onView3d(
          makeView3d(area, position.current, angles.current.yaw, angles.current.pitch),
        )
      : latest.current.onPosition(position.current)
  const persistRef = useRef(persist)
  useLayoutEffect(() => {
    persistRef.current = persist
  })
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
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5,
      ),
    )
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    const world =
      area === 'first'
        ? createFirstRoomScene(() => setAssetError(true))
        : area === 'hall' || area === 'electrical' || area === 'stairs'
          ? createChapter2Scene(area, () => setAssetError(true))
          : area === 'platform' || area === 'trainA'
            ? createChapter3Scene(area, latest.current.chapter3, () => setAssetError(true))
            : area === 'trainB' || area === 'trainRear' || area === 'trainFront'
              ? createTrainScene(area, latest.current.chapter3, latest.current.chapter4, () =>
                  setAssetError(true),
                )
              : area === 'moonPlatform' || area === 'moonBooth' || area === 'moonHolding'
                ? createMoonScene(
                    area,
                    latest.current.chapter3.npcBoarded,
                    latest.current.chapter5,
                    () => setAssetError(true),
                  )
                : createFinalScene(
                    area,
                    latest.current.chapter3.npcBoarded,
                    latest.current.chapter6,
                    () => setAssetError(true),
                  )
    const threatVisual = createThreatVisual(world.scene, area)
    const releaseRendererLookup = trackRendererLookup(world.scene)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
    camera.rotation.order = 'YXZ'
    const keys = new Set<string>()
    let frame = 0,
      last = 0,
      lastSave = 0,
      target: Entity | null = null
    let targetId: string | null = null,
      skipLook = true
    const controls = runtime.current
    const resetInputs = () => {
      keys.clear()
      stick.current = { x: 0, y: 0 }
      lookPointer.current = null
      skipLook = true
      persistRef.current()
    }
    const clear = () => {
      resetInputs()
      controls.active = false
      setActive(false)
    }
    const touchDevice = () =>
      window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    let ready = false
    let pendingLock = false
    let disposed = false
    const lockFailed = () => {
      if (disposed) return
      pendingLock = false
      clear()
      setLockError('화면을 클릭하면 탐색을 계속합니다.')
    }
    const interact = () => {
      if (!ready || !controls.active || latest.current.paused || !target) return
      persistRef.current()
      latest.current.onInteract(target)
    }
    const resume = () => {
      if (disposed || !ready || latest.current.paused || pendingLock) return
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
    let settleTimer: ReturnType<typeof setTimeout>
    let loadTimer: ReturnType<typeof setTimeout>
    Promise.race([
      world.ready,
      new Promise<never>((_, reject) => {
        loadTimer = setTimeout(() => reject(new Error('공간 로딩 시간 초과')), 8000)
      }),
    ])
      .then(() => {
        if (!disposed) {
          setActive(false)
          targetId = null
          setNear(null)
          setLoading(false)
          setLoadError(false)
          persistRef.current()
          settleTimer = setTimeout(() => {
            if (disposed) return
            ready = true
            setSettling(false)
            resetInputs()
            if (touchDevice() && !latest.current.paused) resume()
          }, 240)
        }
      })
      .catch(() => {
        if (!disposed) {
          clear()
          setLoading(false)
          setLoadError(true)
        }
      })
      .finally(() => clearTimeout(loadTimer))
    const handle = { resumeAfterUi: resume }
    if (latest.current.controlsRef) latest.current.controlsRef.current = handle
    const lock = () => {
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
    const keydown = (event: KeyboardEvent) => {
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
    const keyup = (event: KeyboardEvent) => {
      if (keys.delete(gameKey(event))) persistRef.current()
    }
    const mouse = (event: MouseEvent) => {
      if (latest.current.paused || !controls.active || document.pointerLockElement !== element)
        return
      if (skipLook) {
        skipLook = false
        return
      }
      // Ignore a discontinuity on lock / browser focus restoration.
      if (Math.abs(event.movementX) > 500 || Math.abs(event.movementY) > 500) return
      angles.current.yaw -=
        event.movementX * (latest.current.comfort ?? defaultComfort).mouseSensitivity
      angles.current.pitch = clampPitch(
        angles.current.pitch -
          event.movementY * (latest.current.comfort ?? defaultComfort).mouseSensitivity,
      )
    }
    const resize = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect()
      renderer.setSize(bounds.width, bounds.height, false)
      camera.aspect = bounds.width / Math.max(1, bounds.height)
      camera.updateProjectionMatrix()
    })
    resize.observe(element)
    const tick = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0
      last = time
      if (
        !latest.current.paused &&
        ready &&
        controls.active &&
        document.visibilityState !== 'hidden'
      ) {
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
        const beforeStep = position.current
        position.current = movePlayer(
          position.current,
          firstPersonDirection(local, angles.current.yaw),
          dt,
          getWorld(
            area,
            latest.current.chapter3.npc,
            latest.current.chapter3.npcBoarded,
            latest.current.power,
            latest.current.chapter3.doorOpen,
            latest.current.chapter4,
            latest.current.chapter5,
            latest.current.chapter6,
          ),
          (latest.current.comfort ?? defaultComfort).moveSpeed,
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
        if (time - lastSave > 400) {
          persistRef.current()
          lastSave = time
        }
      }
      const threatWorld = getWorld(
        area,
        latest.current.chapter3.npc,
        latest.current.chapter3.npcBoarded,
        latest.current.power,
        latest.current.chapter3.doorOpen,
        latest.current.chapter4,
        latest.current.chapter5,
        latest.current.chapter6,
      )
      const threatActive =
        ready &&
        controls.active &&
        !latest.current.paused &&
        document.hasFocus() &&
        document.visibilityState !== 'hidden'
      const enemy = advanceThreat(dt, position.current, threatWorld, threatActive)
      threatVisual.update(
        enemy,
        dt,
        threatActive,
        latest.current.threat?.roomBeat ?? 0,
        reducedMotion,
      )
      if (import.meta.env.DEV && area === 'hall') {
        element!.dataset.threatGait = String(world.scene.userData.threatGait ?? 0)
        element!.dataset.threatMode = enemy.mode
        element!.dataset.threatX = String(enemy.position.x)
        element!.dataset.threatY = String(enemy.position.y)
      }
      camera.position.set(
        (position.current.x - 480) / SCALE,
        1.5,
        (position.current.y - 310) / SCALE,
      )
      camera.rotation.set(angles.current.pitch, angles.current.yaw, 0, 'YXZ')
      const nextFov = cameraFov((latest.current.comfort ?? defaultComfort).fov, camera.aspect)
      if (camera.fov !== nextFov) {
        camera.fov = nextFov
        camera.updateProjectionMatrix()
      }
      camera.updateMatrixWorld()
      if (import.meta.env.DEV) {
        element!.dataset.cameraFov = String(camera.fov)
        element!.dataset.yaw = String(angles.current.yaw)
        element!.dataset.pitch = String(angles.current.pitch)
      }
      target = world.target(camera)
      if ((target?.id ?? null) !== targetId) {
        targetId = target?.id ?? null
        setNear(target)
      }
      world.highlight(targetId)
      if ('updateFinal' in world) world.updateFinal(latest.current.chapter6, dt, reducedMotion)
      else if ('updateMoon' in world) world.updateMoon(latest.current.chapter5, dt, reducedMotion)
      else if ('updateTrain' in world)
        world.updateTrain(latest.current.chapter3, latest.current.chapter4, dt, reducedMotion)
      else if ('updateChapter3' in world)
        world.updateChapter3(latest.current.chapter3, dt, reducedMotion)
      else if ('update' in world)
        world.update(latest.current.power, latest.current.staffEvent, dt, reducedMotion)
      else
        world.animate(
          latest.current.outcome === 'escaped' || latest.current.outcome === 'injured',
          dt,
          reducedMotion,
        )
      if (document.visibilityState !== 'hidden') renderer.render(world.scene, camera)
      if (import.meta.env.DEV) {
        element!.dataset.drawCalls = String(renderer.info.render.calls)
        element!.dataset.triangles = String(renderer.info.render.triangles)
        element!.dataset.shadows = String(renderer.shadowMap.enabled)
        element!.dataset.npcModel = String(world.scene.userData.ohModel === true)
        element!.dataset.npcIdle = String(world.scene.userData.ohIdle === true)
        element!.dataset.area = area
        element!.dataset.lightsOn = String(world.scene.userData.lightsOn === true)
        element!.dataset.doorOpen = String(world.scene.userData.doorOpen === true)
        element!.dataset.npcCount = String(world.scene.userData.npcCount ?? 0)
        element!.dataset.travel = String(world.scene.userData.travel ?? 0)
        element!.dataset.trainStatus = String(world.scene.userData.trainStatus ?? '')
        element!.dataset.signal = String(world.scene.userData.signal ?? '')
        element!.dataset.gateOpen = String(world.scene.userData.gateOpen === true)
      }
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
      clearTimeout(loadTimer)
      clearTimeout(settleTimer)
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
      releaseRendererLookup()
      threatVisual.dispose()
      world.dispose()
      renderer.dispose()
    }
  }, [fallback, revision, area, SCALE, advanceThreat])
  if (fallback)
    return (
      <>
        <p className="renderer-notice">3D를 사용할 수 없어 2D 탐색으로 이어갑니다.</p>
        <Exploration {...props} initialPosition={props.initialPosition} />
      </>
    )
  return (
    <div className={`exploration first-person ${props.paused ? 'is-paused' : ''}`}>
      {!loading && settling && <div className="area-settle" aria-hidden="true" />}
      <ThreatStatus area={area} mode={threatMode} paused={props.paused || !active} />
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label={`1인칭 ${area === 'first' ? '정비 대기실' : { ...chapter2AreaNames, ...chapter3AreaNames, ...trainAreaNames, ...moonSceneNames, ...finalSceneNames }[area]}. 클릭 후 WASD 이동, 마우스 시점, E 상호작용, Esc 잠금 해제.`}
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
          const bounds = event.currentTarget.getBoundingClientRect()
          const sensitivity =
            (props.comfort ?? defaultComfort).touchSensitivity *
            touchLookScale(bounds.width, bounds.height)
          angles.current.yaw -= (event.clientX - look.x) * sensitivity
          angles.current.pitch = clampPitch(
            angles.current.pitch - (event.clientY - look.y) * sensitivity,
          )
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
        <span>
          ⌾ B2 ·{' '}
          {area === 'first'
            ? '정비 대기실'
            : {
                ...chapter2AreaNames,
                ...chapter3AreaNames,
                ...trainAreaNames,
                ...moonSceneNames,
                ...finalSceneNames,
              }[area]}{' '}
          / 1인칭
        </span>
        <span>{props.paused ? 'Ⅱ 일시정지' : active ? '● 탐색 중' : '클릭으로 탐색 복귀'}</span>
      </div>
      {(loading || (settling && !loadError)) && (
        <div className="renderer-notice" data-scene-loading role="status">
          공간 준비 중 · 이동 및 조사 대기
        </div>
      )}
      {loadError && (
        <div className="renderer-notice" role="alert">
          <p>필수 인물 에셋을 불러오지 못했어요. 진행은 저장되어 있습니다.</p>
          <button
            onClick={() => {
              setLoadError(false)
              setAssetError(false)
              setLoading(true)
              setSettling(true)
              setRevision((v) => v + 1)
            }}
          >
            다시 시도
          </button>
          <button onClick={() => setFallback(true)}>2D로 계속하기</button>
        </div>
      )}
      {!loadError && !loading && !settling && !props.paused && !active && (
        <div className="exploration-resume" role="status">
          <span>클릭하여 탐색 계속</span>
        </div>
      )}
      {!props.paused && active && (
        <div className={`crosshair ${near ? 'has-target' : ''}`} aria-hidden="true">
          {near ? '⊕' : '·'}
        </div>
      )}
      {lockError && <span className="asset-warning">마우스 잠금: {lockError}</span>}
      {assetError && (
        <span className="asset-warning">
          일부 소품 로딩 실패 · 기본 시설로 진행 가능{' '}
          <button
            onClick={() => {
              setAssetError(false)
              setLoading(true)
              setSettling(true)
              setRevision((v) => v + 1)
            }}
          >
            소품 재시도
          </button>
        </span>
      )}
      {active && !loading && !settling && !props.paused && (
        <DynamicJoystick
          onStop={() => persistRef.current()}
          onMove={(point) => {
            stick.current = point
          }}
          onStart={() => canvas.current?.focus({ preventScroll: true })}
        />
      )}
      <div
        className="world-controls"
        style={{ visibility: active && !loading ? undefined : 'hidden' }}
      >
        <div className="interaction">
          <span aria-live="polite">
            {near
              ? `${props.clues.includes(near.id) ? '✓ 조사 완료 · ' : '⌕ 선택 대상 · '}${near.label}`
              : '중앙 조준점을 가까운 사물에 맞추세요'}
          </span>
          <button
            disabled={loadError || loading || props.paused || !active || !near}
            onClick={() => runtime.current.interact()}
          >
            <kbd>E</kbd> {near ? `${near.label} ` : ''}
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

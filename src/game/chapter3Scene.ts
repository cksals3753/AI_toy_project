import { raisedTrim, trainWindow } from './sceneFixtures'
import * as T from 'three'
import { getWorld } from './world'
import type { Rect } from './world'
import { trains } from './chapter3'
import type { Chapter3 } from './chapter3'
import { sceneScale } from './firstPerson'
import { createSceneTarget, disposeSceneObject } from './sceneInteraction'
import { loadOhModel } from './ohModel'

export const chapter3AreaNames = {
  platform: '신도림 · 두 열차의 승강장',
  trainA: '열차 A · 대기·대피 객실',
} as const

export const createChapter3Scene = (
  area: keyof typeof chapter3AreaNames,
  initial: Chapter3,
  onError: () => void,
) => {
  const scale = sceneScale(area)
  const scene = new T.Scene()
  scene.background = new T.Color('#111b23')
  scene.fog = new T.FogExp2('#111b23', 0.018)
  const interactables: T.Object3D[] = [],
    blockers: T.Object3D[] = []
  const material = (color: string, emission = false) =>
    new T.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.12,
      ...(emission ? { emissive: color, emissiveIntensity: 0.7 } : {}),
    })
  const stone = material('#445158'),
    metal = material('#78888b'),
    dark = material('#1c2b34')
  const warm = material('#b5a487'),
    amber = material('#d2b071', true)
  const box = (r: Rect, height: number, m: T.Material, bottom = 0, solid = false) => {
    const mesh = new T.Mesh(new T.BoxGeometry(r.w / scale, height, r.h / scale), m)
    mesh.position.set(
      (r.x + r.w / 2 - 480) / scale,
      bottom + height / 2,
      (r.y + r.h / 2 - 310) / scale,
    )
    scene.add(mesh)
    if (solid) blockers.push(mesh)
    return mesh
  }
  const sign = (text: string, x: number, y: number, height = 1.7, width = 2.1, rotation = 0) => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 256
    const c = canvas.getContext('2d')!
    c.fillStyle = '#182b32'
    c.fillRect(0, 0, 768, 256)
    c.strokeStyle = '#9fac9f'
    c.lineWidth = 6
    c.strokeRect(4, 4, 760, 248)
    c.fillStyle = '#e1dfc6'
    c.textAlign = 'center'
    c.font = 'bold 37px sans-serif'
    const lines = text.split('\n')
    lines.forEach((line, i) => c.fillText(line, 384, 125 - (lines.length - 1) * 27 + i * 55, 740))
    const texture = new T.CanvasTexture(canvas)
    texture.colorSpace = T.SRGBColorSpace
    const mesh = new T.Mesh(
      new T.PlaneGeometry(width, width / 3),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    )
    mesh.position.set((x - 480) / scale, height, (y - 310) / scale)
    mesh.rotation.y = rotation
    scene.add(mesh)
    return mesh
  }
  box({ x: 54, y: 70, w: 852, h: 480 }, 0.12, stone, -0.12)
  box({ x: 44, y: 60, w: 872, h: 500 }, 0.1, dark, 3.8)
  for (const r of [
    { x: 44, y: 60, w: 872, h: 10 },
    { x: 44, y: 550, w: 872, h: 10 },
    { x: 44, y: 70, w: 10, h: 480 },
    { x: 906, y: 70, w: 10, h: 480 },
  ])
    box(r, 3.8, stone, 0, true)
  for (let x = 60; x < 905; x += 80) box({ x, y: 70, w: 1, h: 480 }, 0.003, dark)
  scene.add(new T.HemisphereLight('#c1d3dc', '#343c35', 1.9))
  for (const [x, z] of [
    [-5, -2],
    [4, -1],
    [3, 3],
  ]) {
    const light = new T.PointLight('#d2d7bd', 32, 17, 2)
    light.position.set(x, 3.2, z)
    scene.add(light)
    const lamp = new T.Mesh(new T.BoxGeometry(1.7, 0.06, 0.18), amber)
    lamp.position.copy(light.position)
    scene.add(lamp)
  }
  const currentLayout = (c: Chapter3) => {
    const world = getWorld(area, c.npc, c.npcBoarded, [], c.doorOpen)
    return world
  }
  let layout = currentLayout(initial)
  // Every solid footprint comes from the authoritative world, including the inaccessible rails.
  for (const r of layout.obstacles) {
    const train = area === 'platform' && (r.y === 75 || r.y >= 483)
    if (train) {
      box(r, 2.65, r.y === 75 ? warm : metal, 0, true)
      for (let x = r.x + 10; x < r.x + r.w - 30; x += 55) {
        box(trainWindow(r, x), 0.55, dark, 1.25)
      }
    } else if (area === 'platform' && r.h === 6) {
      box(r, 1.05, metal, 0, true)
    } else if (area === 'platform' && r.w < 50) {
      box(r, 3.8, stone, 0, true)
      box(raisedTrim(r), 0.12, warm, 1.1)
    } else {
      box(r, 0.48, dark, 0, true)
      box({ ...r, h: 7 }, 0.42, metal, 0.48)
    }
  }
  let survivor: ReturnType<typeof loadOhModel> | null = null
  let survivorProxy: T.Mesh | null = null
  let bDoor: T.Mesh | null = null
  let signal: T.Mesh | null = null
  const dress: T.Mesh[] = []
  for (const e of layout.entities) {
    const h = e.kind === 'npc' ? 1.75 : 2.4
    const proxy = box(e, h, new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }))
    proxy.userData.entityId = e.id
    interactables.push(proxy)
    const x = e.x + e.w / 2,
      y = e.y + e.h / 2
    if (e.id === 'survivor') {
      survivorProxy = proxy
      survivor = loadOhModel(
        scene,
        new T.Vector3((x - 480) / scale, 0, (y - 310) / scale),
        onError,
        'survivor',
      )
      // The portrait's head dressing and injured ankle distinguish this person from Oh.
      dress.push(box({ x: x - 7, y: y - 4, w: 14, h: 8 }, 0.1, warm, 1.53))
      dress.push(box({ x: x + 4, y: y - 4, w: 7, h: 8 }, 0.12, warm, 0.15))
    } else if (e.id === 'train-a' || e.id === 'train-b') {
      const a = e.id === 'train-a'
      // Doors sit in a cutout in the vehicle body; an open door leaves no collision slab.
      bDoor = a ? bDoor : box(e, 2.25, metal)
      if (a) {
        box({ ...e, w: 5 }, 2.5, metal)
        box({ ...e, x: e.x + e.w - 5, w: 5 }, 2.5, metal)
        box(e, 0.1, amber, 2.4)
      }
      sign(
        `${trains[a ? 0 : 1].id} / ${trains[a ? 0 : 1].track}\n${a ? '대기 · 운행 중지' : '비상 호출 / 승인 필요'}`,
        x,
        a ? e.y + e.h + 1 : e.y - 1,
        2.65,
        2.4,
        a ? 0 : Math.PI,
      )
    } else if (e.id === 'platform-stairs') {
      box(e, 0.9, stone)
      for (let i = 0; i < 5; i++) box({ ...e, x: e.x + i * 5, w: 5 }, 0.12 + i * 0.12, metal, 0.9)
      sign('B2 대합실 ↑\n진입 계단', x, y, 2.4, 1.6, Math.PI / 2)
    } else {
      const door = e.kind === 'door'
      box(e, door ? 2.35 : e.id === 'platform-record' ? 2.1 : 1.15, dark)
      const texts: Record<string, string> = {
        'platform-record': `역무 비상 부스\n오늘 운행 ${trains[1].id} / ${trains[1].track}`,
        approval: '비상 운행 승인\n차량 / 선로 대조',
        'platform-signal': `${trains[0].track} / ${trains[1].track}\n출발 신호`,
        'call-b': `${trains[1].id}\n비상 호출`,
        'front-b': `${trains[1].id} 선두\n출발 확인`,
        'train-a-stop': `${trains[0].id} 운행 중지\n견인 전원 차단 / 운전실 잠김`,
        'exit-a': '승강장\nPLATFORM',
      }
      sign(
        texts[e.id] ?? e.label,
        x,
        e.y + (e.y > 500 ? -1 : e.h + 1),
        door ? 1.8 : 0.85,
        Math.max(1, e.w / scale),
        e.y > 500 ? Math.PI : 0,
      )
      if (e.id === 'platform-signal') {
        signal = box(
          { x: e.x + 25, y: e.y + 10, w: 20, h: 15 },
          0.25,
          material('#b45246', true),
          1.65,
        )
      }
    }
  }
  if (area === 'platform') {
    sign('신도림 · SINDORIM\n승강장 / 비상 운행', 480, 72, 2.9, 2.8)
    for (const y of [170, 470]) {
      box({ x: 80, y, w: 790, h: 4 }, 0.007, warm)
      const train = trains[y === 170 ? 0 : 1]
      sign(`${train.track} / ${train.id}`, 410, y, 0.35, 2)
    }
  }
  let target = createSceneTarget(layout, scale, interactables, blockers)
  let relocation: {
    destination: T.Vector3
    delta: T.Vector3
    elapsed: number
    moved: boolean
  } | null = null
  let previousNpc = ''
  let previousDoor: boolean | null = null
  return {
    scene,
    ready: survivor?.ready ?? Promise.resolve(),
    target: (camera: T.Camera) => target(camera),
    highlight: (..._args: [string | null]) => {
      void _args // HUD identifies the aimed facility.
    },
    updateChapter3: (c: Chapter3, dt: number, reduced: boolean) => {
      if (c.npc !== previousNpc || c.doorOpen !== previousDoor) {
        const next = currentLayout(c)
        const e = next.entities.find((e) => e.id === 'survivor')
        if (e && survivorProxy) {
          const p = new T.Vector3((e.x + e.w / 2 - 480) / scale, 0, (e.y + e.h / 2 - 310) / scale)
          const delta = p
            .clone()
            .sub(new T.Vector3(survivorProxy.position.x, 0, survivorProxy.position.z))
          if (delta.lengthSq() > 0) relocation = { destination: p, delta, elapsed: 0, moved: false }
          survivorProxy.position.x = p.x
          survivorProxy.position.z = p.z
        }
        layout = next
        target = createSceneTarget(layout, scale, interactables, blockers)
        previousNpc = c.npc
        previousDoor = c.doorOpen
      }
      if (relocation) {
        // During the existing help/invitation dialogue, fade a single actor between fixed seats.
        relocation.elapsed += dt
        const alpha = Math.min(1, Math.abs(relocation.elapsed - 0.22) / 0.22)
        if (relocation.elapsed >= 0.22 && !relocation.moved) {
          survivor?.relocate(relocation.destination)
          dress.forEach((o) => o.position.add(relocation!.delta))
          relocation.moved = true
        }
        survivor?.opacity(alpha)
        dress.forEach((o) => {
          o.visible = alpha > 0.7
        })
        if (relocation.elapsed >= 0.44) {
          survivor?.opacity(1)
          dress.forEach((o) => {
            o.visible = true
          })
          relocation = null
        }
      }
      if (bDoor) {
        bDoor.visible = !c.doorOpen
        bDoor.position.y = c.doorOpen ? 3.5 : 1.125
      }
      if (signal) {
        const m = signal.material as T.MeshStandardMaterial
        m.color.set(c.signal === 'green' ? '#91bba0' : '#b45246')
        m.emissive.copy(m.color)
      }
      scene.userData.doorOpen = c.doorOpen
      scene.userData.signal = c.signal
      survivor?.update(dt, reduced)
      scene.updateMatrixWorld(true)
    },
    dispose: () => {
      survivor?.dispose()
      disposeSceneObject(scene)
    },
  }
}

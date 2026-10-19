import { addNpcChair } from './sceneFixtures'
import * as T from 'three'
import { getWorld } from './world'
import type { Rect } from './world'
import type { Chapter6 } from './chapter6'
import { sceneScale } from './firstPerson'
import { createSceneTarget, disposeSceneObject } from './sceneInteraction'
import { loadOhModel } from './ohModel'

export const finalSceneNames = {
  maintenance: 'D-02 · 정비 통로 분기실',
  recovery: 'G-01 · 내부 복구 구역',
  shelter: '지상 대피소 내부',
} as const

export const createFinalScene = (
  area: keyof typeof finalSceneNames,
  companion: boolean,
  initial: Chapter6,
  onError: () => void,
) => {
  const scale = sceneScale(area),
    scene = new T.Scene(),
    shelter = area === 'shelter'
  scene.background = new T.Color(shelter ? '#526361' : '#111b23')
  scene.fog = new T.FogExp2(shelter ? '#526361' : '#111b23', shelter ? 0.008 : 0.025)
  const interactables: T.Object3D[] = [],
    blockers: T.Object3D[] = []
  const mat = (color: string, emissive = false) =>
    new T.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.12,
      ...(emissive ? { emissive: color, emissiveIntensity: 0.65 } : {}),
    })
  const stone = mat(shelter ? '#64736d' : '#445158'),
    metal = mat('#78888b'),
    dark = mat('#1c2b34'),
    warm = mat('#b5a487'),
    glow = mat('#d2b071', true)
  const box = (r: Rect, h: number, m: T.Material, bottom = 0, solid = false) => {
    const mesh = new T.Mesh(new T.BoxGeometry(r.w / scale, h, r.h / scale), m)
    mesh.position.set((r.x + r.w / 2 - 480) / scale, bottom + h / 2, (r.y + r.h / 2 - 310) / scale)
    scene.add(mesh)
    if (solid) blockers.push(mesh)
    return mesh
  }
  const label = (
    initial: string,
    x: number,
    y: number,
    height: number,
    width: number,
    rotation = 0,
  ) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 384
    const c = canvas.getContext('2d')!,
      texture = new T.CanvasTexture(canvas)
    texture.colorSpace = T.SRGBColorSpace
    const mesh = new T.Mesh(
      new T.PlaneGeometry(width, (width * 384) / 1024),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    )
    mesh.position.set((x - 480) / scale, height, (y - 310) / scale)
    mesh.rotation.y = rotation
    scene.add(mesh)
    let last = ''
    const text = (value: string) => {
      if (value === last) return
      last = value
      c.fillStyle = '#182b32'
      c.fillRect(0, 0, 1024, 384)
      c.strokeStyle = '#a1b4a0'
      c.lineWidth = 8
      c.strokeRect(4, 4, 1016, 376)
      c.fillStyle = '#e1dfc6'
      c.textAlign = 'center'
      c.font = 'bold 43px sans-serif'
      const lines = value.split('\n')
      lines.forEach((line, i) => c.fillText(line, 512, 195 - (lines.length - 1) * 31 + i * 62, 990))
      texture.needsUpdate = true
    }
    text(initial)
    return text
  }
  const layoutFor = (c: Chapter6) =>
    getWorld(area, 'helped', companion, [], false, undefined, undefined, c)
  let layout = layoutFor(initial)
  box({ x: 54, y: 70, w: 852, h: 480 }, 0.12, stone, -0.12)
  box({ x: 44, y: 60, w: 872, h: 500 }, 0.1, dark, shelter ? 4.6 : 3.3)
  const south =
    area === 'maintenance'
      ? [
          { x: 44, y: 550, w: 56, h: 10 },
          { x: 180, y: 550, w: 600, h: 10 },
          { x: 860, y: 550, w: 56, h: 10 },
        ]
      : [{ x: 44, y: 550, w: 872, h: 10 }]
  for (const r of [
    { x: 44, y: 60, w: 872, h: 10 },
    { x: 44, y: 70, w: 10, h: 480 },
    { x: 906, y: 70, w: 10, h: 480 },
    ...south,
  ])
    box(r, shelter ? 4.6 : 3.3, stone, 0, true)
  for (let x = 60; x < 905; x += 80) box({ x, y: 70, w: 1, h: 480 }, 0.003, dark)
  scene.add(new T.HemisphereLight(shelter ? '#eef0d4' : '#c1d3dc', '#343c35', shelter ? 2.5 : 1.6))
  for (const [x, z] of [
    [-5, -2],
    [4, -1],
    [3, 3],
  ]) {
    const light = new T.PointLight(shelter ? '#eee5c0' : '#d2d7bd', shelter ? 45 : 26, 18, 2)
    light.position.set(x, shelter ? 3.5 : 2.9, z)
    scene.add(light)
    const lamp = new T.Mesh(new T.BoxGeometry(1.7, 0.06, 0.18), glow)
    lamp.position.copy(light.position)
    scene.add(lamp)
  }
  if (!shelter) {
    // Pipes are overhead or outside the walkable footprint. They never introduce a second collision system.
    for (const x of [60, 900]) {
      const pipe = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 9.4, 8), metal)
      pipe.rotation.x = Math.PI / 2
      pipe.position.set((x - 480) / scale, 2.7, 0)
      scene.add(pipe)
      for (const y of [120, 300, 490]) box({ x: x - 4, y, w: 8, h: 4 }, 0.1, dark, 2.55)
    }
  } else {
    for (const x of [220, 480, 740]) {
      box({ x: x - 45, y: 71, w: 90, h: 2 }, 1, glow, 2.6)
      for (let i = 0; i < 3; i++) box({ x: x - 40 + i * 35, y: 73, w: 3, h: 1 }, 1, metal, 2.6)
    }
  }
  for (const r of layout.obstacles.filter((r) => r.w !== 5)) {
    if (r.w === 30 && r.h === 30) {
      blockers.push(addNpcChair(scene, r, scale, dark, metal))
    } else {
      box(r, 0.48, dark, 0, true)
      box({ ...r, h: 7 }, 0.42, metal, 0.48, true)
    }
  }
  const labels = new Map<string, ReturnType<typeof label>>(),
    doors = new Map<string, T.Mesh>()
  let npc: ReturnType<typeof loadOhModel> | null = null,
    npcProxy: T.Mesh | null = null
  const dress: T.Mesh[] = []
  for (const e of layout.entities) {
    const x = e.x + e.w / 2,
      y = e.y + e.h / 2
    const proxy = box(
      e,
      e.kind === 'npc' ? 1.75 : 2.4,
      new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }),
    )
    proxy.userData.entityId = e.id
    interactables.push(proxy)
    if (e.id === 'survivor') {
      npcProxy = proxy
      const seated = shelter || (area === 'recovery' && !initial.boltOpen)
      npc = loadOhModel(
        scene,
        new T.Vector3((x - 480) / scale, 0, (y - 310) / scale),
        onError,
        'survivor',
        seated,
      )
      dress.push(box({ x: x - 7, y: y - 4, w: 14, h: 8 }, 0.1, warm, seated ? 1.35 : 1.53))
      dress.push(box({ x: x + 4, y: y - 4, w: 7, h: 8 }, 0.12, warm, 0.15))
    } else if (e.kind === 'door') {
      box({ ...e, w: 5 }, 2.5, metal, 0, true).userData.entityId = e.id
      box({ ...e, x: e.x + e.w - 5, w: 5 }, 2.5, metal, 0, true).userData.entityId = e.id
      doors.set(e.id, box(e, 2.5, metal))
      const title =
        e.id === 'final-s01'
          ? 'S-01 / 지상 대피소 정문'
          : e.id === 'final-g01'
            ? 'G-01 / 등록 확인 구역'
            : e.id === 'recovery-hatch'
              ? 'S-02 / 지상 비상 해치'
              : 'G-01 / 진입 차단문'
      label(title, x, e.y + (e.y > 500 ? -1 : e.h + 1), 2.8, 1.9, e.y > 500 ? Math.PI : 0)
      labels.set(
        e.id,
        label(
          '',
          e.x + e.w + 18,
          e.y + (e.y > 500 ? -1 : e.h + 1),
          1.5,
          0.65,
          e.y > 500 ? Math.PI : 0,
        ),
      )
      if (e.id === 'recovery-hatch')
        for (let i = 0; i < 5; i++)
          box({ x: e.x + 12, y: e.y + e.h - 3, w: e.w - 24, h: 3 }, 0.025, metal, 0.25 + i * 0.35)
    } else if (e.id === 'recovery-valve') {
      box(e, 1.2, metal)
      const wheel = new T.Mesh(new T.TorusGeometry(0.22, 0.035, 6, 16), warm)
      wheel.position.set((x - 480) / scale, 1.3, (e.y + e.h + 1 - 310) / scale)
      scene.add(wheel)
      labels.set(e.id, label('배수 밸브', x, e.y + e.h + 2, 0.7, 1.5))
    } else if (e.id === 'final-window') {
      box(e, 2.2, metal)
      box(
        { x: e.x + 5, y: e.y + e.h + 1, w: e.w - 10, h: 1 },
        0.65,
        dark,
        1.05,
        true,
      ).userData.entityId = e.id
      label('G-01 점검창\n등록 확인 / 진입 뒤 차단', x, e.y + e.h + 2, 1.4, 1.4)
    } else {
      box(e, e.id === 'shelter-sign' ? 1.9 : 1.35, e.id === 'final-map' ? dark : metal)
      const texts: Record<string, string> = {
        'final-map': '현행 대피도\nS-01 → 지상 / G-01 → 등록 확인\nD-02 → 문래역',
        'final-manual': '지역 설비 운용\n전원 유지 / 현장 표식 대조',
        'final-review': '현장 기록 확인대',
        'final-control': '경로 제어반 / 설정·승인',
        'recovery-note': '내부 복구 안내\n상태 조사 → 배수 → 빗장 → S-02',
        'recovery-water': '배수 상태창',
        'recovery-bolt': 'S-02 해치 빗장',
        'shelter-sign': '지상 대피소 내부\n도착 확인대 →',
        'shelter-arrival': '내부 도착 확인대',
      }
      labels.set(
        e.id,
        label(
          texts[e.id] ?? e.label,
          x,
          e.y + e.h + 1,
          e.id === 'shelter-sign' ? 1.55 : 0.95,
          1.55,
        ),
      )
    }
  }
  const water =
    area === 'recovery'
      ? box(
          { x: 220, y: 380, w: 160, h: 55 },
          0.025,
          new T.MeshStandardMaterial({
            color: '#4e7379',
            transparent: true,
            opacity: 0.48,
            roughness: 0.4,
          }),
          0.12,
        )
      : null
  if (area === 'maintenance') {
    box({ x: 430, y: 550, w: 80, h: 5 }, 2.5, metal)
    label('D-02 / 문래역 연결', 470, 549, 2.8, 1.9, Math.PI)
  }
  if (shelter) {
    label('S-01 / 정문 도착', 480, 549, 2.7, 1.9, Math.PI)
    label('S-02 / 측면 해치 도착', 100, 450, 2.7, 1.9, Math.PI / 2)
  }
  let target = createSceneTarget(layout, scale, interactables, blockers),
    last = ''
  let previousBolt = initial.boltOpen
  const update = (c: Chapter6, dt: number, reduced: boolean) => {
    const key = JSON.stringify([c.settings, c.route, c.drained, c.boltOpen, c.completed])
    if (key !== last) {
      last = key
      layout = layoutFor(c)
      target = createSceneTarget(layout, scale, interactables, blockers)
      doors.forEach((mesh, id) => {
        const e = layout.entities.find((e) => e.id === id)
        const open = !!e && 'passable' in e && e.passable === true
        mesh.visible = !open
        mesh.position.y = open ? 3.5 : 1.25
        labels.get(id)?.(open ? '개방' : '닫힘')
      })
      labels.get('recovery-water')?.(
        c.drained
          ? '배수 상태 / 수위 낮음\n배수 완료 · 빗장 해제 가능'
          : '배수 상태 / 수압 있음\n복구 안내 확인',
      )
      labels.get('recovery-bolt')?.(
        c.boltOpen
          ? 'S-02 빗장 해제 완료'
          : c.drained
            ? 'S-02 빗장 / 해제 가능'
            : 'S-02 빗장 / 수압 있음',
      )
      labels.get('recovery-valve')?.(c.drained ? '배수 밸브 / 배수 완료' : '배수 밸브')
      labels.get('shelter-arrival')?.(
        c.completed
          ? '도착 확인 완료\n에피소드 1 결과 저장'
          : '내부 도착 확인대\n내부 표식 확인 필요',
      )
      if (water) {
        water.position.y = c.drained ? 0.015 : 0.13
        ;(water.material as T.MeshStandardMaterial).opacity = c.drained ? 0.12 : 0.48
      }
      if (npc && npcProxy && area === 'recovery' && c.boltOpen !== previousBolt) {
        const e = layout.entities.find((e) => e.id === 'survivor')!,
          p = new T.Vector3((e.x + e.w / 2 - 480) / scale, 0, (e.y + e.h / 2 - 310) / scale)
        const delta = p.clone().sub(new T.Vector3(npcProxy.position.x, 0, npcProxy.position.z))
        npc.relocate(p)
        npc.setSeated(false)
        npcProxy.position.x = p.x
        npcProxy.position.z = p.z
        dress.forEach((m, i) => {
          m.position.add(delta)
          if (i === 0) m.position.y += 0.18
        })
        previousBolt = c.boltOpen
      }
      scene.userData.npcCount = npc ? 1 : 0
      scene.userData.doorOpen = area === 'recovery' ? c.boltOpen : !!c.settings
      scene.userData.drained = c.drained
      scene.updateMatrixWorld(true)
    }
    npc?.update(dt, reduced)
  }
  update(initial, 0, false)
  return {
    scene,
    ready: npc?.ready ?? Promise.resolve(),
    target: (camera: T.Camera) => target(camera),
    highlight: (id: string | null) => {
      void id
    },
    updateFinal: update,
    dispose: () => {
      npc?.dispose()
      disposeSceneObject(scene)
    },
  }
}

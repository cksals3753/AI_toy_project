import { raisedTrim } from './sceneFixtures'
import * as T from 'three'
import { getWorld } from './world'
import type { Rect } from './world'
import type { Chapter3 } from './chapter3'
import { departureTrain } from './chapter3'
import type { Chapter5 } from './chapter5'
import { maintenanceRule, moonBroadcast, moonStation } from './chapter5'
import { sceneScale } from './firstPerson'
import { createSceneTarget, disposeSceneObject } from './sceneInteraction'
import { loadOhModel } from './ohModel'

export const moonSceneNames = {
  moonPlatform: `${moonStation} · 도착 승강장`,
  moonBooth: `${moonStation} · 안내 부스`,
  moonHolding: `${moonStation} · 확인 대기 구역`,
} as const

export const createMoonScene = (
  area: keyof typeof moonSceneNames,
  companion: Chapter3['npcBoarded'],
  initial: Chapter5,
  onError: () => void,
) => {
  const scale = sceneScale(area),
    scene = new T.Scene()
  scene.background = new T.Color('#111b23')
  scene.fog = new T.FogExp2('#111b23', 0.018)
  const interactables: T.Object3D[] = [],
    blockers: T.Object3D[] = []
  const material = (color: string, emissive = false) =>
    new T.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.12,
      ...(emissive ? { emissive: color, emissiveIntensity: 0.65 } : {}),
    })
  const stone = material('#445158'),
    metal = material('#78888b'),
    dark = material('#1c2b34'),
    warm = material('#b5a487'),
    glow = material('#d2b071', true)
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
      if (last === value) return
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
    return Object.assign(text, { mesh })
  }
  let layout = getWorld(area, 'helped', companion, [], false, undefined, initial)
  box({ x: 54, y: 70, w: 852, h: 480 }, 0.12, stone, -0.12)
  box({ x: 44, y: 60, w: 872, h: 500 }, 0.1, dark, 3.8)
  for (const r of [
    { x: 44, y: 60, w: 872, h: 10 },
    ...(area === 'moonPlatform'
      ? [
          { x: 44, y: 550, w: 56, h: 10 },
          { x: 180, y: 550, w: 250, h: 10 },
          { x: 510, y: 550, w: 406, h: 10 },
        ]
      : [
          { x: 44, y: 550, w: 386, h: 10 },
          { x: 510, y: 550, w: 406, h: 10 },
        ]),
    { x: 44, y: 70, w: 10, h: 480 },
    { x: 906, y: 70, w: 10, h: 480 },
  ])
    box(r, 3.8, stone, 0, true)
  for (let x = 60; x < 905; x += 80) box({ x, y: 70, w: 1, h: 480 }, 0.003, dark)
  scene.add(new T.HemisphereLight('#c1d3dc', '#343c35', 1.7))
  for (const [x, z] of [
    [-5, -2],
    [4, -1],
    [3, 3],
  ]) {
    const light = new T.PointLight('#d2d7bd', 30, 17, 2)
    light.position.set(x, 3.2, z)
    scene.add(light)
    const lamp = new T.Mesh(new T.BoxGeometry(1.7, 0.06, 0.18), glow)
    lamp.position.copy(light.position)
    scene.add(lamp)
  }
  for (const r of layout.obstacles.filter(
    (r) => r.w !== 5 && !(area === 'moonPlatform' && r.y === 544),
  )) {
    if (area === 'moonPlatform' && r.w < 50) {
      box(r, 3.8, stone, 0, true)
      box(raisedTrim(r), 0.12, warm, 1.1)
    } else {
      box(r, 0.48, dark, 0, true)
      box({ ...r, h: 7 }, 0.42, metal, 0.48, true)
    }
  }
  const labels = new Map<string, ReturnType<typeof label>>()
  const doors = new Map<string, T.Mesh>()
  let npc: ReturnType<typeof loadOhModel> | null = null
  for (const e of layout.entities) {
    const x = e.x + e.w / 2,
      y = e.y + e.h / 2
    const shoes = e.id === 'moon-shoes'
    const proxy = box(
      e,
      shoes ? 0.45 : e.kind === 'npc' ? 1.75 : 2.4,
      new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }),
    )
    proxy.userData.entityId = e.id
    interactables.push(proxy)
    if (e.id === 'survivor') {
      npc = loadOhModel(
        scene,
        new T.Vector3((x - 480) / scale, 0, (y - 310) / scale),
        onError,
        'survivor',
      )
      box({ x: x - 7, y: y - 4, w: 14, h: 8 }, 0.1, warm, 1.53)
      box({ x: x + 4, y: y - 4, w: 7, h: 8 }, 0.12, warm, 0.15)
    } else if (shoes) {
      for (let i = 0; i < 3; i++)
        for (const dx of [0, 9]) {
          const shoe = new T.Mesh(new T.CapsuleGeometry(0.055, 0.13, 2, 6), dark)
          shoe.rotation.x = Math.PI / 2
          shoe.position.set((e.x + 9 + i * 22 + dx - 480) / scale, 0.07, (e.y + 14 - 310) / scale)
          scene.add(shoe)
        }
      // Floor arrows point to the holding area, not the exit. They have no separate interaction or collision.
      for (let i = 0; i < 3; i++) {
        const arrow = new T.Mesh(new T.ConeGeometry(0.16, 0.36, 3), warm)
        arrow.rotation.x = Math.PI / 2
        arrow.rotation.z = -Math.PI / 2
        arrow.position.set((e.x + e.w + 40 + i * 75 - 480) / scale, 0.025, (e.y - 310) / scale)
        arrow.scale.z = 0.08
        scene.add(arrow)
      }
      const floorNotice = label(
        '침수 오염 방지\n신발을 벗고 확인 대기 방향으로 →',
        x,
        e.y + e.h + 28,
        0.015,
        1.8,
      )
      floorNotice.mesh.rotation.x = -Math.PI / 2
    } else if (e.kind === 'door') {
      box({ ...e, w: 5 }, 2.5, metal, 0, true).userData.entityId = e.id
      box({ ...e, x: e.x + e.w - 5, w: 5 }, 2.5, metal, 0, true).userData.entityId = e.id
      const slab = box(e, 2.5, metal)
      doors.set(e.id, slab)
      const text =
        e.id === 'moon-maintenance'
          ? `${maintenanceRule.door} · 정비 통로`
          : e.id === 'moon-booth-door'
            ? '안내 부스 →'
            : e.id === 'moon-holding-door'
              ? '확인 대기 구역'
              : '승강장으로'
      label(text, x, e.y + (e.y > 500 ? -1 : e.h + 1), 2.8, 1.9, e.y > 500 ? Math.PI : 0)
      // A short door-side plate never covers the opening.
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
    } else if (e.id === 'moon-window') {
      box(e, 2.2, metal)
      box(
        { x: e.x + 5, y: e.y + e.h + 1, w: e.w - 10, h: 1 },
        0.65,
        dark,
        1.05,
        true,
      ).userData.entityId = e.id
      for (let i = 0; i < 3; i++)
        box({ x: e.x + 18 + i * 20, y: e.y + e.h + 2, w: 2, h: 1 }, 0.65, metal, 1.05)
      label('확인 구역 점검창\n대기 의자 / 내부 해제 표식', x, e.y + e.h + 3, 1.4, 1.3)
      // No interior interaction proxies exist here. E can only inspect this public window record.
    } else if (e.id === 'moon-warning') {
      box(e, 0.65, dark, 1.75)
      label('응답 감지 시\n확인 구역 차단문 작동', x, e.y + e.h + 1, 2.05, 1.55)
    } else if (e.id === 'moon-broadcast') {
      box(e, 1.9, dark)
      box({ x: e.x + 25, y: e.y + e.h + 1, w: 30, h: 1 }, 0.3, metal, 1.35)
      label('안내방송 / 승강장 스피커', x, e.y + e.h + 2, 1.0, 1.5)
    } else if (e.id === 'moon-sensor') {
      box(e, 1.2, metal)
      box({ x: e.x + 30, y: e.y + e.h + 2, w: 20, h: 2 }, 0.12, glow, 0.95)
      label('MIC-03\n확인 구역 응답 감지', x, e.y + e.h + 4, 0.8, 1.5)
    } else {
      box(e, 1.35, e.id === 'moon-route' ? dark : metal)
      const texts: Record<string, string> = {
        'moon-route': `${maintenanceRule.mark} / ${maintenanceRule.door}\n지역 수동 승인`,
        'moon-playback': '방송 재생 기록 / PLAYBACK',
        'moon-receipt': 'RX-12 / 외부 수신 기록',
        'moon-attachment': '등록 원본 / 수동 첨부',
        'moon-terminal': '등록 건 대조 / 처리',
        'moon-active-record': '확인 대기 / 활성 등록',
        'moon-cancel-note': '내부 해제 안내\n활성 등록 확인 → 내부 취소',
        'moon-cancel-device': '내부 취소 장치 / LOCAL',
      }
      labels.set(e.id, label(texts[e.id] ?? e.label, x, e.y + e.h + 1, 0.95, 1.55))
    }
  }
  if (area === 'moonPlatform') {
    label(`${moonStation} / MULLAE\n안내 부스 →  /  정비 통로 ←`, 480, 72, 2.95, 3)
    // Reuse the departing train's stone/metal palette and central door alignment behind the arrival spawn.
    box({ x: 350, y: 544, w: 80, h: 5 }, 2.65, metal, 0, true)
    box({ x: 510, y: 544, w: 190, h: 5 }, 2.65, metal, 0, true)
    label(`${departureTrain.id} / 도착 열차`, 470, 542, 2.8, 1.9, Math.PI)
    box({ x: 430, y: 548, w: 80, h: 2 }, 0.08, glow)
  } else
    label(
      area === 'moonHolding' ? '확인 대기 구역 / 내부 해제' : '안내 부스 / 등록 기록',
      480,
      72,
      2.95,
      3,
    )
  let target = createSceneTarget(layout, scale, interactables, blockers),
    last = ''
  const update = (c: Chapter5) => {
    const key = JSON.stringify([
      c.registration,
      c.routeOpen,
      c.response,
      c.matched,
      c.externalPaused,
    ])
    if (last === key) return
    last = key
    layout = getWorld(area, 'helped', companion, [], false, undefined, c)
    target = createSceneTarget(layout, scale, interactables, blockers)
    const released = c.registration === 'cancelled'
    doors.forEach((mesh, id) => {
      const entity = layout.entities.find((e) => e.id === id)
      const open = !!entity && 'passable' in entity && entity.passable === true
      mesh.visible = !open
      mesh.position.y = open ? 3.5 : 1.25
      labels.get(id)?.(open ? '개방' : '닫힘')
    })
    labels.get('moon-terminal')?.(
      `등록 건 대조\n${c.externalPaused ? '외부 유도 보류' : c.matched ? '대조 완료' : '기록 확인 대기'}`,
    )
    labels.get('moon-cancel-device')?.(
      `내부 취소 장치\n${released ? '등록 취소 / 차단문 해제' : '활성 등록 취소 대기'}`,
    )
    scene.userData.doorOpen = area === 'moonHolding' ? released : c.routeOpen
    scene.userData.npcCount = npc ? 1 : 0
    scene.userData.broadcast = c.exitSeen
      ? moonBroadcast.ending(c.response)
      : moonBroadcast.intro(c.displayName ?? '표시 이름')
    scene.updateMatrixWorld(true)
  }
  update(initial)
  return {
    scene,
    ready: npc?.ready ?? Promise.resolve(),
    target: (camera: T.Camera) => target(camera),
    highlight: (id: string | null) => {
      void id
    },
    updateMoon: (c: Chapter5, dt: number, reduced: boolean) => {
      update(c)
      npc?.update(dt, reduced)
    },
    dispose: () => {
      npc?.dispose()
      disposeSceneObject(scene)
    },
  }
}

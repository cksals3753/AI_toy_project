import { interactionSurface } from './interaction'
import { addChapter2Facility } from './chapter2Facilities'
import { hallPartitions, waterRects, initialHallEnvironment } from './hallEnvironment'
import type { HallEnvironment } from './hallEnvironment'
import { addMaintenanceDetails } from './firstRoomDetails'
import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { firstRoomAssets, sceneScale } from './firstPerson'
import type { ImmersiveArea } from './firstPerson'
import { getWorld } from './world'
import type { Rect } from './world'
import { createSceneTarget, disposeSceneObject } from './sceneInteraction'
import { loadOhModel } from './ohModel'

export const chapter2AreaNames = {
  hall: '불 꺼진 대합실',
  electrical: '전기실 · 예비 회로',
  stairs: '승강장 계단 앞',
} as const
export const createChapter2Scene = (
  area: Extract<ImmersiveArea, 'hall' | 'electrical' | 'stairs'>,
  onError: () => void,
  initial: HallEnvironment = initialHallEnvironment,
) => {
  const scale = sceneScale(area),
    initialLayout = getWorld(
      area,
      undefined,
      false,
      [],
      false,
      undefined,
      undefined,
      undefined,
      initial,
    )
  let layout = initialLayout
  const scene = new T.Scene()
  scene.background = new T.Color('#101a20')
  scene.fog = new T.FogExp2('#101a20', 0.022)
  const interactables: T.Object3D[] = [],
    blockers: T.Object3D[] = [],
    rings = new Map<string, T.Mesh>()
  let shutter: T.Mesh | null = null,
    bolt: T.Mesh | null = null,
    catchPin: T.Mesh | null = null
  const shutterHandles: T.Mesh[] = []
  const shutterRibs: T.Mesh[] = [],
    floodMarkers: { mesh: T.Mesh; stage: number }[] = []
  const circuitSwitches: T.Mesh[] = [],
    keyMeshes: T.Mesh[] = []
  const retired: T.BufferGeometry[] = []
  let disposed = false
  const material = (color: string, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness: 0.94, metalness })
  const stone = material('#425157'),
    metal = material('#64716c', 0.35),
    dark = material('#182831'),
    floor = material('#566366')
  const blue = material('#628a98'),
    amber = material('#b49063')
  const emissive = new T.MeshStandardMaterial({
    color: '#d6b98c',
    emissive: '#d6a76b',
    emissiveIntensity: 0.65,
  })
  const box = (r: Rect, h: number, m: T.Material, bottom = 0, solid = false) => {
    const mesh = new T.Mesh(new T.BoxGeometry(r.w / scale, h, r.h / scale), m)
    mesh.position.set((r.x + r.w / 2 - 480) / scale, bottom + h / 2, (r.y + r.h / 2 - 310) / scale)
    mesh.userData.merge = m.visible
    scene.add(mesh)
    if (solid) blockers.push(mesh)
    return mesh
  }
  const label = (
    text: string,
    r: Rect,
    height: number,
    rotation = 0,
    color = '#becbb3',
    kind = 'label',
  ) => {
    const lines = text.split('\n')
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = kind === 'map' ? 384 : Math.max(128, lines.length * 80)
    const c = canvas.getContext('2d')!
    c.fillStyle = kind === 'map' ? '#b4bba7' : '#16282e'
    c.fillRect(0, 0, 768, canvas.height)
    c.strokeStyle = color
    c.lineWidth = 7
    c.strokeRect(6, 6, 756, canvas.height - 12)
    c.fillStyle = kind === 'map' ? '#2e493b' : color
    c.textAlign = 'center'
    c.font = kind === 'map' ? 'bold 36px sans-serif' : 'bold 56px sans-serif'
    lines.forEach((line, i) =>
      c.fillText(
        line,
        384,
        kind === 'map' ? 64 + i * 53 : canvas.height / 2 + 20 + (i - (lines.length - 1) / 2) * 72,
        700,
      ),
    )
    if (kind === 'map') {
      c.strokeStyle = '#3f7254'
      c.lineWidth = 12
      c.beginPath()
      c.moveTo(70, 280)
      c.lineTo(690, 280)
      c.moveTo(380, 280)
      c.lineTo(380, 350)
      c.stroke()
      for (const x of [90, 380, 675]) {
        c.fillStyle = '#dae0cd'
        c.beginPath()
        c.arc(x, 280, 14, 0, Math.PI * 2)
        c.fill()
      }
      c.fillStyle = '#8b5539'
      c.font = '24px sans-serif'
      c.fillText('現 위치 · 대합실', 380, 371)
    }
    const texture = new T.CanvasTexture(canvas)
    texture.colorSpace = T.SRGBColorSpace
    const mesh = new T.Mesh(
      new T.PlaneGeometry(r.w / scale, r.h / scale),
      new T.MeshBasicMaterial({ map: texture, side: T.FrontSide }),
    )
    mesh.position.set((r.x - 480) / scale, height, (r.y - 310) / scale)
    mesh.rotation.y = rotation
    scene.add(mesh)
    return mesh
  }
  if (area === 'stairs') {
    for (const r of [
      { x: 54, y: 70, w: 852, h: 20 },
      { x: 54, y: 90, w: 356, h: 65 },
      { x: 550, y: 90, w: 356, h: 65 },
      { x: 54, y: 155, w: 852, h: 395 },
    ])
      box(r, 0.1, floor, -0.1)
  } else box({ x: 54, y: 70, w: 852, h: 480 }, 0.1, floor, -0.1)
  const height = area === 'hall' ? 4.2 : 3.4
  for (const wall of [
    { x: 44, y: 60, w: 872, h: 10 },
    { x: 44, y: 550, w: 872, h: 10 },
    { x: 44, y: 70, w: 10, h: 480 },
    { x: 906, y: 70, w: 10, h: 480 },
  ]) {
    box(wall, height, stone, 0, true)
    box(wall, 0.14, metal, 1.02)
    box(wall, 0.11, dark)
  }
  box({ x: 44, y: 60, w: 872, h: 500 }, 0.1, dark, height)
  for (let x = 65; x < 905; x += 80) {
    box({ x, y: 70, w: 2, h: 1 }, height, dark)
    box({ x, y: 549, w: 2, h: 1 }, height, dark)
  }
  for (let x = 70; x < 905; x += 80) box({ x, y: 72, w: 1, h: 475 }, 0.002, dark, 0.003)
  for (let y = 75; y < 550; y += 60) box({ x: 55, y, w: 848, h: 1 }, 0.002, dark, 0.003)
  scene.add(new T.HemisphereLight('#b7c9d5', '#373b34', 0.95))
  const emergency = new T.PointLight('#ddb28b', 19, 24, 2)
  emergency.position.set(-3, 2.8, 1.5)
  scene.add(emergency)
  const main = new T.PointLight('#c1d9e6', 0, 26, 2)
  main.position.set(1, 3.1, 0)
  scene.add(main)
  const windowLight = new T.PointLight('#7bafbf', 7, 7, 2)
  windowLight.position.set(-7, 1.9, -3)
  scene.add(windowLight)
  const emergencyGlow = new T.MeshStandardMaterial({
    color: '#d9ad83',
    emissive: '#ed8250',
    emissiveIntensity: 1.2,
  })
  for (const x of [180, 780]) box({ x: x - 28, y: 110, w: 56, h: 10 }, 0.05, emergencyGlow, 2.95)
  if (area === 'hall') addMaintenanceDetails(scene, box)
  const fill = new T.PointLight('#d9d9c5', 10, 7, 2)
  fill.position.set(6.5, 2.3, 0.5)
  scene.add(fill)
  const strips: T.Mesh[] = []
  for (const x of [230, 480, 740])
    strips.push(box({ x: x - 32, y: 220, w: 64, h: 9 }, 0.045, emissive, height - 0.3))
  for (const [index, obstacle] of (area === 'hall'
    ? layout.obstacles.slice(0, 4)
    : layout.obstacles
  ).entries())
    box(
      obstacle,
      area === 'stairs' ? 1.8 : area === 'electrical' ? 2.2 : index >= 2 ? 2.65 : 0.85,
      area === 'hall' ? dark : metal,
      0,
      true,
    )
  // Existing bench asset, normalized inside existing collision footprints. Collision remains world.ts data.
  const loader = new GLTFLoader()
  if (area === 'hall')
    for (const [index, r] of layout.obstacles.slice(0, 2).entries()) {
      const fallbackBench = blockers[4 + index] as T.Mesh
      fallbackBench.userData.merge = false
      loader.load(
        firstRoomAssets.bench,
        ({ scene: model }) => {
          if (disposed) {
            disposeSceneObject(model)
            return
          }
          model.updateMatrixWorld(true)
          const bounds = new T.Box3().setFromObject(model),
            size = bounds.getSize(new T.Vector3()),
            center = bounds.getCenter(new T.Vector3())
          model.scale.set(r.w / scale / size.x, 0.85 / size.y, r.h / scale / size.z)
          model.position.set(
            (r.x + r.w / 2 - 480) / scale - center.x * model.scale.x,
            -bounds.min.y * model.scale.y,
            (r.y + r.h / 2 - 310) / scale - center.z * model.scale.z,
          )
          model.traverse((o) => {
            if (o instanceof T.Mesh) {
              const ms = Array.isArray(o.material) ? o.material : [o.material]
              ms.forEach((m) => {
                if (m instanceof T.MeshStandardMaterial) {
                  m.color.set('#576f78')
                  m.roughness = 0.97
                  m.metalness = 0.08
                }
              })
            }
          })
          scene.add(model)
          fallbackBench.visible = false
        },
        undefined,
        () => {
          if (!disposed) onError()
        },
      )
    }
  // Visible furniture is separate from invisible obstacle proxies for the two bench seats.
  let npc: ReturnType<typeof loadOhModel> | null = null
  let gate: T.Mesh | null = null,
    staff: T.Mesh | null = null
  for (const e of layout.entities) {
    const h = e.kind === 'door' ? 2.5 : e.kind === 'npc' ? 1.75 : e.id === 'hall-desk' ? 1.05 : 1.8
    const bounds =
      e.id === 'hall-map'
        ? [0.95, 1.35]
        : e.id === 'hall-window'
          ? [0.35, 1.65]
          : e.id === 'powerboard'
            ? [0.25, 1.9]
            : e.id === 'hall-gate-note'
              ? [0.65, 0.95]
              : [0, h]
    const proxy = box(
      interactionSurface(e),
      bounds[1],
      new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }),
      bounds[0],
    )
    proxy.userData.entityId = e.id
    interactables.push(proxy)
    if (e.kind === 'npc')
      npc = loadOhModel(
        scene,
        new T.Vector3((e.x + e.w / 2 - 480) / scale, 0, (e.y + e.h / 2 - 310) / scale),
        onError,
      )
    else if (e.id === 'gate') {
      for (const y of [e.y, e.y + e.h - 12]) box({ x: e.x, y, w: e.w, h: 12 }, 1.05, metal)
      gate = box({ x: e.x + e.w / 2 - 2, y: e.y + 12, w: 4, h: e.h - 24 }, 0.9, amber, 0.3)
      gate.userData.merge = false
      label('승강장 →\n예비 전원 개방', { x: 904, y: 302, w: 60, h: 20 }, 2.7, -Math.PI / 2)
    } else if (e.id === 'next-chapter') {
      // The collision rectangle is the closed landing rail. E opens it through the existing transition.
      for (const x of [e.x, e.x + e.w - 6]) box({ x, y: e.y, w: 6, h: e.h }, 1.15, metal)
      box({ x: e.x, y: e.y + e.h - 4, w: e.w, h: 4 }, 0.12, metal, 0.92)
      for (let step = 0; step < 8; step++)
        box(
          { x: e.x + 6, y: e.y + e.h - ((step + 1) * e.h) / 8, w: e.w - 12, h: e.h / 8 },
          0.14,
          step % 2 ? metal : stone,
          -(step + 1) * 0.16,
        )
      label('승강장 계단\n↓ PLATFORM', { x: e.x + e.w / 2, y: e.y + e.h + 1, w: 105, h: 34 }, 2.35)
    } else if (e.id === 'hall-shutter') {
      shutter = box(e, 2.35, metal)
      shutter.userData.merge = false
      bolt = box({ x: e.x + 28, y: e.y - 3, w: 80, h: 5 }, 0.09, amber, 1.1)
      bolt.userData.merge = false
      catchPin = box({ x: e.x + e.w - 12, y: e.y - 4, w: 8, h: 6 }, 0.22, amber, 2.35)
      catchPin.userData.merge = false
      for (let i = 0; i < 9; i++) {
        const rib = box({ x: e.x, y: e.y - 1, w: e.w, h: 2 }, 0.025, dark, 0.12 + i * 0.25)
        rib.userData.merge = false
        shutterRibs.push(rib)
      }
      for (const x of [e.x - 3, e.x + e.w]) box({ x, y: e.y, w: 3, h: e.h }, 2.65, dark)
      shutterHandles.push(box({ x: e.x + 40, y: e.y - 4, w: 26, h: 4 }, 0.06, dark, 1.3))
      for (const x of [e.x + 40, e.x + 62])
        shutterHandles.push(box({ x, y: e.y - 5, w: 4, h: 4 }, 0.16, amber, 1.18))
      shutterHandles.forEach((mesh) => {
        mesh.userData.merge = false
        mesh.userData.restY = mesh.position.y
      })
      label('IS-02 · 수동 격리', { x: 197, y: 429, w: 76, h: 14 }, 2.75, Math.PI)
    } else if (e.kind === 'door') {
      const door = box(e, 2.5, e.id === 'staff' ? blue : metal)
      if (e.id === 'staff') {
        staff = door
        door.userData.merge = false
      }
      const side = e.x < 60 ? Math.PI / 2 : e.y > 500 ? Math.PI : 0
      const r = { x: e.x + e.w / 2, y: e.y + e.h / 2, w: 90, h: 36 }
      // Put the information toward the room interior, avoiding reverse-facing faces on walls.
      if (e.y > 500) r.y = e.y - 1
      else if (e.x < 60) r.x = 55
      else r.y = e.y + e.h + 1
      const text =
        e.id === 'staff'
          ? '직원 전용\n환풍기 · 설비 구역'
          : e.id === 'electrical'
            ? '전기실 E-01\n열쇠: 안내 데스크'
            : e.id === 'sealed'
              ? '정비 대기실\n차단문 폐쇄'
              : e.id === 'next-chapter'
                ? '승강장 계단\n↓ PLATFORM'
                : '대합실\nHALL'
      label(text, { ...r, w: 68, h: 22 }, 2.8, side)
    } else {
      addChapter2Facility(e, box, label, { metal, dark, amber, blue }, circuitSwitches, keyMeshes)
    }
    const ring = new T.Mesh(
      new T.RingGeometry(0.18, 0.21, 24),
      new T.MeshBasicMaterial({
        color: '#d4eaa9',
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.45,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set((e.x + e.w / 2 - 480) / scale, 0.02, (e.y + e.h / 2 - 310) / scale)
    ring.visible = false
    scene.add(ring)
    rings.set(e.id, ring)
  }
  if (area !== 'stairs')
    label(
      area === 'hall'
        ? '신도림 · SINDORIM\nB2 대합실'
        : area === 'electrical'
          ? '설비 구역 · E-01\n비상 회로'
          : '승강장 연결\nPLATFORM ↓',
      { x: 480, y: 72, w: 110, h: 25 },
      2.55,
    )
  strips.forEach((mesh) => {
    mesh.userData.merge = false
  })
  // Merge static boxes by material. Raycast blockers retain their original matrices but are not rendered twice.
  scene.updateMatrixWorld(true)
  const buckets = new Map<T.Material, T.Mesh[]>()
  for (const obj of [...scene.children])
    if (
      obj instanceof T.Mesh &&
      obj.userData.merge &&
      !Array.isArray(obj.material) &&
      obj.visible
    ) {
      const list = buckets.get(obj.material) ?? []
      list.push(obj)
      buckets.set(obj.material, list)
    }
  for (const [m, meshes] of buckets) {
    const gs = meshes.map((mesh) => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld))
    const merged = mergeGeometries(gs)
    if (merged) {
      scene.add(new T.Mesh(merged, m))
      for (const mesh of meshes) {
        scene.remove(mesh)
        retired.push(mesh.geometry)
      }
    }
    gs.forEach((g) => g.dispose())
  }
  const floodMeshes: T.Mesh[] = []
  const waterEdges: { mesh: T.Mesh; stage: number }[] = []
  if (area === 'hall') {
    const taskLight = new T.PointLight('#ecd3a2', 12, 5, 2)
    taskLight.position.set((215 - 480) / scale, 2.05, (400 - 310) / scale)
    scene.add(taskLight)
    box({ x: 142, y: 420, w: 12, h: 6 }, 0.06, emissive, 2.15)
    for (const r of hallPartitions) box(r, 2.05, dark, 0, true)
    const waterMaterial = new T.MeshStandardMaterial({
      color: '#264c58',
      roughness: 0.72,
      metalness: 0.1,
      transparent: true,
      opacity: 0.86,
    })
    for (const [i, r] of waterRects(1).entries()) {
      const mesh = box(r, 0.035, waterMaterial, 0.02)
      mesh.userData.merge = false
      mesh.visible = i === 0 || initial.water === 1
      floodMeshes.push(mesh)
      for (const edge of [
        { x: r.x, y: r.y, w: r.w, h: 2 },
        { x: r.x, y: r.y + r.h - 2, w: r.w, h: 2 },
        { x: r.x, y: r.y, w: 2, h: r.h },
        { x: r.x + r.w - 2, y: r.y, w: 2, h: r.h },
      ]) {
        const stripe = box(edge, 0.012, emissive, 0.06)
        stripe.userData.merge = false
        stripe.visible = i === 0 || initial.water === 1
        waterEdges.push({ mesh: stripe, stage: i })
      }

      // Boundary markings have the same footprint as movement collision, not an approximate pool.
      for (let x = r.x + 15; x < r.x + r.w; x += 65) {
        const pole = box({ x, y: r.y + r.h - 3, w: 4, h: 4 }, 0.52, emissive)
        pole.userData.merge = false
        floodMarkers.push({ mesh: pole, stage: i })
      }
    }
    label('침수 / 서측 우회 ←', { x: 460, y: 423, w: 95, h: 14 }, 0.35)
    label('동측 수위  /  Ⅰ—Ⅱ', { x: 689, y: 400, w: 40, h: 20 }, 0.65, -Math.PI / 2)
    label('대합실 → 승강장', { x: 750, y: 74, w: 90, h: 16 }, 2.6)
    label('E-01 · 직원 설비 ↓', { x: 215, y: 309, w: 65, h: 14 }, 2.35)
  }
  let target = createSceneTarget(layout, scale, interactables, blockers)
  let environmentKey = '',
    previousWater = initial.water,
    leakTime = 0
  const drips: T.Mesh[] = []
  if (area === 'hall') {
    box({ x: 895, y: 375, w: 9, h: 45 }, 0.12, metal, 2.1)
    for (let i = 0; i < 5; i++) {
      const drip = box({ x: 887 + i * 2, y: 398, w: 2, h: 2 }, 0.045, blue, 1.6)
      drip.visible = false
      drips.push(drip)
    }
  }

  return {
    ready: npc?.ready ?? Promise.resolve(),
    scene,
    target: (camera: T.Camera) => target(camera),
    highlight: (id: string | null) =>
      rings.forEach((ring, key) => {
        ring.visible = key === id
      }),
    updateHall: (
      power: readonly string[],
      event: string,
      dt: number,
      reduced: boolean,
      environment: HallEnvironment = initial,
      clues: readonly string[] = [],
    ) => {
      const key = JSON.stringify([power, environment.water, environment.shutter])
      if (key !== environmentKey) {
        environmentKey = key
        layout = getWorld(
          area,
          undefined,
          false,
          power,
          false,
          undefined,
          undefined,
          undefined,
          environment,
        )
        target = createSceneTarget(layout, scale, interactables, blockers)
      }
      if (shutter) shutter.position.y = environment.shutter === 'open' ? 3.6 : 1.175
      shutterRibs.forEach((rib, i) => {
        rib.position.y = (environment.shutter === 'open' ? 2.5 : 0) + 0.12 + i * 0.25 + 0.0125
      })
      shutterHandles.forEach((mesh) => {
        mesh.position.y = mesh.userData.restY + (environment.shutter === 'open' ? 2.5 : 0)
      })
      if (bolt) bolt.visible = environment.shutter === 'locked'
      if (catchPin) catchPin.rotation.z = environment.shutter === 'open' ? 0 : Math.PI / 2
      if (previousWater !== environment.water && environment.water === 1) leakTime = 2
      previousWater = environment.water
      leakTime = Math.max(0, leakTime - Math.min(0.05, dt))
      drips.forEach((drip, i) => {
        drip.visible = leakTime > 0 && !reduced
        drip.position.y = 0.12 + ((leakTime + i * 0.19) % 1) * 1.9
      })
      floodMeshes.forEach((m, i) => {
        m.position.y = environment.water === 1 ? 0.1 : 0.0375
        m.visible = i === 0 || environment.water === 1
      })
      waterEdges.forEach(({ mesh, stage }) => {
        mesh.visible = stage === 0 || environment.water === 1
        mesh.position.y = environment.water === 1 ? 0.13 : 0.07
      })
      floodMarkers.forEach(({ mesh, stage }) => {
        mesh.visible = stage === 0 || environment.water === 1
      })
      scene.userData.waterStage = environment.water
      scene.userData.shutter = environment.shutter

      keyMeshes.forEach((mesh) => {
        mesh.visible = !clues.includes('hall-desk')
      })
      circuitSwitches.forEach((mesh, i) => {
        mesh.rotation.x = power.includes(['lights', 'gate', 'broadcast'][i]) ? -0.45 : 0.45
      })
      const on = power.includes('lights')
      main.intensity = on ? 56 : 0
      strips.forEach((mesh) => {
        mesh.visible = on
      })
      // Animated gate is visual only: the exact same power flag controls world.ts collision.
      if (gate) gate.position.y = power.includes('gate') ? 2.7 : 0.75
      if (staff) {
        staff.material = event === 'unseen' ? blue : metal
        staff.userData.closed = event !== 'unseen'
      }
      scene.userData.lightsOn = on
      scene.userData.gateOpen = power.includes('gate')
      scene.userData.staffClosed = event !== 'unseen'
      npc?.update(dt, reduced)
    },
    dispose: () => {
      disposed = true
      npc?.dispose()
      disposeSceneObject(scene)
      retired.forEach((g) => g.dispose())
    },
  }
}

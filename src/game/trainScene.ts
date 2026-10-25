import { facilityLabel, addFacilityModel } from './facilityVisuals'
import { addNpcChair } from './sceneFixtures'
import * as T from 'three'
import { getWorld } from './world'
import type { Rect } from './world'
import type { Chapter3 } from './chapter3'
import { departureTrain } from './chapter3'
import type { Chapter4 } from './chapter4'
import { trainLinks, trainPanelStatus } from './chapter4'
import { sceneScale } from './firstPerson'
import { createSceneTarget, disposeSceneObject, registerFacilityTarget } from './sceneInteraction'
import { loadOhModel } from './ohModel'

export const trainAreaNames = {
  trainB: 'B-04 · 중앙 객실',
  trainRear: 'B-04 · 후방 객실',
  trainFront: 'B-04 · 선두 연결 구역',
} as const

// Chapter 3's departing car and chapter 4 share this shell, seats, materials and door location.
// Only reducer state controls power, request status and arrival; animation time is not game state.
export const createTrainScene = (
  area: keyof typeof trainAreaNames,
  initial3: Chapter3,
  initial4: Chapter4,
  onError: () => void,
) => {
  const scale = sceneScale(area)
  const scene = new T.Scene()
  scene.background = new T.Color('#111b23')
  scene.fog = new T.FogExp2('#111b23', 0.018)
  const interactables: T.Object3D[] = [],
    blockers: T.Object3D[] = []
  const mat = (color: string, emissive = false) =>
    new T.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.12,
      ...(emissive ? { emissive: color, emissiveIntensity: 0.7 } : {}),
    })
  const stone = mat('#445158'),
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
    width = 2,
    rotation = 0,
  ) => {
    return facilityLabel(scene, scale, initial, x, y, height, width, rotation)
  }
  const layoutFor = (c3: Chapter3, c4: Chapter4) => {
    const world = getWorld(area, c3.npc, c3.npcBoarded, [], c3.doorOpen, c4)
    return c4.started
      ? world
      : { ...world, entities: world.entities.filter((e) => e.id === 'survivor') }
  }
  let layout = layoutFor(initial3, initial4)
  box({ x: 54, y: 70, w: 852, h: 480 }, 0.12, stone, -0.12)
  box({ x: 44, y: 60, w: 872, h: 500 }, 0.1, dark, 3.8)
  const walls = [
    { x: 44, y: 60, w: 872, h: 10 },
    { x: 44, y: 70, w: 10, h: 480 },
    { x: 906, y: 70, w: 10, h: 480 },
  ]
  if (area === 'trainB')
    walls.push({ x: 44, y: 550, w: 386, h: 10 }, { x: 510, y: 550, w: 406, h: 10 })
  else walls.push({ x: 44, y: 550, w: 872, h: 10 })
  walls.forEach((r) => box(r, 3.8, stone, 0, true))
  for (let x = 60; x < 905; x += 80) box({ x, y: 70, w: 1, h: 480 }, 0.003, dark)
  for (const r of layout.obstacles) {
    if (r.w === 30 && r.h === 30) {
      blockers.push(addNpcChair(scene, r, scale, dark, metal))
    } else {
      box(r, 0.48, dark, 0, true)
      box({ ...r, h: 7 }, 0.42, metal, 0.48, true)
    }
  }
  const ambient = new T.HemisphereLight('#c1d3dc', '#343c35', 1.9)
  scene.add(ambient)
  const lights: T.PointLight[] = [],
    lamps: T.Mesh[] = []
  for (const [x, z] of [
    [-5, -2],
    [4, -1],
    [3, 3],
  ]) {
    const light = new T.PointLight('#d2d7bd', 32, 17, 2)
    light.position.set(x, 3.2, z)
    scene.add(light)
    lights.push(light)
    const lamp = new T.Mesh(new T.BoxGeometry(1.7, 0.06, 0.18), glow)
    lamp.position.copy(light.position)
    scene.add(lamp)
    lamps.push(lamp)
  }
  const emergency = new T.PointLight('#c5bfa2', 12, 20, 2)
  emergency.position.set(0, 2.4, 2)
  scene.add(emergency)
  for (const x of [110, 850]) box({ x, y: 75, w: 15, h: 7 }, 0.07, glow, 2.7)
  const tunnelBars: T.Mesh[] = []
  for (const [x, y] of [
    [180, 72],
    [480, 72],
    [780, 72],
    [180, 548],
    [780, 548],
  ]) {
    const south = y > 500
    box({ x: x - 48, y: y - 1, w: 96, h: 2 }, 0.95, dark, 1.35)
    for (let i = 0; i < 3; i++) {
      const pane = box(
        { x: x - 42 + i * 30, y: y + (south ? -2 : 2), w: 3, h: 1 },
        0.75,
        mat('#496d77', true),
        1.45,
      )
      pane.userData.base = x - 42 + i * 30
      tunnelBars.push(pane)
    }
    label(
      `${departureTrain.id} / ${area === 'trainRear' ? '후방' : area === 'trainFront' ? '선두' : '중앙'}`,
      x,
      y + (south ? -3 : 3),
      2.6,
      1.3,
      south ? Math.PI : 0,
    )
  }
  let npc: ReturnType<typeof loadOhModel> | null = null
  let npcProxy: T.Mesh | null = null
  const dress: T.Mesh[] = []
  let npcArrived = initial4.arrived
  let exit: T.Mesh | null = null
  const stateLabels = new Map<string, ReturnType<typeof label>>()
  let stopFixture: ReturnType<typeof addFacilityModel> | null = null
  const equipment = new Map<string, T.Mesh>()
  // Chapter 3 uses the same fixtures but leaves chapter 4 investigation unavailable until its opening.
  const fixtures = getWorld(area, initial3.npc, initial3.npcBoarded, [], initial3.doorOpen, {
    ...initial4,
    started: true,
  })
  for (const e of fixtures.entities) {
    const x = e.x + e.w / 2,
      y = e.y + e.h / 2
    const proxy = registerFacilityTarget(
      scene,
      scale,
      e,
      e.kind === 'npc' ? 1.75 : 2.4,
      interactables,
      blockers,
    )
    if (e.id === 'survivor') {
      npcProxy = proxy
      // A single actor lives in the central car; other car layouts never contain a companion.
      npc = loadOhModel(
        scene,
        new T.Vector3((x - 480) / scale, 0, (y - 310) / scale),
        onError,
        'survivor',
        !initial4.arrived,
      )
      dress.push(
        box({ x: x - 7, y: y - 4, w: 14, h: 8 }, 0.1, warm, initial4.arrived ? 1.53 : 1.13),
      )
      dress.push(box({ x: x + 4, y: y - 4, w: 7, h: 8 }, 0.12, warm, 0.15))
    } else if (e.id === 'train-phone') {
      box({ x: e.x + 20, y: e.y + 6, w: 13, h: 22 }, 0.035, metal, 0.08)
      box({ x: e.x + 21, y: e.y + 7, w: 11, h: 18 }, 0.006, glow, 0.117)
      label('01', x, e.y + e.h + 1, 0.6, 0.45)
    } else if (e.id === 'train-route') {
      box(e, 0.65, dark, 1.75)
      stateLabels.set(e.id, label('', x, e.y + e.h + 1, 2.05, 1.55))
    } else if (e.id === 'train-devices') {
      const rack = addFacilityModel(scene, scale, e, 'links', { metal, dark, warm })
      trainLinks.forEach((link, i) => equipment.set(link.id, rack.plugs[i]))
      stateLabels.set(e.id, label('', x, e.y + e.h + 5, 0.9, 1.35))
    } else if (e.id === 'train-stop') {
      stopFixture = addFacilityModel(scene, scale, e, 'console', { metal, dark, warm })
      stateLabels.set(e.id, label('', x, e.y + e.h + 1, 1.3, 1.2))
    } else if (e.id === 'train-manual') {
      box(e, 0.95, dark)
      box({ x: e.x + 14, y: e.y + 8, w: 42, h: 24 }, 0.04, warm, 0.95)
      label('비상 운행 설명서\nR-01 / P-02 / X-09', x, e.y + e.h + 1, 0.65, 1.05)
    } else {
      const external = e.id === 'train-exit'
      const slab = box(e, 2.5, metal)
      if (external) exit = slab
      const title =
        e.id === 'train-rear-door'
          ? '후방 객실 →'
          : e.id === 'train-front-door'
            ? '← 선두 연결 구역'
            : e.id === 'train-central-door'
              ? '중앙 객실로'
              : e.id === 'train-cab'
                ? '운전실 · 잠김 / 진입 불가'
                : '중앙 출입문'
      label(title, x, e.y + (e.y > 500 ? -1 : e.h + 1), 2.8, 1.45, e.y > 500 ? Math.PI : 0)
      if (external) stateLabels.set(e.id, label('', e.x + e.w + 18, e.y - 1, 1.5, 0.65, Math.PI))
    }
  }
  const station = new T.Group()
  scene.add(station)
  if (area === 'trainB') {
    const outside = box({ x: 430, y: 550, w: 80, h: 100 }, 0.12, stone, -0.12)
    scene.remove(outside)
    station.add(outside)
    const wall = box({ x: 400, y: 640, w: 140, h: 5 }, 3, stone)
    scene.remove(wall)
    station.add(wall)
    const stationLabel = label(`${initial4.destination} — 비상 정차`, 470, 635, 1.8, 2.6, Math.PI)
    stateLabels.set('destination', stationLabel)
    // Visible from the door, with no extra interaction target or new event.
    for (let i = 0; i < 3; i++)
      for (const dx of [0, 9]) {
        const shoe = box({ x: 442 + i * 20 + dx, y: 585, w: 6, h: 14 }, 0.08, dark)
        scene.remove(shoe)
        station.add(shoe)
      }
  }
  let target = createSceneTarget(layout, scale, interactables, blockers)
  let lastState = '',
    travel = 0
  const update = (c3: Chapter3, c4: Chapter4, dt: number, reduced: boolean) => {
    const key = JSON.stringify([
      c3.npcBoarded,
      c4.started,
      c4.links,
      c4.sync,
      c4.arrived,
      c4.destination,
    ])
    if (key !== lastState) {
      layout = layoutFor(c3, c4)
      if (npc && npcProxy && npcArrived !== c4.arrived) {
        const e = layout.entities.find((e) => e.id === 'survivor')!
        const p = new T.Vector3((e.x + e.w / 2 - 480) / scale, 0, (e.y + e.h / 2 - 310) / scale)
        const delta = p.clone().sub(new T.Vector3(npcProxy.position.x, 0, npcProxy.position.z))
        // Arrival dialogue covers the single actor's move to the door-side waiting position.
        npc.relocate(p)
        npc.setSeated(false)
        npcProxy.position.x = p.x
        npcProxy.position.z = p.z
        dress.forEach((mesh, i) => {
          mesh.position.add(delta)
          if (i === 0) mesh.position.y += 0.18
        })
        npcArrived = c4.arrived
      }
      target = createSceneTarget(layout, scale, interactables, blockers)
      lastState = key
      stopFixture?.update({ active: c4.sync === 'accepted' })
      const on = !c4.started || c4.links.power
      ambient.intensity = on ? 1.9 : 0.7
      lights.forEach((light) => {
        light.intensity = on ? 32 : 0
      })
      lamps.forEach((lamp) => {
        lamp.visible = on
      })
      stateLabels.get('train-route')?.(
        c4.arrived
          ? `${c4.destination} — 비상 정차\n출입문 개방`
          : c4.sync === 'accepted'
            ? '정차 요청 수락\n다음 안전 정차 지점 진입'
            : '비상 회송\n정차 요청 없음',
      )
      stateLabels.get('train-stop')?.(trainPanelStatus(c4))
      stateLabels.get('train-devices')?.(
        trainLinks
          .map(
            (link) =>
              `${link.mark.split(' / ')[0]} / ${link.identifier} · ${c4.links[link.id] ? '연결' : '분리'}`,
          )
          .join('\n'),
      )
      stateLabels.get('train-exit')?.(c4.arrived ? `${c4.destination} · 문 개방` : '운행 중 · 잠김')
      stateLabels.get('destination')?.(`${c4.destination} — 비상 정차`)
      equipment.forEach((mesh, id) => {
        const m = mesh.material as T.MeshStandardMaterial
        m.color.set(c4.links[id as keyof typeof c4.links] ? '#91bba0' : '#b49063')
        if (m instanceof T.MeshStandardMaterial) m.emissive.copy(m.color)
        mesh.position.z =
          mesh.userData.connectedZ + (c4.links[id as keyof typeof c4.links] ? 0 : 0.12)
      })
      if (exit) {
        exit.visible = !c4.arrived
        exit.position.y = c4.arrived ? 3.5 : 1.25
      }
      station.visible = c4.arrived
      scene.userData.lightsOn = on
      scene.userData.doorOpen = c4.arrived
      scene.userData.npcCount = npc ? 1 : 0
      scene.userData.trainStatus = trainPanelStatus(c4)
    }
    if (!reduced && !c4.arrived) travel = (travel + dt * (c4.sync === 'accepted' ? 6 : 30)) % 90
    tunnelBars.forEach((pane) => {
      pane.position.x = (pane.userData.base + (reduced ? 0 : travel % 30) - 480) / scale
      pane.visible = !c4.arrived
    })
    scene.userData.travel = travel
    npc?.update(dt, reduced)
    scene.updateMatrixWorld(true)
  }
  update(initial3, initial4, 0, false)
  return {
    scene,
    ready: npc?.ready ?? Promise.resolve(),
    target: (camera: T.Camera) => target(camera),
    highlight: (_id: string | null) => {
      void _id
    },
    updateTrain: update,
    dispose: () => {
      npc?.dispose()
      disposeSceneObject(scene)
    },
  }
}

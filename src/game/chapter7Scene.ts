import * as T from 'three'
import { getWorld } from './world'
import type { Rect } from './world'
import type { Chapter7 } from './chapter7'
import { remaining7, rearOpen } from './chapter7'
import { facilityProfiles } from './facilityProfiles'
import { sceneScale } from './firstPerson'
import { facilityLabel } from './facilityVisuals'
import { createSceneTarget, registerFacilityTarget, disposeSceneObject } from './sceneInteraction'
import { createThreatVisual } from './threatVisual'
import { createThreat } from './threat'
import { loadOhModel } from './ohModel'

// Same authoritative world and interaction proxies as the other chapters; no physics fork.
export const createShelterDefenseScene = (
  initial: Chapter7,
  companion: boolean,
  onError: () => void,
) => {
  const scene = new T.Scene(),
    scale = sceneScale('shelterDefense')
  scene.background = new T.Color('#263c42')
  scene.fog = new T.FogExp2('#263c42', 0.012)
  const metal = new T.MeshStandardMaterial({ color: '#617879', roughness: 0.85 })
  const wall = new T.MeshStandardMaterial({ color: '#6e7970', roughness: 0.96 })
  const warm = new T.MeshStandardMaterial({ color: '#b69968', roughness: 0.8 })
  const yellow = new T.MeshStandardMaterial({ color: '#d8ae53', roughness: 0.65, metalness: 0.35 })
  const box = (r: Rect, h: number, mat: T.Material, bottom = 0) => {
    const m = new T.Mesh(new T.BoxGeometry(r.w / scale, h, r.h / scale), mat)
    m.position.set((r.x + r.w / 2 - 480) / scale, bottom + h / 2, (r.y + r.h / 2 - 310) / scale)
    scene.add(m)
    return m
  }
  const layout = () =>
    getWorld(
      'shelterDefense',
      'unseen',
      companion,
      [],
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      initial,
    )
  const base = layout(),
    interactables: T.Object3D[] = [],
    blockers: T.Object3D[] = []
  box({ x: 40, y: 60, w: 880, h: 500 }, 0.1, metal, -0.1)
  // Window in north wall exposes only the exterior strip. It is not an exit.
  for (const r of [
    { x: 40, y: 60, w: 200, h: 10 },
    { x: 370, y: 60, w: 550, h: 10 },
    { x: 40, y: 550, w: 880, h: 10 },
    { x: 40, y: 60, w: 10, h: 500 },
    { x: 910, y: 60, w: 10, h: 500 },
  ])
    blockers.push(box(r, 3.4, wall))
  box({ x: 240, y: 60, w: 130, h: 10 }, 0.8, wall)
  box({ x: 240, y: 60, w: 130, h: 10 }, 1, wall, 2.4)
  for (const r of base.obstacles.filter((r) => !(r.x === 610 && r.y === 430)))
    blockers.push(box(r, 2.8, wall))
  const rearGate = box({ x: 610, y: 430, w: 20, h: 75 }, 2.7, metal)
  const fireGate = box({ x: 740, y: 285, w: 12, h: 75 }, 2.7, metal)
  blockers.push(rearGate, fireGate)
  const labels = base.entities.map((e) => {
    registerFacilityTarget(
      scene,
      scale,
      e,
      e.id === 's7-survivor' ? 1.9 : 2,
      interactables,
      blockers,
    )
    const plate = facilityLabel(scene, scale, e.label, e.x + e.w / 2, e.y + e.h / 2, 2.25, 2)
    if (e.id === 's7-survivor') return { id: e.id, plate }
    if (e.id === 's7-winch') {
      const wheel = new T.Mesh(new T.TorusGeometry(0.34, 0.06, 6, 16), yellow)
      wheel.position.set((e.x + e.w / 2 - 480) / scale, 1.2, (e.y + e.h / 2 - 310) / scale + 0.22)
      scene.add(wheel)
      box(e, 1.2, metal)
    } else if (e.id === 's7-firedoor') {
      box(e, 1.1, metal)
      box({ x: e.x - 4, y: e.y + e.h, w: 32, h: 4 }, 0.09, yellow, 1.1)
    } else if (e.id === 's7-window') box(e, 1, wall)
    else if (e.id === 's7-rest') box(e, 0.4, warm)
    else box(e, facilityProfiles[e.id]?.top ?? 1.5, metal)
    return { id: e.id, plate }
  })
  const brace = new T.Group()
  for (const x of [-0.27, 0.27]) {
    const post = new T.Mesh(new T.BoxGeometry(0.07, 1.25, 0.07), yellow)
    post.position.set(x, 0.65, 0)
    brace.add(post)
  }
  const diagonal = new T.Mesh(new T.BoxGeometry(0.06, 1.3, 0.07), yellow)
  diagonal.rotation.z = -0.4
  diagonal.position.y = 0.65
  brace.add(diagonal)
  scene.add(brace)
  const carry = brace.clone()
  scene.add(carry)
  scene.add(new T.HemisphereLight('#ecedce', '#293c45', 2.1))
  for (const [x, y, color] of [
    [300, 300, 0xe0d0aa],
    [780, 300, 0xa1c8c8],
  ] as const) {
    const light = new T.PointLight(color, 50, 13)
    light.position.set((x - 480) / scale, 2.8, (y - 310) / scale)
    scene.add(light)
  }
  const entranceLeaf = box({ x: 55, y: 220, w: 12, h: 70 }, 2.6, metal)
  const doorDamage = box({ x: 70, y: 240, w: 5, h: 28 }, 0.1, yellow, 1.2)
  const outsideFloor = box({ x: 180, y: -80, w: 260, h: 140 }, 0.08, metal)
  outsideFloor.name = 'exterior-only'
  const enemyVisual = createThreatVisual(scene, 'shelterDefense')
  const enemy = createThreat()
  enemy.position = { x: 260, y: 0 }
  let distance = 0
  const npcStart = base.entities.find((e) => e.id === 's7-survivor')
  const npc = companion
    ? loadOhModel(
        scene,
        new T.Vector3((npcStart!.x + 14 - 480) / scale, 0, (npcStart!.y + 14 - 310) / scale),
        onError,
        'survivor',
        true,
      )
    : null
  let relocated = ['secured', 'complete'].includes(initial.phase)
  const target = createSceneTarget(base, scale, interactables, blockers)
  const update = (c: Chapter7, dt: number, active: boolean, camera: T.Camera) => {
    rearGate.visible = !rearOpen(c)
    rearGate.scale.y = rearOpen(c) ? 0.001 : 1
    // Keep hidden gate meshes out of ray blocking by moving them above the ceiling.
    rearGate.position.y = rearOpen(c) ? 6 : 1.35
    fireGate.visible = c.fireDoor !== 'open'
    fireGate.position.y = c.fireDoor === 'open' ? 6 : 1.35
    const danger = Math.max(0, 1 - remaining7(c) / 180)
    entranceLeaf.rotation.z = c.phase === 'respond' ? danger * 0.035 : 0
    doorDamage.scale.z = 1 + danger * 1.5
    labels
      .find((l) => l.id === 's7-entrance')
      ?.plate(
        c.phase === 'secured' || c.phase === 'complete'
          ? '외부 반입문 · 내부 격리 완료'
          : c.kit === 'entrance'
            ? '반입문 · 지지대 고정 / +120초'
            : danger > 0.66
              ? '⚠ 반입문 잠금부 변형 · 유지 여유 감소'
              : '외부 반입문 · 손상된 잠금부',
      )
    carry.visible = c.kit === 'carried'
    if (carry.visible) {
      carry.position.set(0.42, -0.75, -0.8).applyMatrix4(camera.matrixWorld)
      carry.quaternion.copy(camera.quaternion)
      carry.scale.setScalar(0.42)
    }
    brace.visible = c.kit !== 'carried'
    const anchor =
      c.kit === 'entrance'
        ? { x: 74, y: 250 }
        : c.kit === 'rear'
          ? { x: 594, y: 465 }
          : { x: 500, y: 100 }
    brace.position.set((anchor.x - 480) / scale, 0, (anchor.y - 310) / scale)
    if (active && c.phase === 'respond') distance += dt * 30
    // Exterior-only patrol approaches the known door sound, never reads player coordinates.
    const t = distance % 240
    enemy.position = { x: 245 + (t < 120 ? t : 240 - t), y: 0 }
    enemy.heading = t < 120 ? 0 : Math.PI
    enemyVisual.update(enemy, dt, active, 0, false)
    if (npc && !relocated && ['secured', 'complete'].includes(c.phase)) {
      npc.relocate(new T.Vector3((799 - 480) / scale, 0, (254 - 310) / scale))
      relocated = true
      const proxy = interactables.find((m) => m.userData.entityId === 's7-survivor')
      if (proxy) proxy.position.set((799 - 480) / scale, 0.95, (254 - 310) / scale)
      const entity = base.entities.find((e) => e.id === 's7-survivor')
      if (entity) Object.assign(entity, { x: 785, y: 240 })
      const tag = labels.find((l) => l.id === 's7-survivor')?.plate
      if (tag) {
        tag('다친 생존자 · 준비 구획')
        tag.mesh.position.x = (799 - 480) / scale
        tag.mesh.position.z = (254 - 310) / scale
      }
    }
    npc?.update(active ? dt : 0, false)
    scene.userData.responseRemaining = remaining7(c)
    scene.updateMatrixWorld(true)
  }
  return {
    scene,
    ready: npc?.ready ?? Promise.resolve(),
    target,
    highlight: (_id: string | null) => {
      void _id
    },
    updateDefense: update,
    dispose: () => {
      npc?.dispose()
      enemyVisual.dispose()
      disposeSceneObject(scene)
    },
  }
}

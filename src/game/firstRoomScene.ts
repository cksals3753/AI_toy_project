import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { firstRoomAssets, FIRST_PERSON_SCALE as SCALE } from './firstPerson'
import { room } from './world'
import type { Entity, Rect } from './world'

export function createFirstRoomScene(onAssetError: () => void) {
  const scene = new T.Scene()
  scene.background = new T.Color('#0b1419')
  scene.fog = new T.FogExp2('#0b1419', 0.035)
  const resources: T.Texture[] = []
  let disposed = false
  const interactables: T.Object3D[] = []
  const blockers: T.Object3D[] = []
  const highlights = new Map<string, T.Mesh>()
  const stone = new T.MeshStandardMaterial({ color: '#425157', roughness: 0.93 })
  const steel = new T.MeshStandardMaterial({ color: '#64716c', roughness: 0.65, metalness: 0.4 })
  const dark = new T.MeshStandardMaterial({ color: '#182831', roughness: 0.85 })
  const lamp = new T.MeshStandardMaterial({
    color: '#d17b56',
    emissive: '#ec5b36',
    emissiveIntensity: 2,
  })
  const x = (n: number) => (n - 480) / SCALE
  const z = (n: number) => (n - 310) / SCALE
  function box(rect: Rect, height: number, material: T.Material, bottom = 0) {
    const mesh = new T.Mesh(new T.BoxGeometry(rect.w / SCALE, height, rect.h / SCALE), material)
    mesh.position.set(x(rect.x + rect.w / 2), height / 2 + bottom, z(rect.y + rect.h / 2))
    scene.add(mesh)
    return mesh
  }
  // Small authored repeat texture: grout, scuffed ceramic and repaired floor tiles.
  const tileCanvas = document.createElement('canvas')
  tileCanvas.width = tileCanvas.height = 128
  const ctx = tileCanvas.getContext('2d')!
  ctx.fillStyle = '#2b363b'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#596266'
  ctx.fillRect(3, 3, 122, 122)
  ctx.strokeStyle = '#667073'
  ctx.strokeRect(5, 5, 118, 118)
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = i % 2 ? '#525b5f' : '#62696b'
    ctx.fillRect(((i * 31) % 120) + 4, ((i * 47) % 120) + 4, 3, 1)
  }
  const tiles = new T.CanvasTexture(tileCanvas)
  tiles.wrapS = tiles.wrapT = T.RepeatWrapping
  tiles.repeat.set(18, 10)
  tiles.colorSpace = T.SRGBColorSpace
  resources.push(tiles)
  box(
    { x: 54, y: 70, w: 852, h: 480 },
    0.12,
    new T.MeshStandardMaterial({ map: tiles, color: '#91a1a2', roughness: 0.82 }),
    -0.12,
  )
  // Wall panels and service band, kept exactly outside the existing collision bounds.
  for (const wall of [
    { x: 44, y: 60, w: 872, h: 10 },
    { x: 44, y: 550, w: 872, h: 10 },
    { x: 44, y: 70, w: 10, h: 480 },
    { x: 906, y: 70, w: 10, h: 480 },
  ]) {
    blockers.push(box(wall, 3.4, stone))
    box(wall, 0.14, steel, 1.02)
    box(wall, 0.12, dark, 0)
  }
  for (let n = 60; n < 905; n += 80) {
    box({ x: n, y: 69, w: 2, h: 2 }, 3.4, dark)
    box({ x: n, y: 549, w: 2, h: 2 }, 3.4, dark)
  }
  box({ x: 44, y: 60, w: 872, h: 500 }, 0.12, dark, 3.4)
  scene.add(new T.HemisphereLight('#a8c3c7', '#202b2a', 1.2))
  const light = new T.PointLight('#b8d6cd', 38, 16, 2)
  light.position.set(0, 2.8, 1)
  scene.add(light)
  for (const px of [180, 480, 780]) {
    box({ x: px - 28, y: 110, w: 56, h: 10 }, 0.05, lamp, 2.95)
    const emergency = new T.PointLight('#ed754d', 11, 6, 2)
    emergency.position.set(x(px), 2.6, z(120))
    scene.add(emergency)
  }
  const loader = new GLTFLoader()
  let westDoor: T.Object3D | null = null
  let westCover: T.Mesh | null = null
  let doorProgress = 0
  function model(path: string, rect: Rect, height: number, rotation = 0, doorId?: string) {
    loader.load(
      path,
      ({ scene: source }) => {
        if (disposed) {
          disposeObject(source)
          return
        }
        const group = new T.Group()
        source.rotation.y = rotation
        group.add(source)
        group.updateMatrixWorld(true)
        const bounds = new T.Box3().setFromObject(group),
          size = bounds.getSize(new T.Vector3())
        group.scale.set(rect.w / SCALE / size.x, height / size.y, rect.h / SCALE / size.z)
        const center = bounds.getCenter(new T.Vector3())
        group.position.set(
          x(rect.x + rect.w / 2) - center.x * group.scale.x,
          -bounds.min.y * group.scale.y,
          z(rect.y + rect.h / 2) - center.z * group.scale.z,
        )
        group.traverse((obj) => {
          if (obj instanceof T.Mesh) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
            materials.forEach((m) => {
              if (m instanceof T.MeshStandardMaterial) {
                m.color.multiplyScalar(0.7)
                m.roughness = 0.85
              }
            })
          }
        })
        scene.add(group)
        if (doorId === 'west') westDoor = source.getObjectByName('door') ?? null
        if (doorId && westCover && doorId === 'west') westCover.visible = false
      },
      undefined,
      () => {
        if (!disposed) onAssetError()
      },
    )
  }
  for (const [i, rect] of room.obstacles.entries()) {
    if (i < 2) {
      model(firstRoomAssets.bench, rect, 0.85)
      blockers.push(box(rect, 0.42, dark))
    } else blockers.push(box(rect, 3.4, steel))
  }
  function sign(text: string, rect: Rect, height: number, rotation = 0, color = '#b8c9bc') {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 192
    const context = canvas.getContext('2d')!
    context.fillStyle = '#14262b'
    context.fillRect(0, 0, 512, 192)
    context.strokeStyle = color
    context.lineWidth = 8
    context.strokeRect(6, 6, 500, 180)
    context.fillStyle = color
    context.textAlign = 'center'
    context.font = 'bold 30px sans-serif'
    const lines = text.split('\n')
    lines.forEach((line, i) => context.fillText(line, 256, 78 + i * 48))
    const texture = new T.CanvasTexture(canvas)
    texture.colorSpace = T.SRGBColorSpace
    resources.push(texture)
    const mesh = new T.Mesh(
      new T.PlaneGeometry(rect.w / SCALE, rect.h / SCALE),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    )
    mesh.position.set(x(rect.x), height, z(rect.y))
    mesh.rotation.y = rotation
    scene.add(mesh)
    return mesh
  }
  sign('신도림 · SINDORIM\n정비 대기실 / B2', { x: 480, y: 72, w: 180, h: 65 }, 2.45)
  for (const entity of room.entities) {
    const rect =
      entity.kind === 'door' ? { ...entity, x: entity.id === 'west' ? 54 : 896, w: 10 } : entity
    const height = entity.kind === 'door' ? 2.5 : entity.kind === 'npc' ? 1.75 : 1.65
    const proxy = box(rect, height, new T.MeshBasicMaterial({ visible: false }))
    proxy.userData.entityId = entity.id
    interactables.push(proxy)
    if (entity.kind === 'door') {
      model(
        firstRoomAssets.door,
        rect,
        height,
        entity.id === 'west' ? Math.PI / 2 : -Math.PI / 2,
        entity.id,
      )
      // Door geometry is backed by a visible solid panel and shares existing closed-door collision.
      const cover = box(rect, height, steel)
      if (entity.id === 'west') westCover = cover
      sign(
        entity.id === 'west' ? '정비 통로\nWEST / 정비문' : '2번 출구\nEAST',
        { x: entity.id === 'west' ? 55 : 895, y: entity.y + entity.h / 2, w: 80, h: 34 },
        2.85,
        entity.id === 'west' ? Math.PI / 2 : -Math.PI / 2,
        entity.color,
      )
    } else if (entity.id === 'cabinet') {
      model(firstRoomAssets.cabinet, rect, height)
      sign(
        '비상 물품\n가까이에서 조사',
        { x: entity.x + entity.w / 2, y: entity.y + entity.h + 1, w: 65, h: 24 },
        1.3,
      )
    } else if (entity.kind === 'npc') {
      const texture = new T.TextureLoader().load(firstRoomAssets.characters.oh.sprite)
      texture.colorSpace = T.SRGBColorSpace
      texture.repeat.set(1 / 16, 1 / 6)
      texture.offset.set(0, 1 - (firstRoomAssets.characters.oh.row + 1) / 6)
      texture.magFilter = T.NearestFilter
      resources.push(texture)
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true }))
      sprite.position.set(x(entity.x + entity.w / 2), 0.9, z(entity.y + entity.h / 2))
      sprite.scale.set(1.2, 1.8, 1)
      scene.add(sprite)
    } else {
      box(rect, height, entity.id === 'panel' ? steel : dark)
      sign(
        entity.id === 'panel' ? '침수 감지\n기록 확인' : '역 안내도\n현 위치 · 정비실',
        { x: entity.x + entity.w / 2, y: entity.y + entity.h + 1, w: entity.w - 5, h: 45 },
        1.15,
        0,
        entity.color,
      )
      if (entity.id === 'panel')
        box({ x: entity.x + 8, y: entity.y + entity.h + 1, w: 8, h: 2 }, 0.08, lamp, 1.55)
    }
    const ring = new T.Mesh(
      new T.RingGeometry(0.33, 0.38, 24),
      new T.MeshBasicMaterial({
        color: '#d4eaa9',
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(x(rect.x + rect.w / 2), 0.025, z(rect.y + rect.h / 2))
    ring.visible = false
    highlights.set(entity.id, ring)
    scene.add(ring)
  }
  const ray = new T.Raycaster()
  function target(camera: T.Camera): Entity | null {
    ray.setFromCamera(new T.Vector2(0, 0), camera)
    const hit = ray.intersectObjects([...interactables, ...blockers], false)[0]
    if (!hit || hit.distance > 2.1 || !hit.object.userData.entityId) return null
    const entity = room.entities.find((entity) => entity.id === hit.object.userData.entityId)
    if (!entity) return null
    const px = camera.position.x * SCALE + 480,
      py = camera.position.z * SCALE + 310
    const distance = Math.hypot(
      px - Math.max(entity.x, Math.min(px, entity.x + entity.w)),
      py - Math.max(entity.y, Math.min(py, entity.y + entity.h)),
    )
    return distance < 60 ? entity : null
  }
  function highlight(id: string | null) {
    highlights.forEach((mesh, key) => {
      mesh.visible = key === id
    })
  }
  function disposeObject(root: T.Object3D) {
    root.traverse((obj) => {
      if (obj instanceof T.Mesh || obj instanceof T.Sprite) {
        if (obj instanceof T.Mesh) obj.geometry.dispose()
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((material) => {
          for (const value of Object.values(material))
            if (value instanceof T.Texture) value.dispose()
          material.dispose()
        })
      }
    })
  }
  return {
    scene,
    animate(open: boolean, dt: number, reducedMotion: boolean) {
      const goal = open ? 1 : 0
      doorProgress = reducedMotion ? goal : T.MathUtils.damp(doorProgress, goal, 5, dt)
      if (westDoor) westDoor.rotation.y = -doorProgress * Math.PI * 0.45
      if (westCover && open) westCover.visible = false
    },
    target,
    highlight,
    dispose() {
      disposed = true
      disposeObject(scene)
      resources.forEach((texture) => texture.dispose())
    },
  }
}

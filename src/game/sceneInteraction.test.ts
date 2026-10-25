import { describe, it, expect } from 'vitest'
import * as T from 'three'
import { createSceneTarget } from './sceneInteraction'
import { worlds } from './world'
describe('3D line of sight', () => {
  it('blocks target selection through solid walls and restores selection without the occluder', () => {
    const layout = {
      ...worlds.hall,
      entities: [
        {
          id: 'test',
          label: '검사',
          kind: 'object' as const,
          x: 470,
          y: 265,
          w: 20,
          h: 10,
          color: '#fff',
        },
      ],
    }
    const target = new T.Mesh(
      new T.BoxGeometry(0.5, 2, 0.25),
      new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide }),
    )
    target.position.set(0, 1, -1)
    target.userData.entityId = 'test'
    target.updateMatrixWorld()
    const wall = new T.Mesh(
      new T.BoxGeometry(3, 3, 0.05),
      new T.MeshBasicMaterial({ visible: false }),
    )
    wall.position.set(0, 1, -0.5)
    wall.updateMatrixWorld()
    const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
    camera.position.set(0, 1, 0)
    camera.updateMatrixWorld()
    expect(createSceneTarget(layout, 40, [target], [])(camera)?.id).toBe('test')
    expect(createSceneTarget(layout, 40, [target], [wall])(camera)).toBeNull()
    target.geometry.dispose()
    wall.geometry.dispose()
    target.material.dispose()
    wall.material.dispose()
  })
  it('does not activate far away objects even when visually aimed at them', () => {
    const target = new T.Mesh(
      new T.BoxGeometry(1, 2, 1),
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    )
    target.position.set(0, 1, -4)
    target.userData.entityId = 'hall-map'
    target.updateMatrixWorld()
    const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
    camera.position.set(0, 1, 0)
    camera.updateMatrixWorld()
    expect(createSceneTarget(worlds.hall, 40, [target], [])(camera)).toBeNull()
    target.geometry.dispose()
    target.material.dispose()
  })
})

describe('limited aim assistance', () => {
  const fixture = () => {
    const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
    camera.position.set(0, 1, 0)
    camera.updateMatrixWorld()
    const entities = ['left', 'right'].map((id, i) => ({
      id,
      label: id,
      kind: 'object' as const,
      x: 478 + i * 4,
      y: 265,
      w: 2,
      h: 5,
      color: '#fff',
    }))
    const meshes = entities.map((e, i) => {
      const mesh = new T.Mesh(
        new T.BoxGeometry(0.025, 0.1, 0.05),
        new T.MeshBasicMaterial({ side: T.DoubleSide }),
      )
      mesh.position.set(i === 0 ? -0.028 : 0.028, 1, -1)
      mesh.userData.entityId = e.id
      mesh.updateMatrixWorld()
      return mesh
    })
    return { camera, meshes, layout: { ...worlds.hall, entities } }
  }
  it('selects a tiny offset proxy, keeps adjacent IDs distinct and resists small camera jitter', () => {
    const { camera, meshes, layout } = fixture()
    const select = createSceneTarget(layout, 40, meshes, [])
    expect(select(camera)?.id).toBe('left')
    camera.rotation.y = -0.002
    camera.updateMatrixWorld()
    expect(select(camera)?.id).toBe('left')
    camera.rotation.y = -0.028
    camera.updateMatrixWorld()
    expect(select(camera)?.id).toBe('right')
    meshes.forEach((m) => {
      m.geometry.dispose()
      m.material.dispose()
    })
  })
  it('drops a retained target immediately behind a closed barrier and outside reach', () => {
    const { camera, meshes, layout } = fixture()
    const wall = new T.Mesh(
      new T.BoxGeometry(2, 2, 0.1),
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    )
    wall.position.set(0, 1, 1)
    wall.updateMatrixWorld()
    const select = createSceneTarget(layout, 40, meshes, [wall])
    expect(select(camera)).not.toBeNull()
    wall.position.z = -0.5
    wall.updateMatrixWorld()
    expect(select(camera)).toBeNull()
    wall.position.z = 1
    wall.updateMatrixWorld()
    camera.position.z = 2
    camera.updateMatrixWorld()
    expect(select(camera)).toBeNull()
    meshes.concat(wall).forEach((m) => {
      m.geometry.dispose()
      m.material.dispose()
    })
  })
})

describe('working-surface reach', () => {
  it('allows the edge of a large control cabinet without using its distant pivot, but retains per-target reach and occlusion', () => {
    const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
    camera.position.set(0, 1, 0)
    camera.updateMatrixWorld()
    const cabinet = new T.Mesh(
      new T.BoxGeometry(6, 2, 0.1),
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    )
    cabinet.position.set(-2, 1, -1.8)
    cabinet.userData.entityId = 'powerboard'
    cabinet.updateMatrixWorld()
    const entity = {
      id: 'powerboard',
      label: 'cabinet',
      kind: 'object' as const,
      x: 200,
      y: 200,
      w: 300,
      h: 5,
      color: '#fff',
    }
    const layout = { ...worlds.hall, entities: [entity] }
    const select = createSceneTarget(layout, 50, [cabinet], [])
    expect(select(camera)?.id).toBe('powerboard')
    camera.rotation.y = 0.05
    camera.updateMatrixWorld()
    expect(select(camera)?.id).toBe('powerboard')
    camera.position.z = 1.2
    camera.updateMatrixWorld()
    expect(select(camera)).toBeNull()
    camera.position.z = 0
    camera.rotation.y = 0
    camera.updateMatrixWorld()
    const wall = new T.Mesh(new T.BoxGeometry(2, 2, 0.1), cabinet.material)
    wall.position.set(0, 1, -0.7)
    wall.updateMatrixWorld()
    expect(createSceneTarget(layout, 50, [cabinet], [wall])(camera)).toBeNull()
    cabinet.userData.entityId = 'ordinary'
    expect(
      createSceneTarget(
        { ...layout, entities: [{ ...entity, id: 'ordinary' }] },
        50,
        [cabinet],
        [],
      )(camera),
    ).toBeNull()
    cabinet.geometry.dispose()
    wall.geometry.dispose()
    cabinet.material.dispose()
  })
  it('keeps a small foreground control selectable in front of a broad panel', () => {
    const camera = new T.PerspectiveCamera(64, 1, 0.05, 40)
    camera.position.set(0, 1, 0)
    camera.updateMatrixWorld()
    const big = new T.Mesh(
      new T.BoxGeometry(4, 2, 0.1),
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    )
    const small = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.08), big.material)
    big.position.set(0, 1, -1.4)
    small.position.set(0, 1, -1.1)
    big.userData.entityId = 'big'
    small.userData.entityId = 'small'
    big.updateMatrixWorld()
    small.updateMatrixWorld()
    const layout = {
      ...worlds.hall,
      entities: ['big', 'small'].map((id) => ({
        id,
        label: id,
        kind: 'object' as const,
        x: 470,
        y: 250,
        w: 20,
        h: 5,
        color: '#fff',
      })),
    }
    expect(createSceneTarget(layout, 40, [big, small], [])(camera)?.id).toBe('small')
    big.geometry.dispose()
    small.geometry.dispose()
    big.material.dispose()
  })
})

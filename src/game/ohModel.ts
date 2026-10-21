import * as T from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { firstRoomAssets } from './firstPerson'
export const loadOhModel = (
  scene: T.Scene,
  position: T.Vector3,
  onError: () => void,
  identity: 'oh' | 'survivor' = 'oh',
  seatedInitially = false,
) => {
  let disposed = false,
    mixer: T.AnimationMixer | null = null,
    root: T.Group | null = null
  let seated = seatedInitially
  const legs: T.Bone[] = []
  const legRest = new Map<T.Bone, T.Quaternion>()
  // File bytes are cached across car re-entry; every scene still owns and disposes its instances.
  T.Cache.enabled = true
  const pose = () => {
    if (!root) return
    root.position.y = seated ? -0.18 : 0
    legs.forEach((bone) => bone.quaternion.copy(legRest.get(bone)!))
    if (!seated) return
    root.updateMatrixWorld(true)
    // FBX bones do not share a simple local X axis. Aim thighs forward and
    // shins downward in world space instead of overwriting local Euler angles.
    const forward = new T.Vector3(0, 0, 1).applyQuaternion(
      root.getWorldQuaternion(new T.Quaternion()),
    )
    for (const bone of legs) {
      const child = bone.children.find((child) => child instanceof T.Bone) as T.Bone | undefined
      if (!child || !bone.parent) continue
      const direction = child
        .getWorldPosition(new T.Vector3())
        .sub(bone.getWorldPosition(new T.Vector3()))
        .normalize()
      const desired = bone.name.endsWith('UpLeg') ? forward : new T.Vector3(0, -1, 0)
      const rotation = new T.Quaternion()
        .setFromUnitVectors(direction, desired)
        .multiply(bone.getWorldQuaternion(new T.Quaternion()))
      bone.quaternion.copy(
        bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation),
      )
      root.updateMatrixWorld(true)
    }
  }
  let skinReady = false,
    modelReady = false
  let resolveReady!: () => void, rejectReady!: (error: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  const finishReady = () => {
    if (skinReady && modelReady) resolveReady()
  }
  const failReady = () => {
    if (!disposed) {
      onError()
      rejectReady(new Error('인물 에셋을 불러오지 못했습니다.'))
    }
  }
  const loader = new FBXLoader()
  const skin = new T.TextureLoader().load(
    firstRoomAssets.characters[identity].skin,
    () => {
      skinReady = true
      finishReady()
    },
    undefined,
    failReady,
  )
  skin.colorSpace = T.SRGBColorSpace
  skin.anisotropy = 2
  loader.load(
    firstRoomAssets.characters.oh.model,
    (character) => {
      if (disposed) {
        dispose(character)
        return
      }
      character.updateMatrixWorld(true)
      const bounds = new T.Box3().setFromObject(character),
        size = bounds.getSize(new T.Vector3())
      const scale = 1.74 / size.y
      character.scale.setScalar(scale)
      character.position.set(
        -bounds.getCenter(new T.Vector3()).x * scale,
        -bounds.min.y * scale,
        -bounds.getCenter(new T.Vector3()).z * scale,
      )
      const group = new T.Group()
      group.add(character)
      group.position.copy(position)
      if (identity === 'survivor') group.rotation.y = Math.PI
      root = group
      const material = new T.MeshStandardMaterial({ map: skin, roughness: 0.98, metalness: 0 })
      character.traverse((obj) => {
        if (obj instanceof T.Bone && /^(Left|Right)(UpLeg|Leg)$/.test(obj.name)) {
          legs.push(obj)
          legRest.set(obj, obj.quaternion.clone())
        }
        if (obj instanceof T.Mesh) {
          const old = Array.isArray(obj.material) ? obj.material : [obj.material]
          old.forEach((m) => m.dispose())
          obj.material = material
          obj.frustumCulled = false
        }
      })
      group.name = `${identity}-low-poly`
      scene.add(group)
      if (seated) pose()
      scene.userData.ohModel = true
      modelReady = true
      finishReady()
      loader.load(
        firstRoomAssets.characters.oh.idle,
        (animation) => {
          if (!disposed && animation.animations[0]) {
            mixer = new T.AnimationMixer(character)
            mixer.clipAction(animation.animations[0]).play()
            mixer.update(0)
            scene.userData.ohIdle = true
          }
          dispose(animation)
        },
        undefined,
        () => {
          if (!disposed) onError()
        },
      )
    },
    undefined,
    failReady,
  )
  const dispose = (object: T.Object3D) => {
    object.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.geometry.dispose()
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((m) => m.dispose())
      }
    })
  }
  return {
    ready,
    setSeated: (value: boolean) => {
      seated = value
      pose()
    },
    relocate: (p: T.Vector3) => {
      if (root) root.position.copy(p)
    },
    opacity: (value: number) => {
      root?.traverse((object) => {
        if (!(object instanceof T.Mesh)) return
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          material.transparent = value < 1
          material.opacity = value
        })
      })
    },
    update(dt: number, reduced: boolean) {
      if (!reduced) mixer?.update(dt)
      if (seated) pose()
    },
    dispose() {
      disposed = true
      mixer?.stopAllAction()
      if (root) {
        scene.remove(root)
        dispose(root)
      }
      skin.dispose()
    },
  }
}

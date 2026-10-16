import * as T from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { firstRoomAssets } from './firstPerson'
export function loadOhModel(scene: T.Scene, position: T.Vector3, onError: () => void) {
  let disposed = false,
    mixer: T.AnimationMixer | null = null,
    root: T.Group | null = null
  const loader = new FBXLoader()
  const skin = new T.TextureLoader().load(
    firstRoomAssets.characters.oh.skin,
    undefined,
    undefined,
    onError,
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
      root = group
      const material = new T.MeshStandardMaterial({ map: skin, roughness: 0.98, metalness: 0 })
      character.traverse((obj) => {
        if (obj instanceof T.Mesh) {
          const old = Array.isArray(obj.material) ? obj.material : [obj.material]
          old.forEach((m) => m.dispose())
          obj.material = material
          obj.frustumCulled = false
        }
      })
      group.name = 'oh-low-poly'
      scene.add(group)
      scene.userData.ohModel = true
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
    () => {
      if (!disposed) onError()
    },
  )
  function dispose(object: T.Object3D) {
    object.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.geometry.dispose()
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((m) => m.dispose())
      }
    })
  }
  return {
    update(dt: number, reduced: boolean) {
      if (!reduced) mixer?.update(dt)
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

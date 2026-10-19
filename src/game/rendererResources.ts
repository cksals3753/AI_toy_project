import * as T from 'three'

// Three r186 shares DFG_LUT across PBR materials/renderers. Its texture dispose
// listeners retain retired renderer contexts even after WebGLRenderer.dispose().
// Keep the actual compiled uniform via the public onBeforeCompile hook, then
// release the shared GPU lookup before retiring our sole exploration renderer.
export const trackRendererLookup = (scene: T.Scene) => {
  const uniforms = new Set<T.IUniform>()
  const originals = new Map<T.Material, T.Material['onBeforeCompile']>()
  scene.traverse((object) => {
    if (!(object instanceof T.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof T.MeshStandardMaterial) || originals.has(material)) continue
      const original = material.onBeforeCompile
      originals.set(material, original)
      material.onBeforeCompile = (shader, renderer) => {
        original.call(material, shader, renderer)
        if (shader.uniforms.dfgLUT) uniforms.add(shader.uniforms.dfgLUT)
      }
    }
  })
  return () => {
    const textures = new Set<T.Texture>()
    uniforms.forEach(({ value }) => {
      if (value instanceof T.Texture && value.name === 'DFG_LUT') textures.add(value)
    })
    textures.forEach((texture) => texture.dispose())
    originals.forEach((original, material) => {
      material.onBeforeCompile = original
    })
    uniforms.clear()
    originals.clear()
  }
}

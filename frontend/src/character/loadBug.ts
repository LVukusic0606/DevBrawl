import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import mascotUrl from '../assets/mascot.glb?url'

// The 3D DevBrawl bug, made from the mascot artwork and reduced to ~80k triangles for the web.
// It is scaled so it stands this tall (in scene units) with its feet on y = 0, centered on the pedestal.
const HEIGHT = 3.2

export async function loadBug(): Promise<THREE.Object3D> {
  const gltf = await new GLTFLoader().loadAsync(mascotUrl)
  const model = gltf.scene

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      // It casts its shadow on the pedestal but doesn't shade itself: self-shadowing drew dark stripes on the head
      object.castShadow = true
      object.receiveShadow = false
    }
  })

  // Normalize size and position whatever units the model was exported in
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.scale.setScalar(HEIGHT / size.y)
  box.setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)

  // Wrap it, so the page can move the whole bug (the idle bob) without touching the centering above
  const bug = new THREE.Group()
  bug.add(model)
  return bug
}

// Frees the GPU memory of everything in a scene when the page closes
export function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const mat of materials) {
      for (const value of Object.values(mat)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      mat.dispose()
    }
  })
}

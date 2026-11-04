import * as THREE from 'three'

export const SHADOW_OFFSET = { x: 2, y: 4, z: 2 }

// Light position for a placement point: a fixed offset above and beside it.
export function lightPosition(p, offset = SHADOW_OFFSET) {
  return { x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z }
}

// Invisible floor that only receives shadows, plus a shadow-casting sun aimed at the floor point.
export function createShadow(scene) {
  const light = new THREE.DirectionalLight(0xffffff, 0)
  light.castShadow = true
  light.shadow.mapSize.set(1024, 1024)
  const cam = light.shadow.camera
  cam.left = -3; cam.right = 3; cam.top = 3; cam.bottom = -3
  cam.near = 0.1; cam.far = 12
  light.shadow.bias = -0.0005
  light.shadow.normalBias = 0.02
  scene.add(light, light.target)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShadowMaterial({ opacity: 0.35, depthWrite: false })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  floor.renderOrder = 1
  floor.visible = false
  floor.raycast = () => {} // never intercepts taps
  scene.add(floor)

  return {
    light, floor,
    place(p) {
      const lp = lightPosition(p)
      light.position.set(lp.x, lp.y, lp.z)
      light.target.position.set(p.x, p.y, p.z)
      light.target.updateMatrixWorld()
      floor.position.set(p.x, p.y, p.z)
      floor.visible = true
    }
  }
}

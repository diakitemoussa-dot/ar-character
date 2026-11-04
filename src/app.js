import * as THREE from 'three'
import { Character } from './character.js'
import { joystickToWorld } from './movement.js'

export function createApp({ modelUrl }) {
  const clock = new THREE.Clock()
  const character = new Character()
  const forward = new THREE.Vector3()
  let camera = null
  let input = { x: 0, y: 0 }
  let placed = false

  return {
    setInput(v) { input = v },

    async attach({ scene, camera: cam }) {
      camera = cam
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2))
      const sun = new THREE.DirectionalLight(0xffffff, 1.5)
      sun.position.set(2, 4, 2)
      scene.add(sun)
      character.group.visible = false
      scene.add(character.group)
      await character.load(modelUrl)
    },

    place(pos) {
      character.group.position.set(pos.x, pos.y, pos.z)
      character.group.visible = true
      placed = true
    },

    update() {
      const dt = Math.min(clock.getDelta(), 0.1)
      if (!camera || !placed) return
      camera.getWorldDirection(forward)
      character.update(dt, joystickToWorld(input, { x: forward.x, z: forward.z }))
    }
  }
}

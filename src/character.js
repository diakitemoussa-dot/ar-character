import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { pickClip, animationFor, facingAngle, approachAngle, stepPosition } from './movement.js'

const WALK_SPEED = 0.6   // meters per second
const TURN_SPEED = 8     // radians per second
const FADE = 0.2         // animation cross-fade, seconds

export class Character {
  constructor() {
    this.group = new THREE.Group()
    this.mixer = null
    this.actions = {}
    this.current = null
    this.angle = 0
  }

  // targetHeight: character height in meters in the AR world
  async load(url, targetHeight = 1.0) {
    const gltf = await new GLTFLoader().loadAsync(url)
    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    model.scale.setScalar(targetHeight / (box.max.y - box.min.y))
    box.setFromObject(model)
    model.position.y -= box.min.y // feet on the ground
    this.group.add(model)

    this.mixer = new THREE.AnimationMixer(model)
    const names = gltf.animations.map(c => c.name)
    for (const kind of ['idle', 'walk']) {
      const i = pickClip(names, kind)
      if (i >= 0) this.actions[kind] = this.mixer.clipAction(gltf.animations[i])
    }
    this.play('idle')
  }

  play(kind) {
    const next = this.actions[kind]
    if (!next || this.current === next) return
    next.reset().fadeIn(FADE).play()
    if (this.current) this.current.fadeOut(FADE)
    this.current = next
  }

  // dir: result of joystickToWorld
  update(dt, dir) {
    if (dir.magnitude > 0) {
      const p = stepPosition(this.group.position, dir, WALK_SPEED, dt)
      this.group.position.x = p.x
      this.group.position.z = p.z
      this.angle = approachAngle(this.angle, facingAngle(dir), TURN_SPEED * dt)
      this.group.rotation.y = this.angle
    }
    this.play(animationFor(dir.magnitude))
    if (this.mixer) this.mixer.update(dt)
  }
}

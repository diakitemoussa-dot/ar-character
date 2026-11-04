import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { pickClip, animationFor, facingAngle, approachAngle, stepPosition } from './movement.js'
import { horizontalOffset } from './root-motion.js'

const WALK_SPEED = 0.6   // meters per second
const TURN_SPEED = 8     // radians per second
const FADE = 0.2         // animation cross-fade, seconds
const ONCE_FADE = 0.15   // cross-fade into one-shot actions

// Direction the model faces at rotation 0, as an angle around Y.
// Mixamo-style models face +Z (0). The old sample Soldier.glb faced -Z (Math.PI).
const MODEL_FACING_OFFSET = 0

// One-shot clips loaded by exact name, keyed for the app.
const ONCE_CLIPS = { jump: 'Jump', boxing: 'Boxing', push: 'Push', enterCar: 'Entering_Car' }
// One-shot actions whose root motion moves the group.
const ROOT_MOTION = new Set(['push', 'enterCar'])

export class Character {
  constructor() {
    this.group = new THREE.Group()
    this.mixer = null
    this.actions = {}
    this.current = null
    this.currentKey = null
    this.lockedKey = null   // one-shot currently playing (blocks idle/walk selection)
    this.angle = 0
    this.hips = null
    this.hipsBase = null
    this.prevOff = { x: 0, z: 0 }
    this._v = new THREE.Vector3()
    this._w0 = new THREE.Vector3()
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
    this.model = model

    this.mixer = new THREE.AnimationMixer(model)
    const names = gltf.animations.map(c => c.name)
    for (const kind of ['idle', 'walk']) {
      const i = pickClip(names, kind)
      if (i >= 0) this.actions[kind] = this.mixer.clipAction(gltf.animations[i])
    }
    for (const [key, name] of Object.entries(ONCE_CLIPS)) {
      const clip = gltf.animations.find(c => c.name === name)
      if (!clip) continue
      const a = this.mixer.clipAction(clip)
      a.setLoop(THREE.LoopOnce, 1)
      a.clampWhenFinished = true
      this.actions[key] = a
    }
    this.play('idle')

    model.traverse(o => { if (!this.hips && o.isBone && /Hips/i.test(o.name)) this.hips = o })
    this.group.updateMatrixWorld(true)
    this.mixer.update(0)
    this.group.updateMatrixWorld(true)
    if (this.hips) {
      const b = this.group.worldToLocal(this.hips.getWorldPosition(this._v))
      this.hipsBase = { x: b.x, z: b.z }
    }
  }

  play(kind) {
    const next = this.actions[kind]
    if (!next || this.current === next) return
    next.reset().fadeIn(FADE).play()
    if (this.current) this.current.fadeOut(FADE)
    this.current = next
    this.currentKey = kind
  }

  // Plays a one-shot action (jump, boxing, push, enterCar). The caller decides when to
  // return to idle with endOnce().
  playOnce(key) {
    const next = this.actions[key]
    if (!next) return false
    next.reset()
    next.setLoop(THREE.LoopOnce, 1)
    next.clampWhenFinished = true
    next.fadeIn(ONCE_FADE).play()
    if (this.current && this.current !== next) this.current.fadeOut(ONCE_FADE)
    this.current = next
    this.currentKey = key
    this.lockedKey = key
    this.prevOff = { x: 0, z: 0 }
    return true
  }

  endOnce() {
    this.lockedKey = null
    this.play('idle')
  }

  setHidden(h) { this.group.visible = !h }

  // dir: result of joystickToWorld
  update(dt, dir) {
    if (!this.lockedKey) {
      if (dir.magnitude > 0) {
        const p = stepPosition(this.group.position, dir, WALK_SPEED, dt)
        this.group.position.x = p.x
        this.group.position.z = p.z
        this.angle = approachAngle(this.angle, facingAngle(dir), TURN_SPEED * dt)
      }
      this.play(animationFor(dir.magnitude))
    }
    this.group.rotation.y = this.angle + MODEL_FACING_OFFSET
    if (this.mixer) {
      this.mixer.update(dt)
      if (this.lockedKey && ROOT_MOTION.has(this.lockedKey)) this._extractRootMotion()
    }
  }

  // Moves the group by the clip's hips travel and pins the hips back over the group origin.
  _extractRootMotion() {
    const hips = this.hips
    if (!hips || !this.hipsBase) return
    this.group.updateMatrixWorld(true)
    const hw = hips.getWorldPosition(this._v)
    const local = this.group.worldToLocal(hw.clone())
    const off = horizontalOffset(local, this.hipsBase)
    // subtract the offset from the bone (offset expressed in the bone's parent space)
    const w0 = this.group.localToWorld(this._w0.set(0, 0, 0)).clone()
    const w1 = this.group.localToWorld(new THREE.Vector3(off.x, 0, off.z))
    const worldOff = w1.sub(w0)
    hips.position.copy(hips.parent.worldToLocal(hw.clone().sub(worldOff)))
    // move the group by the DELTA since last frame (off is cumulative within the clip)
    const dx = off.x - this.prevOff.x
    const dz = off.z - this.prevOff.z
    this.prevOff = off
    const c = Math.cos(this.group.rotation.y)
    const s = Math.sin(this.group.rotation.y)
    this.group.position.x += dx * c + dz * s
    this.group.position.z += -dx * s + dz * c
  }
}

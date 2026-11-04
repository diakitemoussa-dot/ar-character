import * as THREE from 'three'
import { fallPose } from './timeline.js'
import { opponentSpot, opponentFacing, knockback } from './opponent-geometry.js'

export const OPPONENT_RADIUS = 0.2
const DISTANCE = 1.5
const KNOCKBACK = 0.3
const TIP_TIME_FALLBACK = 0.5
// Half thickness of the body: the skeleton line runs through the middle of the body, so when
// lying it is lifted by this much to keep the back on the floor instead of inside it.
const LIE_LIFT = 0.1
const TINT = new THREE.Color('#7aa7ff')

// source: the loaded Character. The opponent is a tinted clone of its model.
export function createOpponent(scene, source) {
  const { group: model, mixer, actions } = source.cloneForOpponent()
  model.traverse(o => {
    if (!o.isMesh) return
    o.castShadow = true
    const tint = m => {
      const c = m.clone()
      if (c.color) c.color.multiply(TINT)
      if ('emissive' in c) { c.emissive = new THREE.Color(0x2244aa); c.emissiveIntensity = 0.35 }
      return c
    }
    o.material = Array.isArray(o.material) ? o.material.map(tint) : tint(o.material)
  })

  const group = new THREE.Group()  // position on floor + facing
  const pivot = new THREE.Group()  // origin at the feet; tips backward
  pivot.add(model)
  group.add(pivot)
  group.visible = false
  scene.add(group)
  if (actions.idle) actions.idle.reset().play()

  let facing = 0
  let hitAt = null   // seconds since the hit, null when standing
  let phase = null   // null | falling | down | rising
  let hitFrom = null // player position at the hit
  let kbDone = 0     // knockback applied so far (0..1)

  const api = {
    group, pivot,
    get phase() { return phase },
    get facing() { return facing },
    get position() { return group.position },
    get blocking() { return group.visible && (phase === null || phase === 'rising') },
    get blocker() { return { x: group.position.x, z: group.position.z, r: OPPONENT_RADIUS } },

    place(player) {
      const s = opponentSpot(player, DISTANCE)
      group.position.set(s.x, group.position.y, s.z)
      facing = opponentFacing(s, player)
      group.rotation.y = facing
      pivot.rotation.x = 0; pivot.position.y = 0
      hitAt = null; phase = null; kbDone = 0
      group.visible = true
    },

    isStanding() { return phase === null },

    // true if the hit was accepted
    hit(player) {
      if (!group.visible || phase !== null) return false
      hitAt = 0; phase = 'falling'; kbDone = 0
      hitFrom = { x: player.x, z: player.z }
      return true
    },

    update(dt) {
      if (hitAt !== null) {
        hitAt += dt
        const p = fallPose(hitAt)
        phase = p.phase === 'done' ? null : p.phase
        // negative X rotation tips the head toward local -Z = away from the player the opponent faces
        pivot.rotation.x = -p.tilt
        pivot.position.y = LIE_LIFT * Math.sin(p.tilt)
        const k = Math.min(1, hitAt / TIP_TIME_FALLBACK)
        const step = knockback(hitFrom, group.position, KNOCKBACK * (k - kbDone))
        group.position.x += step.x; group.position.z += step.z
        kbDone = k
        if (phase === null) { hitAt = null; pivot.rotation.x = 0; pivot.position.y = 0 }
      }
      // the idle pose is frozen while the opponent is falling or lying
      if (phase === null || phase === 'rising') mixer.update(dt)
    }
  }
  return api
}

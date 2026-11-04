import * as THREE from 'three'
import { Character } from './character.js'
import { joystickToWorld } from './movement.js'
import { ACTIONS, inReach, createActionState, startAction, tickAction } from './actions.js'
import { createCubes, WALK_FORCE, PUSH_FORCE } from './cubes.js'
import { createOpponent } from './opponent.js'
import { createShadow } from './shadow.js'
import { separate } from './physics.js'
import { DEFAULT_SCENE_SCALE } from './scale.js'

const PLAYER_RADIUS = 0.2
// the Push clip extends the arms: cubes within this gap of the player circle keep being pushed
const PUSH_REACH_GAP = 0.25
const ZERO_DIR = { x: 0, z: 0, magnitude: 0 }

// All game objects live in `world`, whose local frame is the game frame (meters, floor at y = 0).
// place() puts the group at the real-world hit point and scales it, so game logic never sees S.
export function createApp({ modelUrl, onBusy = () => {}, scale = DEFAULT_SCENE_SCALE }) {
  const world = new THREE.Group()
  const clock = new THREE.Clock()
  const character = new Character()
  const forward = new THREE.Vector3()
  let camera = null
  let input = { x: 0, y: 0 }
  let placed = false
  let cubes = null
  let shadow = null
  let opponent = null
  let action = createActionState()
  let state = 'free' // free | action
  let prev = null    // player position after last frame's collision resolution

  const pos = () => character.group.position

  function applyImpact(name) {
    const p = { x: pos().x, z: pos().z }
    const f = character.angle
    if (name === 'boxing' && opponent && inReach(p, f, opponent.position, ACTIONS.boxing.reach)) {
      opponent.hit(p)
    }
    if (name === 'boxing') cubes.boxing(p, f, ACTIONS.boxing.reach)
    else if (name === 'jump') cubes.jump(p)
  }

  return {
    character, world, scale,
    get cubes() { return cubes },
    get opponent() { return opponent },
    setInput(v) { input = v },
    getActionState() { return action },

    triggerAction(name) {
      if (!placed || !cubes || state !== 'free' || !ACTIONS[name]) return false
      const next = startAction(action, name)
      if (next === action) return false
      action = next
      state = 'action'
      character.playOnce(name)
      onBusy(true)
      return true
    },

    async attach({ scene, camera: cam }) {
      camera = cam
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2))
      const sun = new THREE.DirectionalLight(0xffffff, 1.5)
      sun.position.set(2, 4, 2)
      scene.add(sun)
      scene.add(world)
      shadow = createShadow(world)
      character.group.visible = false
      world.add(character.group)
      cubes = createCubes(world)
      await character.load(modelUrl)
      character.group.traverse(o => { if (o.isMesh) o.castShadow = true })
      opponent = createOpponent(world, character)
    },

    place(p) {
      world.position.set(p.x, p.y, p.z)
      world.scale.setScalar(scale)
      shadow.setScale(scale)
      character.group.position.set(0, 0, 0)
      character.group.visible = true
      shadow.place({ x: 0, y: 0, z: 0 })
      cubes.reset({ x: 0, z: 0 }, 0)
      cubes.setVisible(true)
      opponent.place({ x: 0, z: 0 })
      prev = { x: 0, z: 0 }
      placed = true
    },

    update() {
      const dt = Math.min(clock.getDelta(), 0.1)
      if (!camera || !placed) return
      camera.getWorldDirection(forward)
      const dir = state === 'free'
        ? joystickToWorld(input, { x: forward.x, z: forward.z })
        : ZERO_DIR
      character.update(dt, dir)

      let pushing = false
      if (state === 'action') {
        const name = action.name
        pushing = name === 'push' && action.t >= ACTIONS.push.impactAt
        const r = tickAction(action, dt)
        action = r.state
        if (r.impact) applyImpact(name)
        if (name === 'push') pushing = pushing || r.impact
        if (r.finished) {
          character.endOnce()
          state = 'free'
          onBusy(false)
        }
      }

      opponent.update(dt)
      cubes.setOpponent(opponent.blocking ? opponent.position : null)

      // Forces on cubes: walking into one (60 N) or the Push action (140 N, continuous), along the
      // contact direction. Light cubes slide, heavy ones just resist friction and block the player.
      const move = { x: pos().x - prev.x, z: pos().z - prev.z }
      const f = character.angle
      const facing = { x: Math.sin(f), z: Math.cos(f) }
      const { contacts } = cubes.contacts({ x: pos().x, z: pos().z }, PLAYER_RADIUS, PUSH_REACH_GAP)
      for (const c of contacts) {
        if (pushing) {
          if ( c.nx * facing.x + c.nz * facing.z > 0.5) {
            cubes.pushForce(c.body, c.nx * PUSH_FORCE, c.nz * PUSH_FORCE)
          }
        } else if (c.gap < 0.05 && dt > 0 && (move.x * c.nx + move.z * c.nz) / dt > 0.1) {
          cubes.pushForce(c.body, c.nx * WALK_FORCE, c.nz * WALK_FORCE)
        }
      }
      cubes.update(dt)

      // the player is blocked by the standing opponent and by cubes
      if (opponent.blocking) {
        const c = separate(pos(), PLAYER_RADIUS, opponent.blocker, opponent.blocker.r)
        pos().x += c.x
        pos().z += c.z
      }
      const res = cubes.contacts({ x: pos().x, z: pos().z }, PLAYER_RADIUS)
      pos().x += res.correction.x
      pos().z += res.correction.z
      prev = { x: pos().x, z: pos().z }
    }
  }
}

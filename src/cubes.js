import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { cubeMass, capSpeed, closestOnBox, GRAVITY } from './physics.js'
import { inReach } from './actions.js'

export const CUBE_DENSITY = 200       // kg/m3
// cannon-es friction is not a plain Coulomb coefficient: its limit is applied per contact point
// and per solver step, so at the fixed 1/60 s step the effective sliding/breakaway coefficient is
// about 250 x the material value (measured in node and in the browser: 0.002 -> 0.5, saturating
// near 0.9). 0.002 gives the wanted ~0.5: the 14.8 kg cube resists 60 N and gives way to 140 N.
const CONTACT_FRICTION = 0.002
export const RESTITUTION = 0.2
export const FIXED_DT = 1 / 60
export const MAX_SUBSTEPS = 3
export const MAX_SPEED = 4            // m/s cap after a boxing impulse
export const BOX_IMPULSE = 2.5          // N*s
export const JUMP_IMPULSE = 1.5       // N*s
export const JUMP_REACH = 0.8
export const WALK_FORCE = 60          // N
export const PUSH_FORCE = 140         // N

// size (edge, m), colour, and angle (degrees from +Z toward +X) on the ring around the origin.
// The sector around +Z stays free (open space in front of the player at placement).
const SPECS = [
  { size: 0.32, color: '#55415D', angle: -100, ring: 1.0 },
  { size: 0.15, color: '#F9D58B', angle: -60,  ring: 1.0 },
  { size: 0.20, color: '#C3A5C7', angle: 60,   ring: 1.0 },
  { size: 0.42, color: '#B5654A', angle: 100,  ring: 1.0 },
  { size: 0.25, color: '#F8F3EA', angle: 180,  ring: 1.0 }
]

export function cubeSpecs() {
  return SPECS.map(s => ({ ...s, mass: cubeMass(s.size, CUBE_DENSITY) }))
}

// Circle approximating a cube footprint (used for layout spacing only).
export const footprintRadius = size => size * 0.7

// Positions (relative to the origin). Direction for angle a is (sin a, cos a).
export function cubeLayout() {
  return SPECS.map(s => {
    const a = (s.angle * Math.PI) / 180
    return { x: Math.sin(a) * s.ring, z: Math.cos(a) * s.ring }
  })
}

const yawOf = q => Math.atan2(2 * (q.w * q.y - q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z))

export function createCubes(scene, origin = { x: 0, z: 0 }) {
  const specs = cubeSpecs()
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVITY, 0) })
  world.allowSleep = true
  const mat = new CANNON.Material('cube')
  world.defaultMaterial = mat
  const contact = new CANNON.ContactMaterial(mat, mat, { friction: CONTACT_FRICTION, restitution: RESTITUTION })
  world.addContactMaterial(contact)
  world.defaultContactMaterial = contact

  const floor = new CANNON.Body({ mass: 0, material: mat, shape: new CANNON.Plane() })
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(floor)

  const bodies = []
  const meshes = []
  specs.forEach(s => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(s.size, s.size, s.size),
      new THREE.MeshStandardMaterial({ color: s.color })
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    meshes.push(mesh)
    const body = new CANNON.Body({
      mass: s.mass, material: mat,
      shape: new CANNON.Box(new CANNON.Vec3(s.size / 2, s.size / 2, s.size / 2)),
      linearDamping: 0.1, angularDamping: 0.2,
      allowSleep: true, sleepSpeedLimit: 0.1, sleepTimeLimit: 0.5
    })
    body.size = s.size
    world.addBody(body)
    bodies.push(body)
  })

  let ox = origin.x, oy = 0, oz = origin.z
  let acc = 0
  let lastStepMs = 0
  let forces = new Map() // body -> {x, z}: horizontal force requested this frame
  let carry = null       // forces of a frame that ran no substep (fast displays), held for the next step

  const sync = () => {
    bodies.forEach((b, i) => {
      meshes[i].position.set(ox + b.position.x, oy + b.position.y, oz + b.position.z)
      meshes[i].quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w)
    })
  }

  const api = {
    bodies, meshes, world, specs, contact,
    get lastStepMs() { return lastStepMs },
    reset(o, y = 0) {
      ox = o.x; oy = y; oz = o.z
      const lay = cubeLayout()
      bodies.forEach((b, i) => {
        b.position.set(lay[i].x, specs[i].size / 2 + 0.001, lay[i].z)
        b.quaternion.set(0, 0, 0, 1)
        b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0)
        b.force.set(0, 0, 0); b.torque.set(0, 0, 0)
        b.wakeUp()
      })
      acc = 0
      sync()
    },
    setVisible(v) { meshes.forEach(m => { m.visible = v }) },

    // Horizontal push force (N) on a cube this frame, applied at its center on every substep.
    pushForce(body, fx, fz) {
      const f = forces.get(body) || { x: 0, z: 0 }
      f.x += fx; f.z += fz
      forces.set(body, f)
      body.wakeUp()
    },

    // Advance the simulation: fixed 1/60 steps, at most MAX_SUBSTEPS per frame.
    update(dt) {
      const t0 = performance.now()
      acc = Math.min(acc + dt, FIXED_DT * MAX_SUBSTEPS)
      const zero = new CANNON.Vec3()
      const active = forces.size ? forces : carry || forces
      let stepped = false
      while (acc >= FIXED_DT) {
        stepped = true
        for (const [b, f] of active) b.applyForce(new CANNON.Vec3(f.x, 0, f.z), zero)
        world.step(FIXED_DT)
        for (const b of bodies) {
          const v = capSpeed(b.velocity.x, b.velocity.z, MAX_SPEED)
          b.velocity.x = v.x; b.velocity.z = v.z
        }
        acc -= FIXED_DT
      }
      carry = stepped ? null : active
      forces = new Map()
      sync()
      lastStepMs = performance.now() - t0
    },

    // Player circle (world coords) vs cube footprints: returns the correction that resolves
    // penetration, and contacts [{ body, nx, nz, gap }] (n points from the player toward the cube).
    contacts(p, radius, margin = 0) {
      const out = []
      let cx = 0, cz = 0
      for (const b of bodies) {
        const c = { x: ox + b.position.x, z: oz + b.position.z }
        const r = closestOnBox({ x: p.x + cx, z: p.z + cz }, c, b.size / 2, yawOf(b.quaternion))
        const gap = r.dist - radius
        if (gap < margin) out.push({ body: b, nx: -r.nx, nz: -r.nz, gap })
        if (gap < 0) {
          cx += r.nx * -gap
          cz += r.nz * -gap
        }
      }
      return { correction: { x: cx, z: cz }, contacts: out }
    },

    // Boxing: impulse along the facing direction, applied above the center so it also tumbles.
    boxing(from, facing, reach) {
      const dx = Math.sin(facing), dz = Math.cos(facing)
      for (const b of bodies) {
        const bp = { x: ox + b.position.x, z: oz + b.position.z }
        if (!inReach(from, facing, bp, reach)) continue
        b.wakeUp()
        b.applyImpulse(new CANNON.Vec3(dx * BOX_IMPULSE, 0, dz * BOX_IMPULSE), new CANNON.Vec3(0, b.size * 0.3, 0))
        const v = capSpeed(b.velocity.x, b.velocity.z, MAX_SPEED)
        b.velocity.x = v.x; b.velocity.z = v.z
      }
    },
    // Jump: small upward impulse on cubes near the player.
    jump(from, reach = JUMP_REACH) {
      for (const b of bodies) {
        if (Math.hypot(ox + b.position.x - from.x, oz + b.position.z - from.z) > reach) continue
        b.wakeUp()
        b.applyImpulse(new CANNON.Vec3(0, JUMP_IMPULSE, 0), new CANNON.Vec3(0, 0, 0))
      }
    }
  }
  api.reset(origin)
  api.setVisible(false)
  return api
}

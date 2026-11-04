export const DEADZONE = 0.1

// input: joystick {x: right+, y: up+}; cameraForward: {x, z} (any length, y ignored)
// returns a unit world direction on the floor plus magnitude in [0, 1]
export function joystickToWorld(input, cameraForward) {
  const raw = Math.hypot(input.x, input.y)
  if (raw < DEADZONE) return { x: 0, z: 0, magnitude: 0 }
  const len = Math.hypot(cameraForward.x, cameraForward.z) || 1
  const fx = cameraForward.x / len
  const fz = cameraForward.z / len
  const nx = input.x / raw
  const ny = input.y / raw
  return { x: fx * ny - fz * nx, z: fz * ny + fx * nx, magnitude: Math.min(raw, 1) }
}

export function animationFor(magnitude) {
  return magnitude > 0 ? 'walk' : 'idle'
}

export function facingAngle(dir) {
  return Math.atan2(dir.x, dir.z)
}

export function approachAngle(current, target, maxStep) {
  const twoPi = 2 * Math.PI
  const d = ((((target - current + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI
  if (Math.abs(d) <= maxStep) return current + d
  return current + Math.sign(d) * maxStep
}

export function stepPosition(pos, dir, speed, dt) {
  return {
    x: pos.x + dir.x * speed * dir.magnitude * dt,
    z: pos.z + dir.z * speed * dir.magnitude * dt
  }
}

// Returns the index of the clip for 'idle' or 'walk', or -1.
export function pickClip(names, kind) {
  const re = kind === 'idle' ? /idle/i : /walk/i
  const found = names.findIndex(n => re.test(n))
  if (found >= 0) return found
  if (kind === 'idle') return names.length > 0 ? 0 : -1
  return names.length > 1 ? 1 : -1
}

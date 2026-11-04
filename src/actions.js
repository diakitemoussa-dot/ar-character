// Reach distances are in meters (character is 1 m tall). impactAt/duration in seconds.
export const ACTIONS = {
  jump:   { clip: 'Jump',   duration: 0.9,  impactAt: 0.25, reach: 0.8 },
  boxing: { clip: 'Boxing', duration: 2.13, impactAt: 0.85, reach: 0.9 },
  push:   { clip: 'Push',   duration: 2.5,  impactAt: 0.3,  reach: 0.8 }
}

export const HALF_ANGLE = Math.PI / 3

// from: {x, z}; facing: angle (direction is (sin a, cos a)); target: {x, z}
export function inReach(from, facing, target, reach, halfAngle = HALF_ANGLE) {
  const dx = target.x - from.x
  const dz = target.z - from.z
  const dist = Math.hypot(dx, dz)
  if (dist > reach) return false
  if (dist < 1e-6) return true
  const dot = (dx / dist) * Math.sin(facing) + (dz / dist) * Math.cos(facing)
  return Math.acos(Math.min(1, Math.max(-1, dot))) <= halfAngle
}

export function createActionState() {
  return { name: null, t: 0, impacted: false }
}

export function startAction(state, name) {
  if (state.name || !ACTIONS[name]) return state
  return { name, t: 0, impacted: false }
}

// returns { state, impact, finished }
export function tickAction(state, dt) {
  if (!state.name) return { state, impact: false, finished: false }
  const def = ACTIONS[state.name]
  const t = state.t + dt
  const impact = !state.impacted && t >= def.impactAt
  if (t >= def.duration) return { state: createActionState(), impact, finished: true }
  return { state: { name: state.name, t, impacted: state.impacted || impact }, impact, finished: false }
}

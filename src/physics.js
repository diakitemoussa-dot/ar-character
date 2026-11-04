export const GRAVITY = 9.8

// Correction to apply to circle A so it no longer overlaps circle B.
export function separate(a, ra, b, rb) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  const dist = Math.hypot(dx, dz)
  const min = ra + rb
  if (dist >= min) return { x: 0, z: 0 }
  if (dist < 1e-6) return { x: min, z: 0 }
  const push = min - dist
  return { x: (dx / dist) * push, z: (dz / dist) * push }
}

export function cubeMass(size, density) {
  return density * size ** 3
}

// A horizontal force beats floor friction only if it exceeds mu * m * g.
export function canMoveByForce(mass, force, mu) {
  return force > mu * mass * GRAVITY
}

export function capSpeed(vx, vz, max) {
  const s = Math.hypot(vx, vz)
  if (s <= max) return { x: vx, z: vz }
  return { x: (vx / s) * max, z: (vz / s) * max }
}

// Closest point of a square (center c, half extent h, rotated by yaw about Y:
// world x = cos*lx + sin*lz, z = -sin*lx + cos*lz) to point p, in the XZ plane.
// Returns { dist, nx, nz, inside }: dist = distance from p to the box (negative when inside, the
// depth to the nearest face) and (nx, nz) = unit normal pointing from the box toward p.
export function closestOnBox(p, c, h, yaw) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw)
  const dx = p.x - c.x, dz = p.z - c.z
  const lx = cs * dx - sn * dz
  const lz = sn * dx + cs * dz
  const qx = Math.max(-h, Math.min(h, lx))
  const qz = Math.max(-h, Math.min(h, lz))
  let nlx, nlz, dist, inside = false
  if (qx === lx && qz === lz) {
    inside = true
    const ex = h - Math.abs(lx), ez = h - Math.abs(lz)
    if (ex < ez) { nlx = lx >= 0 ? 1 : -1; nlz = 0; dist = -ex }
    else { nlx = 0; nlz = lz >= 0 ? 1 : -1; dist = -ez }
  } else {
    const ox = lx - qx, oz = lz - qz
    dist = Math.hypot(ox, oz)
    nlx = ox / dist; nlz = oz / dist
  }
  return { dist, nx: cs * nlx + sn * nlz, nz: -sn * nlx + cs * nlz, inside }
}

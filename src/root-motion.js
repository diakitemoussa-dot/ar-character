// Horizontal (x, z) offset of `local` from `base`; both are {x, z} (y ignored).
export function horizontalOffset(local, base) {
  return { x: local.x - base.x, z: local.z - base.z }
}

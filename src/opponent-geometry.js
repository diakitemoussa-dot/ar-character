// Spot where the opponent stands: `dist` meters in front (+Z) of the player at placement time.
export function opponentSpot(player, dist) {
  return { x: player.x, z: player.z + dist }
}

// Facing angle (direction (sin a, cos a)) for the opponent to look at the player.
export function opponentFacing(opponent, player) {
  return Math.atan2(player.x - opponent.x, player.z - opponent.z)
}

// Displacement of `dist` meters pushing the opponent away from the player.
export function knockback(player, opponent, dist) {
  const dx = opponent.x - player.x
  const dz = opponent.z - player.z
  const d = Math.hypot(dx, dz)
  if (d < 1e-6) return { x: 0, z: dist }
  return { x: (dx / d) * dist, z: (dz / d) * dist }
}

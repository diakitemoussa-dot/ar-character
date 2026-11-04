const smooth = x => x * x * (3 - 2 * x)

export const FALL = { tipTime: 0.5, lieTime: 3, riseTime: 0.6 }

// t seconds since the hit. tilt: radians of backward tip (0 upright, PI/2 lying)
export function fallPose(t) {
  const { tipTime, lieTime, riseTime } = FALL
  if (t < tipTime) {
    const k = t / tipTime
    return { tilt: (Math.PI / 2) * k * k, phase: 'falling' }
  }
  if (t < tipTime + lieTime) return { tilt: Math.PI / 2, phase: 'down' }
  if (t < tipTime + lieTime + riseTime) {
    const k = (t - tipTime - lieTime) / riseTime
    return { tilt: (Math.PI / 2) * (1 - smooth(k)), phase: 'rising' }
  }
  return { tilt: 0, phase: 'done' }
}

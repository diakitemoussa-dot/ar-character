import { describe, it, expect } from 'vitest'
import { fallPose, FALL } from '../src/timeline.js'

describe('fallPose', () => {
  it('stands before the hit', () => { expect(fallPose(0)).toEqual({ tilt: 0, phase: 'falling' }) })
  it('lies flat after the fall', () => {
    expect(fallPose(FALL.tipTime + 0.1).tilt).toBeCloseTo(Math.PI / 2)
    expect(fallPose(FALL.tipTime + 0.1).phase).toBe('down')
  })
  it('stands up and ends', () => {
    const t = FALL.tipTime + FALL.lieTime + FALL.riseTime / 2
    const p = fallPose(t)
    expect(p.phase).toBe('rising')
    expect(p.tilt).toBeGreaterThan(0)
    expect(p.tilt).toBeLessThan(Math.PI / 2)
    expect(fallPose(FALL.tipTime + FALL.lieTime + FALL.riseTime + 0.01)).toEqual({ tilt: 0, phase: 'done' })
  })
})

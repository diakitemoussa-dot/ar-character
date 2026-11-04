import { describe, it, expect } from 'vitest'
import {
  joystickToWorld, animationFor, facingAngle, approachAngle, stepPosition, pickClip
} from '../src/movement.js'

describe('joystickToWorld', () => {
  it('pushing up moves along camera forward', () => {
    const d = joystickToWorld({ x: 0, y: 1 }, { x: 0, z: -1 })
    expect(d.x).toBeCloseTo(0); expect(d.z).toBeCloseTo(-1); expect(d.magnitude).toBeCloseTo(1)
  })
  it('pushing right moves to the camera right', () => {
    const d = joystickToWorld({ x: 1, y: 0 }, { x: 0, z: -1 })
    expect(d.x).toBeCloseTo(1); expect(d.z).toBeCloseTo(0)
  })
  it('follows camera yaw (camera facing +x, push up goes +x)', () => {
    const d = joystickToWorld({ x: 0, y: 1 }, { x: 1, z: 0 })
    expect(d.x).toBeCloseTo(1); expect(d.z).toBeCloseTo(0)
  })
  it('ignores camera pitch magnitude', () => {
    const d = joystickToWorld({ x: 0, y: 1 }, { x: 0, z: -0.2 })
    expect(d.z).toBeCloseTo(-1)
  })
  it('deadzone gives zero movement', () => {
    const d = joystickToWorld({ x: 0.05, y: 0.05 }, { x: 0, z: -1 })
    expect(d).toEqual({ x: 0, z: 0, magnitude: 0 })
  })
  it('clamps magnitude to 1', () => {
    expect(joystickToWorld({ x: 3, y: 4 }, { x: 0, z: -1 }).magnitude).toBe(1)
  })
})

describe('animationFor', () => {
  it('walk when moving, idle otherwise', () => {
    expect(animationFor(0.5)).toBe('walk')
    expect(animationFor(0)).toBe('idle')
  })
})

describe('facingAngle', () => {
  it('+z is 0, +x is pi/2', () => {
    expect(facingAngle({ x: 0, z: 1 })).toBeCloseTo(0)
    expect(facingAngle({ x: 1, z: 0 })).toBeCloseTo(Math.PI / 2)
  })
})

describe('approachAngle', () => {
  it('steps toward target', () => { expect(approachAngle(0, 1, 0.5)).toBeCloseTo(0.5) })
  it('snaps when within step', () => { expect(approachAngle(0, 0.2, 0.5)).toBeCloseTo(0.2) })
  it('takes the short way around', () => { expect(approachAngle(3, -3, 0.1)).toBeCloseTo(3.1) })
})

describe('stepPosition', () => {
  it('moves along direction scaled by speed, magnitude and dt', () => {
    const p = stepPosition({ x: 1, z: 1 }, { x: 0, z: -1, magnitude: 0.5 }, 0.6, 2)
    expect(p.x).toBeCloseTo(1); expect(p.z).toBeCloseTo(0.4)
  })
})

describe('pickClip', () => {
  it('matches by name, case-insensitive', () => {
    expect(pickClip(['Run', 'Walk_Cycle', 'IDLE'], 'idle')).toBe(2)
    expect(pickClip(['Run', 'Walk_Cycle', 'IDLE'], 'walk')).toBe(1)
  })
  it('falls back to index 0 for idle and 1 for walk', () => {
    expect(pickClip(['a', 'b'], 'idle')).toBe(0)
    expect(pickClip(['a', 'b'], 'walk')).toBe(1)
  })
  it('returns -1 when nothing usable', () => {
    expect(pickClip([], 'idle')).toBe(-1)
    expect(pickClip(['a'], 'walk')).toBe(-1)
  })
})

import { describe, it, expect } from 'vitest'
import { separate, cubeMass, canMoveByForce, capSpeed, closestOnBox } from '../src/physics.js'

describe('separate', () => {
  it('returns zero when not overlapping', () => {
    expect(separate({ x: 0, z: 0 }, 0.3, { x: 1, z: 0 }, 0.15)).toEqual({ x: 0, z: 0 })
  })
  it('pushes A out of B along the normal', () => {
    const c = separate({ x: 0, z: 0 }, 0.3, { x: 0.3, z: 0 }, 0.15)
    expect(c.x).toBeCloseTo(-0.15)
    expect(c.z).toBeCloseTo(0)
  })
  it('handles identical positions without NaN', () => {
    const c = separate({ x: 0, z: 0 }, 0.3, { x: 0, z: 0 }, 0.15)
    expect(Number.isFinite(c.x) && Number.isFinite(c.z)).toBe(true)
  })
})

describe('cubeMass', () => {
  it('is density * size^3', () => {
    expect(cubeMass(0.5, 200)).toBeCloseTo(25)
    expect(cubeMass(0.42, 200)).toBeCloseTo(14.82, 1)
  })
})

describe('canMoveByForce', () => {
  it('compares force to mu*m*g', () => {
    expect(canMoveByForce(14.8, 60, 0.5)).toBe(false)
    expect(canMoveByForce(14.8, 140, 0.5)).toBe(true)
    expect(canMoveByForce(0.7, 60, 0.5)).toBe(true)
    expect(canMoveByForce(10, 49, 0.5)).toBe(false)
  })
})

describe('capSpeed', () => {
  it('leaves slow speeds alone', () => {
    expect(capSpeed(1, 2, 6)).toEqual({ x: 1, z: 2 })
  })
  it('caps fast speeds keeping direction', () => {
    const v = capSpeed(30, 40, 6)
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(6)
    expect(v.x / v.z).toBeCloseTo(0.75)
  })
  it('handles zero', () => { expect(capSpeed(0, 0, 6)).toEqual({ x: 0, z: 0 }) })
})

describe('closestOnBox', () => {
  // box centered at origin, half 0.1, yaw 0
  it('returns outside distance and normal from box to point', () => {
    const r = closestOnBox({ x: 0.3, z: 0 }, { x: 0, z: 0 }, 0.1, 0)
    expect(r.dist).toBeCloseTo(0.2)
    expect(r.nx).toBeCloseTo(1)
    expect(r.nz).toBeCloseTo(0)
    expect(r.inside).toBe(false)
  })
  it('respects yaw', () => {
    // rotated 45 deg: corner points along +x at 0.1*sqrt2
    const r = closestOnBox({ x: 0.3, z: 0 }, { x: 0, z: 0 }, 0.1, Math.PI / 4)
    expect(r.dist).toBeCloseTo(0.3 - 0.1 * Math.SQRT2)
  })
  it('flags inside with a finite exit normal', () => {
    const r = closestOnBox({ x: 0.05, z: 0 }, { x: 0, z: 0 }, 0.1, 0)
    expect(r.inside).toBe(true)
    expect(r.dist).toBeCloseTo(-0.05)
    expect(r.nx).toBeCloseTo(1)
  })
})

import { describe, it, expect } from 'vitest'
import { opponentFacing, opponentSpot, knockback } from '../src/opponent-geometry.js'

describe('opponentSpot', () => {
  it('is 1.5 m in front (+Z) of the player', () => {
    expect(opponentSpot({ x: 1, z: 2 }, 1.5)).toEqual({ x: 1, z: 3.5 })
  })
})
describe('opponentFacing', () => {
  it('faces the player (player at -Z of opponent => PI)', () => {
    expect(Math.abs(opponentFacing({ x: 0, z: 1.5 }, { x: 0, z: 0 }))).toBeCloseTo(Math.PI)
  })
  it('faces +x when the player is at +x', () => {
    expect(opponentFacing({ x: 0, z: 0 }, { x: 1, z: 0 })).toBeCloseTo(Math.PI / 2)
  })
})
describe('knockback', () => {
  it('moves the opponent away from the player by dist', () => {
    const k = knockback({ x: 0, z: 0 }, { x: 0, z: 1 }, 0.3)
    expect(k.x).toBeCloseTo(0)
    expect(k.z).toBeCloseTo(0.3)
  })
  it('is finite when positions coincide', () => {
    const k = knockback({ x: 0, z: 0 }, { x: 0, z: 0 }, 0.3)
    expect(Number.isFinite(k.x + k.z)).toBe(true)
  })
})

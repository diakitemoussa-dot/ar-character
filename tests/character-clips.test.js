import { describe, it, expect } from 'vitest'
import { horizontalOffset } from '../src/root-motion.js'

describe('horizontalOffset', () => {
  it('subtracts the base and ignores height', () => {
    expect(horizontalOffset({ x: 1, y: 5, z: 2 }, { x: 0.25, z: 0.5 })).toEqual({ x: 0.75, z: 1.5 })
  })
  it('is zero at the base', () => {
    expect(horizontalOffset({ x: 0.3, z: -0.2 }, { x: 0.3, z: -0.2 })).toEqual({ x: 0, z: 0 })
  })
})

import { describe, it, expect } from 'vitest'
import { lightPosition } from '../src/shadow.js'

describe('lightPosition', () => {
  it('offsets the light from the placement point, including height', () => {
    expect(lightPosition({ x: 1, y: 0.5, z: -1 })).toEqual({ x: 3, y: 4.5, z: 1 })
  })
})

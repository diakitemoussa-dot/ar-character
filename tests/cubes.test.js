import { describe, it, expect } from 'vitest'
import { cubeSpecs, cubeLayout, CUBE_DENSITY, footprintRadius } from '../src/cubes.js'

describe('cubeSpecs', () => {
  const specs = cubeSpecs()
  it('has the five sizes with one colour each', () => {
    expect(specs.map(s => s.size).sort((a, b) => a - b)).toEqual([0.15, 0.20, 0.25, 0.32, 0.42])
    expect(new Set(specs.map(s => s.color)).size).toBe(5)
  })
  it('mass is density * size^3 and strictly increases with size', () => {
    for (const s of specs) expect(s.mass).toBeCloseTo(CUBE_DENSITY * s.size ** 3)
    const sorted = [...specs].sort((a, b) => a.size - b.size)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].mass).toBeGreaterThan(sorted[i - 1].mass)
    expect(Math.min(...specs.map(s => s.mass))).toBeCloseTo(0.675, 2)
    expect(Math.max(...specs.map(s => s.mass))).toBeCloseTo(14.8, 1)
  })
})

describe('cubeLayout', () => {
  const specs = cubeSpecs()
  const ps = cubeLayout()
  it('has one position per cube', () => { expect(ps).toHaveLength(specs.length) })
  it('is within 0.9..1.1 m of the origin', () => {
    for (const p of ps) {
      const d = Math.hypot(p.x, p.z)
      expect(d).toBeGreaterThanOrEqual(0.9 - 1e-9)
      expect(d).toBeLessThanOrEqual(1.1 + 1e-9)
    }
  })
  it('keeps the 30 degree sector around +Z free', () => {
    for (const p of ps) expect(Math.abs(Math.atan2(p.x, p.z))).toBeGreaterThan((30 * Math.PI) / 180)
  })
  it('does not overlap cubes (considering sizes)', () => {
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const d = Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z)
      expect(d).toBeGreaterThan(footprintRadius(specs[i].size) + footprintRadius(specs[j].size))
    }
  })
})

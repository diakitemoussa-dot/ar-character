import { describe, it, expect } from 'vitest'
import { parseSceneScale } from '../src/scale.js'

describe('parseSceneScale', () => {
  it('falls back when missing', () => {
    expect(parseSceneScale('')).toBe(1.77)
    expect(parseSceneScale('?debug=1')).toBe(1.77)
    expect(parseSceneScale(undefined)).toBe(1.77)
  })
  it('reads a valid value', () => {
    expect(parseSceneScale('?scale=2.5')).toBe(2.5)
  })
  it('falls back on invalid values', () => {
    expect(parseSceneScale('?scale=abc')).toBe(1.77)
    expect(parseSceneScale('?scale=')).toBe(1.77)
  })
  it('falls back when out of range', () => {
    expect(parseSceneScale('?scale=0.1')).toBe(1.77)
    expect(parseSceneScale('?scale=100')).toBe(1.77)
  })
  it('works with other params and a custom fallback', () => {
    expect(parseSceneScale('?desktop&scale=3')).toBe(3)
    expect(parseSceneScale('?x=1', 2)).toBe(2)
  })
})

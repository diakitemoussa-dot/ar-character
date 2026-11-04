import { describe, it, expect } from 'vitest'
import { ACTIONS, createActionState, startAction, tickAction, inReach } from '../src/actions.js'

describe('inReach', () => {
  const from = { x: 0, z: 0 }
  it('target in front and close is in reach', () => {
    expect(inReach(from, 0, { x: 0, z: 0.5 }, 0.9)).toBe(true)
  })
  it('too far is out of reach', () => {
    expect(inReach(from, 0, { x: 0, z: 1.5 }, 0.9)).toBe(false)
  })
  it('behind is out of reach', () => {
    expect(inReach(from, 0, { x: 0, z: -0.5 }, 0.9)).toBe(false)
  })
  it('respects facing angle (facing +x)', () => {
    expect(inReach(from, Math.PI / 2, { x: 0.5, z: 0 }, 0.9)).toBe(true)
    expect(inReach(from, Math.PI / 2, { x: 0, z: 0.5 }, 0.9)).toBe(false)
  })
})

describe('action state', () => {
  it('starts idle and accepts an action', () => {
    const s = startAction(createActionState(), 'boxing')
    expect(s.name).toBe('boxing')
    expect(s.t).toBe(0)
  })
  it('ignores a new action while one is playing', () => {
    const s = startAction(startAction(createActionState(), 'boxing'), 'jump')
    expect(s.name).toBe('boxing')
  })
  it('fires impact once, then finishes', () => {
    let s = startAction(createActionState(), 'jump')
    const impactAt = ACTIONS.jump.impactAt
    let r = tickAction(s, impactAt + 0.01)
    expect(r.impact).toBe(true)
    expect(r.finished).toBe(false)
    r = tickAction(r.state, 0.05)
    expect(r.impact).toBe(false)
    r = tickAction(r.state, ACTIONS.jump.duration)
    expect(r.finished).toBe(true)
    expect(r.state.name).toBe(null)
  })
  it('tick on idle state does nothing', () => {
    const r = tickAction(createActionState(), 1)
    expect(r).toEqual({ state: createActionState(), impact: false, finished: false })
  })
})

# Actions, Cubes, Opponent, Car Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add action buttons (Jump / Boxing / Push), 5 interactive cubes, a boxable opponent clone, and an enterable/drivable car to the AR character app.

**Architecture:** Pure, unit-tested logic modules (`actions.js`, `physics.js`, `car-kinematics.js`, `timeline.js`) with no three.js dependency. Thin three.js modules (`character.js` root motion, `cubes.js`, `opponent.js`, `car.js`, `actions-ui.js`) use them. `app.js` owns a state machine `free | action | entering | driving | exiting`.

**Tech Stack:** three.js 0.170, vitest, Vite (existing project in `C:\Users\Kabakoo Apprenant.e\AR-Character`).

**Spec:** `docs/superpowers/specs/2026-11-04-actions-cubes-opponent-car-design.md` (read it first).

**Rules for implementers**
- Do NOT run any git command that publishes (`git push`, `gh`), do not touch the `gh-pages` branch. Local `git add`/`git commit` is allowed only if the task says so. Do not run `npm run build`.
- Never change `public/models/character.glb` or other user files in `public/models/`.
- Conventions: world units are meters; the character is 1 m tall (`targetHeight`); facing angle `a` means direction `(sin a, cos a)` on the (x, z) plane; the model faces +Z (`MODEL_FACING_OFFSET = 0`). `joystickToWorld` returns `{x, z, magnitude}`.
- Run `npx vitest run` after every task; all tests must pass.
- Verify visually in desktop mode: `npm run dev -- --port 5199` then `http://localhost:5199/?desktop` with the Playwright tools (hold keys by dispatching `KeyboardEvent('keydown'/'keyup', {key})` on `window`, as `src/desktop.js` listens there). Stop the dev server when finished (port 5199).
- Desktop keys to add in `src/desktop.js`: `j` = jump, `k` = boxing, `l` = push, `e` = enter/exit car.

---

### Task 1: Pure logic modules (TDD)

**Files:**
- Create: `src/actions.js`, `src/physics.js`, `src/car-kinematics.js`, `src/timeline.js`
- Test: `tests/actions.test.js`, `tests/physics.test.js`, `tests/car-kinematics.test.js`, `tests/timeline.test.js`

- [ ] **Step 1: Write the failing tests**

`tests/actions.test.js`
```js
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
```

`tests/physics.test.js`
```js
import { describe, it, expect } from 'vitest'
import { stepBody, separate, launch, hop } from '../src/physics.js'

const body = (o = {}) => ({ x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, ...o })

describe('stepBody', () => {
  it('moves with velocity and slows with friction', () => {
    const b = body({ vx: 2 })
    stepBody(b, 0.1)
    expect(b.x).toBeCloseTo(0.2)
    expect(b.vx).toBeLessThan(2)
    expect(b.vx).toBeGreaterThan(0)
  })
  it('stops when slow', () => {
    const b = body({ vx: 0.01 })
    stepBody(b, 0.1)
    expect(b.vx).toBe(0)
  })
  it('falls under gravity and bounces then rests', () => {
    const b = body({ y: 0.5 })
    for (let i = 0; i < 600; i++) stepBody(b, 1 / 60)
    expect(b.y).toBe(0)
    expect(b.vy).toBe(0)
  })
})

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

describe('launch / hop', () => {
  it('launch sets horizontal and vertical velocity along direction', () => {
    const b = body()
    launch(b, 0, 1, 3, 2)
    expect(b.vz).toBeCloseTo(3)
    expect(b.vx).toBeCloseTo(0)
    expect(b.vy).toBeCloseTo(2)
  })
  it('hop only adds vertical velocity', () => {
    const b = body({ vx: 1 })
    hop(b, 1.5)
    expect(b.vy).toBe(1.5)
    expect(b.vx).toBe(1)
  })
})
```

`tests/car-kinematics.test.js`
```js
import { describe, it, expect } from 'vitest'
import { stepCar, CAR_LIMITS } from '../src/car-kinematics.js'

const car = (o = {}) => ({ x: 0, z: 0, yaw: 0, speed: 0, ...o })

describe('stepCar', () => {
  it('accelerates forward along +z at yaw 0', () => {
    const c = car()
    for (let i = 0; i < 60; i++) stepCar(c, { x: 0, y: 1 }, 1 / 60)
    expect(c.speed).toBeGreaterThan(1)
    expect(c.z).toBeGreaterThan(0.5)
    expect(c.x).toBeCloseTo(0)
  })
  it('never exceeds max speed', () => {
    const c = car()
    for (let i = 0; i < 1200; i++) stepCar(c, { x: 0, y: 1 }, 1 / 60)
    expect(c.speed).toBeLessThanOrEqual(CAR_LIMITS.maxSpeed + 1e-9)
  })
  it('reverses when pulling back from standstill', () => {
    const c = car()
    for (let i = 0; i < 60; i++) stepCar(c, { x: 0, y: -1 }, 1 / 60)
    expect(c.speed).toBeLessThan(0)
    expect(c.speed).toBeGreaterThanOrEqual(CAR_LIMITS.maxReverse - 1e-9)
  })
  it('steering right while going forward turns toward -x (right of +z)', () => {
    const c = car({ speed: 2 })
    for (let i = 0; i < 60; i++) stepCar(c, { x: 1, y: 0.3 }, 1 / 60)
    expect(c.x).toBeLessThan(0)
  })
  it('does not turn when standing still', () => {
    const c = car()
    stepCar(c, { x: 1, y: 0 }, 1 / 60)
    expect(c.yaw).toBe(0)
  })
  it('coasts to a stop with no input', () => {
    const c = car({ speed: 3 })
    for (let i = 0; i < 600; i++) stepCar(c, { x: 0, y: 0 }, 1 / 60)
    expect(Math.abs(c.speed)).toBeLessThan(0.05)
  })
})
```

`tests/timeline.test.js`
```js
import { describe, it, expect } from 'vitest'
import { doorAngle, DOOR_MAX, fallPose, FALL } from '../src/timeline.js'

describe('doorAngle (Entering_Car, 30 fps)', () => {
  it('is closed before frame 33 (1.10 s)', () => { expect(doorAngle(1.0)).toBe(0) })
  it('is fully open between frames 49 and 105', () => {
    expect(doorAngle(1.7)).toBeCloseTo(DOOR_MAX)
    expect(doorAngle(3.3)).toBeCloseTo(DOOR_MAX)
  })
  it('is half open mid-swing', () => {
    expect(doorAngle(1.1 + (1.6333 - 1.1) / 2)).toBeCloseTo(DOOR_MAX / 2, 1)
  })
  it('is closed after frame 145 (4.83 s)', () => { expect(doorAngle(5.0)).toBe(0) })
  it('DOOR_MAX is about 85 degrees', () => {
    expect(DOOR_MAX).toBeCloseTo((85 * Math.PI) / 180)
  })
})

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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run`
Expected: the four new test files FAIL (cannot resolve modules); existing `movement.test.js` still passes.

- [ ] **Step 3: Implement `src/actions.js`**

```js
// Reach distances are in meters (character is 1 m tall). impactAt/duration in seconds.
export const ACTIONS = {
  jump:   { clip: 'Jump',   duration: 0.9,  impactAt: 0.25, reach: 0.8 },
  boxing: { clip: 'Boxing', duration: 2.13, impactAt: 0.85, reach: 0.9 },
  push:   { clip: 'Push',   duration: 2.5,  impactAt: 0.3,  reach: 0.8 }
}

export const HALF_ANGLE = Math.PI / 3

// from: {x, z}; facing: angle (direction is (sin a, cos a)); target: {x, z}
export function inReach(from, facing, target, reach, halfAngle = HALF_ANGLE) {
  const dx = target.x - from.x
  const dz = target.z - from.z
  const dist = Math.hypot(dx, dz)
  if (dist > reach) return false
  if (dist < 1e-6) return true
  const dot = (dx / dist) * Math.sin(facing) + (dz / dist) * Math.cos(facing)
  return Math.acos(Math.min(1, Math.max(-1, dot))) <= halfAngle
}

export function createActionState() {
  return { name: null, t: 0, impacted: false }
}

export function startAction(state, name) {
  if (state.name || !ACTIONS[name]) return state
  return { name, t: 0, impacted: false }
}

// returns { state, impact, finished }
export function tickAction(state, dt) {
  if (!state.name) return { state, impact: false, finished: false }
  const def = ACTIONS[state.name]
  const t = state.t + dt
  const impact = !state.impacted && t >= def.impactAt
  if (t >= def.duration) return { state: createActionState(), impact, finished: true }
  return { state: { name: state.name, t, impacted: state.impacted || impact }, impact, finished: false }
}
```

- [ ] **Step 4: Implement `src/physics.js`**

```js
const GRAVITY = 9.8
const FRICTION = 3.0      // horizontal, per second (exponential)
const BOUNCE = 0.4
const STOP_SPEED = 0.02

// body: { x, y, z, vx, vy, vz } (y = height above the floor)
export function stepBody(b, dt) {
  b.x += b.vx * dt
  b.z += b.vz * dt
  const k = Math.exp(-FRICTION * dt)
  b.vx *= k
  b.vz *= k
  if (Math.hypot(b.vx, b.vz) < STOP_SPEED) { b.vx = 0; b.vz = 0 }

  if (b.y > 0 || b.vy !== 0) {
    b.vy -= GRAVITY * dt
    b.y += b.vy * dt
    if (b.y <= 0) {
      b.y = 0
      b.vy = Math.abs(b.vy) > 0.5 ? -b.vy * BOUNCE : 0
    }
  }
}

// Correction to apply to circle A so it no longer overlaps circle B.
export function separate(a, ra, b, rb) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  const dist = Math.hypot(dx, dz)
  const min = ra + rb
  if (dist >= min) return { x: 0, z: 0 }
  if (dist < 1e-6) return { x: min, z: 0 }
  const push = min - dist
  return { x: (dx / dist) * push, z: (dz / dist) * push }
}

export function launch(b, dirX, dirZ, speed, up) {
  b.vx = dirX * speed
  b.vz = dirZ * speed
  b.vy = up
}

export function hop(b, up) {
  b.vy = up
}
```

- [ ] **Step 5: Implement `src/car-kinematics.js`**

```js
export const CAR_LIMITS = {
  maxSpeed: 4,        // m/s forward
  maxReverse: -1.5,   // m/s
  accel: 3,           // m/s^2 at full throttle
  brake: 6,           // m/s^2 when pulling back while moving forward
  reverseAccel: 2,
  drag: 0.6,          // per second, always applied
  wheelbase: 1.5,     // m
  maxSteer: 0.5       // rad
}

// car: { x, z, yaw, speed }; forward direction is (sin yaw, cos yaw); input: { x: steer right+, y: throttle up+ }
export function stepCar(car, input, dt) {
  const L = CAR_LIMITS
  let a = 0
  if (input.y > 0) a = L.accel * input.y
  else if (input.y < 0) a = (car.speed > 0 ? L.brake : L.reverseAccel) * input.y
  car.speed += a * dt
  car.speed -= car.speed * L.drag * dt
  car.speed = Math.min(L.maxSpeed, Math.max(L.maxReverse, car.speed))
  if (Math.abs(car.speed) < 0.02 && input.y === 0) car.speed = 0

  const steer = -input.x * L.maxSteer // right of +z is -x, so steering right lowers yaw
  car.yaw += (car.speed / L.wheelbase) * Math.tan(steer) * dt
  car.x += Math.sin(car.yaw) * car.speed * dt
  car.z += Math.cos(car.yaw) * car.speed * dt
}
```

- [ ] **Step 6: Implement `src/timeline.js`**

```js
const smooth = x => x * x * (3 - 2 * x)
const lerp01 = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))

export const DOOR_MAX = (85 * Math.PI) / 180

// Entering_Car clip time in seconds (30 fps). Open frames 33-49, hold to 105, close 105-145.
export function doorAngle(t) {
  const openStart = 33 / 30, openEnd = 49 / 30, closeStart = 105 / 30, closeEnd = 145 / 30
  if (t < openEnd) return DOOR_MAX * smooth(lerp01(t, openStart, openEnd))
  if (t < closeStart) return DOOR_MAX
  return DOOR_MAX * (1 - smooth(lerp01(t, closeStart, closeEnd)))
}

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
```

- [ ] **Step 7: Run to verify pass**

Run: `npx vitest run`
Expected: all test files PASS. If a test in this plan is wrong (not the code), fix the test minimally and report it.

- [ ] **Step 8: Local commit**

Run: `git add src tests && git commit -m "feat: pure logic for actions, physics, car, timelines"`
(Append the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` as the last line of the commit message.) Do not push.

---

### Task 2: Character clip control and root motion

**Files:**
- Modify: `src/character.js`
- Create: `tests/character-clips.test.js` (only for pure helpers you extract, e.g. `rootDelta`)

Required behavior (implement in `src/character.js`; keep `load`, `play`, `update` working as before):

1. **Rename clip lookup to exact names with fallback.** `pickClip` currently matches `/idle/i` and `/walk/i`. Keep that; additionally load these actions by exact name when present: `Jump`, `Boxing`, `Push`, `Entering_Car` into `this.actions` under keys `jump`, `boxing`, `push`, `enterCar`. One-shot actions use `LoopOnce` with `clampWhenFinished = true`.
2. **`playOnce(key, { maxDuration })`**: crossfade (0.15 s) to the one-shot, resolves nothing; the caller (app) uses `ACTIONS[..].duration` to know when to return to idle. For `push`, stop at `ACTIONS.push.duration` (2.5 s) by the caller returning to `idle`.
3. **Root motion extraction** (only while the current action is `push` or `enterCar`):
   - Find the hips bone: first bone whose name matches `/Hips/i`.
   - At load, after `mixer.update(0)` with Idle active, store `hipsBase` = hips position in the group's local space (`group.worldToLocal(hips.getWorldPosition(v))`).
   - Each frame, after `mixer.update(dt)`: `local = group.worldToLocal(hips.getWorldPosition(v))`; `off = (local.x - hipsBase.x, 0, local.z - hipsBase.z)` (horizontal only). Convert `off` to parent space and subtract it from the bone so the body stays under the group: compute `worldOff = group.localToWorld(off) - group.localToWorld(0)`; `p = hips.parent.worldToLocal(hipsWorld - worldOff)`; `hips.position.copy(p)`. Then move the group by `off` rotated by the group's `rotation.y` (the group moves forward as the clip would). Do NOT apply this for other clips.
   - Expose `this.group.position` as updated. Add a method `rootMotionSince(key)` is NOT needed; keep it internal.
4. **Visibility / pose helpers** used later: `setHidden(bool)`, `faceAngle` getter/setter (`this.angle`).

- [ ] **Step 1: Extract any pure helper and test it** (for example `horizontalOffset(local, base)` returning `{x, z}`) with a unit test in `tests/character-clips.test.js`; run `npx vitest run` (fail, then pass).
- [ ] **Step 2: Implement the character changes above.**
- [ ] **Step 3: Verify in desktop mode** by adding desktop keys `k` (boxing), `j` (jump), `l` (push) in `src/desktop.js` that call `app.triggerAction('boxing' | 'jump' | 'push')` once Task 3 exists; until then, temporarily verify by calling `character.playOnce('push')` through a small `?debug=1` hook `window.__app` (exposed only when `?debug=1` is in the URL). With `push`: character moves forward about 0.9 m over 2.5 s and returns to idle without snapping back. Take screenshots before/after.
- [ ] **Step 4: Run `npx vitest run`; local commit** (`feat: clip control and root motion extraction`, co-author trailer as in Task 1). No push.

---

### Task 3: Cubes, actions, action buttons, wiring

**Files:**
- Create: `src/cubes.js`, `src/actions-ui.js`
- Modify: `src/app.js`, `src/main.js`, `src/desktop.js`, `src/style.css`, `index.html` (only if a container is needed)

Required behavior:

1. **`src/cubes.js`**: `createCubes(scene, origin)` builds 5 `BoxGeometry(0.25, 0.25, 0.25)` meshes with `MeshStandardMaterial` colors `#55415D #F9D58B #C3A5C7 #F8F3EA #55415D`, placed on a ring of radius 0.9 m around `origin` in front half-plane (angles spread from -80° to +80° around +Z), `y = 0.125` (mesh center) on the floor. Each cube has a physics body `{x, y, z, vx, vy, vz}` (y = lift above rest) and radius `0.15`. API: `update(dt, blockers)` (steps `stepBody`, then resolves overlap with each blocker circle `{x, z, r}` by pushing the cube out using `separate`), `bodies` (array), `applyToNearby(from, facing, reach, fn)`.
2. **Player blocked by cubes**: in `app.update`, after the character moved, resolve overlap of the player circle (radius 0.2) against every cube using `separate` and apply the correction to the character group position. Walking into a cube does not push it.
3. **Effects at the impact moment** (`tickAction` returns `impact: true`):
   - `push`: each cube `inReach(player, facing, cube, ACTIONS.push.reach)` gets `launch(body, sin(facing), cos(facing), 1.6, 0)`.
   - `boxing`: each cube in reach gets `launch(body, dir..., 3.5, 2.2)` (thrown with a bounce).
   - `jump`: each cube within 0.8 m (any direction) gets `hop(body, 1.8)`.
4. **State machine in `app.js`**: `createApp` gains `triggerAction(name)`: ignored if not in state `free`; otherwise `startAction`, `character.playOnce(...)`, joystick input is ignored while an action is running (force input to zero and keep facing). When `tickAction` reports `finished`, return to idle/walk logic. Expose `getActionState()` for the UI.
5. **`src/actions-ui.js`**: `createActionButtons(root, onAction)` builds three round buttons at the bottom right: `Sauter`, `Frapper`, `Pousser` (French labels). Style them with the Kabakoo palette (plum `#55415D` background, cream `#F8F3EA` text, gold `#F9D58B` border), 64 px circles, `touch-action: manipulation`, `pointerdown` handler with `stopPropagation()` (so a tap does not trigger floor placement). Add `setBusy(bool)` that greys them out while an action is running. Add CSS to `src/style.css`; add a container `<div id="action-root"></div>` to `index.html`.
6. **Floor placement**: when the user taps to place, cubes are created around that point (call `cubes.reset(origin)` on each placement).
7. **Desktop keys**: `j`, `k`, `l` trigger jump, boxing, push in `src/desktop.js`.

- [ ] **Step 1: Write unit tests** for the ring layout function (extract `ringPositions(count, radius, spread)` as a pure function in `src/cubes.js` and test: count, each at distance `radius`, all with `z > 0`).
- [ ] **Step 2: Implement the modules above.**
- [ ] **Step 3: Verify in desktop mode** (screenshots): cubes around the character; push slides a cube; boxing throws one with a bounce; jump hops them; walking into a cube is blocked; buttons are visible and grey out during an action. Take a zoomed screenshot only if needed.
- [ ] **Step 4: `npx vitest run`; local commit** (`feat: cubes, actions and action buttons`, trailer). No push.

---

### Task 4: Opponent

**Files:**
- Create: `src/opponent.js`
- Modify: `src/app.js`, `src/desktop.js` (nothing new if keys already exist)

Required behavior:

1. **`createOpponent(characterSource)`**: clone the loaded character with `SkeletonUtils.clone` (`three/examples/jsm/utils/SkeletonUtils.js`) from the character's loaded model, clone materials, and tint the diffuse color (for example multiply `material.color` by `#7aa7ff`). Own `AnimationMixer`, plays `Idle`. Add a method `character.cloneForOpponent()` in `src/character.js` that returns `{ group, mixer, actions }` without reloading the file.
2. **Placement:** when the player is placed, the opponent stands 1.5 m in front of the player (along `+Z` at placement time) turned toward the player (facing angle = `atan2(px - ox, pz - oz)`).
3. **Hit:** on a `boxing` impact, if `inReach(player, facing, opponent, ACTIONS.boxing.reach)` and the opponent is not already falling: start the fall timeline (`fallPose(t)` from `src/timeline.js`). Apply `tilt` as a rotation of an inner pivot group about the X axis at the feet, backward relative to the opponent's facing (so the character falls away from the player). Add a small knockback of 0.3 m away from the player during the tip. Switch Idle off while down (freeze the mixer weight) and back on when `phase === 'done'`.
4. **While falling or down**, further hits are ignored.
5. **Collision:** the opponent is a blocker circle (radius 0.2) for the player and the cubes while standing (skip while lying).

- [ ] **Step 1: Write tests** only for any new pure helper (for example `opponentFacing(player, opponent)` and `knockback(player, opponent, dist)`).
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Verify in desktop mode** (screenshots at: standing, mid-fall, lying, rising). Check that the fall direction is away from the player and the feet stay on the floor.
- [ ] **Step 4: `npx vitest run`; local commit** (`feat: boxable opponent`, trailer). No push.

---

### Task 5: Car (enter, drive, exit)

**Files:**
- Create: `src/car.js`
- Modify: `src/app.js`, `src/actions-ui.js` (add the Monter/Descendre button), `src/desktop.js` (key `e`), `src/style.css`

Required behavior:

1. **Loading:** `createCar(scene)` loads `models/voiture-djenne.glb` (use `import.meta.env.BASE_URL + 'models/voiture-djenne.glb'`). If the file is missing (load error), build a fallback car from boxes (body 1.0 x 0.5 x 2.5 m with a cabin, 4 cylinder wheels, and a door-like panel named `Porte_G` hinged on its front edge) so everything works without the file. Scale the loaded model by the same factor `S` as the character (character source height 1.77 m to 1 m, so `S = 1 / 1.77`); if the loaded car's length (Z extent after scaling) is outside 1.5-4 m, log a warning and clamp the scale so the length is 2.5 m. Put the pivot at the car's footprint center on the floor. Car yaw convention: forward is `(sin yaw, cos yaw)`.
2. **Door:** find the node named `Porte_G` (fallback: the panel from step 1). Its hinge is at its front edge: set the pivot by reparenting the door under a new `Group` placed at the door's front-edge position (computed from its bounding box in car space) and rotate that group about Y by `±doorAngle(t)` (sign chosen so the door opens outward, to the car's left side, which is `+X` when facing `+Z`... verify visually and flip the sign if it opens into the car). Drive the angle from the `Entering_Car` clip time via `doorAngle(t)` from `src/timeline.js`; closed (0) otherwise.
3. **States in `app.js`:** `free -> entering -> driving -> exiting -> free`.
   - **Monter button** appears (and `e` works) when the player is within 2 m of the driver door position (`doorWorldPos`) and state is `free`. Pressing it: walk the character to the entry point with `Walking` for at most 1.5 s along the straight line (or snap if closer than 0.1 m), face the car's forward direction, then play `Entering_Car` (root motion extraction from Task 2 active, so the group moves with the clip). The entry point is the position from which, after the clip's measured root motion (about 1.82 m forward in clip space, scaled by `S`, and 0.15 m sideways), the character ends at the driver seat. Tune the entry offset constant `ENTRY_OFFSET` (in car-local meters) with screenshots so the character arrives at the seat. At the clip end, hide the character (`setHidden(true)`) and set state `driving`.
   - **Driving:** the joystick (not camera-relative) feeds `stepCar(car, input, dt)`; the car mesh follows (`position`, `rotation.y = yaw`). The car is a blocker circle chain (two circles of radius 0.6 at +/-0.6 m along its axis) for cubes and for the opponent; cubes are pushed by `separate` with the car's speed added to their velocity. The action buttons are hidden and the button shows `Descendre`.
   - **Descendre:** place the character at the left of the driver door (`car-local x = +0.9`), unhide it, face away from the car, state `exiting` for 0.4 s then `free`. The car keeps its pose and speed decays to 0.
4. **Desktop key `e`** toggles Monter/Descendre (same conditions as the button).
5. **AR placement:** the car is created at the placement point offset 2 m to the player's left (`-X` at placement time) and yaw = 0 (facing `+Z`), and is hidden until placement.

- [ ] **Step 1: Write tests** for the pure helpers you add (for example `entryPoint(carPose, ENTRY_OFFSET)` and `exitPoint(carPose)` as pure functions in `src/car-kinematics.js` or a new `src/car-geometry.js`).
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Verify in desktop mode** (screenshots): car beside the player; approach and press `e`; door opens/holds/closes in sync with the clip; character disappears seated; drive forward, steer right and left; push a cube with the car; `e` to exit and walk away; the car stays.
- [ ] **Step 4: `npx vitest run`; local commit** (`feat: drivable car with door animation`, trailer). No push.

---

### Task 6: Final check (no publishing)

- [ ] **Step 1:** `npx vitest run` — all green.
- [ ] **Step 2:** `npm run dev -- --port 5199`, open `?desktop`, run through the full scenario once (actions, cubes, opponent fall, enter car, drive, exit) with screenshots; report any visual problem honestly.
- [ ] **Step 3:** Stop the dev server. Do NOT build, push or publish. Report to the controller.

---

## Self-review against the spec

- Actions and buttons: Tasks 1, 3. Cubes (blocking, push, throw, hop): Tasks 1, 3. Opponent clone, tint, fall and rise: Tasks 1, 2 (`cloneForOpponent`), 4. Car file, scale, door timing, enter, drive, exit, fallback car: Tasks 1, 5. Root motion for Push and Entering_Car and the 2.5 s Push limit: Tasks 1, 2, 3.
- Names used across tasks: `ACTIONS`, `inReach`, `createActionState`, `startAction`, `tickAction`, `stepBody`, `separate`, `launch`, `hop`, `stepCar`, `CAR_LIMITS`, `doorAngle`, `DOOR_MAX`, `fallPose`, `FALL`, `triggerAction`, `playOnce`, `cloneForOpponent`, `setHidden`.
- Tasks 2-5 define behavior and interfaces with the pure logic fully coded in Task 1; the three.js glue is specified precisely but written by the implementer, who verifies it visually in desktop mode.

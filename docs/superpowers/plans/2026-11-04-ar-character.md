# AR Character Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A web AR page (iOS Safari + Android Chrome) where a tap places an animated GLB character on the floor and an on-screen joystick walks it around.

**Architecture:** 8th Wall XR Engine (binary, loaded from jsDelivr) supplies camera + SLAM world tracking and the three.js scene. Pure movement logic lives in `src/movement.js` (unit-tested). `Character` wraps the GLB + `AnimationMixer`. `createApp` glues character, joystick input and camera direction, and is shared by AR mode and a desktop simulation mode.

**Tech Stack:** Vite, three.js, vitest, `@8thwall/engine-binary@1` (CDN), ngrok (HTTPS for phones).

**Notes:**
- Project folder is not a git repo and the user has not asked for commits, so there are no commit steps. Do not `git init` or commit unless asked.
- Do not run any build/export without the user's go-ahead.
- Project root: `C:\Users\Kabakoo Apprenant.e\AR-Character`. All paths below are relative to it.
- The 8th Wall calls in Task 6 come from the engine docs read during design (`XR8.Threejs.pipelineModule`, `XR8.XrController.pipelineModule`, `XR8.XrController.hitTest`). Task 0 verifies them against the official examples before they are used.

---

### Task 0: Verify the 8th Wall API against official examples

**Files:**
- Read only: `https://github.com/8thwall/8thwall` (examples), `https://8thwall.org/docs/engine/overview`

- [ ] **Step 1: Find the three.js "place ground" style example**

Fetch the examples list from `https://8th.io/examples` and open the three.js world-tracking / place-object example. Record, in a scratch note, the exact:
1. script tag attributes for `xr.js`;
2. pipeline module list order;
3. `XR8.XrController.updateCameraProjectionMatrix` arguments;
4. `XR8.XrController.hitTest` signature and result shape (`position` field);
5. how errors (camera denied) are surfaced (`onException` or other).

- [ ] **Step 2: Reconcile with Task 6**

If any of the five items differs from the code in Task 6, edit Task 6's code to match the official example before implementing it.

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/style.css`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "ar-character",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "test": "vitest run"
  },
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `vite.config.js`** (allow any host so the ngrok URL works)

```js
import { defineConfig } from 'vite'

export default defineConfig({
  server: { allowedHosts: true }
})
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>AR Character</title>
  <link rel="stylesheet" href="/src/style.css" />
  <script async crossorigin="anonymous" data-preload-chunks="slam"
    src="https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js"></script>
</head>
<body>
  <canvas id="ar-canvas"></canvas>
  <div id="message" hidden></div>
  <div id="joystick-root"></div>
  <div id="credit">AR engine: 8th Wall XR Engine, Niantic Spatial</div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Write `src/style.css`**

```css
html, body { margin: 0; height: 100%; overflow: hidden; background: #000; font-family: system-ui, sans-serif; }
#ar-canvas { position: fixed; inset: 0; width: 100%; height: 100%; }
#message { position: fixed; top: 16px; left: 16px; right: 16px; padding: 12px; background: rgba(0,0,0,.75); color: #fff; border-radius: 8px; z-index: 10; }
#joystick-root { position: fixed; left: 24px; bottom: 32px; z-index: 5; }
.joy-base { width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,.25); border: 2px solid rgba(255,255,255,.6); position: relative; touch-action: none; }
.joy-knob { position: absolute; left: 35px; top: 35px; width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,.85); pointer-events: none; }
#credit { position: fixed; right: 8px; bottom: 6px; font-size: 10px; color: rgba(255,255,255,.6); z-index: 5; }
```

- [ ] **Step 5: Install**

Run: `npm install`
Expected: completes with no errors; `node_modules/` exists.

---

### Task 2: Movement logic (TDD)

**Files:**
- Create: `src/movement.js`
- Test: `tests/movement.test.js`

- [ ] **Step 1: Write the failing tests** in `tests/movement.test.js`

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run`
Expected: FAIL (cannot resolve `../src/movement.js`).

- [ ] **Step 3: Implement `src/movement.js`**

```js
export const DEADZONE = 0.1

// input: joystick {x: right+, y: up+}; cameraForward: {x, z} (any length, y ignored)
// returns a unit world direction on the floor plus magnitude in [0, 1]
export function joystickToWorld(input, cameraForward) {
  const raw = Math.hypot(input.x, input.y)
  if (raw < DEADZONE) return { x: 0, z: 0, magnitude: 0 }
  const len = Math.hypot(cameraForward.x, cameraForward.z) || 1
  const fx = cameraForward.x / len
  const fz = cameraForward.z / len
  const nx = input.x / raw
  const ny = input.y / raw
  return { x: fx * ny - fz * nx, z: fz * ny + fx * nx, magnitude: Math.min(raw, 1) }
}

export function animationFor(magnitude) {
  return magnitude > 0 ? 'walk' : 'idle'
}

export function facingAngle(dir) {
  return Math.atan2(dir.x, dir.z)
}

export function approachAngle(current, target, maxStep) {
  const twoPi = 2 * Math.PI
  const d = ((((target - current + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI
  if (Math.abs(d) <= maxStep) return current + d
  return current + Math.sign(d) * maxStep
}

export function stepPosition(pos, dir, speed, dt) {
  return {
    x: pos.x + dir.x * speed * dir.magnitude * dt,
    z: pos.z + dir.z * speed * dir.magnitude * dt
  }
}

// Returns the index of the clip for 'idle' or 'walk', or -1.
export function pickClip(names, kind) {
  const re = kind === 'idle' ? /idle/i : /walk/i
  const found = names.findIndex(n => re.test(n))
  if (found >= 0) return found
  if (kind === 'idle') return names.length > 0 ? 0 : -1
  return names.length > 1 ? 1 : -1
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run`
Expected: all tests PASS.

---

### Task 3: Joystick

**Files:**
- Create: `src/joystick.js`

- [ ] **Step 1: Implement `src/joystick.js`**

```js
const RADIUS = 50

// Builds a touch/mouse joystick inside `root`. Calls onChange({x, y}) with x right+, y up+, each in [-1, 1].
export function createJoystick(root, onChange) {
  const base = document.createElement('div')
  base.className = 'joy-base'
  const knob = document.createElement('div')
  knob.className = 'joy-knob'
  base.appendChild(knob)
  root.appendChild(base)

  let activeId = null

  const move = (clientX, clientY) => {
    const r = base.getBoundingClientRect()
    let dx = clientX - (r.left + r.width / 2)
    let dy = clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS }
    knob.style.transform = `translate(${dx}px, ${dy}px)`
    onChange({ x: dx / RADIUS, y: -dy / RADIUS })
  }

  const end = e => {
    if (e.pointerId !== activeId) return
    activeId = null
    knob.style.transform = 'translate(0, 0)'
    onChange({ x: 0, y: 0 })
  }

  base.addEventListener('pointerdown', e => {
    activeId = e.pointerId
    base.setPointerCapture(e.pointerId)
    e.stopPropagation()
    move(e.clientX, e.clientY)
  })
  base.addEventListener('pointermove', e => { if (e.pointerId === activeId) move(e.clientX, e.clientY) })
  base.addEventListener('pointerup', end)
  base.addEventListener('pointercancel', end)
}
```

---

### Task 4: Character (model + animations)

**Files:**
- Create: `src/character.js`

- [ ] **Step 1: Implement `src/character.js`**

```js
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { pickClip, animationFor, facingAngle, approachAngle, stepPosition } from './movement.js'

const WALK_SPEED = 0.6   // meters per second
const TURN_SPEED = 8     // radians per second
const FADE = 0.2         // animation cross-fade, seconds

export class Character {
  constructor() {
    this.group = new THREE.Group()
    this.mixer = null
    this.actions = {}
    this.current = null
    this.angle = 0
  }

  // targetHeight: character height in meters in the AR world
  async load(url, targetHeight = 1.0) {
    const gltf = await new GLTFLoader().loadAsync(url)
    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    model.scale.setScalar(targetHeight / (box.max.y - box.min.y))
    box.setFromObject(model)
    model.position.y -= box.min.y // feet on the ground
    this.group.add(model)

    this.mixer = new THREE.AnimationMixer(model)
    const names = gltf.animations.map(c => c.name)
    for (const kind of ['idle', 'walk']) {
      const i = pickClip(names, kind)
      if (i >= 0) this.actions[kind] = this.mixer.clipAction(gltf.animations[i])
    }
    this.play('idle')
  }

  play(kind) {
    const next = this.actions[kind]
    if (!next || this.current === next) return
    next.reset().fadeIn(FADE).play()
    if (this.current) this.current.fadeOut(FADE)
    this.current = next
  }

  // dir: result of joystickToWorld
  update(dt, dir) {
    if (dir.magnitude > 0) {
      const p = stepPosition(this.group.position, dir, WALK_SPEED, dt)
      this.group.position.x = p.x
      this.group.position.z = p.z
      this.angle = approachAngle(this.angle, facingAngle(dir), TURN_SPEED * dt)
      this.group.rotation.y = this.angle
    }
    this.play(animationFor(dir.magnitude))
    if (this.mixer) this.mixer.update(dt)
  }
}
```

---

### Task 5: App glue + desktop simulation mode

**Files:**
- Create: `src/app.js`, `src/desktop.js`, `src/main.js`

- [ ] **Step 1: Implement `src/app.js`**

```js
import * as THREE from 'three'
import { Character } from './character.js'
import { joystickToWorld } from './movement.js'

const STOP = { x: 0, z: 0, magnitude: 0 }

export function createApp({ modelUrl }) {
  const clock = new THREE.Clock()
  const character = new Character()
  const forward = new THREE.Vector3()
  let camera = null
  let input = { x: 0, y: 0 }
  let placed = false

  return {
    setInput(v) { input = v },

    async attach({ scene, camera: cam }) {
      camera = cam
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2))
      const sun = new THREE.DirectionalLight(0xffffff, 1.5)
      sun.position.set(2, 4, 2)
      scene.add(sun)
      character.group.visible = false
      scene.add(character.group)
      await character.load(modelUrl)
    },

    place(pos) {
      character.group.position.set(pos.x, pos.y, pos.z)
      character.group.visible = true
      placed = true
    },

    update() {
      const dt = Math.min(clock.getDelta(), 0.1)
      if (!camera || !placed) return
      camera.getWorldDirection(forward)
      character.update(dt, joystickToWorld(input, { x: forward.x, z: forward.z }))
    }
  }
}
```

- [ ] **Step 2: Implement `src/desktop.js`** (no AR, for checking model/animations/joystick on a PC)

```js
import * as THREE from 'three'

export async function startDesktop({ canvas, app }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x223344)
  scene.add(new THREE.GridHelper(10, 20))
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(0, 1.6, 3)
  camera.lookAt(0, 0.5, 0)

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  await app.attach({ scene, camera })
  app.place({ x: 0, y: 0, z: 0 })

  // keyboard input (WASD / arrows) feeds the same input vector as the joystick
  const keys = new Set()
  const pushKeys = () => {
    const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0)
    const y = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
    app.setInput({ x, y })
  }
  window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); pushKeys() })
  window.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); pushKeys() })

  renderer.setAnimationLoop(() => {
    app.update()
    renderer.render(scene, camera)
  })
}
```

- [ ] **Step 3: Implement `src/main.js`**

```js
import { createApp } from './app.js'
import { createJoystick } from './joystick.js'
import { startDesktop } from './desktop.js'

const MODEL_URL = '/models/character.glb'
const canvas = document.getElementById('ar-canvas')
const messageEl = document.getElementById('message')

function showMessage(text) {
  messageEl.textContent = text
  messageEl.hidden = false
}

const app = createApp({ modelUrl: MODEL_URL })
createJoystick(document.getElementById('joystick-root'), v => app.setInput(v))

async function main() {
  const desktop = new URLSearchParams(location.search).has('desktop')
  if (desktop) {
    await startDesktop({ canvas, app })
  } else {
    const { startAR } = await import('./ar.js')
    await startAR({ canvas, app, onError: showMessage })
  }
}

main().catch(err => {
  console.error(err)
  showMessage('Erreur : ' + (err && err.message ? err.message : err))
})
```

- [ ] **Step 4: Put a model in place and run desktop mode**

The user drops their GLB at `models/character.glb` (clip names containing "idle" and "walk"). If no model exists yet, download a test GLB with animations (for example the three.js `Soldier.glb`) to that path.

Run: `npm run dev`, open `http://localhost:5173/?desktop`
Expected: the character stands on a grid playing idle. Holding W or dragging the joystick makes it walk and turn, with the walk animation; releasing returns to idle. A missing model shows the red "Erreur" message at the top.

---

### Task 6: AR mode with 8th Wall

**Files:**
- Create: `src/ar.js`

Task 0 findings (already applied to the code below): the three.js official example has no tap-to-place (it only recenters), so placement via `hitTest` follows the docs but is untested; `window.THREE` must be set; `XRExtras` provides `FullWindowCanvas` and `RuntimeError`. Camera-permission-denied behaviour is undocumented and must be checked on a phone in Task 7. Browser/OS support list not found.

- [ ] **Step 0: Add the XRExtras script to `index.html`** (after the existing `xr.js` script tag, in `<head>`; no `async`, as in the official example)

```html
<script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js"></script>
```

In `waitForXR8`, also make sure `window.XRExtras` exists before `startAR` uses it (XRExtras fires the `xrextrasloaded` window event; if `window.XRExtras` is undefined, wait for that event).

- [ ] **Step 1: Implement `src/ar.js`**

```js
import * as THREE from 'three'
window.THREE = THREE // XR8.Threejs expects a global THREE (official example does the same)

function waitForXR8() {
  return new Promise((resolve, reject) => {
    if (window.XR8) return resolve(window.XR8)
    const timer = setTimeout(() => reject(new Error('Moteur AR indisponible (réseau ?)')), 15000)
    window.addEventListener('xrloaded', () => { clearTimeout(timer); resolve(window.XR8) }, { once: true })
  })
}

export async function startAR({ canvas, app, onError }) {
  const XR8 = await waitForXR8()

  XR8.XrController.configure({ disableWorldTracking: false })

  const characterModule = {
    name: 'character-ar',

    onStart: () => {
      const { scene, camera } = XR8.Threejs.xrScene()
      // initial camera height must be > 0 (official example uses 0, 2, 2); set BEFORE updateCameraProjectionMatrix
      camera.position.set(0, 2, 2)
      XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion
      })
      app.attach({ scene, camera }).catch(e => onError('Modèle introuvable : ' + e.message))

      canvas.addEventListener('touchmove', e => e.preventDefault())

      // tap on the camera view places the character on the detected surface.
      // hitTest coordinates are 0..1 over the camera feed (full-window canvas).
      canvas.addEventListener('touchstart', e => {
        const t = e.touches[0]
        const hits = XR8.XrController.hitTest(
          t.clientX / window.innerWidth,
          t.clientY / window.innerHeight,
          ['FEATURE_POINT']
        )
        if (hits.length > 0) app.place(hits[0].position)
      })
    },

    onUpdate: () => app.update(),

    onException: e => onError('Erreur AR : ' + (e && e.message ? e.message : e))
  }

  // XRExtras (loaded in index.html) sizes the canvas and shows runtime errors, as in the official example
  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    XR8.Threejs.pipelineModule(),
    XR8.XrController.pipelineModule(),
    XRExtras.FullWindowCanvas.pipelineModule(),
    XRExtras.RuntimeError.pipelineModule(),
    characterModule
  ])

  try {
    XR8.run({ canvas })
  } catch (e) {
    onError("Impossible de démarrer la caméra. Autorisez l'accès à la caméra et utilisez Safari (iOS) ou Chrome (Android).")
  }
}
```

- [ ] **Step 2: Check it loads on desktop without crashing**

Run: `npm run dev`, open `http://localhost:5173/` (no `?desktop`)
Expected: either the webcam starts (desktop browsers can run the engine) or a clear red-banner message appears. No uncaught exception in the console.

---

### Task 7: Test on phones (manual, needs the user)

**Files:** none

- [ ] **Step 1: Ask the user to install ngrok and sign in once**

ngrok needs an account and auth token, so this step is done by the user: install ngrok, run `ngrok config add-authtoken <token>`.

- [ ] **Step 2: Expose the dev server over HTTPS**

Run: `npm run dev` in one terminal, then `ngrok http 5173` in another.
Expected: ngrok prints an `https://….ngrok-free.app` URL.

- [ ] **Step 3: Open the URL on one iPhone (Safari) and one Android phone (Chrome)**

Check each:
1. The camera permission prompt appears and the camera feed shows.
2. Move the phone slowly so tracking initialises, then tap on the floor: the character appears on the floor.
3. Joystick up walks away from the camera, with the walk animation. Turning the phone changes the walking direction accordingly.
4. Releasing the joystick returns to idle.

Record, per device: works / floor drift / wrong scale / error text. Fix issues in `src/ar.js` (placement) or `src/character.js` (scale via `targetHeight`).

---

## Self-review against the spec

- Place on floor by tap: Task 6. Joystick relative to camera: Tasks 2, 3, 5. Idle/walk with cross-fade: Task 4. Error messages (camera denied, engine/unsupported, model load): Tasks 5 and 6. Desktop simulation and phone test via ngrok: Tasks 5 and 7. Credit to Niantic Spatial: `index.html`. Open items (model format, floor API): Task 0 and Task 5 Step 4.
- Names consistent across tasks: `joystickToWorld`, `animationFor`, `facingAngle`, `approachAngle`, `stepPosition`, `pickClip`, `createApp` (`setInput`, `attach`, `place`, `update`), `Character` (`load`, `play`, `update`), `createJoystick`, `startAR`, `startDesktop`.

# AR Character — Design

Date: 2026-11-04

## Goal
A web AR experience, working on iOS (Safari) and Android (Chrome), where an animated 3D character is placed on the floor and walked around with an on-screen joystick. Personal project. Developed on Windows, no Mac, no Unity.

## Approach
- **AR engine:** 8th Wall XR Engine binary (`@8thwall/engine-binary`), self-hosted. Provides camera feed and SLAM world tracking on iOS and Android. License: limited-use binary, allowed as a component of a project, unmodified, with Niantic Spatial notices and credit kept.
- **Rendering:** three.js (`GLTFLoader`, `AnimationMixer`).
- **Tooling:** Vite dev server; ngrok for HTTPS when testing on phones (camera access requires HTTPS).
- No backend.

## Structure
```
AR-Character/
  models/            user's GLB (idle + walk animations)
  src/
    ar.js            engine init, camera pipeline, SLAM, floor hit-test
    character.js     load model, animation state (idle/walk), movement
    joystick.js      touch joystick, emits direction vector
    main.js          wiring
  index.html
  docs/superpowers/specs/
```

## Behaviour
1. User opens the HTTPS link, grants camera access.
2. Engine starts world tracking. Tap on screen places the character on the detected floor.
3. Joystick (bottom of screen) gives a 2D vector. Direction is relative to the camera view (projected on the floor plane).
4. Character rotates toward the movement direction and moves at constant speed. Animation: `walk` while the joystick is active, `idle` otherwise, with a short cross-fade.

## Error handling
Clear on-screen message for: camera permission denied, unsupported browser, model failed to load.

## Testing
- Desktop: simulated mode (no AR) to check model, animations and joystick logic.
- Phone: via ngrok on one iPhone and one Android device. Floor detection quality and supported browser versions are not documented in the sources read; they are verified in this step.

## Open items
- Model: format and animation names to be confirmed. Default: GLB with clips matching `idle` and `walk` (case-insensitive). If the user has no model yet, a test character is used. Non-GLB formats are converted to GLB.
- Exact 8th Wall floor-placement API to be taken from the engine docs/examples during implementation.

## Out of scope
Native apps, Unity, Xcode builds, multiplayer, backend, hosting beyond ngrok for testing.

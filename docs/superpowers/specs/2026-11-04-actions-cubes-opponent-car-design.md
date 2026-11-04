# AR Character v2 — Actions, cubes, opponent, car

Date: 2026-11-04. Extends `2026-11-04-ar-character-design.md`.

## Inputs (from the user)
- `public/models/character.glb` (7.7 MB): one character (mesh `Ch12`, Mixamo skeleton `mixamorig4:*`) and 6 clips named exactly `Boxing`, `Entering_Car`, `Idle`, `Jump`, `Push`, `Walking`. No car in this file. Model faces +Z in the game (`MODEL_FACING_OFFSET = 0`).
- The car is a separate file, `voiture-djenne.glb`, with a door node `Porte_G`. The door is animated by game code. To be dropped in `public/models/voiture-djenne.glb` (not yet present).
- `Entering_Car`: the character walks to the left (driver) door, opens it, sits, closes it. 165 frames at 30 fps = 5.5 s. Door timing: swings about 85° on its front hinge between frames 33 and 49 (1.10–1.63 s), stays open until frame 97 (3.23 s), closes between frames 105 and 145 (3.50–4.83 s).
- Opponent: a clone of the same character with a different color. Falls when hit, no riposte.
- Cubes: 5 cubes (about 25 cm), Kabakoo colors; they interact through the actions.

## Measured facts about the clips (units: cm in the armature, hips bone)
| Clip | Duration | Root motion |
|---|---|---|
| Idle | 9.97 s | none |
| Walking | 1.07 s | none (in place) |
| Boxing | 2.13 s | none |
| Jump | 0.90 s | none |
| Push | 8.03 s | hips travel about 301 cm forward |
| Entering_Car | 5.50 s | hips travel about 182 cm forward, 15 cm sideways, and sink 15 cm (sitting) |

Consequences:
1. **Root motion extraction.** For `Push` and `Entering_Car` the game reads the hips bone each frame, moves the character group by the horizontal hips displacement, and cancels that displacement on the bone, so the body does not snap back at the end of the clip. Other clips are unaffected.
2. **Push is too long (8 s) for a button.** Only its first 2.5 s are played (about 0.9 m of travel at game scale), then it fades back to idle.
3. **Scale.** The character is scaled to 1 m (factor S = 1 / 1.77). The car uses the same factor S, assuming the car was modeled at real size next to the character. This is checked when the file arrives; otherwise a constant is tuned.

## Units
1. **Actions** (`src/actions.js`, `src/actions-ui.js`). Buttons at bottom right: Jump, Boxing (Frapper), Push (Pousser). While an action plays the joystick is ignored. An impact moment per action (Boxing about 40 % of the clip, Push at the start of the pushing phase, Jump at take-off) triggers effects. Pure functions, unit-tested: whether an action can start, whether a target is within reach (distance and facing angle).
2. **Cubes** (`src/cubes.js`). Circle-vs-circle collision blocks the character and the car. Push: the cube in front, within reach, slides along the facing direction with friction. Boxing: the cube is thrown further with one bounce. Jump: nearby cubes hop slightly. No physics engine.
3. **Opponent** (`src/opponent.js`). A clone of the character (SkeletonUtils.clone) with a tinted material, placed 1.5 m in front of the player at placement time, playing Idle. A Boxing impact within reach makes it fall: tip backward about its feet in 0.5 s (ease-in), lie about 3 s, stand up in 0.6 s. Not hittable while falling.
4. **Car** (`src/car.js`). Loads `voiture-djenne.glb`, scaled by S, placed beside the character at placement time. `Porte_G` pivots about 85° on its front hinge following the timings above, driven by the `Entering_Car` clip time. A "Monter" button appears within 2 m of the driver door. It walks the character to the entry point, plays `Entering_Car` (root motion extracted), then hides the character. While driving, the joystick controls throttle/brake (up/down) and steering (left/right) with a simple bicycle model; the car pushes cubes. A "Descendre" button makes the character reappear beside the driver door and the car stays parked. If the car file is missing, a simple box-built car is used so everything remains testable.
5. **Wiring** (`src/app.js`): holds the state `free | action | entering | driving | exiting`, and routes joystick input and buttons accordingly.

## Testing
- Unit tests (vitest) for: reach check, action state transitions, cube sliding with friction, collision resolution, car kinematics, door angle versus clip time, fall/stand-up timeline.
- Desktop mode (`?desktop`) with screenshots for each step (actions, cubes, fall, enter car, drive, exit).
- Phone: by the user, through the published link. Not testable by the agent.

## Open items
- Car file `voiture-djenne.glb` not present yet: driver seat anchor, door hinge pivot and scale are tuned once it is there.
- Entering the car: the exact approach point is tuned with screenshots against the clip's measured motion.
- Whether the car should share the cubes' collision (yes in this spec).

## Out of scope
Opponent attacks or score, multiplayer, animated wheels from a skeleton, a fall animation (the fall is code-driven), publishing without the user's go-ahead.

> **UPDATE 2026-11-04:** the car feature (Task 5, `voiture-djenne.glb`, door animation, Monter/Descendre) was removed at the user's request. Remaining scope: actions, cubes, opponent, shadows, realistic cube physics with size-based mass.

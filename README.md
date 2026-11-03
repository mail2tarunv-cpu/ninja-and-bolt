# Ninja & Bolt — Greybox co-op puzzle platformer

Two-player browser game made with **Phaser 3 + Vite**, deployed from GitHub to Vercel. Choose a level from the header. Final character sprites, textures, and sound are intentionally not included.

## Run locally

```bash
npm install
npm run dev
```

## Controls

| Action | Ninja | Bolt |
| --- | --- | --- |
| Move | A / D | Left / Right arrows |
| Jump | W | Up arrow |
| Interact | F | Enter |

**H** opens the optional hint. **R** restarts the currently selected level. Two people share one keyboard.

## Level 01 — The Forgotten Workshop

Bolt repositions one heavy stone block as a step so Ninja can reach a high lever. Ninja opens a gate. Bolt reuses the same block to hold a pressure plate, unlock a bridge beam, and build a route to the shared exit.

## Level 02 — The Counterweight Foundry (new)

A separate mechanics-focused level introducing two types of construction:

**A. Assemble and use a seesaw / ramp**

1. Bolt lifts the long loose plank at the start and carries it to the marked pivot.
2. Press Enter near the pivot to attach the plank and create the seesaw.
3. Bolt stands on the **left side** of the board; the heavier character tilts it, raising the **right side**.
4. Ninja uses the raised right side to jump to the otherwise unreachable upper ledge and pull the switch. This opens the storage gate.

**B. Assemble a pulley and balance the counterweights**

5. Bolt picks up the loose **wheel**, carries it to the gold assembly bench, and installs it using Enter.
6. Bolt repeats this for the loose **rope spool**. The assembled overhead pulley now connects the lower lift to the hanging basket.
7. Ninja stands on the lower lift. Bolt chooses a **light** or **heavy** counterweight, picks it up, and attaches it to the basket using Enter.
8. The basket moves down and the lift rises. The light weight raises it partway; the heavy weight lifts it high enough to reach the upper walkway. You can remove a weight from the basket and try a different one.
9. Ninja reaches the upper switch to open the final gate. Both characters meet at the shared exit.

### Current implementation

- Weight-responsive, visually tilting seesaw with a series of moving, one-way collision segments (a controlled approximation, not full rigid-body simulation)
- Player-carried plank and snap-to-pivot assembly
- Wheel and rope components that must each be installed
- Counterweight lift with weight-dependent heights and animated rope/basket
- Two separate weight objects, attachment/removal, interaction prompts, hints and shared exit
- Level selector so Level 01 is preserved

### Known prototype limits

The pulley and seesaw use intentionally **kinematic / rule-based physics**. They visually and mechanically respond to player input but do not yet model actual rope tension or unconstrained rigid-body dynamics. Fine movement, collision tolerances and the moving-platform ride must be verified in a live browser with two players. The Vercel build being successful does not establish that the puzzles are perfectly playable.

## Deployment

Vercel: build command `npm run build`, output directory `dist`. GitHub pushes to the configured production branch automatically trigger Vercel builds.


## Level 03 — Temple of Balance

A longer, original **Forest Temple–inspired** map using two seesaws, a pulley, vertically separated routes, permanent gates, and a two-player exit. It is not a pixel-for-pixel recreation of another game's level.

### Intended solution and mechanics

1. **Balance A:** Bolt stands on the left gold pad, pulling down that side of the first seesaw and raising its right end. Ninja jumps to the elevated platform and activates Switch A.
2. **Machine room:** The first gate opens. Bolt collects the separate wheel and rope parts, carries each to the marked assembly bench, and installs them.
3. **Counterweight:** Ninja boards the lower lift. Bolt tries a light or heavy counterweight in the basket. Light weight moves the lift only partway; the heavy weight raises it sufficiently to reach the upper walkway.
4. **Upper switch:** Ninja rides the lift, jumps across to Switch B, and opens the next gate.
5. **Balance B:** Bolt collects a loose plank beyond the gate and installs it on the second pivot. Bolt holds down the left side while Ninja jumps from the raised right end to Switch C.
6. **Exit:** Switch C opens the last gate. Both heroes regroup at the exit door.

### Development / reliability

- Source: `src/temple.js`
- Level coordinates: `src/temple-layout.js`
- Tests: `tests/temple-layout.test.js`; executed before the Vite production build
- All temporary silhouettes, mechanics, and surroundings are generated in code. Final sprites and environment artwork are not added.
- Seesaws use rotating artwork and one-way collision segments; the pulley is a controlled weight-based lift. These are game-friendly approximations, **not** a physically accurate rope and rigid-body simulator.
- Static geometry tests check intended jumping reach and level ordering. They do **not** substitute for testing with two humans in a running browser.

### How to test

Use the **03 Temple** button in the top level selector. Controls are unchanged. Press **H** if unsure of a puzzle step, **R** to restart the selected level. Suggested QA cases: reach the first upper ledge with Bolt on the left weight pad; try the light weight and heavy weight; detach and reattach the basket weight; install the second plank; deliberately separate the two heroes to test the shared camera; finish with both characters.

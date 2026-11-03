# Ninja & Bolt — Temple of Balance (Level 03)

**One level. Two playable characters.** This repository now launches the Temple of Balance directly. The earlier Workshop and Foundry levels and their selector were removed so all iteration is focused on the Temple.

- **Live game:** https://ninja-and-bolt.vercel.app
- **Engine:** Phaser 3 + Vite
- **Design state:** Greybox / mechanics prototype. No final artwork or audio.

## Local setup

```bash
npm install
npm run dev
```

## Two-player controls

| Action | Ninja | Bolt |
| --- | --- | --- |
| Walk | A / D | ← / → |
| Jump | W | ↑ |
| Interact | F | Enter |

Press **H** to see an optional hint and **R** to restart. Two people use one keyboard.

## Single active level: Temple of Balance

Both characters begin on the left. The objective is to cooperate through three chambers and reach the same exit.

1. **First seesaw:** Bolt holds the left counterweight pad so the right side tilts upward. Ninja jumps onto the high ledge and pulls Switch A.
2. **Pulley chamber:** Bolt installs a wheel and spool of rope at the assembly bench. Ninja stands on the lift while Bolt tries different counterweights in the basket.
3. **Upper route:** The heavy weight lifts Ninja high enough to reach Switch B, opening the next gate.
4. **Second seesaw:** Bolt collects the loose plank and installs it at the next pivot. Bolt weighs the left end down as Ninja jumps from the raised right end to Switch C.
5. **Shared finish:** The last gate opens; both Ninja and Bolt must arrive at the exit.

### Code structure

- `src/main.js` — launches only the Temple Phaser scene
- `src/temple.js` — characters, collision, mechanisms, interactions, camera and game flow
- `src/temple-layout.js` — geometry constants for the active map
- `tests/temple-layout.test.js` — automated layout reachability and ordering checks
- `src/style.css` / `index.html` — HUD and controls

### Validation

```bash
npm test
npm run build
```

These tests check geometry assumptions, not complete runtime playability. The seesaws and pulley use deterministic, game-oriented approximations rather than full rigid-body physics. Two-player browser playtesting is still required to validate interaction reach, movement, collisions, and potential soft locks before visual polishing.

The former levels remain recoverable through the repository's Git history, but are not included in the active game.

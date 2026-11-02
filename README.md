# Ninja & Bolt — Level 1 prototype

An asset-free, two-player cooperative puzzle-platformer made with **Phaser 3 + Vite**. Level 1 is called **The Forgotten Workshop**.

## Run locally
```bash
npm install
npm run dev
```

## Deploy on Vercel
Import this GitHub repository, use the Vite preset, build command `npm run build`, output directory `dist`. All gameplay runs in the browser; there is no backend.

## Controls
| Action | Ninja | Bolt |
|---|---|---|
| Move | A / D | Left / Right arrows |
| Jump | W | Up arrow |
| Interact | F | Enter |

`R` or the Restart button restarts the level.

## Level 1
1. Ninja jumps up to a lever and opens the gate.
2. Bolt carries a heavy crate to a pressure plate.
3. The plate releases a bridge beam. Bolt carries it to the construction socket and builds the bridge.
4. Both heroes cross and reach the exit.

## Development status
The level map and interactions are implemented with generated placeholder graphics. Next: browser playtest and tune the jumping, crate placement, bridge activation, respawn, and camera. Hand-drawn characters, parallax layers, modular stone artwork, audio, and Level 2 are **not** included yet. No gameplay validation in a running browser has been completed in this session.

# Ninja & Bolt — The Forgotten Workshop

A cooperative, **two-player** puzzle-platformer greybox running on **Phaser 3 + Vite**. The Level 1 map has been redesigned around one reusable block rather than a 3,300-pixel instruction corridor.

## Run

```bash
npm install
npm run dev
```

## Controls

| Action | Ninja | Bolt |
| --- | --- | --- |
| Move | A / D | ← / → |
| Jump | W | ↑ |
| Interact | F | Enter |

**H** for optional hint, **R** for restart. Best played with two people sharing a desktop keyboard.

## Level 1 — Intended solution

1. **Make a step.** Bolt carries the heavy stone block to the elevated ledge, then places it. Ninja jumps onto the block, then to the high lever.
2. **Open the gate.** Ninja pulls the lever; the gate opens permanently, and Bolt can carry the block through.
3. **Reuse the block.** Bolt puts that *same block* onto the pressure plate beyond the gate, unlocking a bridge beam.
4. **Build.** Bolt carries the beam to the construction socket at the gap, then installs it. The new bridge has collision for both heroes.
5. **Exit together.** Both cross to the glowing door.

The interface gives interaction prompts only when players are near objects. An optional hint is available; the intended solution is not printed on screen.

### Implementation notes
- Compact 1,780px room; static terrain with separate collision; no final images or audio
- Ninja jumps higher; Bolt can carry heavy objects; crate is solid when placed
- Gate, lever, pressure plate, unlockable beam, and buildable bridge
- Camera tracks both players with modest separation-based zoom
- Falling into a pit respawns a hero safely; restart and success overlay included
- All gameplay remains in `src/main.js` for now, and the visual elements are procedural

### Deployment
Import this repository on Vercel as a **Vite** app (`npm run build`, output `dist`).

### Status
Code committed for browser playtesting. Gameplay balance, placement tolerances, and any keyboard/browser behavior still require a live two-player test. Final sprites, tiles, parallax, sound, and Level 2 are intentionally postponed.

# Ninja & Bolt — Two-storey Temple

This repository is focused on **one screenshot-mapped level**, adapted from the two-floor puzzle screenshot supplied for the project. Ninja and Bolt are the two independently playable characters. There are no other levels, and the scene never scrolls.

## Live version

https://ninja-and-bolt.vercel.app

## Controls

| | Ninja (red) | Bolt (blue) |
|---|---|---|
| Move | A / D | Left / Right arrow |
| Jump | W | Up arrow |
| Interact | F | Enter |

- **H** shows an optional hint.
- **R** restarts the map.
- **B** outlines the collision geometry for debugging.

## Screenshot-matched map

The reference image is 581 × 437 pixels. The game renders a 2×-scale room at **1162 × 874** with the same overall arrangement:

- Both characters begin in their pictured positions on the upper floor (blue to the left, red to the right).
- Two seesaws: one in the upper center and one in the lower right.
- An upper platform maze with the same key shelf and wall locations.
- A hanging dual-wheel chain/pulley in the lower center-left.
- The wide horizontal divider between floors, and separate red/blue pads at its left and right edges.
- Three red gems and seven blue gems placed at the photographed coordinates.
- A red door on the lower right's upper shelf and a blue door below it near the floor.

The visual style is **an original in-code placeholder reconstruction** using olive bricks, stone and metal surfaces. It is *not* a rip of the source game's artwork.

## Level rules

1. Collect your character's matching jewels in the **upper** floor.
2. Reach your colored edge pad and press the interact key to descend into the **lower** floor.
3. Use the second seesaw, lower platforms and pulley to reach the remaining jewels.
4. Reach both respective colored doors on the lower right after all gems are collected.

The two seesaws respond to the characters' relative weight and position. The hanging platform can be shifted with an interact key near the pulley.

## Code

- `src/main.js` — fixed-camera Phaser boot, single scene, gravity
- `src/temple.js` — detailed map rendering, two-player movement, physics, seesaws, pulley, gems, colored exits
- `src/temple-layout.js` — exact screenshot-derived reference coordinates used by the scene
- `tests/temple-layout.test.js` — map geometry and jump-range checks
- `src/style.css` and `index.html` — HTML shell and two-player control HUD

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

Vercel builds every push to main.

## Validation caveat

The production build and static map tests check **compilation and geometry**, not a complete two-player playthrough. The seesaws use game-oriented contact/torque approximation, not the exact source game's physics. More browser playtesting is needed for collision edges, portal interaction, jump heights, and reachable gem paths. The hand-drawn Ninja/Bolt assets remain for later.

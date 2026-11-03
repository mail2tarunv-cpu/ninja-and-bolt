# Ninja & Bolt — Block & Blade

A two-player cooperative Canvas platform game. This repository is synchronized to the code exported from the **UX Kids Concrete** Figma Make game, with minor TypeScript syntax repairs and a standalone Vite configuration.

## Play locally

Requires Node.js 22+.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Production: `npm run build`, preview: `npm run preview`.

## Controls

- **Robot/Bolt:** A/D move, W jump, Q build blocks.
- **Ninja:** Left/Right move, Up jump/climb, Down descend when climbing.
- **R:** Restart the level.

Both players must reach their respective exit pods to win. The shared score rewards mission completion (200), six collectible gems (100 each), and speed (up to 200). The on-screen clock starts with the first movement and stops upon completion. Best score is stored in the browser.

## Character assets

The original Figma sprite atlases are committed under `public/sprites/`. Each image was copied byte-for-byte from Figma Make: 17 frames per character, 180×220 pixels per frame. `src/App.tsx` uses them for idle, run, jump, climb (Ninja), and build (Robot) animations.

## Source

- Figma Make: https://www.figma.com/make/PaiJvjgleFgvh6V4BbfIng/UX-Kids-Concrete
- GitHub: https://github.com/mail2tarunv-cpu/ninja-and-bolt

The Figma Make design is the source for this snapshot; future changes to it are **not** synced to GitHub automatically.

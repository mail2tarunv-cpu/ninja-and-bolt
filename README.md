# Ninja & Bolt — Figma Make Sync

This repository mirrors the updated **UX Kids Concrete** Figma Make game, adapted for standalone React/TypeScript/Vite deployment. Synced November 3, 2026.

## Features included

- Procedurally illustrated abandoned toy/robot factory, animated machinery and windows, hanging toys and industrial catwalks.
- Two original character animation atlases from Figma Make.
- Two separate collectible keys: Ninja's fixed key and Robot's lift-mounted key. Each character needs their key before their own exit will register.
- Updated upper-tier platform geometry and gem positions.
- Shared timer, six gems, scoring, win/failure results, and local personal best.
- Existing GitHub-specific jump improvement retained: 550 velocity, ledge-corner handling, 110ms coyote time, 130ms jump buffer.

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test`, `npx tsc --noEmit`, and `npm run build` to validate.

## Controls

- **Robot**: A/D move; W jump; Q place bridge blocks.
- **Ninja**: left/right arrows move; up arrow jumps or climbs walls; down arrow descends while climbing.
- **R**: reset level.

Both players must collect their own key and reach their respective exit doors to finish together.

## Design source

- Figma Make: https://www.figma.com/make/PaiJvjgleFgvh6V4BbfIng/UX-Kids-Concrete
- GitHub: https://github.com/mail2tarunv-cpu/ninja-and-bolt

The older fantasy art pipeline (`src/art.ts` and `public/art/`) is retained as archival code/assets but is no longer used by the live game. This is a snapshot, not an automatic Figma↔GitHub sync.

## Story introduction and audio

At launch, three illustrated panels introduce Halloway Toy Works, Ninja and Unit 7, their complementary abilities, and the shared escape objective. They appear over a paused game canvas, before the mission timer begins. A **STORY** button reopens the introduction, and **RESET** / **PLAY AGAIN** restart gameplay without forcing the introduction again.

The story artwork lives under `public/story/`. The game's soundtrack is an original procedural music-box and toy-factory rhythm built with the browser's Web Audio API (`src/sound.ts`); no licensed tracks or external audio dependency are used. Sound effects cover jumping, building, gems, keys, switches, success, failure, and interface taps. The **SOUND ON / OFF** control mutes or unmutes both soundtrack and SFX, and persists locally.

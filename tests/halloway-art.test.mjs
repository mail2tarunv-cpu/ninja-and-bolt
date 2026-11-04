import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync('src/App.tsx','utf8')
const art = readFileSync('src/hallowayArt.ts','utf8')
const svgPaths = [
  'background/far_factory.svg',
  'background/mid_factory.svg',
  'background/atmosphere.svg',
  'platforms/solid_center.svg',
  'platforms/solid_left_cap.svg',
  'platforms/solid_right_cap.svg',
  'platforms/solid_short.svg',
  'platforms/suspended.svg',
  'platforms/moving_lift.svg',
  'platforms/hazard_edge.svg',
  'platforms/climb_wall.svg',
  'platforms/slope_piece.svg',
]
for (const file of svgPaths) {
  test(`Halloway asset ${file} exists as usable standalone vector artwork`, () => {
    const path = resolve('public/halloway',file)
    const svg = readFileSync(path,'utf8')
    assert.ok(statSync(path).size > 500)
    assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    assert.ok(svg.endsWith('</svg>'))
    assert.ok(art.includes(file), 'renderer must reference the asset')
  })
}

test('new layers render behind the playable objects, with fallback', () => {
  const world = app.slice(app.indexOf('function drawWorld('), app.indexOf('function movePlayer('))
  const background = world.indexOf('drawHallowayBackground(ctx)')
  const haze = world.indexOf('drawAtmosphericHaze(ctx)')
  const hazards = world.indexOf('drawToyPit(ctx, GROUND_WATER')
  const platforms = world.indexOf('solids.forEach((rect) => drawPlatform(ctx, rect))')
  assert.ok(background >= 0 && background < haze && haze < hazards && hazards < platforms)
  assert.ok(app.includes('loadHallowayKit()'))
  assert.ok(app.includes('if (!drawHallowayBackground(ctx))'))
  assert.ok(art.includes("image?.complete && image.naturalWidth > 0"))
})

test('platform, lift and climb visuals use approved assets, without altering collisions', () => {
  assert.ok(app.includes('if (drawHallowayPlatform(ctx, rect)) return'))
  assert.ok(app.includes('drawHallowayMovingLift(ctx, x, y, w, LIFT_HEIGHT)'))
  assert.ok(app.includes('if (drawHallowayClimbWall(ctx, wall)) return'))
  assert.ok(app.includes('moveWithPlatformCollisions(player, currentColliders(game), dt)'))
  assert.ok(app.includes('updateJumpAssist(player, input.up, dt)'))
  assert.ok(art.includes('the existing collision'))
})

test('previous story UI, score and audio integrations stay connected', () => {
  assert.ok(app.includes('<StoryModal'))
  assert.ok(app.includes('<FailureModal'))
  assert.ok(app.includes('new GameSound()'))
  assert.ok(app.includes('setResult({'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx', 'utf8')
const depth = readFileSync('src/environmentDepth.ts', 'utf8')

test('depth is rendered behind the gameplay layers', () => {
  assert.ok(app.includes('drawDistantFactory(ctx, now)'))
  assert.ok(app.includes('drawAtmosphericHaze(ctx)'))
  const world = app.slice(app.indexOf('function drawWorld('), app.indexOf('function movePlayer('))
  const back = world.indexOf('drawFactoryBackground(ctx, now)')
  const haze = world.indexOf('drawAtmosphericHaze(ctx)')
  const hazards = world.indexOf('drawToyPit(ctx, GROUND_WATER')
  const platform = world.indexOf('solids.forEach((rect) => drawPlatform(ctx, rect))')
  const players = world.indexOf('drawCharacterSprite(ctx, game.robot')
  assert.ok(back >= 0 && back < haze && haze < hazards && hazards < platform && platform < players)
  assert.ok(depth.includes('ctx.restore()'), 'depth layers must restore Canvas state')
})

test('platforms have a clear top lip, undershadow and reduced decorative noise', () => {
  const platform = app.slice(app.indexOf('function drawPlatform('), app.indexOf('function drawLift('))
  assert.ok(platform.includes('ctx.shadowOffsetY = 9'))
  assert.ok(platform.includes('Bright, continuous top lip'))
  assert.ok(platform.includes('x += 126'), 'use sparse anchors instead of dense rivets')
  assert.ok(!platform.includes('x += 32'), 'old dense rivets should be removed')
})

test('gameplay physics and level geometry are unaffected', () => {
  assert.ok(app.includes('moveWithPlatformCollisions(player, currentColliders(game), dt)'))
  assert.ok(app.includes('updateJumpAssist(player, input.up, dt)'))
  assert.ok(app.includes('{ x: 24, y: 478, w: 550, h: 28 }'))
  assert.ok(app.includes('{ x: 280, y: 300, w: 976, h: 28 }'))
})

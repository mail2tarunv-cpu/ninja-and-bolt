import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve('src/App.tsx'), 'utf8')
const css = readFileSync(resolve('src/index.css'), 'utf8')

for (const name of ['ninja-atlas.png', 'robot-atlas.png', 'ninja-portrait.png', 'robot-portrait.png']) {
  test(`${name} from Figma Make exists`, () => {
    const file = resolve('public/sprites', name)
    assert.ok(statSync(file).size > 8000)
    assert.equal(readFileSync(file).subarray(1, 4).toString('ascii'), 'PNG')
  })
}

test('character atlas dimensions match 17 sprite frames', () => {
  for (const name of ['ninja-atlas.png', 'robot-atlas.png']) {
    const png = readFileSync(resolve('public/sprites', name))
    assert.equal(png.readUInt32BE(16), 3060)
    assert.equal(png.readUInt32BE(20), 220)
  }
})

test('latest factory presentation and gated exits are integrated', () => {
  for (const item of ['drawFactoryBackground', 'drawToyPit', 'drawHangingToys', 'drawFactorySign', 'drawExitDoor', 'getRobotKeyRect', 'NINJA_KEY']) {
    assert.ok(app.includes(item), `Missing Figma Make feature: ${item}`)
  }
  assert.ok(app.includes('game.robotExit = game.robotHasKey && overlaps'))
  assert.ok(app.includes('game.ninjaExit = game.ninjaHasKey && overlaps'))
  assert.ok(css.includes('.key-status'))
})

test('GitHub jump-physics fix has been preserved', () => {
  assert.ok(app.includes('updateJumpAssist(player, input.up, dt)'))
  assert.ok(app.includes('moveWithPlatformCollisions(player, currentColliders(game), dt)'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve('src/App.tsx'), 'utf8')
const story = readFileSync(resolve('src/StoryModal.tsx'), 'utf8')
const sound = readFileSync(resolve('src/sound.ts'), 'utf8')

for (const name of ['unit-7.jpg', 'rescue.jpg', 'escape-plan.jpg', 'teamwork.jpg']) {
  test(`story art ${name} exists and is nontrivial`, () => {
    const file = resolve('public/story', name)
    assert.ok(statSync(file).size > 18000)
    const header = readFileSync(file).subarray(0, 3).toString('hex')
    assert.equal(header, 'ffd8ff')
  })
}

test('story starts frozen, introduces both abilities, and can be reopened', () => {
  assert.ok(app.includes('useState(true)'))
  assert.ok(app.includes('if (!storyOpen && !game.won'))
  assert.ok(app.includes('pauseMissionTimer(game, now)'))
  assert.ok(app.includes('setStoryOpen(true)'))
  assert.ok(story.includes('CLIMB WALLS'))
  assert.ok(story.includes('BUILD CRATES'))
  assert.ok(story.includes('BEGIN RESCUE'))
})

test('audio is generated locally with distinct music and game event cues', () => {
  assert.ok(sound.includes('createOscillator'))
  assert.ok(sound.includes('setInterval'))
  for (const name of ['jump', 'build', 'gem', 'key', 'switch', 'failure', 'victory']) {
    assert.ok(sound.includes(`case '${name}'`))
  }
  assert.ok(app.includes('sound.setEnabled(next)'))
})

test('current game physics and cooperative key gates remain unchanged', () => {
  assert.ok(app.includes('updateJumpAssist(player, input.up, dt)'))
  assert.ok(app.includes('moveWithPlatformCollisions(player, currentColliders(game), dt)'))
  assert.ok(app.includes('game.robotExit = game.robotHasKey && overlaps'))
  assert.ok(app.includes('game.ninjaExit = game.ninjaHasKey && overlaps'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx','utf8')
const story = readFileSync('src/StoryModal.tsx','utf8')
const failed = readFileSync('src/FailureModal.tsx','utf8')
const css = readFileSync('src/index.css','utf8')

test('outcome cards retain coded feedback and a single retry action', () => {
  const outcome = readFileSync('src/OutcomeCard.tsx', 'utf8')
  assert.ok(outcome.includes('MISSION FAILED'))
  assert.ok(outcome.includes('MISSION COMPLETE'))
  assert.ok(outcome.includes('aria-describedby="outcome-description"'))
  assert.ok(outcome.includes('Try again'))
  assert.ok(failed.includes('MISSION TIP'))
  assert.ok(failed.includes("'Bolt' : 'Ninja'"))
  assert.ok(!failed.includes('REPLAY STORY'))
  assert.ok(app.includes('<OutcomeCard success'))
})

test('story presents a concise cinematic card with coded navigation', () => {
  const cinema = readFileSync('src/story.css', 'utf8')
  assert.ok(story.includes('cinema-card'))
  assert.ok(story.includes('aria-modal="true"'))
  assert.ok(story.includes('Skip intro'))
  assert.ok(story.includes('Let’s play'))
  assert.ok(cinema.includes('width:min(960px,86vw)'))
  assert.ok(STORY_CHAR_COUNT(story) < 500)
})

function STORY_CHAR_COUNT(source) {
  const matches = [...source.matchAll(/description:\s*'([^']+)'/g)]
  return matches.reduce((count, match) => count + match[1].length, 0)
}

test('game occupies viewport and controls are condensed', () => {
  assert.ok(css.includes('--stage-width'))
  assert.ok(css.includes('100dvh'))
  assert.ok(css.includes('aspect-ratio:16/9'))
  assert.ok(app.includes('control-shortcuts'))
  assert.ok(app.includes('hud-avatar'))
})

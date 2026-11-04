import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx','utf8')
const story = readFileSync('src/StoryModal.tsx','utf8')
const failed = readFileSync('src/FailureModal.tsx','utf8')
const css = readFileSync('src/index.css','utf8')

test('failure hierarchy is headline first, visual scene second, retry is primary', () => {
  assert.ok(failed.indexOf('failure-heading') < failed.indexOf('failure-image'))
  assert.ok(failed.indexOf('failure-image') < failed.indexOf('failure-bottom'))
  assert.ok(failed.includes('MISSION FAILED'))
  assert.ok(failed.includes('FIELD NOTE'))
  assert.ok(failed.includes('TRY AGAIN'))
  assert.ok(app.includes('<FailureModal'))
})

test('story presents image-first full bleed slides with concise copy', () => {
  assert.ok(story.includes('story-stage-art'))
  assert.ok(story.includes('story-stage-shade'))
  assert.ok(story.includes('story-presentation'))
  assert.ok(story.includes('story-bottomline'))
  assert.ok(story.includes('SKIP INTRO'))
  assert.ok(story.includes('BEGIN RESCUE'))
  assert.ok(STORY_CHAR_COUNT(story) < 1200, 'story narrative should stay short')
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

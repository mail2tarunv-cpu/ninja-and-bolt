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

test('story displays readable image-first briefing card with concise copy', () => {
  assert.ok(story.includes('story-card'))
  assert.ok(story.includes('story-art'))
  assert.ok(story.includes('story-editorial'))
  assert.ok(story.includes('story-footer'))
  assert.ok(story.indexOf('story-art') < story.indexOf('story-editorial'))
  assert.ok(!story.includes('story-stage-shade'), 'art should not be obscured by heavy overlay')
  assert.ok(css.includes('position: fixed; inset: 0'), 'story should cover full viewport, not only canvas')
  assert.ok(css.includes('story-narrative'), 'text should have its own legible surface')
  assert.ok(story.includes('SKIP INTRO'))
  assert.ok(story.includes('BEGIN RESCUE'))
  assert.ok(STORY_CHAR_COUNT(story) < 500, 'story narrative should be short enough for older children')
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

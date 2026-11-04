import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx', 'utf8')
const css = readFileSync('src/index.css', 'utf8')

test('viewport shell stays in one screen without page scrolling', () => {
  const shell = css.slice(css.indexOf('SINGLE-VIEW GAME SHELL'))
  assert.ok(shell.includes('height: 100dvh'))
  assert.ok(shell.includes('overflow: hidden'))
  assert.ok(shell.includes('--stage-width: min(calc(100vw - 24px), calc(177.7778dvh - 296px), 1640px)'))
  assert.ok(shell.includes('grid-template-rows: 40px auto 35px'))
  assert.ok(shell.includes('aspect-ratio: 16 / 9'))
  assert.ok(!shell.includes('max-height: calc(100dvh - 110px)'), 'do not clip height-sized canvas');
})

test('responsive stage width leaves room for header, HUD and controls', () => {
  const reserved = 166.5 // derived from 296px / (16 / 9)
  const chrome = 40 + 44 + 35 + 7 * 2 + 8 * 2 + 2
  assert.ok(chrome < reserved, 'chrome must fit under the stage width reserve')
  for (const [width,height] of [[1920,1080],[1600,900],[1280,720],[1024,768],[844,390],[390,844],[360,640]]) {
    const maxWidth = Math.max(0, Math.min(width - 24, height * 16 / 9 - 296, 1640))
    const stageHeight = maxWidth * 9 / 16
    assert.ok(stageHeight + chrome <= height + .1, `stage should fit ${width}x${height}`)
    assert.ok(maxWidth <= width - 16, 'stage must not overflow viewport horizontally')
  }
})

test('HUD and controls are simplified instead of duplicated cards', () => {
  const shell = css.slice(css.indexOf('SINGLE-VIEW GAME SHELL'))
  assert.ok(shell.includes('.controls .control-avatar { display: none; }'))
  assert.ok(shell.includes('.controls .control-card'))
  assert.ok(shell.includes('.hud-name strong'))
  assert.ok(shell.includes('.mission-timer strong'))
  assert.ok(app.includes('<StoryModal') && app.includes('<FailureModal'))
  assert.ok(app.includes('new GameSound()'), 'audio should be preserved')
})

test('ready-to-start overlay lets the factory remain visible', () => {
  assert.ok(app.includes('READY TO ESCAPE?'))
  assert.ok(app.includes('Move either character to begin'))
  assert.ok(app.includes('rgba(5, 12, 20, .27)'))
  assert.ok(!app.includes('CO-OP SYSTEM ONLINE'))
})

test('the existing jump physics and factory rendering are preserved', () => {
  assert.ok(app.includes('updateJumpAssist(player, input.up, dt)'))
  assert.ok(app.includes('moveWithPlatformCollisions(player, currentColliders(game), dt)'))
  assert.ok(app.includes('drawAtmosphericHaze(ctx)'))
})

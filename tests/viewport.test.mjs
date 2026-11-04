import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx', 'utf8')
const css = readFileSync('src/studio.css', 'utf8')
const main = readFileSync('src/main.tsx', 'utf8')

test('the newest studio layer is loaded after the base CSS', () => {
  assert.ok(main.indexOf("import './index.css'") < main.indexOf("import './studio.css'"))
  assert.ok(css.includes('--stage-width: min(calc(100vw - 24px), calc(177.7778dvh - 302.222px), 1640px)'))
  assert.ok(css.includes('height:100dvh'))
  assert.ok(css.includes('overflow:hidden'))
  assert.ok(css.includes('grid-template-rows:38px auto 34px'))
  assert.ok(css.includes('aspect-ratio:16/9'))
})

test('16:9 game stage fits common laptop, phone and short landscape viewports', () => {
  const chrome = 38 + 42 + 34 + 14 + 16 + 2
  assert.ok(chrome < 170)
  for (const [width, height] of [[1920,1080],[1600,900],[1366,768],[1280,720],[1024,768],[844,390],[390,844],[360,640]]) {
    const stageWidth = Math.max(0, Math.min(width - 24, (height - 170) * 16 / 9, 1640))
    const totalHeight = stageWidth * 9 / 16 + chrome
    assert.ok(totalHeight <= height, `stage clips vertically at ${width}x${height}`)
    assert.ok(stageWidth <= width - 16, `stage clips horizontally at ${width}x${height}`)
  }
})

test('HUD is integrated with controls; no bulky cards or duplicate controls', () => {
  assert.ok(css.includes('.app-shell .controls .control-avatar {display:none;}'))
  assert.ok(css.includes('.app-shell .status-strip'))
  assert.ok(css.includes('.app-shell .mission-timer strong'))
  assert.ok(css.includes('.app-shell .controls .control-card'))
  assert.ok(app.includes('control-shortcuts'))
  assert.ok(app.includes('hud-avatar'))
})

test('fullscreen onboarding is separate from in-canvas story, failure, win and pause popups', () => {
  assert.ok(css.includes('.story-overlay.is-onboarding'))
  assert.ok(css.includes('position:fixed; inset:0'))
  assert.ok(css.includes('.story-overlay.is-popup'))
  assert.ok(css.includes('position:absolute;inset:0'))
  assert.ok(css.includes('.pause-overlay,.failure-overlay,.results-overlay'))
  assert.ok(app.includes('mode={hasSeenIntro ? "popup" : "onboarding"}'))
  assert.ok(app.includes('className="pause-overlay"'))
  assert.ok(app.includes('<FailureModal'))
  assert.ok(app.includes('<OutcomeCard success'))
})

test('pause freezes the timer and both characters, resume returns to gameplay', () => {
  assert.ok(app.includes('pauseMissionTimer(game, now)'))
  assert.ok(app.includes('if (storyOpen || pauseOpen)'))
  assert.ok(app.includes('if (!storyOpen && !pauseOpen && !game.won && !game.failedRole && !game.paused) updateGame(game, dt)'))
  assert.ok(app.includes('setPauseOpen(open => !open)'))
  assert.ok(app.includes('setPauseOpen(false)'))
  assert.ok(app.includes('sound.stop()'))
  assert.ok(app.includes('sound.start()'))
})

test('the intro is the only start presentation; physics and audio remain intact', () => {
  assert.ok(!app.includes('READY TO ESCAPE?'))
  assert.ok(!app.includes('CO-OP SYSTEM ONLINE'))
  assert.ok(app.includes('updateJumpAssist(player, input.up, dt)'))
  assert.ok(app.includes('moveWithPlatformCollisions(player, currentColliders(game), dt)'))
  assert.ok(app.includes('drawAtmosphericHaze(ctx)'))
  assert.ok(app.includes('new GameSound()'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GRAVITY,
  JUMP_VELOCITY,
  moveWithPlatformCollisions,
  updateJumpAssist,
} from '../src/physics.ts'

const DT = 1 / 60

const body = (x, floorY, width) => ({
  x,
  y: floorY - 64,
  w: width,
  h: 64,
  vx: 0,
  vy: 0,
  grounded: true,
  jumpHeld: false,
  jumpBufferRemaining: 0,
  coyoteRemaining: 0,
})

function landOnLedge({ startX, lowerY, ledgeX, ledgeY, ledgeWidth, side, speed, width }) {
  const actor = body(startX, lowerY, width)
  const colliders = [
    { x: 0, y: lowerY, w: 900, h: 28 },
    { x: ledgeX, y: ledgeY, w: ledgeWidth, h: 24 },
  ]
  const goal = ledgeX + ledgeWidth / 2 - width / 2
  let peak = actor.y
  let landed = false
  let previousX = actor.x

  for (let frame = 0; frame < 90; frame++) {
    actor.vx =
      (side === 'left' && actor.x < goal) || (side === 'right' && actor.x > goal)
        ? (side === 'left' ? 1 : -1) * speed
        : 0
    updateJumpAssist(actor, frame === 0, DT)
    actor.vy += GRAVITY * DT
    moveWithPlatformCollisions(actor, colliders, DT)
    peak = Math.min(peak, actor.y)
    if (side === 'left') assert.ok(actor.x >= previousX - 0.01, 'ledge collision jerked character backward')
    else assert.ok(actor.x <= previousX + 0.01, 'ledge collision jerked character forward')
    previousX = actor.x
    if (actor.grounded && Math.abs(actor.y + actor.h - ledgeY) < 0.5) {
      landed = true
      if (frame > 15) break
    }
  }
  return { actor, peak, landed }
}

for (const [role, width, speed] of [['Robot', 46, 205], ['Ninja', 38, 235]]) {
  for (const side of ['left', 'right']) {
    test(role + ' can jump onto the smaller 90px ledge from the ' + side, () => {
      const ledgeX = 140
      const ledgeWidth = 110
      const startX = side === 'left' ? ledgeX - width - 28 : ledgeX + ledgeWidth + 28
      const { actor, landed, peak } = landOnLedge({
        startX, lowerY: 478, ledgeX, ledgeY: 388, ledgeWidth,
        side, speed, width,
      })
      assert.ok(landed, role + ' did not land on the ledge: ' + JSON.stringify(actor))
      assert.ok(peak < 388 - 64 - 20, 'jump should clear the ledge with extra room')
    })
  }
  test(role + ' can jump from the small platform to the upper one', () => {
    const { actor, landed } = landOnLedge({
      startX: 230 - width, lowerY: 388, ledgeX: 280,
      ledgeY: 300, ledgeWidth: 400, side: 'left', speed, width,
    })
    assert.ok(landed, role + ' failed to land: ' + JSON.stringify(actor))
  })

  test(role + ' clears actual Mission 1 small-to-upper-platform gap', () => {
    const actor = body(185, 388, width)
    const colliders = [
      { x: 24, y: 478, w: 550, h: 28 },
      { x: 140, y: 388, w: 110, h: 24 },
      { x: 280, y: 300, w: 976, h: 28 },
    ]
    let landed = false
    for (let i = 0; i < 65; i++) {
      actor.vx = actor.x < 325 ? speed : 0
      updateJumpAssist(actor, i === 0, DT)
      actor.vy += GRAVITY * DT
      moveWithPlatformCollisions(actor, colliders, DT)
      if (actor.grounded && Math.abs(actor.y + actor.h - 300) < 0.5) {
        landed = true
        break
      }
    }
    assert.ok(landed, role + ' failed to clear the actual gap')
  })
}

test('jump shortly after walking off a ledge works (coyote time)', () => {
  const actor = body(100, 478, 46)
  actor.grounded = false
  actor.coyoteRemaining = 0.11
  updateJumpAssist(actor, true, DT)
  assert.equal(actor.vy, -JUMP_VELOCITY)
})

test('jump pressed just before landing is buffered', () => {
  const actor = body(100, 478, 46)
  actor.grounded = false
  updateJumpAssist(actor, true, DT)
  for (let i = 0; i < 3; i++) updateJumpAssist(actor, false, DT)
  actor.grounded = true
  updateJumpAssist(actor, false, DT)
  assert.equal(actor.vy, -JUMP_VELOCITY)
})

test('holding jump does not trigger repeated jumps', () => {
  const actor = body(100, 478, 46)
  updateJumpAssist(actor, true, DT)
  assert.equal(actor.vy, -JUMP_VELOCITY)
  actor.vy = 0
  actor.grounded = true
  updateJumpAssist(actor, true, DT)
  assert.equal(actor.vy, 0)
})

test('jumping from directly underneath a platform hits the underside', () => {
  const actor = body(155, 478, 38)
  const platform = { x: 140, y: 388, w: 110, h: 24 }
  let hitHead = false
  for (let frame = 0; frame < 36; frame++) {
    updateJumpAssist(actor, frame === 0, DT)
    actor.vy += GRAVITY * DT
    const oldY = actor.y
    moveWithPlatformCollisions(actor, [platform], DT)
    if (oldY >= platform.y + platform.h && actor.y === platform.y + platform.h) {
      hitHead = true
      break
    }
  }
  assert.ok(hitHead)
})

test('a moving lift continues carrying a character upward', () => {
  const actor = body(300, 478, 46)
  const lift = { x: 280, y: 473, w: 100, h: 28 }
  actor.vy += GRAVITY * DT
  moveWithPlatformCollisions(actor, [lift], DT)
  assert.ok(actor.grounded)
  assert.equal(actor.y + actor.h, lift.y)
})

/**
 * Small, frame-rate-independent platforming helpers shared by Ninja and Bolt.
 * The game still owns level geometry, hazards and character controls.
 */
export type Collider = { x: number; y: number; w: number; h: number }

export type MovingBody = Collider & {
  vx: number
  vy: number
  grounded: boolean
}

export type JumpingBody = MovingBody & {
  jumpHeld: boolean
  jumpBufferRemaining: number
  coyoteRemaining: number
}

export const GRAVITY = 1150
export const JUMP_VELOCITY = 550
export const COYOTE_SECONDS = 0.11
export const JUMP_BUFFER_SECONDS = 0.13
const PLATFORM_TOP_TOLERANCE = 2
const CORNER_CLEARANCE = 14
const CROSSING_TOLERANCE = 1

const overlaps = (a: Collider, b: Collider) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/**
 * Jump on a fresh key press, including a short grace period after running off
 * a ledge and a short buffer before landing. Holding jump does not repeatedly
 * bounce the player after landing.
 */
export function updateJumpAssist(body: JumpingBody, jumpPressed: boolean, dt: number) {
  if (jumpPressed && !body.jumpHeld) body.jumpBufferRemaining = JUMP_BUFFER_SECONDS
  body.jumpHeld = jumpPressed
  body.jumpBufferRemaining = Math.max(0, body.jumpBufferRemaining - dt)
  body.coyoteRemaining = body.grounded
    ? COYOTE_SECONDS
    : Math.max(0, body.coyoteRemaining - dt)

  if (body.jumpBufferRemaining > 0 && body.coyoteRemaining > 0) {
    body.vy = -JUMP_VELOCITY
    body.grounded = false
    body.coyoteRemaining = 0
    body.jumpBufferRemaining = 0
  }
}

/**
 * Resolve movement using the PREVIOUS vertical position to distinguish a
 * platform top from its side or underside. At the last few pixels of an
 * ascending jump, let a player glide over the platform lip rather than
 * snapping back to the wall and falling away. Works from either direction.
 */
export function moveWithPlatformCollisions(body: MovingBody, colliders: Collider[], dt: number) {
  const oldFeet = body.y + body.h
  body.x += body.vx * dt

  for (const solid of colliders) {
    if (!overlaps(body, solid)) continue

    // Standing on a platform is not a side collision.
    if (oldFeet <= solid.y + PLATFORM_TOP_TOLERANCE) continue

    // Near the top while rising, a corner should not block forward motion.
    // The vertical pass below will land us cleanly once we cross the top.
    const clearingLedge =
      body.vy < 0 &&
      body.y < solid.y &&
      oldFeet <= solid.y + CORNER_CLEARANCE
    if (clearingLedge) continue

    if (body.vx > 0) body.x = solid.x - body.w
    else if (body.vx < 0) body.x = solid.x + solid.w
  }

  const previousHead = body.y
  body.y += body.vy * dt
  body.grounded = false

  for (const solid of colliders) {
    if (!overlaps(body, solid)) continue

    // Downward overlap lands on the top. This also allows elevators to carry
    // players upward as their top moves between frames. Horizontal movement
    // has already resolved genuine side collisions.
    if (body.vy > 0) {
      body.y = solid.y - body.h
      body.vy = 0
      body.grounded = true
    } else if (
      body.vy < 0 &&
      previousHead >= solid.y + solid.h - CROSSING_TOLERANCE
    ) {
      // Likewise, only bonk our head after actually crossing the UNDERSIDE.
      body.y = solid.y + solid.h
      body.vy = 0
    }
  }
}

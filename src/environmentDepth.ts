/**
 * Atmospheric layers for the factory level. Purely decorative:
 * none of these shapes participates in collision or game state.
 */
const WORLD_WIDTH = 1280
const WORLD_HEIGHT = 720

/** Distant industrial silhouettes behind the more detailed factory windows. */
export function drawDistantFactory(ctx: CanvasRenderingContext2D, now: number) {
  ctx.save()
  // A 2px drift is enough to separate background from the stationary world.
  // It does not alter the camera, HUD, platform alignment, or collisions.
  ctx.translate(Math.sin(now / 23000) * 2, 0)

  const bays = [
    { x: 13, y: 74, w: 230, h: 435 },
    { x: 288, y: 43, w: 190, h: 475 },
    { x: 704, y: 84, w: 194, h: 380 },
    { x: 1078, y: 66, w: 166, h: 435 },
  ]

  ctx.fillStyle = "rgba(101, 136, 146, .10)"
  ctx.strokeStyle = "rgba(128, 153, 164, .10)"
  ctx.lineWidth = 6
  for (const bay of bays) {
    ctx.fillRect(bay.x, bay.y, 12, bay.h)
    ctx.fillRect(bay.x + bay.w - 12, bay.y, 12, bay.h)
    ctx.fillRect(bay.x, bay.y, bay.w, 11)
    ctx.fillRect(bay.x + 12, bay.y + bay.h * 0.56, bay.w - 24, 9)

    ctx.beginPath()
    ctx.moveTo(bay.x + 12, bay.y + 11)
    ctx.lineTo(bay.x + bay.w - 12, bay.y + bay.h * 0.56)
    ctx.moveTo(bay.x + bay.w - 12, bay.y + 11)
    ctx.lineTo(bay.x + 12, bay.y + bay.h * 0.56)
    ctx.stroke()
  }

  // Distant conveyor rails read as silhouettes rather than sharp UI lines.
  ctx.strokeStyle = "rgba(100, 133, 143, .13)"
  ctx.lineWidth = 11
  ctx.beginPath()
  ctx.moveTo(0, 260)
  ctx.lineTo(1278, 260)
  ctx.moveTo(0, 504)
  ctx.lineTo(1280, 504)
  ctx.stroke()

  for (const [x, y, r] of [[336, 564, 48], [1164, 558, 60]] as const) {
    ctx.strokeStyle = "rgba(118, 146, 153, .14)"
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Composited after all background decorations but BEFORE hazards, platforms,
 * switches, collectibles, doors and player sprites. This cool veil moves the
 * windows, mural, gears and hanging props behind the gameplay plane without
 * compromising interactive contrast.
 */
export function drawAtmosphericHaze(ctx: CanvasRenderingContext2D) {
  ctx.save()
  const mist = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT)
  mist.addColorStop(0, "rgba(30, 48, 61, .34)")
  mist.addColorStop(0.48, "rgba(33, 50, 63, .44)")
  mist.addColorStop(0.78, "rgba(33, 45, 55, .36)")
  mist.addColorStop(1, "rgba(30, 40, 48, .25)")
  ctx.fillStyle = mist
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

  // The distant upper windows remain readable as a soft pool of cool light.
  const light = ctx.createRadialGradient(650, 105, 5, 650, 105, 590)
  light.addColorStop(0, "rgba(126, 162, 176, .075)")
  light.addColorStop(1, "rgba(126, 162, 176, 0)")
  ctx.fillStyle = light
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  ctx.restore()
}

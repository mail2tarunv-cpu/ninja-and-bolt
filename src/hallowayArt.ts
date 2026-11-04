/**
 * Halloway Toy Works — approved V1 background and platform kit.
 * Actual authored SVG artwork lives in /public/halloway; the existing collision
 * rectangles, world resolution, and game mechanics remain untouched.
 *
 * Decoupled loading: the procedural original is kept as fallback until assets
 * are ready, including on slow networks.
 */
const BASE = '/halloway/'
const paths = {
  painted: 'background/factory-refined.png',
  far: 'background/far_factory.svg',
  mid: 'background/mid_factory.svg',
  atmosphere: 'background/atmosphere.svg',
  center: 'platforms/solid_center.svg',
  left: 'platforms/solid_left_cap.svg',
  right: 'platforms/solid_right_cap.svg',
  short: 'platforms/solid_short.svg',
  suspended: 'platforms/suspended.svg',
  lift: 'platforms/moving_lift.svg',
  climb: 'platforms/climb_wall.svg',
  hazard: 'platforms/hazard_edge.svg',
  slope: 'platforms/slope_piece.svg',
} as const
type ArtKey = keyof typeof paths
type Box = { x: number; y: number; w: number; h: number }
const loaded: Partial<Record<ArtKey, HTMLImageElement>> = {}
let startedLoading = false

export function loadHallowayKit() {
  if (startedLoading || typeof Image === 'undefined') return
  startedLoading = true
  for (const [key, path] of Object.entries(paths) as [ArtKey, string][]) {
    const image = new Image()
    image.decoding = 'async'
    image.src = BASE + path
    loaded[key] = image
  }
}
function ready(key: ArtKey): HTMLImageElement | undefined {
  const image = loaded[key]
  return image?.complete && image.naturalWidth > 0 ? image : undefined
}

/** Returns true once the new 3-layer environment has been painted. */
export function drawHallowayBackground(ctx: CanvasRenderingContext2D) {
  const painted = ready('painted')
  if (painted) {
    ctx.drawImage(painted, 0, 0, 1280, 720)
    return true
  }
  const far = ready('far')
  if (!far) return false
  ctx.save()
  ctx.drawImage(far, 0, 0, 1280, 720)
  const mid = ready('mid')
  if (mid) {
    ctx.globalAlpha = .86
    ctx.drawImage(mid, 0, 0, 1280, 720)
  }
  // Slight cool haze behind the gameplay plane: playable edges remain crisp.
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(22, 36, 57, .12)'
  ctx.fillRect(0, 0, 1280, 720)
  const air = ready('atmosphere')
  if (air) {
    ctx.globalAlpha = .92
    ctx.drawImage(air, 0, 0, 1280, 720)
  }
  ctx.restore()
  return true
}

/**
 * Draw tiles along the EXACT collision rectangle. Tiling is horizontal and
 * includes two end caps, so large platforms do not become stretched rivets.
 * Return false to retain the existing Canvas renderer on load errors.
 */
export function drawHallowayPlatform(ctx: CanvasRenderingContext2D, rect: Box) {
  const tile = ready(rect.w < 155 ? 'short' : 'center') ?? ready('center')
  const left = ready('left')
  const right = ready('right')
  if (!tile || !left || !right) return false
  ctx.save()
  ctx.shadowColor = 'rgba(0, 3, 10, .6)'
  ctx.shadowBlur = Math.min(15, rect.h * .4)
  ctx.shadowOffsetY = 5
  const height = rect.h
  // source art has a 7px transparent top margin and a 4px drop shadow.
  // Cropping 7..48 keeps the top landing surface precisely at rect.y.
  const cap = Math.min(30, Math.max(10, rect.w * .13))
  const centerWidth = Math.max(0, rect.w - cap * 2)
  const centerX = rect.x + cap
  ctx.drawImage(left, 1, 7, left.naturalWidth - 2, 41, rect.x, rect.y, cap, height)
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  const tileLength = Math.max(75, Math.min(155, 192 * height / 43 * 1.1))
  let consumed = 0
  while (consumed < centerWidth - .01) {
    const drawWidth = Math.min(tileLength, centerWidth - consumed)
    // Crop the source proportionally at the final partial tile.
    ctx.drawImage(tile, 1, 7, (tile.naturalWidth - 2) * drawWidth / tileLength, 41, centerX + consumed, rect.y, drawWidth + .2, height)
    consumed += drawWidth
  }
  ctx.drawImage(right, 1, 7, right.naturalWidth - 2, 41, rect.x + rect.w - cap, rect.y, cap, height)
  ctx.restore()
  return true
}

/** Existing cables and lift collision coordinates are drawn elsewhere. */
export function drawHallowayMovingLift(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const tile = ready('lift')
  if (!tile) return false
  ctx.save()
  ctx.shadowColor = 'rgba(68, 228, 235, .24)'
  ctx.shadowBlur = 12
  ctx.drawImage(tile, 2, 7, 188, 47, x, y, w, h)
  ctx.restore()
  return true
}

export function drawHallowayClimbWall(ctx: CanvasRenderingContext2D, rect: Box) {
  const tile = ready('climb')
  if (!tile) return false
  ctx.save()
  const y0 = rect.y, end = rect.y + rect.h
  let y = y0
  while (y < end) {
    const section = Math.min(265, end - y)
    ctx.drawImage(tile, 0, 0, 58, section, rect.x, y, rect.w, section)
    y += section
  }
  ctx.restore()
  return true
}

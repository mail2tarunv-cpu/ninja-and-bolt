/**
 * Storybook ruin art layer. All drawing is intentionally cosmetic: level
 * colliders, jump tuning, hazards and interactions are defined by the game.
 */

export type ArtImage = 'sky' | 'ruins' | 'foliage' | 'tiles' | 'objects'
export type GameArt = Partial<Record<ArtImage, HTMLImageElement>>
export type ArtRect = { x: number; y: number; w: number; h: number }

const ASSETS: Record<ArtImage, string> = {
  sky: '/art/sky.webp',
  ruins: '/art/ruins.webp',
  foliage: '/art/foliage.webp',
  tiles: '/art/stone-tiles.webp',
  objects: '/art/mechanisms.webp',
}

export function loadGameArt(target: GameArt) {
  ;(Object.keys(ASSETS) as ArtImage[]).forEach((name) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = ASSETS[name]
    target[name] = img
  })
}

function ready(image?: HTMLImageElement): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0)
}

function piece(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  source: [number, number, number, number],
  destination: ArtRect,
) {
  if (!ready(image)) return false
  const [sx, sy, sw, sh] = source
  ctx.drawImage(image, sx, sy, sw, sh, destination.x, destination.y, destination.w, destination.h)
  return true
}

export function drawStorybookBackground(ctx: CanvasRenderingContext2D, art: GameArt, now: number) {
  if (!ready(art.sky)) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 720)
    gradient.addColorStop(0, '#8e91cd')
    gradient.addColorStop(0.6, '#b4a5df')
    gradient.addColorStop(1, '#524871')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1280, 720)
  } else {
    ctx.drawImage(art.sky, 0, 0, 1280, 720)
  }

  if (ready(art.ruins)) {
    ctx.save()
    // A fixed-screen composition: a few pixels of subtle atmospheric drift,
    // not a scrolling background that would misalign with static game geometry.
    const offset = Math.sin(now * 0.00008) * 5
    ctx.globalAlpha = 0.29
    ctx.drawImage(art.ruins, -8 + offset, -6, 1296, 734)
    ctx.restore()
  }
  ctx.fillStyle = 'rgba(35, 22, 65, .14)'
  ctx.fillRect(0, 0, 1280, 720)
}

function flatStone(ctx: CanvasRenderingContext2D, rect: ArtRect) {
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h)
  grad.addColorStop(0, '#8b7996')
  grad.addColorStop(.18, '#594d6b')
  grad.addColorStop(1, '#27263d')
  ctx.fillStyle = grad
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
}

/**
 * Paint image texture inside exactly the physics rectangle, then give the
 * surface a narrow grass ledge that overlaps the top edge cosmetically.
 * This avoids turning the painting's irregular bounding box into collision.
 */
export function drawStonePlatform(ctx: CanvasRenderingContext2D, rect: ArtRect, art: GameArt) {
  const tiles = art.tiles
  flatStone(ctx, rect)
  if (!ready(tiles)) {
    ctx.fillStyle = '#c6a96b'
    ctx.fillRect(rect.x, rect.y, rect.w, Math.min(4, rect.h))
    return
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()

  // Repeated masonry inside the solid area, with no spill into hazards.
  const size = 64
  for (let y = rect.y; y < rect.y + rect.h; y += size) {
    for (let x = rect.x; x < rect.x + rect.w; x += size) {
      piece(ctx, tiles, [201, 302, 114, 79], { x, y, w: size, h: size })
    }
  }
  ctx.fillStyle = 'rgba(21, 17, 41, 0.12)'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.restore()

  // No thick grassy top on vertical wall colliders or level borders.
  if (rect.w < 42 || rect.h > 300) return

  ctx.save()
  // Stretch a single curated moss-covered cap across the platform instead
  // of tiling individual flowers every ~70px. No repeated hard seams.
  const topSource: [number, number, number, number] =
    rect.w < 180 ? [173, 16, 166, 120] : [730, 27, 477, 104]
  const sections = rect.w > 400 ? Math.ceil(rect.w / 345) : 1
  for (let i = 0; i < sections; i++) {
    const segmentW = rect.w / sections
    piece(ctx, tiles, topSource, {
      x: rect.x + segmentW * i, y: rect.y - 15,
      w: segmentW + (i < sections - 1 ? 1 : 0), h: 37,
    })
  }
  // Highlights clarify what can be stood on, even when the painting is busy.
  ctx.fillStyle = 'rgba(255, 222, 129, .36)'
  ctx.fillRect(rect.x + 2, rect.y - 2, Math.max(0, rect.w - 4), 2)
  ctx.restore()
}

export function drawStorybookHazard(
  ctx: CanvasRenderingContext2D, rect: ArtRect, art: GameArt,
  kind: 'factory' | 'quicksand', now: number,
) {
  const objects = art.objects
  const gradient = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h)
  gradient.addColorStop(0, '#4a3157')
  gradient.addColorStop(1, '#201933')
  ctx.fillStyle = gradient
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  if (ready(objects)) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(rect.x, rect.y - 5, rect.w, rect.h + 5)
    ctx.clip()
    // The spikes visualize danger; they do not change the existing detection.
    for (let x = rect.x; x < rect.x + rect.w; x += 78) {
      const w = Math.min(78, rect.x + rect.w - x)
      piece(ctx, objects, [947, 506, 456, 121], {
        x, y: rect.y - (kind === 'factory' ? 22 : 15), w, h: 36,
      })
    }
    ctx.restore()
  }
  ctx.save()
  ctx.globalAlpha = .18 + .09 * Math.sin(now * .002)
  ctx.fillStyle = '#ffb668'
  ctx.fillRect(rect.x, rect.y + 8, rect.w, 4)
  ctx.restore()
}

export function drawStorybookLift(
  ctx: CanvasRenderingContext2D,
  art: GameArt, x: number, y: number, w: number, active: boolean,
) {
  if (!piece(ctx, art.objects, [1868, 148, 275, 130], {
    x: x - 3, y: y - 8, w: w + 6, h: 37,
  })) {
    ctx.fillStyle = '#d8ac67'
    ctx.fillRect(x, y, w, 28)
  }
  ctx.save()
  ctx.shadowColor = '#ffcf72'
  ctx.shadowBlur = active ? 18 : 7
  ctx.fillStyle = active ? '#fff0af' : '#ffd17b'
  ctx.fillRect(x + 7, y + 4, Math.max(0, w - 14), 3)
  ctx.restore()
}

export function drawStorybookLever(
  ctx: CanvasRenderingContext2D, art: GameArt, on: boolean,
) {
  if (!piece(ctx, art.objects, [1332, 158, 241, 191], {
    x: 946, y: 413, w: 62, h: 53,
  })) return false
  if (on) {
    ctx.save()
    ctx.fillStyle = 'rgba(255, 230, 128, .30)'
    ctx.beginPath()
    ctx.arc(983, 431, 17, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  return true
}

export function drawStorybookButton(
  ctx: CanvasRenderingContext2D, art: GameArt,
  x: number, y: number, pressed: boolean,
) {
  if (!piece(ctx, art.objects, [1621, 234, 231, 120], {
    x: x - 1, y: y - 6 + (pressed ? 4 : 0), w: 61, h: pressed ? 16 : 22,
  })) return false
  if (pressed) {
    ctx.save()
    ctx.globalAlpha = .38
    ctx.fillStyle = '#ffe68f'
    ctx.fillRect(x + 9, y + 2, 40, 4)
    ctx.restore()
  }
  return true
}

export function drawStorybookBlock(ctx: CanvasRenderingContext2D, art: GameArt, block: ArtRect) {
  if (!piece(ctx, art.tiles, [730, 32, 115, 82], {
    x: block.x, y: block.y - 7, w: block.w, h: block.h + 7,
  })) {
    ctx.fillStyle = '#77667a'
    ctx.fillRect(block.x, block.y, block.w, block.h)
  }
  ctx.save()
  ctx.strokeStyle = '#e0b475'
  ctx.lineWidth = 2
  ctx.strokeRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2)
  ctx.restore()
}

export function drawStorybookGem(ctx: CanvasRenderingContext2D, art: GameArt, gem: ArtRect, isNinja: boolean) {
  ctx.save()
  ctx.shadowColor = isNinja ? '#e5bbff' : '#ffd66e'
  ctx.shadowBlur = 12
  if (!piece(ctx, art.objects, [646, 517, 88, 115], {
    x: gem.x - 8, y: gem.y - 11, w: gem.w + 16, h: gem.h + 22,
  })) {
    ctx.fillStyle = '#ffdf8b'
    ctx.translate(gem.x + gem.w / 2, gem.y + gem.h / 2)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-9, -9, 18, 18)
  }
  ctx.restore()
}

export function drawStorybookExit(
  ctx: CanvasRenderingContext2D, art: GameArt,
  x: number, role: 'robot' | 'ninja', active: boolean,
) {
  ctx.save()
  ctx.shadowColor = active ? '#fff2aa' : '#e7b96a'
  ctx.shadowBlur = active ? 24 : 8
  const drawn = piece(ctx, art.objects, [164, 70, 282, 259], {
    x: x - 12, y: 34, w: 82, h: 99,
  })
  if (!drawn) {
    ctx.fillStyle = '#4f415b'
    ctx.fillRect(x, 54, 58, 76)
  }
  ctx.restore()
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = '800 10px Inter, sans-serif'
  ctx.shadowColor = '#2b1a40'
  ctx.shadowBlur = 4
  ctx.fillStyle = role === 'robot' ? '#fff3bd' : '#e4caff'
  ctx.fillText(role.toUpperCase(), x + 29, 43)
  ctx.restore()
}

export function drawStorybookDecor(ctx: CanvasRenderingContext2D, art: GameArt, now: number) {
  const objects = art.objects
  if (!ready(objects)) return
  ctx.save()
  // Small lighting and ruins ornament never intersect the player collision map.
  piece(ctx, objects, [613, 49, 151, 294], { x: 58, y: 372, w: 45, h: 88 })
  piece(ctx, objects, [613, 49, 151, 294], { x: 440, y: 383, w: 40, h: 76 })
  piece(ctx, objects, [613, 49, 151, 294], { x: 672, y: 213, w: 39, h: 76 })
  piece(ctx, objects, [613, 49, 151, 294], { x: 1095, y: 245, w: 41, h: 89 })
  // Mossy archwork / wooden supports behind the platforms, never collidable.
  piece(ctx, art.tiles, [177, 404, 203, 135], { x: 38, y: 478, w: 156, h: 128 })
  piece(ctx, art.tiles, [412, 406, 276, 140], { x: 785, y: 478, w: 229, h: 130 })
  piece(ctx, art.tiles, [18, 564, 139, 105], { x: 217, y: 479, w: 70, h: 77 })
  ctx.restore()

  // Sparse light motes; deterministic and inexpensive on Canvas.
  ctx.save()
  for (let i = 0; i < 19; i++) {
    const x = (i * 127 + 39) % 1215 + 30
    const y = (i * 83 + 57) % 570 + 26
    const alpha = .12 + .17 * (Math.sin(now * .0011 + i * 1.9) + 1) / 2
    ctx.fillStyle = `rgba(255, 244, 197, ${alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, i % 5 === 0 ? 2.1 : 1.1, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawStorybookForeground(ctx: CanvasRenderingContext2D, art: GameArt) {
  if (!ready(art.foliage)) return
  ctx.save()
  ctx.globalAlpha = .49
  ctx.drawImage(art.foliage, 0, 0, 1280, 720)
  ctx.restore()
}

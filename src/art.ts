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
  if (ready(art.sky)) ctx.drawImage(art.sky, 0, 0, 1280, 720)
  else {
    const bg = ctx.createLinearGradient(0, 0, 0, 720)
    bg.addColorStop(0, '#8580b8')
    bg.addColorStop(1, '#545072')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 1280, 720)
  }
  if (ready(art.ruins)) {
    ctx.save()
    ctx.globalAlpha = .14
    const offset = Math.sin(now * .000065) * 3
    ctx.drawImage(art.ruins, -4 + offset, -5, 1288, 733)
    ctx.restore()
  }
  const depth = ctx.createLinearGradient(0, 0, 0, 720)
  depth.addColorStop(0, 'rgba(32,27,59,.18)')
  depth.addColorStop(.36, 'rgba(39,32,66,.21)')
  depth.addColorStop(.72, 'rgba(32,30,58,.33)')
  depth.addColorStop(1, 'rgba(29,26,51,.48)')
  ctx.fillStyle = depth
  ctx.fillRect(0, 0, 1280, 720)
  for (const [start, end, left] of [[0,270,true],[1000,1280,false]] as const) {
    const shade = ctx.createLinearGradient(start, 0, end, 0)
    shade.addColorStop(0, left ? 'rgba(23,20,39,.22)' : 'rgba(23,20,39,0)')
    shade.addColorStop(1, left ? 'rgba(23,20,39,0)' : 'rgba(23,20,39,.20)')
    ctx.fillStyle = shade
    ctx.fillRect(start, 0, end-start, 720)
  }
}

function seeded(x: number, y: number) {
  const v = Math.sin(x * 13.137 + y * 91.713) * 43758.5453
  return v - Math.floor(v)
}

export function drawStonePlatform(ctx: CanvasRenderingContext2D, rect: ArtRect, art: GameArt) {
  const verticalBoundary = rect.w < 42 && rect.h > 200
  const topY = rect.y
  ctx.save()
  ctx.beginPath()
  if (rect.h <= 32 && rect.w > 70) {
    ctx.moveTo(rect.x, rect.y)
    ctx.lineTo(rect.x + rect.w, rect.y)
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h - 3)
    for (let x=rect.x+rect.w; x>=rect.x; x-=23) {
      ctx.lineTo(Math.max(rect.x,x-23), rect.y+rect.h-seeded(Math.floor(x),Math.floor(rect.y))*6)
    }
    ctx.closePath()
  } else ctx.rect(rect.x,rect.y,rect.w,rect.h)
  ctx.clip()
  const base=ctx.createLinearGradient(rect.x,rect.y,rect.x,rect.y+Math.max(30,rect.h))
  base.addColorStop(0, verticalBoundary ? '#51405b' : '#63506d')
  base.addColorStop(.20,'#40334e')
  base.addColorStop(1,'#211c31')
  ctx.fillStyle=base
  ctx.fillRect(rect.x,rect.y,rect.w,rect.h)
  const course=verticalBoundary ? 26 : 22
  const brickWidth=verticalBoundary ? 35 : 51
  for(let row=0,y=rect.y+3;y<rect.y+rect.h;row++,y+=course){
    const offset=(row%2)*brickWidth/2
    for(let x=rect.x-offset;x<rect.x+rect.w;x+=brickWidth){
      const variation=seeded(Math.floor(x),Math.floor(y))
      ctx.fillStyle=variation<.32 ? '#5a4963' : variation<.7 ? '#4b3c58' : '#3f354d'
      ctx.fillRect(x+1.5,y+1.5,brickWidth-4,course-4)
      ctx.fillStyle='rgba(224,187,184,.12)'
      ctx.fillRect(x+3,y+2,brickWidth-7,1.2)
      if(variation>.92){
        ctx.strokeStyle='rgba(33,25,46,.55)'
        ctx.lineWidth=1
        ctx.beginPath()
        ctx.moveTo(x+brickWidth*.58,y+3)
        ctx.lineTo(x+brickWidth*.5,y+course*.5)
        ctx.lineTo(x+brickWidth*.67,y+course-3)
        ctx.stroke()
      }
    }
  }
  const shade=ctx.createLinearGradient(0,rect.y,0,rect.y+rect.h)
  shade.addColorStop(0,'rgba(24,19,36,0)')
  shade.addColorStop(1,'rgba(13,11,23,.38)')
  ctx.fillStyle=shade
  ctx.fillRect(rect.x,rect.y,rect.w,rect.h)
  ctx.restore()
  if(verticalBoundary){
    ctx.save()
    const edge=rect.x<200 ? rect.x+rect.w-4 : rect.x+2
    ctx.strokeStyle='#ab8c85'
    ctx.globalAlpha=.55
    ctx.lineWidth=2
    ctx.beginPath();ctx.moveTo(edge,rect.y);ctx.lineTo(edge,rect.y+rect.h);ctx.stroke()
    ctx.restore()
    return
  }
  if(rect.h>200)return
  ctx.save()
  ctx.fillStyle='#241c32';ctx.fillRect(rect.x,topY,rect.w,5)
  ctx.fillStyle='#988768';ctx.fillRect(rect.x,topY-2.5,rect.w,3)
  ctx.fillStyle='#d3bd78';ctx.fillRect(rect.x+2,topY-4.5,Math.max(0,rect.w-4),2)
  ctx.fillStyle='#69744d';ctx.fillRect(rect.x+2,topY-6,Math.max(0,rect.w-4),2)
  const count=Math.floor(rect.w/35)
  for(let i=0;i<count;i++){
    const x=rect.x+12+i*35+seeded(i,topY)*17
    if(x>rect.x+rect.w-7)continue
    const r=seeded(x,topY)
    ctx.strokeStyle=r>.5 ? '#b3ab67' : '#7e8d52'
    ctx.lineWidth=1.5
    ctx.beginPath()
    ctx.moveTo(x,topY-4);ctx.lineTo(x-3,topY-6-4*r)
    ctx.moveTo(x,topY-4);ctx.lineTo(x+3,topY-6-3*(1-r))
    ctx.stroke()
    if(r>.89&&rect.w>140){
      ctx.fillStyle='#f7e7c6';ctx.beginPath();ctx.arc(x+4,topY-10,2,0,Math.PI*2);ctx.fill()
    }
  }
  if(rect.w>=100&&ready(art.tiles)){
    const patches=rect.w>=600 ? 4 : rect.w>=250 ? 2 : 1
    for(let i=0;i<patches;i++){
      const slot=(i+.75)/(patches+.5)
      const xpos=rect.x+slot*rect.w+(seeded(i*7,topY)-.5)*37
      const w=26+Math.floor(seeded(xpos,topY)*18)
      piece(ctx,art.tiles,[641,566,79,62],{
        x:Math.min(rect.x+rect.w-w,Math.max(rect.x+3,xpos-w/2)),
        y:topY-17,w,h:18
      })
    }
  }
  ctx.fillStyle='rgba(17,14,31,.62)'
  ctx.fillRect(rect.x,topY+Math.min(14,rect.h-4),rect.w,Math.min(4,rect.h-2))
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
  ctx.save()
  ctx.globalAlpha=.78
  piece(ctx,art.tiles,[422,409,275,140],{x:295,y:266,w:318,h:214})
  piece(ctx,art.tiles,[1045,409,252,142],{x:920,y:266,w:284,h:214})
  ctx.globalAlpha=.66
  piece(ctx,art.tiles,[1045,409,252,142],{x:775,y:97,w:275,h:209})
  ctx.globalAlpha=.81
  piece(ctx,art.tiles,[14,563,140,114],{x:157,y:398,w:81,h:80})
  piece(ctx,art.tiles,[186,409,193,137],{x:106,y:442,w:170,h:208})
  piece(ctx,art.tiles,[1045,409,252,142],{x:816,y:442,w:280,h:208})
  ctx.restore()
  const lanterns: Array<[number,number,number,number]> = [
    [92,559,40,91], [510,397,36,81], [982,221,36,79]
  ]
  for(const [x,y,w,h] of lanterns){
    ctx.save();ctx.globalAlpha=.9
    piece(ctx,art.objects,[613,49,151,294],{x,y,w,h})
    ctx.globalCompositeOperation='screen'
    const halo=ctx.createRadialGradient(x+w*.5,y+h*.19,2,x+w*.5,y+h*.19,48)
    halo.addColorStop(0,'rgba(255,216,150,.15)')
    halo.addColorStop(1,'rgba(255,216,150,0)')
    ctx.fillStyle=halo;ctx.beginPath()
    ctx.arc(x+w*.5,y+h*.19,48,0,Math.PI*2);ctx.fill()
    ctx.restore()
  }
  for(let i=0;i<11;i++){
    const x=(i*193+83)%1170+45
    const y=(i*113+97)%460+60
    const alpha=.09+.12*(1+Math.sin(now*.001+i))/2
    ctx.fillStyle='rgba(255,241,198,'+alpha.toFixed(3)+')'
    ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.fill()
  }
}

export function drawStorybookForeground(ctx: CanvasRenderingContext2D, art: GameArt) {
  if(!ready(art.foliage))return
  ctx.save()
  ctx.globalAlpha=.26
  ctx.beginPath()
  ctx.moveTo(0,0);ctx.lineTo(420,0);ctx.quadraticCurveTo(285,90,205,235)
  ctx.lineTo(0,310);ctx.closePath();ctx.clip()
  ctx.drawImage(art.foliage,0,0,1280,720)
  ctx.restore()
  ctx.save()
  ctx.globalAlpha=.24
  ctx.beginPath()
  ctx.moveTo(1100,720);ctx.lineTo(1280,520);ctx.lineTo(1280,720);ctx.closePath();ctx.clip()
  ctx.drawImage(art.foliage,0,0,1280,720)
  ctx.restore()
}

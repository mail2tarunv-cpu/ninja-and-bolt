import { drawFactoryLighting, drawHazardDetails, drawSteelButton, drawRefinedSign } from "./visualPolish"
import { useCallback, useEffect, useRef, useState } from "react"
import { drawDistantFactory, drawAtmosphericHaze } from "./environmentDepth"
import { loadHallowayKit, drawHallowayBackground, drawHallowayPlatform, drawHallowayMovingLift, drawHallowayClimbWall } from "./hallowayArt"
import StoryModal from "./StoryModal"
import FailureModal from "./FailureModal"
import { GameSound } from "./sound"
import { GRAVITY, moveWithPlatformCollisions, updateJumpAssist } from "./physics"

const WORLD = { width: 1280, height: 720 }
const ROBOT_START = { x: 78, y: 586 }
const NINJA_START = { x: 152, y: 586 }
const GROUND_WATER = { x: 300, y: 650, w: 256, h: 70 }
const QUICKSAND = { x: 574, y: 478, w: 192, h: 28 }
const ROBOT_KEY_SIZE = 28
const NINJA_KEY = { x: 292, y: 258, w: 28, h: 28 }
const LIFT_HEIGHT = 28
const MAX_BLOCKS = 7
const BUILD_ZONES = [
  { x: 300, w: 256, y: 622, floorY: 650 },
  { x: QUICKSAND.x, w: QUICKSAND.w, y: 450, floorY: QUICKSAND.y },
]

type Role = "robot" | "ninja"
type FailureHazard = "quicksand" | "factory waste"
type CharacterAnimation = "idle" | "run" | "jump" | "climb" | "build"
type SpriteAtlases = Partial<Record<Role, HTMLImageElement>>
type Player = {
  role: Role
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  facing: 1 | -1
  grounded: boolean
  climbing: boolean
  touchingClimbWall: boolean
  jumpHeld: boolean
  jumpBufferRemaining: number
  coyoteRemaining: number
  animation: CharacterAnimation
  animationStartedAt: number
  buildAnimationStartedAt: number
  buildAnimationUntil: number
  color: string
}

type Block = { x: number; y: number; w: number; h: number }
type Rect = { x: number; y: number; w: number; h: number }
type Gem = Rect & { role: Role; collected: boolean }
const EXIT_DOORS: Record<Role, Rect> = {
  ninja: { x: 1090, y: 48, w: 66, h: 82 },
  robot: { x: 1162, y: 48, w: 66, h: 82 },
}
type MissionResult = {
  elapsedMs: number
  collectedGems: number
  gemPoints: number
  speedBonus: number
  totalScore: number
  previousBest: number
  newBest: boolean
}

type AnimationDefinition = {
  frames: number[]
  frameDuration: number
  loop: boolean
}

const SPRITE_CELL = { width: 180, height: 220, baseline: 208 }
const SPRITE_PATHS: Record<Role, string> = {
  robot: "/sprites/robot-atlas.png",
  ninja: "/sprites/ninja-atlas.png",
}
const CHARACTER_ANIMATIONS: Record<Role, Partial<Record<CharacterAnimation, AnimationDefinition>>> =
  {
    ninja: {
      idle: { frames: [0, 1, 2, 3], frameDuration: 250, loop: true },
      run: { frames: [4, 5, 6, 7, 8, 9], frameDuration: 100, loop: true },
      jump: { frames: [10, 11, 12], frameDuration: 166, loop: false },
      climb: { frames: [13, 14, 15, 16], frameDuration: 125, loop: true },
    },
    robot: {
      idle: { frames: [0, 1, 2, 3], frameDuration: 250, loop: true },
      run: { frames: [4, 5, 6, 7, 8, 9], frameDuration: 100, loop: true },
      jump: { frames: [10, 11, 12], frameDuration: 166, loop: false },
      build: { frames: [13, 14, 15, 16], frameDuration: 125, loop: false },
    },
  }

type Game = {
  robot: Player
  ninja: Player
  blocks: Block[]
  gems: Gem[]
  keys: Set<string>
  leverOn: boolean
  exitLiftButton: boolean
  topLiftButton: boolean
  robotHasKey: boolean
  ninjaHasKey: boolean
  liftY: number
  exitLiftY: number
  won: boolean
  started: boolean
  lastTime: number
  elapsedMs: number
  timerRunning: boolean
  timerStartedAt: number
  paused: boolean
  resultCalculated: boolean
  failedRole: Role | null
  failedHazard: FailureHazard | null
  failureHandled: boolean
  placeLock: boolean
  interactLock: boolean
  robotExit: boolean
  ninjaExit: boolean
}

const solids: Rect[] = [
  { x: 0, y: 650, w: 300, h: 70 },
  { x: 556, y: 650, w: 724, h: 70 },
  { x: 24, y: 478, w: 550, h: 28 },
  { x: 766, y: 478, w: 310, h: 28 },
  { x: 140, y: 388, w: 110, h: 24 },
  { x: 280, y: 300, w: 976, h: 28 },
  { x: 290, y: 130, w: 540, h: 28 },
  { x: 927, y: 130, w: 353, h: 28 },
  { x: 0, y: 0, w: 24, h: 720 },
  { x: 1256, y: 0, w: 24, h: 720 },
]

const climbWalls: Rect[] = [{ x: 1220, y: 468, w: 22, h: 182 }]

const resetGame = (): Game => ({
  robot: {
    role: "robot",
    ...ROBOT_START,
    w: 46,
    h: 64,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    climbing: false,
    touchingClimbWall: false,
    jumpHeld: false,
    jumpBufferRemaining: 0,
    coyoteRemaining: 0,
    animation: "idle",
    animationStartedAt: performance.now(),
    buildAnimationStartedAt: 0,
    buildAnimationUntil: 0,
    color: "#ffcf4a",
  },
  ninja: {
    role: "ninja",
    ...NINJA_START,
    w: 38,
    h: 64,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    climbing: false,
    touchingClimbWall: false,
    jumpHeld: false,
    jumpBufferRemaining: 0,
    coyoteRemaining: 0,
    animation: "idle",
    animationStartedAt: performance.now(),
    buildAnimationStartedAt: 0,
    buildAnimationUntil: 0,
    color: "#b794ff",
  },
  blocks: [],
  gems: [
    { x: 590, y: 590, w: 24, h: 24, role: "robot", collected: false },
    { x: 625, y: 416, w: 24, h: 24, role: "ninja", collected: false },
    { x: 720, y: 70, w: 24, h: 24, role: "ninja", collected: false },
    { x: 710, y: 416, w: 24, h: 24, role: "robot", collected: false },
    { x: 370, y: 238, w: 24, h: 24, role: "robot", collected: false },
    { x: 520, y: 238, w: 24, h: 24, role: "ninja", collected: false },
  ],
  keys: new Set(),
  leverOn: false,
  exitLiftButton: false,
  topLiftButton: false,
  robotHasKey: false,
  ninjaHasKey: false,
  liftY: 478,
  exitLiftY: 130,
  won: false,
  started: false,
  lastTime: performance.now(),
  elapsedMs: 0,
  timerRunning: false,
  timerStartedAt: 0,
  paused: false,
  resultCalculated: false,
  failedRole: null,
  failedHazard: null,
  failureHandled: false,
  placeLock: false,
  interactLock: false,
  robotExit: false,
  ninjaExit: false,
})

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

const getRobotKeyRect = (game: Game): Rect => ({
  x: 1076 + (97 - ROBOT_KEY_SIZE) / 2,
  y: game.liftY - ROBOT_KEY_SIZE,
  w: ROBOT_KEY_SIZE,
  h: ROBOT_KEY_SIZE,
})

const pointOnRect = (x: number, y: number, rect: Rect) =>
  x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h

const BEST_SCORE_KEY = "block-and-blade-best-score"

const formatTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const getElapsedMs = (game: Game, now: number) =>
  game.elapsedMs +
  (game.timerRunning && !game.paused
    ? Math.max(0, now - game.timerStartedAt)
    : 0)

const startMissionTimer = (game: Game, now: number) => {
  if (game.timerRunning || game.won) return
  game.timerRunning = true
  game.timerStartedAt = now
  game.started = true
}

const pauseMissionTimer = (game: Game, now: number) => {
  if (!game.timerRunning || game.paused) return
  game.elapsedMs = getElapsedMs(game, now)
  game.paused = true
}

const resumeMissionTimer = (game: Game, now: number) => {
  if (!game.timerRunning || !game.paused || game.won) return
  game.timerStartedAt = now
  game.paused = false
}

const stopMissionTimer = (game: Game, now: number) => {
  if (game.timerRunning) game.elapsedMs = getElapsedMs(game, now)
  game.timerRunning = false
  game.paused = false
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
}

function drawPlatform(ctx: CanvasRenderingContext2D, rect: Rect) {
  // Use the approved modular steel kit; procedural art is a loading fallback.
  if (drawHallowayPlatform(ctx, rect)) return
  // Platform visuals are cosmetic; collision dimensions stay unchanged.
  const horizontal = rect.h <= 28 && rect.w >= 90
  const surface = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h)
  surface.addColorStop(0, "#4f5c63")
  surface.addColorStop(0.13, "#37464d")
  surface.addColorStop(0.38, "#26343b")
  surface.addColorStop(1, "#111b21")

  ctx.save()

  // Railing silhouettes remain an ambient cue, not a second platform edge.
  // Keep one faint rail on selected long mid-level walkways only.
  if (horizontal && rect.w >= 220 && rect.y > 200 && rect.y < 600) {
    const railY = rect.y - 17
    ctx.strokeStyle = "rgba(113, 139, 149, .30)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(rect.x + 9, railY)
    ctx.lineTo(rect.x + rect.w - 9, railY)
    for (let x = rect.x + 16; x < rect.x + rect.w - 12; x += 128) {
      ctx.moveTo(x, railY)
      ctx.lineTo(x, rect.y - 2)
    }
    ctx.stroke()
  }

  // The undershadow brings the gameplay surface in front of the faded factory.
  if (horizontal) {
    ctx.shadowColor = "rgba(2, 6, 10, .75)"
    ctx.shadowBlur = 17
    ctx.shadowOffsetY = 9
  }
  ctx.fillStyle = surface
  ctx.strokeStyle = "#091115"
  ctx.lineWidth = 2
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 3)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  if (horizontal) {
    // Bright, continuous top lip indicates the exact landing surface.
    const lip = ctx.createLinearGradient(rect.x, 0, rect.x + rect.w, 0)
    lip.addColorStop(0, "#9daeb3")
    lip.addColorStop(0.5, "#d2c7b0")
    lip.addColorStop(1, "#9daeb3")
    ctx.fillStyle = lip
    ctx.fillRect(rect.x + 3, rect.y + 2, Math.max(0, rect.w - 6), 4)
    ctx.fillStyle = "rgba(247, 190, 122, .78)"
    ctx.fillRect(rect.x + 3, rect.y + 2, Math.max(0, rect.w - 6), 1.5)
    ctx.fillStyle = "rgba(7, 14, 18, .52)"
    ctx.fillRect(rect.x + 3, rect.y + rect.h - 6, Math.max(0, rect.w - 6), 4)

    // Sparse anchor points suggest construction without visual repetition.
    ctx.fillStyle = "rgba(170, 188, 190, .48)"
    for (let x = rect.x + 17; x < rect.x + rect.w - 10; x += 126) {
      ctx.beginPath()
      ctx.arc(x, rect.y + 13, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = "rgba(157, 179, 185, .20)"
    ctx.fillRect(rect.x + 2, rect.y + 2, Math.max(0, rect.w - 4), 3)
    ctx.fillStyle = "rgba(3, 8, 12, .35)"
    ctx.fillRect(rect.x + 2, rect.y + rect.h - 4, Math.max(0, rect.w - 4), 2)
  }

  ctx.restore()
}

function drawLift(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  cableTop: number,
) {
  ctx.save()

  const cableXs = [x + 5, x + 15, x + w - 15, x + w - 5]
  cableXs.forEach((cableX, index) => {
    ctx.strokeStyle = index === 0 || index === 3 ? "#263235" : "#3d4a4d"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cableX, cableTop)
    ctx.lineTo(cableX, y - 18)
    ctx.stroke()

    ctx.strokeStyle = "rgba(99, 119, 121, .7)"
    ctx.lineWidth = 1.5
    for (let linkY = cableTop + 5; linkY < y - 20; linkY += 10) {
      ctx.beginPath()
      ctx.ellipse(
        cableX,
        linkY,
        2.5,
        4,
        index % 2 === 0 ? 0.2 : -0.2,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
  })

  ctx.strokeStyle = "#354144"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x + 4, y)
  ctx.lineTo(x + 4, y - 20)
  ctx.lineTo(x + w - 4, y - 20)
  ctx.lineTo(x + w - 4, y)
  ctx.moveTo(x + 4, y - 10)
  ctx.lineTo(x + w - 4, y - 10)
  ctx.stroke()

  ctx.strokeStyle = "rgba(167, 82, 42, .48)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 7, y - 19)
  ctx.lineTo(x + 19, y - 11)
  ctx.moveTo(x + w - 31, y - 19)
  ctx.lineTo(x + w - 19, y - 11)
  ctx.stroke()

  // Keep the existing cables, but replace the deck with the approved cyan lift tile.
  if (drawHallowayMovingLift(ctx, x, y, w, LIFT_HEIGHT)) {
    ctx.restore()
    return
  }
  const plate = ctx.createLinearGradient(0, y, 0, y + LIFT_HEIGHT)
  plate.addColorStop(0, "#424c4f")
  plate.addColorStop(0.22, "#252d30")
  plate.addColorStop(1, "#111719")
  ctx.fillStyle = plate
  ctx.strokeStyle = "#080d0f"
  ctx.lineWidth = 2
  roundedRect(ctx, x, y, w, LIFT_HEIGHT, 3)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = "rgba(105, 121, 123, .5)"
  ctx.lineWidth = 1
  for (let deckX = x + 11; deckX < x + w - 7; deckX += 14) {
    ctx.beginPath()
    ctx.moveTo(deckX, y + 5)
    ctx.lineTo(deckX - 5, y + LIFT_HEIGHT - 7)
    ctx.stroke()
  }

  ctx.fillStyle = "#778385"
  ;[x + 8, x + w - 8].forEach((rivetX) => {
    ctx.beginPath()
    ctx.arc(rivetX, y + 7, 2, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.shadowColor = "#5ce1e6"
  ctx.shadowBlur = 16
  ctx.fillStyle = "#5ce1e6"
  roundedRect(ctx, x + 7, y + LIFT_HEIGHT - 6, w - 14, 4, 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = "rgba(219, 255, 255, .75)"
  ctx.fillRect(x + 12, y + LIFT_HEIGHT - 5, w - 24, 1)
  ctx.restore()
}

function getAnimationName(player: Player, now: number): CharacterAnimation {
  if (player.role === "robot" && now < player.buildAnimationUntil)
    return "build"
  if (player.role === "ninja" && player.touchingClimbWall) return "climb"
  if (!player.grounded) return "jump"
  if (Math.abs(player.vx) > 1) return "run"
  return "idle"
}

function getAnimationFrame(
  player: Player,
  definition: AnimationDefinition,
  now: number,
) {
  if (player.animation === "jump") {
    if (player.vy < -80) return definition.frames[0]
    if (player.vy <= 80) return definition.frames[1]
    return definition.frames[2]
  }

  const animationStartedAt =
    player.animation === "build"
      ? player.buildAnimationStartedAt
      : player.animationStartedAt
  const elapsed = Math.max(0, now - animationStartedAt)
  const rawIndex = Math.floor(elapsed / definition.frameDuration)
  const frameIndex = definition.loop
    ? rawIndex % definition.frames.length
    : Math.min(rawIndex, definition.frames.length - 1)
  return definition.frames[frameIndex]
}

function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  player: Player,
  atlases: SpriteAtlases,
  now: number,
) {
  const atlas = atlases[player.role]
  if (!atlas?.complete || atlas.naturalWidth === 0) return

  const animation = getAnimationName(player, now)
  if (animation !== player.animation) {
    player.animation = animation
    player.animationStartedAt =
      animation === "build" ? player.buildAnimationStartedAt : now
  }

  const definition = CHARACTER_ANIMATIONS[player.role][animation]
  if (!definition) return
  const frame = getAnimationFrame(player, definition, now)
  const drawWidth = player.role === "robot" ? 66 : 62
  const drawHeight = 78
  const baselineOffset =
    drawHeight * (SPRITE_CELL.baseline / SPRITE_CELL.height)

  ctx.save()
  if (player.grounded) {
    ctx.fillStyle = "rgba(0,4,12,.4)"
    ctx.beginPath(); ctx.ellipse(player.x+player.w/2, player.y+player.h, player.w*.48, 3, 0, 0, Math.PI*2); ctx.fill()
  }
  ctx.shadowColor = player.role === "robot" ? "rgba(255,214,139,.25)" : "rgba(190,153,255,.25)"
  ctx.shadowBlur = 3
  ctx.translate(player.x + player.w / 2, 0)
  if (player.facing < 0) ctx.scale(-1, 1)
  ctx.drawImage(
    atlas,
    frame * SPRITE_CELL.width,
    0,
    SPRITE_CELL.width,
    SPRITE_CELL.height,
    -drawWidth / 2,
    player.y + player.h - baselineOffset,
    drawWidth,
    drawHeight,
  )
  ctx.restore()
}

function drawGem(ctx: CanvasRenderingContext2D, gem: Gem) {
  const gold = gem.role === "robot"
  const x = gem.x + gem.w / 2, y = gem.y + gem.h / 2
  ctx.save()
  ctx.shadowColor = gold ? "#ffd467" : "#b48aff"
  ctx.shadowBlur = 7
  const facet = (points: number[][], color: string) => {
    ctx.fillStyle = color; ctx.beginPath()
    points.forEach(([dx,dy], i) => i ? ctx.lineTo(x+dx,y+dy) : ctx.moveTo(x+dx,y+dy))
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
  }
  facet([[0,-12],[12,0],[0,12],[-12,0]], gold ? "#f3b93e" : "#9561d4")
  facet([[0,-12],[0,1],[-12,0]], gold ? "#ffe896" : "#dcc5ff")
  facet([[0,-12],[12,0],[0,1]], gold ? "#fff5c9" : "#f1e5ff")
  facet([[0,1],[12,0],[0,12]], gold ? "#db9123" : "#854ec5")
  facet([[0,-9],[4,-4],[0,0],[-4,-4]], "#fff9e8")
  ctx.restore()
}

function drawKey(
  ctx: CanvasRenderingContext2D,
  key: Rect,
  color = "#ffd65e",
  highlight = "#fff1aa",
) {
  const x = key.x
  const y = key.y
  ctx.save()
  ctx.translate(x + 14, y + 14)
  ctx.rotate(-0.22)
  ctx.shadowColor = color
  ctx.shadowBlur = 6
  ctx.strokeStyle = color
  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.arc(-6, -2, 7, 0, Math.PI * 2)
  ctx.moveTo(0, 3)
  ctx.lineTo(12, 14)
  ctx.moveTo(7, 9)
  ctx.lineTo(12, 4)
  ctx.moveTo(11, 13)
  ctx.lineTo(16, 8)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.strokeStyle = highlight
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(-6, -2, 3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawExitDoor(
  ctx: CanvasRenderingContext2D,
  door: Rect,
  role: Role,
  locked: boolean,
  active: boolean,
  atlas?: HTMLImageElement,
) {
  const roleColor = role === "robot" ? "#ffcf4a" : "#b794ff"
  const frameColor = locked ? "#667487" : roleColor
  const centerX = door.x + door.w / 2
  const panel = ctx.createLinearGradient(
    door.x,
    door.y,
    door.x,
    door.y + door.h,
  )
  panel.addColorStop(0, active ? "#233b52" : "#14243a")
  panel.addColorStop(1, "#09111f")

  ctx.save()
  ctx.shadowColor = frameColor
  ctx.shadowBlur = active ? 20 : locked ? 3 : 9
  ctx.fillStyle = panel
  ctx.strokeStyle = frameColor
  ctx.lineWidth = 3
  roundedRect(ctx, door.x, door.y, door.w, door.h, 5)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.strokeStyle = locked ? "rgba(117, 134, 153, .35)" : `${roleColor}55`
  ctx.lineWidth = 1
  ctx.strokeRect(door.x + 7, door.y + 8, door.w - 14, door.h - 15)

  if (atlas) {
    const drawWidth = role === "robot" ? 40 : 37
    ctx.globalAlpha = locked ? 0.48 : 0.92
    ctx.drawImage(
      atlas,
      0,
      0,
      SPRITE_CELL.width,
      SPRITE_CELL.height,
      centerX - drawWidth / 2,
      door.y + 12,
      drawWidth,
      49,
    )
    ctx.globalAlpha = 1
  } else {
    ctx.strokeStyle = frameColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(centerX, door.y + 28, 8, 0, Math.PI * 2)
    ctx.moveTo(centerX, door.y + 36)
    ctx.lineTo(centerX, door.y + 54)
    ctx.stroke()
  }

  ctx.fillStyle = locked ? "#8b98a8" : roleColor
  ctx.font = "800 8px Inter, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(role === "robot" ? "BOLT" : "NINJA", centerX, door.y - 8)

  if (locked) {
    const lockX = door.x + door.w - 17
    const lockY = door.y + door.h - 24
    ctx.strokeStyle = "#b9c3ce"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(lockX, lockY, 7, Math.PI, 0)
    ctx.stroke()
    ctx.fillStyle = "#8b98a8"
    roundedRect(ctx, lockX - 9, lockY, 18, 15, 3)
    ctx.fill()
    ctx.fillStyle = "#263240"
    ctx.beginPath()
    ctx.arc(lockX, lockY + 6, 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = roleColor
    ctx.beginPath()
    ctx.arc(door.x + door.w - 11, door.y + door.h / 2, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawLever(ctx: CanvasRenderingContext2D, on: boolean) {
  const x = 954
  const y = 460
  const steel = ctx.createLinearGradient(x,y,x,y+18)
  steel.addColorStop(0,"#8b9aa4"); steel.addColorStop(.3,"#526675"); steel.addColorStop(1,"#263846")
  ctx.fillStyle = steel
  roundedRect(ctx, x, y, 38, 18, 4)
  ctx.fill()
  ctx.fillStyle = "#172431"
  ctx.beginPath(); ctx.arc(x+19,y+7,4,0,Math.PI*2); ctx.fill()
  ctx.fillStyle = on ? "#8ef3e8" : "#daa958"
  ctx.fillRect(x+5,y+8,3,2)
  ctx.strokeStyle = on ? "#5ce1e6" : "#ffca59"
  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(x + 19, y)
  ctx.lineTo(x + (on ? 31 : 7), y - 25)
  ctx.stroke()
  ctx.fillStyle = ctx.strokeStyle
  ctx.beginPath()
  ctx.arc(x + (on ? 31 : 7), y - 25, 6, 0, Math.PI * 2)
  ctx.fill()
}

function drawFloorButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pressed: boolean,
) {
  drawSteelButton(ctx, x, y, pressed)
}

function drawToyPit(
  ctx: CanvasRenderingContext2D,
  hazard: Rect,
  now: number,
  phase: number,
) {
  const pit = ctx.createLinearGradient(0, hazard.y, 0, hazard.y + hazard.h)
  pit.addColorStop(0, "#d9a93d")
  pit.addColorStop(0.34, "#9a6828")
  pit.addColorStop(1, "#4d301c")
  ctx.fillStyle = pit
  ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(hazard.x, hazard.y - 18, hazard.w, hazard.h + 18)
  ctx.clip()

  const sinkingOffset = (piecePhase: number, amount = 5) =>
    ((Math.sin(now / 1900 + phase + piecePhase) + 1) / 2) * amount
  const toyGold = "#dba943"
  const toyLight = "#f0cf72"
  const toyDark = "#785027"

  // Broken doll arm and hand.
  const armX = hazard.x + hazard.w * 0.17
  const armY = hazard.y - 7 + sinkingOffset(0.2, 7)
  ctx.save()
  ctx.translate(armX, armY)
  ctx.rotate(-0.32)
  ctx.strokeStyle = toyGold
  ctx.lineWidth = 9
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(-17, 6)
  ctx.lineTo(13, -1)
  ctx.stroke()
  ctx.fillStyle = toyLight
  ctx.beginPath()
  ctx.arc(17, -2, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = toyLight
  ctx.lineWidth = 2
  for (let finger = -1; finger <= 1; finger += 1) {
    ctx.beginPath()
    ctx.moveTo(19, -4 + finger * 3)
    ctx.lineTo(26, -6 + finger * 4)
    ctx.stroke()
  }
  ctx.restore()

  // Loose train wheel with worn spokes.
  const wheelX = hazard.x + hazard.w * 0.4
  const wheelY = hazard.y + 3 + sinkingOffset(1.3, 5)
  ctx.save()
  ctx.translate(wheelX, wheelY)
  ctx.rotate(now / 12000 + phase)
  ctx.strokeStyle = toyDark
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(0, 0, 13, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = toyLight
  ctx.lineWidth = 2
  for (let spoke = 0; spoke < 6; spoke += 1) {
    const angle = (spoke / 6) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * 10, Math.sin(angle) * 10)
    ctx.stroke()
  }
  ctx.fillStyle = toyDark
  ctx.beginPath()
  ctx.arc(0, 0, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Bent tin soldier.
  const soldierX = hazard.x + hazard.w * 0.66
  const soldierY = hazard.y - 17 + sinkingOffset(2.5, 8)
  ctx.save()
  ctx.translate(soldierX, soldierY)
  ctx.rotate(0.12)
  ctx.fillStyle = toyDark
  ctx.fillRect(-8, 8, 16, 18)
  ctx.fillStyle = toyGold
  ctx.fillRect(-10, 6, 20, 6)
  ctx.beginPath()
  ctx.arc(0, 2, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(-8, -8, 16, 8)
  ctx.fillStyle = toyLight
  ctx.fillRect(-6, -10, 12, 3)
  ctx.strokeStyle = toyGold
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-5, 24)
  ctx.lineTo(-9, 34)
  ctx.moveTo(5, 24)
  ctx.lineTo(10, 33)
  ctx.stroke()
  ctx.restore()

  // Scattered wooden blocks, half buried at different depths.
  const blocks = [
    { x: 0.29, y: 9, size: 17, angle: -0.16, delay: 3.2 },
    { x: 0.53, y: 13, size: 14, angle: 0.2, delay: 4.1 },
    { x: 0.79, y: 7, size: 18, angle: -0.08, delay: 5.2 },
    { x: 0.91, y: 15, size: 13, angle: 0.28, delay: 6.3 },
  ]
  blocks.forEach((block, index) => {
    const x = hazard.x + hazard.w * block.x
    const y =
      hazard.y + block.y + sinkingOffset(block.delay, index % 2 === 0 ? 5 : 3)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(block.angle)
    ctx.fillStyle = index % 2 === 0 ? toyGold : "#bc8432"
    ctx.strokeStyle = toyLight
    ctx.lineWidth = 1.5
    ctx.fillRect(-block.size / 2, -block.size / 2, block.size, block.size)
    ctx.strokeRect(-block.size / 2, -block.size / 2, block.size, block.size)
    ctx.fillStyle = "rgba(92, 54, 25, .65)"
    ctx.font = `800 ${Math.max(8, block.size - 6)}px Inter, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(index % 2 === 0 ? "B" : "A", 0, 1)
    ctx.restore()
  })

  ctx.restore()

  ctx.strokeStyle = "#efc760"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(hazard.x, hazard.y + 5)
  for (let x = hazard.x; x <= hazard.x + hazard.w; x += 20) {
    ctx.quadraticCurveTo(x + 5, hazard.y - 2, x + 10, hazard.y + 5)
  }
  ctx.stroke()
}

function drawFactoryWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const glass = ctx.createLinearGradient(x, y, x, y + height)
  glass.addColorStop(0, "rgba(242, 190, 112, .5)")
  glass.addColorStop(0.55, "rgba(166, 113, 66, .34)")
  glass.addColorStop(1, "rgba(74, 54, 42, .48)")

  ctx.save()
  ctx.fillStyle = "#080f19"
  ctx.fillRect(x - 10, y - 10, width + 20, height + 20)
  ctx.fillStyle = glass
  ctx.fillRect(x, y, width, height)

  const columnWidth = width / 3
  const rowHeight = height / 4
  ctx.strokeStyle = "rgba(93, 112, 126, .58)"
  ctx.lineWidth = 6
  for (let column = 1; column < 3; column += 1) {
    ctx.beginPath()
    ctx.moveTo(x + column * columnWidth, y)
    ctx.lineTo(x + column * columnWidth, y + height)
    ctx.stroke()
  }
  for (let row = 1; row < 4; row += 1) {
    ctx.beginPath()
    ctx.moveTo(x, y + row * rowHeight)
    ctx.lineTo(x + width, y + row * rowHeight)
    ctx.stroke()
  }

  ctx.fillStyle = "#070d16"
  ctx.beginPath()
  ctx.moveTo(x + columnWidth, y)
  ctx.lineTo(x + columnWidth * 1.72, y)
  ctx.lineTo(x + columnWidth * 1.42, y + rowHeight * 0.48)
  ctx.lineTo(x + columnWidth * 1.12, y + rowHeight * 0.28)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + width, y + rowHeight * 1.05)
  ctx.lineTo(x + width, y + rowHeight * 2)
  ctx.lineTo(x + width - columnWidth * 0.52, y + rowHeight * 1.62)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = "rgba(255, 221, 162, .4)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x + columnWidth * 1.72, y)
  ctx.lineTo(x + columnWidth * 1.48, y + rowHeight * 0.75)
  ctx.lineTo(x + columnWidth * 1.82, y + rowHeight * 1.12)
  ctx.moveTo(x + width - columnWidth * 0.52, y + rowHeight * 1.62)
  ctx.lineTo(x + width - columnWidth * 0.86, y + rowHeight * 1.24)
  ctx.lineTo(x + width - columnWidth * 0.72, y + rowHeight * 0.78)
  ctx.stroke()

  ctx.strokeStyle = "#25303a"
  ctx.lineWidth = 8
  ctx.strokeRect(x - 4, y - 4, width + 8, height + 8)
  ctx.strokeStyle = "rgba(117, 132, 140, .25)"
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)
  ctx.restore()
}

function drawIvyLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale = 1,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(scale, scale)
  ctx.fillStyle = "#4f6f3b"
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(3, -5, 9, -4, 10, 0)
  ctx.bezierCurveTo(7, 5, 2, 5, 0, 0)
  ctx.fill()
  ctx.strokeStyle = "rgba(143, 167, 91, .48)"
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(1, 0)
  ctx.lineTo(8, 0)
  ctx.stroke()
  ctx.restore()
}

function drawHangingIvyChain(
  ctx: CanvasRenderingContext2D,
  x: number,
  length: number,
  now: number,
  phase: number,
) {
  ctx.save()
  const sway = Math.sin(now / 3200 + phase) * 3
  ctx.strokeStyle = "#343c3c"
  ctx.lineWidth = 2
  for (let y = 20; y < length; y += 10) {
    const chainX = x + (y / length) * sway
    ctx.beginPath()
    ctx.ellipse(chainX, y, 3, 5, y % 20 === 0 ? 0.2 : -0.2, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.strokeStyle = "rgba(57, 88, 45, .9)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - 2, 20)
  for (let y = 30; y <= length; y += 12) {
    const chainX = x + (y / length) * sway
    ctx.lineTo(chainX + Math.sin(y / 19 + phase) * 4, y)
  }
  ctx.stroke()

  for (let y = 44; y < length; y += 26) {
    const side = Math.floor(y / 26) % 2 === 0 ? -1 : 1
    const chainX = x + (y / length) * sway
    drawIvyLeaf(
      ctx,
      chainX + side * 3,
      y,
      side > 0 ? 0.25 : Math.PI - 0.25,
      0.72 + ((y + phase * 10) % 12) / 30,
    )
  }
  ctx.restore()
}

function drawFallingIvyBits(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  now: number,
  phase: number,
) {
  ctx.save()
  for (let index = 0; index < 9; index += 1) {
    const progress = (now / 1550 + index * 0.137 + phase) % 1
    const startX = x + ((index * 37 + phase * 19) % width)
    const leafX =
      startX + Math.sin(progress * Math.PI * 4 + index) * (8 + (index % 3) * 3)
    const leafY = y - 42 + progress * 116
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8
    drawIvyLeaf(
      ctx,
      leafX,
      leafY,
      progress * Math.PI * 3 + index,
      0.45 + (index % 3) * 0.12,
    )
  }
  ctx.restore()
}

function drawPeelingMural(ctx: CanvasRenderingContext2D) {
  const x = 248
  const y = 184
  const width = 235
  const height = 92

  ctx.save()
  ctx.translate(0, 170)
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.fillStyle = "rgba(229, 205, 154, .18)"
  ctx.fillRect(x, y, width, height)

  const balloons = [
    { x: 279, y: 208, color: "rgba(231, 73, 66, .7)" },
    { x: 310, y: 220, color: "rgba(66, 156, 215, .68)" },
    { x: 340, y: 203, color: "rgba(247, 187, 55, .72)" },
  ]
  balloons.forEach((balloon, index) => {
    ctx.fillStyle = balloon.color
    ctx.beginPath()
    ctx.ellipse(
      balloon.x,
      balloon.y,
      11,
      15,
      index % 2 ? 0.12 : -0.12,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.strokeStyle = "rgba(224, 208, 172, .42)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(balloon.x, balloon.y + 15)
    ctx.quadraticCurveTo(balloon.x + (index - 1) * 5, balloon.y + 30, 311, 270)
    ctx.stroke()
  })

  ctx.fillStyle = "rgba(246, 191, 45, .64)"
  ctx.beginPath()
  ctx.arc(411, 229, 35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "rgba(58, 48, 38, .76)"
  ctx.beginPath()
  ctx.arc(399, 219, 3.5, 0, Math.PI * 2)
  ctx.arc(423, 219, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "rgba(76, 49, 33, .8)"
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(411, 228, 21, 0.18, Math.PI - 0.18)
  ctx.stroke()

  ctx.fillStyle = "#151c23"
  const peeledAreas = [
    [248, 184, 49, 25],
    [286, 237, 38, 42],
    [326, 184, 35, 23],
    [358, 249, 42, 29],
    [421, 183, 62, 27],
    [442, 239, 43, 38],
  ]
  peeledAreas.forEach(([chipX, chipY, chipW, chipH], index) => {
    ctx.beginPath()
    ctx.moveTo(chipX, chipY + 5)
    ctx.lineTo(chipX + chipW * 0.4, chipY)
    ctx.lineTo(chipX + chipW, chipY + (index % 2 ? 3 : 9))
    ctx.lineTo(chipX + chipW * 0.75, chipY + chipH)
    ctx.lineTo(chipX + 5, chipY + chipH * 0.82)
    ctx.closePath()
    ctx.fill()
  })

  ctx.strokeStyle = "rgba(231, 214, 173, .28)"
  ctx.lineWidth = 1
  for (let crackX = x + 18; crackX < x + width; crackX += 47) {
    ctx.beginPath()
    ctx.moveTo(crackX, y)
    ctx.lineTo(crackX + 5, y + 14)
    ctx.lineTo(crackX - 2, y + 23)
    ctx.stroke()
  }
  ctx.restore()
}

function drawHangingToys(ctx: CanvasRenderingContext2D, now: number) {
  ctx.save()

  // Faded kite on the first ivy chain.
  const kiteSway = Math.sin(now / 3200 + 0.4) * 4
  ctx.translate(274 + kiteSway, 258)
  ctx.rotate(Math.sin(now / 2400) * 0.06)
  ctx.fillStyle = "rgba(196, 67, 54, .78)"
  ctx.beginPath()
  ctx.moveTo(0, -18)
  ctx.lineTo(18, 0)
  ctx.lineTo(0, 21)
  ctx.lineTo(-18, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "rgba(64, 139, 183, .76)"
  ctx.beginPath()
  ctx.moveTo(0, -18)
  ctx.lineTo(18, 0)
  ctx.lineTo(0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = "rgba(230, 207, 159, .52)"
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, 21)
  ctx.quadraticCurveTo(-12, 35, 2, 48)
  ctx.quadraticCurveTo(14, 59, 2, 70)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  // Star mobile on the shorter center chain.
  const mobileSway = Math.sin(now / 3000 + 1.7) * 3
  ctx.translate(452 + mobileSway, 181)
  ctx.strokeStyle = "rgba(161, 151, 122, .72)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-28, 0)
  ctx.lineTo(28, 0)
  ctx.moveTo(-19, 0)
  ctx.lineTo(-19, 19)
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 29)
  ctx.moveTo(19, 0)
  ctx.lineTo(19, 17)
  ctx.stroke()
  ;[
    { x: -19, y: 24, color: "#d59645" },
    { x: 0, y: 34, color: "#c8b65e" },
    { x: 19, y: 22, color: "#789bb5" },
  ].forEach((star) => {
    ctx.fillStyle = star.color
    ctx.beginPath()
    for (let point = 0; point < 10; point += 1) {
      const angle = -Math.PI / 2 + (point * Math.PI) / 5
      const radius = point % 2 === 0 ? 8 : 3.5
      const starX = star.x + Math.cos(angle) * radius
      const starY = star.y + Math.sin(angle) * radius
      if (point === 0) ctx.moveTo(starX, starY)
      else ctx.lineTo(starX, starY)
    }
    ctx.closePath()
    ctx.fill()
  })
  ctx.restore()

  ctx.save()
  // Weathered jack-in-the-box hanging from the long center chain.
  const boxSway = Math.sin(now / 3400 + 2.8) * 3
  ctx.translate(742 + boxSway, 286)
  ctx.fillStyle = "#8b4d38"
  ctx.strokeStyle = "#3f3330"
  ctx.lineWidth = 2
  ctx.fillRect(-20, 0, 40, 31)
  ctx.strokeRect(-20, 0, 40, 31)
  ctx.fillStyle = "#b89143"
  ctx.fillRect(-17, 4, 14, 11)
  ctx.fillRect(3, 16, 14, 11)
  ctx.strokeStyle = "#6e7657"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-9, -8, 0, -15)
  ctx.quadraticCurveTo(9, -22, 0, -29)
  ctx.stroke()
  ctx.fillStyle = "#c29b63"
  ctx.beginPath()
  ctx.arc(0, -35, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#6f392f"
  ctx.beginPath()
  ctx.arc(-3, -37, 1.5, 0, Math.PI * 2)
  ctx.arc(3, -37, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBackgroundGear(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  teeth: number,
  rotation: number,
) {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(rotation)
  ctx.globalAlpha = 0.34

  const toothWidth = (Math.PI * 2 * radius) / teeth / 2.25
  ctx.fillStyle = "#292d2d"
  ctx.strokeStyle = "rgba(119, 66, 39, .7)"
  ctx.lineWidth = 1
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    ctx.save()
    ctx.rotate((tooth / teeth) * Math.PI * 2)
    ctx.fillRect(radius - 4, -toothWidth / 2, 18, toothWidth)
    ctx.strokeRect(radius - 4, -toothWidth / 2, 18, toothWidth)
    ctx.restore()
  }

  const iron = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius)
  iron.addColorStop(0, "#1a1f20")
  iron.addColorStop(0.62, "#303434")
  iron.addColorStop(1, "#181c1d")
  ctx.fillStyle = iron
  ctx.strokeStyle = "#49382f"
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = "#171b1c"
  ctx.lineWidth = radius * 0.16
  for (let spoke = 0; spoke < 8; spoke += 1) {
    const angle = (spoke / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * radius * 0.21, Math.sin(angle) * radius * 0.21)
    ctx.lineTo(Math.cos(angle) * radius * 0.78, Math.sin(angle) * radius * 0.78)
    ctx.stroke()
  }

  ctx.strokeStyle = "rgba(146, 76, 39, .46)"
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.76, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = "#0a0e0f"
  ctx.strokeStyle = "#44494a"
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "rgba(184, 91, 42, .34)"
  for (let rivet = 0; rivet < 12; rivet += 1) {
    const angle = (rivet / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(
      Math.cos(angle) * radius * 0.88,
      Math.sin(angle) * radius * 0.88,
      3,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.restore()
}

function drawFurnaceDepth(ctx: CanvasRenderingContext2D, now: number) {
  const heat = ctx.createLinearGradient(0, WORLD.height, 0, 255)
  heat.addColorStop(0, "rgba(255, 91, 15, .32)")
  heat.addColorStop(0.34, "rgba(219, 66, 12, .12)")
  heat.addColorStop(1, "rgba(149, 43, 9, 0)")
  ctx.fillStyle = heat
  ctx.fillRect(0, 255, WORLD.width, WORLD.height - 255)

  const pit = ctx.createLinearGradient(0, 575, 0, WORLD.height)
  pit.addColorStop(0, "rgba(44, 16, 10, 0)")
  pit.addColorStop(0.38, "rgba(116, 32, 8, .48)")
  pit.addColorStop(0.72, "rgba(238, 66, 7, .72)")
  pit.addColorStop(1, "rgba(255, 150, 24, .9)")
  ctx.fillStyle = pit
  ctx.fillRect(560, 555, 700, 165)

  ctx.save()
  ctx.beginPath()
  ctx.rect(560, 510, 700, 210)
  ctx.clip()
  for (let flame = 0; flame < 18; flame += 1) {
    const baseX = 578 + flame * 39
    const flicker = Math.sin(now / 260 + flame * 1.7)
    const flameHeight = 30 + (flame % 5) * 10 + flicker * 9
    const lean = Math.sin(now / 410 + flame) * 9
    const baseY = 709
    const flameColor =
      flame % 3 === 0
        ? "rgba(255, 190, 44, .72)"
        : flame % 3 === 1
          ? "rgba(255, 102, 12, .67)"
          : "rgba(207, 49, 7, .58)"
    ctx.fillStyle = flameColor
    ctx.beginPath()
    ctx.moveTo(baseX - 17, baseY)
    ctx.bezierCurveTo(
      baseX - 20,
      baseY - flameHeight * 0.35,
      baseX + lean - 5,
      baseY - flameHeight * 0.72,
      baseX + lean,
      baseY - flameHeight,
    )
    ctx.bezierCurveTo(
      baseX + 8,
      baseY - flameHeight * 0.55,
      baseX + 20,
      baseY - flameHeight * 0.25,
      baseX + 17,
      baseY,
    )
    ctx.closePath()
    ctx.fill()
  }

  for (let ember = 0; ember < 22; ember += 1) {
    const progress = (now / 2600 + ember * 0.083) % 1
    const emberX =
      575 + ((ember * 73) % 660) + Math.sin(progress * 8 + ember) * 12
    const emberY = 700 - progress * (130 + (ember % 4) * 24)
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8
    ctx.fillStyle = ember % 2 === 0 ? "#ff9d26" : "#e75316"
    ctx.beginPath()
    ctx.arc(emberX, emberY, ember % 3 === 0 ? 2 : 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawFactorySign(ctx: CanvasRenderingContext2D, now: number) {
  const x = 194
  const y = 49
  const width = 342
  const height = 58
  const text = "HALLOWAY TOY WORKS"
  const flickeringLetters = new Set([4, 11])

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.008)
  ctx.globalAlpha = 0.74

  ctx.fillStyle = "rgba(25, 29, 28, .72)"
  ctx.strokeStyle = "rgba(113, 81, 55, .42)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(7, 1)
  ctx.lineTo(width - 21, 0)
  ctx.lineTo(width, 13)
  ctx.lineTo(width - 4, height - 5)
  ctx.lineTo(24, height)
  ctx.lineTo(0, height - 13)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = "rgba(170, 113, 62, .14)"
  ctx.lineWidth = 1
  ctx.strokeRect(10, 9, width - 22, height - 19)
  ctx.fillStyle = "rgba(115, 61, 35, .16)"
  ctx.fillRect(18, 4, 46, 3)
  ctx.fillRect(238, height - 8, 66, 3)

  ctx.font = "800 28px 'Barlow Condensed', sans-serif"
  ctx.textBaseline = "middle"
  const letterGap = 1.2
  const textWidth =
    Array.from(text).reduce(
      (total, letter) => total + ctx.measureText(letter).width + letterGap,
      0,
    ) - letterGap
  let cursor = (width - textWidth) / 2

  Array.from(text).forEach((letter, index) => {
    const letterWidth = ctx.measureText(letter).width
    if (flickeringLetters.has(index)) {
      const flicker =
        index === 4
          ? 0.32 +
            (Math.sin(now / 430) + 1) * 0.045 +
            (Math.sin(now / 97) > 0.94 ? 0.07 : 0)
          : 0.3 +
            (Math.sin(now / 520 + 1.7) + 1) * 0.05 +
            (Math.sin(now / 131) > 0.96 ? 0.06 : 0)
      ctx.save()
      ctx.globalAlpha = flicker
      ctx.shadowColor = "rgba(214, 143, 69, .6)"
      ctx.shadowBlur = 3
      ctx.fillStyle = "#c38e52"
      ctx.fillText(letter, cursor, height / 2 + 1)
      ctx.restore()
    } else {
      const wear = 0.16 + ((index * 7) % 5) * 0.025
      ctx.fillStyle = `rgba(184, 155, 116, ${wear})`
      ctx.fillText(letter, cursor, height / 2 + 1)
    }
    cursor += letterWidth + letterGap
  })

  ctx.fillStyle = "#151b1c"
  ;[
    { x: 43, y: 16, w: 17, h: 5 },
    { x: 128, y: 34, w: 24, h: 7 },
    { x: 275, y: 12, w: 31, h: 6 },
  ].forEach((chip) => ctx.fillRect(chip.x, chip.y, chip.w, chip.h))

  ctx.strokeStyle = "rgba(196, 154, 96, .09)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(82, 8)
  ctx.lineTo(88, 20)
  ctx.lineTo(84, 31)
  ctx.moveTo(218, 9)
  ctx.lineTo(212, 25)
  ctx.lineTo(220, 43)
  ctx.stroke()
  ctx.restore()
}

function drawFactoryBackground(ctx: CanvasRenderingContext2D, now: number) {
  const wall = ctx.createLinearGradient(0, 0, 0, WORLD.height)
  wall.addColorStop(0, "#18212b")
  wall.addColorStop(0.52, "#131b23")
  wall.addColorStop(1, "#0d141b")
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)

  ctx.save()
  for (let row = 0; row < 26; row += 1) {
    const brickY = row * 29
    const offset = row % 2 === 0 ? -34 : 0
    for (let column = -1; column < 20; column += 1) {
      const brickX = offset + column * 68
      const fade = 0.035 + ((row * 5 + column * 3 + 17) % 5) * 0.011
      ctx.fillStyle =
        (row + column) % 7 === 0
          ? `rgba(96, 56, 49, ${fade})`
          : `rgba(74, 53, 50, ${fade * 0.7})`
      ctx.fillRect(brickX + 2, brickY + 2, 64, 25)
      ctx.strokeStyle = `rgba(116, 104, 94, ${fade * 0.72})`
      ctx.lineWidth = 1
      ctx.strokeRect(brickX + 0.5, brickY + 0.5, 67, 28)
    }
  }

  drawDistantFactory(ctx, now)
  drawFurnaceDepth(ctx, now)
  drawBackgroundGear(ctx, 842, 568, 96, 20, now / 26000)
  drawBackgroundGear(ctx, 1013, 576, 76, 16, -now / 20800 + 0.09)

  const leftBeam = ctx.createLinearGradient(0, 30, 0, 620)
  leftBeam.addColorStop(0, "rgba(255, 199, 119, .24)")
  leftBeam.addColorStop(0.48, "rgba(228, 151, 84, .1)")
  leftBeam.addColorStop(1, "rgba(151, 85, 45, 0)")
  ctx.fillStyle = leftBeam
  ctx.beginPath()
  ctx.moveTo(72, 52)
  ctx.lineTo(211, 52)
  ctx.lineTo(410, 620)
  ctx.lineTo(8, 620)
  ctx.closePath()
  ctx.fill()

  const centerBeam = ctx.createLinearGradient(0, 36, 0, 590)
  centerBeam.addColorStop(0, "rgba(255, 205, 132, .2)")
  centerBeam.addColorStop(0.5, "rgba(222, 151, 92, .08)")
  centerBeam.addColorStop(1, "rgba(143, 81, 48, 0)")
  ctx.fillStyle = centerBeam
  ctx.beginPath()
  ctx.moveTo(510, 38)
  ctx.lineTo(668, 38)
  ctx.lineTo(790, 590)
  ctx.lineTo(420, 590)
  ctx.closePath()
  ctx.fill()

  drawFactoryWindow(ctx, 66, 48, 150, 250)
  drawFactoryWindow(ctx, 505, 34, 165, 218)
  drawFactoryWindow(ctx, 945, 194, 142, 224)
  drawPeelingMural(ctx)
  drawFactorySign(ctx, now)

  ctx.fillStyle = "rgba(3, 7, 11, .64)"
  ctx.fillRect(0, 0, WORLD.width, 24)
  ctx.strokeStyle = "rgba(50, 61, 70, .7)"
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(0, 38)
  ctx.lineTo(1280, 38)
  ctx.moveTo(44, 0)
  ctx.lineTo(318, 168)
  ctx.lineTo(590, 0)
  ctx.moveTo(700, 0)
  ctx.lineTo(946, 154)
  ctx.lineTo(1192, 0)
  ctx.stroke()

  ctx.strokeStyle = "rgba(63, 76, 83, .34)"
  ctx.lineWidth = 18
  ctx.beginPath()
  ctx.moveTo(1160, 0)
  ctx.lineTo(1160, 362)
  ctx.quadraticCurveTo(1160, 390, 1132, 390)
  ctx.lineTo(1104, 390)
  ctx.stroke()

  drawHangingIvyChain(ctx, 274, 248, now, 0.4)
  drawHangingIvyChain(ctx, 452, 174, now, 1.7)
  drawHangingIvyChain(ctx, 742, 286, now, 2.8)
  drawHangingIvyChain(ctx, 1210, 206, now, 4.1)
  drawHangingToys(ctx, now)

  ctx.fillStyle = "rgba(255, 224, 178, .045)"
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)

  const grime = ctx.createRadialGradient(875, 520, 20, 875, 520, 390)
  grime.addColorStop(0, "rgba(34, 23, 20, .04)")
  grime.addColorStop(1, "rgba(0, 0, 0, .28)")
  ctx.fillStyle = grime
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)
  ctx.restore()
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  game: Game,
  atlases: SpriteAtlases,
  now: number,
) {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height)
  // Approved far/mid/atmosphere sheets are drawn in game coordinates (1280x720).
  // The previous factory renderer remains a fallback until the new artwork loads.
  if (!drawHallowayBackground(ctx)) {
    drawFactoryBackground(ctx, now)
    // A cool atmospheric plane between the backdrop and every playable surface.
    drawAtmosphericHaze(ctx)
  } else {
    // Keep a faint furnace pulse and factory identity without reintroducing clutter.
    ctx.save()
    ctx.globalAlpha = .16
    drawFurnaceDepth(ctx, now)
    ctx.globalAlpha = 1
    drawRefinedSign(ctx)
    ctx.restore()
  }

  ctx.strokeStyle = "rgba(100, 113, 120, .46)"
  ctx.lineWidth = 2
  ctx.shadowColor = "#283540"
  ctx.shadowBlur = 8
  ctx.strokeRect(8, 8, WORLD.width - 16, WORLD.height - 16)
  ctx.shadowBlur = 0

  drawFactoryLighting(ctx)

  drawToyPit(ctx, GROUND_WATER, now, 0.4)
  drawToyPit(ctx, QUICKSAND, now, 2.1)

  solids.forEach((rect) => drawPlatform(ctx, rect))
  drawHazardDetails(ctx, GROUND_WATER, now)
  drawHazardDetails(ctx, QUICKSAND, now)

  // Marked vertical routes are reserved for the ninja.
  climbWalls.forEach((wall) => {
    if (drawHallowayClimbWall(ctx, wall)) return
    ctx.fillStyle = "#263b59"
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h)
    ctx.strokeStyle = "#a985ff"
    ctx.lineWidth = 4
    for (let y = wall.y + 16; y < wall.y + wall.h - 2; y += 27) {
      ctx.beginPath()
      ctx.moveTo(wall.x + 4, y)
      ctx.lineTo(wall.x + wall.w - 4, y - 10)
      ctx.stroke()
    }
  })

  drawLift(ctx, 1076, game.liftY, 97, 332)
  drawLift(ctx, 830, game.exitLiftY, 97, 20)
  const lowerLiftTarget = game.leverOn ? 622 : 478
  const upperLiftTarget = game.exitLiftButton || game.topLiftButton ? 272 : 130
  if (Math.abs(lowerLiftTarget - game.liftY) > 0.75) {
    drawFallingIvyBits(ctx, 1076, game.liftY, 97, now, 0.23)
  }
  if (Math.abs(upperLiftTarget - game.exitLiftY) > 0.75) {
    drawFallingIvyBits(ctx, 830, game.exitLiftY, 97, now, 0.61)
  }

  drawLever(ctx, game.leverOn)
  drawFloorButton(ctx, 520, 288, game.exitLiftButton)
  drawFloorButton(ctx, 1010, 118, game.topLiftButton)

  game.blocks.forEach((block) => {
    const blockGradient = ctx.createLinearGradient(
      block.x,
      block.y,
      block.x,
      block.y + block.h,
    )
    blockGradient.addColorStop(0, "#ffc84c")
    blockGradient.addColorStop(1, "#b87a20")
    ctx.fillStyle = blockGradient
    ctx.shadowColor = "#ffc84c"
    ctx.shadowBlur = 8
    roundedRect(ctx, block.x, block.y, block.w, block.h, 5)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = "#ffe59b"
    ctx.lineWidth = 2
    ctx.stroke()
  })

  game.gems.filter((gem) => !gem.collected).forEach((gem) => drawGem(ctx, gem))
  if (!game.robotHasKey) drawKey(ctx, getRobotKeyRect(game))
  if (!game.ninjaHasKey) drawKey(ctx, NINJA_KEY, "#b794ff", "#eadfff")

  drawExitDoor(
    ctx,
    EXIT_DOORS.ninja,
    "ninja",
    !game.ninjaHasKey,
    game.ninjaExit,
    atlases.ninja,
  )
  drawExitDoor(
    ctx,
    EXIT_DOORS.robot,
    "robot",
    !game.robotHasKey,
    game.robotExit,
    atlases.robot,
  )

  drawCharacterSprite(ctx, game.robot, atlases, now)
  drawCharacterSprite(ctx, game.ninja, atlases, now)

  // The cinematic onboarding is the sole start presentation; no second dark overlay.
}

function movePlayer(
  player: Player,
  game: Game,
  dt: number,
  input: { left: boolean; right: boolean; up: boolean; down: boolean },
) {
  const ninja = player.role === "ninja"
  const nearClimbWall =
    ninja &&
    climbWalls.some(
      (wall) =>
        player.y + player.h >= wall.y - 3 &&
        player.y <= wall.y + wall.h &&
        (Math.abs(player.x + player.w - wall.x) <= 3 ||
          Math.abs(player.x - (wall.x + wall.w)) <= 3),
    )

  player.touchingClimbWall = Boolean(nearClimbWall)
  player.climbing = Boolean(nearClimbWall && (input.up || input.down))

  const speed = ninja ? 235 : 205
  player.vx = input.left ? -speed : input.right ? speed : 0
  if (input.left) player.facing = -1
  if (input.right) player.facing = 1

  if (player.climbing) {
    // Keep the Ninja's wall climb independent from jump input buffering.
    player.jumpHeld = input.up
    player.jumpBufferRemaining = 0
    player.coyoteRemaining = 0
    player.vy = input.up ? -175 : input.down ? 175 : 0
  } else {
    updateJumpAssist(player, input.up, dt)
    player.vy += GRAVITY * dt
  }

  moveWithPlatformCollisions(player, currentColliders(game), dt)

  player.x = Math.max(24, Math.min(WORLD.width - 24 - player.w, player.x))
  const fellIntoQuicksand =
    player.y + player.h > QUICKSAND.y + 4 &&
    player.y < QUICKSAND.y + QUICKSAND.h &&
    player.x + player.w > QUICKSAND.x &&
    player.x < QUICKSAND.x + QUICKSAND.w
  if (fellIntoQuicksand) {
    game.failedRole = player.role
    game.failedHazard = "quicksand"
    player.vx = 0
    player.vy = 0
    return
  }

  const fellIntoFactoryWaste =
    player.y + player.h > GROUND_WATER.y + 10 &&
    player.x + player.w > GROUND_WATER.x &&
    player.x < GROUND_WATER.x + GROUND_WATER.w
  if (fellIntoFactoryWaste) {
    game.failedRole = player.role
    game.failedHazard = "factory waste"
    player.vx = 0
    player.vy = 0
    return
  }

  if (player.y > WORLD.height + 80) {
    const start = player.role === "robot" ? ROBOT_START : NINJA_START
    player.x = start.x
    player.y = start.y
    player.vx = 0
    player.vy = 0
  }
}

function currentColliders(game: Game): Rect[] {
  const dynamic: Rect[] = [
    ...game.blocks,
    { x: 1076, y: game.liftY, w: 97, h: LIFT_HEIGHT },
    { x: 830, y: game.exitLiftY, w: 97, h: LIFT_HEIGHT },
  ]
  return [...solids, ...climbWalls, ...dynamic]
}

function updateGame(game: Game, dt: number) {
  const keys = game.keys
  const robotInput = {
    left: keys.has("KeyA"),
    right: keys.has("KeyD"),
    up: keys.has("KeyW"),
    down: keys.has("KeyS"),
  }
  const ninjaInput = {
    left: keys.has("ArrowLeft"),
    right: keys.has("ArrowRight"),
    up: keys.has("ArrowUp"),
    down: keys.has("ArrowDown"),
  }

  if (
    [...Object.values(robotInput), ...Object.values(ninjaInput)].some(Boolean)
  )
    game.started = true

  movePlayer(game.robot, game, dt, robotInput)
  if (game.failedRole) return
  movePlayer(game.ninja, game, dt, ninjaInput)
  if (game.failedRole) return

  if (keys.has("KeyQ") && !game.placeLock && game.blocks.length < MAX_BLOCKS) {
    const robot = game.robot
    const feet = robot.y + robot.h
    const zone = BUILD_ZONES.find(
      (buildZone) =>
        Math.abs(feet - buildZone.floorY) < 90 &&
        robot.x + robot.w > buildZone.x - 120 &&
        robot.x < buildZone.x + buildZone.w + 120,
    )
    if (zone) {
      const rowBlocks = game.blocks.filter(
        (block) => Math.abs(block.y - zone.y) < 2,
      )
      const frontierBlock = rowBlocks.length
        ? robot.facing > 0
          ? rowBlocks.reduce((frontier, block) =>
              block.x > frontier.x ? block : frontier,
            )
          : rowBlocks.reduce((frontier, block) =>
              block.x < frontier.x ? block : frontier,
            )
        : null
      const standingOnFrontier =
        frontierBlock !== null &&
        Math.abs(feet - frontierBlock.y) < 4 &&
        robot.x + robot.w > frontierBlock.x &&
        robot.x < frontierBlock.x + frontierBlock.w
      const atPlatformEdge =
        rowBlocks.length === 0 &&
        Math.abs(feet - zone.floorY) < 4 &&
        (robot.facing > 0
          ? robot.x + robot.w >= zone.x - 70 && robot.x < zone.x
          : robot.x <= zone.x + zone.w + 70 &&
            robot.x + robot.w > zone.x + zone.w)
      const x =
        robot.facing > 0
          ? rowBlocks.length
            ? Math.max(...rowBlocks.map((block) => block.x + block.w))
            : zone.x
          : rowBlocks.length
            ? Math.min(...rowBlocks.map((block) => block.x)) - 64
            : zone.x + zone.w - 64
      const candidate = { x, y: zone.y, w: 64, h: 28 }
      const touchesCrossing =
        candidate.x < zone.x + zone.w && candidate.x + candidate.w > zone.x
      const blocked = currentColliders(game).some((solid) =>
        overlaps(candidate, solid),
      )
      if (
        (atPlatformEdge || standingOnFrontier) &&
        touchesCrossing &&
        !blocked
      ) {
        game.blocks.push(candidate)
        const buildStartedAt = performance.now()
        robot.buildAnimationStartedAt = buildStartedAt
        robot.buildAnimationUntil = buildStartedAt + 500
      }
    }
    game.placeLock = true
  }
  if (!keys.has("KeyQ")) game.placeLock = false

  const getSwitchPush = (
    player: Player,
    input: { left: boolean; right: boolean },
  ) => {
    const toggleX = 954 + (game.leverOn ? 31 : 7)
    const touchingToggle = player.y < 460 && player.y + player.h > 425
    const pushingFromLeft =
      input.right && player.x < toggleX && player.x + player.w > toggleX - 10
    const pushingFromRight =
      input.left && player.x + player.w > toggleX && player.x < toggleX + 10
    if (!touchingToggle) return null
    if (pushingFromLeft) return "right"
    if (pushingFromRight) return "left"
    return null
  }
  const switchPush =
    getSwitchPush(game.robot, robotInput) ??
    getSwitchPush(game.ninja, ninjaInput)
  if (switchPush && !game.interactLock) {
    if (switchPush === "right") game.leverOn = true
    if (switchPush === "left") game.leverOn = false
    game.interactLock = true
  }
  if (!switchPush) game.interactLock = false

  const isStandingOnButton = (player: Player, button: Rect) =>
    player.x + player.w > button.x &&
    player.x < button.x + button.w &&
    Math.abs(player.y + player.h - (button.y + button.h)) <= 8

  const exitLiftButtonRect = { x: 520, y: 276, w: 58, h: 24 }
  game.exitLiftButton =
    isStandingOnButton(game.robot, exitLiftButtonRect) ||
    isStandingOnButton(game.ninja, exitLiftButtonRect)
  const topLiftButtonRect = { x: 1010, y: 106, w: 58, h: 24 }
  game.topLiftButton =
    isStandingOnButton(game.robot, topLiftButtonRect) ||
    isStandingOnButton(game.ninja, topLiftButtonRect)

  const lowerTarget = game.leverOn ? 622 : 478
  const exitLiftTarget = game.exitLiftButton || game.topLiftButton ? 272 : 130
  game.liftY += (lowerTarget - game.liftY) * Math.min(1, dt * 3)
  game.exitLiftY += (exitLiftTarget - game.exitLiftY) * Math.min(1, dt * 3)
  if (Math.abs(exitLiftTarget - game.exitLiftY) < 0.25)
    game.exitLiftY = exitLiftTarget

  for (const gem of game.gems) {
    if (!gem.collected) {
      const owner = gem.role === "robot" ? game.robot : game.ninja
      if (overlaps(owner, gem)) gem.collected = true
    }
  }

  if (!game.robotHasKey && overlaps(game.robot, getRobotKeyRect(game))) {
    game.robotHasKey = true
  }
  if (!game.ninjaHasKey && overlaps(game.ninja, NINJA_KEY)) {
    game.ninjaHasKey = true
  }

  game.robotExit = game.robotHasKey && overlaps(game.robot, EXIT_DOORS.robot)
  game.ninjaExit = game.ninjaHasKey && overlaps(game.ninja, EXIT_DOORS.ninja)
  game.won = game.robotExit && game.ninjaExit
}

function Key({ children }: { children: React.ReactNode }) {
  return <span className="key">{children}</span>
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game>(resetGame())
  const spritesRef = useRef<SpriteAtlases>({})
  const animationRef = useRef(0)
  const [result, setResult] = useState<MissionResult | null>(null)
  const [failureRole, setFailureRole] = useState<Role | null>(null)
  const [failureHazard, setFailureHazard] = useState<FailureHazard>("quicksand")
  const [animatedScore, setAnimatedScore] = useState(0)
  const [resultsReady, setResultsReady] = useState(false)
  const [storyOpen, setStoryOpen] = useState(true)
  const [hasSeenIntro, setHasSeenIntro] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [sound] = useState(() => new GameSound())
  const [soundEnabled, setSoundEnabled] = useState(() => sound.isEnabled())
  const soundsPreviousRef = useRef({
    gems: 0,
    blocks: 0,
    robotKey: false,
    ninjaKey: false,
    lever: false,
    robotVy: 0,
    ninjaVy: 0,
  })
  const [stats, setStats] = useState({
    robot: 0,
    ninja: 0,
    blocks: MAX_BLOCKS,
    won: false,
    elapsedMs: 0,
    robotHasKey: false,
    ninjaHasKey: false,
  })
  const reset = useCallback(() => {
    gameRef.current = resetGame()
    soundsPreviousRef.current = {
      gems: 0, blocks: 0, robotKey: false, ninjaKey: false,
      lever: false, robotVy: 0, ninjaVy: 0,
    }
    setStats({
      robot: 0,
      ninja: 0,
      blocks: MAX_BLOCKS,
      won: false,
      elapsedMs: 0,
      robotHasKey: false,
      ninjaHasKey: false,
    })
    setResult(null)
    setFailureRole(null)
    setFailureHazard("quicksand")
    setAnimatedScore(0)
    setResultsReady(false)
    setPauseOpen(false)
    setHelpOpen(false)
  }, [])
  const returnToHome = useCallback(() => {
    sound.stop()
    reset()
    setHasSeenIntro(false)
    setStoryOpen(true)
    setPauseOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [reset, sound])

  useEffect(() => {
    const game = gameRef.current
    const now = performance.now()
    if (storyOpen || pauseOpen) {
      pauseMissionTimer(game, now)
      game.keys.clear()
    } else if (!result && !failureRole && !document.hidden) {
      resumeMissionTimer(game, now)
      game.lastTime = now
    }
  }, [storyOpen, pauseOpen, result, failureRole])

  useEffect(() => () => sound.destroy(), [sound])

  useEffect(() => {
    if (pauseOpen) sound.stop()
    else if (!storyOpen && !result && !failureRole && gameRef.current.started && !document.hidden) sound.start()
  }, [pauseOpen, storyOpen, result, failureRole, sound])

  const toggleSound = useCallback(() => {
    const next = !sound.isEnabled()
    sound.setEnabled(next)
    setSoundEnabled(next)
    if (next) sound.play('ui')
  }, [sound])

  useEffect(() => {
    if (!result) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    if (reduceMotion) {
      setAnimatedScore(result.totalScore)
      setResultsReady(true)
      return
    }

    let scoreFrame = 0
    let scoreStartedAt = 0
    const scoreDelay = window.setTimeout(() => {
      scoreStartedAt = performance.now()
      const animateScore = (now: number) => {
        const progress = Math.min(1, (now - scoreStartedAt) / 850)
        const eased = 1 - Math.pow(1 - progress, 3)
        setAnimatedScore(Math.round(result.totalScore * eased))
        if (progress < 1) scoreFrame = requestAnimationFrame(animateScore)
      }
      scoreFrame = requestAnimationFrame(animateScore)
    }, 420)
    const readyTimer = window.setTimeout(() => setResultsReady(true), 1500)

    return () => {
      window.clearTimeout(scoreDelay)
      window.clearTimeout(readyTimer)
      cancelAnimationFrame(scoreFrame)
    }
  }, [result])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    loadHallowayKit()
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ;(["robot", "ninja"] as Role[]).forEach((role) => {
      const image = new Image()
      image.decoding = "async"
      image.src = SPRITE_PATHS[role]
      spritesRef.current[role] = image
    })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = WORLD.width * dpr
      canvas.height = WORLD.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const controlledKeys = new Set([
      "KeyA",
      "KeyD",
      "KeyW",
      "KeyS",
      "KeyQ",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ])
    const keydown = (event: KeyboardEvent) => {
      if (controlledKeys.has(event.code)) event.preventDefault()
      const game = gameRef.current
      if (event.code === "KeyR") {
        if (!storyOpen) { reset(); sound.start() }
        return
      }
      if (event.code === "Escape" && !storyOpen && !game.won && !game.failedRole) {
        event.preventDefault()
        setHelpOpen(false)
        setPauseOpen(open => !open)
        sound.play('ui')
        return
      }
      if (storyOpen || pauseOpen || game.won || game.failedRole) return
      if (controlledKeys.has(event.code))
        startMissionTimer(game, performance.now())
      game.keys.add(event.code)
    }
    const keyup = (event: KeyboardEvent) => {
      gameRef.current.keys.delete(event.code)
    }
    window.addEventListener("keydown", keydown)
    window.addEventListener("keyup", keyup)
    const visibilitychange = () => {
      const game = gameRef.current
      const now = performance.now()
      if (document.hidden) {
        pauseMissionTimer(game, now)
        game.keys.clear()
        sound.stop()
      } else {
        if (!storyOpen && !pauseOpen && !game.won && !game.failedRole) {
          resumeMissionTimer(game, now)
          if (game.started) sound.start()
        }
        game.lastTime = now
      }
    }
    document.addEventListener("visibilitychange", visibilitychange)

    let statAccumulator = 0
    const frame = (time: number) => {
      const game = gameRef.current
      const dt = Math.min((time - game.lastTime) / 1000, 0.035)
      game.lastTime = time
      if (!storyOpen && !pauseOpen && !game.won && !game.failedRole && !game.paused) updateGame(game, dt)

      if (!storyOpen && !pauseOpen && !game.won && !game.failedRole) {
        const old = soundsPreviousRef.current
        const gems = game.gems.filter(gem => gem.collected).length
        if (gems > old.gems) sound.play('gem')
        if (game.blocks.length > old.blocks) sound.play('build')
        if ((game.robotHasKey && !old.robotKey) || (game.ninjaHasKey && !old.ninjaKey)) sound.play('key')
        if (game.leverOn !== old.lever) sound.play('switch')
        if ((game.robot.vy < -430 && old.robotVy >= -430) || (game.ninja.vy < -430 && old.ninjaVy >= -430)) sound.play('jump')
        soundsPreviousRef.current = {
          gems, blocks: game.blocks.length, robotKey: game.robotHasKey,
          ninjaKey: game.ninjaHasKey, lever: game.leverOn,
          robotVy: game.robot.vy, ninjaVy: game.ninja.vy,
        }
      }

      if (game.failedRole && !game.failureHandled) {
        sound.stop()
        sound.play('failure')
        game.failureHandled = true
        stopMissionTimer(game, time)
        game.keys.clear()
        setFailureRole(game.failedRole)
        setFailureHazard(game.failedHazard ?? "quicksand")
      }

      if (game.won && !game.resultCalculated) {
        sound.stop()
        sound.play('victory')
        game.resultCalculated = true
        stopMissionTimer(game, time)
        game.keys.clear()

        const collectedGems = game.gems.filter((gem) => gem.collected).length
        const gemPoints = collectedGems * 100
        const completionSeconds = Math.max(game.elapsedMs / 1000, 0.001)
        const speedBonus = Math.round(
          200 * Math.min(1, 180 / completionSeconds),
        )
        const totalScore = Math.min(1000, 200 + gemPoints + speedBonus)
        let previousBest = 0
        try {
          previousBest =
            Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? "0", 10) ||
            0
        } catch {
          previousBest = 0
        }
        const newBest = totalScore > previousBest
        if (newBest) {
          try {
            localStorage.setItem(BEST_SCORE_KEY, String(totalScore))
          } catch {
            // Results still work when storage is unavailable.
          }
        }
        setResult({
          elapsedMs: game.elapsedMs,
          collectedGems,
          gemPoints,
          speedBonus,
          totalScore,
          previousBest,
          newBest,
        })
      }

      drawWorld(ctx, game, spritesRef.current, time)
      statAccumulator += dt
      if (statAccumulator > 0.12) {
        statAccumulator = 0
        setStats({
          robot: game.gems.filter(
            (gem) => gem.role === "robot" && gem.collected,
          ).length,
          ninja: game.gems.filter(
            (gem) => gem.role === "ninja" && gem.collected,
          ).length,
          blocks: MAX_BLOCKS - game.blocks.length,
          won: game.won,
          elapsedMs: game.won ? game.elapsedMs : getElapsedMs(game, time),
          robotHasKey: game.robotHasKey,
          ninjaHasKey: game.ninjaHasKey,
        })
      }
      animationRef.current = requestAnimationFrame(frame)
    }
    animationRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", resize)
      window.removeEventListener("keydown", keydown)
      window.removeEventListener("keyup", keyup)
      document.removeEventListener("visibilitychange", visibilitychange)
    }
  }, [reset, storyOpen, pauseOpen, sound])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <div>
            <h1>NINJA <span>&</span> BOLT</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="topbar-secondary" onClick={() => { sound.play('ui'); setHelpOpen(true); setPauseOpen(true) }} disabled={Boolean(storyOpen || result || failureRole)}>
            How to play
          </button>
          <button className="topbar-secondary" onClick={toggleSound} aria-label={soundEnabled ? 'Mute music and sound effects' : 'Enable music and sound effects'}>
            {soundEnabled ? '♪ Sound on' : '♪ Muted'}
          </button>
          <button className="topbar-secondary pause-button" onClick={() => { sound.play('ui'); setHelpOpen(false); setPauseOpen(true) }} disabled={Boolean(storyOpen || result || failureRole || pauseOpen)} aria-label="Pause mission" title="Pause (Esc)">
            Ⅱ Pause
          </button>

        </div>
      </header>

      <section className="game-frame">
        <div className="status-strip" aria-label="Mission status">
          <div className="player-status robot-status">
            <img className="hud-avatar" src="/sprites/robot-portrait.png" alt="" />
            <div className="hud-name"><strong>Bolt</strong></div>
            <span className="gem-count"><span aria-label={`${stats.robot} of 3 gems`}>{[0,1,2].map(i => <i key={i} className={i < stats.robot ? "gem-slot collected" : "gem-slot"}>◆</i>)}</span></span>
            <span className="block-count">▣ {stats.blocks} blocks</span>
            <span className={`key-progress ${stats.robotHasKey ? "found" : ""}`}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="4"/><path d="m11 11 9 9m-4-4 3-3m-6 0 3-3"/></svg> {stats.robotHasKey ? "Key found" : "Find key"}</span>
          </div>
          <div className="objective mission-timer"><small>TIME</small><strong>{formatTime(stats.elapsedMs)}</strong></div>
          <div className="player-status ninja-status">
            <span className={`key-progress ${stats.ninjaHasKey ? "found" : ""}`}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="4"/><path d="m11 11 9 9m-4-4 3-3m-6 0 3-3"/></svg> {stats.ninjaHasKey ? "Key found" : "Find key"}</span>
            <span className="gem-count"><span aria-label={`${stats.ninja} of 3 gems`}>{[0,1,2].map(i => <i key={i} className={i < stats.ninja ? "gem-slot collected" : "gem-slot"}>◆</i>)}</span></span>
            <div className="hud-name"><strong>Ninja</strong></div>
            <img className="hud-avatar" src="/sprites/ninja-portrait.png" alt="" />
          </div>
        </div>
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            width={WORLD.width}
            height={WORLD.height}
            aria-label="Co-op obstacle course game"
          />
          {storyOpen && (
            <StoryModal
              mode={hasSeenIntro ? "popup" : "onboarding"}
              onNavigate={() => sound.play('ui')}
              onBegin={() => { sound.play('ui'); sound.start(); setHasSeenIntro(true); setStoryOpen(false) }}
            />
          )}
          {pauseOpen && !storyOpen && !failureRole && !result && (
            <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
              <section className="pause-panel">
                <span className="pause-kicker">HALLOWAY TOY WORKS / MISSION 01</span>
                <h2 id="pause-title">{helpOpen ? "How to play" : "Ⅱ PAUSED"}</h2>
                {helpOpen && <div className="help-controls"><p><strong>Bolt</strong> · A / D to move · W to jump · Q to build</p><p><strong>Ninja</strong> · ← / → to move · ↑ to jump or climb · ↓ to climb down</p><p>Collect your own key, then reach both exit doors together. Build from the edge of a gap or your newest block.</p></div>}
                <div className="pause-actions">
                  <button className="pause-primary" onClick={() => { sound.play('ui'); setPauseOpen(false) }}>{helpOpen ? "Back to game" : "▶ RESUME MISSION"}</button>
                  {!helpOpen && <button onClick={() => { setHelpOpen(true) }}>How to play</button>}
                  <button onClick={() => { sound.play('ui'); reset(); sound.start() }}>↻ RESTART MISSION</button>
                  <button onClick={() => { sound.play('ui'); setPauseOpen(false); setStoryOpen(true) }}>▤ READ STORY</button>
                  <button onClick={toggleSound}>{soundEnabled ? '♪ MUTE AUDIO' : '♪ ENABLE AUDIO'}</button>
                  <button onClick={returnToHome}>⌂ BACK TO INTRO</button>
                </div>
                <small>ESC TO RESUME</small>
              </section>
            </div>
          )}
          {failureRole && (
            <FailureModal
              role={failureRole}
              hazard={failureHazard}
              onRetry={() => { reset(); sound.start() }}
              onReturn={returnToHome}
            />
          )}
          {result && (
            <div
              className="results-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="results-title"
            >
              <section className="results-panel">
                <header className="results-header">
                  <span>HALLOWAY TOY WORKS / EXTRACTION COMPLETE</span>
                  <h2 id="results-title">NIGHT SHIFT OVER.</h2>
                  <p>For the first time in thirty years, Unit 7 gets to go home.</p>
                </header>

                <div className="team-score" aria-live="polite">
                  <small>YOUR TEAM SCORE</small>
                  <strong>
                    {animatedScore.toLocaleString()} <span>/ 1,000</span>
                  </strong>
                  {result.newBest ? (
                    <div className="best-score new-best">
                      NEW BEST SCORE!
                      {result.previousBest > 0 && (
                        <small>
                          Previous best: {result.previousBest.toLocaleString()}
                        </small>
                      )}
                    </div>
                  ) : (
                    <div className="best-score">
                      BEST SCORE: {result.previousBest.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="performance-grid">
                  <article className="performance-card">
                    <small>GEMS COLLECTED</small>
                    <strong>
                      {result.collectedGems} <span>/ 6</span>
                    </strong>
                    <div
                      className="result-gems"
                      aria-label={`${result.collectedGems} of 6 gems collected`}
                    >
                      {Array.from({ length: 6 }, (_, index) => (
                        <i
                          className={
                            index < result.collectedGems ? "collected" : ""
                          }
                          style={{ animationDelay: `${500 + index * 80}ms` }}
                          key={index}
                          aria-hidden="true"
                        >
                          ◆
                        </i>
                      ))}
                    </div>
                  </article>

                  <article className="performance-card">
                    <small>COMPLETION TIME</small>
                    <strong>{formatTime(result.elapsedMs)}</strong>
                    <p>Speed bonus: +{result.speedBonus}</p>
                  </article>
                </div>

                <div className="score-breakdown">
                  <div>
                    <span>Mission Complete</span>
                    <strong>+200</strong>
                  </div>
                  <div>
                    <span>Gems Collected</span>
                    <strong>+{result.gemPoints}</strong>
                  </div>
                  <div>
                    <span>Speed Bonus</span>
                    <strong>+{result.speedBonus}</strong>
                  </div>
                </div>

                <div className="result-actions">
                  <button
                    className="play-again"
                    onClick={() => { reset(); sound.start() }}
                    disabled={!resultsReady}
                  >
                    {resultsReady ? "▶ PLAY AGAIN" : "CALCULATING..."}
                  </button>
                  <button className="result-review" onClick={returnToHome}>↶ WATCH STORY</button>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>

      <section className="controls" aria-label="Game controls">
        <div className="control-card robot-card">
          <img className="control-avatar" src="/sprites/robot-portrait.png" alt="" />
          <div className="control-identity"><small>Bolt</small><strong>Builder</strong></div>
          <div className="control-shortcuts"><span><Key>A</Key><Key>D</Key> Move</span><span><Key>W</Key> Jump</span><span><Key>Q</Key> Build</span></div>
        </div>
        <div className="control-card ninja-card">
          <div className="control-shortcuts"><span><Key>←</Key><Key>→</Key> Move</span><span><Key>↑</Key> Jump / climb</span><span><Key>↓</Key> Climb down</span></div>
          <div className="control-identity"><small>Ninja</small><strong>Climber</strong></div>
          <img className="control-avatar" src="/sprites/ninja-portrait.png" alt="" />
        </div>
      </section>
    </main>
  )
}

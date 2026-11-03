import { useCallback, useEffect, useRef, useState } from "react"
import { GRAVITY, moveWithPlatformCollisions, updateJumpAssist } from "./physics"

const WORLD = { width: 1280, height: 720 }
const ROBOT_START = { x: 78, y: 586 }
const NINJA_START = { x: 152, y: 586 }
const GROUND_WATER = { x: 300, y: 650, w: 256, h: 70 }
const QUICKSAND = { x: 574, y: 478, w: 192, h: 28 }
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
  { x: 650, y: 130, w: 180, h: 28 },
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
    { x: 1112, y: 426, w: 24, h: 24, role: "ninja", collected: false },
  ],
  keys: new Set(),
  leverOn: false,
  exitLiftButton: false,
  topLiftButton: false,
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
  const gradient = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h)
  gradient.addColorStop(0, "#36324f")
  gradient.addColorStop(0.14, "#1a1b31")
  gradient.addColorStop(1, "#101326")
  ctx.fillStyle = gradient
  ctx.shadowColor = "rgba(160, 101, 255, .28)"
  ctx.shadowBlur = 7
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 5)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = "#7655a8"
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.strokeStyle = "rgba(161, 130, 215, .2)"
  ctx.lineWidth = 1
  for (let x = rect.x + 38; x < rect.x + rect.w; x += 52) {
    ctx.beginPath()
    ctx.moveTo(x, rect.y + 4)
    ctx.lineTo(x - 9, rect.y + rect.h - 4)
    ctx.stroke()
  }
}

function drawLift(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
) {
  ctx.save()
  ctx.shadowColor = "#60d9dc"
  ctx.shadowBlur = 14
  ctx.fillStyle = "#60d9dc"
  roundedRect(ctx, x, y, w, LIFT_HEIGHT, 5)
  ctx.fill()
  ctx.strokeStyle = "#60d9dc"
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = "rgba(232, 255, 255, .35)"
  ctx.fillRect(x + 6, y + 5, w - 12, 2)
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
  const color = gem.role === "robot" ? "#ffe36d" : "#b69aff"
  ctx.save()
  ctx.translate(gem.x + gem.w / 2, gem.y + gem.h / 2)
  ctx.rotate(Math.PI / 4)
  ctx.shadowColor = color
  ctx.shadowBlur = 17
  ctx.fillStyle = color
  ctx.fillRect(-9, -9, 18, 18)
  ctx.fillStyle = "rgba(255,255,255,.7)"
  ctx.fillRect(-7, -7, 6, 6)
  ctx.restore()
}

function drawLever(ctx: CanvasRenderingContext2D, on: boolean) {
  const x = 954
  const y = 460
  ctx.fillStyle = "#536b81"
  roundedRect(ctx, x, y, 38, 18, 4)
  ctx.fill()
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
  ctx.save()
  ctx.fillStyle = pressed ? "#5ce1e6" : "#71889b"
  ctx.shadowColor = pressed ? "#5ce1e6" : "transparent"
  ctx.shadowBlur = pressed ? 14 : 0
  roundedRect(ctx, x, y + (pressed ? 6 : 0), 58, pressed ? 6 : 12, 3)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()
}

function drawSandHazard(ctx: CanvasRenderingContext2D, hazard: Rect) {
  const sand = ctx.createLinearGradient(0, hazard.y, 0, hazard.y + hazard.h)
  sand.addColorStop(0, "#e6b64c")
  sand.addColorStop(0.35, "#aa7028")
  sand.addColorStop(1, "#68401f")
  ctx.fillStyle = sand
  ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h)
  ctx.strokeStyle = "#f3cc68"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(hazard.x, hazard.y + 5)
  for (let x = hazard.x; x <= hazard.x + hazard.w; x += 20) {
    ctx.quadraticCurveTo(x + 5, hazard.y - 2, x + 10, hazard.y + 5)
  }
  ctx.stroke()
  ctx.fillStyle = "rgba(255, 225, 145, .48)"
  for (let x = hazard.x + 18; x < hazard.x + hazard.w; x += 38) {
    ctx.beginPath()
    ctx.arc(x, hazard.y + Math.min(18, hazard.h * 0.62), 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  game: Game,
  atlases: SpriteAtlases,
  now: number,
) {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height)
  const background = ctx.createLinearGradient(0, 0, 0, WORLD.height)
  background.addColorStop(0, "#091225")
  background.addColorStop(0.55, "#070d1d")
  background.addColorStop(1, "#040814")
  ctx.fillStyle = background
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)

  // Blueprint grid and technical framing.
  ctx.lineWidth = 1
  for (let x = 0; x <= WORLD.width; x += 32) {
    ctx.strokeStyle =
      x % 128 === 0 ? "rgba(97, 124, 190, .13)" : "rgba(81, 108, 165, .055)"
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, WORLD.height)
    ctx.stroke()
  }
  for (let y = 0; y <= WORLD.height; y += 32) {
    ctx.strokeStyle =
      y % 128 === 0 ? "rgba(97, 124, 190, .13)" : "rgba(81, 108, 165, .055)"
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(WORLD.width, y + 0.5)
    ctx.stroke()
  }
  ctx.strokeStyle = "rgba(164, 105, 255, .42)"
  ctx.lineWidth = 2
  ctx.shadowColor = "#9c6cff"
  ctx.shadowBlur = 12
  ctx.strokeRect(8, 8, WORLD.width - 16, WORLD.height - 16)
  ctx.shadowBlur = 0

  ctx.fillStyle = "rgba(118, 146, 211, .18)"
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 173 + 91) % WORLD.width
    const y = (i * 83 + 47) % WORLD.height
    ctx.fillRect(x, y, i % 5 === 0 ? 3 : 1.5, i % 5 === 0 ? 3 : 1.5)
  }
  ctx.strokeStyle = "rgba(117, 143, 199, .13)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(48, 98)
  ctx.lineTo(180, 98)
  ctx.moveTo(1050, 365)
  ctx.lineTo(1210, 365)
  ctx.moveTo(90, 548)
  ctx.lineTo(220, 548)
  ctx.stroke()

  drawSandHazard(ctx, GROUND_WATER)
  drawSandHazard(ctx, QUICKSAND)

  solids.forEach((rect) => drawPlatform(ctx, rect))

  // Marked vertical routes are reserved for the ninja.
  climbWalls.forEach((wall) => {
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

  drawLift(ctx, 1076, game.liftY, 97)
  ctx.strokeStyle = "rgba(92,225,230,.25)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(1086, 478)
  ctx.lineTo(1086, 622)
  ctx.moveTo(1163, 478)
  ctx.lineTo(1163, 622)
  ctx.stroke()

  drawLift(ctx, 830, game.exitLiftY, 97)
  ctx.beginPath()
  ctx.moveTo(840, 130)
  ctx.lineTo(840, 272)
  ctx.moveTo(917, 130)
  ctx.lineTo(917, 272)
  ctx.stroke()

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

  // Exit pods.
  ;[
    { x: 1090, role: "robot" as const, active: game.robotExit },
    { x: 1170, role: "ninja" as const, active: game.ninjaExit },
  ].forEach((pod) => {
    const color = pod.role === "robot" ? "#ffcf4a" : "#b794ff"
    ctx.fillStyle = "#101d31"
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.shadowColor = color
    ctx.shadowBlur = pod.active ? 20 : 5
    roundedRect(ctx, pod.x, 54, 58, 76, 9)
    ctx.fill()
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = color
    ctx.font = "800 10px Inter, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(pod.role.toUpperCase(), pod.x + 29, 44)
  })

  drawCharacterSprite(ctx, game.robot, atlases, now)
  drawCharacterSprite(ctx, game.ninja, atlases, now)

  if (!game.started) {
    ctx.fillStyle = "rgba(4, 9, 17, .7)"
    ctx.fillRect(0, 0, WORLD.width, WORLD.height)
    ctx.fillStyle = "#eef6ff"
    ctx.font = "800 42px Inter, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("CO-OP SYSTEM ONLINE", WORLD.width / 2, 314)
    ctx.fillStyle = "#95a9be"
    ctx.font = "500 18px Inter, sans-serif"
    ctx.fillText("Press any movement key to begin", WORLD.width / 2, 353)
  }
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
    // Wall climbing is separate from jump buffering; holding UP on a wall
    // should not queue a surprise jump when the Ninja leaves the wall.
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

  const robotExitRect = { x: 1090, y: 54, w: 58, h: 76 }
  const ninjaExitRect = { x: 1170, y: 54, w: 58, h: 76 }
  game.robotExit = overlaps(game.robot, robotExitRect)
  game.ninjaExit = overlaps(game.ninja, ninjaExitRect)
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
  const [stats, setStats] = useState({
    robot: 0,
    ninja: 0,
    blocks: MAX_BLOCKS,
    won: false,
    elapsedMs: 0,
  })
  const reset = useCallback(() => {
    gameRef.current = resetGame()
    setStats({
      robot: 0,
      ninja: 0,
      blocks: MAX_BLOCKS,
      won: false,
      elapsedMs: 0,
    })
    setResult(null)
    setFailureRole(null)
    setFailureHazard("quicksand")
    setAnimatedScore(0)
    setResultsReady(false)
  }, [])
  const returnToHome = useCallback(() => {
    reset()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [reset])

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
        reset()
        return
      }
      if (game.won || game.failedRole) return
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
      } else {
        resumeMissionTimer(game, now)
        game.lastTime = now
      }
    }
    document.addEventListener("visibilitychange", visibilitychange)

    let statAccumulator = 0
    const frame = (time: number) => {
      const game = gameRef.current
      const dt = Math.min((time - game.lastTime) / 1000, 0.035)
      game.lastTime = time
      if (!game.won && !game.failedRole && !game.paused) updateGame(game, dt)

      if (game.failedRole && !game.failureHandled) {
        game.failureHandled = true
        stopMissionTimer(game, time)
        game.keys.clear()
        setFailureRole(game.failedRole)
        setFailureHazard(game.failedHazard ?? "quicksand")
      }

      if (game.won && !game.resultCalculated) {
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
  }, [reset])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <div>
            <h1>Ninjabot escape</h1>
          </div>
        </div>
        <div className="mission">
          <strong>Mission 1</strong>
        </div>
        <div className="header-actions">
          <button className="reset-button" onClick={reset}>
            RESET <Key>R</Key>
          </button>
        </div>
      </header>

      <section className="game-frame">
        <div className="status-strip">
          <div className="player-status robot-status">
            <span className="status-dot" />
            <div>
              <strong>ROBOT</strong>
            </div>
            <span className="gem-count">
              <span>GEMS COLLECTED</span>
              <strong>◆ {stats.robot}/3</strong>
            </span>
            <span className="block-count">{stats.blocks} BLOCKS</span>
          </div>
          <div className="objective mission-timer">
            <small>MISSION TIME</small>
            <strong>{formatTime(stats.elapsedMs)}</strong>
          </div>
          <div className="player-status ninja-status">
            <span className="block-count">WALL CLIMB</span>
            <span className="gem-count">
              <span>GEMS COLLECTED</span>
              <strong>◆ {stats.ninja}/3</strong>
            </span>
            <div>
              <strong>NINJA</strong>
            </div>
            <span className="status-dot" />
          </div>
        </div>
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            width={WORLD.width}
            height={WORLD.height}
            aria-label="Co-op obstacle course game"
          />
          {failureRole && (
            <div
              className="failure-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="failure-title"
            >
              <section className="failure-panel">
                <div className="failure-illustration" aria-hidden="true">
                  <img src={`/sprites/${failureRole}-portrait.png`} alt="" />
                  <div className="failure-quicksand">
                    <span />
                    <span />
                  </div>
                </div>
                <small>
                  Oh no! The {failureRole} sank in the {failureHazard}.
                </small>
                <strong id="failure-title">Misson 1 Failed</strong>
                <div className="failure-actions">
                  <button className="retry-mission" onClick={reset}>
                    RETRY MISSION
                  </button>
                  <button className="return-home" onClick={returnToHome}>
                    RETURN TO HOME
                  </button>
                </div>
              </section>
            </div>
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
                  <span>LINK ESTABLISHED</span>
                  <h2 id="results-title">MISSION COMPLETE!</h2>
                  <p>Both operatives made it home.</p>
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

                <button
                  className="play-again"
                  onClick={reset}
                  disabled={!resultsReady}
                >
                  {resultsReady ? "PLAY AGAIN" : "CALCULATING..."}
                </button>
              </section>
            </div>
          )}
        </div>
      </section>

      <section className="controls" aria-label="Game controls">
        <article className="control-card robot-card">
          <div className="character-icon robot-mini" aria-hidden="true">
            <img src="/sprites/robot-portrait.png" alt="" />
          </div>
          <div className="control-title">
            <small>PLAYER 1</small>
            <strong>ROBOT</strong>
          </div>
          <div className="control-group">
            <div className="key-cluster">
              <div className="key-row key-row-top">
                <Key>W</Key>
              </div>
              <div className="key-row">
                <Key>A</Key>
                <Key>S</Key>
                <Key>D</Key>
              </div>
            </div>
            <span>MOVE / JUMP</span>
          </div>
          <div className="control-group">
            <Key>Q</Key>
            <span>PLACE BLOCK</span>
          </div>
          <p>Build progressively, then use the paired up/down lift buttons.</p>
        </article>

        <div className="co-op-tip">
          <span className="link-line" />
          <div>
            <small>CO-OP RULE</small>
            <strong>NO ONE ESCAPES ALONE</strong>
            <p>
              Push Lift 01 right to lower it and left to return it; hold floor
              buttons for the exit lift.
            </p>
          </div>
          <span className="link-line" />
        </div>

        <article className="control-card ninja-card">
          <div className="character-icon ninja-mini" aria-hidden="true">
            <img src="/sprites/ninja-portrait.png" alt="" />
          </div>
          <div className="control-title">
            <small>PLAYER 2</small>
            <strong>NINJA</strong>
          </div>
          <div className="control-group arrows">
            <div className="key-cluster">
              <div className="key-row key-row-top">
                <Key>↑</Key>
              </div>
              <div className="key-row">
                <Key>←</Key>
                <Key>↓</Key>
                <Key>→</Key>
              </div>
            </div>
            <span>MOVE / CLIMB</span>
          </div>
          <p>Hold up or down beside a marked vertical wall to climb it.</p>
        </article>
      </section>
    </main>
  )
}

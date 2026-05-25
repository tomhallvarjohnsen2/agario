import {
  BOT_COUNT, BOT_NAMES, CELL_COLORS, EJECT_MASS_FACTOR,
  FOOD_COUNT, FOOD_RADIUS, INITIAL_PLAYER_RADIUS, MAX_RADIUS,
  MERGE_TIMER, MIN_RADIUS, SPECIAL_FOOD_COUNT, SPECIAL_FOOD_RADIUS,
  SPLIT_VELOCITY, VIRUS_COUNT, VIRUS_RADIUS, WORLD_HEIGHT, WORLD_WIDTH,
} from './constants'
import { Cell, Food, GameState, Virus } from './types'
import {
  cellSpeed, clamp, dist, massToRadius, radiusToMass,
  randomColor, randomFoodColor, randomSpecialFoodColor, randomPos, uid,
} from './utils'

// ─── Initialise ────────────────────────────────────────────────────────────

export function createFood(count = FOOD_COUNT): Food[] {
  return Array.from({ length: count }, () => ({
    id: uid(),
    ...randomPos(),
    radius: FOOD_RADIUS,
    color: randomFoodColor(),
    value: 1,
  }))
}

export function createSpecialFood(count = SPECIAL_FOOD_COUNT): Food[] {
  return Array.from({ length: count }, () => ({
    id: uid(),
    ...randomPos(),
    radius: SPECIAL_FOOD_RADIUS,
    color: randomSpecialFoodColor(),
    value: 5,
  }))
}

export function createViruses(): Virus[] {
  return Array.from({ length: VIRUS_COUNT }, () => ({
    id: uid(),
    ...randomPos(),
    radius: VIRUS_RADIUS,
  }))
}

function safeBotPos(): { x: number; y: number } {
  // Keep bots away from the player spawn point (center of world)
  const SAFE_RADIUS = 600
  const cx = WORLD_WIDTH / 2
  const cy = WORLD_HEIGHT / 2
  let pos = randomPos()
  let attempts = 0
  while (attempts++ < 20) {
    const dx = pos.x - cx
    const dy = pos.y - cy
    if (Math.sqrt(dx * dx + dy * dy) > SAFE_RADIUS) break
    pos = randomPos()
  }
  return pos
}

function makeBot(idx: number): Cell {
  const tier = idx % 4
  const radius =
    tier === 0 ? INITIAL_PLAYER_RADIUS * (0.8 + Math.random() * 0.6)
    : tier === 1 ? INITIAL_PLAYER_RADIUS * (1.2 + Math.random() * 1.0)
    : tier === 2 ? INITIAL_PLAYER_RADIUS * (1.8 + Math.random() * 1.5)
    : INITIAL_PLAYER_RADIUS * (0.9 + Math.random() * 0.4)
  const gid = uid()
  return {
    id: gid,
    groupId: gid,
    ...safeBotPos(),
    radius,
    color: CELL_COLORS[idx % CELL_COLORS.length],
    vx: 0, vy: 0,
    name: BOT_NAMES[idx % BOT_NAMES.length],
    isPlayer: false,
    mergeTimer: 0,
  }
}

export function initialState(playerName: string): GameState {
  const bots = Array.from({ length: BOT_COUNT }, (_, i) => makeBot(i))
  return {
    playerCells: [{
      id: uid(),
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      radius: INITIAL_PLAYER_RADIUS,
      color: randomColor(),
      vx: 0, vy: 0,
      name: playerName || 'Player',
      isPlayer: true,
      mergeTimer: 0,
    }],
    bots,
    food: [...createFood(), ...createSpecialFood()],
    viruses: createViruses(),
    score: 0,
    dead: false,
    playerName: playerName || 'Player',
  }
}

// ─── Player movement ───────────────────────────────────────────────────────

export function movePlayerCells(
  cells: Cell[],
  targetX: number,   // world coords
  targetY: number,
): Cell[] {
  return cells.map(cell => {
    const dx = targetX - cell.x
    const dy = targetY - cell.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < 1) return cell

    const speed = cellSpeed(cell.radius)
    // Decelerate when close to the cursor
    const factor = Math.min(d / (cell.radius * 2), 1) * speed

    let nx = cell.x + (dx / d) * factor
    let ny = cell.y + (dy / d) * factor

    // Eject / split velocity bleed-off
    let nvx = cell.vx * 0.85
    let nvy = cell.vy * 0.85
    nx += nvx
    ny += nvy

    nx = clamp(nx, cell.radius, WORLD_WIDTH - cell.radius)
    ny = clamp(ny, cell.radius, WORLD_HEIGHT - cell.radius)

    return {
      ...cell,
      x: nx, y: ny,
      vx: nvx, vy: nvy,
      mergeTimer: Math.max(0, (cell.mergeTimer ?? 0) - 1),
    }
  })
}

// ─── Split ─────────────────────────────────────────────────────────────────

export function splitPlayerCells(
  cells: Cell[],
  targetX: number,
  targetY: number,
): Cell[] {
  if (cells.length >= 16) return cells   // max 16 pieces

  const result: Cell[] = []
  for (const cell of cells) {
    const minSplitRadius = MIN_RADIUS * 2.5
    if (cell.radius < minSplitRadius) {
      result.push(cell)
      continue
    }
    const newRadius = cell.radius / Math.SQRT2
    const dx = targetX - cell.x
    const dy = targetY - cell.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = dx / d
    const ny = dy / d

    result.push({ ...cell, radius: newRadius, mergeTimer: MERGE_TIMER })
    result.push({
      id: uid(),
      x: cell.x + nx * newRadius,
      y: cell.y + ny * newRadius,
      radius: newRadius,
      color: cell.color,
      vx: nx * SPLIT_VELOCITY,
      vy: ny * SPLIT_VELOCITY,
      name: cell.name,
      isPlayer: true,
      mergeTimer: MERGE_TIMER,
    })
  }
  return result
}

// ─── Eject mass ───────────────────────────────────────────────────────────

export function ejectMass(
  cells: Cell[],
  food: Food[],
  targetX: number,
  targetY: number,
): { cells: Cell[]; food: Food[] } {
  const newFood: Food[] = []
  const updatedCells = cells.map(cell => {
    const minEjectRadius = 35
    if (cell.radius < minEjectRadius) return cell

    const ejectRadius = cell.radius * EJECT_MASS_FACTOR
    const newRadius = massToRadius(radiusToMass(cell.radius) - radiusToMass(ejectRadius))

    const dx = targetX - cell.x
    const dy = targetY - cell.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = dx / d
    const ny = dy / d

    newFood.push({
      id: uid(),
      x: cell.x + nx * (cell.radius + ejectRadius + 2),
      y: cell.y + ny * (cell.radius + ejectRadius + 2),
      radius: ejectRadius,
      color: cell.color,
      value: 1,
    })

    return { ...cell, radius: newRadius }
  })

  return { cells: updatedCells, food: [...food, ...newFood] }
}

// ─── Merge player cells ────────────────────────────────────────────────────

function mergePlayerCells(cells: Cell[]): Cell[] {
  if (cells.length <= 1) return cells

  const merged: Cell[] = [...cells]
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i]
        const b = merged[j]
        if ((a.mergeTimer ?? 0) > 0 || (b.mergeTimer ?? 0) > 0) continue
        const d = dist(a.x, a.y, b.x, b.y)
        if (d < Math.max(a.radius, b.radius) * 0.8) {
          const totalMass = radiusToMass(a.radius) + radiusToMass(b.radius)
          const newRadius = Math.min(massToRadius(totalMass), MAX_RADIUS)
          // weighted center
          const wa = radiusToMass(a.radius)
          const wb = radiusToMass(b.radius)
          const cx = (a.x * wa + b.x * wb) / (wa + wb)
          const cy = (a.y * wa + b.y * wb) / (wa + wb)
          merged[i] = { ...a, x: cx, y: cy, radius: newRadius, vx: 0, vy: 0 }
          merged.splice(j, 1)
          changed = true
          break
        }
      }
      if (changed) break
    }
  }
  return merged
}

// ─── Separate player cells (no overlap) ───────────────────────────────────

function separatePlayerCells(cells: Cell[]): Cell[] {
  const result = [...cells]
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i]
      const b = result[j]
      if ((a.mergeTimer ?? 0) <= 0 && (b.mergeTimer ?? 0) <= 0) continue
      const minDist = a.radius + b.radius
      const d = dist(a.x, a.y, b.x, b.y)
      if (d < minDist && d > 0) {
        const overlap = (minDist - d) / 2
        const dx = (b.x - a.x) / d
        const dy = (b.y - a.y) / d
        result[i] = { ...a, x: a.x - dx * overlap, y: a.y - dy * overlap }
        result[j] = { ...b, x: b.x + dx * overlap, y: b.y + dy * overlap }
      }
    }
  }
  return result
}

// ─── Bot AI ───────────────────────────────────────────────────────────────

// How far bots can "see" food and the player
const BOT_FOOD_VISION = 350
const BOT_PLAYER_VISION = 420
// Chase speed is reduced so the player can escape with sharp turns
const BOT_CHASE_SPEED_FACTOR = 0.78
// Chance each frame that a bot gets distracted by food even when player is nearby
const BOT_DISTRACTION_CHANCE = 0.22

export function updateBots(
  bots: Cell[],
  playerCells: Cell[],
  food: Food[],
): Cell[] {
  return bots.map(bot => {
    let tx = bot.x + (Math.random() - 0.5) * 60  // wander by default
    let ty = bot.y + (Math.random() - 0.5) * 60
    let chasing = false

    // Find nearest food within limited vision range (not whole map)
    let minFoodDist = Infinity
    for (const f of food) {
      const d = dist(bot.x, bot.y, f.x, f.y)
      if (d < BOT_FOOD_VISION && d < minFoodDist) {
        minFoodDist = d
        tx = f.x
        ty = f.y
      }
    }

    // Chase smaller or flee bigger cells — only if not randomly distracted
    const distracted = Math.random() < BOT_DISTRACTION_CHANCE
    if (!distracted) {
      for (const pc of playerCells) {
        const d = dist(bot.x, bot.y, pc.x, pc.y)
        if (d > BOT_PLAYER_VISION) continue

        if (bot.radius > pc.radius * 1.2) {
          // Chase — but aim slightly off target (imprecise)
          const aimJitter = d * 0.18
          tx = pc.x + (Math.random() - 0.5) * aimJitter
          ty = pc.y + (Math.random() - 0.5) * aimJitter
          chasing = true
        } else if (pc.radius > bot.radius * 1.02) {
          // Flee directly away
          tx = bot.x * 2 - pc.x
          ty = bot.y * 2 - pc.y
        }
      }
    }

    const dx = tx - bot.x
    const dy = ty - bot.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const speed = cellSpeed(bot.radius) * (chasing ? BOT_CHASE_SPEED_FACTOR : 1)
    const nx = bot.x + (dx / d) * speed
    const ny = bot.y + (dy / d) * speed

    return {
      ...bot,
      x: clamp(nx, bot.radius, WORLD_WIDTH - bot.radius),
      y: clamp(ny, bot.radius, WORLD_HEIGHT - bot.radius),
      mergeTimer: Math.max(0, (bot.mergeTimer ?? 0) - 1),
    }
  })
}

// ─── Bot splitting ────────────────────────────────────────────────────────

const BOT_SPLIT_CHANCE = 0.007      // ~0.7% per frame when conditions met
const BOT_MIN_SPLIT_RADIUS = 52     // must be big enough to split

export function maybeSplitBots(bots: Cell[], playerCells: Cell[]): Cell[] {
  if (bots.length >= BOT_COUNT * 3) return bots  // cap total bot cells

  const newCells: Cell[] = []
  const updated = bots.map(bot => {
    if (bot.radius < BOT_MIN_SPLIT_RADIUS) return bot
    if ((bot.mergeTimer ?? 0) > 0) return bot
    if (Math.random() > BOT_SPLIT_CHANCE) return bot

    // Only split when a suitable prey is close
    let splitTarget: Cell | null = null
    for (const pc of playerCells) {
      const d = dist(bot.x, bot.y, pc.x, pc.y)
      if (d < 280 && bot.radius > pc.radius * 1.2) {
        splitTarget = pc
        break
      }
    }
    if (!splitTarget) return bot

    const newRadius = bot.radius / Math.SQRT2
    const dx = splitTarget.x - bot.x
    const dy = splitTarget.y - bot.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1

    newCells.push({
      ...bot,
      id: uid(),
      x: bot.x + (dx / len) * newRadius,
      y: bot.y + (dy / len) * newRadius,
      radius: newRadius,
      vx: (dx / len) * SPLIT_VELOCITY,
      vy: (dy / len) * SPLIT_VELOCITY,
      mergeTimer: MERGE_TIMER,
    })

    return { ...bot, radius: newRadius, mergeTimer: MERGE_TIMER }
  })

  return [...updated, ...newCells]
}

// ─── Bot merge ────────────────────────────────────────────────────────────

export function mergeBotCells(bots: Cell[]): Cell[] {
  const merged = [...bots]
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i]
        const b = merged[j]
        if (!a.groupId || a.groupId !== b.groupId) continue
        if ((a.mergeTimer ?? 0) > 0 || (b.mergeTimer ?? 0) > 0) continue
        if (dist(a.x, a.y, b.x, b.y) < Math.max(a.radius, b.radius) * 0.8) {
          const totalMass = radiusToMass(a.radius) + radiusToMass(b.radius)
          const wa = radiusToMass(a.radius)
          const wb = radiusToMass(b.radius)
          merged[i] = {
            ...a,
            x: (a.x * wa + b.x * wb) / (wa + wb),
            y: (a.y * wa + b.y * wb) / (wa + wb),
            radius: Math.min(massToRadius(totalMass), MAX_RADIUS),
            vx: 0, vy: 0,
          }
          merged.splice(j, 1)
          changed = true
          break
        }
      }
      if (changed) break
    }
  }
  return merged
}

// ─── Eating ───────────────────────────────────────────────────────────────

export function eatFood(
  cells: Cell[],
  food: Food[],
): { cells: Cell[]; food: Food[]; scoreGained: number } {
  let scoreGained = 0
  const remaining: Food[] = []

  for (const f of food) {
    let foodEaten = false
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (c.radius < f.radius) continue
      if (dist(c.x, c.y, f.x, f.y) < c.radius) {
        const newMass = radiusToMass(c.radius) + radiusToMass(f.radius)
        cells[i] = { ...c, radius: Math.min(massToRadius(newMass), MAX_RADIUS) }
        scoreGained += f.value
        foodEaten = true
        break
      }
    }
    if (!foodEaten) remaining.push(f)
  }
  return { cells, food: remaining, scoreGained }
}

function eatCellVsCell(eater: Cell, prey: Cell): boolean {
  // Same bot group can't eat each other
  if (eater.groupId && eater.groupId === prey.groupId) return false
  if (eater.radius < prey.radius * 1.02) return false
  const d = dist(eater.x, eater.y, prey.x, prey.y)
  return d < eater.radius - prey.radius * 0.75
}

// ─── Virus interaction ────────────────────────────────────────────────────

const VIRUS_MASS_BONUS = 100
const VIRUS_SPLIT_PIECES = 8

function virusInteraction(cells: Cell[], viruses: Virus[]): Cell[] {
  let result = [...cells]
  for (const virus of viruses) {
    for (let i = 0; i < result.length; i++) {
      const c = result[i]
      if (c.radius <= virus.radius) continue
      if (dist(c.x, c.y, virus.x, virus.y) < c.radius) {
        // Gain 100 mass then split into exactly 8 pieces
        const boostedMass = radiusToMass(c.radius) + VIRUS_MASS_BONUS
        const boostedRadius = massToRadius(boostedMass)
        const newRadius = boostedRadius / Math.sqrt(VIRUS_SPLIT_PIECES)
        const splinters: Cell[] = []
        for (let p = 0; p < VIRUS_SPLIT_PIECES; p++) {
          const angle = (p / VIRUS_SPLIT_PIECES) * Math.PI * 2
          splinters.push({
            ...c,
            id: p === 0 ? c.id : uid(),
            x: c.x + Math.cos(angle) * newRadius,
            y: c.y + Math.sin(angle) * newRadius,
            radius: newRadius,
            vx: Math.cos(angle) * SPLIT_VELOCITY * 0.7,
            vy: Math.sin(angle) * SPLIT_VELOCITY * 0.7,
            mergeTimer: MERGE_TIMER,
          })
        }
        result.splice(i, 1, ...splinters)
        break
      }
    }
  }
  return result
}

// ─── Main tick ────────────────────────────────────────────────────────────

export interface TickInput {
  state: GameState
  mouseWorldX: number
  mouseWorldY: number
}

export interface TickOutput {
  state: GameState
  scoreGained: number
}

export function tick(input: TickInput): TickOutput {
  const { mouseWorldX, mouseWorldY } = input
  let { playerCells, bots, food, viruses, score, dead, playerName } = input.state

  if (dead) return { state: input.state, scoreGained: 0 }

  // --- Move player cells ---
  playerCells = movePlayerCells(playerCells, mouseWorldX, mouseWorldY)

  // --- Virus collisions ---
  playerCells = virusInteraction(playerCells, viruses)

  // --- Separate overlapping player cells ---
  playerCells = separatePlayerCells(playerCells)

  // --- Merge ready cells ---
  playerCells = mergePlayerCells(playerCells)

  // --- Player eats food ---
  const eatResult = eatFood([...playerCells], food)
  playerCells = eatResult.cells
  food = eatResult.food
  let scoreGained = eatResult.scoreGained

  // --- Bots eat food ---
  const botEat = eatFood([...bots], food)
  bots = botEat.cells
  food = botEat.food

  // --- Player eats bots ---
  const survivingBots: Cell[] = []
  for (const bot of bots) {
    let eaten = false
    for (let i = 0; i < playerCells.length; i++) {
      if (eatCellVsCell(playerCells[i], bot)) {
        const newMass = radiusToMass(playerCells[i].radius) + radiusToMass(bot.radius)
        playerCells[i] = { ...playerCells[i], radius: Math.min(massToRadius(newMass), MAX_RADIUS) }
        scoreGained += Math.floor(radiusToMass(bot.radius) / 50)
        eaten = true
        break
      }
    }
    if (!eaten) survivingBots.push(bot)
  }
  bots = survivingBots

  // --- Bots eat player cells ---
  const survivingPlayerCells: Cell[] = []
  for (const pc of playerCells) {
    let eaten = false
    for (const bot of bots) {
      if (eatCellVsCell(bot, pc)) {
        const newMass = radiusToMass(bot.radius) + radiusToMass(pc.radius)
        const botIdx = bots.indexOf(bot)
        bots[botIdx] = { ...bot, radius: Math.min(massToRadius(newMass), MAX_RADIUS) }
        eaten = true
        break
      }
    }
    if (!eaten) survivingPlayerCells.push(pc)
  }
  playerCells = survivingPlayerCells

  // --- Player dead? ---
  if (playerCells.length === 0) {
    return {
      state: { playerCells: [], bots, food, viruses, score, dead: true, playerName },
      scoreGained: 0,
    }
  }

  // --- Bots eat each other ---
  const aliveBots: Cell[] = [...bots]
  for (let i = 0; i < aliveBots.length; i++) {
    for (let j = 0; j < aliveBots.length; j++) {
      if (i === j) continue
      if (eatCellVsCell(aliveBots[i], aliveBots[j])) {
        const newMass = radiusToMass(aliveBots[i].radius) + radiusToMass(aliveBots[j].radius)
        aliveBots[i] = { ...aliveBots[i], radius: Math.min(massToRadius(newMass), MAX_RADIUS) }
        aliveBots.splice(j, 1)
        break
      }
    }
  }
  bots = aliveBots

  // --- Bot splitting and merging ---
  bots = maybeSplitBots(bots, playerCells)
  bots = mergeBotCells(bots)

  // --- Respawn bots if too few ---
  const uniqueBotGroups = new Set(bots.map(b => b.groupId)).size
  while (uniqueBotGroups + (BOT_COUNT - uniqueBotGroups) < BOT_COUNT || bots.filter(b => {
    const count = bots.filter(x => x.groupId === b.groupId).length
    return count === 1
  }).length < BOT_COUNT) {
    if (new Set(bots.map(b => b.groupId)).size >= BOT_COUNT) break
    const idx = Math.floor(Math.random() * BOT_NAMES.length)
    const newBot = makeBot(idx)
    bots.push({ ...newBot, radius: INITIAL_PLAYER_RADIUS * (0.6 + Math.random() * 0.8) })
  }

  // --- Replenish food (maintain both normal and special ratios) ---
  const normalFood = food.filter(f => f.value === 1)
  const specialFood = food.filter(f => f.value === 5)
  if (normalFood.length < FOOD_COUNT) {
    food = [...food, ...createFood(Math.min(FOOD_COUNT - normalFood.length, 10))]
  }
  if (specialFood.length < SPECIAL_FOOD_COUNT) {
    food = [...food, ...createSpecialFood(Math.min(SPECIAL_FOOD_COUNT - specialFood.length, 4))]
  }

  // --- Move bots ---
  bots = updateBots(bots, playerCells, food)

  score += scoreGained

  return {
    state: { playerCells, bots, food, viruses, score, dead, playerName },
    scoreGained,
  }
}

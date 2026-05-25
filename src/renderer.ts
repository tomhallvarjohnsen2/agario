import { VIRUS_COLOR, WORLD_HEIGHT, WORLD_WIDTH } from './constants'
import { Cell, Food, GameState, Virus } from './types'

const GRID_SIZE = 80

export interface Camera {
  x: number
  y: number
  zoom: number
}

export function computeCamera(playerCells: Cell[], _canvas: HTMLCanvasElement): Camera {
  if (playerCells.length === 0) return { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 }

  let cx = 0, cy = 0, totalMass = 0
  for (const c of playerCells) {
    const m = c.radius * c.radius
    cx += c.x * m
    cy += c.y * m
    totalMass += m
  }
  cx /= totalMass
  cy /= totalMass

  const maxRadius = Math.max(...playerCells.map(c => c.radius))
  const zoom = Math.min(1, 100 / (maxRadius + 40))

  return { x: cx, y: cy, zoom }
}

function worldToScreen(
  wx: number, wy: number,
  cam: Camera,
  canvas: HTMLCanvasElement,
): { sx: number; sy: number } {
  const hw = canvas.width / 2
  const hh = canvas.height / 2
  return {
    sx: (wx - cam.x) * cam.zoom + hw,
    sy: (wy - cam.y) * cam.zoom + hh,
  }
}

export function screenToWorld(
  sx: number, sy: number,
  cam: Camera,
  canvas: HTMLCanvasElement,
): { wx: number; wy: number } {
  const hw = canvas.width / 2
  const hh = canvas.height / 2
  return {
    wx: (sx - hw) / cam.zoom + cam.x,
    wy: (sy - hh) / cam.zoom + cam.y,
  }
}

function isVisible(
  wx: number, wy: number, r: number,
  cam: Camera, canvas: HTMLCanvasElement,
): boolean {
  const { sx, sy } = worldToScreen(wx, wy, cam, canvas)
  const sr = r * cam.zoom
  return (
    sx + sr > -50 &&
    sy + sr > -50 &&
    sx - sr < canvas.width + 50 &&
    sy - sr < canvas.height + 50
  )
}

function drawGrid(ctx: CanvasRenderingContext2D, cam: Camera, canvas: HTMLCanvasElement) {
  ctx.save()
  ctx.strokeStyle = 'rgba(200,200,200,0.15)'
  ctx.lineWidth = 1

  const startX = Math.floor((cam.x - canvas.width / 2 / cam.zoom) / GRID_SIZE) * GRID_SIZE
  const endX = cam.x + canvas.width / 2 / cam.zoom + GRID_SIZE
  const startY = Math.floor((cam.y - canvas.height / 2 / cam.zoom) / GRID_SIZE) * GRID_SIZE
  const endY = cam.y + canvas.height / 2 / cam.zoom + GRID_SIZE

  for (let x = startX; x < endX; x += GRID_SIZE) {
    const { sx } = worldToScreen(x, 0, cam, canvas)
    ctx.beginPath()
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, canvas.height)
    ctx.stroke()
  }
  for (let y = startY; y < endY; y += GRID_SIZE) {
    const { sy } = worldToScreen(0, y, cam, canvas)
    ctx.beginPath()
    ctx.moveTo(0, sy)
    ctx.lineTo(canvas.width, sy)
    ctx.stroke()
  }
  ctx.restore()
}

function drawBorder(ctx: CanvasRenderingContext2D, cam: Camera, canvas: HTMLCanvasElement) {
  ctx.save()
  ctx.strokeStyle = '#e74c3c'
  ctx.lineWidth = 4
  const { sx: x0, sy: y0 } = worldToScreen(0, 0, cam, canvas)
  const { sx: x1, sy: y1 } = worldToScreen(WORLD_WIDTH, WORLD_HEIGHT, cam, canvas)
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
  ctx.restore()
}

function drawFood(ctx: CanvasRenderingContext2D, food: Food[], cam: Camera, canvas: HTMLCanvasElement) {
  for (const f of food) {
    if (!isVisible(f.x, f.y, f.radius, cam, canvas)) continue
    const { sx, sy } = worldToScreen(f.x, f.y, cam, canvas)
    const sr = Math.max(f.radius * cam.zoom, 2)

    if (f.value > 1) {
      // Special food: gold with glow and a star shape
      ctx.save()
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = sr * 2.5
      ctx.beginPath()
      ctx.arc(sx, sy, sr, 0, Math.PI * 2)
      ctx.fillStyle = f.color
      ctx.fill()
      // Inner bright dot
      ctx.beginPath()
      ctx.arc(sx, sy, sr * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,200,0.9)'
      ctx.fill()
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.arc(sx, sy, sr, 0, Math.PI * 2)
      ctx.fillStyle = f.color
      ctx.fill()
    }
  }
}

function drawViruses(ctx: CanvasRenderingContext2D, viruses: Virus[], cam: Camera, canvas: HTMLCanvasElement) {
  for (const v of viruses) {
    if (!isVisible(v.x, v.y, v.radius, cam, canvas)) continue
    const { sx, sy } = worldToScreen(v.x, v.y, cam, canvas)
    const sr = v.radius * cam.zoom

    // spiky outline
    ctx.save()
    ctx.translate(sx, sy)
    const spikes = 12
    ctx.beginPath()
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2
      const r = i % 2 === 0 ? sr : sr * 0.75
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
    }
    ctx.closePath()
    ctx.fillStyle = '#1a6b32'
    ctx.fill()
    ctx.strokeStyle = VIRUS_COLOR
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
}

function drawCell(ctx: CanvasRenderingContext2D, cell: Cell, cam: Camera, canvas: HTMLCanvasElement, alpha = 1) {
  if (!isVisible(cell.x, cell.y, cell.radius, cam, canvas)) return
  const { sx, sy } = worldToScreen(cell.x, cell.y, cam, canvas)
  const sr = cell.radius * cam.zoom

  ctx.save()
  ctx.globalAlpha = alpha

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = sr * 0.3

  // Cell body
  ctx.beginPath()
  ctx.arc(sx, sy, sr, 0, Math.PI * 2)
  const grad = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.05, sx, sy, sr)
  grad.addColorStop(0, lighten(cell.color, 40))
  grad.addColorStop(1, darken(cell.color, 20))
  ctx.fillStyle = grad
  ctx.fill()

  // Border
  ctx.strokeStyle = darken(cell.color, 30)
  ctx.lineWidth = Math.max(1, sr * 0.05)
  ctx.shadowBlur = 0
  ctx.stroke()

  // Name label
  if (sr > 12) {
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `bold ${Math.max(10, sr * 0.4)}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(cell.name, sx, sy)
  }

  ctx.restore()
}

// ─── Colour helpers ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`
}

function darken(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`
}

// ─── Leaderboard ──────────────────────────────────────────────────────────

export function renderLeaderboard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvas: HTMLCanvasElement,
) {
  const all: Array<{ name: string; radius: number; isPlayer: boolean }> = []

  const playerRadius = state.playerCells.reduce((s, c) => s + c.radius * c.radius, 0)
  if (state.playerCells.length > 0) {
    all.push({ name: state.playerCells[0].name, radius: Math.sqrt(playerRadius), isPlayer: true })
  }
  for (const b of state.bots) {
    all.push({ name: b.name, radius: b.radius, isPlayer: false })
  }
  all.sort((a, b) => b.radius - a.radius)
  const top = all.slice(0, 10)

  const pad = 14
  const rowH = 22
  const w = 180
  const h = pad * 2 + rowH * (top.length + 1)
  const x = canvas.width - w - 16
  const y = 16

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 8)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'left'
  ctx.fillText('Leaderboard', x + pad, y + pad + 12)

  top.forEach((entry, i) => {
    const ry = y + pad + rowH * (i + 1) + 10
    ctx.font = entry.isPlayer ? 'bold 12px Arial' : '12px Arial'
    ctx.fillStyle = entry.isPlayer ? '#f1c40f' : 'rgba(255,255,255,0.85)'
    ctx.fillText(`${i + 1}. ${entry.name}`, x + pad, ry)
  })

  ctx.restore()
}

// ─── Full render ──────────────────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  cam: Camera,
) {
  // Background
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawGrid(ctx, cam, canvas)
  drawBorder(ctx, cam, canvas)
  drawFood(ctx, state.food, cam, canvas)
  drawViruses(ctx, state.viruses, cam, canvas)

  // Draw bots
  for (const bot of state.bots) {
    drawCell(ctx, bot, cam, canvas)
  }

  // Draw player cells (on top)
  for (const pc of state.playerCells) {
    drawCell(ctx, pc, cam, canvas)
  }

  // HUD
  renderLeaderboard(ctx, state, canvas)
}

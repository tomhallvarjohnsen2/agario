import { CELL_COLORS, FOOD_COLORS, WORLD_HEIGHT, WORLD_WIDTH } from './constants'

const SPECIAL_FOOD_COLORS = ['#ffd700', '#ffb300', '#ff8c00', '#fff176', '#ffe082']

export function randomColor(palette: string[] = CELL_COLORS): string {
  return palette[Math.floor(Math.random() * palette.length)]
}

export function randomFoodColor(): string {
  return randomColor(FOOD_COLORS)
}

export function randomSpecialFoodColor(): string {
  return randomColor(SPECIAL_FOOD_COLORS)
}

export function randomPos() {
  return {
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
  }
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

export function massToRadius(mass: number): number {
  return Math.sqrt(mass / Math.PI)
}

export function radiusToMass(radius: number): number {
  return Math.PI * radius * radius
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/** Speed decreases as cell grows — power curve so large cells are noticeably slow */
export function cellSpeed(radius: number): number {
  const BASE_RADIUS = 30
  return Math.max(0.5, 5.5 * Math.pow(BASE_RADIUS / radius, 0.55))
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

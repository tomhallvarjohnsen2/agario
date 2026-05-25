export interface Vec2 {
  x: number
  y: number
}

export interface Cell {
  id: string
  x: number
  y: number
  radius: number
  color: string
  vx: number
  vy: number
  name: string
  isPlayer: boolean
  mergeTimer?: number
  groupId?: string   // links split bot cells to the same bot entity
}

export interface Food {
  id: string
  x: number
  y: number
  radius: number
  color: string
  value: number      // score awarded when eaten (1 = normal, 5 = special)
}

export interface Virus {
  id: string
  x: number
  y: number
  radius: number
}

export interface GameState {
  playerCells: Cell[]
  bots: Cell[]
  food: Food[]
  viruses: Virus[]
  score: number
  dead: boolean
  playerName: string
}

export interface MovementInput {
  x: number
  y: number
  intensity: number
  active: boolean
}

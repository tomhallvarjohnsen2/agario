export const WORLD_WIDTH = 4000
export const WORLD_HEIGHT = 4000

export const INITIAL_PLAYER_RADIUS = 30
export const MIN_RADIUS = 10
export const MAX_RADIUS = 500

export const FOOD_COUNT = 500
export const FOOD_RADIUS = 6
export const SPECIAL_FOOD_COUNT = 180   // +40% mat med 5x poeng (redusert 10%)
export const SPECIAL_FOOD_RADIUS = 10  // litt større enn vanlig mat
export const BOT_COUNT = 20

export const VIRUS_COUNT = 15
export const VIRUS_RADIUS = 52
export const VIRUS_COLOR = '#00cc44'

export const CELL_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
  '#ff5722', '#607d8b', '#795548', '#ff9800', '#673ab7',
]

export const FOOD_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b',
  '#cc5de8', '#20c997', '#f06595', '#74c0fc', '#a9e34b',
]

export const BOT_NAMES = [
  'NomNom', 'BigBoi', 'Chomper', 'Slurp', 'Gobbler',
  'Muncher', 'Fatty', 'Glutton', 'Devourer', 'Scarfer',
  'Blobfish', 'Ooze', 'Splat', 'Gloop', 'Squelch',
  'Wobble', 'Jiggle', 'Bulge', 'Lump', 'Munch',
]

export const SPLIT_VELOCITY = 18
export const MERGE_TIMER = 900   // frames before split cells can re-merge (15 sek @ 60fps)
export const EJECT_SPEED = 22
export const EJECT_MASS_FACTOR = 0.16

// Where each picture comes from in the DawnLike sheets (assets/dawnlike, left unmodified).
// Positions are in 16-pixel squares, counted from 0 at the top left of the sheet.
// Characters have two animation frames: the same square on the "0" and "1" sheet.
// Safe to edit: point a monster or tile at a different square to change how it looks.

export const sheets = {
  player: ['assets/dawnlike/Characters/Player0.png', 'assets/dawnlike/Characters/Player1.png'],
  dog: ['assets/dawnlike/Characters/Dog0.png', 'assets/dawnlike/Characters/Dog1.png'],
  floor: ['assets/dawnlike/Objects/Floor.png'],
  wall: ['assets/dawnlike/Objects/Wall.png'],
  decor: ['assets/dawnlike/Objects/Decor0.png'],
  ground: ['assets/dawnlike/Objects/Ground0.png'],
  tree: ['assets/dawnlike/Objects/Tree0.png'],
  hill: ['assets/dawnlike/Objects/Hill0.png'],
};

// Monsters and other creatures.
export const sprites = {
  'goblin-minion': { sheet: 'player', col: 5, row: 14 },
  'goblin-warrior': { sheet: 'player', col: 0, row: 14 },
  wolf: { sheet: 'dog', col: 0, row: 1 },
};

// Floor tiles and things that stand on them. alpha (0 to 1) draws a picture faded, and
// lying: true turns it on its side, like a fallen creature.
export const tiles = {
  'wood-floor': { sheet: 'floor', col: 1, row: 28 },
  'flour-sack': { sheet: 'decor', col: 0, row: 9 },
  barrel: { sheet: 'decor', col: 4, row: 9 },
  grass: { sheet: 'floor', col: 8, row: 7 },
  dirt: { sheet: 'floor', col: 1, row: 19 },
  bracken: { sheet: 'ground', col: 2, row: 1 },
  tree: { sheet: 'tree', col: 3, row: 3 },
  'dead-tree': { sheet: 'tree', col: 9, row: 3 },
  boulder: { sheet: 'hill', col: 3, row: 0 },
  bones: { sheet: 'decor', col: 1, row: 12 },
  'goblin-body': { sheet: 'player', col: 5, row: 14, alpha: 0.6, lying: true },
};

// Walls join up with their neighbours. Each wall style is a block of tiles in DawnLike's
// layout, starting at (col, row); wallPiece below picks the tile within the block.
export const wallStyles = {
  stone: { sheet: 'wall', col: 0, row: 6 },
  wood: { sheet: 'wall', col: 0, row: 39 },
  rock: { sheet: 'wall', col: 7, row: 18 },
};

// Which tile of a wall block to use, by which neighbours are walls too (N, E, S, W).
// Offsets are [col, row] within the block.
export const wallPieces = {
  '': [3, 0], // a lone pillar
  N: [0, 1],
  S: [0, 1],
  NS: [0, 1],
  E: [1, 0],
  W: [1, 0],
  EW: [1, 0],
  ES: [0, 0],
  SW: [2, 0],
  NE: [0, 2],
  NW: [2, 2],
  ESW: [4, 0],
  NES: [3, 1],
  NSW: [5, 1],
  NEW: [4, 2],
  NESW: [4, 1],
};

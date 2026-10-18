// Where each picture comes from in the DawnLike sheets (assets/dawnlike, left unmodified).
// Positions are in 16-pixel squares, counted from 0 at the top left of the sheet.
// Characters have two animation frames: the same square on the "0" and "1" sheet.
// Safe to edit: point a monster or tile at a different square to change how it looks.

export const sheets = {
  player: ['assets/dawnlike/Characters/Player0.png', 'assets/dawnlike/Characters/Player1.png'],
  dog: ['assets/dawnlike/Characters/Dog0.png', 'assets/dawnlike/Characters/Dog1.png'],
  undead: ['assets/dawnlike/Characters/Undead0.png', 'assets/dawnlike/Characters/Undead1.png'],
  humanoid: ['assets/dawnlike/Characters/Humanoid0.png', 'assets/dawnlike/Characters/Humanoid1.png'],
  pest: ['assets/dawnlike/Characters/Pest0.png', 'assets/dawnlike/Characters/Pest1.png'],
  cat: ['assets/dawnlike/Characters/Cat0.png', 'assets/dawnlike/Characters/Cat1.png'],
  quadraped: ['assets/dawnlike/Characters/Quadraped0.png', 'assets/dawnlike/Characters/Quadraped1.png'],
  floor: ['assets/dawnlike/Objects/Floor.png'],
  wall: ['assets/dawnlike/Objects/Wall.png'],
  decor: ['assets/dawnlike/Objects/Decor0.png'],
  ground: ['assets/dawnlike/Objects/Ground0.png'],
  tree: ['assets/dawnlike/Objects/Tree0.png'],
  hill: ['assets/dawnlike/Objects/Hill0.png'],
  pit: ['assets/dawnlike/Objects/Pit0.png'],
  map: ['assets/dawnlike/Objects/Map0.png'],
  effect: ['assets/dawnlike/Objects/Effect0.png'],
  door: ['assets/dawnlike/Objects/Door0.png'],
  trap: ['assets/dawnlike/Objects/Trap0.png'],
  tile: ['assets/dawnlike/Objects/Tile.png'],
};

// Monsters and other creatures.
export const sprites = {
  'goblin-minion': { sheet: 'player', col: 5, row: 14 },
  'goblin-warrior': { sheet: 'player', col: 0, row: 14 },
  wolf: { sheet: 'dog', col: 0, row: 1 },
  'goblin-boss': { sheet: 'player', col: 6, row: 14 },
  zombie: { sheet: 'undead', col: 1, row: 0 },
  skeleton: { sheet: 'undead', col: 0, row: 2 },
  cultist: { sheet: 'humanoid', col: 4, row: 7 },
  ghoul: { sheet: 'undead', col: 0, row: 0 },
  bandit: { sheet: 'player', col: 3, row: 4 },
  'bandit-captain': { sheet: 'player', col: 5, row: 3 },
  guard: { sheet: 'player', col: 1, row: 3 }, // a soldier in grey mail
  'cultist-fanatic': { sheet: 'player', col: 7, row: 3 }, // a red-hooded figure, face in shadow
  'animated-armor': { sheet: 'humanoid', col: 3, row: 4 }, // plate and a closed helm, sword and shield
  'ogre-zombie': { sheet: 'undead', col: 6, row: 0 }, // a great hulking zombie
  wight: { sheet: 'undead', col: 1, row: 2 }, // a skeletal knight in blue and gold
  cantor: { sheet: 'humanoid', col: 2, row: 7 }, // Cantor Vesk: a heavy hooded figure in grey
  stirge: { sheet: 'pest', col: 5, row: 1 }, // a little red bloodsucker with blue wings and a long nose
  gnoll: { sheet: 'humanoid', col: 0, row: 21 }, // a hunched brown beast-man with a muzzle
  'giant-hyena': { sheet: 'dog', col: 1, row: 2 }, // a big spotted brown dog
  scout: { sheet: 'player', col: 2, row: 7 }, // a woodsman in green
  specter: { sheet: 'undead', col: 0, row: 6, alpha: 0.8 }, // a grey hooded shape, thin as smoke, trailing wisps
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
  'cave-floor': { sheet: 'floor', col: 1, row: 22 },
  rubble: { sheet: 'ground', col: 4, row: 1 },
  crates: { sheet: 'decor', col: 3, row: 9 },
  throne: { sheet: 'decor', col: 6, row: 7 },
  furs: { sheet: 'decor', col: 7, row: 9 },
  // Goblins who watch a fight without joining it (they stand in the way, though).
  'goblin-onlooker': { sheet: 'player', col: 0, row: 14 },
  'goblin-archer-onlooker': { sheet: 'player', col: 4, row: 14 },
  'goblin-runt-onlooker': { sheet: 'player', col: 5, row: 14 },
  'crypt-floor': { sheet: 'floor', col: 8, row: 22 },
  bier: { sheet: 'decor', col: 6, row: 10 },
  'bone-pile': { sheet: 'decor', col: 0, row: 13 },
  // Chapter 2: the old ossuary under Dunn's Mill, and Bramblegate's market square.
  coffin: { sheet: 'decor', col: 7, row: 10 },
  gravestone: { sheet: 'decor', col: 1, row: 17 },
  skull: { sheet: 'decor', col: 0, row: 12 },
  cobbles: { sheet: 'floor', col: 15, row: 7 },
  stocks: { sheet: 'decor', col: 0, row: 11 },
  // The Old Ford: the river's deep water, and the shallow water of the ford itself (from the
  // water-filled pits, with no rim).
  'deep-water': { sheet: 'pit', col: 1, row: 15 },
  ford: { sheet: 'pit', col: 1, row: 9 },
  // Cairnfield: the barrow mounds on the moor, a barrow the dead have opened (a dug pit), the
  // Choir's tents (from the world-map pictures) and their campfire.
  barrow: { sheet: 'hill', col: 7, row: 3 },
  'open-barrow': { sheet: 'pit', col: 4, row: 4 },
  tent: { sheet: 'map', col: 6, row: 12 },
  campfire: { sheet: 'effect', col: 1, row: 21 },
  // Chapter 3: the Kings' Barrow's great gate, a sealing stone between grey stone doorposts.
  'sealing-stone': { sheet: 'door', col: 0, row: 1 },
  // The upper barrow: a pressure plate once it's found (a dart on a plate), and the shut way
  // through the oath-wall (a sealed door in a gilt frame).
  'dart-plate': { sheet: 'trap', col: 1, row: 0 },
  'oath-door': { sheet: 'door', col: 4, row: 1 },
  // The deep barrow: the great sluice wheel in the flooded vault (DawnLike has no water wheel,
  // so a segmented blue ring stands in for it), the iron grille of its sluice gate, and the
  // stair down that the water hid until the vault is drained.
  'sluice-wheel': { sheet: 'effect', col: 4, row: 24 },
  'sluice-gate': { sheet: 'decor', col: 1, row: 21 },
  'stair-down': { sheet: 'tile', col: 1, row: 1 },
  // The Chantry of Ash: the Choir's altar, and the slab of Dame Aveline's tomb.
  altar: { sheet: 'decor', col: 0, row: 20 },
  'tomb-slab': { sheet: 'decor', col: 2, row: 20 },
  // Act I's side quests: the Tallow and Thistle's hayloft (bales of hay, the ladder hatch, and
  // the inn's cats up on the cross-beams), and the wolves' den in the rocks up the north road.
  'hay-bale': { sheet: 'decor', col: 6, row: 9 },
  hatch: { sheet: 'tile', col: 1, row: 1 },
  'grey-cat': { sheet: 'cat', col: 0, row: 3 },
  'ginger-cat': { sheet: 'cat', col: 0, row: 1 },
  'black-cat': { sheet: 'cat', col: 2, row: 0 },
  'white-cat': { sheet: 'cat', col: 0, row: 2 },
  // Dabbin's cart on the barrow road (Hob's ore): its pony, Parsnip, in the shafts. The cart
  // itself is drawn as its load: crates, sacks and a barrel.
  pony: { sheet: 'quadraped', col: 0, row: 4 },
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

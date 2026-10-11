// Encounters (original): authored fights. A scene starts one with a choice tagged
// #combat:encounter-id. Each has a map, 8 squares wide, where the hero and the monsters start.
//
//   difficulty   from the 2024 encounter budget (Low, Moderate, High, or Deadly beyond High)
//                for the party the scene expects, noted here so the fight can be checked
//   sizedFor     that party: { level, party } (the hero's level, and how many characters:
//                1 for a hero alone). A check makes sure the difficulty's first word matches
//                the budget. The fight card itself rates the fight for the hero's party as it
//                is when they choose it (combat/difficulty.js).
//   map.rows     one letter per square; map.legend says what each letter is:
//                  terrain 'floor', 'wall', 'obstacle' (blocks movement) or 'difficult'
//                  (costs double to cross)
//                  tile / decor / wall: pictures from data/campaign/sprites.js
//                or map: { dungeon, room }: the fight is in that room of a dungeon map
//                (data/campaign/dungeons.js), and positions count from the room's top row
//   hero         where the hero starts; monsters: each one and where it starts ({ x, y }),
//                with a name if it has its own (Mother Nettle)
//   onlookers    figures who watch but don't fight: { decor, pos }, or someone from
//                data/campaign/people.js: { person, pos, lying }. They stand in the way, and
//                nobody fights them
//   hymn         a monster sings while it fights (the Ashen Choir): { singer: monster id,
//                rises: { monster, pos }, round }. Unless the singing stops first, the
//                monster rises at pos at the start of that round. Damage makes the singer
//                save (Constitution, DC 10 or half the damage) or the hymn breaks off.
//   escape       squares a fleeing monster can leave the fight by (it flees once Bloodied,
//                at half its Hit Points or fewer)
//   whileHeroDown  what each monster does on its turn while the hero lies at 0 Hit Points
//                ({name} is the monster's name). These foes don't finish off a fallen hero:
//                the hero's death saves decide it.
//   byHand       true for a story or boss fight: it's always played by hand, never offered
//                Resolve (a fight with a hymn never is either)

// Dunn's Mill: a stone cellar with a plank floor, flour sacks and a barrel.
const millLegend = {
  '#': { terrain: 'wall', wall: 'stone' },
  '.': { terrain: 'floor', tile: 'wood-floor' },
  s: { terrain: 'obstacle', tile: 'wood-floor', decor: 'flour-sack' },
  b: { terrain: 'obstacle', tile: 'wood-floor', decor: 'barrel' },
};

// Bramblegate's market square (Chapter 2): cobbles, the stocks, market barrels and crates,
// with house walls at the corners.
const squareLegend = {
  '#': { terrain: 'wall', wall: 'wood' },
  '.': { terrain: 'floor', tile: 'cobbles' },
  s: { terrain: 'obstacle', tile: 'cobbles', decor: 'stocks' },
  b: { terrain: 'obstacle', tile: 'cobbles', decor: 'barrel' },
  x: { terrain: 'obstacle', tile: 'cobbles', decor: 'crates' },
};

// The quarry road: a dirt road through grass, trees and bracken, up to the quarry's rock face.
const roadLegend = {
  R: { terrain: 'wall', wall: 'rock' },
  ',': { terrain: 'floor', tile: 'grass' },
  '.': { terrain: 'floor', tile: 'dirt' },
  '"': { terrain: 'difficult', tile: 'grass', decor: 'bracken' },
  T: { terrain: 'obstacle', tile: 'grass', decor: 'tree' },
  D: { terrain: 'obstacle', tile: 'grass', decor: 'dead-tree' },
  o: { terrain: 'obstacle', tile: 'grass', decor: 'boulder' },
  g: { terrain: 'floor', tile: 'dirt', decor: 'goblin-body' },
  b: { terrain: 'floor', tile: 'grass', decor: 'bones' },
};

export const encounters = [
  {
    id: 'mill-scavengers',
    name: 'Scavengers at Dunn’s Mill',
    difficulty: 'Low (50 XP budget for one level 1 hero)',
    sizedFor: { level: 1, party: 1 },
    map: {
      rows: [
        '########',
        '#s....s#',
        '#......#',
        '#..b...#',
        '#.....s#',
        '#.s....#',
        '#......#',
        '###..###',
      ],
      legend: millLegend,
    },
    hero: { x: 3, y: 1 },
    monsters: [
      { monster: 'goblin-minion', pos: { x: 3, y: 7 } },
      { monster: 'goblin-minion', pos: { x: 4, y: 7 } },
    ],
    whileHeroDown: '{name} rummages through the flour sacks.',
    source: 'original',
  },
  {
    id: 'quarry-wolf',
    name: 'The Wolf on the Quarry Road',
    difficulty: 'Low (50 XP budget for one level 1 hero; one Wolf is 50 XP)',
    sizedFor: { level: 1, party: 1 },
    map: {
      rows: [
        'RRR..RRR',
        'o,,..,"R',
        ',",g.,b,',
        'T,,..,,,',
        ',,,..,"D',
        'D",..,,,',
        ',,,..,oT',
        'T,,..,,,',
        ',,,..,,T',
      ],
      legend: roadLegend,
    },
    hero: { x: 3, y: 8 },
    monsters: [{ monster: 'wolf', pos: { x: 4, y: 2 } }],
    whileHeroDown: '{name} goes back to tearing at the dead goblin.',
    source: 'original',
  },
  {
    id: 'warren-lookout',
    name: 'The Lookout at Brackenhollow',
    difficulty: 'Low (50 XP budget for one level 1 hero; one Goblin Warrior is 50 XP)',
    sizedFor: { level: 1, party: 1 },
    map: { dungeon: 'brackenhollow', room: 'mouth' },
    hero: { x: 3, y: 0 },
    monsters: [{ monster: 'goblin-warrior', name: 'Goblin Lookout', pos: { x: 5, y: 4 } }],
    whileHeroDown: '{name} shrieks down into the warren for help.',
    source: 'original',
  },
  {
    id: 'nettle-duel',
    name: 'Single Combat with Mother Nettle',
    difficulty: 'High (200 XP budget for one level 2 hero; a Goblin Boss is 200 XP)',
    sizedFor: { level: 2, party: 1 },
    byHand: true,
    map: { dungeon: 'brackenhollow', room: 'hall' },
    hero: { x: 3, y: 1 },
    monsters: [{ monster: 'goblin-boss', name: 'Mother Nettle', pos: { x: 3, y: 6 } }],
    onlookers: [
      { decor: 'goblin-onlooker', pos: { x: 1, y: 2 } },
      { decor: 'goblin-archer-onlooker', pos: { x: 6, y: 2 } },
      { decor: 'goblin-runt-onlooker', pos: { x: 1, y: 5 } },
      { decor: 'goblin-onlooker', pos: { x: 6, y: 5 } },
      { decor: 'goblin-runt-onlooker', pos: { x: 2, y: 7 } },
      { decor: 'goblin-archer-onlooker', pos: { x: 5, y: 7 } },
    ],
    whileHeroDown: '{name} lowers her scimitar and waits, as the old law says.',
    source: 'original',
  },
  {
    id: 'nettle-band',
    name: 'Nettle’s Whole Band',
    difficulty: 'Deadly: far beyond High (a Goblin Boss, three Goblin Warriors and two Goblin Minions are 400 XP; High for one level 2 hero is 200)',
    sizedFor: { level: 2, party: 1 },
    byHand: true,
    map: { dungeon: 'brackenhollow', room: 'hall' },
    hero: { x: 3, y: 1 },
    monsters: [
      { monster: 'goblin-boss', name: 'Mother Nettle', pos: { x: 3, y: 6 } },
      { monster: 'goblin-warrior', pos: { x: 1, y: 5 } },
      { monster: 'goblin-warrior', pos: { x: 6, y: 5 } },
      { monster: 'goblin-warrior', pos: { x: 4, y: 6 } },
      { monster: 'goblin-minion', pos: { x: 1, y: 2 } },
      { monster: 'goblin-minion', pos: { x: 6, y: 2 } },
    ],
    whileHeroDown: '{name} stands over you, jeering.',
    source: 'original',
  },
  {
    id: 'lower-dead',
    name: 'The Dead in the Lower Warren',
    difficulty: 'Moderate (150 XP budget for one level 2 hero; three Zombies are 150 XP)',
    sizedFor: { level: 2, party: 1 },
    map: { dungeon: 'brackenhollow', room: 'lower' },
    hero: { x: 5, y: 1 },
    monsters: [
      { monster: 'zombie', pos: { x: 1, y: 2 } },
      { monster: 'zombie', pos: { x: 1, y: 4 } },
      { monster: 'zombie', pos: { x: 2, y: 5 } },
    ],
    whileHeroDown: '{name} turns back to the wall and goes on digging.',
    source: 'original',
  },
  {
    id: 'breach-hymn',
    name: 'The Hymn at the Breach',
    difficulty: 'Low, rising to Moderate if the hymn raises a second Skeleton (a Cultist and a Skeleton are 75 XP, then 125; for one level 2 hero Low is 100 and Moderate 150)',
    sizedFor: { level: 2, party: 1 },
    byHand: true,
    map: { dungeon: 'brackenhollow', room: 'breach' },
    hero: { x: 3, y: 1 },
    monsters: [
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 4, y: 5 } },
      { monster: 'skeleton', pos: { x: 3, y: 3 } },
    ],
    hymn: { singer: 'cultist', rises: { monster: 'skeleton', pos: { x: 5, y: 3 } }, round: 3 },
    escape: [
      { x: 3, y: 7 },
      { x: 4, y: 7 },
    ],
    whileHeroDown: '{name} stands over you, waiting for the hymn to finish.',
    source: 'original',
  },
  // ---- Chapter 2 ----
  // Lark's rescue: two Ghouls among the coffins of the old ossuary the dead dug open under the
  // mill (the last room of the dungeon under Dunn's Mill). The party comes in by the doorway at
  // the top; Lark lies Paralyzed on a burial ledge in the far wall, out of the fight.
  {
    id: 'ossuary-ghouls',
    name: 'The Ghouls in the Ossuary',
    difficulty: 'Moderate (two Ghouls are 400 XP; for a level 3 hero and Odda, Low is 300 and Moderate 450)',
    sizedFor: { level: 3, party: 2 },
    map: { dungeon: 'mill-ossuary', room: 'ossuary' },
    hero: { x: 3, y: 1 },
    monsters: [
      { monster: 'ghoul', pos: { x: 4, y: 7 } },
      { monster: 'ghoul', pos: { x: 2, y: 6 } },
    ],
    onlookers: [{ person: 'lark', pos: { x: 4, y: 8 }, lying: true }],
    whileHeroDown: '{name} crouches among the bones and gnaws at something you’d rather not see.',
    source: 'original',
  },
  // Fen in the stocks: Mercy Gaunt's bounty hunters come for him across the market square.
  // Choosing to fight frees Fen first (story/act-1/ch2-stocks.ink), so he starts beside you.
  {
    id: 'stocks-hunters',
    name: 'Bounty Hunters at the Stocks',
    difficulty: 'Moderate (a Bandit Captain and two Bandits are 500 XP; for a level 3 party of three, with Fen fighting beside you, Low is 450 and Moderate 675. For two it would be High)',
    sizedFor: { level: 3, party: 3 },
    map: {
      rows: [
        '##....##',
        '#......#',
        '#..s...#',
        'x......b',
        '........',
        '.b......',
        '......xx',
        '##....##',
      ],
      legend: squareLegend,
    },
    hero: { x: 3, y: 5 },
    monsters: [
      { monster: 'bandit-captain', name: 'Mercy Gaunt', pos: { x: 4, y: 1 } },
      { monster: 'bandit', pos: { x: 1, y: 1 } },
      { monster: 'bandit', pos: { x: 6, y: 1 } },
    ],
    whileHeroDown: '{name} steps over you, and looks round for the halfling.',
    source: 'original',
  },
];

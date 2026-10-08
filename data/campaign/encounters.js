// Encounters (original): authored fights. A scene starts one with a choice tagged
// #combat:encounter-id. Each has a map, 8 squares wide, where the hero and the monsters start.
//
//   difficulty   from the 2024 encounter budget (Low, Moderate, High) for a lone hero of
//                the level the scene expects; noted here so the fight can be checked
//   map.rows     one letter per square; map.legend says what each letter is:
//                  terrain 'floor', 'wall', 'obstacle' (blocks movement) or 'difficult'
//                  (costs double to cross)
//                  tile / decor / wall: pictures from data/campaign/sprites.js
//   hero         where the hero starts; monsters: each one and where it starts ({ x, y })
//   whileHeroDown  what each monster does on its turn while the hero lies at 0 Hit Points
//                ({name} is the monster's name). These foes don't finish off a fallen hero:
//                the hero's death saves decide it.

// Dunn's Mill: a stone cellar with a plank floor, flour sacks and a barrel.
const millLegend = {
  '#': { terrain: 'wall', wall: 'stone' },
  '.': { terrain: 'floor', tile: 'wood-floor' },
  s: { terrain: 'obstacle', tile: 'wood-floor', decor: 'flour-sack' },
  b: { terrain: 'obstacle', tile: 'wood-floor', decor: 'barrel' },
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
];

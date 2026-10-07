// Encounters (original): authored fights. A scene starts one with a choice tagged
// #combat:encounter-id. Each has a map, 8 squares wide, where the hero and the monsters start.
//
//   difficulty   from the 2024 encounter budget (Low, Moderate, High) for a lone hero of
//                the level the scene expects; noted here so the fight can be checked
//   map.rows     one letter per square; map.legend says what each letter is:
//                  terrain 'floor', 'wall', 'obstacle' (blocks movement) or 'difficult'
//                  tile / decor / wall: pictures from data/campaign/sprites.js
//   hero         where the hero starts; monsters: each one and where it starts ({ x, y })

const legend = {
  '#': { terrain: 'wall', wall: 'stone' },
  '.': { terrain: 'floor', tile: 'wood-floor' },
  s: { terrain: 'obstacle', tile: 'wood-floor', decor: 'flour-sack' },
  b: { terrain: 'obstacle', tile: 'wood-floor', decor: 'barrel' },
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
      legend,
    },
    hero: { x: 3, y: 1 },
    monsters: [
      { monster: 'goblin-minion', pos: { x: 3, y: 7 } },
      { monster: 'goblin-minion', pos: { x: 4, y: 7 } },
    ],
    source: 'original',
  },
];

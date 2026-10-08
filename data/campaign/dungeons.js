// Dungeons (original): maps explored room by room (docs/DESIGN.md, "Dungeons"). A dungeon is
// one tall map, 8 squares wide, drawn with the same tiles as the battle grid. Each room is a
// band of its rows; the map shows a room once the hero has been in it, and fights in a room
// are played on that band of the map.
//
//   rows, legend     the whole map, as for encounters (data/campaign/encounters.js)
//   rooms            each room:
//     id, name       a scene enters it with the line tag #room:dungeon-id/room-id
//     rows           [first, last]: the band of map rows the room covers, walls included
//                    (neighbouring rooms share the row their doorway is in)
//     entry          where the hero stands on arriving ({ x, y } on the whole map)
//     exits          doorways: { room-id: [{ x, y }, …] }; a choice tagged #go:room-id lights
//                    them up, and tapping one takes that choice

const warrenLegend = {
  '#': { terrain: 'wall', wall: 'rock' },
  ',': { terrain: 'floor', tile: 'grass' },
  ':': { terrain: 'floor', tile: 'dirt' },
  '%': { terrain: 'difficult', tile: 'grass', decor: 'rubble' },
  o: { terrain: 'obstacle', tile: 'grass', decor: 'boulder' },
  '.': { terrain: 'floor', tile: 'cave-floor' },
  '=': { terrain: 'difficult', tile: 'cave-floor', decor: 'rubble' },
  x: { terrain: 'floor', tile: 'cave-floor', decor: 'bones' },
  s: { terrain: 'obstacle', tile: 'cave-floor', decor: 'flour-sack' },
  c: { terrain: 'obstacle', tile: 'cave-floor', decor: 'crates' },
  T: { terrain: 'obstacle', tile: 'cave-floor', decor: 'throne' },
  f: { terrain: 'floor', tile: 'cave-floor', decor: 'furs' },
  // The breach: dressed stone, part of the old barrow tunnels.
  S: { terrain: 'wall', wall: 'stone' },
  z: { terrain: 'floor', tile: 'crypt-floor' },
  n: { terrain: 'floor', tile: 'crypt-floor', decor: 'bones' },
  k: { terrain: 'floor', tile: 'crypt-floor', decor: 'bone-pile' },
  B: { terrain: 'obstacle', tile: 'crypt-floor', decor: 'bier' },
};

export const dungeons = [
  {
    id: 'brackenhollow',
    name: 'Brackenhollow warren',
    rows: [
      // The quarry mouth (rows 0–5): the quarry floor, and the warren's door in the cliff.
      ',,o::,,%',
      '%,,::,,,',
      ',,,::,%,',
      'o%,::,,,',
      '##%..%##',
      '###..###',
      // The pit passage (rows 5–11).
      '##...###',
      '##.....#',
      '###..###',
      '###.x###',
      '##...###',
      '##..####',
      // The larder (rows 11–16).
      '#s....s#',
      '#s....c#',
      '#ss...s#',
      '#....ss#',
      '###..###',
      // Nettle's hall (rows 16–24). The way down to the lower warren is at the bottom right.
      '#......#',
      '#.x..f.#',
      '#......#',
      '#......#',
      '#....x.#',
      '#f.....#',
      '#..T..c#',
      '#####..#',
      // The lower warren (rows 24–30): the goblins' deep halls, where the dead dig.
      '###....#',
      '#.....=#',
      '#.=....#',
      '#....=.#',
      '#=.....#',
      '###..###',
      // The breach (rows 30–37): the warren breaks into a barrow crypt. Its far door leads on
      // into the barrow tunnels.
      'SSzzzzSS',
      'SzzzzzzS',
      'SnzzzkzS',
      'SzzzBzzS',
      'SnzzzzzS',
      'SzzzzzzS',
      'SSSzzSSS',
    ],
    legend: warrenLegend,
    rooms: [
      { id: 'mouth', name: 'The quarry mouth', rows: [0, 5], entry: { x: 3, y: 0 }, exits: { pit: [{ x: 3, y: 5 }, { x: 4, y: 5 }] } },
      { id: 'pit', name: 'The pit passage', rows: [5, 11], entry: { x: 3, y: 6 }, exits: { larder: [{ x: 2, y: 11 }, { x: 3, y: 11 }] } },
      { id: 'larder', name: 'The larder', rows: [11, 16], entry: { x: 3, y: 12 }, exits: { hall: [{ x: 3, y: 16 }, { x: 4, y: 16 }] } },
      { id: 'hall', name: 'Nettle’s hall', rows: [16, 24], entry: { x: 3, y: 17 }, exits: { lower: [{ x: 5, y: 24 }, { x: 6, y: 24 }] } },
      {
        id: 'lower',
        name: 'The lower warren',
        rows: [24, 30],
        entry: { x: 5, y: 25 },
        exits: { hall: [{ x: 5, y: 24 }, { x: 6, y: 24 }], breach: [{ x: 3, y: 30 }, { x: 4, y: 30 }] },
      },
      { id: 'breach', name: 'The breach', rows: [30, 37], entry: { x: 3, y: 31 }, exits: { lower: [{ x: 3, y: 30 }, { x: 4, y: 30 }] } },
    ],
    source: 'original',
  },
];

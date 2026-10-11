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
//     figures        who the hero finds in the room, drawn on the map:
//                      sprite   a picture from data/campaign/sprites.js (sprites or tiles)
//                      person   or someone from data/campaign/people.js, drawn as they look
//                               in scenes (Lark Dunn)
//                      pos      where they stand ({ x, y } on the whole map); for a room with
//                               a fight, the same squares the encounter starts them on
//                      name     for screen readers ("Mother Nettle")
//                      lying    true if they lie down (Lark, Paralyzed on her ledge)
//                      goneOn   story flags: once any is set, they've left (fled, scattered)
//                      fallenOn story flags: once any is set, they lie where they fell
//
// The party: companions with the hero stand beside them on the map, on the free squares
// nearest the room's entry, as they do at the start of a fight.

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

// Nettle's band leaves the hall for good if the hero breaks it.
const band = ['goblins_slain'];

// Under Dunn's Mill (Chapter 2): the mill's cellar, then the old stone tunnels the dead dug
// clear, the bone niches the Choir emptied, and the ossuary.
const millLegend = {
  // The cellar: a plank floor, flour sacks and a barrel, and the rubble dug out of the hole.
  '#': { terrain: 'wall', wall: 'stone' },
  w: { terrain: 'floor', tile: 'wood-floor' },
  s: { terrain: 'obstacle', tile: 'wood-floor', decor: 'flour-sack' },
  b: { terrain: 'obstacle', tile: 'wood-floor', decor: 'barrel' },
  r: { terrain: 'difficult', tile: 'wood-floor', decor: 'rubble' },
  // The old tunnels and the ossuary: dressed stone, coffins, grave markers and bones.
  '.': { terrain: 'floor', tile: 'crypt-floor' },
  '=': { terrain: 'difficult', tile: 'crypt-floor', decor: 'rubble' },
  x: { terrain: 'floor', tile: 'crypt-floor', decor: 'bones' },
  k: { terrain: 'floor', tile: 'crypt-floor', decor: 'skull' },
  c: { terrain: 'obstacle', tile: 'crypt-floor', decor: 'coffin' },
  g: { terrain: 'obstacle', tile: 'crypt-floor', decor: 'gravestone' },
  p: { terrain: 'obstacle', tile: 'crypt-floor', decor: 'bone-pile' },
  R: { terrain: 'obstacle', tile: 'crypt-floor', decor: 'rubble' }, // an old door, filled with rubble
  // Lark's ledge: a burial niche in the ossuary's far wall. In the fight she lies on it, and
  // nobody can step there (encounters.js).
  L: { terrain: 'floor', tile: 'crypt-floor' },
};

// The ghouls lie where they fell once beaten, and are gone if they were driven off.
const ghoulsBeaten = ['ossuary_ghouls_destroyed'];
const ghoulsFled = ['ossuary_ghouls_fled'];

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
      {
        id: 'mouth',
        name: 'The quarry mouth',
        rows: [0, 5],
        entry: { x: 3, y: 0 },
        exits: { pit: [{ x: 3, y: 5 }, { x: 4, y: 5 }] },
        // The lookout on its ledge above the door.
        figures: [{ sprite: 'goblin-warrior', pos: { x: 5, y: 4 }, name: 'a goblin lookout', goneOn: ['warren_lookout_talked'], fallenOn: ['warren_lookout_killed', 'warren_lookout_spared'] }],
      },
      { id: 'pit', name: 'The pit passage', rows: [5, 11], entry: { x: 3, y: 6 }, exits: { larder: [{ x: 2, y: 11 }, { x: 3, y: 11 }] } },
      { id: 'larder', name: 'The larder', rows: [11, 16], entry: { x: 3, y: 12 }, exits: { hall: [{ x: 3, y: 16 }, { x: 4, y: 16 }] } },
      {
        id: 'hall',
        name: 'Nettle’s hall',
        rows: [16, 24],
        entry: { x: 3, y: 17 },
        exits: { lower: [{ x: 5, y: 24 }, { x: 6, y: 24 }] },
        // Nettle before her throne, her warriors round her and the rest of the band behind:
        // where the fights with her start them.
        figures: [
          { sprite: 'goblin-boss', pos: { x: 3, y: 22 }, name: 'Mother Nettle', goneOn: band },
          { sprite: 'goblin-warrior', pos: { x: 1, y: 21 }, name: 'goblin warriors', goneOn: band },
          { sprite: 'goblin-warrior', pos: { x: 6, y: 21 }, name: 'goblin warriors', goneOn: band },
          { sprite: 'goblin-warrior', pos: { x: 4, y: 22 }, name: 'goblin warriors', goneOn: band },
          { sprite: 'goblin-minion', pos: { x: 1, y: 18 }, name: 'goblins', goneOn: band },
          { sprite: 'goblin-minion', pos: { x: 6, y: 18 }, name: 'goblins', goneOn: band },
          { sprite: 'goblin-runt-onlooker', pos: { x: 1, y: 23 }, name: 'goblins', goneOn: band },
          { sprite: 'goblin-runt-onlooker', pos: { x: 5, y: 23 }, name: 'goblins', goneOn: band },
        ],
      },
      {
        id: 'lower',
        name: 'The lower warren',
        rows: [24, 30],
        entry: { x: 5, y: 25 },
        exits: { hall: [{ x: 5, y: 24 }, { x: 6, y: 24 }], breach: [{ x: 3, y: 30 }, { x: 4, y: 30 }] },
        // Three of the old dead, digging at the wall.
        figures: [
          { sprite: 'zombie', pos: { x: 1, y: 26 }, name: 'the dead, digging', fallenOn: ['lower_dead_destroyed', 'lower_dead_stilled'] },
          { sprite: 'zombie', pos: { x: 1, y: 28 }, name: 'the dead, digging', fallenOn: ['lower_dead_destroyed', 'lower_dead_stilled'] },
          { sprite: 'zombie', pos: { x: 2, y: 29 }, name: 'the dead, digging', fallenOn: ['lower_dead_destroyed', 'lower_dead_stilled'] },
        ],
      },
      {
        id: 'breach',
        name: 'The breach',
        rows: [30, 37],
        entry: { x: 3, y: 31 },
        exits: { lower: [{ x: 3, y: 30 }, { x: 4, y: 30 }] },
        // The Choir acolyte singing by the bier, and the skeleton he's raising.
        figures: [
          { sprite: 'cultist', pos: { x: 4, y: 35 }, name: 'a singer in a grey robe', goneOn: ['acolyte_caught', 'acolyte_escaped'] },
          { sprite: 'skeleton', pos: { x: 3, y: 33 }, name: 'a skeleton', fallenOn: ['acolyte_caught', 'acolyte_escaped'] },
        ],
      },
    ],
    source: 'original',
  },
  {
    id: 'mill-ossuary',
    name: 'Under Dunn’s Mill',
    rows: [
      // The cellar (rows 0–6): the stairs up into the mill at the top, and the hole in the
      // floor at the bottom, dug clear from below.
      '###ww###',
      '#swwwws#',
      '#wwwwww#',
      '#wbwwws#',
      '#swwwww#',
      '#wwwrrw#',
      '####..##',
      // The old tunnel (rows 6–12): fitted stone, sloping down, with the spoil the dead dug out.
      '####..##',
      '###..###',
      '##..=###',
      '##..####',
      '###..###',
      '###..###',
      // The bone niches (rows 12–18): coffins dragged out of the walls and pried open.
      '#c....c#',
      '#k..p..#',
      '#c..x.k#',
      '#..c...#',
      '#g.x..c#',
      '###..###',
      // The ossuary (rows 18–26): skulls stacked to the roof, and Lark's ledge in the far wall.
      '#......#',
      '#.k...g#',
      '##....##',
      'R......#',
      '#.p..k.#',
      '#......#',
      '#c.k.gc#',
      '####L###',
    ],
    legend: millLegend,
    rooms: [
      { id: 'cellar', name: 'The mill cellar', rows: [0, 6], entry: { x: 3, y: 1 }, exits: { tunnel: [{ x: 4, y: 6 }, { x: 5, y: 6 }] } },
      {
        id: 'tunnel',
        name: 'The old tunnel',
        rows: [6, 11],
        entry: { x: 4, y: 7 },
        exits: { cellar: [{ x: 4, y: 6 }, { x: 5, y: 6 }], niches: [{ x: 3, y: 11 }, { x: 4, y: 11 }] },
      },
      {
        id: 'niches',
        name: 'The bone niches',
        rows: [11, 18],
        entry: { x: 3, y: 12 },
        exits: { tunnel: [{ x: 3, y: 11 }, { x: 4, y: 11 }], ossuary: [{ x: 3, y: 18 }, { x: 4, y: 18 }] },
      },
      {
        id: 'ossuary',
        name: 'The ossuary',
        rows: [18, 26],
        entry: { x: 3, y: 19 },
        exits: { niches: [{ x: 3, y: 18 }, { x: 4, y: 18 }] },
        // Lark, Paralyzed on her burial ledge, and the two ghouls below her: where the fight
        // (ossuary-ghouls) starts them.
        figures: [
          { person: 'lark', pos: { x: 4, y: 26 }, name: 'Lark Dunn, on a burial ledge', lying: true, goneOn: ['lark_rescued'] },
          { sprite: 'ghoul', pos: { x: 4, y: 25 }, name: 'two ghouls', fallenOn: ghoulsBeaten, goneOn: ghoulsFled },
          { sprite: 'ghoul', pos: { x: 2, y: 24 }, name: 'two ghouls', fallenOn: ghoulsBeaten, goneOn: ghoulsFled },
        ],
      },
    ],
    source: 'original',
  },
];

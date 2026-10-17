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
//                      shownOn  story flags: drawn only once any is set (a trap's pressure
//                               plates, once they're found)
//     changes        how the room looks once the story changes it: [{ on: [flags], rows }],
//                    rows covering the room's whole band, drawn once any of the flags is set
//                    (the flooded vault, drained or flooded back). Fights use the first rows.
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

// The Kings' Barrow (Chapter 3). Two maps, one for each level of the barrow (Rob, Oct 12,
// 2026): this one is the upper barrow, from the great gate down; the deep barrow (the flooded
// vault and the Chantry of Ash) gets its own map.
const barrowLegend = {
  // Outside: the moor's grass and heather, the old processional way, and standing stones.
  ',': { terrain: 'floor', tile: 'grass' },
  '"': { terrain: 'difficult', tile: 'grass', decor: 'bracken' },
  '.': { terrain: 'floor', tile: 'dirt' },
  o: { terrain: 'obstacle', tile: 'grass', decor: 'boulder' },
  M: { terrain: 'obstacle', tile: 'grass', decor: 'barrow' }, // the barrow's flanks
  // The forecourt: old paving, strewn with the dead the Choir sent against the gate.
  _: { terrain: 'floor', tile: 'crypt-floor' },
  x: { terrain: 'floor', tile: 'crypt-floor', decor: 'bones' },
  k: { terrain: 'floor', tile: 'crypt-floor', decor: 'skull' },
  // The barrow's face, and the doorway of the great gate. The sealing stone that shuts it is a
  // figure in the room (below), gone once the gate opens; in the fight at the gate it stands in
  // the way (encounters.js). The way through the oath-wall is drawn the same way.
  S: { terrain: 'wall', wall: 'stone' },
  G: { terrain: 'floor', tile: 'crypt-floor' },
  // Inside: the champions' tombs in the Hall of Champions.
  B: { terrain: 'obstacle', tile: 'crypt-floor', decor: 'bier' },
};

// The guardians lie where they fell once beaten, and the sealing stone is gone once it opens.
const guardiansBeaten = ['gate_guardians_destroyed'];
const gateOpen = ['gate_opened'];
// The dart corridor's pressure plates show once they're found, or once one goes off under you
// (then you know to look for the rest). The oath-wall's door is gone once it opens.
const platesFound = ['darts_spotted', 'darts_sprung'];
const oathWallOpen = ['oath_wall_opened'];

// The deep barrow (Chapter 3): the barrow's lower level, a map of its own. The stair down from
// the oath-wall comes out on a landing above the flooded vault.
const deepLegend = {
  S: { terrain: 'wall', wall: 'stone' },
  _: { terrain: 'floor', tile: 'crypt-floor' },
  // The vault's black water: deep in the channel down its middle (nobody can wade in), and
  // shallow either side of it (difficult ground).
  '~': { terrain: 'water', tile: 'deep-water' },
  '=': { terrain: 'difficult', tile: 'ford' },
  // The great sluice wheel at the foot of the channel, and the iron grille of its sluice gate.
  W: { terrain: 'obstacle', tile: 'deep-water', decor: 'sluice-wheel' },
  g: { terrain: 'obstacle', tile: 'deep-water', decor: 'sluice-gate' },
  // Drained (see the vault's changes): silt where the water was, the wheel and gate standing
  // dry, and the stair down that the water hid.
  ':': { terrain: 'floor', tile: 'dirt' },
  w: { terrain: 'obstacle', tile: 'dirt', decor: 'sluice-wheel' },
  h: { terrain: 'obstacle', tile: 'dirt', decor: 'sluice-gate' },
  v: { terrain: 'floor', tile: 'dirt', decor: 'stair-down' },
};

// The vault's foes lie where they fell once beaten, sink once it's flooded, and are gone if
// they won (down to the Choir's rite). Garrick and the Rival leave the wheel once freed.
const vaultFoesFallen = ['vault_won'];
const vaultFoesGone = ['vault_fates_mercy', 'vault_flooded'];
const atTheWheel = ['garrick_freed'];

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
  {
    id: 'kings-barrow',
    name: 'The Kings’ Barrow',
    rows: [
      // The great gate (rows 0–8): the processional way comes in off the moor at the top,
      // between standing stones, onto the old paved forecourt. The barrow's stone face closes
      // the bottom, with the sealing stone in the middle.
      '",,..,,"',
      ',,,..,o,',
      'o,,..,,"',
      ',______,',
      ',_x___k,',
      'M______M',
      'M_k__x_M',
      'MM____MM',
      'SSSGGSSS',
      // The dart corridor (rows 8–15): the stair down from the gate, then a straight passage
      // carved with crowns, with an old tomb robber's bones halfway along. Its pressure plates
      // are figures (below), drawn once they're found.
      'SSS__SSS',
      'SSS__SSS',
      'SSS_xSSS',
      'SSS__SSS',
      'SSS__SSS',
      'SSS__SSS',
      'SSS__SSS',
      // The Hall of Champions (rows 15–24): five champions' tombs between the pillars, Dame
      // Maud's just inside the door she watched.
      'S____B_S',
      'S______S',
      'SB____BS',
      'SS____SS',
      'SB____BS',
      'SS____SS',
      'S______S',
      'S______S',
      'SSS__SSS',
      // The oath-wall (rows 24–29): the champions' names and oaths carved across the far wall,
      // and the way down to the deep barrow through it, shut by a door until the oath is
      // spoken (a figure, below).
      'SS____SS',
      'S______S',
      'S______S',
      'SS____SS',
      'SSSGGSSS',
    ],
    legend: barrowLegend,
    rooms: [
      {
        id: 'forecourt',
        name: 'The great gate',
        rows: [0, 8],
        entry: { x: 3, y: 0 },
        exits: { corridor: [{ x: 3, y: 8 }, { x: 4, y: 8 }] },
        // The sealing stone in the doorway, and the two guardians either side of it: where the
        // fight (barrow-gate) starts them.
        figures: [
          { sprite: 'sealing-stone', pos: { x: 3, y: 8 }, name: 'the sealing stone', goneOn: gateOpen },
          { sprite: 'sealing-stone', pos: { x: 4, y: 8 }, name: 'the sealing stone', goneOn: gateOpen },
          { sprite: 'animated-armor', pos: { x: 2, y: 7 }, name: 'two suits of armour', fallenOn: guardiansBeaten },
          { sprite: 'animated-armor', pos: { x: 5, y: 7 }, name: 'two suits of armour', fallenOn: guardiansBeaten },
        ],
      },
      {
        id: 'corridor',
        name: 'The crowned passage', // the dart corridor, though nothing says so until it's found
        rows: [8, 15],
        entry: { x: 3, y: 9 },
        exits: { forecourt: [{ x: 3, y: 8 }, { x: 4, y: 8 }], hall: [{ x: 3, y: 15 }, { x: 4, y: 15 }] },
        // The pressure plates, once they're found or one goes off: the first is the one a hero
        // who walks on steps on.
        figures: [
          { sprite: 'dart-plate', pos: { x: 3, y: 12 }, name: 'pressure plates', shownOn: platesFound },
          { sprite: 'dart-plate', pos: { x: 4, y: 13 }, name: 'pressure plates', shownOn: platesFound },
          { sprite: 'dart-plate', pos: { x: 3, y: 14 }, name: 'pressure plates', shownOn: platesFound },
        ],
      },
      {
        id: 'hall',
        name: 'The Hall of Champions',
        rows: [15, 24],
        entry: { x: 3, y: 16 },
        exits: { corridor: [{ x: 3, y: 15 }, { x: 4, y: 15 }], 'oath-wall': [{ x: 3, y: 24 }, { x: 4, y: 24 }] },
      },
      {
        id: 'oath-wall',
        name: 'The oath-wall',
        rows: [24, 29],
        entry: { x: 3, y: 25 },
        exits: { hall: [{ x: 3, y: 24 }, { x: 4, y: 24 }] },
        // The shut way through the wall, gone once the oath is spoken.
        figures: [
          { sprite: 'oath-door', pos: { x: 3, y: 29 }, name: 'the oath-wall', goneOn: oathWallOpen },
          { sprite: 'oath-door', pos: { x: 4, y: 29 }, name: 'the oath-wall', goneOn: oathWallOpen },
        ],
      },
    ],
    source: 'original',
  },
  {
    id: 'deep-barrow',
    name: 'The deep barrow',
    rows: [
      // The flooded vault (rows 0–10): the stair from the oath-wall comes down onto a landing
      // at the top. A deep channel runs down the middle, with shallows either side and a stone
      // gantry across it, to the great sluice wheel and its gate at the foot. The Choir's own
      // passage, from their low door, comes in at the bottom right.
      'SSS__SSS',
      'S______S',
      'S______S',
      'S==~~==S',
      'S==~~==S',
      'S______S',
      'S==~~==S',
      'S==~~==S',
      'S__Wg__S',
      'S______S',
      'SSSSSS__',
    ],
    legend: deepLegend,
    rooms: [
      {
        id: 'vault',
        name: 'The flooded vault',
        rows: [0, 10],
        entry: { x: 3, y: 1 },
        exits: {},
        // Drained, the channel is silt with a stair going down it. Flooded back, the water
        // covers everything but the landing, and fills the Choir's passage.
        changes: [
          {
            on: ['vault_drained'],
            rows: ['SSS__SSS', 'S______S', 'S______S', 'S::::::S', 'S::::::S', 'S______S', 'S::vv::S', 'S::::::S', 'S__wh__S', 'S______S', 'SSSSSS__'],
          },
          {
            on: ['vault_flooded'],
            rows: ['SSS__SSS', 'S______S', 'S======S', 'S~~~~~~S', 'S~~~~~~S', 'S~~~~~~S', 'S~~~~~~S', 'S~~~~~~S', 'S~~Wg~~S', 'S~~~~~~S', 'SSSSSS~~'],
          },
        ],
        // The Choir at the wheel, where the fight (vault-wheel) starts them: the acolyte who
        // sings beside it, four more on the platform, a Ghoul on the gantry and the Ogre Zombie
        // in the shallows. Garrick and the Rival are chained either side of the wheel.
        figures: [
          { sprite: 'cultist', pos: { x: 3, y: 9 }, name: 'Choir acolytes', fallenOn: vaultFoesFallen, goneOn: vaultFoesGone },
          { sprite: 'ogre-zombie', pos: { x: 5, y: 6 }, name: 'an Ogre Zombie', fallenOn: vaultFoesFallen, goneOn: vaultFoesGone },
          { sprite: 'ghoul', pos: { x: 2, y: 5 }, name: 'a Ghoul', fallenOn: vaultFoesFallen, goneOn: vaultFoesGone },
          { sprite: 'cultist', pos: { x: 1, y: 8 }, name: 'Choir acolytes', fallenOn: vaultFoesFallen, goneOn: vaultFoesGone },
          { sprite: 'cultist', pos: { x: 6, y: 8 }, name: 'Choir acolytes', fallenOn: vaultFoesFallen, goneOn: vaultFoesGone },
          { sprite: 'cultist', pos: { x: 1, y: 9 }, name: 'Choir acolytes', fallenOn: vaultFoesFallen, goneOn: vaultFoesGone },
          { sprite: 'cultist', pos: { x: 6, y: 9 }, name: 'Choir acolytes', fallenOn: vaultFoesFallen, goneOn: vaultFoesGone },
          { person: 'garrick', pos: { x: 2, y: 8 }, name: 'Garrick Dunn, chained to the wheel', goneOn: atTheWheel },
          { person: 'rival', pos: { x: 5, y: 8 }, name: 'your rival, chained to the wheel', shownOn: ['rival_taken'], goneOn: atTheWheel },
        ],
      },
    ],
    source: 'original',
  },
];

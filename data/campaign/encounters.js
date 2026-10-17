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
//                  terrain 'floor', 'wall', 'obstacle' (blocks movement), 'difficult'
//                  (costs double to cross) or 'water' (deep water: nobody can wade in, but it
//                  blocks neither sight nor attacks)
//                  tile / decor / wall: pictures from data/campaign/sprites.js
//                or map: { dungeon, room }: the fight is in that room of a dungeon map
//                (data/campaign/dungeons.js), and positions count from the room's top row
//   hero         where the hero starts; monsters: each one and where it starts ({ x, y }),
//                with a name if it has its own (Mother Nettle)
//   allies       creatures who fight on the hero's side, played by the game: { id, monster,
//                name, pos } (the Old Ford's soldiers, as Guards). With bondName: true, they're
//                called by the name the player gave their Bond (the Rival). With ifFlag, they're
//                only there when that story flag is set. They hold their ground, as a
//                companion on Hold does, and the foes go for them too. They don't count
//                towards the difficulty, and at 0 Hit Points they die. The story hears how
//                many lived, and which (allies_standing() and ally_standing(id) in
//                story/externals.ink)
//   allyObjective  what the battle screen says about them: "Keep the watch alive" shows as
//                "Keep the watch alive: 3 of 3 still standing."
//   onlookers    figures who watch but don't fight: { decor, pos }, or someone from
//                data/campaign/people.js: { person, pos, lying }. They stand in the way, and
//                nobody fights them. With ifFlag, they're only there when that story flag is
//                set (the hero's Rival, chained at the sluice wheel if the Choir took them)
//   hymn         a monster sings while it fights (the Ashen Choir): { singer: monster id,
//                rises: { monster, pos }, round, from }. Unless the singing stops first, the
//                monster rises at pos at the start of that round, up out of `from` ("the
//                bones" if not given). The singer does nothing but sing until then. Damage
//                makes the singer save (Constitution, DC 10 or half the damage) or the hymn
//                breaks off.
//   reinforcements  more foes on the way: { round, monsters: [{ monster, pos }], from,
//                unlessFlag }. They join the fight at the start of that round, each at its
//                square (or the nearest free one), coming "from" somewhere ("the moor"). With
//                unlessFlag set in the story (Captain Varrow's watch holding the outer cairns),
//                they never come. The battle screen says they're coming, and when. They don't
//                count towards the difficulty, and a fight with them is played by hand. Each
//                one can have a name ("Sister Rhosyn"), and an ifFlag: then they only come if
//                that story flag is set
//   callByName   a foe the hero can call by its true name, if the story taught it to them:
//                { monster, name, ifFlag, range (feet), goesFor (a foe's name), action, what,
//                call, heard }. Calling uses the hero's action, and works while that foe is on
//                its feet and within range: it remembers who it was, and fights on the hero's
//                side as an ally, going after goesFor (then the nearest foe). The battle screen
//                shows action (with what under it); the fight log says call, then heard
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

// The Old Ford (Chapter 2): the barrow road crosses the river by a shallow ford (difficult
// ground) between deep water. The watch-post's stone tower and a barricade of crates stand on
// the north bank.
const fordLegend = {
  '#': { terrain: 'wall', wall: 'stone' },
  ',': { terrain: 'floor', tile: 'grass' },
  '.': { terrain: 'floor', tile: 'dirt' },
  '"': { terrain: 'difficult', tile: 'grass', decor: 'bracken' },
  T: { terrain: 'obstacle', tile: 'grass', decor: 'tree' },
  o: { terrain: 'obstacle', tile: 'grass', decor: 'boulder' },
  x: { terrain: 'obstacle', tile: 'grass', decor: 'crates' },
  '~': { terrain: 'water', tile: 'deep-water' },
  '=': { terrain: 'difficult', tile: 'ford' },
};

// Cairnfield (Chapter 2): the Choir's camp on the high moor, among barrow mounds the dead have
// opened. A track runs north to the Kings' Barrow; grey tents stand round a campfire, and a
// capstone lies where its carrier set it down.
const cairnfieldLegend = {
  ',': { terrain: 'floor', tile: 'grass' },
  '.': { terrain: 'floor', tile: 'dirt' },
  '"': { terrain: 'difficult', tile: 'grass', decor: 'bracken' },
  M: { terrain: 'obstacle', tile: 'grass', decor: 'barrow' },
  O: { terrain: 'obstacle', tile: 'grass', decor: 'open-barrow' },
  t: { terrain: 'obstacle', tile: 'grass', decor: 'tent' },
  F: { terrain: 'obstacle', tile: 'dirt', decor: 'campfire' },
  o: { terrain: 'obstacle', tile: 'grass', decor: 'boulder' },
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

// Dame Aveline's name, from the oath-wall in the Hall of Champions (Chapter 3). Called by it,
// the risen champion remembers her oath ("I will keep it below until I am called by name") and
// turns on the Cantor who sang her up.
const avelinesName = {
  monster: 'wight',
  name: 'Aveline',
  ifFlag: 'read_the_oath_wall',
  range: 30,
  goesFor: 'Cantor Vesk',
  action: 'Call her by name: “Aveline!”',
  what: 'She may remember her oath, and turn on Vesk. She has to be within 30 feet to hear you',
  call: 'You call her by her name, the one on the oath-wall: “Aveline! First of the sworn!”',
  heard: 'Dame Aveline stops with her sword raised. Something moves behind the dark of her helm, slow as a memory, and she turns, and goes for Cantor Vesk!',
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
  // The Old Ford at night: the dead come up out of the river at the watch-post. Its three
  // soldiers fight beside the party (Guards, played by the game); the objective is to keep them
  // alive. The party stands on the north bank, at the head of the ford.
  {
    id: 'ford-dead',
    name: 'The Dead at the Old Ford',
    difficulty: 'Moderate (a Ghoul and six Zombies are 500 XP; for a level 3 party of three, Low is 450 and Moderate 675. The watch’s three Guards fight beside you, and don’t count)',
    sizedFor: { level: 3, party: 3 },
    byHand: true,
    map: {
      rows: [
        '##,..,TT',
        '##,..,,T',
        ',xx..xx,',
        ',,,..,,,',
        '~~====~~',
        '~====~~~',
        '~~====~~',
        ',,,..,,"',
        '",,..,o,',
        'T,,..,,T',
      ],
      legend: fordLegend,
    },
    hero: { x: 3, y: 3 },
    allies: [
      { id: 'brannock', monster: 'guard', name: 'Sergeant Brannock', pos: { x: 4, y: 2 } },
      { id: 'wat', monster: 'guard', name: 'Wat', pos: { x: 1, y: 3 } },
      { id: 'nell', monster: 'guard', name: 'Nell', pos: { x: 6, y: 3 } },
    ],
    allyObjective: 'Keep the watch alive',
    monsters: [
      { monster: 'zombie', pos: { x: 2, y: 6 } },
      { monster: 'zombie', pos: { x: 5, y: 6 } },
      { monster: 'zombie', pos: { x: 1, y: 7 } },
      { monster: 'zombie', pos: { x: 6, y: 7 } },
      { monster: 'ghoul', pos: { x: 4, y: 8 } },
      { monster: 'zombie', pos: { x: 3, y: 8 } },
      { monster: 'zombie', pos: { x: 2, y: 9 } },
    ],
    whileHeroDown: '{name} turns north again, as if you were never there.',
    source: 'original',
  },
  // Cairnfield (beat 7): the Choir's camp. Sister Rhosyn sings by the fire while her acolytes
  // fight, and unless someone breaks the hymn, more of the dead climb out of an opened barrow.
  // The party comes up the track from the south; frightened acolytes run north for the
  // Kings' Barrow.
  {
    id: 'cairnfield-camp',
    name: 'The Choir’s Camp at Cairnfield',
    difficulty: 'Moderate (Sister Rhosyn, four acolytes and two Zombies are 650 XP; for a level 3 party of three, Low is 450 and Moderate 675. Unless the hymn is broken, a third Zombie rises on round 3)',
    sizedFor: { level: 3, party: 3 },
    byHand: true,
    map: {
      rows: [
        'M,,..,,M',
        ',O,..,O,',
        '",t,,t,"',
        ',,,F,,,,',
        ',t,,,,o,',
        '",,..,,"',
        ',M,..,O,',
        ',,,..,,,',
        '",,..,,"',
        ',,,..,,M',
      ],
      legend: cairnfieldLegend,
    },
    hero: { x: 3, y: 8 },
    monsters: [
      { monster: 'cultist-fanatic', name: 'Sister Rhosyn', pos: { x: 4, y: 2 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 3, y: 2 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 6, y: 3 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 2, y: 4 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 5, y: 5 } },
      { monster: 'zombie', pos: { x: 2, y: 1 } },
      { monster: 'zombie', pos: { x: 5, y: 6 } },
    ],
    hymn: { singer: 'cultist-fanatic', rises: { monster: 'zombie', pos: { x: 1, y: 2 } }, round: 3, from: 'the opened barrow' },
    escape: [
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ],
    whileHeroDown: '{name} leaves you lying in the heather. The Choir can bury you later.',
    source: 'original',
  },
  // ---- Chapter 3 ----
  // The Kings' Barrow's great gate (beat 2): the first queen's two guardians, suits of animated
  // armour either side of the sealing stone. The party comes in off the moor at the top. Unless
  // Captain Varrow's watch holds the outer cairns, the last of the dead walking in off the moor
  // come up behind the party on round 3 (Rob, Oct 12, 2026).
  {
    id: 'barrow-gate',
    name: 'The Guardians of the Great Gate',
    difficulty: 'Low (two Animated Armors are 400 XP; for a level 4 party of three, Low is 750 and Moderate 1,125. Unless Varrow’s watch holds the outer cairns, two Zombies come in off the moor behind you on round 3: 500 XP, still Low)',
    sizedFor: { level: 4, party: 3 },
    byHand: true,
    map: { dungeon: 'kings-barrow', room: 'forecourt' },
    hero: { x: 3, y: 2 },
    monsters: [
      { monster: 'animated-armor', name: 'Gate Guardian', pos: { x: 2, y: 7 } },
      { monster: 'animated-armor', name: 'Gate Guardian', pos: { x: 5, y: 7 } },
    ],
    // The sealing stone, still shut in the doorway.
    onlookers: [
      { decor: 'sealing-stone', pos: { x: 3, y: 8 } },
      { decor: 'sealing-stone', pos: { x: 4, y: 8 } },
    ],
    reinforcements: {
      round: 3,
      monsters: [
        { monster: 'zombie', pos: { x: 3, y: 0 } },
        { monster: 'zombie', pos: { x: 4, y: 0 } },
      ],
      from: 'the moor',
      unlessFlag: 'varrow_rallied',
    },
    whileHeroDown: '{name} stands over you, as still as if it had never moved.',
    source: 'original',
  },
  // The flooded vault (beat 4): the Choir's acolytes keep Garrick Dunn at the great sluice
  // wheel, with a Ghoul and an Ogre Zombie in the black water (Rob, Oct 16, 2026). A deep
  // channel splits the vault, so the shallows either side and the gantry across them are the
  // only ways down from the landing. The acolyte at the wheel sings: unless the hymn is broken,
  // a Zombie climbs out of the black water on round 3. Bloodied acolytes run for the Choir's
  // own passage, at the bottom right. Garrick, and the Rival if the Choir took them, are
  // chained either side of the wheel, out of the fight.
  {
    id: 'vault-wheel',
    name: 'The Black Water at the Sluice Wheel',
    difficulty: 'Moderate (an Ogre Zombie, a Ghoul and five acolytes are 775 XP; for a level 4 party of three, Low is 750 and Moderate 1,125. Unless the hymn is broken, a Zombie rises on round 3)',
    sizedFor: { level: 4, party: 3 },
    byHand: true,
    map: { dungeon: 'deep-barrow', room: 'vault' },
    hero: { x: 3, y: 1 },
    monsters: [
      // The first acolyte is the one who sings, beside the wheel.
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 3, y: 9 } },
      { monster: 'ogre-zombie', pos: { x: 5, y: 6 } },
      { monster: 'ghoul', pos: { x: 2, y: 5 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 1, y: 8 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 6, y: 8 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 1, y: 9 } },
      { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 6, y: 9 } },
    ],
    onlookers: [
      { person: 'garrick', pos: { x: 2, y: 8 } },
      { person: 'rival', pos: { x: 5, y: 8 }, ifFlag: 'rival_taken' },
    ],
    hymn: { singer: 'cultist', rises: { monster: 'zombie', pos: { x: 2, y: 3 } }, round: 3, from: 'the black water' },
    escape: [
      { x: 6, y: 10 },
      { x: 7, y: 10 },
    ],
    whileHeroDown: '{name} leaves you where you lie. The Choir has a use for you at the wheel.',
    source: 'original',
  },
  // The Chantry of Ash (beat 5), the boss fight (Rob, Oct 16, 2026). Cantor Vesk (a Cultist
  // Fanatic) sings at the altar, Dame Aveline (a Wight) stands up out of her tomb beside him,
  // and two of his dead stand between. Unless the hymn is broken, it raises another Zombie on
  // round 3. A hero who read her name on the oath-wall can call her by it: she remembers her
  // oath, and turns on Vesk. A Rival freed at the wheel fights beside the party (a Bandit
  // Captain, holding their ground). Two ways in:
  //   chantry       the fast way, down the stair in the drained vault. The Choir follows it
  //                 down behind the party on round 3, led by Sister Rhosyn if she lives.
  //   chantry-late  the long way round, out of the old drain in the left wall: no
  //                 reinforcements (the flooded vault cut them off), but the hymn is further
  //                 along, and a third Zombie is up already.
  {
    id: 'chantry',
    name: 'The Chantry of Ash',
    difficulty: 'High (Cantor Vesk, a Wight and two Zombies are 1,250 XP; for a level 4 party of three, Moderate is 1,125 and High 1,500. Unless the hymn is broken, another Zombie rises on round 3, and two acolytes, with Sister Rhosyn if she lives, come down the stair behind you)',
    sizedFor: { level: 4, party: 3 },
    byHand: true,
    map: { dungeon: 'deep-barrow', room: 'chantry' },
    hero: { x: 3, y: 1 },
    monsters: [
      { monster: 'cultist-fanatic', name: 'Cantor Vesk', pos: { x: 3, y: 9 } },
      { monster: 'wight', name: 'Dame Aveline', pos: { x: 4, y: 9 } },
      { monster: 'zombie', pos: { x: 1, y: 6 } },
      { monster: 'zombie', pos: { x: 6, y: 6 } },
    ],
    allies: [{ id: 'rival', monster: 'bandit-captain', bondName: true, ifFlag: 'rival_freed', pos: { x: 4, y: 1 } }],
    hymn: { singer: 'cultist-fanatic', rises: { monster: 'zombie', pos: { x: 2, y: 7 } }, round: 3, from: 'the ash' },
    reinforcements: {
      round: 3,
      monsters: [
        { monster: 'cultist-fanatic', name: 'Sister Rhosyn', pos: { x: 3, y: 0 }, ifFlag: 'rhosyn_lives' },
        { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 4, y: 0 } },
        { monster: 'cultist', name: 'Choir Acolyte', pos: { x: 3, y: 0 } },
      ],
      from: 'the stair',
    },
    callByName: avelinesName,
    whileHeroDown: '{name} leaves you lying in the ash. The hymn matters more than you do.',
    source: 'original',
  },
  {
    id: 'chantry-late',
    name: 'The Chantry of Ash',
    difficulty: 'High (Cantor Vesk, a Wight and three Zombies are 1,300 XP; for a level 4 party of three, Moderate is 1,125 and High 1,500. Unless the hymn is broken, another Zombie rises on round 3)',
    sizedFor: { level: 4, party: 3 },
    byHand: true,
    map: { dungeon: 'deep-barrow', room: 'chantry' },
    hero: { x: 1, y: 3 },
    monsters: [
      { monster: 'cultist-fanatic', name: 'Cantor Vesk', pos: { x: 3, y: 9 } },
      { monster: 'wight', name: 'Dame Aveline', pos: { x: 4, y: 9 } },
      { monster: 'zombie', pos: { x: 1, y: 6 } },
      { monster: 'zombie', pos: { x: 6, y: 6 } },
      { monster: 'zombie', pos: { x: 3, y: 5 } },
    ],
    allies: [{ id: 'rival', monster: 'bandit-captain', bondName: true, ifFlag: 'rival_freed', pos: { x: 1, y: 4 } }],
    hymn: { singer: 'cultist-fanatic', rises: { monster: 'zombie', pos: { x: 2, y: 7 } }, round: 3, from: 'the ash' },
    callByName: avelinesName,
    whileHeroDown: '{name} leaves you lying in the ash. The hymn matters more than you do.',
    source: 'original',
  },
];

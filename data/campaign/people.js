// The people of the story (original): who speaks in scenes, and how their portrait looks.
// In Ink, a line where someone speaks ends with #speaker:id, and the Adventure screen shows
// that person's portrait and name beside it. (Lines the hero speaks have none.)
//
//   name     shown under the portrait
//   Drawn like a hero (character/look.js):
//     species, size ('medium' or 'small'), armor (an armour id from data/srd/armor.js, or
//     null), robe (true for a long robe, like a Wizard's), and look: the same choices as a
//     hero's (data/campaign/hero-looks.js: skin, hairStyle, hairColor, beard, outfit,
//     accent, headgear)
//   Or drawn from the DawnLike sheets, for creatures:
//     sprite   a sprite id from data/campaign/sprites.js (goblins, the Choir, a wolf)
//   bond     for someone the hero names at creation (their Bond: 'rival', say): the portrait
//            shows the name the player gave them, not this entry's name

export const people = [
  // ---- Bramblegate ----
  {
    id: 'pike',
    name: 'Warden Pike',
    species: 'human',
    size: 'medium',
    armor: 'chain-mail',
    look: { skin: 'tan', hairStyle: 'cropped', hairColor: 'brown', beard: false, outfit: 'blue', accent: 'grey', headgear: 'helmet' },
    source: 'original',
  },
  {
    id: 'morwen',
    name: 'Morwen Tallow',
    species: 'human',
    size: 'medium',
    armor: null,
    look: { skin: 'peach', hairStyle: 'long', hairColor: 'auburn', beard: false, outfit: 'red', accent: 'yellow', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'corbin',
    name: 'Reeve Corbin',
    species: 'human',
    size: 'medium',
    armor: null,
    look: { skin: 'porcelain', hairStyle: 'cropped', hairColor: 'grey', beard: false, outfit: 'blue', accent: 'yellow', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'varrow',
    name: 'Captain Varrow',
    species: 'human',
    size: 'medium',
    armor: 'chain-mail',
    look: { skin: 'umber', hairStyle: 'cropped', hairColor: 'black', beard: true, outfit: 'red', accent: 'grey', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'nan',
    name: 'Nan',
    species: 'human',
    size: 'medium',
    armor: null,
    look: { skin: 'peach', hairStyle: 'long', hairColor: 'grey', beard: false, outfit: 'green', accent: 'brown', headgear: 'hood' },
    source: 'original',
  },
  {
    id: 'hob',
    name: 'Hob',
    species: 'gnome',
    size: 'small',
    armor: 'leather-armor', // his smith's apron
    look: { skin: 'peach', hairStyle: 'tousled', hairColor: 'white', beard: true, outfit: 'brown', accent: 'black', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'greta',
    name: 'Greta', // Hob's apprentice, the strongest arm in Bramblegate (Hob's bet)
    species: 'human',
    size: 'medium',
    armor: 'leather-armor', // a smith's apron, like Hob's
    look: { skin: 'tan', hairStyle: 'cropped', hairColor: 'auburn', beard: false, outfit: 'red', accent: 'black', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'dabbin',
    name: 'Dabbin', // Hob's cousin, a carter on the barrow road (Hob's ore); his pony is Parsnip
    species: 'gnome',
    size: 'small',
    armor: 'leather-armor', // a carter's jerkin
    look: { skin: 'tan', hairStyle: 'tousled', hairColor: 'brown', beard: true, outfit: 'green', accent: 'brown', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'crane',
    name: 'Prior Crane',
    species: 'human',
    size: 'medium',
    armor: null,
    robe: true,
    look: { skin: 'porcelain', hairStyle: 'bald', hairColor: 'grey', beard: false, outfit: 'white', accent: 'yellow', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'tibb',
    name: 'Old Tibb', // the watchman who minds the stocks
    species: 'human',
    size: 'medium',
    armor: 'leather-armor',
    look: { skin: 'peach', hairStyle: 'bald', hairColor: 'white', beard: true, outfit: 'red', accent: 'grey', headgear: 'helmet' },
    source: 'original',
  },
  {
    id: 'lark',
    name: 'Lark Dunn',
    species: 'human',
    size: 'small', // she's fourteen
    armor: null,
    look: { skin: 'peach', hairStyle: 'long', hairColor: 'blonde', beard: false, outfit: 'green', accent: 'brown', headgear: 'hood' },
    source: 'original',
  },
  {
    id: 'odda',
    name: 'Odda Brasswick',
    species: 'dwarf',
    size: 'medium',
    armor: null,
    robe: true,
    look: { skin: 'tan', hairStyle: 'long', hairColor: 'auburn', beard: false, outfit: 'yellow', accent: 'red', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'fen',
    name: 'Fen Underbough',
    species: 'halfling',
    size: 'small',
    armor: 'leather-armor',
    look: { skin: 'peach', hairStyle: 'tousled', hairColor: 'brown', beard: false, outfit: 'green', accent: 'brown', headgear: 'hood' },
    source: 'original',
  },

  // ---- Brackenhollow and the Choir ----
  { id: 'nettle', name: 'Mother Nettle', sprite: 'goblin-boss', source: 'original' },
  { id: 'lookout', name: 'The goblin lookout', sprite: 'goblin-warrior', source: 'original' },
  { id: 'goblin', name: 'A goblin', sprite: 'goblin-minion', source: 'original' },
  { id: 'goblin-child', name: 'The goblin child', sprite: 'goblin-minion', source: 'original' },
  { id: 'goblin-warrior', name: 'A goblin warrior', sprite: 'goblin-warrior', source: 'original' },
  { id: 'acolyte', name: 'The Choir acolyte', sprite: 'cultist', source: 'original' },
  // ---- The bounty hunters (Chapter 2): drawn as they are on the battle grid ----
  { id: 'gaunt', name: 'Mercy Gaunt', sprite: 'bandit-captain', source: 'original' },
  { id: 'hunter', name: 'A bounty hunter', sprite: 'bandit', source: 'original' },

  // ---- The Old Ford (Chapter 2): the watch-post's soldiers, drawn as they are on the grid ----
  { id: 'brannock', name: 'Sergeant Brannock', sprite: 'guard', source: 'original' },
  { id: 'wat', name: 'Wat', sprite: 'guard', source: 'original' },
  { id: 'nell', name: 'Nell', sprite: 'guard', source: 'original' },
  {
    id: 'penhallow',
    name: 'Factor Penhallow', // the Free League's man, waiting out the dead at the Old Ford
    species: 'human',
    size: 'medium',
    armor: null,
    robe: true,
    look: { skin: 'tan', hairStyle: 'cropped', hairColor: 'black', beard: true, outfit: 'black', accent: 'yellow', headgear: 'none' },
    source: 'original',
  },

  // ---- Cairnfield (Chapter 2): the Choir's camp among the opened barrows ----
  { id: 'rhosyn', name: 'Sister Rhosyn', sprite: 'cultist-fanatic', source: 'original' },
  {
    id: 'tobin',
    name: 'Tobin Reed', // the youngest acolyte, a cobbler's boy who joined the Choir the winter Fen did
    species: 'human',
    size: 'medium',
    armor: null,
    robe: true,
    look: { skin: 'peach', hairStyle: 'tousled', hairColor: 'blonde', beard: false, outfit: 'grey', accent: 'grey', headgear: 'hood' },
    source: 'original',
  },

  // ---- The Kings' Barrow (Chapter 3) ----
  {
    id: 'garrick',
    name: 'Garrick Dunn', // the miller, Lark's father: big, floury, and nine days at the Choir's wheel
    species: 'human',
    size: 'medium',
    armor: null,
    look: { skin: 'peach', hairStyle: 'cropped', hairColor: 'blonde', beard: true, outfit: 'white', accent: 'brown', headgear: 'none' },
    source: 'original',
  },
  { id: 'vesk', name: 'Cantor Vesk', sprite: 'cantor', source: 'original' }, // the gravedigger who sings the dead awake
  { id: 'aveline', name: 'Dame Aveline', sprite: 'wight', source: 'original' }, // the first queen's champion, risen

  // ---- Bramblegate's feast (Chapter 3, beat 7): the powers of Act II take notice ----
  {
    id: 'marchbank',
    name: 'Knight-Captain Marchbank', // Beatrix Marchbank, of the Lord Regent's household
    species: 'human',
    size: 'medium',
    armor: 'plate-armor',
    look: { skin: 'umber', hairStyle: 'cropped', hairColor: 'grey', beard: false, outfit: 'blue', accent: 'white', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'courier',
    name: 'A courier', // the Free League's, in its black and yellow
    species: 'human',
    size: 'medium',
    armor: null,
    look: { skin: 'tan', hairStyle: 'tousled', hairColor: 'auburn', beard: false, outfit: 'black', accent: 'yellow', headgear: 'hood' },
    source: 'original',
  },
  // Hesper Wildmoor of the Old Circle: "The old woman with the owl" until the shard tells you
  // her name. The two entries look the same.
  {
    id: 'owl-woman',
    name: 'The old woman with the owl',
    species: 'human',
    size: 'medium',
    armor: null,
    robe: true,
    look: { skin: 'porcelain', hairStyle: 'long', hairColor: 'white', beard: false, outfit: 'brown', accent: 'green', headgear: 'none' },
    source: 'original',
  },
  {
    id: 'hesper',
    name: 'Hesper Wildmoor',
    species: 'human',
    size: 'medium',
    armor: null,
    robe: true,
    look: { skin: 'porcelain', hairStyle: 'long', hairColor: 'white', beard: false, outfit: 'brown', accent: 'green', headgear: 'none' },
    source: 'original',
  },

  // ---- The hero's Bond, when they turn up in person ----
  {
    id: 'rival',
    name: 'Your rival',
    bond: 'rival',
    species: 'human',
    size: 'medium',
    armor: 'leather-armor',
    look: { skin: 'peach', hairStyle: 'long', hairColor: 'black', beard: false, outfit: 'blue', accent: 'white', headgear: 'none' },
    source: 'original',
  },

  // ---- Act I's side quests ----
  {
    id: 'shepherd',
    name: 'A shepherd', // up the north road, who finds you if the wolves win
    species: 'human',
    size: 'medium',
    armor: null,
    look: { skin: 'tan', hairStyle: 'tousled', hairColor: 'grey', beard: true, outfit: 'brown', accent: 'green', headgear: 'hood' },
    source: 'original',
  },

  // ---- Beasts ----
  { id: 'wolf', name: 'The wolf', sprite: 'wolf', source: 'original' },
];

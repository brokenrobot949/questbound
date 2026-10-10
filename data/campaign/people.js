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

  // ---- Brackenhollow and the Choir ----
  { id: 'nettle', name: 'Mother Nettle', sprite: 'goblin-boss', source: 'original' },
  { id: 'lookout', name: 'The goblin lookout', sprite: 'goblin-warrior', source: 'original' },
  { id: 'goblin', name: 'A goblin', sprite: 'goblin-minion', source: 'original' },
  { id: 'goblin-child', name: 'The goblin child', sprite: 'goblin-minion', source: 'original' },
  { id: 'goblin-warrior', name: 'A goblin warrior', sprite: 'goblin-warrior', source: 'original' },
  { id: 'acolyte', name: 'The Choir acolyte', sprite: 'cultist', source: 'original' },

  // ---- Beasts ----
  { id: 'wolf', name: 'The wolf', sprite: 'wolf', source: 'original' },
];

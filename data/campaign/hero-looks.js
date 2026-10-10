// Hero looks (original): the choices on the Look step, and each species' and class's
// starting look. Every colour comes from DawnBringer's 16-colour palette, which all of
// DawnLike uses, so heroes always match the world they stand in.
// Safe to edit: rename options, change colours (keep to the palette below), or change the
// defaults. The pixel shapes are in hero-sprite.js.
//
// A hero's look (stored on the character):
//   { skin, hairStyle, hairColor, beard, outfit, accent, headgear }

// DawnBringer's 16-colour palette, by name, for reference.
export const palette = {
  black: '#140c1c',
  plum: '#442434',
  navy: '#30346d',
  iron: '#4e4a4e',
  brown: '#854c30',
  forest: '#346524',
  red: '#d04648',
  olive: '#757161',
  blue: '#597dce',
  orange: '#d27d2c',
  steel: '#8595a1',
  grass: '#6daa2c',
  peach: '#d2aa99',
  sky: '#6dc2ca',
  yellow: '#dad45e',
  white: '#deeed6',
};

const p = palette;

// Skin: highlight, main, shadow, deep shadow.
export const skinTones = [
  { id: 'porcelain', name: 'Porcelain', ramp: [p.white, p.peach, p.orange, p.brown] },
  { id: 'peach', name: 'Peach', ramp: [p.yellow, p.peach, p.orange, p.brown] },
  { id: 'tan', name: 'Tan', ramp: [p.peach, p.orange, p.brown, p.plum] },
  { id: 'umber', name: 'Umber', ramp: [p.orange, p.brown, p.plum, p.black] },
  { id: 'green', name: 'Green', ramp: [p.yellow, p.grass, p.forest, p.plum] },
  { id: 'grey', name: 'Grey', ramp: [p.white, p.steel, p.olive, p.iron] },
  { id: 'slate', name: 'Slate', ramp: [p.steel, p.iron, p.navy, p.black] },
  { id: 'crimson', name: 'Crimson', ramp: [p.orange, p.red, p.brown, p.plum] },
  { id: 'azure', name: 'Azure', ramp: [p.sky, p.blue, p.navy, p.black] },
  { id: 'gold', name: 'Gold', ramp: [p.white, p.yellow, p.orange, p.brown] },
  { id: 'copper', name: 'Copper', ramp: [p.yellow, p.orange, p.brown, p.plum] },
];

// Hair: highlight, main.
export const hairColors = [
  { id: 'brown', name: 'Brown', ramp: [p.orange, p.brown] },
  { id: 'black', name: 'Black', ramp: [p.iron, p.black] },
  { id: 'auburn', name: 'Auburn', ramp: [p.red, p.plum] },
  { id: 'blonde', name: 'Blonde', ramp: [p.yellow, p.orange] },
  { id: 'white', name: 'White', ramp: [p.white, p.steel] },
  { id: 'grey', name: 'Grey', ramp: [p.steel, p.iron] },
  { id: 'blue', name: 'Blue', ramp: [p.sky, p.navy] },
  { id: 'green', name: 'Green', ramp: [p.grass, p.forest] },
];

export const hairStyles = [
  { id: 'tousled', name: 'Tousled' },
  { id: 'cropped', name: 'Cropped' },
  { id: 'long', name: 'Long' },
  { id: 'bald', name: 'Bald' },
];

// Cloth for the outfit (shirt or robe) and its accent (tabard, sash): light, main, dark.
export const clothColors = [
  { id: 'red', name: 'Red', ramp: [p.orange, p.red, p.plum] },
  { id: 'blue', name: 'Blue', ramp: [p.sky, p.blue, p.navy] },
  { id: 'green', name: 'Green', ramp: [p.grass, p.forest, p.black] },
  { id: 'brown', name: 'Brown', ramp: [p.orange, p.brown, p.plum] },
  { id: 'grey', name: 'Grey', ramp: [p.steel, p.olive, p.iron] },
  { id: 'black', name: 'Black', ramp: [p.iron, p.navy, p.black] },
  { id: 'white', name: 'White', ramp: [p.white, p.white, p.steel] },
  { id: 'yellow', name: 'Yellow', ramp: [p.white, p.yellow, p.orange] },
  { id: 'sky', name: 'Sky', ramp: [p.white, p.sky, p.blue] },
];

// Hats and hoods by class. 'none' is always allowed.
export const headgear = [
  { id: 'none', name: 'None', classes: null },
  { id: 'helmet', name: 'Horned helmet', classes: ['fighter', 'cleric'] },
  { id: 'hood', name: 'Hood', classes: ['wizard', 'cleric'] },
];

// Armour colours: highlight, main, shade, dark. Worn armour changes the hero's colours.
export const armorMaterials = {
  steel: [p.sky, p.steel, p.olive, p.iron],
  leather: [p.yellow, p.orange, p.brown, p.plum],
};
// Armour made of hide or leather; everything else is metal.
export const leatherArmor = ['padded-armor', 'leather-armor', 'studded-leather-armor', 'hide-armor'];

// Fixed colours the player doesn't choose.
export const fixedColors = {
  outline: p.black,
  outlineSoft: p.plum,
  eyes: p.black,
  ivory: p.white, // tusks, horn tips, robe trim
  ivoryShade: p.peach,
  horn: p.olive,
  hornDark: p.iron,
  shieldBoss: p.navy,
  dragonEyes: p.yellow,
  trousers: [p.orange, p.brown, p.iron],
  boots: [p.orange, p.brown, p.plum],
};

// How each species starts, and the features drawn on every hero of that species.
// features: 'pointed-ears', 'tusks', 'horns', 'dragon-crest', 'goliath-marks'
export const speciesLooks = {
  dragonborn: { skin: 'copper', hairStyle: 'bald', hairColor: 'black', beard: false, features: ['dragon-crest'] },
  dwarf: { skin: 'tan', hairStyle: 'tousled', hairColor: 'auburn', beard: true, features: [] },
  elf: { skin: 'porcelain', hairStyle: 'long', hairColor: 'blonde', beard: false, features: ['pointed-ears'] },
  gnome: { skin: 'peach', hairStyle: 'tousled', hairColor: 'white', beard: false, features: [] },
  goliath: { skin: 'grey', hairStyle: 'bald', hairColor: 'black', beard: false, features: ['goliath-marks'] },
  halfling: { skin: 'peach', hairStyle: 'tousled', hairColor: 'brown', beard: false, features: [] },
  human: { skin: 'peach', hairStyle: 'tousled', hairColor: 'brown', beard: false, features: [] },
  orc: { skin: 'green', hairStyle: 'long', hairColor: 'black', beard: false, features: ['tusks'] },
  tiefling: { skin: 'crimson', hairStyle: 'long', hairColor: 'black', beard: false, features: ['horns'] },
};

// The features' names, shown on the Look step.
export const featureNames = {
  'pointed-ears': 'pointed ears',
  tusks: 'tusks',
  horns: 'horns',
  'dragon-crest': 'scales and a crest',
  'goliath-marks': 'stone-grey markings',
};

// A Dragonborn's scales match their Draconic Ancestry to start with.
export const dragonbornSkins = {
  black: 'slate',
  blue: 'azure',
  brass: 'gold',
  bronze: 'copper',
  copper: 'copper',
  gold: 'gold',
  green: 'green',
  red: 'crimson',
  silver: 'grey',
  white: 'grey',
};

// How each class starts dressed.
export const classLooks = {
  fighter: { outfit: 'red', accent: 'brown', headgear: 'none' },
  wizard: { outfit: 'blue', accent: 'red', headgear: 'none' },
  cleric: { outfit: 'white', accent: 'yellow', headgear: 'none' },
};

// A hero's look: the starting look for their species and class, checks on the choices, and
// the finished sprite (two animation frames plus the colour for every pixel).
//
// The look is stored on the character as choices only:
//   { skin, hairStyle, hairColor, beard, outfit, accent, headgear }
// Species features (ears, tusks, horns), size, and the colour of worn armour all come from
// the rest of the character, so changing species or armour changes the sprite too.

import * as looks from '../../../data/campaign/hero-looks.js';
import * as parts from '../../../data/campaign/hero-sprite.js';
import { findArmor } from './sheet.js';

const byId = (list, id) => list.find((entry) => entry.id === id) || null;

export const findSkinTone = (id) => byId(looks.skinTones, id);
export const findHairColor = (id) => byId(looks.hairColors, id);
export const findClothColor = (id) => byId(looks.clothColors, id);

// The headgear a class can wear ('none' is always allowed).
export function headgearFor(classId) {
  return looks.headgear.filter((h) => !h.classes || h.classes.includes(classId));
}

// The look a hero starts with, from their species (and Dragonborn ancestry) and class.
export function defaultLook(character) {
  const species = looks.speciesLooks[character.speciesId] || looks.speciesLooks.human;
  const dressed = looks.classLooks[character.classId] || looks.classLooks.fighter;
  let skin = species.skin;
  if (character.speciesId === 'dragonborn' && looks.dragonbornSkins[character.speciesChoice]) {
    skin = looks.dragonbornSkins[character.speciesChoice];
  }
  return {
    skin,
    hairStyle: species.hairStyle,
    hairColor: species.hairColor,
    beard: species.beard,
    outfit: dressed.outfit,
    accent: dressed.accent,
    headgear: dressed.headgear,
  };
}

// Problems with a look, for the rules checker.
export function lookProblems(character) {
  const look = character.look;
  if (!look || typeof look !== 'object') return ['Choose a look.'];
  const problems = [];
  const need = (ok, message) => {
    if (!ok) problems.push(message);
  };
  need(findSkinTone(look.skin), 'Choose a skin colour.');
  need(byId(looks.hairStyles, look.hairStyle), 'Choose a hairstyle.');
  need(findHairColor(look.hairColor), 'Choose a hair colour.');
  need(typeof look.beard === 'boolean', 'Say whether the hero has a beard.');
  need(findClothColor(look.outfit), 'Choose an outfit colour.');
  need(findClothColor(look.accent), 'Choose an accent colour.');
  need(headgearFor(character.classId).some((h) => h.id === look.headgear), 'That headgear isn’t for this class.');
  return problems;
}

// ---- Drawing the sprite ----

// The hero's sprite: { size, frames: [rows, rows], colors: { letter: '#rrggbb' } }.
// Each frame is a list of 16 strings of 16 colour letters ('.' is see-through).
export function heroSprite(character) {
  const look = { ...defaultLook(character), ...(character.look || {}) };
  const layers = [parts.body];
  const robed = parts.robedClasses.includes(character.classId);
  if (robed) layers.push(parts.robe);
  const worn = character.armorId ? findArmor(character.armorId) : null;
  if (worn) layers.push(parts.armor);
  if (look.beard) layers.push(parts.beard);
  layers.push(parts.hairStyles[look.hairStyle] || parts.hairStyles.bald);
  const species = looks.speciesLooks[character.speciesId];
  for (const feature of (species && species.features) || []) layers.push(parts.features[feature]);
  layers.push(parts.headgear[look.headgear] || parts.headgear.none);
  if (character.shield) layers.push(parts.shield);

  let first = layered(layers);
  let second = bobbed(first);
  if (character.size === 'small') {
    first = shortened(first);
    second = shortened(second);
  }
  return {
    size: parts.SPRITE_SIZE,
    frames: [first, second],
    colors: spriteColors(character, look, worn),
  };
}

// Draws each layer over the ones before it; '.' leaves what's underneath.
function layered(layers) {
  const out = layers[0].map((row) => row.split(''));
  for (const layer of layers.slice(1)) {
    layer.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] !== '.') out[y][x] = row[x];
    });
  }
  return out.map((row) => row.join(''));
}

// The second frame: everything above the legs drops one pixel.
function bobbed(rows) {
  const blank = '.'.repeat(parts.SPRITE_SIZE);
  return rows.map((row, y) => {
    if (y === 0) return blank;
    if (y <= parts.BOB_ROWS) return rows[y - 1];
    return row;
  });
}

// A Small hero: two rows shorter, standing on the same ground.
function shortened(rows) {
  const kept = rows.filter((_, y) => !parts.SMALL_DROPPED_ROWS.includes(y));
  const blank = '.'.repeat(parts.SPRITE_SIZE);
  return [...Array(rows.length - kept.length).fill(blank), ...kept];
}

function spriteColors(character, look, worn) {
  const fixed = looks.fixedColors;
  const skin = (findSkinTone(look.skin) || looks.skinTones[0]).ramp;
  const hair = (findHairColor(look.hairColor) || looks.hairColors[0]).ramp;
  const outfit = (findClothColor(look.outfit) || looks.clothColors[0]).ramp;
  const accent = (findClothColor(look.accent) || looks.clothColors[0]).ramp;
  const material = worn && looks.leatherArmor.includes(worn.id) ? looks.armorMaterials.leather : looks.armorMaterials.steel;
  const dragon = character.speciesId === 'dragonborn';
  return {
    x: fixed.outline,
    o: fixed.outlineSoft,
    e: dragon ? fixed.dragonEyes : fixed.eyes,
    Y: fixed.dragonEyes,
    S: skin[0],
    s: skin[1],
    z: skin[2],
    Z: skin[3],
    H: hair[0],
    h: hair[1],
    C: outfit[0],
    c: outfit[1],
    v: outfit[2],
    T: accent[1],
    t: accent[2],
    P: fixed.trousers[0],
    p: fixed.trousers[1],
    q: fixed.trousers[2],
    K: fixed.boots[0],
    k: fixed.boots[1],
    j: fixed.boots[2],
    M: material[0],
    m: material[1],
    N: material[2],
    n: material[3],
    I: fixed.ivory,
    i: fixed.ivoryShade,
    U: fixed.horn,
    u: fixed.hornDark,
    y: fixed.shieldBoss,
  };
}

// For the creation screen: a look rolled with the game's dice.
export function rollLook(rng, character) {
  const pick = (list) => list[rng.nextInt(list.length)];
  return {
    skin: pick(looks.skinTones).id,
    hairStyle: pick(looks.hairStyles).id,
    hairColor: pick(looks.hairColors).id,
    beard: rng.nextInt(4) === 0,
    outfit: pick(looks.clothColors).id,
    accent: pick(looks.clothColors).id,
    headgear: pick(headgearFor(character.classId)).id,
  };
}

// The species features drawn on this hero, by name, for the Look screen.
export function speciesFeatureNames(character) {
  const species = looks.speciesLooks[character.speciesId];
  return ((species && species.features) || []).map((f) => looks.featureNames[f] || f);
}

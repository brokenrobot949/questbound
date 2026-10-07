// A summary of a hero's sheet: the numbers the rules engine uses, each of which shows how it
// was worked out when tapped. Character creation ends on it; the full tabbed character
// sheet (a later slice) will grow from it.

import { abilities } from '../../../data/srd/abilities.js';
import { skills } from '../../../data/srd/skills.js';
import {
  abilityModifier,
  abilityScore,
  armorClass,
  characterFeatures,
  darkvision,
  findBackground,
  findClass,
  findSpecies,
  initiative,
  maxHitPoints,
  passivePerception,
  proficiencyBonus,
  resistances,
  savingThrow,
  skillBonus,
  skillProficiency,
  speciesOption,
  spellcasting,
  speed,
} from '../character/sheet.js';
import { signedNumber } from './roll-format.js';
import { el } from './dom.js';
import { expandable, mathsNumber } from './widgets.js';

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function heroSheet(character) {
  const sheet = el('div', 'hero-sheet');
  const option = speciesOption(character);
  const background = findBackground(character.backgroundId);

  const who = el('div', 'sheet-who');
  who.append(el('h2', 'sheet-name', character.name));
  who.append(el('p', 'sheet-line', `${speciesText(character, option)} · ${findClass(character.classId).name} ${character.level} · ${background.name} background`));
  const senses = [`${capitalise(character.size)}`, `Speed ${speed(character).value} ft`];
  const dark = darkvision(character);
  if (dark) senses.push(`Darkvision ${dark} ft`);
  const resist = resistances(character);
  if (resist.length) senses.push(`Resists ${resist.map(capitalise).join(', ')}`);
  who.append(el('p', 'sheet-line', senses.join(' · ')));
  sheet.append(who, el('p', 'sheet-hint', 'Tap any number to see how it was worked out.'));

  const pb = proficiencyBonus(character.level);
  sheet.append(
    grid('Combat', [
      mathsNumber({ label: 'Hit Points', stat: maxHitPoints(character) }),
      mathsNumber({ label: 'Armor Class', stat: armorClass(character) }),
      mathsNumber({ label: 'Initiative', stat: initiative(character), format: signedNumber }),
      mathsNumber({ label: 'Speed', stat: speed(character), unit: ' ft' }),
      mathsNumber({ label: 'Proficiency', stat: { value: pb, parts: [{ label: `Level ${character.level}`, value: pb }] }, format: signedNumber }),
      mathsNumber({ label: 'Passive Perception', stat: passivePerception(character) }),
    ]),
  );

  sheet.append(
    grid(
      'Abilities',
      abilities.map((a) =>
        mathsNumber({ label: a.name, stat: abilityScore(character, a.id), format: (v) => `${v} (${signedNumber(abilityModifier(v))})` }),
      ),
    ),
  );

  const saveProficiencies = findClass(character.classId).savingThrows;
  sheet.append(
    grid(
      'Saving throws',
      abilities.map((a) =>
        mathsNumber({
          label: `${a.name}${saveProficiencies.includes(a.id) ? ' ●' : ''}`,
          stat: savingThrow(character, a.id),
          format: signedNumber,
        }),
      ),
      '● marks the saves your class is proficient in.',
    ),
  );

  const known = skills.filter((s) => skillProficiency(character, s.id).level !== 'none');
  sheet.append(grid('Skills you’re proficient in', known.map((s) => mathsNumber({ label: s.name, stat: skillBonus(character, s.id), format: signedNumber }))));

  const magic = spellcasting(character);
  if (magic) {
    const box = grid('Spellcasting', [
      mathsNumber({ label: 'Spell save DC', stat: magic.saveDc }),
      mathsNumber({ label: 'Spell attack', stat: magic.attackBonus, format: signedNumber }),
    ]);
    const slots = magic.slots.map((count, i) => `${count} level ${i + 1}`).join(', ');
    box.append(el('p', 'sheet-line', `Cantrips ${magic.cantrips} · Prepared spells ${magic.preparedSpells} · Spell slots: ${slots}`));
    sheet.append(box);
  }

  const features = el('section', 'sheet-block');
  features.append(el('h3', 'section-heading', 'Features, traits and feats'));
  for (const feature of characterFeatures(character)) features.append(expandable(`${feature.name} · ${feature.source}`, feature.text));
  sheet.append(features);
  return sheet;
}

// "Tiefling (Infernal)", "Goliath (Cloud Giant)", or just "Human".
function speciesText(character, option) {
  const name = findSpecies(character.speciesId).name;
  if (!option) return name;
  const inBrackets = option.name.match(/\(([^)]+)\)$/); // "Cloud’s Jaunt (Cloud Giant)"
  return `${name} (${inBrackets ? inBrackets[1] : option.name})`;
}

function grid(heading, items, hint = '') {
  const block = el('section', 'sheet-block');
  block.append(el('h3', 'section-heading', heading));
  if (hint) block.append(el('p', 'section-hint', hint));
  const list = el('div', 'stat-grid');
  list.append(...items);
  block.append(list);
  return block;
}

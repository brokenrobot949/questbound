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
  findAbility,
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
import { spellGroups, spellNumbers } from '../character/spells.js';
import { heroSprite } from '../character/look.js';
import { portrait } from './sprite-canvas.js';
import { signedNumber } from './roll-format.js';
import { spellDetails } from './spell-text.js';
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
  const header = el('div', 'sheet-header');
  header.append(portrait(heroSprite(character), { scale: 4, label: `${character.name || 'Your hero'}, as they look` }), who);
  sheet.append(header, el('p', 'sheet-hint', 'Tap any number to see how it was worked out.'));

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

  // Spells, one block per source (class, Magic Initiate, species), each with its own
  // spellcasting ability.
  const magic = spellcasting(character);
  for (const group of spellGroups(character)) {
    if (!group.ability) continue; // not chosen yet
    const numbers = spellNumbers(character, group.ability);
    const box = grid(`${group.label} spells`, [
      mathsNumber({ label: 'Spell save DC', stat: numbers.saveDc }),
      mathsNumber({ label: 'Spell attack', stat: numbers.attackBonus, format: signedNumber }),
    ]);
    box.querySelector('.section-heading').after(el('p', 'section-hint', `Spellcasting ability: ${findAbility(group.ability).name}`));
    if (magic && group.label === findClass(character.classId).name) {
      const slots = magic.slots.map((count, i) => `${count} level ${i + 1}`).join(', ');
      box.append(el('p', 'sheet-line', `Spell slots: ${slots}`));
    }
    const listed = (title, entries) => {
      if (entries.length === 0) return;
      box.append(el('p', 'sheet-line', title));
      for (const { spell, note } of entries) box.append(expandable(note ? `${spell.name} · ${note}` : spell.name, spellDetails(spell)));
    };
    listed('Cantrips', group.cantrips.map((spell) => ({ spell })));
    listed('Prepared', group.prepared.map((spell) => ({ spell })));
    listed('Always prepared', group.always);
    const unprepared = group.spellbook.filter((spell) => !group.prepared.includes(spell));
    listed('Also in the spellbook', unprepared.map((spell) => ({ spell, note: spell.ritual ? 'ritual' : '' })));
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

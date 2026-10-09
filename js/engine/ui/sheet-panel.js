// The Sheet tab during play: the hero's sheet (every number taps open to show its maths),
// plus what changes in play: Heroic Inspiration, coins and the pack, and the armour worn and
// every attack the hero has, with the numbers the fight uses.

import { findBond, findDrive } from '../character/creation.js';
import { findItem, itemText, moneyText } from '../character/inventory.js';
import { armorClass, findArmor } from '../character/sheet.js';
import { heroAttackOptions } from '../combat/attacks.js';
import { shield } from '../../../data/srd/armor.js';
import { attackSummary } from './attack-text.js';
import { featureUsesLeft, featureUsesMax, maxHp, slotsAt, slotsLeft } from '../character/resources.js';
import { levelUpReady, nextLevelXp } from '../character/level-up.js';
import { heroSheet } from './hero-sheet.js';
import { el } from './dom.js';
import { expandable } from './widgets.js';

export function sheetPanel(game) {
  const { character } = game;
  const panel = el('div', 'sheet-panel');

  // What's spent and what's left.
  const now = el('section', 'sheet-block');
  now.append(el('h3', 'section-heading', 'Right now'));
  now.append(el('p', 'sheet-line', `Hit Points: ${game.hp} of ${maxHp(character)}`));
  const next = nextLevelXp(character);
  let xpNote = ` (level ${character.level} is as high as the game goes for now)`;
  if (levelUpReady(game)) xpNote = ' (level up ready: see the Adventure tab)';
  else if (next !== null) xpNote = ` (level ${character.level + 1} at ${next})`;
  now.append(el('p', 'sheet-line', `XP: ${game.xp}${xpNote}`));
  const slotLevels = [1, 2, 3].filter((level) => slotsAt(character, level) > 0);
  if (slotLevels.length) {
    now.append(el('p', 'sheet-line', `Spell slots left: ${slotLevels.map((level) => `${slotsLeft(game, level)} of ${slotsAt(character, level)} level ${level}`).join(', ')}`));
  }
  for (const [id, name] of [
    ['second-wind', 'Second Wind'],
    ['action-surge', 'Action Surge'],
  ]) {
    if (featureUsesMax(character, id)) now.append(el('p', 'sheet-line', `${name}: ${featureUsesLeft(game, id)} of ${featureUsesMax(character, id)} left`));
  }
  now.append(el('p', 'section-hint', 'A long rest brings back Hit Points, spell slots and every use of your features.'));
  panel.append(now);
  panel.append(gearBlock(game));

  panel.append(heroSheet(character));

  const drive = findDrive(character.drive);
  const bond = findBond(character.bond.type);
  const story = el('section', 'sheet-block');
  story.append(el('h3', 'section-heading', 'Drive, Bond and Inspiration'));
  story.append(el('p', 'sheet-line', `Drive: ${drive.name}. ${drive.inspiration}`));
  story.append(el('p', 'sheet-line', `Bond: ${bond.name}, ${character.bond.name}.`));
  story.append(
    el(
      'p',
      'sheet-line',
      game.inspiration ? 'Heroic Inspiration: ★ you have it.' : 'Heroic Inspiration: not right now. Choices that fit your Drive earn it.',
    ),
  );
  panel.append(story);

  const pack = el('section', 'sheet-block');
  pack.append(el('h3', 'section-heading', 'Pack'));
  pack.append(el('p', 'sheet-line', `Coins: ${moneyText(game.money)}`));
  const held = game.inventory.filter((entry) => entry.quantity > 0);
  if (held.length === 0) pack.append(el('p', 'section-hint', 'Your pack is empty.'));
  for (const entry of held) {
    const item = findItem(entry.id);
    let label = itemText(entry);
    if (entry.id === character.armorId) label += ' (wearing)';
    else if (entry.id === shield.id && character.shield) label += ' (on your arm)';
    pack.append(item.text ? expandable(label, item.text) : el('p', 'pack-item', label));
  }
  panel.append(pack);
  return panel;
}

// What the hero wears, and what they can attack with: each weapon (and attack spell) with its
// chance to hit, damage and reach, the same numbers the battle screen shows.
function gearBlock(game) {
  const { character } = game;
  const block = el('section', 'sheet-block');
  block.append(el('h3', 'section-heading', 'Armour and weapons'));
  const ac = armorClass(character).value;
  const worn = character.armorId ? findArmor(character.armorId) : null;
  block.append(el('p', 'sheet-line', `Wearing: ${worn ? worn.name : 'no armour'} (Armor Class ${ac})`));
  if (character.shield) block.append(el('p', 'sheet-line', `Shield: on your arm (+${shield.acBonus} Armor Class)`));

  const options = heroAttackOptions(game);
  const weapons = game.inventory.filter((entry) => entry.quantity > 0 && findItem(entry.id).category === 'weapon');
  block.append(el('p', 'sheet-line', 'Weapons'));
  if (weapons.length === 0) block.append(el('p', 'section-hint', 'You carry no weapons.'));
  else block.append(el('p', 'section-hint', 'Every weapon in your pack is at hand in a fight: you draw the one you need as you attack.'));
  for (const entry of weapons) {
    const item = findItem(entry.id);
    const ways = options.filter((option) => option.itemId === item.id);
    for (const option of ways) block.append(el('p', 'pack-item', `${option.name}: ${attackSummary(option).join(' · ')}`));
    if (ways.length === 0) block.append(el('p', 'pack-item', `${item.name}: ${whyNot(game, item)}`));
  }

  // Attack spells, once each (at the lowest slot level with a slot left).
  const spells = options.filter((option, i) => option.source === 'spell' && options.findIndex((o) => o.spellId === option.spellId) === i);
  if (spells.length) {
    block.append(el('p', 'sheet-line', 'Attack spells'));
    for (const option of spells) block.append(el('p', 'pack-item', `${option.name}: ${attackSummary(option).join(' · ')}`));
  }
  return block;
}

// Why a weapon in the pack can't be used just now.
function whyNot(game, item) {
  const props = item.properties || [];
  if (props.includes('two-handed') && game.character.shield) return 'needs both hands, so not while you carry a Shield';
  if (item.ammunition) return `no ${findItem(item.ammunition).name.toLowerCase()}s left`;
  return 'can’t be used just now';
}

// The Sheet tab during play: the hero's sheet (every number taps open to show its maths),
// plus what changes in play: Heroic Inspiration, coins and the pack, the armour worn and
// every attack the hero has (with the numbers the fight uses), the spells on the hero, and
// buttons to cast Mage Armor, False Life, Longstrider, Aid, Cure Wounds or Healing Word
// between fights. A Wizard or Cleric who has just finished a Long Rest can change their
// prepared spells here, until the story moves on.

import { findBond, findDrive } from '../character/creation.js';
import { findItem, itemText, moneyText } from '../character/inventory.js';
import { armorClass, findArmor } from '../character/sheet.js';
import { heroAttackOptions } from '../combat/attacks.js';
import { shield } from '../../../data/srd/armor.js';
import { attackSummary, selfSpellText } from './attack-text.js';
import { activeSpellIds, castSelfSpell, lastsText, selfSpellsToCast } from '../character/spell-effects.js';
import { findSpell, preparePicks, togglePrepared } from '../character/spells.js';
import { actionButton } from './backup-panels.js';
import { featureUsesLeft, featureUsesMax, heroMaxHp, slotsAt, slotsLeft } from '../character/resources.js';
import { levelUpReady, nextLevelXp } from '../character/level-up.js';
import { heroSheet } from './hero-sheet.js';
import { el } from './dom.js';
import { chip, chipRow, expandable } from './widgets.js';

// onCast(game): the hero cast a spell from the Sheet (save the game). note: a line to show
// at the top of the casting section, saying what the last spell did.
export function sheetPanel(game, { onCast = () => {}, note = null } = {}) {
  const { character } = game;
  const panel = el('div', 'sheet-panel');

  // What's spent and what's left.
  const now = el('section', 'sheet-block');
  now.append(el('h3', 'section-heading', 'Right now'));
  now.append(el('p', 'sheet-line', `Hit Points: ${game.hp} of ${heroMaxHp(game)}`));
  if (game.tempHp) now.append(el('p', 'sheet-line', `Temporary Hit Points: ${game.tempHp} (lost first; gone after a Long Rest)`));
  for (const { id, lasts } of game.activeSpells || []) now.append(el('p', 'sheet-line', `On you: ${findSpell(id).name}, ${lastsText(lasts)}`));
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
    ['channel-divinity', 'Channel Divinity'],
  ]) {
    if (featureUsesMax(character, id)) now.append(el('p', 'sheet-line', `${name}: ${featureUsesLeft(game, id)} of ${featureUsesMax(character, id)} left`));
  }
  now.append(el('p', 'section-hint', 'A long rest brings back Hit Points, spell slots and every use of your features.'));
  panel.append(now);
  const preparing = prepareBlock(game, () => {
    onCast(game);
    panel.replaceWith(sheetPanel(game, { onCast }));
  });
  if (preparing) panel.append(preparing);
  const casting = castBlock(game, note, (text) => {
    onCast(game);
    panel.replaceWith(sheetPanel(game, { onCast, note: text }));
  });
  if (casting) panel.append(casting);
  panel.append(gearBlock(game));

  panel.append(heroSheet(character, { spellsOn: activeSpellIds(game) }));

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
  const ac = armorClass(character, activeSpellIds(game)).value;
  const worn = character.armorId ? findArmor(character.armorId) : null;
  const mageArmor = !worn && activeSpellIds(game).includes('mage-armor');
  block.append(el('p', 'sheet-line', `Wearing: ${worn ? worn.name : mageArmor ? 'no armour, but Mage Armor' : 'no armour'} (Armor Class ${ac})`));
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

  // Spells for a fight, once each (a free cast first, or the lowest slot level left).
  const spells = options.filter((option, i) => option.source === 'spell' && options.findIndex((o) => o.spellId === option.spellId) === i);
  if (spells.length) {
    block.append(el('p', 'sheet-line', 'Spells in a fight'));
    for (const option of spells) block.append(el('p', 'pack-item', `${option.name}: ${attackSummary(option).join(' · ')}`));
  }
  return block;
}

// Prepared spells (a Wizard's or a Cleric's): which they have ready now, and, straight after
// a Long Rest (game.canPrepare, until the story moves on), a chip for each spell they could
// prepare instead. onChange() after each change.
function prepareBlock(game, onChange) {
  const picks = preparePicks(game.character);
  if (!picks) return null;
  const block = el('section', 'sheet-block');
  block.append(el('h3', 'section-heading', 'Prepared spells'));
  const names = picks.chosen.map((id) => findSpell(id).name).join(', ') || 'none';
  if (!game.canPrepare || game.battle) {
    block.append(el('p', 'sheet-line', `${picks.chosen.length} of ${picks.count}: ${names}`));
    block.append(el('p', 'section-hint', 'You can change them after a Long Rest, until the story moves on.'));
    return block;
  }
  block.append(el('p', 'section-hint', `You’ve just finished a Long Rest: choose which spells to have ready. ${picks.chosen.length} of ${picks.count} chosen. Once you make your next choice in the story, they’re set until the next Long Rest.`));
  const full = picks.chosen.length >= picks.count;
  block.append(
    chipRow(
      picks.from.map((id) => {
        const spell = findSpell(id);
        const selected = picks.chosen.includes(id);
        return chip({
          key: `prepare-${id}`,
          label: `${spell.name} (level ${spell.level})`,
          selected,
          disabled: !selected && full,
          onToggle: () => {
            game.character = togglePrepared(game.character, id);
            onChange();
          },
        });
      }),
      'Prepared spells',
    ),
  );
  return block;
}

// Spells the hero casts on themselves between fights, before trouble starts or after it: a
// button for each way they can cast it (a free cast, or each spell slot level they have left
// that makes a difference). onCast(text) after one.
function castBlock(game, note, onCast) {
  const choices = selfSpellsToCast(game);
  if (choices.length === 0) return null;
  const block = el('section', 'sheet-block');
  block.append(el('h3', 'section-heading', 'Cast a spell on yourself'));
  if (note) block.append(el('p', 'dm-note', note));
  if (game.battle) {
    block.append(el('p', 'section-hint', 'In a fight, cast your spells from the battle screen.'));
    return block;
  }
  const healing = choices.some(({ spell }) => spell.combat.kind === 'heal');
  const guarding = choices.some(({ spell }) => spell.combat.kind !== 'heal');
  const when = healing && guarding ? 'Guard yourself before trouble starts, and heal after it.' : healing ? 'Heal yourself after a fight.' : 'Best cast before trouble starts.';
  block.append(el('p', 'section-hint', `${when} Each cast uses a spell slot, or a free cast if you have one.`));
  for (const { spell, slots, problem } of choices) {
    const row = el('div', 'sheet-cast');
    row.append(el('p', 'sheet-line', `${spell.name}: ${selfSpellText(spell, game.character)}`));
    if (problem) row.append(el('p', 'section-hint', problem));
    const buttons = el('div', 'slot-actions');
    for (const slot of slots) {
      const label = slot === 'free' ? 'Cast it free (once per Long Rest)' : `Cast (level ${slot} slot)`;
      buttons.append(actionButton(label, () => onCast(`You cast ${castSelfSpell(game, spell.id, slot)}`)));
    }
    if (slots.length) row.append(buttons);
    block.append(row);
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

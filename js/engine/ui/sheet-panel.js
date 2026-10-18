// The Sheet tab during play: the hero's sheet (every number taps open to show its maths),
// plus what changes in play: Heroic Inspiration, coins and the pack, the armour worn and
// every attack the hero has (with the numbers the fight uses), the spells on the hero, and
// buttons to cast Mage Armor, False Life, Longstrider, Aid, Cure Wounds, Healing Word or
// Prayer of Healing between fights, on the hero or their companions. A Wizard or Cleric who
// has just finished a Long Rest can change their prepared spells here, until the story moves
// on.

import { findBond, findDrive } from '../character/creation.js';
import { findItem, itemText, moneyText, wornItems } from '../character/inventory.js';
import { armorClass, describeCharacter, findArmor, findMastery, findWeapon, masteredWeapons } from '../character/sheet.js';
import { heroAttackOptions } from '../combat/attacks.js';
import { shield } from '../../../data/srd/armor.js';
import { attackSummary, sheetSpellText } from './attack-text.js';
import { activeSpellIds, castFromSheet, lastsText, namesText, sheetSpells } from '../character/spell-effects.js';
import { findSpell, preparePicks, togglePrepared } from '../character/spells.js';
import { actionButton } from './backup-panels.js';
import { featureUsesLeft, featureUsesMax, heroMaxHp, hpMaxDropOf, slotsAt, slotsLeft } from '../character/resources.js';
import { levelUpReady, nextLevelXp } from '../character/level-up.js';
import { heroSheet } from './hero-sheet.js';
import { el } from './dom.js';
import { chip, chipRow, expandable } from './widgets.js';
import { findCompanion, findTactic, memberGame, memberMaxHp, setTactic } from '../character/party.js';
import { tactics } from '../../../data/campaign/companions.js';
import { heroSprite } from '../character/look.js';
import { portrait } from './sprite-canvas.js';

// onCast(game): the hero cast a spell from the Sheet (save the game). note: a line to show
// at the top of the casting section, saying what the last spell did.
export function sheetPanel(game, { onCast = () => {}, note = null } = {}) {
  const { character } = game;
  const panel = el('div', 'sheet-panel');

  // What's spent and what's left.
  const now = el('section', 'sheet-block');
  now.append(el('h3', 'section-heading', 'Right now'));
  now.append(el('p', 'sheet-line', `Hit Points: ${game.hp} of ${heroMaxHp(game)}`));
  if (hpMaxDropOf(game)) now.append(el('p', 'sheet-line', `Life Drain: your Hit Point maximum is ${hpMaxDropOf(game)} lower, until you finish a Long Rest`));
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
  const party = partyBlock(game, () => {
    onCast(game);
    panel.replaceWith(sheetPanel(game, { onCast }));
  });
  if (party) panel.append(party);
  const preparing = prepareBlock(game, () => {
    onCast(game);
    panel.replaceWith(sheetPanel(game, { onCast }));
  });
  if (preparing) panel.append(preparing);
  const casting = castBlock(
    game,
    note,
    (text) => {
      onCast(game);
      panel.replaceWith(sheetPanel(game, { onCast, note: text }));
    },
    () => panel.replaceWith(sheetPanel(game, { onCast, note })),
  );
  if (casting) panel.append(casting);
  panel.append(gearBlock(game));

  panel.append(heroSheet(character, { spellsOn: activeSpellIds(game), worn: wornItems(game) }));

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
    else if (item.worn) label += ' (wearing)';
    pack.append(item.text ? expandable(label, item.text) : el('p', 'pack-item', label));
  }
  panel.append(pack);
  return panel;
}

// What the hero wears, and what they can attack with: each weapon (and attack spell) with its
// chance to hit, damage and reach, the same numbers the battle screen shows.
// What a worn magic item gives: "+1 Armor Class, +1 to every saving throw".
function wornText(item) {
  const gives = [];
  if (item.worn.ac) gives.push(`+${item.worn.ac} Armor Class`);
  if (item.worn.saves) gives.push(`+${item.worn.saves} to every saving throw`);
  return gives.join(', ');
}

function gearBlock(game) {
  const { character } = game;
  const block = el('section', 'sheet-block');
  block.append(el('h3', 'section-heading', 'Armour and weapons'));
  const ac = armorClass(character, activeSpellIds(game), wornItems(game)).value;
  const worn = character.armorId ? findArmor(character.armorId) : null;
  const mageArmor = !worn && activeSpellIds(game).includes('mage-armor');
  block.append(el('p', 'sheet-line', `Wearing: ${worn ? worn.name : mageArmor ? 'no armour, but Mage Armor' : 'no armour'} (Armor Class ${ac})`));
  if (character.shield) block.append(el('p', 'sheet-line', `Shield: on your arm (+${shield.acBonus} Armor Class)`));
  for (const item of wornItems(game)) block.append(el('p', 'sheet-line', `${item.name}: worn (${wornText(item)})`));

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
  const mastered = masteredWeapons(character).map(findWeapon);
  if (mastered.length) block.append(el('p', 'section-hint', `Weapon Mastery: ${mastered.map((w) => `${w.name} (${findMastery(w.mastery).name})`).join(', ')}.`));
  // The Light property: two Light weapons (or two of one) and a free hand.
  const lights = weapons.filter((entry) => (findItem(entry.id).properties || []).includes('light'));
  if (!character.shield && (lights.length >= 2 || lights.some((entry) => entry.quantity >= 2))) {
    block.append(el('p', 'section-hint', 'Two Light weapons: in a fight, after you attack with one, you can attack with the other as a Bonus Action, without your ability modifier on its damage.'));
  }

  // Spells for a fight, once each (a free cast first, or the lowest slot level left).
  const spells = options.filter((option, i) => option.source === 'spell' && options.findIndex((o) => o.spellId === option.spellId) === i);
  if (spells.length) {
    block.append(el('p', 'sheet-line', 'Spells in a fight'));
    for (const option of spells) block.append(el('p', 'pack-item', `${option.name}: ${attackSummary(option).join(' · ')}`));
  }
  return block;
}

// The companions with the hero: each one's portrait, Hit Points, what they like and dislike,
// how they fight (a chip for each tactic; onChange() after a change), and their full sheet.
function partyBlock(game, onChange) {
  if (!(game.party || []).length) return null;
  const block = el('section', 'sheet-block');
  block.append(el('h3', 'section-heading', 'Party'));
  block.append(el('p', 'section-hint', 'Your companions fight on their own. Choose how each one fights.'));
  for (const member of game.party) {
    const companion = findCompanion(member.id);
    const character = memberGame(game, member).character;
    const row = el('div', 'party-member');
    const who = el('div', 'party-who');
    who.append(el('p', 'sheet-line', `${character.name} · ${describeCharacter(character)}`));
    const hp = member.fallen ? 'Fallen: they can be raised at a temple, or by a spell' : `Hit Points: ${member.hp} of ${memberMaxHp(game, member)}`;
    who.append(el('p', 'sheet-line', hp));
    if (!member.fallen && hpMaxDropOf(member)) who.append(el('p', 'sheet-line', `Life Drain: ${character.name.split(' ')[0]}’s Hit Point maximum is ${hpMaxDropOf(member)} lower, until a Long Rest`));
    for (const { id, lasts } of member.activeSpells || []) who.append(el('p', 'sheet-line', `On ${character.name.split(' ')[0]}: ${findSpell(id).name}, ${lastsText(lasts)}`));
    who.append(el('p', 'section-hint', companion.summary));
    who.append(el('p', 'section-hint', `Likes ${companion.likes.join(', ')}. Dislikes ${companion.dislikes.join(', ')}.`));
    row.append(portrait(heroSprite(character), { scale: 3, label: character.name }), who);
    block.append(row);
    block.append(
      chipRow(
        tactics.map((tactic) =>
          chip({
            key: `tactic-${member.id}-${tactic.id}`,
            label: tactic.name,
            selected: member.tactic === tactic.id,
            onToggle: () => {
              setTactic(game, member.id, tactic.id);
              onChange();
            },
          }),
        ),
        `How ${character.name} fights`,
      ),
    );
    // A spellcaster's tactic also says which Concentration spell they open a real fight with.
    const tactic = findTactic(member.tactic);
    block.append(el('p', 'section-hint', character.spells ? `${tactic.summary} ${tactic.spellNote}` : tactic.summary));
    const sheet = el('details', 'expandable');
    sheet.append(el('summary', '', `${character.name.split(' ')[0]}’s sheet`), heroSheet(character, { spellsOn: (member.activeSpells || []).map((s) => s.id), worn: wornItems(member) }));
    block.append(sheet);
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

// Who each spell on the Sheet is for, as chosen with its chips (spell id → 'hero' or a
// companion's id). Kept while the game is open; a choice that no longer fits falls back.
const chosenTargets = new Map();

// Spells the hero casts between fights, before trouble starts or after it: a button for each
// way they can cast it (a free cast, or each spell slot level they have left that makes a
// difference). With companions, a spell for one creature has a chip for each of the party to
// choose who it's for (the most hurt first, for healing), and a spell for the whole party says
// who it will reach. onCast(text) after a cast; refresh() after choosing someone.
function castBlock(game, note, onCast, refresh) {
  const choices = sheetSpells(game);
  if (choices.length === 0) return null;
  const company = (game.party || []).some((m) => !m.fallen);
  const block = el('section', 'sheet-block');
  block.append(el('h3', 'section-heading', company ? 'Cast a spell' : 'Cast a spell on yourself'));
  if (note) block.append(el('p', 'dm-note', note));
  if (game.battle) {
    block.append(el('p', 'section-hint', 'In a fight, cast your spells from the battle screen.'));
    return block;
  }
  const healing = choices.some(({ spell }) => spell.combat.kind === 'heal');
  const guarding = choices.some(({ spell }) => spell.combat.kind !== 'heal');
  const you = company ? 'your party' : 'yourself';
  const when = healing && guarding ? `Guard ${you} before trouble starts, and heal after it.` : healing ? `Heal ${you} after a fight.` : 'Best cast before trouble starts.';
  block.append(el('p', 'section-hint', `${when} Each cast uses a spell slot, or a free cast if you have one.`));
  for (const { spell, aim, slots, problem, targets } of choices) {
    const row = el('div', 'sheet-cast');
    row.append(el('p', 'sheet-line', `${spell.name}: ${sheetSpellText(spell, game.character, { company })}`));
    if (problem) row.append(el('p', 'section-hint', problem));
    let target = 'hero';
    if (aim === 'friend' && targets.length > 1 && slots.length) {
      target = targetFor(spell, targets);
      row.append(
        chipRow(
          targets.map((t) =>
            chip({
              key: `cast-${spell.id}-${t.id}`,
              label: spell.combat.kind === 'heal' ? `${t.you ? 'You' : t.name} ${t.hp}/${t.maxHp}` : t.you ? 'You' : t.name,
              selected: t.id === target,
              disabled: Boolean(t.problem),
              onToggle: () => {
                chosenTargets.set(spell.id, t.id);
                refresh();
              },
            }),
          ),
          `Who ${spell.name} is for`,
        ),
      );
    } else if (aim === 'party' && targets.length > 1 && slots.length) {
      const reached = targets.filter((t) => !t.problem).map((t) => t.name);
      row.append(el('p', 'section-hint', `It reaches ${namesText(reached)}.`));
    }
    const buttons = el('div', 'slot-actions');
    for (const slot of slots) {
      const label = slot === 'free' ? 'Cast it free (once per Long Rest)' : `Cast (level ${slot} slot)`;
      buttons.append(actionButton(label, () => onCast(`You cast ${castFromSheet(game, spell.id, slot, target)}`)));
    }
    if (slots.length) row.append(buttons);
    block.append(row);
  }
  return block;
}

// Who a spell for one creature is for: the one chosen with its chips, if it still helps them;
// otherwise, for healing, the most hurt of the party (you first of equals), and for the rest,
// you if it helps you, or else the first it does.
function targetFor(spell, targets) {
  const fits = targets.filter((t) => !t.problem);
  const chosen = fits.find((t) => t.id === chosenTargets.get(spell.id));
  if (chosen) return chosen.id;
  if (spell.combat.kind === 'heal') return [...fits].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0].id;
  return fits[0].id;
}

// Why a weapon in the pack can't be used just now.
function whyNot(game, item) {
  const props = item.properties || [];
  if (props.includes('two-handed') && game.character.shield) return 'needs both hands, so not while you carry a Shield';
  if (item.ammunition) return `no ${findItem(item.ammunition).name.toLowerCase()}s left`;
  return 'can’t be used just now';
}

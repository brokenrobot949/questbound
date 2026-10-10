// Spells the hero casts on themselves that outlast the moment: Mage Armor, Longstrider, and
// False Life's Temporary Hit Points. They can be cast from the Sheet between fights or as an
// action in one. They change in play, so they live on the game (and are saved):
//
//   game.activeSpells  [{ id, lasts }]: spells on the hero now. lasts is 'long-rest' (ends at
//                      the next Long Rest: Mage Armor's 8 hours) or 'hour' (ends when the
//                      time of day moves on in the story, or at a rest: Longstrider's hour)
//   game.tempHp        Temporary Hit Points. Rules: SRD 5.2.1, "Temporary Hit Points": they're
//                      lost before Hit Points, they don't stack (you keep the higher), and
//                      they last until they're used up or you finish a Long Rest.
//
// Spells and their numbers are in data/srd/spells.js (combat.kind 'self').

import { findSpell, canCastSpell, freeCastKey, freeCastsLeft } from './spells.js';
import { slotsLeft, spendSlot } from './resources.js';
import { armorClass, speed } from './sheet.js';
import { rollDice } from '../rules/dice.js';
import { spells } from '../../../data/srd/spells.js';

export const activeSpellIds = (game) => (game.activeSpells || []).map((s) => s.id);

// Why the hero can't cast this spell on themselves now, or null. slotLevel: the spell slot's
// level, or 'free' for a free cast (Magic Initiate's spell, once per Long Rest).
export function selfSpellProblem(game, spellId, slotLevel) {
  const spell = findSpell(spellId);
  if (!spell || !spell.combat || spell.combat.kind !== 'self') return `${spell ? spell.name : spellId} isn't a spell you cast on yourself.`;
  if (!canCastSpell(game.character, spellId)) return `You haven't prepared ${spell.name}.`;
  if (slotLevel === 'free') {
    if (freeCastsLeft(game, spellId) < 1) return `You have no free casts of ${spell.name} left until your next Long Rest.`;
  } else if (!Number.isInteger(slotLevel) || slotLevel < spell.level || slotsLeft(game, slotLevel) < 1) {
    return `You have no level ${slotLevel} spell slots left.`;
  }
  if (spell.combat.self === 'mage-armor' && game.character.armorId) return 'Mage Armor only works on someone who isn’t wearing armour.';
  if (spell.combat.lasts && activeSpellIds(game).includes(spellId)) return `${spell.name} is already on you.`;
  return null;
}

// The self spells the hero could cast now, each with the ways they can: [{ spell, slots:
// ['free', 1, 2], problem }] ('free' for a free cast). For the Sheet.
export function selfSpellsToCast(game) {
  const list = [];
  for (const spell of spells.filter((s) => s.combat && s.combat.kind === 'self')) {
    if (!canCastSpell(game.character, spell.id)) continue;
    const slots = [];
    if (!selfSpellProblem(game, spell.id, 'free')) slots.push('free');
    for (let level = spell.level; level <= 9; level++) if (!selfSpellProblem(game, spell.id, level)) slots.push(level);
    list.push({ spell, slots, problem: slots.length ? null : selfSpellProblem(game, spell.id, spell.level) });
  }
  return list;
}

// Casts it: spends the slot, then gives the Temporary Hit Points or puts the spell on the
// hero. Returns a sentence saying what happened, for the fight log or a DM note.
export function castSelfSpell(game, spellId, slotLevel) {
  const problem = selfSpellProblem(game, spellId, slotLevel);
  if (problem) throw new Error(problem);
  const spell = findSpell(spellId);
  const c = spell.combat;
  const free = slotLevel === 'free';
  if (free) game.featureUses[freeCastKey(spellId)] = (game.featureUses[freeCastKey(spellId)] || 0) + 1;
  else spendSlot(game, slotLevel);
  if (c.self === 'false-life') {
    const [count, sides] = c.tempHp.dice.split('d').map(Number);
    const roll = rollDice(game.rng, count, sides);
    const extra = free ? 0 : (slotLevel - spell.level) * (c.upcastTempHp || 0);
    const gained = roll.total + c.tempHp.bonus + extra;
    const had = game.tempHp || 0;
    game.tempHp = Math.max(had, gained); // they don't stack: keep the higher
    const sum = `${c.tempHp.dice} (${roll.rolls.join(', ')}) + ${c.tempHp.bonus}${extra ? ` + ${extra}` : ''} = ${gained}`;
    return had > gained
      ? `${spell.name}: ${sum} Temporary Hit Points, fewer than the ${had} you have, so you keep those.`
      : `${spell.name}: ${sum} Temporary Hit Points.`;
  }
  game.activeSpells = [...(game.activeSpells || []).filter((s) => s.id !== spellId), { id: spellId, lasts: c.lasts }];
  if (c.self === 'mage-armor') return `${spell.name}: your Armor Class is now ${armorClass(game.character, activeSpellIds(game)).value}, until your next Long Rest.`;
  if (c.self === 'longstrider') return `${spell.name}: your Speed is now ${speed(game.character, activeSpellIds(game)).value} feet, for about an hour.`;
  throw new Error(`Unknown self spell: ${c.self}`);
}

// The time of day has moved on: spells that last about an hour end. Returns their names.
export function timePasses(game) {
  const ending = (game.activeSpells || []).filter((s) => s.lasts === 'hour');
  game.activeSpells = (game.activeSpells || []).filter((s) => s.lasts !== 'hour');
  return ending.map((s) => findSpell(s.id).name);
}

// Damage goes to Temporary Hit Points first. Returns { soaked, rest }: how much they took,
// and how much is left over for Hit Points.
export function soakDamage(game, amount) {
  const soaked = Math.min(game.tempHp || 0, amount);
  game.tempHp = (game.tempHp || 0) - soaked;
  return { soaked, rest: amount - soaked };
}

// "Until your next Long Rest", "for about an hour": how long a spell on the hero lasts.
export function lastsText(lasts) {
  return lasts === 'hour' ? 'for about an hour' : 'until your next Long Rest';
}


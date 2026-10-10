// Spells the hero casts on themselves outside the moment of a fight: Mage Armor, Longstrider,
// Aid, False Life's Temporary Hit Points, and the healing of Cure Wounds and Healing Word.
// They can be cast from the Sheet between fights or in one. The lasting ones change in play,
// so they live on the game (and are saved):
//
//   game.activeSpells  [{ id, lasts, hpBonus }]: spells on the hero now. lasts is 'long-rest'
//                      (ends at the next Long Rest: Mage Armor's and Aid's 8 hours) or 'hour'
//                      (ends when the time of day moves on in the story, or at a rest:
//                      Longstrider's hour). hpBonus: what Aid adds to the Hit Point maximum.
//
// A Life Domain Cleric's Disciple of Life adds 2 + the slot's level to healing from a spell
// cast with a spell slot (not a free cast). Prayer of Healing (10 minutes, so never in a
// fight) heals a creature once until it finishes a Long Rest: game.featureUses counts it under
// receivedKey(spell id), which a Long Rest clears.
//   game.tempHp        Temporary Hit Points. Rules: SRD 5.2.1, "Temporary Hit Points": they're
//                      lost before Hit Points, they don't stack (you keep the higher), and
//                      they last until they're used up or you finish a Long Rest.
//
// Spells and their numbers are in data/srd/spells.js (combat.kind 'self' and 'heal').

import { findSpell, canCastSpell, freeCastKey, freeCastsLeft, spellAbility, upcastDice, upcastHelps } from './spells.js';
import { heal, heroMaxHp, slotsAt, slotsLeft, spendSlot } from './resources.js';
import { abilityModifierOf, armorClass, hasFeature, speed } from './sheet.js';
import { rollDice } from '../rules/dice.js';
import { spells } from '../../../data/srd/spells.js';

export const activeSpellIds = (game) => (game.activeSpells || []).map((s) => s.id);

// Spells that can be cast on the hero between fights, from the Sheet.
const BETWEEN_FIGHTS = ['self', 'heal'];

// Why the hero can't cast this spell on themselves now, or null. slotLevel: the spell slot's
// level, or 'free' for a free cast (Magic Initiate's spell, once per Long Rest).
export function selfSpellProblem(game, spellId, slotLevel) {
  const spell = findSpell(spellId);
  if (!spell || !spell.combat || !BETWEEN_FIGHTS.includes(spell.combat.kind)) return `${spell ? spell.name : spellId} isn't a spell you cast on yourself.`;
  if (!canCastSpell(game.character, spellId)) return `You haven't prepared ${spell.name}.`;
  if (slotLevel === 'free') {
    if (freeCastsLeft(game, spellId) < 1) return `You have no free casts of ${spell.name} left until your next Long Rest.`;
  } else if (!Number.isInteger(slotLevel) || slotLevel < spell.level || slotsLeft(game, slotLevel) < 1) {
    return `You have no level ${slotLevel} spell slots left.`;
  }
  if (spell.combat.self === 'mage-armor' && game.character.armorId) return 'Mage Armor only works on someone who isn’t wearing armour.';
  if (spell.combat.lasts && activeSpellIds(game).includes(spellId)) return `${spell.name} is already on you.`;
  if (spell.combat.kind === 'heal' && game.hp >= heroMaxHp(game)) return 'You’re at full Hit Points.';
  if (spell.combat.oncePerLongRest && (game.featureUses || {})[receivedKey(spellId)]) return `${spell.name} has healed you since your last Long Rest.`;
  return null;
}

// Where a spell that heals a creature once per Long Rest notes that it has (game.featureUses).
export const receivedKey = (spellId) => `received:${spellId}`;

// The self spells the hero could cast now, each with the ways they can: [{ spell, slots:
// ['free', 1, 2], problem }] ('free' for a free cast). A higher slot is offered only when it
// does more (Cure Wounds heals more; Mage Armor doesn't change). For the Sheet.
export function selfSpellsToCast(game) {
  const list = [];
  for (const spell of spells.filter((s) => s.combat && BETWEEN_FIGHTS.includes(s.combat.kind))) {
    if (!canCastSpell(game.character, spell.id)) continue;
    const slots = [];
    if (!selfSpellProblem(game, spell.id, 'free')) slots.push('free');
    for (let level = spell.level; level <= 9; level++) {
      if (selfSpellProblem(game, spell.id, level)) continue;
      slots.push(level);
      if (!upcastHelps(spell)) break;
    }
    // Why not, if not: asked of the free cast if one is left or the hero has no slots for it
    // (so a Fighter hears "you're at full Hit Points" or "no free casts left"), else of the
    // spell's own slot level.
    const anySlots = [...Array(10).keys()].some((level) => level >= spell.level && slotsAt(game.character, level) > 0);
    const why = selfSpellProblem(game, spell.id, freeCastsLeft(game, spell.id) > 0 || !anySlots ? 'free' : spell.level);
    list.push({ spell, slots, problem: slots.length ? null : why });
  }
  return list;
}

// The Hit Points a healing spell gives back, before rolling: { dice, bonus } (the bonus is the
// spellcasting ability modifier for wherever the hero got the spell). above: slot levels above
// the spell's own.
export function healingFor(character, spellId, above = 0) {
  const spell = findSpell(spellId);
  const ability = spellAbility(character, spellId);
  const bonus = ability && !spell.combat.heal.noModifier ? abilityModifierOf(character, ability) : 0;
  return { dice: upcastDice(spell.combat.heal.dice, spell.combat.upcast, above), bonus };
}

// Casts it: spends the slot, then heals, gives the Temporary Hit Points or puts the spell on
// the hero. Returns a sentence saying what happened, for the fight log or a DM note.
export function castSelfSpell(game, spellId, slotLevel) {
  const problem = selfSpellProblem(game, spellId, slotLevel);
  if (problem) throw new Error(problem);
  const spell = findSpell(spellId);
  const c = spell.combat;
  const free = slotLevel === 'free';
  const above = free ? 0 : slotLevel - spell.level;
  if (free) game.featureUses[freeCastKey(spellId)] = (game.featureUses[freeCastKey(spellId)] || 0) + 1;
  else spendSlot(game, slotLevel);
  if (c.kind === 'heal') {
    const { dice, bonus } = healingFor(game.character, spellId, above);
    const [count, sides] = dice.split('d').map(Number);
    const roll = rollDice(game.rng, count, sides);
    const disciple = free ? 0 : discipleOfLife(game.character, slotLevel);
    const total = Math.max(0, roll.total + bonus) + disciple;
    const gained = heal(game, total);
    const sign = bonus < 0 ? '−' : '+';
    const extra = disciple ? ` + ${disciple} (Disciple of Life)` : '';
    const sum = `${dice} (${roll.rolls.join(', ')})${bonus ? ` ${sign} ${Math.abs(bonus)}` : ''}${extra} = ${total}`;
    if (c.oncePerLongRest) game.featureUses[receivedKey(spellId)] = 1;
    return `${spell.name}: ${sum}. You regain ${gained} Hit Point${gained === 1 ? '' : 's'}.`;
  }
  if (c.self === 'aid') {
    const hpBonus = c.hpBonus + above * (c.upcastHp || 0);
    game.activeSpells = [...(game.activeSpells || []).filter((s) => s.id !== spellId), { id: spellId, lasts: c.lasts, hpBonus }];
    game.hp += hpBonus;
    return `${spell.name}: your Hit Point maximum and current Hit Points rise by ${hpBonus}, until your next Long Rest.`;
  }
  if (c.self === 'false-life') {
    const [count, sides] = c.tempHp.dice.split('d').map(Number);
    const roll = rollDice(game.rng, count, sides);
    const extra = above * (c.upcastTempHp || 0);
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

// Disciple of Life (Life Domain, level 3): the extra healing from a spell cast with a slot of
// this level, or 0 for a hero without it.
export function discipleOfLife(character, slotLevel) {
  return hasFeature(character, 'disciple-of-life') && Number.isInteger(slotLevel) ? 2 + slotLevel : 0;
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

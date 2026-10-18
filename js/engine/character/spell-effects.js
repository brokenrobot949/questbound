// Spells the hero casts on themselves or their companions outside the moment of a fight:
// Mage Armor, Longstrider, Aid, False Life's Temporary Hit Points, and the healing of Cure
// Wounds, Healing Word and Prayer of Healing. They're cast from the Sheet between fights (and
// in a fight from the battle screen: combat/battle.js). Who a spell can go on comes from its
// data (spells.js spellAim): only the hero (False Life), the hero or one companion (Cure
// Wounds, Longstrider), or the whole party (Aid, Prayer of Healing). The lasting ones change
// in play, so they live on the game (and are saved), and on each companion's place in the
// party (character/party.js):
//
//   activeSpells  [{ id, lasts, hpBonus }]: spells on the hero (game.activeSpells) or a
//                 companion (member.activeSpells) now. lasts is 'long-rest' (ends at the next
//                 Long Rest: Mage Armor's and Aid's 8 hours) or 'hour' (ends when the time of
//                 day moves on in the story, or at a rest: Longstrider's hour). hpBonus: what
//                 Aid adds to the Hit Point maximum.
//
// A Life Domain Cleric's Disciple of Life adds 2 + the slot's level to healing from a spell
// cast with a spell slot (not a free cast), for each creature it heals. Prayer of Healing (10
// minutes, so never in a fight) heals each creature once until it finishes a Long Rest: its
// featureUses count it under receivedKey(spell id), which a Long Rest clears.
//   game.tempHp        Temporary Hit Points. Rules: SRD 5.2.1, "Temporary Hit Points": they're
//                      lost before Hit Points, they don't stack (you keep the higher), and
//                      they last until they're used up or you finish a Long Rest.
//
// Spells and their numbers are in data/srd/spells.js (combat.kind 'self' and 'heal').

import { findSpell, canCastSpell, freeCastKey, freeCastsLeft, spellAbility, spellAim, upcastDice, upcastHelps } from './spells.js';
import { heal, heroMaxHp, slotsAt, slotsLeft, spendSlot } from './resources.js';
import { abilityModifierOf, armorClass, hasFeature, speed } from './sheet.js';
import { findCompanion, fightingMembers, memberGame } from './party.js';
import { wornItems } from './inventory.js';
import { rollDice } from '../rules/dice.js';
import { spells } from '../../../data/srd/spells.js';

export const activeSpellIds = (game) => (game.activeSpells || []).map((s) => s.id);

// Spells that can be cast between fights, from the Sheet.
const BETWEEN_FIGHTS = ['self', 'heal'];

// Where a spell that heals a creature once per Long Rest notes that it has (featureUses).
export const receivedKey = (spellId) => `received:${spellId}`;

// Who a spell from the Sheet can go on: the hero, then each companion who hasn't fallen.
// [{ id: 'hero' or the companion's id, name, you, game }]: game is the rules' view of that one
// (the game itself, or the companion's memberGame).
export function spellTargets(game) {
  const party = fightingMembers(game).map((member) => {
    const view = memberGame(game, member);
    return { id: member.id, name: view.character.name.split(' ')[0], you: false, game: view };
  });
  return [{ id: 'hero', name: 'you', you: true, game }, ...party];
}

// Why the hero can't cast this spell from the Sheet now, whoever it's for: it isn't one for
// between fights, it isn't prepared, or there's no slot (or free cast) for it. slotLevel: the
// spell slot's level, or 'free' for a free cast (Magic Initiate's spell, once per Long Rest).
function casterProblem(game, spell, slotLevel) {
  if (!spell || !spell.combat || !BETWEEN_FIGHTS.includes(spell.combat.kind)) return `${spell ? spell.name : 'That'} isn't a spell you cast between fights.`;
  if (!canCastSpell(game.character, spell.id)) return `You haven't prepared ${spell.name}.`;
  if (slotLevel === 'free') {
    if (freeCastsLeft(game, spell.id) < 1) return `You have no free casts of ${spell.name} left until your next Long Rest.`;
  } else if (!Number.isInteger(slotLevel) || slotLevel < spell.level || slotsLeft(game, slotLevel) < 1) {
    return `You have no level ${slotLevel} spell slots left.`;
  }
  return null;
}

// Why the spell would do nothing for this one of the party (from spellTargets), or null.
export function targetProblem(target, spell) {
  const c = spell.combat;
  const on = target.you ? 'you' : target.name;
  if (c.self === 'mage-armor' && target.game.character.armorId) return target.you ? 'Mage Armor only works on someone who isn’t wearing armour.' : `${target.name} is wearing armour.`;
  if (c.lasts && activeSpellIds(target.game).includes(spell.id)) return `${spell.name} is already on ${on}.`;
  if (c.kind === 'heal' && target.game.hp >= heroMaxHp(target.game)) return `${target.you ? 'You’re' : `${target.name} is`} at full Hit Points.`;
  if (c.oncePerLongRest && (target.game.featureUses || {})[receivedKey(spell.id)]) return `${spell.name} has healed ${on} since ${target.you ? 'your' : 'their'} last Long Rest.`;
  return null;
}

// Why nobody in the party can take the spell, when that's so (each has a problem).
function nobodyProblem(spell, targets) {
  if (targets.length === 1) return targets[0].problem;
  if (spell.combat.kind === 'heal') return spell.combat.oncePerLongRest ? `Everyone who’s hurt has had ${spell.name} since their last Long Rest.` : 'Everyone is at full Hit Points.';
  return `${targets[0].problem} Nobody else can take it either.`;
}

// Who the spell goes on: everyone it would help for a 'party' spell (up to its targets), the
// one chosen for the rest.
function targetsFor(game, spell, targetId) {
  const all = spellTargets(game);
  if (spellAim(spell) === 'party') return all.filter((t) => !targetProblem(t, spell)).slice(0, spell.combat.targets);
  return all.filter((t) => t.id === targetId);
}

// Why the hero can't cast this spell from the Sheet now, on this one of the party ('hero' or
// a companion's id; a 'party' spell goes on everyone it can help), or null.
export function sheetSpellProblem(game, spellId, slotLevel, targetId = 'hero') {
  const spell = findSpell(spellId);
  const problem = casterProblem(game, spell, slotLevel);
  if (problem) return problem;
  const aim = spellAim(spell);
  if (aim === 'self' && targetId !== 'hero') return `${spell.name} only works on you.`;
  const all = spellTargets(game).map((t) => ({ ...t, problem: targetProblem(t, spell) }));
  if (aim === 'party') return all.some((t) => !t.problem) ? null : nobodyProblem(spell, all);
  const target = all.find((t) => t.id === targetId);
  return target ? target.problem : `${targetId} isn’t with you.`;
}

// The spells the hero could cast from the Sheet now, each with the ways they can and who it
// can go on: [{ spell, aim, slots: ['free', 1, 2], problem, targets: [{ id, name, you, hp,
// maxHp, problem }] }] ('free' for a free cast). A higher slot is offered only when it does more
// (Cure Wounds heals more; Mage Armor doesn't change). Slots are offered while anyone can take
// the spell; problem says why not, if nobody can, or if it can't be cast at all.
export function sheetSpells(game) {
  const list = [];
  for (const spell of spells.filter((s) => s.combat && BETWEEN_FIGHTS.includes(s.combat.kind))) {
    if (!canCastSpell(game.character, spell.id)) continue;
    const aim = spellAim(spell);
    const everyone = aim === 'self' ? spellTargets(game).slice(0, 1) : spellTargets(game);
    const targets = everyone.map((t) => ({ id: t.id, name: t.name, you: t.you, hp: t.game.hp, maxHp: heroMaxHp(t.game), problem: targetProblem(t, spell) }));
    const anyone = targets.some((t) => !t.problem);
    const slots = [];
    if (anyone && !casterProblem(game, spell, 'free')) slots.push('free');
    for (let level = spell.level; anyone && level <= 9; level++) {
      if (casterProblem(game, spell, level)) continue;
      slots.push(level);
      if (!upcastHelps(spell)) break;
    }
    // Why not, if not: asked of the free cast if one is left or the hero has no slots for it
    // (so a Fighter hears "you're at full Hit Points" or "no free casts left"), else of the
    // spell's own slot level; then of who it would go on.
    const anySlots = [...Array(10).keys()].some((level) => level >= spell.level && slotsAt(game.character, level) > 0);
    const why = casterProblem(game, spell, freeCastsLeft(game, spell.id) > 0 || !anySlots ? 'free' : spell.level) || (anyone ? null : nobodyProblem(spell, targets));
    list.push({ spell, aim, slots, problem: slots.length ? null : why, targets });
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

// "You regain 5 Hit Points", "Odda regains 1 Hit Point".
export function regainText(target, gained) {
  const points = `${gained} Hit Point${gained === 1 ? '' : 's'}`;
  return target.you ? `You regain ${points}` : `${target.name} regains ${points}`;
}

// Puts a lasting spell (Mage Armor, Longstrider, Aid) on one of the party, and says what it
// does for them. target: { name, you, game } as spellTargets gives. extra: what Aid adds
// ({ hpBonus }). It doesn't change their Hit Points: Aid's caller does that.
export function putSpellOn(target, spell, extra = {}) {
  const view = target.game;
  view.activeSpells = [...(view.activeSpells || []).filter((s) => s.id !== spell.id), { id: spell.id, lasts: spell.combat.lasts, ...extra }];
  const whose = target.you ? 'your' : `${target.name}'s`;
  if (spell.combat.self === 'mage-armor') return `${whose} Armor Class is now ${armorClass(view.character, activeSpellIds(view), wornItems(view)).value}, ${lastsText(spell.combat.lasts)}`;
  if (spell.combat.self === 'longstrider') return `${whose} Speed is now ${speed(view.character, activeSpellIds(view)).value} feet, ${lastsText(spell.combat.lasts)}`;
  throw new Error(`Unknown lasting spell: ${spell.id}`);
}

// Names in a list: "you", "you and Odda", "you, Odda and Fen".
export function namesText(names) {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || 'nobody';
}

// Casts it from the Sheet, on this one of the party (a 'party' spell goes on everyone it can
// help): spends the slot, then heals, gives the Temporary Hit Points or puts the spell on
// them. Returns a sentence saying what happened, for a DM note.
export function castFromSheet(game, spellId, slotLevel, targetId = 'hero') {
  const problem = sheetSpellProblem(game, spellId, slotLevel, targetId);
  if (problem) throw new Error(problem);
  const spell = findSpell(spellId);
  const c = spell.combat;
  const free = slotLevel === 'free';
  const above = free ? 0 : slotLevel - spell.level;
  const targets = targetsFor(game, spell, targetId);
  if (free) game.featureUses[freeCastKey(spellId)] = (game.featureUses[freeCastKey(spellId)] || 0) + 1;
  else spendSlot(game, slotLevel);
  if (c.kind === 'heal') {
    // One roll, and each creature regains that much.
    const { dice, bonus } = healingFor(game.character, spellId, above);
    const [count, sides] = dice.split('d').map(Number);
    const roll = rollDice(game.rng, count, sides);
    const disciple = free ? 0 : discipleOfLife(game.character, slotLevel);
    const total = Math.max(0, roll.total + bonus) + disciple;
    const regained = targets.map((t) => {
      const gained = heal(t.game, total);
      if (c.oncePerLongRest) t.game.featureUses[receivedKey(spellId)] = 1;
      return regainText(t, gained);
    });
    const sign = bonus < 0 ? '−' : '+';
    const extra = disciple ? ` + ${disciple} (Disciple of Life)` : '';
    const sum = `${dice} (${roll.rolls.join(', ')})${bonus ? ` ${sign} ${Math.abs(bonus)}` : ''}${extra} = ${total}${targets.length > 1 ? ' each' : ''}`;
    return `${spell.name}: ${sum}. ${regained.join('; ')}.`;
  }
  if (c.self === 'aid') {
    const hpBonus = c.hpBonus + above * (c.upcastHp || 0);
    for (const t of targets) {
      t.game.activeSpells = [...(t.game.activeSpells || []).filter((s) => s.id !== spellId), { id: spellId, lasts: c.lasts, hpBonus }];
      t.game.hp += hpBonus;
    }
    if (targets.length === 1 && targets[0].you) return `${spell.name}: your Hit Point maximum and current Hit Points rise by ${hpBonus}, ${lastsText(c.lasts)}.`;
    return `${spell.name}: the Hit Point maximum and current Hit Points of ${namesText(targets.map((t) => t.name))} rise by ${hpBonus}, ${lastsText(c.lasts)}.`;
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
  return `${spell.name}: ${putSpellOn(targets[0], spell)}.`;
}

// Disciple of Life (Life Domain, level 3): the extra healing from a spell cast with a slot of
// this level, or 0 for a hero without it.
export function discipleOfLife(character, slotLevel) {
  return hasFeature(character, 'disciple-of-life') && Number.isInteger(slotLevel) ? 2 + slotLevel : 0;
}

// The time of day has moved on: spells that last about an hour end, on the hero and on their
// companions. Returns what ended: "Longstrider" for the hero's own, "Longstrider on Fen".
export function timePasses(game) {
  const ended = [];
  const holders = [{ view: game, on: '' }, ...(game.party || []).map((m) => ({ view: m, on: ` on ${findCompanion(m.id).character.name.split(' ')[0]}` }))];
  for (const { view, on } of holders) {
    for (const s of (view.activeSpells || []).filter((x) => x.lasts === 'hour')) ended.push(`${findSpell(s.id).name}${on}`);
    view.activeSpells = (view.activeSpells || []).filter((s) => s.lasts !== 'hour');
  }
  return ended;
}

// Damage goes to Temporary Hit Points first. Returns { soaked, rest }: how much they took,
// and how much is left over for Hit Points.
export function soakDamage(game, amount) {
  const soaked = Math.min(game.tempHp || 0, amount);
  game.tempHp = (game.tempHp || 0) - soaked;
  return { soaked, rest: amount - soaked };
}

// "Until your next Long Rest", "for about an hour": how long a lasting spell lasts.
export function lastsText(lasts) {
  return lasts === 'hour' ? 'for about an hour' : 'until your next Long Rest';
}

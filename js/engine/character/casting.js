// Casting spells in a scene, outside a fight: how a spell would be paid for, and paying it.
// Rules: SRD 5.2.1, "Spells" ("Casting Spells": spell slots and Rituals), the Wizard's Ritual
// Adept, and the Magic Initiate feat.
//
// A scene takes the cheapest way the hero has, in this order:
//   'cantrip'  costs nothing
//   'ritual'   a spell with the Ritual tag, cast as a Ritual: it takes 10 minutes longer and
//              uses no slot. A Wizard can do this for any ritual in their spellbook (prepared
//              or not); anyone else for a ritual spell they have prepared.
//   'free'     a free cast (Magic Initiate's spell, a species spell), once per Long Rest
//   'slot'     the lowest spell slot left that's high enough for the spell

import { canCastSpell, findSpell, freeCastKey, freeCastsLeft, spellAbility, spellNumbers } from './spells.js';
import { slotsLeft, spendSlot } from './resources.js';
import { rollDie } from '../rules/dice.js';

const TOP_SLOT = 9;

// How the hero would pay to cast a spell now: { kind, level } (level for a slot), or null
// if they can't cast it now (not prepared, or nothing left to pay with).
export function sceneCastCost(game, spellId) {
  const spell = findSpell(spellId);
  if (!spell || !canCastSpell(game.character, spellId)) return null;
  if (spell.level === 0) return { kind: 'cantrip', level: 0 };
  if (spell.ritual) return { kind: 'ritual', level: spell.level };
  if (freeCastsLeft(game, spellId) > 0) return { kind: 'free', level: spell.level };
  for (let level = spell.level; level <= TOP_SLOT; level++) if (slotsLeft(game, level) > 0) return { kind: 'slot', level };
  return null;
}

// Casts it: spends the free cast or the slot (a cantrip or a Ritual costs nothing). Returns
// the cost, as sceneCastCost does.
export function castInScene(game, spellId) {
  const cost = sceneCastCost(game, spellId);
  if (!cost) throw new Error(`The hero can't cast ${spellId} now`);
  if (cost.kind === 'free') game.featureUses[freeCastKey(spellId)] = (game.featureUses[freeCastKey(spellId)] || 0) + 1;
  if (cost.kind === 'slot') spendSlot(game, cost.level);
  return cost;
}

// "as a Ritual", "free", "level 1 slot"; '' for a cantrip. For choice cards and notes.
export function castCostText(cost) {
  if (!cost || cost.kind === 'cantrip') return '';
  if (cost.kind === 'ritual') return 'as a Ritual';
  if (cost.kind === 'free') return 'free';
  return `level ${cost.level} slot`;
}

// Guidance: a hero who knows the cantrip casts it before an ability check in a scene, and adds
// 1d4 (SRD 5.2.1: the bonus applies to checks with the skill chosen, for up to a minute).
// Returns the modifiers to add to the check: one, or none.
export function guidanceModifiers(game) {
  if (!canCastSpell(game.character, 'guidance')) return [];
  const roll = rollDie(game.rng, 4);
  return [{ label: 'Guidance', value: roll, source: `Guidance cantrip: 1d4 (${roll})` }];
}

// The spell save DC a spell is cast with: the one for wherever the hero got it (their class,
// Magic Initiate or their species, each with its own spellcasting ability).
export function spellSaveDc(character, spellId) {
  const ability = spellAbility(character, spellId);
  if (!ability) throw new Error(`The hero doesn't have ${spellId}`);
  return spellNumbers(character, ability).saveDc.value;
}

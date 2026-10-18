// Damage outside a fight, from traps and falls, and dropping to 0 Hit Points with nobody
// there to help. Rules: SRD 5.2.1, "Damage and Healing", "Dropping to 0 Hit Points",
// "Death Saving Throws" and "Traps".

import { d20Test } from '../rules/d20-test.js';
import { rollDice } from '../rules/dice.js';
import { findAbility, resistances, savingThrow, wornSaveBonus } from './sheet.js';
import { wornItems } from './inventory.js';
import { heroMaxHp } from './resources.js';
import { soakDamage } from './spell-effects.js';
import { traps } from '../../../data/srd/traps.js';

export const findTrap = (id) => traps.find((t) => t.id === id) || null;

// The damage each hit of a trap does at a level: its own dice, or the SRD's larger dice from
// a higher level on (trap.atHigherLevels).
export function trapDamageDice(trap, level) {
  let dice = trap.damage.dice;
  for (const step of trap.atHigherLevels || []) if (level >= step.level) dice = step.dice;
  return dice;
}

// A trap springs on the hero (data/srd/traps.js): they make its saving throw, and on a
// failure it strikes them (trap.hits times, each doing its damage) and they take the damage
// as takeDamage gives it. The save goes on game.pending. Returns { save, hits, outcome }:
//   outcome 'safe'    the save succeeded, and nothing struck them
//           otherwise takeDamage's 'up', 'woke' or 'dead'
// onHits(hits) runs before the damage, and onDamage and onDying as for takeDamage.
export function springTrap(game, trap, { onHits = () => {}, onDamage, onDying } = {}) {
  const ability = findAbility(trap.save.ability);
  const modifiers = savingThrow(game.character, ability.id, wornItems(game)).parts.map((p) => ({ ...p, source: `${ability.name} saving throw` }));
  const save = d20Test({ rng: game.rng, kind: 'save', label: `${trap.name} (${ability.name} save)`, modifiers, target: { type: 'DC', value: trap.save.dc } });
  game.pending.push({ type: 'roll', result: save });
  if (save.success) return { save, hits: 0, outcome: 'safe' };
  const [count, sides] = diceParts(trap.hits);
  const hits = rollDice(game.rng, count, sides).total;
  onHits(hits);
  // Each hit's dice, all rolled together: three darts of 1d6 are 3d6.
  const [perHit, damageSides] = diceParts(trapDamageDice(trap, game.character.level));
  const { outcome } = takeDamage(game, `${perHit * hits}d${damageSides}`, trap.damage.type, { onDamage, onDying });
  return { save, hits, outcome };
}

function diceParts(dice) {
  const match = /^(\d+)d(\d+)$/.exec(dice);
  if (!match) throw new Error(`Not a dice expression: ${dice}`);
  return [Number(match[1]), Number(match[2])];
}

// The hero takes damage, e.g. takeDamage(game, '1d6', 'bludgeoning') for a fall. Resistance
// halves it. Returns { rolls, taken, outcome } and adds each death save to game.pending.
// onDamage(rolls, taken) runs first, and onDying() just before any death saves, so the
// page can say what happened in order.
//   outcome 'up'      still standing
//           'woke'    dropped to 0 and came round: a natural 20 on a death save, or three
//                     successes (stable), then 1 Hit Point after 1d4 hours
//           'dead'    massive damage, or three failed death saves
export function takeDamage(game, dice, type, { onDamage = () => {}, onDying = () => {} } = {}) {
  const { rolls, total } = rollDice(game.rng, ...diceParts(dice));
  const taken = resistances(game.character).includes(type) ? Math.floor(total / 2) : total;
  onDamage(rolls, taken);
  const { rest } = soakDamage(game, taken); // Temporary Hit Points go first
  const overflow = rest - game.hp;
  game.hp = Math.max(0, game.hp - rest);
  if (game.hp > 0) return { rolls, total, taken, outcome: 'up' };
  // Damage left over that equals your Hit Point maximum kills outright.
  if (overflow >= heroMaxHp(game)) return { rolls, total, taken, outcome: 'dead' };
  onDying();
  return { rolls, total, taken, outcome: dyingAlone(game) };
}

// Death saving throws until the hero is stable, wakes, or dies (nobody is there to help).
function dyingAlone(game) {
  let successes = 0;
  let failures = 0;
  while (successes < 3 && failures < 3) {
    const roll = d20Test({ rng: game.rng, kind: 'save', label: 'Death saving throw', modifiers: wornSaveBonus(wornItems(game)), target: { type: 'DC', value: 10 } });
    game.pending.push({ type: 'roll', result: roll });
    if (roll.natural === 20) {
      game.hp = 1;
      return 'woke';
    }
    if (roll.natural === 1) failures += 2;
    else if (roll.success) successes += 1;
    else failures += 1;
  }
  if (failures >= 3) return 'dead';
  // Stable: a stable creature regains 1 Hit Point after 1d4 hours.
  game.hp = 1;
  return 'woke';
}

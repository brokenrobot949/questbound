// Damage outside a fight, from traps and falls, and dropping to 0 Hit Points with nobody
// there to help. Rules: SRD 5.2.1, "Damage and Healing", "Dropping to 0 Hit Points" and
// "Death Saving Throws".

import { d20Test } from '../rules/d20-test.js';
import { rollDice } from '../rules/dice.js';
import { resistances } from './sheet.js';
import { heroMaxHp } from './resources.js';
import { soakDamage } from './spell-effects.js';

// The hero takes damage, e.g. takeDamage(game, '1d6', 'bludgeoning') for a fall. Resistance
// halves it. Returns { rolls, taken, outcome } and adds each death save to game.pending.
// onDamage(rolls, taken) runs first, and onDying() just before any death saves, so the
// page can say what happened in order.
//   outcome 'up'      still standing
//           'woke'    dropped to 0 and came round: a natural 20 on a death save, or three
//                     successes (stable), then 1 Hit Point after 1d4 hours
//           'dead'    massive damage, or three failed death saves
export function takeDamage(game, dice, type, { onDamage = () => {}, onDying = () => {} } = {}) {
  const match = /^(\d+)d(\d+)$/.exec(dice);
  if (!match) throw new Error(`Not a dice expression: ${dice}`);
  const { rolls, total } = rollDice(game.rng, Number(match[1]), Number(match[2]));
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
    const roll = d20Test({ rng: game.rng, kind: 'save', label: 'Death saving throw', target: { type: 'DC', value: 10 } });
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

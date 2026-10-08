// Class features that change a roll in a scene, outside the battle grid.
// (Features used in a fight are in combat/battle.js; features that only change numbers on
// the sheet, such as Scholar's Expertise, are in sheet.js.)

import { rollDie } from '../rules/dice.js';
import { hasFeature } from './sheet.js';
import { featureUsesLeft, spendFeature } from './resources.js';

// Fighter level 2, Tactical Mind (SRD 5.2.1): when you fail an ability check, you can expend
// a use of Second Wind to roll 1d10 and add it to the check. If the check still fails, the
// use isn't expended. The game uses it for the player only when the d10 could turn the
// failure into a success, so Second Wind is never spent on a check that can't be saved.
// Takes an ability check result and returns it, with the d10 added if Tactical Mind was used.
export function tacticalMind(game, result) {
  if (result.kind !== 'check' || result.success !== false || !result.target) return result;
  if (!hasFeature(game.character, 'tactical-mind') || featureUsesLeft(game, 'second-wind') < 1) return result;
  if (result.target.value - result.total > 10) return result;
  const roll = rollDie(game.rng, 10);
  const total = result.total + roll;
  const success = total >= result.target.value;
  if (success) spendFeature(game, 'second-wind');
  const source = success
    ? '1d10 added after the roll fell short; one use of Second Wind spent'
    : '1d10 added after the roll fell short; still a failure, so Second Wind is kept';
  return {
    ...result,
    modifiers: [...result.modifiers, { label: 'Tactical Mind', value: roll, source }],
    modifierTotal: result.modifierTotal + roll,
    total,
    success,
    outcome: success ? 'success' : 'failure',
    tacticalMind: { roll, spent: success },
  };
}

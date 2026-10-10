// Ability checks, with or without a skill. Builds the modifiers from the character sheet,
// then rolls through d20Test so the result carries the full breakdown.

import { d20Test } from './d20-test.js';
import { checkAdvantage, checkModifiers } from '../character/sheet.js';

// testId: a skill id ('persuasion') or an ability id ('strength') from data/srd/.
// dc: the Difficulty Class to meet or beat.
// Features that give Advantage on this check (Remarkable Athlete) are added on top.
// extraModifiers: bonuses rolled for this check alone, e.g. Guidance's 1d4.
export function abilityCheck({ rng, character, testId, dc, advantage = [], disadvantage = [], extraModifiers = [] }) {
  if (!Number.isInteger(dc)) throw new Error(`A check needs a whole-number DC, got ${dc}`);
  const { ability, skill, modifiers } = checkModifiers(character, testId);
  const result = d20Test({
    rng,
    kind: 'check',
    label: `${skill ? skill.name : ability.name} check`,
    modifiers: [...modifiers, ...extraModifiers],
    advantage: [...advantage, ...checkAdvantage(character, testId)],
    disadvantage,
    target: { type: 'DC', value: dc },
  });
  return { ...result, testId, ability: ability.id, skill: skill ? skill.id : null };
}

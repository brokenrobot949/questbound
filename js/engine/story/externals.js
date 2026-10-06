// Every EXTERNAL function Ink scenes can call is defined here, and only here.
// Each one is declared on the Ink side in story/externals.ink with the same name.
// Ink owns the narrative; these functions are its only way to reach the rules engine.
//
// context:
//   rng         the game's seeded RNG
//   character   the hero
//   recordRoll  called with each d20 result so the UI can show it and log it

import { abilityCheck } from '../rules/ability-check.js';

export function bindExternals(story, context) {
  // check(skill, dc): the hero makes an ability check against a DC, e.g. check("persuasion", 15).
  // skill is a skill id from data/srd/skills.js, or an ability id for a plain ability check.
  // Returns true on a success. Not lookahead-safe, because it rolls dice.
  story.BindExternalFunction(
    'check',
    (skill, dc) => {
      const result = abilityCheck({
        rng: context.rng,
        character: context.character,
        testId: skill,
        dc,
      });
      context.recordRoll(result);
      return result.success;
    },
    false,
  );
}

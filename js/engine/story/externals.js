// Every EXTERNAL function Ink scenes can call is defined here, and only here.
// Each one is declared on the Ink side in story/externals.ink with the same name.
// Ink owns the narrative; these functions are its only way to reach the rules engine.
// None are lookahead-safe: Ink must not call them early while it looks ahead for glue.
//
// runtime.game is the game being played. The functions use its rng, character and flags,
// and put each d20 result on game.pendingRolls for the story runner to place on the page.

import { abilityCheck } from '../rules/ability-check.js';

export function bindExternals(story, runtime) {
  // check(skill, dc): the hero makes an ability check against a DC, e.g. check("persuasion", 15).
  // skill is a skill id from data/srd/skills.js, or an ability id for a plain ability check.
  // Returns true on a success.
  story.BindExternalFunction(
    'check',
    (skill, dc) => {
      const { game } = runtime;
      const result = abilityCheck({ rng: game.rng, character: game.character, testId: skill, dc });
      game.pendingRolls.push(result);
      return result.success;
    },
    false,
  );

  // set_flag(id): remembers that something happened, e.g. set_flag("saw_barrow_light").
  // Flags are saved with the game and can be read by later scenes.
  story.BindExternalFunction(
    'set_flag',
    (id) => {
      const { game } = runtime;
      const flag = flagId(id);
      if (!game.flags.includes(flag)) game.flags.push(flag);
    },
    false,
  );

  // has_flag(id): true if that flag has been set, e.g. { has_flag("saw_barrow_light"): ... }
  story.BindExternalFunction('has_flag', (id) => runtime.game.flags.includes(flagId(id)), false);
}

function flagId(id) {
  if (typeof id !== 'string' || id.trim() === '') throw new Error(`A story flag needs a name, got ${id}`);
  return id.trim();
}

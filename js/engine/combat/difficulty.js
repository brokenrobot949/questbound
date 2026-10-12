// How hard a fight is (SRD 5.2.1, "Combat Encounters"): the monsters' XP against the XP budget
// of the party facing them, at the hero's level. The party is the hero and every companion with
// them who can fight (the fallen don't count), so a hero alone is a party of one.
//
// A party's budget is the XP Budget per Character (data/srd/encounter-budget.js) times its
// number of characters. A fight takes the name of the smallest budget that holds its XP:
//   Low       up to the Low budget
//   Moderate  up to the Moderate budget
//   High      up to the High budget
//   Deadly    more than the High budget: beyond the 2024 guidelines (the game's own word)
// The fight cards ("Fight · Moderate"), Quick Resolve (combat/resolve.js) and when Odda thinks a
// fight is worth a spell slot (combat/companion-ai.js) all count it this way.

import { xpBudgetPerCharacter } from '../../../data/srd/encounter-budget.js';
import { encounters } from '../../../data/campaign/encounters.js';
import { monsters } from '../../../data/srd/monsters.js';
import { fightingMembers } from '../character/party.js';

export const RATINGS = ['Low', 'Moderate', 'High', 'Deadly'];

// The party's XP budget at each difficulty, for `size` characters of this level:
// { low, moderate, high }.
export function partyBudget(level, size = 1) {
  const row = xpBudgetPerCharacter.find((r) => r.level === level) || xpBudgetPerCharacter[0];
  return { low: row.low * size, moderate: row.moderate * size, high: row.high * size };
}

// How many characters are in the hero's party now: the hero, and each companion who can fight.
export const partySize = (game) => 1 + fightingMembers(game).length;

// The monsters' XP for an encounter as it starts (a hymn's risen dead and reinforcements aren't counted).
export function encounterXp(encounter) {
  return encounter.monsters.reduce((sum, { monster }) => sum + monsters.find((m) => m.id === monster).xp, 0);
}

// 'Low', 'Moderate', 'High' or 'Deadly': where this much XP falls in a party's budget.
export function ratingFor(xp, budget) {
  if (xp <= budget.low) return 'Low';
  if (xp <= budget.moderate) return 'Moderate';
  if (xp <= budget.high) return 'High';
  return 'Deadly';
}

// How hard an encounter is for the hero's party right now: { rating, xp, budget, size }.
export function fightRating(game, encounterId) {
  const encounter = encounters.find((e) => e.id === encounterId);
  if (!encounter) return null;
  const size = partySize(game);
  const budget = partyBudget(game.character.level, size);
  const xp = encounterXp(encounter);
  return { rating: ratingFor(xp, budget), xp, budget, size };
}

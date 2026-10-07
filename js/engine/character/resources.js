// What the hero spends and gets back: Hit Points, spell slots and limited-use features.
// These change in play, so they live on the game, not the character:
//
//   game.hp           current Hit Points (the maximum comes from the sheet)
//   game.slotsUsed    spell slots spent, by spell level: [level 1, level 2, …]
//   game.featureUses  uses spent of limited features, e.g. { 'second-wind': 1 }
//   game.xp           experience points
//
// A Long Rest brings all of them back (except XP).

import { findClass, maxHitPoints } from './sheet.js';

export function maxHp(character) {
  return maxHitPoints(character).value;
}

// A hero who has just arrived: full Hit Points, nothing spent.
export function freshResources(character) {
  return { hp: maxHp(character), slotsUsed: [], featureUses: {}, xp: 0 };
}

export function heal(game, amount) {
  const before = game.hp;
  game.hp = Math.min(maxHp(game.character), game.hp + Math.max(0, amount));
  return game.hp - before;
}

export function longRestRecovery(game) {
  game.hp = maxHp(game.character);
  game.slotsUsed = [];
  game.featureUses = {};
}

// Spell slots the class has at this spell level, and how many are left.
export function slotsAt(character, level) {
  const cls = findClass(character.classId);
  if (!cls || !cls.spellcasting) return 0;
  const row = cls.levels[Math.min(character.level, cls.levels.length) - 1];
  return row.slots[level - 1] || 0;
}

export function slotsLeft(game, level) {
  return slotsAt(game.character, level) - (game.slotsUsed[level - 1] || 0);
}

export function spendSlot(game, level) {
  if (slotsLeft(game, level) < 1) throw new Error(`No level ${level} spell slots left`);
  game.slotsUsed[level - 1] = (game.slotsUsed[level - 1] || 0) + 1;
}

// Limited-use features: how many uses the hero has in all, at their level.
export function featureUsesMax(character, featureId) {
  const cls = findClass(character.classId);
  const row = cls.levels[Math.min(character.level, cls.levels.length) - 1];
  if (featureId === 'second-wind') return row.secondWindUses || 0;
  return 0;
}

export function featureUsesLeft(game, featureId) {
  return featureUsesMax(game.character, featureId) - (game.featureUses[featureId] || 0);
}

export function spendFeature(game, featureId) {
  if (featureUsesLeft(game, featureId) < 1) throw new Error(`No uses of ${featureId} left`);
  game.featureUses[featureId] = (game.featureUses[featureId] || 0) + 1;
}

// Problems with saved resources, for checking saves.
export function resourceProblems(state) {
  const problems = [];
  if (!Number.isInteger(state.hp) || state.hp < 0) problems.push('Hit Points');
  if (!Array.isArray(state.slotsUsed) || !state.slotsUsed.every((n) => n === null || (Number.isInteger(n) && n >= 0))) problems.push('spell slots');
  if (!state.featureUses || typeof state.featureUses !== 'object') problems.push('feature uses');
  if (!Number.isInteger(state.xp) || state.xp < 0) problems.push('XP');
  return problems;
}

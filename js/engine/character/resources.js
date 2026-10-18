// What the hero spends and gets back: Hit Points, spell slots and limited-use features.
// These change in play, so they live on the game, not the character:
//
//   game.hp           current Hit Points (the maximum comes from the sheet)
//   game.slotsUsed    spell slots spent, by spell level: [level 1, level 2, …]
//   game.featureUses  uses spent of limited features, e.g. { 'second-wind': 1, 'action-surge': 1,
//                     'channel-divinity': 1 }
//   game.xp           experience points
//   game.tempHp       Temporary Hit Points (see character/spell-effects.js)
//   game.activeSpells spells on the hero that last a while, e.g. Mage Armor
//   game.hpMaxDrop    how far the hero's Hit Point maximum has been lowered (a Specter's Life
//                     Drain), until their next Long Rest; 0 for none. A companion's is on their
//                     place in the party (character/party.js), and a missing one means 0.
//
// A Long Rest brings all of them back (except XP), ends Temporary Hit Points and the spells on
// the hero, and puts the Hit Point maximum back to normal.

import { findClass, maxHitPoints } from './sheet.js';

export function maxHp(character) {
  return maxHitPoints(character).value;
}

// Hit Points the spells on the hero add to their maximum (Aid), while they last.
export function aidBonus(game) {
  return (game.activeSpells || []).reduce((sum, spell) => sum + (spell.hpBonus || 0), 0);
}

// How far the Hit Point maximum is lowered until the next Long Rest (Life Drain). game is the
// hero's game, or a companion's (character/party.js, memberGame).
export const hpMaxDropOf = (game) => game.hpMaxDrop || 0;

// The hero's Hit Point maximum right now: the sheet's, plus Aid while it lasts, less any Life
// Drain. Never below 0.
export function heroMaxHp(game) {
  return Math.max(0, maxHp(game.character) + aidBonus(game) - hpMaxDropOf(game));
}

// Life Drain: the Hit Point maximum drops by amount until the next Long Rest, and Hit Points
// above the new maximum are lost. Returns the new maximum (at 0, they die: the caller says so).
export function lowerMaxHp(game, amount) {
  game.hpMaxDrop = hpMaxDropOf(game) + Math.max(0, amount);
  const max = heroMaxHp(game);
  game.hp = Math.min(game.hp, max);
  return max;
}

// A hero who has just arrived: full Hit Points, nothing spent.
export function freshResources(character) {
  return { hp: maxHp(character), slotsUsed: [], featureUses: {}, xp: 0, tempHp: 0, activeSpells: [], hpMaxDrop: 0 };
}

export function heal(game, amount) {
  const before = game.hp;
  game.hp = Math.min(heroMaxHp(game), game.hp + Math.max(0, amount));
  return game.hp - before;
}

export function longRestRecovery(game) {
  game.hp = maxHp(game.character);
  game.slotsUsed = [];
  game.featureUses = {};
  game.tempHp = 0;
  game.activeSpells = [];
  game.hpMaxDrop = 0;
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
  if (featureId === 'action-surge') return row.actionSurgeUses || 0;
  if (featureId === 'channel-divinity') return row.channelDivinity || 0;
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
  if (!Number.isInteger(state.tempHp) || state.tempHp < 0) problems.push('Temporary Hit Points');
  if (!Number.isInteger(state.hpMaxDrop) || state.hpMaxDrop < 0) problems.push('the lowered Hit Point maximum');
  const lasting = ['long-rest', 'hour'];
  if (!Array.isArray(state.activeSpells) || !state.activeSpells.every((s) => s && typeof s.id === 'string' && lasting.includes(s.lasts))) {
    problems.push('spells on the hero');
  }
  return problems;
}

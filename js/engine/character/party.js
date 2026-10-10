// The party: the companions travelling with the hero (docs/DESIGN.md, "Companions").
//
//   game.party   [{ id, hp, tempHp, slotsUsed, featureUses, activeSpells, inventory, tactic,
//                approval, fallen }], one for each companion with the hero, in the order they
//                joined:
//     id                       a companion from data/campaign/companions.js
//     hp, tempHp, slotsUsed, featureUses, activeSpells
//                              what they've spent, as for the hero (character/resources.js)
//     inventory                their pack ([{ id, quantity }]): their starting kit
//     tactic                   how they fight: 'aggressive', 'defensive', 'support' or 'hold'
//     approval                 how much they like the hero's choices: 0 to start, up or down
//     fallen                   true once they've died; a fallen companion doesn't fight until
//                              they're raised
//
// A companion's sheet isn't stored: it comes from the companion data at the hero's level
// (companionCharacter). memberGame() lets the rules that take a game (attack options, spell
// slots, healing) work on a companion too.

import { companions, tactics } from '../../../data/campaign/companions.js';
import { startingInventory } from './inventory.js';
import { maxHp } from './resources.js';

// Up to two companions travel with the hero.
export const PARTY_LIMIT = 2;

export const findCompanion = (id) => companions.find((c) => c.id === id) || null;
export const findTactic = (id) => tactics.find((t) => t.id === id) || null;

// The levels the rules data covers for a class (1–3 so far): a companion can't outgrow them.
const TOP_LEVEL = 3;

// A companion's character at a level: their level 1 choices, with each later level's changes
// laid on top, and the fixed Hit Points at every level after 1.
export function companionCharacter(id, level) {
  const companion = findCompanion(id);
  if (!companion) throw new Error(`Unknown companion: ${id}`);
  const at = Math.max(1, Math.min(level, TOP_LEVEL));
  const character = structuredClone(companion.character);
  for (let l = 2; l <= at; l++) {
    const changes = (companion.levels || {})[l];
    if (!changes) continue;
    if (changes.subclassId) character.subclassId = changes.subclassId;
    if (changes.prepared) character.spells = { ...character.spells, prepared: [...changes.prepared] };
  }
  character.level = at;
  character.hitPointRolls = Array(at - 1).fill(null);
  return character;
}

export const memberOf = (game, id) => (game.party || []).find((m) => m.id === id) || null;
export const inParty = (game, id) => Boolean(memberOf(game, id));

// Companions able to fight: in the party and not fallen.
export const fightingMembers = (game) => (game.party || []).filter((m) => !m.fallen);

// What the game is, as the rules see it for one companion: their own sheet, Hit Points,
// spell slots, feature uses and pack, but the fight, the dice and the story of the game
// they're in. Changes to their Hit Points (and the rest) land on their place in the party.
const SHARED = new Set(['battle', 'rng', 'day', 'time', 'flags', 'xp', 'story']);
export function memberGame(game, member) {
  const character = companionCharacter(member.id, game.character.level);
  return new Proxy(member, {
    get(target, key) {
      if (key === 'character') return character;
      if (key === 'actorId') return member.id;
      if (key === 'inspiration') return false;
      if (SHARED.has(key)) return game[key];
      return target[key];
    },
    set(target, key, value) {
      if (SHARED.has(key)) game[key] = value;
      else target[key] = value;
      return true;
    },
  });
}

// A companion's Hit Point maximum now (with Aid, while it lasts).
export function memberMaxHp(game, member) {
  const bonus = (member.activeSpells || []).reduce((sum, s) => sum + (s.hpBonus || 0), 0);
  return maxHp(companionCharacter(member.id, game.character.level)) + bonus;
}

// A companion joins: full Hit Points, nothing spent, their starting kit, approval 0.
export function joinParty(game, id) {
  const companion = findCompanion(id);
  if (!companion) throw new Error(`Unknown companion: ${id}`);
  game.party = game.party || [];
  if (inParty(game, id)) return memberOf(game, id);
  if (game.party.length >= PARTY_LIMIT) throw new Error(`Only ${PARTY_LIMIT} companions can travel with you.`);
  const character = companionCharacter(id, game.character.level);
  const member = {
    id,
    hp: maxHp(character),
    tempHp: 0,
    slotsUsed: [],
    featureUses: {},
    activeSpells: [],
    inventory: startingInventory(character).inventory,
    tactic: companion.tactic,
    approval: 0,
    fallen: false,
  };
  game.party.push(member);
  return member;
}

export function leaveParty(game, id) {
  game.party = (game.party || []).filter((m) => m.id !== id);
}

export function setTactic(game, id, tactic) {
  const member = memberOf(game, id);
  if (!member) throw new Error(`${id} isn't with you.`);
  if (!findTactic(tactic)) throw new Error(`Unknown tactic: ${tactic}`);
  member.tactic = tactic;
}

// approve(id, change): a choice the companion liked (up) or didn't (down).
export function approve(game, id, change) {
  const member = memberOf(game, id);
  if (member) member.approval += change;
}

// A Long Rest: every companion who hasn't fallen is back to full, as the hero is.
export function partyLongRest(game) {
  for (const member of fightingMembers(game)) {
    member.slotsUsed = [];
    member.featureUses = {};
    member.tempHp = 0;
    member.activeSpells = [];
    member.hp = memberMaxHp(game, member);
  }
}

// The hero has gone up a level, and so has the party: each companion's Hit Points rise as
// much as their maximum does. before: the hero's level before.
export function partyLevelUp(game, before) {
  for (const member of fightingMembers(game)) {
    const gained = maxHp(companionCharacter(member.id, game.character.level)) - maxHp(companionCharacter(member.id, before));
    member.hp += Math.max(0, gained);
  }
}

// Problems with a saved party, for checking saves.
export function partyProblems(party) {
  if (!Array.isArray(party)) return ['the party'];
  const ok = party.every(
    (m) =>
      m &&
      findCompanion(m.id) &&
      Number.isInteger(m.hp) &&
      m.hp >= 0 &&
      Number.isInteger(m.tempHp) &&
      Array.isArray(m.slotsUsed) &&
      m.featureUses &&
      typeof m.featureUses === 'object' &&
      Array.isArray(m.activeSpells) &&
      Array.isArray(m.inventory) &&
      findTactic(m.tactic) &&
      Number.isInteger(m.approval) &&
      typeof m.fallen === 'boolean',
  );
  const ids = party.map((m) => m && m.id);
  return ok && new Set(ids).size === ids.length && party.length <= PARTY_LIMIT ? [] : ['the party'];
}

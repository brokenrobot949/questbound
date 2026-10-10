// Levelling up: what the next level brings, and the choices the level-up screen makes.
// Rules: SRD 5.2.1, "Level Advancement", and each class's features table.
//
// A hero levels up once their XP reaches the next level's total (data/srd/advancement.js),
// outside a fight, one level at a time. The choices made so far are kept on the game, so a
// reload carries on exactly where the player was, and a Hit Die once rolled stays rolled:
//
//   game.levelUp   null, or {
//     level         the level being reached
//     hitPoints     null (not chosen yet), 'fixed' (the class's fixed value), or the Hit Die roll
//     subclassId    level 3: the subclass chosen
//     scholarSkill  Wizard level 2: the skill Scholar gives Expertise in
//     spellbook     Wizard: the new spells copied into the spellbook (two each level)
//     savant        Evoker level 3: two free Evocation spells for the spellbook (Evocation
//                   Savant; its one extra spell at each new level of spell slots starts at 5)
//     prepared      Wizard and Cleric: spells added to the prepared list, up to the new
//                   number (a Wizard's from the spellbook, a Cleric's from the Cleric list)
//   }

import { advancement } from '../../../data/srd/advancement.js';
import { dmNotes } from '../../../data/campaign/dm-voice.js';
import { rollDie } from '../rules/dice.js';
import { abilityModifierOf, findClass, skillProficiency, subclassOf } from './sheet.js';
import { classSpellCounts, domainSpells, findSpell, highestSpellLevel, preparePicks, speciesSpells, spellsOnList } from './spells.js';
import { aidBonus, maxHp } from './resources.js';
import { validateCharacter } from './validate.js';
import { addDeed } from '../story/journal.js';
import { memberMaxHp, partyLevelUp } from './party.js';

// The XP a level needs (Character Advancement table).
export function xpForLevel(level) {
  const row = advancement.find((r) => r.level === level);
  if (!row) throw new Error(`No level ${level} in the advancement table`);
  return row.xp;
}

// The XP the next level needs, or null at the highest level the rules data covers so far.
export function nextLevelXp(character) {
  if (character.level >= findClass(character.classId).levels.length) return null;
  return xpForLevel(character.level + 1);
}

// True when the hero has the XP for their next level and isn't in a fight.
export function levelUpReady(game) {
  const xp = nextLevelXp(game.character);
  return !game.battle && xp !== null && game.xp >= xp;
}

// Starts the level-up for the next level, or carries on with the one already started.
export function beginLevelUp(game) {
  if (!levelUpReady(game)) throw new Error('Not enough XP to level up yet.');
  const level = game.character.level + 1;
  if (!game.levelUp || game.levelUp.level !== level) {
    game.levelUp = { level, hitPoints: null, subclassId: null, scholarSkill: null, spellbook: [], savant: [], prepared: [] };
  }
  return game.levelUp;
}

// The hero as they'll be with the choices made so far.
export function heroAfter(game) {
  const draft = requireDraft(game);
  const before = game.character;
  const hero = structuredClone(before);
  hero.level = draft.level;
  const rolls = (before.hitPointRolls || []).slice(0, draft.level - 2);
  while (rolls.length < draft.level - 2) rolls.push(null);
  hero.hitPointRolls = [...rolls, Number.isInteger(draft.hitPoints) ? draft.hitPoints : null];
  if (draft.subclassId) hero.subclassId = draft.subclassId;
  if (draft.scholarSkill) hero.classChoices = { ...hero.classChoices, scholarSkill: draft.scholarSkill };
  if (hero.spells) {
    // A domain spell the Cleric had prepared is now always prepared, and frees its place.
    const domain = domainSpells(hero);
    hero.spells = {
      ...hero.spells,
      spellbook: [...hero.spells.spellbook, ...draft.spellbook, ...draft.savant],
      prepared: [...hero.spells.prepared, ...draft.prepared].filter((id) => !domain.includes(id)),
    };
  }
  return hero;
}

// Everything the new level brings, for the level-up screen:
//   level, className
//   hitPoints   { die, fixed, con, fixedGain, gained (once chosen), rolled (the roll, if rolled) }
//   features    [{ id, name, text, source }]: new class, subclass and species features
//   subclasses  the subclasses to choose from (level 3), or null
//   scholar     { from: [skill ids] } (Wizard level 2), or null
//   spellbook, savant, prepared   { count, from: [spell ids] }, or null
//   slots       { before: [...], after: [...] } per spell level, or null
//   speciesSpells  [{ spell, note }]: spells the hero's lineage or legacy gives at this level
export function levelUpPlan(game) {
  const draft = requireDraft(game);
  const before = game.character;
  const after = heroAfter(game);
  const cls = findClass(before.classId);
  const row = cls.levels[draft.level - 1];
  const con = abilityModifierOf(before, 'constitution');

  const withFixed = { ...after, hitPointRolls: [...after.hitPointRolls.slice(0, -1), null] };
  const hitPoints = {
    die: cls.hitDie,
    fixed: cls.hitPointsPerLevel,
    con,
    fixedGain: maxHp(withFixed) - maxHp(before),
    gained: draft.hitPoints === null ? null : maxHp(after) - maxHp(before),
    rolled: Number.isInteger(draft.hitPoints) ? draft.hitPoints : null,
  };

  const features = row.features.map((id) => ({ id, ...cls.features[id], source: cls.name }));
  const sub = subclassOf(after);
  if (sub) {
    for (const subRow of sub.levels.filter((r) => r.level === draft.level)) {
      for (const id of subRow.features) features.push({ id, ...sub.features[id], source: sub.name });
    }
  }
  const species = speciesSpells(before);
  const known = species ? species.always.map((a) => a.id) : [];
  const newSpeciesSpells = species
    ? speciesSpells(after)
        .always.filter((a) => !known.includes(a.id))
        .map(({ id, note }) => ({ spell: findSpell(id), note, source: species.label }))
    : [];

  const plan = {
    level: draft.level,
    className: cls.name,
    hitPoints,
    features,
    subclasses: row.features.some((id) => id.endsWith('-subclass')) ? cls.subclasses : null,
    scholar: null,
    spellbook: null,
    savant: null,
    prepared: null,
    slots: null,
    speciesSpells: newSpeciesSpells,
  };

  if (row.features.includes('scholar')) {
    plan.scholar = { from: cls.scholarSkills.filter((id) => skillProficiency(before, id).level !== 'none') };
  }

  if (cls.spellcasting && before.spells) {
    let preparable;
    if (cls.spellcasting.spellbook) {
      // Spells the hero already has another way (species, Magic Initiate) aren't offered
      // again, as in character creation.
      const elsewhere = [
        ...(speciesSpells(after) ? speciesSpells(after).always.map((a) => a.id) : []),
        ...(before.magicInitiate || []).map((entry) => entry.spell),
      ];
      const inBook = before.spells.spellbook;
      const top = highestSpellLevel(after);
      const wizardSpells = (maxLevel) => {
        const ids = [];
        for (let level = 1; level <= maxLevel; level++) ids.push(...spellsOnList(cls.id, level).map((s) => s.id));
        return ids.filter((id) => !inBook.includes(id) && !elsewhere.includes(id));
      };
      plan.spellbook = { count: cls.spellcasting.spellbook.perLevel, from: wizardSpells(top).filter((id) => !draft.savant.includes(id)) };
      if (features.some((f) => f.id === 'evocation-savant')) {
        plan.savant = {
          count: 2,
          from: wizardSpells(2).filter((id) => findSpell(id).school === 'Evocation' && !draft.spellbook.includes(id)),
        };
      }
      preparable = [...inBook, ...draft.spellbook, ...draft.savant].filter((id) => !before.spells.prepared.includes(id));
    } else {
      // A Cleric prepares from the whole Cleric list, of the levels they now have slots for
      // (and not the domain spells they always have prepared).
      preparable = preparePicks({ ...after, spells: { ...after.spells, prepared: before.spells.prepared } }).from.filter((id) => !before.spells.prepared.includes(id));
    }
    const kept = before.spells.prepared.filter((id) => !domainSpells(after).includes(id));
    const more = classSpellCounts(after).prepared - kept.length;
    if (more > 0) plan.prepared = { count: Math.min(more, preparable.length), from: preparable };
    plan.slots = { before: [...cls.levels[before.level - 1].slots], after: [...row.slots] };
  }
  return plan;
}

// What's still to choose, in plain words. Empty when the hero can level up.
export function levelUpProblems(game) {
  const draft = requireDraft(game);
  const plan = levelUpPlan(game);
  const problems = [];
  const more = (pick, chosen, what) => {
    if (pick && chosen.length < pick.count) {
      const n = pick.count - chosen.length;
      problems.push(`Choose ${n} more ${what}${n === 1 ? '' : 's'}.`);
    }
  };
  if (draft.hitPoints === null) problems.push('Roll your Hit Die or take the fixed Hit Points.');
  if (plan.subclasses && !draft.subclassId) problems.push(`Choose your ${plan.className} subclass.`);
  if (plan.scholar && !draft.scholarSkill) problems.push('Choose a skill for Scholar.');
  more(plan.savant, draft.savant, 'Evocation spell');
  more(plan.spellbook, draft.spellbook, 'spellbook spell');
  more(plan.prepared, draft.prepared, 'prepared spell');
  return problems;
}

// ---- The choices ----

// how: 'roll' (roll the Hit Die, with the game's dice) or 'fixed' (take the fixed value).
// Once rolled, the roll stands.
export function chooseHitPoints(game, how) {
  const draft = requireDraft(game);
  if (Number.isInteger(draft.hitPoints)) throw new Error('You have already rolled your Hit Die.');
  if (how === 'fixed') draft.hitPoints = 'fixed';
  else if (how === 'roll') draft.hitPoints = rollDie(game.rng, findClass(game.character.classId).hitDie);
  else throw new Error(`Unknown way to gain Hit Points: ${how}`);
}

export function chooseSubclass(game, subclassId) {
  const draft = requireDraft(game);
  const plan = levelUpPlan(game);
  if (!plan.subclasses || !plan.subclasses.some((s) => s.id === subclassId)) throw new Error(`You can't choose ${subclassId} now.`);
  if (draft.subclassId === subclassId) return;
  // Evocation Savant's spells belong to the Evoker; they go if the subclass changes.
  draft.prepared = draft.prepared.filter((id) => !draft.savant.includes(id));
  draft.savant = [];
  draft.subclassId = subclassId;
  // A Cleric's domain spells are always prepared, so they needn't be picked as well.
  const domain = domainSpells(heroAfter(game));
  draft.prepared = draft.prepared.filter((id) => !domain.includes(id));
}

export function chooseScholarSkill(game, skillId) {
  const draft = requireDraft(game);
  const plan = levelUpPlan(game);
  if (!plan.scholar || !plan.scholar.from.includes(skillId)) throw new Error(`Scholar can't give Expertise in ${skillId}.`);
  draft.scholarSkill = skillId;
}

// which: 'spellbook', 'savant' or 'prepared'. Picks the spell, or unpicks it if picked.
// Taking a spell back out of the spellbook also unprepares it.
export function toggleLevelUpSpell(game, which, spellId) {
  const draft = requireDraft(game);
  const pick = levelUpPlan(game)[which];
  if (!pick) throw new Error(`There are no ${which} spells to choose at this level.`);
  if (draft[which].includes(spellId)) {
    draft[which] = draft[which].filter((id) => id !== spellId);
    if (which !== 'prepared') draft.prepared = draft.prepared.filter((id) => id !== spellId);
    return;
  }
  if (!pick.from.includes(spellId)) throw new Error(`You can't choose ${spellId} here.`);
  if (draft[which].length >= pick.count) throw new Error(`You've already chosen ${pick.count}.`);
  draft[which].push(spellId);
}

// Makes the new level real: the hero gains it, their Hit Points rise by as much as their
// maximum does, and the journal notes it. Returns { level, hpGained }.
export function finishLevelUp(game) {
  const problems = levelUpProblems(game);
  if (problems.length) throw new Error(problems[0]);
  const hero = heroAfter(game);
  const issues = validateCharacter(hero);
  if (issues.length) throw new Error(`That level-up breaks the rules: ${issues[0]}`);
  const hpGained = maxHp(hero) - maxHp(game.character);
  const before = game.character.level;
  game.character = hero;
  game.hp = Math.min(maxHp(hero) + aidBonus(game), Math.max(0, game.hp) + hpGained);
  partyLevelUp(game, before); // companions level with the hero
  game.levelUp = null;
  addDeed(game, dmNotes.levelUpDeed.replace('{level}', hero.level));
  return { level: hero.level, hpGained };
}

// Debug mode only: takes the hero back down to a lower level, undoing what the levels above
// gave (Hit Point rolls, the subclass, Scholar, spells past the lower level's numbers), and
// sets their XP to that level's total so the level-up doesn't open again straight away.
export function lowerLevel(game, level) {
  const hero = structuredClone(game.character);
  if (!Number.isInteger(level) || level < 1 || level >= hero.level) throw new Error(`Level ${level} isn't lower than ${hero.level}.`);
  hero.level = level;
  hero.hitPointRolls = (hero.hitPointRolls || []).slice(0, level - 1);
  if (level < 3) hero.subclassId = null;
  if (level < 2 && hero.classChoices) {
    const { scholarSkill, ...rest } = hero.classChoices;
    hero.classChoices = rest;
  }
  if (hero.spells) {
    const counts = classSpellCounts(hero);
    const top = highestSpellLevel(hero);
    const spellbook = hero.spells.spellbook.filter((id) => findSpell(id).level <= top).slice(0, counts.spellbook);
    const fromList = spellbook.length === 0 && counts.spellbook === 0; // a Cleric
    const prepared = hero.spells.prepared.filter((id) => (fromList ? findSpell(id).level <= top : spellbook.includes(id))).slice(0, counts.prepared);
    hero.spells = { ...hero.spells, spellbook, prepared };
  }
  game.character = hero;
  game.xp = xpForLevel(level);
  game.levelUp = null;
  game.hp = Math.min(game.hp, maxHp(hero) + aidBonus(game));
  game.slotsUsed = [];
  for (const member of game.party || []) {
    member.hp = Math.min(member.hp, memberMaxHp(game, member));
    member.slotsUsed = [];
  }
}

// Checks a saved level-up's shape, for loading saves.
export function levelUpOk(draft) {
  const ids = (list) => Array.isArray(list) && list.every((id) => typeof id === 'string');
  return Boolean(
    draft &&
      Number.isInteger(draft.level) &&
      (draft.hitPoints === null || draft.hitPoints === 'fixed' || Number.isInteger(draft.hitPoints)) &&
      (draft.subclassId === null || typeof draft.subclassId === 'string') &&
      (draft.scholarSkill === null || typeof draft.scholarSkill === 'string') &&
      ids(draft.spellbook) &&
      ids(draft.savant) &&
      ids(draft.prepared),
  );
}

function requireDraft(game) {
  if (!game.levelUp) throw new Error('No level-up in progress.');
  return game.levelUp;
}

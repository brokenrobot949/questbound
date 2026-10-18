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
//     savant        Evoker: free Evocation spells for the spellbook (Evocation Savant): two of
//                   level 1 or 2 at level 3, then one at each new level of spell slots (level 5:
//                   up to level 3, such as Fireball)
//     prepared      Wizard and Cleric: spells added to the prepared list, up to the new
//                   number (a Wizard's from the spellbook, a Cleric's from the Cleric list)
//     cantrips      Wizard and Cleric: new class cantrips (one at level 4)
//     masteries     Fighter: new kinds of weapon for Weapon Mastery (one at level 4)
//     feat          level 4 (Ability Score Improvement): null, or the feat chosen and its
//                   choices: { id, increases: { ability: points }, skills: [ids] (Skilled),
//                   list, ability, cantrips, spell (Magic Initiate) }
//   }

import { advancement } from '../../../data/srd/advancement.js';
import { abilities } from '../../../data/srd/abilities.js';
import { skills } from '../../../data/srd/skills.js';
import { feats } from '../../../data/srd/feats.js';
import { maxAbilityScore } from '../../../data/srd/character-creation.js';
import { dmNotes } from '../../../data/campaign/dm-voice.js';
import { rollDie } from '../rules/dice.js';
import {
  abilityModifierOf,
  abilityScore,
  characterFeats,
  findClass,
  findFeat,
  hasFeature,
  masteredWeapons,
  masteryChoices,
  qualifiesForFeat,
  skillProficiency,
  sneakAttackDice,
  subclassOf,
  weaponMasteryCount,
} from './sheet.js';
import {
  classSpellCounts,
  domainSpells,
  findSpell,
  highestSpellLevel,
  levelSource,
  magicInitiateLists,
  preparePicks,
  preparesFromList,
  speciesSpells,
  spellsOnList,
  SPELLCASTING_ABILITIES,
} from './spells.js';
import { LIST_ABILITY, spellTakenBy } from './creation.js';
import { aidBonus, featureUsesMax, maxHp } from './resources.js';
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
    game.levelUp = { level, hitPoints: null, subclassId: null, scholarSkill: null, spellbook: [], savant: [], prepared: [], cantrips: [], masteries: [], feat: null };
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
  if (draft.masteries.length) hero.classChoices = { ...hero.classChoices, weaponMasteries: [...masteredWeapons(before), ...draft.masteries] };
  hero.levelFeats = [...(before.levelFeats || [])];
  if (draft.feat) {
    const feat = findFeat(draft.feat.id);
    const entry = { level: draft.level, id: feat.id };
    if (feat.scoreIncrease) entry.increases = { ...draft.feat.increases };
    if (feat.skillChoices) entry.skills = [...draft.feat.skills];
    hero.levelFeats.push(entry);
    if (feat.id === 'magic-initiate') {
      const { list, ability, cantrips, spell } = draft.feat;
      hero.magicInitiate = [...(hero.magicInitiate || []), { source: levelSource(draft.level), list, ability, cantrips: [...cantrips], spell }];
    }
  }
  if (hero.spells) {
    // A domain spell the Cleric had prepared is now always prepared, and frees its place.
    const domain = domainSpells(hero);
    hero.spells = {
      ...hero.spells,
      cantrips: [...hero.spells.cantrips, ...draft.cantrips],
      spellbook: [...hero.spells.spellbook, ...draft.spellbook, ...draft.savant],
      prepared: [...hero.spells.prepared, ...draft.prepared].filter((id) => !domain.includes(id)),
    };
  }
  return hero;
}

// Everything the new level brings, for the level-up screen:
//   level, className
//   hitPoints   { die, fixed, con (the new Constitution modifier), conGain (Hit Points a
//               higher Constitution adds for the earlier levels), fixedGain, gained (once
//               chosen), rolled (the roll, if rolled) }
//   features    [{ id, name, text, source }]: new class, subclass and species features
//   more        [{ name, text }]: features that grow ("Second Wind: 3 uses (was 2)")
//   subclasses  the subclasses to choose from (level 3), or null
//   scholar     { from: [skill ids] } (Wizard level 2), or null
//   feat        level 4: { choices: [feats], increase, skills, initiate } (see featPlan), or null
//   masteries   { count, from: [weapon ids] } (Fighter level 4), or null
//   cantrips, spellbook, savant, prepared   { count, from: [spell ids] }, or null
//   slots       { before: [...], after: [...] } per spell level, or null
//   speciesSpells  [{ spell, note }]: spells the hero's lineage or legacy gives at this level
//   domainSpells   [{ spell, source }]: a Cleric's domain spells that arrive at this level
export function levelUpPlan(game) {
  const draft = requireDraft(game);
  const before = game.character;
  const after = heroAfter(game);
  const cls = findClass(before.classId);
  const row = cls.levels[draft.level - 1];

  const withFixed = { ...after, hitPointRolls: [...after.hitPointRolls.slice(0, -1), null] };
  const hitPoints = {
    die: cls.hitDie,
    fixed: cls.hitPointsPerLevel,
    con: abilityModifierOf(after, 'constitution'),
    conGain: maxHp({ ...before, levelFeats: after.levelFeats }) - maxHp(before),
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
    more: growingFeatures(before, after),
    subclasses: row.features.some((id) => id.endsWith('-subclass')) ? cls.subclasses : null,
    scholar: null,
    feat: row.features.includes('ability-score-improvement') ? featPlan(game, before, after) : null,
    masteries: null,
    cantrips: null,
    spellbook: null,
    savant: null,
    prepared: null,
    slots: null,
    speciesSpells: newSpeciesSpells,
    // A Cleric's domain spells that arrive at this level (Life Domain 5: Mass Healing Word and
    // Revivify), always prepared from now on.
    domainSpells: domainSpells(after)
      .filter((id) => !domainSpells(before).includes(id))
      .map((id) => ({ spell: findSpell(id), source: subclassOf(after).name })),
  };

  if (row.features.includes('scholar')) {
    plan.scholar = { from: cls.scholarSkills.filter((id) => skillProficiency(before, id).level !== 'none') };
  }

  // A Fighter's Weapon Mastery grows to four kinds of weapon at level 4.
  const masteryMore = weaponMasteryCount(after) - masteredWeapons(before).length;
  if (masteryMore > 0) {
    const from = masteryChoices(after).filter((id) => !masteredWeapons(before).includes(id));
    plan.masteries = { count: Math.min(masteryMore, from.length), from };
  }

  if (cls.spellcasting && before.spells) {
    // New class cantrips: ones the hero doesn't already have from anywhere.
    const cantripsMore = classSpellCounts(after).cantrips - before.spells.cantrips.length;
    if (cantripsMore > 0) {
      const given = [...((species && species.cantrips) || []), ...(before.magicInitiate || []).flatMap((entry) => entry.cantrips)];
      const from = spellsOnList(cls.id, 0)
        .map((s) => s.id)
        .filter((id) => !before.spells.cantrips.includes(id) && !given.includes(id));
      if (from.length) plan.cantrips = { count: Math.min(cantripsMore, from.length), from };
    }

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
      const evocations = (maxLevel) => wizardSpells(maxLevel).filter((id) => findSpell(id).school === 'Evocation' && !draft.spellbook.includes(id));
      if (features.some((f) => f.id === 'evocation-savant')) {
        plan.savant = { count: 2, from: evocations(2) };
      } else if (hasFeature(after, 'evocation-savant') && top > highestSpellLevel(before)) {
        // Evocation Savant again: one free Evocation spell at each new level of spell slots.
        const from = evocations(top);
        if (from.length) plan.savant = { count: 1, from };
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

// Limited features that grow with the level, in words: more uses, more dice.
function growingFeatures(before, after) {
  const lines = [];
  const uses = [
    ['second-wind', 'Second Wind'],
    ['action-surge', 'Action Surge'],
    ['channel-divinity', 'Channel Divinity'],
  ];
  for (const [id, name] of uses) {
    const was = featureUsesMax(before, id);
    const now = featureUsesMax(after, id);
    if (was && now > was) lines.push({ name, text: `You can use it ${now} times between Long Rests (was ${was}).` });
  }
  const sneakBefore = sneakAttackDice(before);
  const sneakAfter = sneakAttackDice(after);
  if (sneakBefore && sneakAfter !== sneakBefore) lines.push({ name: 'Sneak Attack', text: `${sneakAfter} extra damage (was ${sneakBefore}).` });
  return lines;
}

// The feat a level gives (the Ability Score Improvement feature):
//   choices    the feats the hero can take: the Ability Score Improvement, the Origin feats,
//              and (with the Fighting Style feature) the Fighting Styles they don't have.
//              A feat they have can't be taken again unless it repeats, and Magic Initiate
//              needs a spell list they haven't used.
//   increase   for the Ability Score Improvement: { points, perAbility, left, abilities:
//              [{ id, name, score (before), raised }] }, else null
//   skills     for Skilled: { count, from: [skill ids they aren't proficient in] }, else null
//   initiate   for Magic Initiate: { lists (allowed), cantrips, spells: [ids on the chosen
//              list] }, else null
function featPlan(game, before, after) {
  const draft = game.levelUp;
  const had = characterFeats(before).map((entry) => entry.feat.id);
  const order = ['general', 'origin', 'fighting-style'];
  const choices = feats
    .filter((feat) => {
      if (!qualifiesForFeat(before, feat, draft.level)) return false;
      if (had.includes(feat.id) && !feat.repeatable) return false;
      if (feat.id === 'magic-initiate') return magicInitiateLists(before, levelSource(draft.level)).length > 0;
      return true;
    })
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  const chosen = draft.feat ? findFeat(draft.feat.id) : null;
  const plan = { choices, increase: null, skills: null, initiate: null };
  if (!chosen) return plan;
  if (chosen.scoreIncrease) {
    const { points, perAbility } = chosen.scoreIncrease;
    const spent = Object.values(draft.feat.increases).reduce((sum, n) => sum + n, 0);
    plan.increase = {
      points,
      perAbility,
      left: points - spent,
      abilities: abilities.map((a) => ({ id: a.id, name: a.name, score: abilityScore(before, a.id).value, raised: draft.feat.increases[a.id] || 0 })),
    };
  }
  if (chosen.skillChoices) {
    plan.skills = { count: chosen.skillChoices, from: skills.map((s) => s.id).filter((id) => skillProficiency(before, id).level === 'none') };
  }
  if (chosen.id === 'magic-initiate') {
    const list = draft.feat.list;
    plan.initiate = {
      lists: magicInitiateLists(before, levelSource(draft.level)),
      cantrips: spellsOnList(list, 0).map((s) => s.id),
      spells: spellsOnList(list, 1).map((s) => s.id),
    };
  }
  return plan;
}

// What's still to choose, in plain words. Empty when the hero can level up.
export function levelUpProblems(game) {
  const draft = requireDraft(game);
  const plan = levelUpPlan(game);
  const problems = [];
  const more = (pick, chosen, what, whats = `${what}s`) => {
    if (pick && chosen.length < pick.count) {
      const n = pick.count - chosen.length;
      problems.push(`Choose ${n} more ${n === 1 ? what : whats}.`);
    }
  };
  if (draft.hitPoints === null) problems.push('Roll your Hit Die or take the fixed Hit Points.');
  if (plan.subclasses && !draft.subclassId) problems.push(`Choose your ${plan.className} subclass.`);
  if (plan.scholar && !draft.scholarSkill) problems.push('Choose a skill for Scholar.');
  if (plan.feat) {
    const feat = draft.feat;
    if (!feat) problems.push('Choose the Ability Score Improvement or a feat.');
    else if (plan.feat.increase && plan.feat.increase.left > 0) {
      const n = plan.feat.increase.left;
      problems.push(`Add ${n} more ${n === 1 ? 'point' : 'points'} to your ability scores.`);
    }
    if (plan.feat.skills) more(plan.feat.skills, feat.skills, 'skill for Skilled', 'skills for Skilled');
    if (plan.feat.initiate) {
      if (!feat.ability) problems.push('Magic Initiate: choose a spellcasting ability.');
      more({ count: 2 }, feat.cantrips, 'Magic Initiate cantrip');
      if (!feat.spell) problems.push('Magic Initiate: choose a level 1 spell.');
    }
  }
  more(plan.masteries, draft.masteries, 'weapon for Weapon Mastery', 'weapons for Weapon Mastery');
  more(plan.cantrips, draft.cantrips, 'cantrip');
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

// Where each kind of new spell goes, for spotting a spell the hero would then have twice
// (see creation.spellTakenBy). A Wizard's prepared spells come from their own spellbook.
const SPELL_HOLDER = { cantrips: 'class-cantrips', spellbook: 'class-spellbook', savant: 'class-spellbook' };

// which: 'cantrips', 'spellbook', 'savant' or 'prepared'. Picks the spell, or unpicks it if
// picked. Taking a spell back out of the spellbook also unprepares it.
export function toggleLevelUpSpell(game, which, spellId) {
  const draft = requireDraft(game);
  const pick = levelUpPlan(game)[which];
  if (!pick) throw new Error(`There are no ${which} spells to choose at this level.`);
  if (draft[which].includes(spellId)) {
    draft[which] = draft[which].filter((id) => id !== spellId);
    if (which === 'spellbook' || which === 'savant') draft.prepared = draft.prepared.filter((id) => id !== spellId);
    return;
  }
  if (!pick.from.includes(spellId)) throw new Error(`You can't choose ${spellId} here.`);
  if (draft[which].length >= pick.count) throw new Error(`You've already chosen ${pick.count}.`);
  const holder = SPELL_HOLDER[which] || (which === 'prepared' && preparesFromList(game.character) ? 'class-prepared' : null);
  if (holder && spellTakenBy(heroAfter(game), spellId, holder)) throw new Error(`You already have ${findSpell(spellId).name} another way.`);
  draft[which].push(spellId);
}

// A Fighter's new kind of weapon for Weapon Mastery: picks it, or unpicks it if picked.
export function toggleLevelUpMastery(game, weaponId) {
  const draft = requireDraft(game);
  const pick = levelUpPlan(game).masteries;
  if (!pick) throw new Error('There’s no Weapon Mastery to choose at this level.');
  if (draft.masteries.includes(weaponId)) {
    draft.masteries = draft.masteries.filter((id) => id !== weaponId);
    return;
  }
  if (!pick.from.includes(weaponId)) throw new Error(`You can't choose ${weaponId} for Weapon Mastery.`);
  if (draft.masteries.length >= pick.count) throw new Error(`You've already chosen ${pick.count}.`);
  draft.masteries.push(weaponId);
}

// The Ability Score Improvement or a feat. Choosing a different one clears the old one's
// choices. Magic Initiate starts on the first spell list the hero hasn't used.
export function chooseFeat(game, featId) {
  const draft = requireDraft(game);
  const plan = levelUpPlan(game).feat;
  if (!plan || !plan.choices.some((f) => f.id === featId)) throw new Error(`You can't take ${featId} now.`);
  if (draft.feat && draft.feat.id === featId) return;
  const list = featId === 'magic-initiate' ? magicInitiateLists(game.character, levelSource(draft.level))[0] : null;
  draft.feat = { id: featId, increases: {}, skills: [], list, ability: list ? LIST_ABILITY[list] : null, cantrips: [], spell: null };
}

// The Ability Score Improvement: one more point on a score (delta 1) or one fewer (-1).
export function adjustFeatIncrease(game, abilityId, delta) {
  const draft = requireDraft(game);
  const increase = draft.feat && levelUpPlan(game).feat.increase;
  if (!increase) throw new Error('No ability scores to raise.');
  const row = increase.abilities.find((a) => a.id === abilityId);
  if (!row || ![1, -1].includes(delta)) throw new Error(`Can't change ${abilityId} by ${delta}.`);
  const next = row.raised + delta;
  if (next < 0) throw new Error(`${row.name} isn't raised.`);
  if (delta > 0) {
    if (increase.left < 1) throw new Error(`You've added all ${increase.points} points.`);
    if (next > increase.perAbility) throw new Error(`At most +${increase.perAbility} to one score.`);
    if (row.score + delta > maxAbilityScore) throw new Error(`No score can go above ${maxAbilityScore}.`);
  }
  if (next === 0) delete draft.feat.increases[abilityId];
  else draft.feat.increases[abilityId] = next;
}

// Whether a score can go up or down a point in the Ability Score Improvement (for the
// screen's + and − buttons).
export function canAdjustIncrease(increase, row, delta) {
  if (delta < 0) return row.raised > 0;
  return increase.left > 0 && row.raised < increase.perAbility && row.score + 1 <= maxAbilityScore;
}

// Skilled: picks a skill, or unpicks it if picked.
export function toggleFeatSkill(game, skillId) {
  const draft = requireDraft(game);
  const pick = draft.feat && levelUpPlan(game).feat.skills;
  if (!pick) throw new Error('No skills to choose.');
  const chosen = draft.feat.skills;
  if (chosen.includes(skillId)) {
    draft.feat.skills = chosen.filter((id) => id !== skillId);
    return;
  }
  if (!pick.from.includes(skillId)) throw new Error(`You can't choose ${skillId} for Skilled.`);
  if (chosen.length >= pick.count) throw new Error(`You've already chosen ${pick.count}.`);
  chosen.push(skillId);
}

// Magic Initiate: its spell list (a new list clears the spells chosen from the old one).
export function setFeatList(game, list) {
  const feat = initiateDraft(game);
  if (!levelUpPlan(game).feat.initiate.lists.includes(list)) throw new Error(`Magic Initiate can't use the ${list} list here.`);
  if (feat.list !== list) Object.assign(feat, { list, ability: feat.ability || LIST_ABILITY[list], cantrips: [], spell: null });
}

export function setFeatAbility(game, ability) {
  const feat = initiateDraft(game);
  if (!SPELLCASTING_ABILITIES.includes(ability)) throw new Error(`Not a spellcasting ability: ${ability}`);
  feat.ability = ability;
}

// Magic Initiate's two cantrips: picks or unpicks one.
export function toggleFeatCantrip(game, spellId) {
  const feat = initiateDraft(game);
  if (feat.cantrips.includes(spellId)) {
    feat.cantrips = feat.cantrips.filter((id) => id !== spellId);
    return;
  }
  if (!levelUpPlan(game).feat.initiate.cantrips.includes(spellId)) throw new Error(`${spellId} isn't a ${feat.list} cantrip.`);
  if (feat.cantrips.length >= 2) throw new Error('Magic Initiate gives two cantrips.');
  if (spellTakenBy(heroAfter(game), spellId, initiateHolder(game))) throw new Error(`You already have ${findSpell(spellId).name} another way.`);
  feat.cantrips.push(spellId);
}

// Magic Initiate's level 1 spell: choosing another swaps it.
export function chooseFeatSpell(game, spellId) {
  const feat = initiateDraft(game);
  if (!levelUpPlan(game).feat.initiate.spells.includes(spellId)) throw new Error(`${spellId} isn't a level 1 ${feat.list} spell.`);
  if (spellTakenBy(heroAfter(game), spellId, initiateHolder(game))) throw new Error(`You already have ${findSpell(spellId).name} another way.`);
  feat.spell = spellId;
}

// Where this level's Magic Initiate spells are, for creation.spellTakenBy: 'initiate-level-4'.
export const initiateHolder = (game) => `initiate-${levelSource(requireDraft(game).level)}`;

function initiateDraft(game) {
  const draft = requireDraft(game);
  if (!draft.feat || draft.feat.id !== 'magic-initiate') throw new Error('Magic Initiate isn’t the feat chosen.');
  return draft.feat;
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
// gave (Hit Point rolls, the subclass, Scholar, feats, cantrips, Weapon Mastery and spells
// past the lower level's numbers), and sets their XP to that level's total so the level-up
// doesn't open again straight away.
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
  const dropped = (hero.levelFeats || []).filter((entry) => entry.level > level).map((entry) => levelSource(entry.level));
  hero.levelFeats = (hero.levelFeats || []).filter((entry) => entry.level <= level);
  hero.magicInitiate = (hero.magicInitiate || []).filter((entry) => !dropped.includes(entry.source));
  if (hero.classChoices && hero.classChoices.weaponMasteries) {
    hero.classChoices = { ...hero.classChoices, weaponMasteries: hero.classChoices.weaponMasteries.slice(0, weaponMasteryCount(hero)) };
  }
  if (hero.spells) {
    const counts = classSpellCounts(hero);
    const top = highestSpellLevel(hero);
    const cantrips = hero.spells.cantrips.slice(0, counts.cantrips);
    const spellbook = hero.spells.spellbook.filter((id) => findSpell(id).level <= top).slice(0, counts.spellbook);
    const fromList = spellbook.length === 0 && counts.spellbook === 0; // a Cleric
    const prepared = hero.spells.prepared.filter((id) => (fromList ? findSpell(id).level <= top : spellbook.includes(id))).slice(0, counts.prepared);
    hero.spells = { ...hero.spells, cantrips, spellbook, prepared };
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
  const textOrNull = (v) => v === null || typeof v === 'string';
  const feat = draft && draft.feat;
  const featOk =
    feat === null ||
    Boolean(
      feat &&
        typeof feat.id === 'string' &&
        feat.increases &&
        typeof feat.increases === 'object' &&
        Object.values(feat.increases).every(Number.isInteger) &&
        ids(feat.skills) &&
        textOrNull(feat.list) &&
        textOrNull(feat.ability) &&
        ids(feat.cantrips) &&
        textOrNull(feat.spell),
    );
  return Boolean(
    draft &&
      Number.isInteger(draft.level) &&
      (draft.hitPoints === null || draft.hitPoints === 'fixed' || Number.isInteger(draft.hitPoints)) &&
      textOrNull(draft.subclassId) &&
      textOrNull(draft.scholarSkill) &&
      ids(draft.spellbook) &&
      ids(draft.savant) &&
      ids(draft.prepared) &&
      ids(draft.cantrips) &&
      ids(draft.masteries) &&
      featOk,
  );
}

function requireDraft(game) {
  if (!game.levelUp) throw new Error('No level-up in progress.');
  return game.levelUp;
}

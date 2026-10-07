// Character creation: the choices the creation screens make, one step at a time.
//
// The hero being built is a "draft": a character (see sheet.js) with some choices still
// empty. Every function here takes a draft and returns a new one, never changing the old.
// When an earlier choice changes, later choices that depended on it are cleared, so the
// draft never holds a combination the rules don't allow (a Fighter skill on a Wizard).
// stepProblems() says what each step still needs; finishCharacter() makes the final hero.

import { abilities } from '../../../data/srd/abilities.js';
import { skills } from '../../../data/srd/skills.js';
import { standardArray, pointBuy, randomGeneration, maxAbilityScore } from '../../../data/srd/character-creation.js';
import { equipment } from '../../../data/srd/equipment.js';
import { armor, shield } from '../../../data/srd/armor.js';
import { drives } from '../../../data/campaign/drives.js';
import { bonds } from '../../../data/campaign/bonds.js';
import { nameTables } from '../../../data/campaign/names.js';
import { rollDice } from '../rules/dice.js';
import { findBackground, findClass, findFeat, findSpecies } from './sheet.js';
import { validateCharacter } from './validate.js';

export const ABILITY_IDS = abilities.map((a) => a.id);
const SKILL_IDS = skills.map((s) => s.id);

// The steps, in order. Skills come after ability scores, so the player can see every source
// of skills on one screen, and the bonus each skill would give.
export const CREATION_STEPS = ['class', 'background', 'species', 'abilities', 'skills', 'details', 'equipment', 'review'];

export const findDrive = (id) => drives.find((d) => d.id === id) || null;
export const findBond = (id) => bonds.find((b) => b.id === id) || null;

// Any item: armour, a Shield, or other equipment.
export function findItem(id) {
  if (id === shield.id) return { ...shield, category: 'shield' };
  const worn = armor.find((a) => a.id === id);
  if (worn) return { ...worn, category: 'armor', armorCategory: worn.category };
  return equipment.find((e) => e.id === id) || null;
}

// A hero with every choice still to make.
export function emptyDraft() {
  return {
    name: '',
    level: 1,
    classId: null,
    subclassId: null,
    speciesId: null,
    size: null,
    speciesChoice: null,
    spellcastingAbility: null,
    backgroundId: null,
    abilityScoreMethod: null,
    baseAbilityScores: {},
    backgroundIncreases: {},
    classSkills: [],
    speciesSkills: [],
    featSkills: [],
    originFeat: null,
    classChoices: {},
    drive: null,
    bond: { type: null, name: '' },
    startingEquipment: { class: null, background: null },
    hitPointRolls: [],
    armorId: null,
    shield: false,
  };
}

const copy = (draft) => structuredClone(draft);

// ---- Class ----

export function chooseClass(draft, classId) {
  if (draft.classId === classId) return draft;
  if (!findClass(classId)) throw new Error(`Unknown class: ${classId}`);
  const next = copy(draft);
  next.classId = classId;
  next.classSkills = [];
  next.classChoices = {};
  next.startingEquipment.class = null;
  return next;
}

export function chooseFightingStyle(draft, featId) {
  const feat = findFeat(featId);
  if (!feat || feat.category !== 'fighting-style') throw new Error(`Not a Fighting Style: ${featId}`);
  const next = copy(draft);
  next.classChoices = { ...next.classChoices, fightingStyle: featId };
  return next;
}

// ---- Background ----

export function chooseBackground(draft, backgroundId) {
  if (draft.backgroundId === backgroundId) return draft;
  const background = findBackground(backgroundId);
  if (!background) throw new Error(`Unknown background: ${backgroundId}`);
  const next = copy(draft);
  next.backgroundId = backgroundId;
  next.backgroundIncreases = {};
  next.startingEquipment.background = null;
  // The background gives these skills now, so picks of them elsewhere are freed up.
  const notGiven = (id) => !background.skills.includes(id);
  next.classSkills = next.classSkills.filter(notGiven);
  next.speciesSkills = next.speciesSkills.filter(notGiven);
  next.featSkills = next.featSkills.filter(notGiven);
  return next;
}

// ---- Species ----

export function chooseSpecies(draft, speciesId) {
  if (draft.speciesId === speciesId) return draft;
  const sp = findSpecies(speciesId);
  if (!sp) throw new Error(`Unknown species: ${speciesId}`);
  const next = copy(draft);
  next.speciesId = speciesId;
  next.size = sp.sizes[0];
  next.speciesChoice = null;
  next.spellcastingAbility = null;
  next.speciesSkills = [];
  next.originFeat = null;
  next.featSkills = [];
  return next;
}

export function chooseSpeciesOption(draft, optionId) {
  const sp = findSpecies(draft.speciesId);
  if (!sp || !sp.choice || !sp.choice.options.some((o) => o.id === optionId)) throw new Error(`Not an option: ${optionId}`);
  return { ...copy(draft), speciesChoice: optionId };
}

export function chooseSize(draft, size) {
  const sp = findSpecies(draft.speciesId);
  if (!sp || !sp.sizes.includes(size)) throw new Error(`Not a size for this species: ${size}`);
  return { ...copy(draft), size };
}

export function chooseSpellcastingAbility(draft, abilityId) {
  if (!['intelligence', 'wisdom', 'charisma'].includes(abilityId)) throw new Error(`Not a spellcasting ability: ${abilityId}`);
  return { ...copy(draft), spellcastingAbility: abilityId };
}

// The Human's Versatile trait. Magic Initiate needs spells to choose from, which arrive in a
// later slice, so it can't be picked here yet.
export const ORIGIN_FEATS_NOT_YET = ['magic-initiate'];

export function chooseOriginFeat(draft, featId) {
  const feat = findFeat(featId);
  if (!feat || feat.category !== 'origin') throw new Error(`Not an Origin feat: ${featId}`);
  if (ORIGIN_FEATS_NOT_YET.includes(featId)) throw new Error(`${feat.name} arrives with spells.`);
  const next = copy(draft);
  next.originFeat = featId;
  if (featId !== 'skilled') next.featSkills = [];
  return next;
}

// ---- Ability scores ----

// The order a class wants its abilities in, best first (from the SRD's suggested array).
function classPriority(classId) {
  const cls = findClass(classId);
  if (!cls) return ABILITY_IDS;
  return [...ABILITY_IDS].sort((a, b) => cls.standardArray[b] - cls.standardArray[a]);
}

// Six scores given out in the class's order: the highest to its most important ability.
export function arrangeByClass(values, classId) {
  const sorted = [...values].sort((a, b) => b - a);
  const ranked = classPriority(classId);
  return Object.fromEntries(ABILITY_IDS.map((id) => [id, sorted[ranked.indexOf(id)]]));
}

// Switches method. Rolled scores must be passed in (see rollAbilityScores).
export function setAbilityMethod(draft, method, rolledValues = null) {
  const next = copy(draft);
  next.abilityScoreMethod = method;
  if (method === 'standard-array') next.baseAbilityScores = arrangeByClass(standardArray, draft.classId);
  else if (method === 'point-buy') next.baseAbilityScores = Object.fromEntries(ABILITY_IDS.map((id) => [id, 8]));
  else if (method === 'random') {
    if (!Array.isArray(rolledValues) || rolledValues.length !== ABILITY_IDS.length) throw new Error('Roll the scores first.');
    next.baseAbilityScores = arrangeByClass(rolledValues, draft.classId);
  } else throw new Error(`Unknown ability score method: ${method}`);
  return next;
}

// Standard Array and rolled scores: puts a value on an ability, swapping with whichever
// ability had it, so each value is still used once.
export function assignScore(draft, abilityId, value) {
  const next = copy(draft);
  const scores = next.baseAbilityScores;
  const holder = ABILITY_IDS.find((id) => id !== abilityId && scores[id] === value);
  if (holder) scores[holder] = scores[abilityId];
  scores[abilityId] = value;
  return next;
}

export function pointBuySpent(scores) {
  return ABILITY_IDS.reduce((sum, id) => sum + (pointBuy.costs[scores[id]] ?? 0), 0);
}

// Point Cost: raises or lowers a score by 1, staying within 8 to 15 and the 27 points.
export function canAdjustPointBuy(draft, abilityId, delta) {
  const value = draft.baseAbilityScores[abilityId] + delta;
  if (!(value in pointBuy.costs)) return false;
  const scores = { ...draft.baseAbilityScores, [abilityId]: value };
  return pointBuySpent(scores) <= pointBuy.budget;
}

export function adjustPointBuy(draft, abilityId, delta) {
  if (!canAdjustPointBuy(draft, abilityId, delta)) return draft;
  const next = copy(draft);
  next.baseAbilityScores[abilityId] += delta;
  return next;
}

// Random Generation: four d6s, keep the highest three, six times. Uses the game's RNG.
// Each result keeps every die, which one was dropped, and the total, so the screen can show them.
export function rollAbilityScores(rng) {
  const { dice, sides, keep, scores } = randomGeneration;
  const results = [];
  for (let i = 0; i < scores; i++) {
    const roll = rollDice(rng, dice, sides);
    const order = roll.rolls.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const droppedIndexes = order.slice(0, dice - keep).map((d) => d.index);
    const total = roll.rolls.reduce((sum, v, index) => (droppedIndexes.includes(index) ? sum : sum + v), 0);
    results.push({ dice: roll.rolls, dropped: droppedIndexes, total });
  }
  return results;
}

// Background increases: amount 0, 1 or 2 on one of the background's three abilities.
export function setIncrease(draft, abilityId, amount) {
  const background = findBackground(draft.backgroundId);
  if (!background || !background.abilities.includes(abilityId)) throw new Error(`The background can't raise ${abilityId}.`);
  const next = copy(draft);
  const increases = { ...next.backgroundIncreases };
  if (amount) increases[abilityId] = amount;
  else delete increases[abilityId];
  next.backgroundIncreases = increases;
  return next;
}

// A sensible start: +2 to the background ability with the highest score and +1 to the next
// (the class's preferred ability wins a tie), keeping every score at 20 or below.
export function suggestIncreases(draft) {
  const background = findBackground(draft.backgroundId);
  if (!background) return draft;
  const priority = classPriority(draft.classId);
  const base = draft.baseAbilityScores;
  const ranked = [...background.abilities].sort((a, b) => (base[b] ?? 0) - (base[a] ?? 0) || priority.indexOf(a) - priority.indexOf(b));
  const next = copy(draft);
  const [first, second, third] = ranked;
  next.backgroundIncreases =
    (base[first] ?? 0) + 2 <= maxAbilityScore ? { [first]: 2, [second]: 1 } : { [first]: 1, [second]: 1, [third]: 1 };
  return next;
}

// ---- Skills ----

// Where a skill can come from at creation, and how many to pick.
// source: 'class', 'species' or 'feat'. Returns null if that source has no picks.
export function skillPicks(draft, source) {
  if (source === 'class') {
    const cls = findClass(draft.classId);
    return cls ? { count: cls.skillChoices.count, from: cls.skillChoices.from, chosen: draft.classSkills } : null;
  }
  if (source === 'species') {
    const sp = findSpecies(draft.speciesId);
    if (!sp || !sp.skillChoice) return null;
    return { count: sp.skillChoice.count, from: sp.skillChoice.from || SKILL_IDS, chosen: draft.speciesSkills };
  }
  if (source === 'feat') {
    const count = skilledCount(draft);
    return count ? { count, from: SKILL_IDS, chosen: draft.featSkills } : null;
  }
  throw new Error(`Unknown skill source: ${source}`);
}

function skilledCount(draft) {
  const background = findBackground(draft.backgroundId);
  const featIds = [background ? background.feat.id : null, draft.originFeat];
  return featIds.filter((id) => id === 'skilled').length * (findFeat('skilled').skillChoices || 0);
}

const FIELD = { class: 'classSkills', species: 'speciesSkills', feat: 'featSkills' };

// What already gives the hero this skill, other than `source` (null if nothing does).
// Used to stop the same skill being picked twice.
export function skillTakenBy(draft, skillId, source) {
  const background = findBackground(draft.backgroundId);
  if (background && background.skills.includes(skillId)) return 'background';
  for (const other of ['class', 'species', 'feat']) {
    if (other !== source && draft[FIELD[other]].includes(skillId)) return other;
  }
  return null;
}

// Picks a skill, or unpicks it if already picked. Ignored if it can't be picked.
export function toggleSkill(draft, source, skillId) {
  const picks = skillPicks(draft, source);
  if (!picks) return draft;
  const next = copy(draft);
  const list = next[FIELD[source]];
  if (list.includes(skillId)) {
    next[FIELD[source]] = list.filter((id) => id !== skillId);
    return next;
  }
  if (!picks.from.includes(skillId) || list.length >= picks.count || skillTakenBy(draft, skillId, source)) return draft;
  list.push(skillId);
  return next;
}

// ---- Name, Drive and Bond ----

export function setName(draft, name) {
  return { ...copy(draft), name };
}

export function chooseDrive(draft, driveId) {
  if (!findDrive(driveId)) throw new Error(`Unknown Drive: ${driveId}`);
  return { ...copy(draft), drive: driveId };
}

export function chooseBond(draft, type) {
  if (!findBond(type)) throw new Error(`Unknown Bond: ${type}`);
  const next = copy(draft);
  next.bond = { ...next.bond, type };
  return next;
}

export function setBondName(draft, name) {
  const next = copy(draft);
  next.bond = { ...next.bond, name };
  return next;
}

const pick = (rng, list) => list[rng.nextInt(list.length)];

// A name from the species' name table, using the game's RNG.
export function rollName(rng, speciesId) {
  const table = nameTables[speciesId] || nameTables.human;
  return `${pick(rng, table.given)} ${pick(rng, table.family)}`;
}

// A name for the Bond person. A sibling shares the hero's species and family name; anyone
// else could be from anywhere.
export function rollBondName(rng, draft) {
  const bond = findBond(draft.bond.type);
  if (bond && bond.sameFamily) {
    const table = nameTables[draft.speciesId] || nameTables.human;
    const words = draft.name.trim().split(/\s+/);
    const family = words.length > 1 ? words[words.length - 1] : pick(rng, table.family);
    return `${pick(rng, table.given)} ${family}`;
  }
  const speciesIds = Object.keys(nameTables);
  return rollName(rng, pick(rng, speciesIds));
}

// ---- Starting equipment ----

// The kit options: which is 'class' or 'background'.
export function kitOptions(draft, which) {
  if (which === 'class') {
    const cls = findClass(draft.classId);
    return cls ? cls.startingEquipment : [];
  }
  const background = findBackground(draft.backgroundId);
  return background ? background.equipment : [];
}

export function chooseKit(draft, which, option) {
  if (!kitOptions(draft, which).some((o) => o.option === option)) throw new Error(`No ${which} equipment option ${option}`);
  const next = copy(draft);
  next.startingEquipment = { ...next.startingEquipment, [which]: option };
  return next;
}

const chosenKit = (draft, which) => kitOptions(draft, which).find((o) => o.option === draft.startingEquipment[which]) || null;

// Everything the chosen kits hold: [{ item, quantity }], plus the gold they come with.
export function startingKit(draft) {
  const items = [];
  let gold = 0;
  for (const which of ['class', 'background']) {
    const kit = chosenKit(draft, which);
    if (!kit) continue;
    gold += kit.gold;
    for (const { id, quantity } of kit.items) {
      const item = findItem(id);
      if (!item) throw new Error(`Starting equipment lists an unknown item: ${id}`);
      items.push({ item, quantity });
    }
  }
  return { items, gold };
}

// The armour the hero puts on: the first armour in their kit that their class is trained in.
export function kitArmor(draft) {
  const cls = findClass(draft.classId);
  if (!cls) return null;
  const worn = startingKit(draft).items.find(({ item }) => item.category === 'armor' && cls.armorTraining.includes(item.armorCategory));
  return worn ? worn.item.id : null;
}

export function kitShield(draft) {
  const cls = findClass(draft.classId);
  return Boolean(cls && cls.armorTraining.includes('shield') && startingKit(draft).items.some(({ item }) => item.category === 'shield'));
}

// ---- Getting each step ready, and what each step still needs ----

// Fills in sensible starting choices the first time a step is shown, so the player can
// accept them or change them.
export function prepareStep(draft, step) {
  let next = draft;
  if (step === 'abilities') {
    if (!next.abilityScoreMethod) next = setAbilityMethod(next, 'standard-array');
    if (Object.keys(next.backgroundIncreases).length === 0) next = suggestIncreases(next);
  }
  if (step === 'equipment') {
    if (!next.startingEquipment.class && kitOptions(next, 'class').length) next = chooseKit(next, 'class', 'A');
    if (!next.startingEquipment.background && kitOptions(next, 'background').length) next = chooseKit(next, 'background', 'A');
  }
  return next;
}

// What a step still needs before moving on, as plain sentences. Empty means it's done.
export function stepProblems(draft, step) {
  const problems = [];
  const need = (ok, message) => {
    if (!ok) problems.push(message);
  };
  const cls = findClass(draft.classId);
  const background = findBackground(draft.backgroundId);
  const sp = findSpecies(draft.speciesId);

  if (step === 'class') {
    need(cls, 'Choose a class.');
    if (cls && cls.id === 'fighter') need(draft.classChoices.fightingStyle, 'Choose a Fighting Style.');
  } else if (step === 'background') {
    need(background, 'Choose a background.');
  } else if (step === 'species') {
    need(sp, 'Choose a species.');
    if (sp) {
      if (sp.choice) need(draft.speciesChoice, `Choose your ${sp.choice.name.toLowerCase()}.`);
      need(sp.sizes.includes(draft.size), 'Choose a size.');
      if (sp.spellcastingAbilityChoice) need(draft.spellcastingAbility, 'Choose a spellcasting ability for your species’ spells.');
      if (sp.originFeat) need(draft.originFeat, 'Choose an Origin feat.');
    }
  } else if (step === 'abilities') {
    const scores = ABILITY_IDS.map((id) => draft.baseAbilityScores[id]);
    need(draft.abilityScoreMethod && scores.every(Number.isInteger), 'Set your ability scores.');
    if (draft.abilityScoreMethod === 'point-buy' && scores.every(Number.isInteger)) {
      need(pointBuySpent(draft.baseAbilityScores) <= pointBuy.budget, `Spend no more than ${pointBuy.budget} points.`);
    }
    const amounts = Object.values(draft.backgroundIncreases).filter(Boolean).sort();
    const pattern = JSON.stringify(amounts);
    need(pattern === '[1,2]' || pattern === '[1,1,1]', 'Give your background increases as +2 and +1, or +1 to all three.');
  } else if (step === 'skills') {
    for (const source of ['class', 'species', 'feat']) {
      const picks = skillPicks(draft, source);
      if (picks && picks.chosen.length !== picks.count) {
        const what = { class: `${cls.name} skill`, species: `${sp.name} skill`, feat: 'Skilled feat skill' }[source];
        need(false, `Choose ${picks.count} ${what}${picks.count === 1 ? '' : 's'} (${picks.chosen.length} chosen).`);
      }
    }
  } else if (step === 'details') {
    need(draft.name.trim() !== '', 'Name your hero.');
    need(findDrive(draft.drive), 'Choose a Drive.');
    need(findBond(draft.bond.type), 'Choose a Bond.');
    need(draft.bond.name.trim() !== '', 'Name your Bond.');
  } else if (step === 'equipment') {
    need(chosenKit(draft, 'class'), 'Choose your class equipment.');
    need(chosenKit(draft, 'background'), 'Choose your background equipment.');
  } else if (step === 'review') {
    problems.push(...validateCharacter(previewHero(draft)));
  }
  return problems;
}

// ---- Finishing ----

// The draft as a full character: names tidied, starting armour put on. The screens use it
// to show the finished numbers before the hero is complete.
export function previewHero(draft) {
  const hero = copy(draft);
  hero.name = hero.name.trim().replace(/\s+/g, ' ');
  hero.bond = { ...hero.bond, name: hero.bond.name.trim().replace(/\s+/g, ' ') };
  hero.armorId = kitArmor(draft);
  hero.shield = kitShield(draft);
  return hero;
}

// The finished hero, ready to start a game with. Throws if anything is still missing.
export function finishCharacter(draft) {
  const hero = previewHero(draft);
  const problems = validateCharacter(hero);
  if (problems.length > 0) throw new Error(`This hero isn't finished: ${problems.join(' ')}`);
  return hero;
}

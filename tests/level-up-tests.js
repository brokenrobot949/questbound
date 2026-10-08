// Level-up checks. Open tests/levels.html through the local server to run them.
// Add checks here whenever levelling up or a level 2–3 feature changes.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { abilityCheck } from '../js/engine/rules/ability-check.js';
import * as levelUp from '../js/engine/character/level-up.js';
import { tacticalMind } from '../js/engine/character/features.js';
import { hasFeature, maxHitPoints, skillProficiency } from '../js/engine/character/sheet.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { freshResources, slotsAt } from '../js/engine/character/resources.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { newJournal } from '../js/engine/story/journal.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';

const wren = quickStartHeroes.find((h) => h.id === 'wren').character;
const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;

// A game with what levelling up needs: the hero, their kit and Hit Points, XP, the journal.
function gameFor(character, xp = 0, rng = createRng('levels')) {
  return { character: structuredClone(character), rng, ...startingInventory(character), ...freshResources(character), xp, day: 3, journal: newJournal(), battle: null, levelUp: null };
}

// Takes the hero up one level with the given choices.
function levelWith(game, { hitPoints = 'fixed', subclass = null, scholar = null, savant = [], spellbook = [], prepared = [] } = {}) {
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, hitPoints);
  if (subclass) levelUp.chooseSubclass(game, subclass);
  if (scholar) levelUp.chooseScholarSkill(game, scholar);
  for (const id of savant) levelUp.toggleLevelUpSpell(game, 'savant', id);
  for (const id of spellbook) levelUp.toggleLevelUpSpell(game, 'spellbook', id);
  for (const id of prepared) levelUp.toggleLevelUpSpell(game, 'prepared', id);
  return levelUp.finishLevelUp(game);
}

const wizardTwo = { scholar: 'arcana', spellbook: ['burning-hands', 'false-life'], prepared: ['burning-hands'] };

// ---- When ----

test('Ready: level 2 needs 300 XP, and never opens during a fight', () => {
  const game = gameFor(wren, 299);
  assertTrue(!levelUp.levelUpReady(game), '299 XP is not enough');
  game.xp = 300;
  assertTrue(levelUp.levelUpReady(game), '300 XP is');
  game.battle = { outcome: null };
  assertTrue(!levelUp.levelUpReady(game), 'not in the middle of a fight');
  assertThrows(() => levelUp.beginLevelUp(gameFor(wren, 0)), 'no level-up without the XP');
});

test('Ready: level 3 is as far as the rules data goes for now', () => {
  assertEqual([levelUp.nextLevelXp(wren), levelUp.nextLevelXp({ ...wren, level: 2 }), levelUp.nextLevelXp({ ...wren, level: 3 })], [300, 900, null]);
});

// ---- Fighter ----

test('Fighter 2: fixed Hit Points, Action Surge and Tactical Mind', () => {
  const game = gameFor(wren, 300);
  levelUp.beginLevelUp(game);
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.features.map((f) => f.id), ['action-surge', 'tactical-mind']);
  assertEqual([plan.subclasses, plan.scholar, plan.slots], [null, null, null], 'nothing else to choose');
  assertEqual(levelUp.levelUpProblems(game), ['Roll your Hit Die or take the fixed Hit Points.']);
  assertEqual(plan.hitPoints.fixedGain, 8, 'the fixed 6, plus Con +2');
  game.hp = 5; // hurt: the new Hit Points add to what's left
  const result = levelWith(game);
  assertEqual(result, { level: 2, hpGained: 8 });
  assertEqual([game.character.level, game.character.hitPointRolls, maxHitPoints(game.character).value, game.hp], [2, [null], 20, 13]);
  assertEqual([game.levelUp, game.journal.deeds.at(-1)], [null, { day: 3, text: 'Reached level 2.' }]);
  assertTrue(hasFeature(game.character, 'action-surge') && hasFeature(game.character, 'tactical-mind'));
  assertEqual(validateCharacter(game.character), []);
});

test('Hit Points: a rolled Hit Die stands, and can’t be swapped for the fixed value', () => {
  const game = gameFor(wren, 300, scriptedRng([7]));
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.chooseHitPoints(game, 'roll'); // the fixed value can still be swapped for a roll
  assertEqual(game.levelUp.hitPoints, 7);
  assertThrows(() => levelUp.chooseHitPoints(game, 'fixed'), 'no taking the fixed value after a roll');
  assertThrows(() => levelUp.chooseHitPoints(game, 'roll'), 'no rolling twice');
  assertEqual(levelUp.finishLevelUp(game).hpGained, 9, '7 rolled, plus Con +2');
  assertEqual(game.character.hitPointRolls, [7]);
});

test('Fighter 3: the Champion, with Improved Critical and Remarkable Athlete', () => {
  const game = gameFor(wren, 900);
  levelWith(game);
  assertTrue(levelUp.levelUpReady(game), 'enough XP for level 3 as well: one level at a time');
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, 'fixed');
  assertEqual(levelUp.levelUpProblems(game), ['Choose your Fighter subclass.']);
  assertEqual(levelUp.levelUpPlan(game).subclasses.map((s) => s.id), ['champion']);
  levelUp.chooseSubclass(game, 'champion');
  assertEqual(levelUp.levelUpPlan(game).features.map((f) => f.id), ['fighter-subclass', 'improved-critical', 'remarkable-athlete']);
  levelUp.finishLevelUp(game);
  assertEqual([game.character.level, game.character.subclassId, game.character.hitPointRolls], [3, 'champion', [null, null]]);
  assertTrue(!levelUp.levelUpReady(game), 'level 3 is the top for now');
  assertEqual(validateCharacter(game.character), []);
});

test('Tactical Mind: a failed check gets 1d10, spending Second Wind only if it works', () => {
  const game = gameFor({ ...wren, level: 2, hitPointRolls: [null] });
  const check = (rng) => abilityCheck({ rng, character: game.character, testId: 'persuasion', dc: 15 });
  // Persuasion is +3: a 5 makes 8, seven short. A d10 of 8 makes 16.
  const saved = tacticalMind({ ...game, rng: scriptedRng([8]) }, check(scriptedRng([5])));
  assertEqual([saved.success, saved.total, saved.tacticalMind, game.featureUses['second-wind']], [true, 16, { roll: 8, spent: true }, 1]);
  assertEqual(saved.modifiers.at(-1).label, 'Tactical Mind', 'shown in the roll’s breakdown');
  const still = tacticalMind({ ...game, rng: scriptedRng([2]) }, check(scriptedRng([5])));
  assertEqual([still.success, still.tacticalMind.spent, game.featureUses['second-wind']], [false, false, 1], 'still short: Second Wind kept');
  const hopeless = tacticalMind({ ...game, rng: scriptedRng([]) }, check(scriptedRng([1])));
  assertEqual([hopeless.success, hopeless.tacticalMind], [false, undefined], 'eleven short: no d10 could help, so none is rolled');
  const levelOne = gameFor(wren);
  assertEqual(tacticalMind({ ...levelOne, rng: scriptedRng([]) }, check(scriptedRng([5]))).success, false, 'level 1 Fighters don’t have it');
});

test('Remarkable Athlete: Advantage on Athletics checks', () => {
  const champion = { ...wren, level: 3, subclassId: 'champion', hitPointRolls: [null, null] };
  const r = abilityCheck({ rng: scriptedRng([4, 17]), character: champion, testId: 'athletics', dc: 10 });
  assertEqual([r.mode, r.natural, r.advantage], ['advantage', 17, ['Remarkable Athlete']]);
});

// ---- Wizard ----

test('Wizard 2: Scholar, two spellbook spells and one more prepared spell', () => {
  const game = gameFor(juniper, 300);
  levelUp.beginLevelUp(game);
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.scholar.from, ['arcana', 'history', 'investigation'], 'only skills she is proficient in');
  assertEqual([plan.spellbook.count, plan.prepared.count, plan.slots], [2, 1, { before: [2], after: [3] }]);
  assertTrue(plan.spellbook.from.every((id) => !juniper.spells.spellbook.includes(id)), 'nothing she already has');
  assertTrue(!plan.spellbook.from.includes('scorching-ray'), 'no level 2 spells before level 2 slots');
  assertThrows(() => levelUp.chooseScholarSkill(game, 'nature'), 'not proficient in Nature');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'burning-hands');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'false-life');
  assertThrows(() => levelUp.toggleLevelUpSpell(game, 'spellbook', 'charm-person'), 'only two');
  assertEqual(levelUp.levelUpProblems(game).length, 3, 'Hit Points, Scholar and a prepared spell still to do');
  game.levelUp = null;
  levelWith(game, wizardTwo);
  const hero = game.character;
  assertEqual([hero.level, hero.spells.spellbook.length, hero.spells.prepared.length, hero.classChoices.scholarSkill], [2, 8, 5, 'arcana']);
  assertEqual(skillProficiency(hero, 'arcana').level, 'expertise');
  assertEqual(slotsAt(hero, 1), 3);
  assertEqual(validateCharacter(hero), []);
});

test('Wizard: taking a spell back out of the new spellbook spells unprepares it', () => {
  const game = gameFor(juniper, 300);
  levelUp.beginLevelUp(game);
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'burning-hands');
  levelUp.toggleLevelUpSpell(game, 'prepared', 'burning-hands');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'burning-hands');
  assertEqual([game.levelUp.spellbook, game.levelUp.prepared], [[], []]);
});

test('Wizard 3: the Evoker, Evocation Savant, level 2 spells and level 2 slots', () => {
  const game = gameFor(juniper, 900);
  levelWith(game, wizardTwo);
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, 'fixed');
  assertEqual(levelUp.levelUpPlan(game).savant, null, 'Evocation Savant comes with the Evoker');
  levelUp.chooseSubclass(game, 'evoker');
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.savant.count, 2);
  assertEqual(plan.savant.from, ['scorching-ray', 'shatter'], 'Evocation spells of level 1 or 2 she doesn’t have yet');
  assertTrue(!plan.spellbook.from.includes('thunderwave'), 'she has Thunderwave from Magic Initiate already');
  assertTrue(plan.savant.from.every((id) => !['knock', 'misty-step'].includes(id)), 'Evocation only');
  levelUp.toggleLevelUpSpell(game, 'savant', 'scorching-ray');
  levelUp.toggleLevelUpSpell(game, 'savant', 'shatter');
  assertTrue(!levelUp.levelUpPlan(game).spellbook.from.includes('scorching-ray'), 'not offered twice');
  assertTrue(levelUp.levelUpPlan(game).spellbook.from.includes('misty-step'), 'level 2 spells now');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'misty-step');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'knock');
  levelUp.toggleLevelUpSpell(game, 'prepared', 'scorching-ray');
  assertEqual(levelUp.levelUpProblems(game), []);
  levelUp.finishLevelUp(game);
  const hero = game.character;
  assertEqual([hero.level, hero.subclassId, hero.spells.spellbook.length, hero.spells.prepared.length], [3, 'evoker', 12, 6]);
  assertEqual([slotsAt(hero, 1), slotsAt(hero, 2)], [4, 2]);
  assertTrue(hasFeature(hero, 'potent-cantrip'));
  assertEqual(validateCharacter(hero), []);
});

test('Species: a lineage spell that arrives at level 3 is shown as new', () => {
  const drow = { ...wren, speciesId: 'elf', speciesChoice: 'drow', spellcastingAbility: 'wisdom', originFeat: null, look: { ...wren.look, hairStyle: 'long' } };
  assertEqual(validateCharacter(drow), [], 'a legal Drow Fighter');
  const game = gameFor(drow, 900);
  levelWith(game);
  levelUp.beginLevelUp(game);
  assertEqual(levelUp.levelUpPlan(game).speciesSpells.map((s) => [s.spell.id, s.source]), [['faerie-fire', 'Drow']]);
});

// ---- Debug ----

test('Debug: lowering a level undoes what it gave', () => {
  const game = gameFor(juniper, 300);
  levelWith(game, wizardTwo);
  levelUp.lowerLevel(game, 1);
  const hero = game.character;
  assertEqual([hero.level, hero.spells.spellbook.length, hero.spells.prepared.length, hero.classChoices.scholarSkill, game.xp], [1, 6, 4, undefined, 0]);
  assertEqual(validateCharacter(hero), []);
});

run(document.getElementById('summary'), document.getElementById('results'));

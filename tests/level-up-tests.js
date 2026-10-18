// Level-up checks. Open tests/levels.html through the local server to run them.
// Add checks here whenever levelling up or a level 2–5 feature changes.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { abilityCheck } from '../js/engine/rules/ability-check.js';
import * as levelUp from '../js/engine/character/level-up.js';
import { tacticalMind } from '../js/engine/character/features.js';
import { abilityScore, characterFeats, hasFeature, maxHitPoints, proficiencyBonus, skillProficiency, sneakAttackDice, spellcasting } from '../js/engine/character/sheet.js';
import { canCastSpell, domainSpells, freeCastsLeft } from '../js/engine/character/spells.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { featureUsesMax, freshResources, slotsAt } from '../js/engine/character/resources.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { newJournal } from '../js/engine/story/journal.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';

const wren = quickStartHeroes.find((h) => h.id === 'wren').character;
const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;
const posy = quickStartHeroes.find((h) => h.id === 'posy').character;
const sorael = quickStartHeroes.find((h) => h.id === 'sorael').character;

// The Quick Start heroes at level 3, ready for level 4 (2,700 XP).
const wren3 = { ...wren, level: 3, subclassId: 'champion', hitPointRolls: [null, null] };
const juniper3 = {
  ...juniper,
  level: 3,
  subclassId: 'evoker',
  hitPointRolls: [null, null],
  classChoices: { scholarSkill: 'arcana' },
  spells: {
    ...juniper.spells,
    spellbook: [...juniper.spells.spellbook, 'burning-hands', 'false-life', 'scorching-ray', 'shatter', 'misty-step', 'knock'],
    prepared: [...juniper.spells.prepared, 'burning-hands', 'scorching-ray'],
  },
};
const posy3 = { ...posy, level: 3, subclassId: 'life', hitPointRolls: [null, null], spells: { ...posy.spells, prepared: ['guiding-bolt', 'sanctuary', 'detect-magic', 'hold-person'] } };
const sorael3 = { ...sorael, level: 3, subclassId: 'thief', hitPointRolls: [null, null] };
// Wren at level 4 with her fourth Weapon Mastery, and whatever feat a check gives her.
const wren4 = (levelFeats) => ({ ...wren3, level: 4, hitPointRolls: [null, null, null], classChoices: { ...wren.classChoices, weaponMasteries: [...wren.classChoices.weaponMasteries, 'longbow'] }, levelFeats });

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

test('Ready: level 5 (6,500 XP) is as far as the rules data goes for now', () => {
  const next = (level) => levelUp.nextLevelXp({ ...wren, level });
  assertEqual([next(1), next(2), next(3), next(4), next(5)], [300, 900, 2700, 6500, null]);
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
  assertTrue(!levelUp.levelUpReady(game), 'level 4 needs 2,700 XP');
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
  assertEqual(plan.savant.from, ['scorching-ray', 'shatter', 'darkness'], 'Evocation spells of level 1 or 2 she doesn’t have yet');
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

// ---- Level 4: the Ability Score Improvement or a feat ----

test('Level 4: the level 3 heroes these checks start from are legal', () => {
  for (const hero of [wren3, juniper3, posy3, sorael3]) assertEqual(validateCharacter(hero), [], hero.name);
});

test('Fighter 4: an Ability Score Improvement, a fourth Weapon Mastery and a third Second Wind', () => {
  const game = gameFor(wren3, 2700);
  levelUp.beginLevelUp(game);
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.feat.choices.map((f) => f.id), ['ability-score-improvement', 'magic-initiate', 'skilled', 'archery', 'great-weapon-fighting', 'two-weapon-fighting'], 'not Alert, Savage Attacker or Defense: she has those');
  assertEqual(plan.more, [{ name: 'Second Wind', text: 'You can use it 3 times between Long Rests (was 2).' }]);
  assertEqual([plan.masteries.count, plan.masteries.from.includes('greatsword'), plan.masteries.from.includes('longbow')], [1, false, true]);
  assertEqual(plan.features.map((f) => f.id), ['ability-score-improvement']);
  assertEqual(levelUp.levelUpProblems(game), ['Roll your Hit Die or take the fixed Hit Points.', 'Choose the Ability Score Improvement or a feat.', 'Choose 1 more weapon for Weapon Mastery.']);
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.chooseFeat(game, 'ability-score-improvement');
  levelUp.adjustFeatIncrease(game, 'strength', 1);
  levelUp.adjustFeatIncrease(game, 'strength', 1);
  assertThrows(() => levelUp.adjustFeatIncrease(game, 'constitution', 1), 'only two points');
  assertThrows(() => levelUp.adjustFeatIncrease(game, 'dexterity', -1), 'Dexterity isn’t raised');
  levelUp.adjustFeatIncrease(game, 'strength', -1);
  assertEqual(levelUp.levelUpProblems(game), ['Add 1 more point to your ability scores.', 'Choose 1 more weapon for Weapon Mastery.']);
  levelUp.adjustFeatIncrease(game, 'constitution', 1);
  assertEqual(game.levelUp.feat.increases, { strength: 1, constitution: 1 });
  const hp = levelUp.levelUpPlan(game).hitPoints;
  assertEqual([hp.con, hp.conGain, hp.fixedGain], [3, 3, 12], 'Con 16 (+3): 3 more for levels 1–3, then 6 + 3 for level 4');
  levelUp.toggleLevelUpMastery(game, 'longbow');
  assertThrows(() => levelUp.toggleLevelUpMastery(game, 'spear'), 'only one more');
  assertEqual(levelUp.levelUpProblems(game), []);
  game.hp = 20;
  assertEqual(levelUp.finishLevelUp(game), { level: 4, hpGained: 12 });
  const hero = game.character;
  assertEqual([abilityScore(hero, 'strength').value, abilityScore(hero, 'constitution').value, maxHitPoints(hero).value, game.hp], [18, 16, 40, 32]);
  assertEqual(abilityScore(hero, 'strength').parts.at(-1), { label: 'Ability Score Improvement (level 4)', value: 1 }, 'the maths says where it came from');
  assertEqual([hero.classChoices.weaponMasteries, featureUsesMax(hero, 'second-wind')], [['greatsword', 'flail', 'javelin', 'longbow'], 3]);
  assertEqual(hero.levelFeats, [{ level: 4, id: 'ability-score-improvement', increases: { strength: 1, constitution: 1 } }]);
  assertEqual(validateCharacter(hero), []);
  assertTrue(!levelUp.levelUpReady({ ...game, xp: 6499 }) && levelUp.levelUpReady({ ...game, xp: 6500 }), 'level 5 at 6,500 XP');
});

test('Ability Score Improvement: no score above 20', () => {
  // Strength 18 assigned by hand, plus the Soldier's +2: already 20.
  const strong = { ...wren3, abilityScoreMethod: 'manual', baseAbilityScores: { ...wren.baseAbilityScores, strength: 18 } };
  assertEqual(validateCharacter(strong), []);
  const game = gameFor(strong, 2700);
  levelUp.beginLevelUp(game);
  levelUp.chooseFeat(game, 'ability-score-improvement');
  const increase = () => levelUp.levelUpPlan(game).feat.increase;
  const row = (id) => increase().abilities.find((a) => a.id === id);
  assertTrue(!levelUp.canAdjustIncrease(increase(), row('strength'), 1), 'the + is greyed out');
  assertThrows(() => levelUp.adjustFeatIncrease(game, 'strength', 1), 'Strength is 20 already');
  assertEqual(validateCharacter(wren4([{ level: 4, id: 'ability-score-improvement', increases: { strength: 2 } }])), [], 'Wren’s 17 can take +2');
  const over = { ...wren4([{ level: 4, id: 'ability-score-improvement', increases: { strength: 1, constitution: 1 } }]), abilityScoreMethod: 'manual', baseAbilityScores: strong.baseAbilityScores };
  assertEqual(validateCharacter(over), ['No score can go above 20.']);
});

test('Level 4 feats: the rules checker refuses a missing, doubled or wrong choice', () => {
  const asi = (increases) => wren4([{ level: 4, id: 'ability-score-improvement', increases }]);
  assertEqual(validateCharacter(asi({ wisdom: 1, constitution: 1 })), []);
  assertEqual(validateCharacter(wren4([])), ['Choose an Ability Score Improvement or a feat at level 4.']);
  const points = ['Ability Score Improvement: 2 points to share among your scores, at most 2 to one.'];
  assertEqual([validateCharacter(asi({ strength: 1 })), validateCharacter(asi({ dexterity: 1, wisdom: 1, charisma: 1 }))], [points, points]);
  assertEqual(validateCharacter(wren4([{ level: 4, id: 'alert' }])), ['Alert can be taken only once.'], 'her Versatile trait gave her Alert');
  assertEqual(validateCharacter(wren4([{ level: 4, id: 'defense' }])), ['Defense can be taken only once.'], 'her Fighting Style is Defense');
  assertEqual(validateCharacter(wren4([{ level: 4, id: 'archery' }])), []);
  assertEqual(validateCharacter(wren4([{ level: 4, id: 'skilled', skills: ['stealth', 'arcana'] }])), ['Choose 3 different skills for Skilled.']);
  const wizard = { ...juniper3, level: 4, hitPointRolls: [null, null, null], levelFeats: [{ level: 4, id: 'archery' }] };
  assertTrue(validateCharacter(wizard).includes('Archery can’t be taken at level 4.'), 'a Wizard has no Fighting Style');
  assertEqual(validateCharacter({ ...wren3, levelFeats: [{ level: 4, id: 'alert' }] }), ['Feats from levels come with the Ability Score Improvement feature.', 'Alert can be taken only once.']);
});

test('Fighter 4: a second Fighting Style as her feat', () => {
  const game = gameFor(wren3, 2700);
  levelUp.beginLevelUp(game);
  assertThrows(() => levelUp.chooseFeat(game, 'defense'), 'she has Defense');
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.chooseFeat(game, 'archery');
  levelUp.toggleLevelUpMastery(game, 'longbow');
  levelUp.finishLevelUp(game);
  assertEqual(characterFeats(game.character).map((entry) => [entry.feat.id, entry.source]).at(-1), ['archery', 'Level 4']);
  assertEqual(validateCharacter(game.character), []);
});

test('Wizard 4: a fourth cantrip, Magic Initiate on a new list, and a seventh prepared spell', () => {
  const game = gameFor(juniper3, 2700);
  levelUp.beginLevelUp(game);
  let plan = levelUp.levelUpPlan(game);
  assertEqual(plan.cantrips, { count: 1, from: ['chill-touch', 'dancing-lights', 'poison-spray', 'shocking-grasp'] }, 'not her own, her Magic Initiate ones or her Rock Gnome ones');
  assertEqual([plan.spellbook.count, plan.prepared.count, plan.slots], [2, 1, { before: [4, 2], after: [4, 3] }]);
  assertEqual(plan.feat.choices.map((f) => f.id), ['ability-score-improvement', 'alert', 'magic-initiate', 'savage-attacker', 'skilled']);
  levelUp.chooseFeat(game, 'magic-initiate');
  plan = levelUp.levelUpPlan(game);
  assertEqual([plan.feat.initiate.lists, game.levelUp.feat.list, game.levelUp.feat.ability], [['cleric', 'druid'], 'cleric', 'wisdom'], 'the Wizard list is her Sage’s already');
  assertThrows(() => levelUp.setFeatList(game, 'wizard'));
  levelUp.setFeatList(game, 'druid');
  levelUp.setFeatAbility(game, 'intelligence');
  levelUp.toggleLevelUpSpell(game, 'cantrips', 'poison-spray');
  assertThrows(() => levelUp.toggleFeatCantrip(game, 'poison-spray'), 'already her new Wizard cantrip');
  assertThrows(() => levelUp.toggleFeatCantrip(game, 'mending'), 'already a Rock Gnome cantrip');
  levelUp.toggleFeatCantrip(game, 'druidcraft');
  levelUp.toggleFeatCantrip(game, 'guidance');
  levelUp.chooseFeatSpell(game, 'cure-wounds');
  levelUp.chooseFeatSpell(game, 'faerie-fire'); // choosing another swaps it
  assertThrows(() => levelUp.chooseFeatSpell(game, 'thunderwave'), 'her Sage’s Magic Initiate spell');
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'charm-person');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'fog-cloud');
  levelUp.toggleLevelUpSpell(game, 'prepared', 'misty-step');
  assertEqual(levelUp.levelUpProblems(game), []);
  levelUp.finishLevelUp(game);
  const hero = game.character;
  assertEqual(
    hero.magicInitiate.map((e) => [e.source, e.list, e.ability, e.cantrips, e.spell]),
    [['background', 'wizard', 'intelligence', ['minor-illusion', 'ray-of-frost'], 'thunderwave'], ['level-4', 'druid', 'intelligence', ['druidcraft', 'guidance'], 'faerie-fire']],
  );
  assertEqual([hero.spells.cantrips.length, hero.spells.spellbook.length, hero.spells.prepared.length, slotsAt(hero, 2)], [4, 14, 7, 3]);
  assertTrue(canCastSpell(hero, 'faerie-fire') && canCastSpell(hero, 'guidance') && canCastSpell(hero, 'poison-spray'));
  assertEqual(freeCastsLeft({ character: hero, featureUses: {} }, 'faerie-fire'), 1, 'free once per Long Rest');
  assertEqual(validateCharacter(hero), []);
});

test('Cleric 4: Resistance is the one Cleric cantrip Posy doesn’t know; Skilled gives three new skills', () => {
  const game = gameFor(posy3, 2700);
  levelUp.beginLevelUp(game);
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.cantrips, { count: 1, from: ['resistance'] });
  assertEqual([plan.prepared.count, plan.slots.after, plan.more], [3, [4, 3], []], 'seven prepared, three of them new; Channel Divinity stays at two');
  levelUp.chooseFeat(game, 'skilled');
  assertTrue(!levelUp.levelUpPlan(game).feat.skills.from.includes('insight'), 'she knows Insight already');
  assertThrows(() => levelUp.toggleFeatSkill(game, 'religion'));
  for (const id of ['perception', 'stealth', 'arcana']) levelUp.toggleFeatSkill(game, id);
  assertThrows(() => levelUp.toggleFeatSkill(game, 'history'), 'three only');
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.toggleLevelUpSpell(game, 'cantrips', 'resistance');
  for (const id of ['shield-of-faith', 'command', 'spiritual-weapon']) levelUp.toggleLevelUpSpell(game, 'prepared', id);
  assertEqual(levelUp.levelUpProblems(game), []);
  levelUp.finishLevelUp(game);
  const hero = game.character;
  assertEqual(skillProficiency(hero, 'perception'), { level: 'proficient', sources: ['Skilled feat (level 4)'] });
  assertEqual([hero.spells.cantrips.includes('resistance'), hero.spells.prepared.length, featureUsesMax(hero, 'channel-divinity')], [true, 7, 2]);
  assertEqual(validateCharacter(hero), []);
});

test('Rogue 4: +2 Dexterity; Sneak Attack stays 2d6', () => {
  const game = gameFor(sorael3, 2700);
  levelUp.beginLevelUp(game);
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.feat.choices.map((f) => f.id), ['ability-score-improvement', 'magic-initiate', 'savage-attacker', 'skilled'], 'the Criminal gave her Alert');
  assertEqual([plan.more, plan.masteries, plan.cantrips, plan.slots], [[], null, null, null]);
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.chooseFeat(game, 'ability-score-improvement');
  levelUp.adjustFeatIncrease(game, 'dexterity', 1);
  levelUp.adjustFeatIncrease(game, 'dexterity', 1);
  assertThrows(() => levelUp.adjustFeatIncrease(game, 'dexterity', 1), 'at most +2 to one score');
  levelUp.finishLevelUp(game);
  assertEqual([abilityScore(game.character, 'dexterity').value, sneakAttackDice(game.character)], [19, '2d6']);
  assertEqual(validateCharacter(game.character), []);
});

test('Level 4: choosing another feat clears the first one’s choices', () => {
  const game = gameFor(juniper3, 2700);
  levelUp.beginLevelUp(game);
  levelUp.chooseFeat(game, 'ability-score-improvement');
  levelUp.adjustFeatIncrease(game, 'intelligence', 1);
  levelUp.adjustFeatIncrease(game, 'intelligence', 1);
  levelUp.chooseFeat(game, 'skilled');
  assertEqual([game.levelUp.feat.id, game.levelUp.feat.increases], ['skilled', {}]);
  assertThrows(() => levelUp.adjustFeatIncrease(game, 'intelligence', 1), 'Skilled raises no scores');
  assertThrows(() => levelUp.chooseFeat(game, 'grappler'), 'not in the game yet');
  assertEqual(levelUp.levelUpOk(game.levelUp), true);
});

// ---- Level 5 ----

// The Quick Start heroes at level 4, ready for level 5 (6,500 XP). Juniper: Int 19 (+4), Chill
// Touch as her fourth cantrip, Hold Person and Invisibility in her book. Posy: Wis 18 (+4), Con
// 14, Resistance, and seven prepared. Sorael: Dex 19.
const juniper4 = {
  ...juniper3,
  level: 4,
  hitPointRolls: [null, null, null],
  levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { intelligence: 2 } }],
  spells: { cantrips: [...juniper.spells.cantrips, 'chill-touch'], spellbook: [...juniper3.spells.spellbook, 'hold-person', 'invisibility'], prepared: [...juniper3.spells.prepared, 'hold-person'] },
};
const posy4 = {
  ...posy3,
  level: 4,
  hitPointRolls: [null, null, null],
  levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { wisdom: 1, constitution: 1 } }],
  spells: { ...posy3.spells, cantrips: [...posy.spells.cantrips, 'resistance'], prepared: [...posy3.spells.prepared, 'shield-of-faith', 'spiritual-weapon', 'command'] },
};
const sorael4 = { ...sorael3, level: 4, hitPointRolls: [null, null, null], levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { dexterity: 2 } }] };
const wren4Asi = wren4([{ level: 4, id: 'ability-score-improvement', increases: { strength: 1, constitution: 1 } }]);

test('Level 5: the level 4 heroes these checks start from are legal', () => {
  for (const hero of [wren4Asi, juniper4, posy4, sorael4]) assertEqual(validateCharacter(hero), [], hero.name);
});

test('Fighter 5: Proficiency +3, Extra Attack and Tactical Shift; only Hit Points to choose', () => {
  const game = gameFor(wren4Asi, 6500);
  levelUp.beginLevelUp(game);
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.features.map((f) => f.id), ['extra-attack', 'tactical-shift']);
  assertEqual([plan.more, plan.masteries, plan.feat, plan.slots, plan.subclasses], [[], null, null, null, null], 'Second Wind stays at 3 uses, Weapon Mastery at 4 kinds');
  assertEqual(levelUp.levelUpProblems(game), ['Roll your Hit Die or take the fixed Hit Points.']);
  levelUp.chooseHitPoints(game, 'fixed');
  assertEqual(levelUp.finishLevelUp(game), { level: 5, hpGained: 9 });
  const hero = game.character;
  assertEqual([proficiencyBonus(hero.level), maxHitPoints(hero).value, hasFeature(hero, 'extra-attack'), hasFeature(hero, 'tactical-shift'), featureUsesMax(hero, 'second-wind')], [3, 49, true, true, 3]);
  assertEqual(validateCharacter(hero), []);
  assertTrue(!levelUp.levelUpReady({ ...game, xp: 100000 }), 'level 5 is the top for now');
});

test('Wizard 5: level 3 slots and spells, two more prepared, and Evocation Savant’s free level 3 spell', () => {
  const game = gameFor(juniper4, 6500);
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, 'fixed');
  const plan = levelUp.levelUpPlan(game);
  assertEqual([plan.features.map((f) => f.id), plan.slots.after, plan.cantrips, plan.spellbook.count, plan.prepared.count], [['memorize-spell'], [4, 3, 2], null, 2, 2]);
  for (const id of ['fireball', 'lightning-bolt', 'counterspell', 'hypnotic-pattern', 'dispel-magic', 'speak-with-dead', 'tiny-hut']) assertTrue(plan.spellbook.from.includes(id), id);
  assertEqual(plan.savant.count, 1, 'one free Evocation spell for a new level of spell slots');
  assertTrue(['fireball', 'lightning-bolt', 'tiny-hut'].every((id) => plan.savant.from.includes(id)) && !plan.savant.from.includes('counterspell'), plan.savant.from.join());
  assertEqual(levelUp.levelUpProblems(game), ['Choose 1 more Evocation spell.', 'Choose 2 more spellbook spells.', 'Choose 2 more prepared spells.']);
  levelUp.toggleLevelUpSpell(game, 'savant', 'fireball');
  assertTrue(!levelUp.levelUpPlan(game).spellbook.from.includes('fireball'), 'not offered twice');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'counterspell');
  levelUp.toggleLevelUpSpell(game, 'spellbook', 'hypnotic-pattern');
  levelUp.toggleLevelUpSpell(game, 'prepared', 'fireball');
  levelUp.toggleLevelUpSpell(game, 'prepared', 'counterspell');
  assertEqual(levelUp.levelUpProblems(game), []);
  levelUp.finishLevelUp(game);
  const hero = game.character;
  assertEqual([hero.spells.prepared.length, slotsAt(hero, 3), spellcasting(hero).saveDc.value], [9, 2, 15], 'Int 19 (+4) and Proficiency +3');
  assertTrue(canCastSpell(hero, 'fireball') && canCastSpell(hero, 'counterspell') && !canCastSpell(hero, 'hypnotic-pattern'), 'Hypnotic Pattern is in the book, not prepared');
  assertEqual(validateCharacter(hero), []);
});

test('Cleric 5: Mass Healing Word and Revivify always prepared, two more prepared, level 3 slots and Sear Undead', () => {
  const game = gameFor(posy4, 6500);
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, 'fixed');
  const plan = levelUp.levelUpPlan(game);
  assertEqual([plan.features.map((f) => f.id), plan.slots.after, plan.prepared.count, plan.cantrips], [['sear-undead'], [4, 3, 2], 2, null]);
  assertTrue(['spirit-guardians', 'dispel-magic', 'speak-with-dead'].every((id) => plan.prepared.from.includes(id)), 'level 3 Cleric spells');
  assertTrue(!plan.prepared.from.includes('mass-healing-word') && !plan.prepared.from.includes('revivify'), 'the Life Domain gives those');
  assertEqual(plan.domainSpells.map((d) => [d.spell.id, d.source]), [['mass-healing-word', 'Life Domain'], ['revivify', 'Life Domain']], 'and the screen says so');
  levelUp.toggleLevelUpSpell(game, 'prepared', 'spirit-guardians');
  levelUp.toggleLevelUpSpell(game, 'prepared', 'dispel-magic');
  levelUp.finishLevelUp(game);
  const hero = game.character;
  assertEqual(domainSpells(hero), ['aid', 'bless', 'cure-wounds', 'lesser-restoration', 'mass-healing-word', 'revivify']);
  assertEqual([hero.spells.prepared.length, slotsAt(hero, 3), featureUsesMax(hero, 'channel-divinity'), hasFeature(hero, 'sear-undead')], [9, 2, 2, true]);
  assertTrue(canCastSpell(hero, 'revivify') && canCastSpell(hero, 'spirit-guardians'));
  assertEqual(validateCharacter(hero), []);
});

test('Rogue 5: Sneak Attack 3d6, Cunning Strike and Uncanny Dodge; a Wood Elf gains Pass without Trace', () => {
  const game = gameFor(sorael4, 6500);
  levelUp.beginLevelUp(game);
  const plan = levelUp.levelUpPlan(game);
  assertEqual(plan.features.map((f) => f.id), ['cunning-strike', 'uncanny-dodge']);
  assertEqual(plan.more, [{ name: 'Sneak Attack', text: '3d6 extra damage (was 2d6).' }]);
  assertEqual(plan.speciesSpells.map((s) => [s.spell.id, s.source]), [['pass-without-trace', 'Wood Elf']]);
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.finishLevelUp(game);
  assertEqual([sneakAttackDice(game.character), freeCastsLeft(game, 'pass-without-trace')], ['3d6', 1]);
  assertEqual(validateCharacter(game.character), []);
});

// ---- Debug ----

test('Debug: lowering from level 5 takes back the level 3 spells', () => {
  const cleric = gameFor(posy4, 6500);
  levelWith(cleric, { prepared: ['spirit-guardians', 'dispel-magic'] });
  levelUp.lowerLevel(cleric, 4);
  assertEqual([cleric.character.spells.prepared.includes('spirit-guardians'), domainSpells(cleric.character).includes('revivify'), cleric.xp], [false, false, 2700]);
  assertEqual(validateCharacter(cleric.character), []);
  const wizard = gameFor(juniper4, 6500);
  levelWith(wizard, { savant: ['fireball'], spellbook: ['counterspell', 'dispel-magic'], prepared: ['fireball', 'counterspell'] });
  levelUp.lowerLevel(wizard, 4);
  assertTrue(!wizard.character.spells.spellbook.some((id) => ['fireball', 'counterspell', 'dispel-magic'].includes(id)) && !wizard.character.spells.prepared.includes('fireball'));
  assertEqual(validateCharacter(wizard.character), []);
});

test('Debug: lowering a level undoes what it gave', () => {
  const game = gameFor(juniper, 300);
  levelWith(game, wizardTwo);
  levelUp.lowerLevel(game, 1);
  const hero = game.character;
  assertEqual([hero.level, hero.spells.spellbook.length, hero.spells.prepared.length, hero.classChoices.scholarSkill, game.xp], [1, 6, 4, undefined, 0]);
  assertEqual(validateCharacter(hero), []);
});

test('Debug: lowering from level 4 takes back the feat, its spells, the new cantrip and Weapon Mastery', () => {
  const wizard = { ...juniper3, level: 4, hitPointRolls: [null, null, null], levelFeats: [{ level: 4, id: 'magic-initiate' }] };
  wizard.magicInitiate = [...juniper.magicInitiate, { source: 'level-4', list: 'druid', ability: 'intelligence', cantrips: ['druidcraft', 'guidance'], spell: 'faerie-fire' }];
  wizard.spells = { ...juniper3.spells, cantrips: [...juniper.spells.cantrips, 'poison-spray'] };
  assertEqual(validateCharacter(wizard), []);
  const game = gameFor(wizard, 2700);
  levelUp.lowerLevel(game, 3);
  assertEqual([game.character.levelFeats, game.character.magicInitiate.length, game.character.spells.cantrips.length], [[], 1, 3]);
  assertEqual(validateCharacter(game.character), []);
  const fighter = gameFor(wren4([{ level: 4, id: 'ability-score-improvement', increases: { strength: 2 } }]), 2700);
  levelUp.lowerLevel(fighter, 3);
  assertEqual([fighter.character.classChoices.weaponMasteries.length, abilityScore(fighter.character, 'strength').value], [3, 17]);
  assertEqual(validateCharacter(fighter.character), []);
});

run(document.getElementById('summary'), document.getElementById('results'));

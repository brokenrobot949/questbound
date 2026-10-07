// Rules checks. Open tests/rules.html through the local server to run them.
// Add checks here whenever rules code changes.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20, peekForcedD20, rollDie, rollDice } from '../js/engine/rules/dice.js';
import { d20Test } from '../js/engine/rules/d20-test.js';
import { abilityCheck } from '../js/engine/rules/ability-check.js';
import {
  abilityModifier,
  abilityScore,
  armorClass,
  characterFeatures,
  checkModifiers,
  darkvision,
  describeCharacter,
  initiative,
  maxHitPoints,
  passivePerception,
  proficiencyBonus,
  resistances,
  savingThrow,
  skillBonus,
  speed,
  spellcasting,
} from '../js/engine/character/sheet.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { classes } from '../data/srd/classes.js';
import { species } from '../data/srd/species.js';
import { backgrounds } from '../data/srd/backgrounds.js';
import { feats } from '../data/srd/feats.js';
import { armor, shield } from '../data/srd/armor.js';
import { pointBuy, standardArray } from '../data/srd/character-creation.js';
import { testHero } from '../data/campaign/test-hero.js';
import { difficultyName, rollLine } from '../js/engine/ui/roll-format.js';
import { parseTags } from '../js/engine/story/tags.js';
import { skills } from '../data/srd/skills.js';
import { abilities } from '../data/srd/abilities.js';
import { advancement } from '../data/srd/advancement.js';

// The first five raw values for the seed 'questbound'. If these ever change, existing
// saves would roll differently after loading, so the RNG algorithm must stay as it is.
const KNOWN_QUESTBOUND_VALUES = [1614782848, 800264413, 564517817, 266011180, 1143897396];

// A legal level 1 Human Fighter (Soldier) for checks: Str 8, Dex 14, Con 12, Int 10, Wis 13,
// Cha 16 after the background's +1s. Pass overrides to change any part.
function makeHero(overrides = {}) {
  return {
    name: 'Test Hero',
    level: 1,
    classId: 'fighter',
    subclassId: null,
    speciesId: 'human',
    size: 'medium',
    speciesChoice: null,
    spellcastingAbility: null,
    backgroundId: 'soldier',
    abilityScoreMethod: 'manual',
    baseAbilityScores: { strength: 7, dexterity: 13, constitution: 11, intelligence: 10, wisdom: 13, charisma: 16 },
    backgroundIncreases: { strength: 1, dexterity: 1, constitution: 1 },
    classSkills: ['persuasion', 'perception'],
    speciesSkills: ['insight'],
    featSkills: [],
    originFeat: 'alert',
    classChoices: { fightingStyle: 'defense' },
    hitPointRolls: [],
    armorId: null,
    shield: false,
    ...overrides,
  };
}

// A legal level 1 High Elf Wizard (Sage): Int 17 and Wis 14 after the background's +2/+1.
function makeWizard(overrides = {}) {
  return makeHero({
    name: 'Test Wizard',
    classId: 'wizard',
    speciesId: 'elf',
    speciesChoice: 'high-elf',
    spellcastingAbility: 'intelligence',
    backgroundId: 'sage',
    abilityScoreMethod: 'standard-array',
    baseAbilityScores: { strength: 8, dexterity: 13, constitution: 14, intelligence: 15, wisdom: 12, charisma: 10 },
    backgroundIncreases: { intelligence: 2, wisdom: 1 },
    classSkills: ['investigation', 'medicine'],
    speciesSkills: ['perception'],
    originFeat: null,
    classChoices: {},
    ...overrides,
  });
}

// ---- Seeded random numbers ----

test('RNG: the same seed gives the same numbers', () => {
  const a = createRng('questbound');
  const b = createRng('questbound');
  for (let i = 0; i < 10; i++) assertEqual(a.nextUint32(), b.nextUint32(), `value ${i}`);
});

test('RNG: different seeds give different numbers', () => {
  const a = createRng('seed-a');
  const b = createRng('seed-b');
  const listA = Array.from({ length: 5 }, () => a.nextUint32());
  const listB = Array.from({ length: 5 }, () => b.nextUint32());
  assertTrue(JSON.stringify(listA) !== JSON.stringify(listB), 'sequences should differ');
});

test('RNG: saving and restoring the state repeats the same rolls', () => {
  const rng = createRng('reload');
  for (let i = 0; i < 5; i++) rollDie(rng, 20);
  const saved = JSON.parse(JSON.stringify(rng.getState()));
  const firstTime = Array.from({ length: 10 }, () => rollDie(rng, 20));
  rng.setState(saved);
  const afterReload = Array.from({ length: 10 }, () => rollDie(rng, 20));
  assertEqual(afterReload, firstTime);
});

test('RNG: the algorithm has not changed (old saves would roll differently)', () => {
  const rng = createRng('questbound');
  const values = Array.from({ length: 5 }, () => rng.nextUint32());
  assertEqual(values, KNOWN_QUESTBOUND_VALUES);
});

test('RNG: nextInt stays in range and refuses bad sizes', () => {
  const rng = createRng('range');
  for (let i = 0; i < 1000; i++) {
    const v = rng.nextInt(7);
    assertTrue(Number.isInteger(v) && v >= 0 && v < 7, `out of range: ${v}`);
  }
  assertThrows(() => rng.nextInt(0));
  assertThrows(() => rng.nextInt(2.5));
});

test('RNG: a d20 is fair over 20,000 rolls (chi-square test)', () => {
  const rng = createRng('fairness');
  const counts = new Array(21).fill(0);
  const rolls = 20000;
  for (let i = 0; i < rolls; i++) counts[rollDie(rng, 20)] += 1;
  const expected = rolls / 20;
  let chiSquare = 0;
  for (let face = 1; face <= 20; face++) {
    assertTrue(counts[face] > 0, `face ${face} never came up`);
    chiSquare += (counts[face] - expected) ** 2 / expected;
  }
  // 43.82 is the 0.1% cut-off for 19 degrees of freedom.
  assertTrue(chiSquare < 43.82, `chi-square ${chiSquare.toFixed(2)} is too high`);
});

// ---- Dice ----

test('Dice: each die size stays within 1 to its number of sides', () => {
  const rng = createRng('dice');
  for (const sides of [4, 6, 8, 10, 12, 20, 100]) {
    const seen = new Set();
    for (let i = 0; i < 2000; i++) {
      const v = rollDie(rng, sides);
      assertTrue(v >= 1 && v <= sides, `d${sides} rolled ${v}`);
      seen.add(v);
    }
    assertTrue(seen.has(1) && seen.has(sides), `d${sides} never rolled 1 or ${sides}`);
  }
});

test('Dice: 2d6 reports each die and the total', () => {
  const result = rollDice(scriptedRng([3, 5]), 2, 6);
  assertEqual(result, { count: 2, sides: 6, rolls: [3, 5], total: 8 });
});

test('Dice: bad dice are refused', () => {
  const rng = createRng('bad');
  assertThrows(() => rollDie(rng, 0));
  assertThrows(() => rollDice(rng, 0, 6));
});

// ---- Ability modifiers and proficiency (SRD 5.2.1 tables) ----

test('Ability modifiers match the SRD table for scores 1 to 30', () => {
  const table = [
    [1, -5], [2, -4], [3, -4], [4, -3], [5, -3], [6, -2], [7, -2], [8, -1], [9, -1],
    [10, 0], [11, 0], [12, 1], [13, 1], [14, 2], [15, 2], [16, 3], [17, 3], [18, 4],
    [19, 4], [20, 5], [21, 5], [22, 6], [23, 6], [24, 7], [25, 7], [26, 8], [27, 8],
    [28, 9], [29, 9], [30, 10],
  ];
  for (const [score, mod] of table) assertEqual(abilityModifier(score), mod, `score ${score}`);
});

test('Proficiency bonus by level: +2 at 1-4, +3 at 5-8, +4 at 9-12, +5 at 13-16, +6 at 17-20', () => {
  for (let level = 1; level <= 20; level++) {
    const expected = 2 + Math.floor((level - 1) / 4);
    assertEqual(proficiencyBonus(level), expected, `level ${level}`);
  }
  assertThrows(() => proficiencyBonus(21));
});

test('XP thresholds match the SRD (300 for level 2, 6,500 for 5, 64,000 for 10, 355,000 for 20)', () => {
  const xp = (level) => advancement.find((r) => r.level === level).xp;
  assertEqual([xp(1), xp(2), xp(5), xp(10), xp(20)], [0, 300, 6500, 64000, 355000]);
  for (let i = 1; i < advancement.length; i++) {
    assertTrue(advancement[i].xp > advancement[i - 1].xp, `level ${i + 1} XP should rise`);
  }
});

test('Skills: all 18 use a real ability, and Persuasion uses Charisma', () => {
  assertEqual(skills.length, 18);
  const abilityIds = abilities.map((a) => a.id);
  for (const s of skills) assertTrue(abilityIds.includes(s.ability), `${s.id} uses ${s.ability}`);
  assertEqual(skills.find((s) => s.id === 'persuasion').ability, 'charisma');
});

// ---- d20 tests ----

const plusFive = [
  { label: 'Cha', value: 3, source: 'Charisma 16' },
  { label: 'Proficiency', value: 2, source: 'Proficient' },
];

test('d20 test: one die plus every modifier gives the total', () => {
  const r = d20Test({ rng: scriptedRng([12]), kind: 'check', modifiers: plusFive, target: { type: 'DC', value: 15 } });
  assertEqual([r.dice, r.natural, r.modifierTotal, r.total, r.mode], [[12], 12, 5, 17, 'normal']);
});

test('d20 test: meeting the DC succeeds, one short fails', () => {
  const hit = d20Test({ rng: scriptedRng([10]), kind: 'check', modifiers: plusFive, target: { type: 'DC', value: 15 } });
  const miss = d20Test({ rng: scriptedRng([9]), kind: 'check', modifiers: plusFive, target: { type: 'DC', value: 15 } });
  assertEqual([hit.success, hit.outcome, miss.success, miss.outcome], [true, 'success', false, 'failure']);
});

test('d20 test: Advantage rolls two dice and keeps the higher', () => {
  const r = d20Test({ rng: scriptedRng([6, 15]), kind: 'check', advantage: ['Help action'] });
  assertEqual([r.mode, r.dice, r.keptIndex, r.natural], ['advantage', [6, 15], 1, 15]);
});

test('d20 test: Disadvantage rolls two dice and keeps the lower', () => {
  const r = d20Test({ rng: scriptedRng([18, 3]), kind: 'check', disadvantage: ['Poisoned'] });
  assertEqual([r.mode, r.dice, r.natural], ['disadvantage', [18, 3], 3]);
});

test('d20 test: Advantage and Disadvantage cancel, so one die is rolled', () => {
  const rng = scriptedRng([11]);
  const r = d20Test({ rng, kind: 'check', advantage: ['Help', 'Inspired'], disadvantage: ['Poisoned'] });
  assertEqual([r.mode, r.dice, rng.remaining()], ['normal', [11], 0]);
});

test('d20 test: several sources of Advantage still roll only two dice', () => {
  const rng = scriptedRng([4, 9]);
  const r = d20Test({ rng, kind: 'check', advantage: ['Help', 'Hidden', 'Flanking'] });
  assertEqual([r.dice.length, rng.remaining()], [2, 0]);
});

test('Ability check: a natural 20 is not an automatic success', () => {
  const r = d20Test({ rng: scriptedRng([20]), kind: 'check', target: { type: 'DC', value: 25 } });
  assertEqual([r.success, r.automatic], [false, null]);
});

test('Ability check: a natural 1 is not an automatic failure', () => {
  const mods = [{ label: 'Bonus', value: 10, source: 'test' }];
  const r = d20Test({ rng: scriptedRng([1]), kind: 'check', modifiers: mods, target: { type: 'DC', value: 10 } });
  assertEqual(r.success, true);
});

test('Attack roll: a natural 20 hits whatever the AC, as a Critical Hit', () => {
  const r = d20Test({ rng: scriptedRng([20]), kind: 'attack', target: { type: 'AC', value: 30 } });
  assertEqual([r.success, r.outcome, r.criticalHit], [true, 'hit', true]);
});

test('Attack roll: a natural 1 misses whatever the bonus', () => {
  const mods = [{ label: 'Bonus', value: 20, source: 'test' }];
  const r = d20Test({ rng: scriptedRng([1]), kind: 'attack', modifiers: mods, target: { type: 'AC', value: 5 } });
  assertEqual([r.success, r.outcome, r.automatic], [false, 'miss', 'natural 1']);
});

test('Saving throw: reports success or failure', () => {
  const r = d20Test({ rng: scriptedRng([8]), kind: 'save', target: { type: 'DC', value: 13 } });
  assertEqual(r.outcome, 'failure');
  assertThrows(() => d20Test({ rng: scriptedRng([8]), kind: 'guess' }));
});

// ---- Ability checks from the character sheet ----

test('Ability check: proficient Persuasion adds Charisma and Proficiency, with sources', () => {
  const r = abilityCheck({ rng: scriptedRng([14]), character: makeHero(), testId: 'persuasion', dc: 15 });
  assertEqual(
    r.modifiers.map((m) => [m.label, m.value]),
    [['Cha', 3], ['Proficiency', 2]],
  );
  assertEqual(r.modifiers[0].source, 'Charisma 16');
  assertEqual([r.total, r.success, r.label, r.skill, r.ability], [19, true, 'Persuasion check', 'persuasion', 'charisma']);
});

test('Ability check: without proficiency only the ability modifier is added', () => {
  const r = checkModifiers(makeHero(), 'sleight-of-hand');
  assertEqual(r.modifiers.map((m) => [m.label, m.value]), [['Dex', 2]]);
});

test("Ability check: Expertise (the Wizard's Scholar, from level 2) doubles the Proficiency Bonus", () => {
  const wizard = makeWizard({ level: 2, classChoices: { scholarSkill: 'arcana' } });
  const r = checkModifiers(wizard, 'arcana');
  assertEqual(r.modifiers.map((m) => [m.label, m.value]), [['Int', 3], ['Expertise', 4]]);
  assertEqual(checkModifiers(makeWizard({ classChoices: { scholarSkill: 'arcana' } }), 'arcana').total, 5, 'not before level 2');
});

test('Ability check: a plain ability check uses only the ability', () => {
  const r = checkModifiers(makeHero(), 'wisdom');
  assertEqual([r.skill, r.modifiers.map((m) => [m.label, m.value])], [null, [['Wis', 1]]]);
});

test('Ability check: proficiency grows with level (+3 at level 5)', () => {
  const r = checkModifiers(makeHero({ level: 5 }), 'persuasion');
  assertEqual(r.total, 6);
});

test('Ability check: unknown skills and bad DCs are refused', () => {
  assertThrows(() => abilityCheck({ rng: scriptedRng([10]), character: makeHero(), testId: 'juggling', dc: 10 }));
  assertThrows(() => abilityCheck({ rng: scriptedRng([10]), character: makeHero(), testId: 'persuasion', dc: '15' }));
});

// ---- How rolls are shown ----

test('Difficulty names follow the SRD ladder', () => {
  const names = [3, 5, 10, 15, 17, 20, 25, 30].map(difficultyName);
  assertEqual(names, ['Very Easy', 'Very Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Very Hard', 'Nearly Impossible']);
});

test('Roll line matches the design doc example', () => {
  const r = d20Test({ rng: scriptedRng([14]), kind: 'check', modifiers: plusFive, target: { type: 'DC', value: 20 } });
  assertEqual(rollLine(r), 'd20 (14) + Cha 3 + Proficiency 2 = 19 vs DC 20 — failure');
});

test('Roll line shows both dice and negative modifiers', () => {
  const mods = [{ label: 'Str', value: -1, source: 'Strength 8' }];
  const r = d20Test({ rng: scriptedRng([6, 15]), kind: 'check', modifiers: mods, advantage: ['Help'], target: { type: 'DC', value: 10 } });
  assertEqual(rollLine(r), 'd20 with advantage (6 and 15, keep 15) − Str 1 = 14 vs DC 10 — success');
});

test('Roll line names a Critical Hit', () => {
  const r = d20Test({ rng: scriptedRng([20]), kind: 'attack', target: { type: 'AC', value: 15 } });
  assertEqual(rollLine(r), 'd20 (20) = 20 vs AC 15 — critical hit');
});

test('Ink tags: #check:persuasion:15 is a Persuasion check against DC 15; #location sets the place', () => {
  assertEqual(parseTags(['check:persuasion:15']), { check: { testId: 'persuasion', dc: 15 }, location: null });
  assertEqual(parseTags(['location: Bramblegate, north gate']).location, 'Bramblegate, north gate');
  assertEqual(parseTags(null), { check: null, location: null });
});

// ---- Debug mode: forcing the next d20 ----

test('Debug: a forced d20 shows the chosen face once, marked as forced', () => {
  forceNextD20(20);
  const rng = createRng('forced');
  const forced = d20Test({ rng, kind: 'check', target: { type: 'DC', value: 15 } });
  const next = d20Test({ rng, kind: 'check', target: { type: 'DC', value: 15 } });
  assertEqual([forced.natural, forced.forced, next.forced, peekForcedD20()], [20, true, false, null]);
});

test('Debug: forcing a d20 leaves the rest of the dice unchanged', () => {
  const plain = createRng('same-dice');
  const forcedRng = createRng('same-dice');
  d20Test({ rng: plain, kind: 'check' });
  forceNextD20(1);
  d20Test({ rng: forcedRng, kind: 'check' });
  assertEqual(forcedRng.getState(), plain.getState(), 'the RNG should move on exactly as it would have');
});

test('Debug: a forced d20 with Advantage lands both dice on the chosen face', () => {
  forceNextD20(7);
  const r = d20Test({ rng: createRng('adv'), kind: 'check', advantage: ['Help'] });
  assertEqual([r.dice, r.natural], [[7, 7], 7]);
});

test('Debug: only faces 1 to 20 can be forced, and the roll line says "forced"', () => {
  assertThrows(() => forceNextD20(0));
  assertThrows(() => forceNextD20(21));
  forceNextD20(12);
  const r = d20Test({ rng: createRng('line'), kind: 'check', modifiers: plusFive, target: { type: 'DC', value: 15 } });
  assertEqual(rollLine(r), 'd20 (12, forced) + Cha 3 + Proficiency 2 = 17 vs DC 15 — success');
});

// ---- Rules data (SRD 5.2.1) ----

const SKILL_IDS = skills.map((s) => s.id);
const ABILITY_IDS = abilities.map((a) => a.id);

test('Data: classes, species and backgrounds only name real skills, abilities and feats', () => {
  for (const c of classes) {
    for (const s of c.skillChoices.from) assertTrue(SKILL_IDS.includes(s), `${c.id} lists unknown skill ${s}`);
    for (const a of [...c.savingThrows, ...c.primaryAbilities]) assertTrue(ABILITY_IDS.includes(a), `${c.id}: ${a}`);
    assertEqual(Object.values(c.standardArray).sort((x, y) => y - x), standardArray, `${c.id} standard array`);
    for (const row of c.levels) for (const f of row.features) assertTrue(f in c.features, `${c.id} level ${row.level}: ${f}`);
  }
  for (const b of backgrounds) {
    assertEqual(b.abilities.length, 3, `${b.id} lists three abilities`);
    for (const s of b.skills) assertTrue(SKILL_IDS.includes(s), `${b.id}: ${s}`);
    assertTrue(feats.some((f) => f.id === b.feat.id && f.category === 'origin'), `${b.id} feat ${b.feat.id}`);
  }
  assertEqual(species.map((s) => s.id), ['dragonborn', 'dwarf', 'elf', 'gnome', 'goliath', 'halfling', 'human', 'orc', 'tiefling']);
});

test('Data: class numbers match the SRD tables', () => {
  const fighter = classes.find((c) => c.id === 'fighter');
  const wizard = classes.find((c) => c.id === 'wizard');
  assertEqual([fighter.hitDie, fighter.hitPointsAtLevel1, fighter.hitPointsPerLevel, fighter.savingThrows], [10, 10, 6, ['strength', 'constitution']]);
  assertEqual([wizard.hitDie, wizard.hitPointsAtLevel1, wizard.hitPointsPerLevel, wizard.savingThrows], [6, 6, 4, ['intelligence', 'wisdom']]);
  assertEqual(wizard.levels.map((r) => [r.cantrips, r.preparedSpells, r.slots]), [[3, 4, [2]], [3, 5, [3]], [3, 6, [4, 2]]]);
  assertEqual(fighter.levels.map((r) => r.secondWindUses), [2, 2, 2]);
});

test('Data: the armour table matches the SRD', () => {
  const a = (id) => armor.find((x) => x.id === id);
  assertEqual([a('leather-armor').baseAc, a('leather-armor').dexCap], [11, null]);
  assertEqual([a('half-plate-armor').baseAc, a('half-plate-armor').dexCap, a('half-plate-armor').stealthDisadvantage], [15, 2, true]);
  assertEqual([a('chain-mail').baseAc, a('chain-mail').strength, a('chain-mail').cost], [16, 13, 75]);
  assertEqual([a('plate-armor').baseAc, a('plate-armor').strength, a('plate-armor').cost], [18, 15, 1500]);
  assertEqual(shield.acBonus, 2);
});

// ---- Character creation rules ----

test('Creation: the test heroes are legal characters', () => {
  assertEqual(validateCharacter(testHero), []);
  assertEqual(validateCharacter(makeHero()), []);
  assertEqual(validateCharacter(makeWizard()), []);
});

test('Creation: the Standard Array must use each score once', () => {
  const wrong = makeHero({
    abilityScoreMethod: 'standard-array',
    baseAbilityScores: { strength: 15, dexterity: 15, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 },
  });
  assertEqual(validateCharacter(wrong).length, 1);
});

test('Creation: Point Cost scores are 8 to 15 and cost at most 27 points', () => {
  const scores = (s) => ({ strength: s[0], dexterity: s[1], constitution: s[2], intelligence: s[3], wisdom: s[4], charisma: s[5] });
  const legal = makeHero({ abilityScoreMethod: 'point-buy', baseAbilityScores: scores([15, 15, 15, 8, 8, 8]) });
  assertEqual(validateCharacter(legal), [], '9 + 9 + 9 = 27 points');
  const tooDear = makeHero({ abilityScoreMethod: 'point-buy', baseAbilityScores: scores([15, 15, 15, 9, 8, 8]) });
  assertEqual(validateCharacter(tooDear).length, 1);
  assertEqual([pointBuy.costs[12], pointBuy.costs[13], pointBuy.costs[14], pointBuy.costs[15]], [4, 5, 7, 9]);
});

test("Creation: background increases are +2/+1 or +1/+1/+1, to the background's abilities, up to 20", () => {
  assertEqual(validateCharacter(makeHero({ backgroundIncreases: { strength: 2, dexterity: 1 } })), []);
  assertEqual(validateCharacter(makeHero({ backgroundIncreases: { strength: 2, charisma: 1 } })).length, 1, 'Charisma is not a Soldier ability');
  assertEqual(validateCharacter(makeHero({ backgroundIncreases: { strength: 3 } })).length, 1, 'not a legal pattern');
  const base = makeHero().baseAbilityScores;
  const high = makeHero({ baseAbilityScores: { ...base, strength: 18 }, backgroundIncreases: { strength: 2, dexterity: 1 } });
  assertEqual(validateCharacter(high), []);
  const over = makeHero({ baseAbilityScores: { ...base, dexterity: 19 }, backgroundIncreases: { strength: 1, dexterity: 2 } });
  assertTrue(validateCharacter(over).some((p) => p.includes('above 20')));
});

test('Creation: skills, species choices and Fighting Style must be legal', () => {
  assertTrue(validateCharacter(makeHero({ classSkills: ['persuasion'] })).length > 0, 'two class skills needed');
  assertTrue(validateCharacter(makeHero({ classSkills: ['persuasion', 'arcana'] })).length > 0, 'Arcana is not a Fighter skill');
  assertTrue(validateCharacter(makeWizard({ speciesChoice: null })).length > 0, 'an Elf needs a lineage');
  assertTrue(validateCharacter(makeWizard({ speciesSkills: ['arcana'] })).length > 0, 'Keen Senses is Insight, Perception or Survival');
  assertTrue(validateCharacter(makeHero({ classChoices: {} })).length > 0, 'a Fighter needs a Fighting Style');
  assertTrue(validateCharacter(makeHero({ classId: 'bard' })).length > 0, 'unknown class');
});

// ---- The character sheet ----

test("Sheet: Wren (Human Fighter, Soldier) has the SRD's numbers", () => {
  assertEqual(describeCharacter(testHero), 'Human Fighter 1');
  assertEqual(['strength', 'constitution', 'charisma'].map((a) => abilityScore(testHero, a).value), [17, 15, 13]);
  assertEqual(maxHitPoints(testHero).value, 12, 'Fighter 10 + Con 2');
  assertEqual(armorClass(testHero).value, 17, 'Chain Mail 16 + Defense 1');
  assertEqual(initiative(testHero).value, 3, 'Dex 1 + Alert proficiency 2');
  assertEqual([savingThrow(testHero, 'strength').value, savingThrow(testHero, 'dexterity').value], [5, 1]);
  const bonuses = ['athletics', 'persuasion', 'insight'].map((s) => skillBonus(testHero, s).value);
  assertEqual(bonuses, [5, 3, 2]);
  assertEqual([passivePerception(testHero).value, speed(testHero).value, darkvision(testHero)], [12, 30, 0]);
  assertEqual(spellcasting(testHero), null);
});

test('Sheet: Hit Points use the fixed value or the roll at each level, and at least 1', () => {
  assertEqual(maxHitPoints({ ...testHero, level: 3 }).value, 12 + 8 + 8, 'fixed 6 + Con 2 at levels 2 and 3');
  assertEqual(maxHitPoints({ ...testHero, level: 3, hitPointRolls: [10, 1] }).value, 12 + 12 + 3);
  const frailScores = { ...makeWizard().baseAbilityScores, constitution: 3 };
  const frail = makeWizard({ abilityScoreMethod: 'manual', baseAbilityScores: frailScores, level: 2, hitPointRolls: [1] });
  assertEqual(maxHitPoints(frail).value, 6 - 4 + 1, 'Con −4: level 1 gives 2, level 2 gives at least 1');
});

test('Sheet: a Wizard casts with Intelligence, with the SRD slots and spellbook', () => {
  const casting = spellcasting(makeWizard({ level: 3 }));
  assertEqual([casting.saveDc.value, casting.attackBonus.value], [13, 5], 'DC 8 + Int 3 + 2; attack Int 3 + 2');
  assertEqual([casting.cantrips, casting.preparedSpells, casting.slots, casting.spellbookSize], [3, 6, [4, 2], 10]);
  assertEqual(armorClass(makeWizard()).value, 11, 'unarmoured: 10 + Dex 1');
  assertEqual(maxHitPoints(makeWizard()).value, 8, 'Wizard 6 + Con 2');
  assertEqual(darkvision(makeWizard()), 60);
});

test('Sheet: species traits change speed, darkvision, Hit Points and resistances', () => {
  const nonHuman = { speciesSkills: [], originFeat: null };
  assertEqual(speed(makeWizard({ speciesChoice: 'wood-elf' })).value, 35);
  assertEqual(darkvision(makeWizard({ speciesChoice: 'drow' })), 120);
  const dwarf = makeHero({ ...nonHuman, speciesId: 'dwarf', level: 2 });
  assertEqual(maxHitPoints(dwarf).value, 11 + 7 + 2, 'Fighter 10+1, fixed 6+1, plus Dwarven Toughness 1 per level');
  assertEqual(resistances(dwarf), ['poison']);
  assertEqual(resistances(makeHero({ ...nonHuman, speciesId: 'dragonborn', speciesChoice: 'silver' })), ['cold']);
  const tiefling = makeHero({ ...nonHuman, speciesId: 'tiefling', speciesChoice: 'infernal', spellcastingAbility: 'charisma' });
  assertEqual(resistances(tiefling), ['fire']);
  assertEqual(speed(makeHero({ ...nonHuman, speciesId: 'goliath', speciesChoice: 'stone' })).value, 35);
});

test('Sheet: armour rules (Dex cap, Shield, Defense only in armour, heavy armour Strength)', () => {
  const nimble = makeHero({ baseAbilityScores: { ...makeHero().baseAbilityScores, dexterity: 17 } });
  assertEqual(armorClass({ ...nimble, armorId: 'half-plate-armor' }).value, 15 + 2 + 1, 'Dex +4 capped at +2, Defense +1');
  assertEqual(armorClass({ ...nimble, armorId: 'leather-armor', shield: true }).value, 11 + 4 + 2 + 1);
  assertEqual(armorClass({ ...nimble, armorId: null }).value, 10 + 4, 'Defense needs armour');
  assertEqual(speed({ ...makeHero(), armorId: 'chain-mail' }).value, 20, "Str 8 is below Chain Mail's 13");
  assertEqual(speed(testHero).value, 30, 'Str 17 is enough');
});

test('Sheet: features come with level, subclass and species', () => {
  const names = (c) => characterFeatures(c).map((f) => f.name);
  assertTrue(names(testHero).includes('Second Wind') && !names(testHero).includes('Action Surge'));
  const champion = { ...testHero, level: 3, subclassId: 'champion' };
  assertTrue(names(champion).includes('Action Surge') && names(champion).includes('Improved Critical'));
  const dragonborn = makeHero({ speciesId: 'dragonborn', speciesChoice: 'red', speciesSkills: [], originFeat: null, level: 3 });
  assertTrue(names(dragonborn).includes('Breath Weapon') && !names(dragonborn).includes('Draconic Flight'), 'Draconic Flight waits for level 5');
  assertTrue(names(makeWizard({ level: 3, subclassId: 'evoker' })).includes('Potent Cantrip'));
});

test('Sheet: every number adds up from its parts, so tapping it can show the maths', () => {
  const heroes = [testHero, { ...testHero, level: 3, hitPointRolls: [9] }, makeWizard({ level: 3 }), makeWizard({ speciesChoice: 'wood-elf' })];
  for (const hero of heroes) {
    const values = [
      maxHitPoints(hero),
      armorClass(hero),
      initiative(hero),
      passivePerception(hero),
      speed(hero),
      savingThrow(hero, 'wisdom'),
      skillBonus(hero, 'stealth'),
    ];
    for (const v of values) assertEqual(v.parts.reduce((sum, p) => sum + p.value, 0), v.value);
  }
});

run(document.getElementById('summary'), document.getElementById('results'));

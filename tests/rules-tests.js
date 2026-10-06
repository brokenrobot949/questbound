// Rules checks. Open tests/rules.html through the local server to run them.
// Add checks here whenever rules code changes.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { rollDie, rollDice } from '../js/engine/rules/dice.js';
import { d20Test } from '../js/engine/rules/d20-test.js';
import { abilityCheck } from '../js/engine/rules/ability-check.js';
import { abilityModifier, proficiencyBonus, checkModifiers } from '../js/engine/character/sheet.js';
import { difficultyName, rollLine } from '../js/engine/ui/roll-format.js';
import { parseChoiceTags } from '../js/engine/story/tags.js';
import { skills } from '../data/srd/skills.js';
import { abilities } from '../data/srd/abilities.js';
import { advancement } from '../data/srd/advancement.js';

// The first five raw values for the seed 'questbound'. If these ever change, existing
// saves would roll differently after loading, so the RNG algorithm must stay as it is.
const KNOWN_QUESTBOUND_VALUES = [1614782848, 800264413, 564517817, 266011180, 1143897396];

// A plain level 1 hero for checks; pass overrides to change any part.
function makeHero(overrides = {}) {
  return {
    name: 'Test Hero',
    level: 1,
    baseAbilityScores: {
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 10,
      wisdom: 13,
      charisma: 16,
    },
    skillProficiencies: ['persuasion'],
    expertise: [],
    ...overrides,
  };
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
  const r = checkModifiers(makeHero(), 'athletics');
  assertEqual(r.modifiers.map((m) => [m.label, m.value]), [['Str', -1]]);
});

test('Ability check: Expertise doubles the Proficiency Bonus', () => {
  const hero = makeHero({ skillProficiencies: ['stealth'], expertise: ['stealth'] });
  const r = checkModifiers(hero, 'stealth');
  assertEqual(r.modifiers.map((m) => [m.label, m.value]), [['Dex', 2], ['Expertise', 4]]);
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

test('Ink choice tags: #check:persuasion:15 is read as a Persuasion check against DC 15', () => {
  assertEqual(parseChoiceTags(['check:persuasion:15']), { check: { testId: 'persuasion', dc: 15 } });
  assertEqual(parseChoiceTags(null), { check: null });
});

run(document.getElementById('summary'), document.getElementById('results'));

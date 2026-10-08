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
import { quickStartHeroes } from '../data/campaign/quick-start.js';
import { nameTables } from '../data/campaign/names.js';
import * as creation from '../js/engine/character/creation.js';
import { buyItem, costInCopper, moneyText, startingInventory } from '../js/engine/character/inventory.js';
import { canCastSpell, findSpell, magicInitiateLists, spellGroups, spellNumbers, spellsOnList } from '../js/engine/character/spells.js';
import { spells } from '../data/srd/spells.js';
import { defaultLook, heroSprite, lookProblems, rollLook } from '../js/engine/character/look.js';
import * as spriteParts from '../data/campaign/hero-sprite.js';
import { hairStyles, headgear as headgearOptions, speciesLooks } from '../data/campaign/hero-looks.js';
import { difficultyName, rollLine } from '../js/engine/ui/roll-format.js';
import { parseTags } from '../js/engine/story/tags.js';
import { skills } from '../data/srd/skills.js';
import { abilities } from '../data/srd/abilities.js';
import { advancement } from '../data/srd/advancement.js';

// The first five raw values for the seed 'questbound'. If these ever change, existing
// saves would roll differently after loading, so the RNG algorithm must stay as it is.
const KNOWN_QUESTBOUND_VALUES = [1614782848, 800264413, 564517817, 266011180, 1143897396];

// Wren Ashdown, the Quick Start Fighter: a Human Fighter (Soldier) in Chain Mail.
const testHero = quickStartHeroes.find((h) => h.id === 'wren').character;

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
    drive: 'glory',
    bond: { type: 'rival', name: 'Test Rival' },
    startingEquipment: { class: 'B', background: 'B' }, // every class and background has an option B
    spells: null,
    magicInitiate: [],
    look: { skin: 'peach', hairStyle: 'tousled', hairColor: 'brown', beard: false, outfit: 'red', accent: 'brown', headgear: 'none' },
    hitPointRolls: [],
    armorId: null,
    shield: false,
    ...overrides,
  };
}

// A legal level 1 High Elf Wizard (Sage): Int 17 and Wis 14 after the background's +2/+1.
// Knows Prestidigitation from being a High Elf, and has the Sage's Magic Initiate (Wizard).
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
    spells: {
      cantrips: ['fire-bolt', 'light', 'mage-hand'],
      spellbook: ['burning-hands', 'comprehend-languages', 'mage-armor', 'magic-missile', 'shield', 'sleep'],
      prepared: ['mage-armor', 'magic-missile', 'shield', 'sleep'],
    },
    magicInitiate: [{ source: 'background', list: 'wizard', ability: 'intelligence', cantrips: ['minor-illusion', 'ray-of-frost'], spell: 'false-life' }],
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

test('Attack roll: with Improved Critical a natural 19 is a Critical Hit too, but only then', () => {
  const champion = d20Test({ rng: scriptedRng([19]), kind: 'attack', target: { type: 'AC', value: 30 }, criticalOn: 19 });
  assertEqual([champion.success, champion.criticalHit, champion.automatic], [true, true, 'natural 19']);
  const anyone = d20Test({ rng: scriptedRng([19]), kind: 'attack', target: { type: 'AC', value: 30 } });
  assertEqual([anyone.success, anyone.criticalHit], [false, false]);
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
  const none = { check: null, spell: null, location: null, time: null, drive: null, buy: null, combat: null, go: null, room: null };
  assertEqual(parseTags(['check:persuasion:15']), { ...none, check: { testId: 'persuasion', dc: 15 } });
  assertEqual(parseTags(['spell:light']).spell, 'light');
  assertEqual(parseTags(['location: Bramblegate, north gate']).location, 'Bramblegate, north gate');
  assertEqual(parseTags(['time:Dusk', 'drive:wealth', 'buy:torch']), { ...none, time: 'Dusk', drive: 'wealth', buy: 'torch' });
  assertEqual(parseTags(null), none);
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

test('Creation: the Quick Start and test heroes are legal characters', () => {
  for (const hero of quickStartHeroes) assertEqual(validateCharacter(hero.character), [], hero.id);
  assertEqual(validateCharacter(makeHero()), []);
  assertEqual(validateCharacter(makeWizard()), []);
});

test('Creation: a hero needs a Drive, a named Bond and a starting equipment choice', () => {
  assertTrue(validateCharacter(makeHero({ drive: 'boredom' })).some((p) => p.includes('Drive')));
  assertTrue(validateCharacter(makeHero({ bond: { type: 'sibling', name: '  ' } })).some((p) => p.includes('Name your Bond')));
  assertTrue(validateCharacter(makeHero({ bond: { type: 'cousin', name: 'Ada' } })).some((p) => p.includes('Choose a Bond')));
  assertTrue(validateCharacter(makeWizard({ startingEquipment: { class: 'C', background: 'A' } })).length > 0, 'the Wizard has no option C');
  assertTrue(validateCharacter(makeHero({ name: 'x'.repeat(41) })).some((p) => p.includes('up to 40')));
});

test('Money: prices count in copper, and show as gold, silver and copper', () => {
  assertEqual([costInCopper({ gp: 50 }), costInCopper({ sp: 5 }), costInCopper({ cp: 1 }), costInCopper(75)], [5000, 50, 1, 7500]);
  assertEqual([moneyText(1800), moneyText(1855), moneyText(7), moneyText(0)], ['18 GP', '18 GP, 5 SP, 5 CP', '7 CP', 'no money']);
});

test('Pack: a hero starts with their kits, buying takes the price, and nobody buys on credit', () => {
  const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;
  const start = startingInventory(juniper);
  assertEqual(start.money, 1300, 'Wizard kit A 5 GP and Sage kit A 8 GP');
  assertTrue(start.inventory.some((e) => e.id === 'spellbook') && start.inventory.some((e) => e.id === 'quarterstaff' && e.quantity === 2), 'both kits’ staves stack');
  const game = { money: 5050, inventory: [] };
  buyItem(game, 'potion-of-healing');
  assertEqual([game.money, game.inventory], [50, [{ id: 'potion-of-healing', quantity: 1 }]]);
  assertThrows(() => buyItem(game, 'potion-of-healing'));
  assertEqual(game.money, 50, 'a refused purchase costs nothing');
  assertThrows(() => buyItem(game, 'spellbook'), 'a spellbook is not for sale');
});

test('Data: every item in the starting kits is in the equipment data', () => {
  const kits = [...classes.flatMap((c) => c.startingEquipment), ...backgrounds.flatMap((b) => b.equipment)];
  for (const kit of kits) for (const { id } of kit.items) assertTrue(creation.findItem(id) !== null, `unknown item ${id}`);
  for (const b of backgrounds) assertTrue(creation.findItem(b.tool) !== null, `${b.id} tool ${b.tool}`);
  assertEqual(['greatsword', 'javelin', 'dungeoneers-pack'].map((id) => creation.findItem(id).cost), [{ gp: 50 }, { sp: 5 }, { gp: 12 }]);
});

// Object keys sorted, so two heroes built in a different order compare equal.
function sortedKeys(value) {
  if (Array.isArray(value)) return value.map(sortedKeys);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortedKeys(value[k])]));
  return value;
}

test('Creation: building Wren step by step gives the Quick Start hero', () => {
  let d = creation.emptyDraft();
  d = creation.chooseFightingStyle(creation.chooseClass(d, 'fighter'), 'defense');
  d = creation.chooseBackground(d, 'soldier');
  d = creation.chooseOriginFeat(creation.chooseSpecies(d, 'human'), 'alert');
  d = creation.prepareStep(d, 'abilities');
  for (const [id, value] of Object.entries(testHero.baseAbilityScores)) d = creation.assignScore(d, id, value);
  d = creation.setIncrease(creation.setIncrease(creation.setIncrease(d, 'dexterity', 0), 'strength', 2), 'constitution', 1);
  d = creation.toggleSkill(creation.toggleSkill(d, 'class', 'persuasion'), 'class', 'perception');
  d = creation.toggleSkill(d, 'species', 'insight');
  d = creation.setBondName(creation.chooseBond(creation.chooseDrive(creation.setName(d, '  Wren   Ashdown '), 'justice'), 'sibling'), 'Kit Ashdown');
  d = creation.prepareStep(d, 'equipment');
  d = creation.chooseLook(creation.prepareStep(d, 'look'), testHero.look);
  for (const step of creation.CREATION_STEPS) assertEqual(creation.stepProblems(d, step), [], step);
  assertEqual(sortedKeys(creation.finishCharacter(d)), sortedKeys(testHero));
});

test('Creation: each step says what it still needs', () => {
  const d = creation.emptyDraft();
  assertEqual(creation.stepProblems(d, 'class'), ['Choose a class.']);
  assertEqual(creation.stepProblems(creation.chooseClass(d, 'fighter'), 'class'), ['Choose a Fighting Style.']);
  assertEqual(creation.stepProblems(creation.chooseClass(d, 'wizard'), 'class'), []);
  const elf = creation.chooseSpecies(d, 'elf');
  assertEqual(creation.stepProblems(elf, 'species').length, 2, 'lineage and spellcasting ability');
  assertEqual(creation.stepProblems(creation.chooseSpecies(d, 'human'), 'species'), ['Choose an Origin feat.']);
  assertEqual(creation.stepProblems(d, 'details').length, 4);
  assertThrows(() => creation.finishCharacter(d));
});

test('Creation: changing an earlier choice clears the later choices that depended on it', () => {
  let d = creation.chooseBackground(creation.chooseClass(creation.emptyDraft(), 'fighter'), 'criminal');
  d = creation.toggleSkill(creation.toggleSkill(d, 'class', 'athletics'), 'class', 'perception');
  d = creation.chooseKit(d, 'class', 'A');
  const wizard = creation.chooseClass(d, 'wizard');
  assertEqual([wizard.classSkills, wizard.startingEquipment.class], [[], null], 'new class, new skills and kit');
  const soldier = creation.chooseBackground(d, 'soldier');
  assertEqual(soldier.classSkills, ['perception'], 'the Soldier gives Athletics, so that pick is freed');
  let human = creation.chooseOriginFeat(creation.chooseSpecies(d, 'human'), 'skilled');
  human = creation.toggleSkill(human, 'feat', 'arcana');
  assertEqual(human.featSkills, ['arcana']);
  assertEqual(creation.chooseSpecies(human, 'dwarf').featSkills, [], 'no Skilled feat without the Human');
});

test('Creation: skills can only be picked once, and only up to the count', () => {
  let d = creation.chooseBackground(creation.chooseClass(creation.emptyDraft(), 'fighter'), 'soldier');
  d = creation.chooseSpecies(d, 'human');
  assertEqual(creation.toggleSkill(d, 'class', 'athletics').classSkills, [], 'the Soldier already gives Athletics');
  assertEqual(creation.toggleSkill(d, 'class', 'arcana').classSkills, [], 'not a Fighter skill');
  d = creation.toggleSkill(creation.toggleSkill(d, 'class', 'history'), 'class', 'survival');
  assertEqual(creation.toggleSkill(d, 'class', 'insight').classSkills, ['history', 'survival'], 'two is the limit');
  assertEqual(creation.toggleSkill(d, 'species', 'history').speciesSkills, [], 'already a Fighter skill');
  assertEqual(creation.toggleSkill(d, 'class', 'history').classSkills, ['survival'], 'tapping again unpicks');
  assertEqual(creation.skillTakenBy(d, 'intimidation', 'class'), 'background');
});

test("Creation: the Standard Array goes in the class's order, and assigning a score swaps", () => {
  const wizard = creation.setAbilityMethod(creation.chooseClass(creation.emptyDraft(), 'wizard'), 'standard-array');
  assertEqual(wizard.baseAbilityScores, classes.find((c) => c.id === 'wizard').standardArray);
  const swapped = creation.assignScore(wizard, 'strength', 15);
  assertEqual([swapped.baseAbilityScores.strength, swapped.baseAbilityScores.intelligence], [15, 8]);
});

test('Creation: Point Buy starts at 8 and stays within 8 to 15 and 27 points', () => {
  let d = creation.setAbilityMethod(creation.chooseClass(creation.emptyDraft(), 'fighter'), 'point-buy');
  assertEqual(creation.pointBuySpent(d.baseAbilityScores), 0);
  assertEqual(creation.adjustPointBuy(d, 'strength', -1), d, 'no lower than 8');
  for (let i = 0; i < 7; i++) d = creation.adjustPointBuy(d, 'strength', 1);
  assertEqual(d.baseAbilityScores.strength, 15, 'no higher than 15');
  for (let i = 0; i < 7; i++) d = creation.adjustPointBuy(d, 'dexterity', 1);
  for (let i = 0; i < 7; i++) d = creation.adjustPointBuy(d, 'constitution', 1);
  assertEqual(creation.pointBuySpent(d.baseAbilityScores), 27);
  assertEqual(creation.adjustPointBuy(d, 'wisdom', 1), d, 'no points left');
});

test('Creation: rolled scores are 4d6 drop the lowest, from the seeded dice', () => {
  const rolls = creation.rollAbilityScores(createRng('roll-scores'));
  assertEqual(rolls.length, 6);
  for (const r of rolls) {
    const kept = r.dice.filter((_, i) => !r.dropped.includes(i));
    assertEqual([r.dice.length, r.dropped.length], [4, 1]);
    assertTrue(r.dice[r.dropped[0]] === Math.min(...r.dice), 'the lowest die is dropped');
    assertEqual(r.total, kept.reduce((s, v) => s + v, 0));
  }
  assertEqual(creation.rollAbilityScores(createRng('roll-scores')), rolls, 'same seed, same rolls');
  const d = creation.setAbilityMethod(creation.chooseClass(creation.emptyDraft(), 'wizard'), 'random', rolls.map((r) => r.total));
  assertEqual(d.baseAbilityScores.intelligence, Math.max(...rolls.map((r) => r.total)), "the best roll goes to the Wizard's Intelligence");
});

test('Creation: suggested background increases are +2/+1 to the best scores', () => {
  let d = creation.chooseBackground(creation.chooseClass(creation.emptyDraft(), 'wizard'), 'sage');
  d = creation.suggestIncreases(creation.setAbilityMethod(d, 'standard-array'));
  assertEqual(d.backgroundIncreases, { intelligence: 2, wisdom: 1 });
});

test('Creation: rolled names come from the species table and the seeded dice', () => {
  const name = creation.rollName(createRng('names'), 'dwarf');
  const [given, family] = name.split(' ');
  assertTrue(nameTables.dwarf.given.includes(given) && nameTables.dwarf.family.includes(family), name);
  assertEqual(creation.rollName(createRng('names'), 'dwarf'), name);
  let d = creation.chooseBond(creation.setName(creation.chooseSpecies(creation.emptyDraft(), 'dwarf'), 'Ylva Stonebrow'), 'sibling');
  assertTrue(creation.rollBondName(createRng('bond'), d).endsWith(' Stonebrow'), 'a sibling shares the family name');
});

test('Creation: the class kit decides the starting armour', () => {
  let d = creation.chooseBackground(creation.chooseClass(creation.emptyDraft(), 'fighter'), 'soldier');
  d = creation.chooseKit(d, 'background', 'A');
  assertEqual(['A', 'B', 'C'].map((o) => creation.kitArmor(creation.chooseKit(d, 'class', o))), ['chain-mail', 'studded-leather-armor', null]);
  const wizardKit = creation.chooseKit(creation.chooseClass(d, 'wizard'), 'class', 'A');
  assertEqual(creation.kitArmor(wizardKit), null);
  const kit = creation.startingKit(creation.chooseKit(d, 'class', 'A'));
  assertEqual(kit.gold, 4 + 14);
  assertTrue(kit.items.some(({ item, quantity }) => item.id === 'javelin' && quantity === 8));
});

test('Creation: only Origin feats can be the Human’s Versatile feat', () => {
  const human = creation.chooseSpecies(creation.emptyDraft(), 'human');
  assertThrows(() => creation.chooseOriginFeat(human, 'defense'), 'Defense is a Fighting Style, not an Origin feat');
  assertEqual(creation.chooseOriginFeat(human, 'magic-initiate').magicInitiate.length, 1);
});

// ---- Spells ----

test('Data: every spell is SRD, and the lists and species have the spells they need', () => {
  for (const s of spells) {
    assertTrue(s.source === 'SRD 5.2.1' && s.level >= 0 && s.level <= 2 && s.lists.length > 0, s.id);
    assertTrue(Boolean(s.text.length > 20 && s.castingTime && s.range && s.components && s.duration), `${s.id} is missing a field`);
    assertEqual(s.concentration, s.duration.startsWith('Concentration'), `${s.id} concentration`);
  }
  assertEqual(new Set(spells.map((s) => s.id)).size, spells.length, 'spell ids are unique');
  // Species spells up to character level 3 (level 5 spells arrive with higher levels).
  for (const sp of species) {
    const options = sp.choice ? sp.choice.options : [];
    const ids = [sp.cantrip, ...options.flatMap((o) => [o.cantrip, ...(o.cantrips || []), o.level3Spell, o.alwaysPrepared])].filter(Boolean);
    for (const id of ids) assertTrue(findSpell(id) !== null, `${sp.id} needs ${id}`);
  }
  assertTrue(spellsOnList('wizard', 0).length >= 3 && spellsOnList('wizard', 1).length >= 6 && spellsOnList('wizard', 2).length >= 2);
  for (const list of ['cleric', 'druid', 'wizard']) {
    assertTrue(spellsOnList(list, 0).length >= 2 && spellsOnList(list, 1).length >= 1, `Magic Initiate (${list}) has choices`);
  }
});

test('Spells: a Wizard knows up to 3 cantrips, keeps a spellbook and prepares spells from it', () => {
  assertEqual(validateCharacter(makeWizard()), []);
  const spellsWith = (change) => ({ ...makeWizard().spells, ...change });
  assertTrue(validateCharacter(makeWizard({ spells: spellsWith({ cantrips: ['fire-bolt', 'light', 'mage-hand', 'ray-of-frost'] }) })).length > 0, 'four cantrips');
  assertTrue(validateCharacter(makeWizard({ spells: spellsWith({ prepared: ['thunderwave'] }) })).length > 0, 'not in the spellbook');
  assertTrue(validateCharacter(makeWizard({ spells: spellsWith({ spellbook: ['cure-wounds'] }) })).length > 0, 'a Cleric spell');
  assertTrue(validateCharacter(makeWizard({ spells: spellsWith({ spellbook: ['misty-step'], prepared: [] }) })).length > 0, 'level 2 is too high at level 1');
  assertEqual(validateCharacter(makeWizard({ level: 3, classChoices: { scholarSkill: 'investigation' }, spells: spellsWith({ spellbook: ['misty-step'], prepared: ['misty-step'] }) })), []);
  assertTrue(validateCharacter(makeWizard({ spells: null })).length > 0, 'a Wizard needs spells');
  assertTrue(validateCharacter({ ...testHero, spells: makeWizard().spells }).length > 0, 'a Fighter has none');
});

test('Spells: Magic Initiate gives two cantrips and a level 1 spell from one list', () => {
  const acolyte = (magicInitiate) => makeHero({ backgroundId: 'acolyte', backgroundIncreases: { wisdom: 2, charisma: 1 }, magicInitiate });
  const cleric = { source: 'background', list: 'cleric', ability: 'wisdom', cantrips: ['guidance', 'sacred-flame'], spell: 'bless' };
  assertEqual(validateCharacter(acolyte([cleric])), []);
  assertTrue(validateCharacter(acolyte([])).length > 0, 'the Acolyte’s feat needs its spells');
  assertTrue(validateCharacter(acolyte([{ ...cleric, list: 'wizard' }])).length > 0, 'the Acolyte’s list is Cleric');
  assertTrue(validateCharacter(acolyte([{ ...cleric, cantrips: ['guidance', 'fire-bolt'] }])).length > 0, 'Fire Bolt is not a Cleric cantrip');
  assertTrue(validateCharacter(acolyte([{ ...cleric, spell: 'magic-missile' }])).length > 0, 'not a Cleric spell');
  assertTrue(validateCharacter(acolyte([{ ...cleric, ability: 'strength' }])).length > 0);
});

test('Spells: a Human taking Magic Initiate again must use a different list', () => {
  const human = (list) =>
    makeWizard({
      speciesId: 'human',
      speciesChoice: null,
      spellcastingAbility: null,
      speciesSkills: ['perception'],
      originFeat: 'magic-initiate',
      magicInitiate: [
        makeWizard().magicInitiate[0],
        { source: 'species', list, ability: 'wisdom', cantrips: ['guidance', 'spare-the-dying'], spell: list === 'wizard' ? 'shield' : 'cure-wounds' },
      ],
    });
  assertEqual(validateCharacter(human('cleric')), []);
  assertTrue(validateCharacter(human('wizard')).length > 0, 'the Sage already took the Wizard list');
});

test('Spells: species give cantrips at level 1 and a spell at level 3', () => {
  const ids = (list) => list.map((s) => s.id);
  const elf = spellGroups(makeWizard()).find((g) => g.label === 'High Elf');
  assertEqual([ids(elf.cantrips), elf.always.length, elf.ability], [['prestidigitation'], 0, 'intelligence']);
  const elf3 = spellGroups(makeWizard({ level: 3 })).find((g) => g.label === 'High Elf');
  assertEqual(elf3.always.map((a) => a.spell.id), ['detect-magic']);
  const tiefling = makeHero({ speciesId: 'tiefling', speciesChoice: 'infernal', spellcastingAbility: 'charisma', speciesSkills: [], originFeat: null });
  assertEqual(ids(spellGroups(tiefling)[0].cantrips), ['thaumaturgy', 'fire-bolt']);
  const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;
  assertEqual(spellGroups(juniper).map((g) => g.label), ['Wizard', 'Magic Initiate (Wizard)', 'Rock Gnome']);
  assertEqual(spellNumbers(juniper, 'intelligence').saveDc.value, 13, '8 + Int 3 + Proficiency 2');
});

test('Spells: has_spell counts cantrips, prepared spells and spellbook rituals', () => {
  const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;
  const can = (id) => canCastSpell(juniper, id);
  assertEqual(['light', 'minor-illusion', 'mending', 'thunderwave', 'magic-missile'].map(can), [true, true, true, true, true]);
  assertTrue(can('comprehend-languages'), 'a ritual in the spellbook');
  assertEqual([can('burning-hands'), can('cure-wounds'), canCastSpell(testHero, 'light')], [false, false, false]);
});

test('Creation: a Wizard chooses cantrips, a spellbook and prepared spells', () => {
  let d = creation.chooseClass(creation.emptyDraft(), 'wizard');
  assertTrue(creation.creationSteps(d).includes('spells'));
  for (const id of ['fire-bolt', 'light', 'mage-hand', 'ray-of-frost']) d = creation.toggleClassSpell(d, 'cantrips', id);
  assertEqual(d.spells.cantrips, ['fire-bolt', 'light', 'mage-hand'], 'three is the limit');
  assertEqual(creation.toggleClassSpell(d, 'spellbook', 'cure-wounds').spells.spellbook, [], 'not a Wizard spell');
  assertEqual(creation.toggleClassSpell(d, 'prepared', 'shield').spells.prepared, [], 'not in the spellbook yet');
  for (const id of ['shield', 'sleep', 'magic-missile', 'mage-armor', 'thunderwave', 'detect-magic']) d = creation.toggleClassSpell(d, 'spellbook', id);
  for (const id of ['shield', 'sleep', 'magic-missile', 'mage-armor', 'thunderwave']) d = creation.toggleClassSpell(d, 'prepared', id);
  assertEqual(d.spells.prepared.length, 4, 'four prepared at level 1');
  assertEqual(creation.stepProblems(d, 'spells'), []);
  d = creation.toggleClassSpell(d, 'spellbook', 'shield');
  assertEqual([d.spells.spellbook.includes('shield'), d.spells.prepared.includes('shield')], [false, false], 'out of the book, so unprepared');
});

test('Creation: Magic Initiate choices, without picking a spell twice', () => {
  let d = creation.chooseBackground(creation.chooseClass(creation.emptyDraft(), 'wizard'), 'sage');
  assertEqual(d.magicInitiate.map((e) => [e.source, e.list, e.ability]), [['background', 'wizard', 'intelligence']]);
  d = creation.toggleClassSpell(d, 'cantrips', 'fire-bolt');
  assertEqual(creation.toggleInitiateCantrip(d, 'background', 'fire-bolt').magicInitiate[0].cantrips, [], 'already a Wizard cantrip');
  d = creation.toggleInitiateCantrip(creation.toggleInitiateCantrip(d, 'background', 'light'), 'background', 'ray-of-frost');
  d = creation.chooseInitiateSpell(creation.chooseInitiateSpell(d, 'background', 'sleep'), 'background', 'shield');
  assertEqual([d.magicInitiate[0].cantrips, d.magicInitiate[0].spell], [['light', 'ray-of-frost'], 'shield'], 'a second spell swaps the first');
  // A High Elf already knows Prestidigitation, so picks of it are freed.
  d = creation.toggleClassSpell(d, 'cantrips', 'prestidigitation');
  d = creation.chooseSpeciesOption(creation.chooseSpecies(d, 'elf'), 'high-elf');
  assertEqual(d.spells.cantrips, ['fire-bolt']);
  // A Human's Versatile Magic Initiate can't reuse the Sage's Wizard list.
  d = creation.chooseOriginFeat(creation.chooseSpecies(d, 'human'), 'magic-initiate');
  assertEqual(magicInitiateLists(d, 'species'), ['cleric', 'druid']);
  assertThrows(() => creation.setInitiateList(d, 'species', 'wizard'));
  d = creation.setInitiateList(d, 'species', 'druid');
  assertEqual(d.magicInitiate.find((e) => e.source === 'species').ability, 'wisdom');
  assertTrue(creation.stepProblems(d, 'spells').some((p) => p.startsWith('Magic Initiate (Druid)')));
});

test('Creation: heroes with no spells to choose skip the Spells step', () => {
  const fighter = creation.chooseSpecies(creation.chooseBackground(creation.chooseClass(creation.emptyDraft(), 'fighter'), 'soldier'), 'dwarf');
  assertTrue(!creation.creationSteps(fighter).includes('spells'));
  assertTrue(creation.creationSteps(creation.chooseBackground(fighter, 'acolyte')).includes('spells'), 'Magic Initiate (Cleric)');
});

// ---- Looks and sprites ----

test('Data: every sprite part is 16 rows of 16 pixels, using only known colour letters', () => {
  const letters = new Set(['.', ...Object.keys(heroSprite(testHero).colors)]);
  const grids = [
    ['body', spriteParts.body],
    ['beard', spriteParts.beard],
    ['armor', spriteParts.armor],
    ['shield', spriteParts.shield],
    ['robe', spriteParts.robe],
    ...Object.entries(spriteParts.hairStyles),
    ...Object.entries(spriteParts.features),
    ...Object.entries(spriteParts.headgear),
  ];
  for (const [name, rows] of grids) {
    assertEqual(rows.length, 16, `${name} rows`);
    for (const row of rows) {
      assertEqual(row.length, 16, `${name} row "${row}"`);
      for (const letter of row) assertTrue(letters.has(letter), `${name} uses an unknown letter "${letter}"`);
    }
  }
  for (const look of [hairStyles, headgearOptions]) for (const option of look) assertTrue(option.id in (look === hairStyles ? spriteParts.hairStyles : spriteParts.headgear), option.id);
  for (const [id, sp] of Object.entries(speciesLooks)) for (const f of sp.features) assertTrue(f in spriteParts.features, `${id}: ${f}`);
});

test('Look: every species and class starts with a legal look', () => {
  for (const sp of species) {
    for (const cls of classes) {
      const hero = { speciesId: sp.id, speciesChoice: sp.choice ? sp.choice.options[0].id : null, classId: cls.id };
      assertEqual(lookProblems({ ...hero, look: defaultLook(hero) }), [], `${sp.id} ${cls.id}`);
    }
  }
  assertEqual(defaultLook({ speciesId: 'dragonborn', speciesChoice: 'blue', classId: 'fighter' }).skin, 'azure', 'scales match the ancestry');
});

test('Look: unknown choices and the wrong class’s headgear are refused', () => {
  const look = testHero.look;
  assertTrue(lookProblems({ ...testHero, look: { ...look, skin: 'plaid' } }).length > 0);
  assertTrue(lookProblems({ ...testHero, look: { ...look, headgear: 'hood' } }).length > 0, 'a hood is for Wizards');
  assertTrue(lookProblems({ ...testHero, look: null }).length > 0);
  assertEqual(lookProblems({ ...testHero, look: { ...look, headgear: 'helmet' } }), []);
});

test('Sprite: two frames; the second bobs the upper body a pixel and keeps the legs', () => {
  const [first, second] = heroSprite(testHero).frames;
  assertEqual([first.length, second.length], [16, 16]);
  assertEqual(second.slice(1, 13), first.slice(0, 12), 'upper body drops one row');
  assertEqual(second.slice(13), first.slice(13), 'legs stay put');
});

test('Sprite: species, size, armour and class change the drawing', () => {
  const pixel = (character, row, col, frame = 0) => heroSprite(character).frames[frame][row][col];
  const elf = makeWizard();
  assertEqual(pixel(elf, 4, 3), 'S', 'an Elf’s pointed ear');
  const orc = makeHero({ speciesId: 'orc', speciesSkills: [], originFeat: null });
  assertEqual([pixel(orc, 6, 6), pixel(orc, 6, 9)], ['I', 'I'], 'tusks');
  const small = heroSprite({ ...testHero, size: 'small' }).frames[0];
  assertEqual([small.length, small[0], small[1]], [16, '.'.repeat(16), '.'.repeat(16)], 'two pixels shorter');
  const chain = heroSprite(testHero);
  assertTrue(chain.frames[0].some((row) => row.includes('M')) && chain.colors.m === '#8595a1', 'Chain Mail is steel');
  assertEqual(heroSprite({ ...testHero, armorId: 'studded-leather-armor' }).colors.m, '#d27d2c', 'leather armour is brown');
  assertTrue(!heroSprite({ ...testHero, armorId: null }).frames[0].some((row) => row.includes('M')), 'no armour, no metal');
  assertTrue(heroSprite({ ...testHero, shield: true }).frames[0].some((row) => row.includes('y')), 'a Shield');
  assertTrue(heroSprite(makeWizard()).frames[0].some((row) => row.includes('T')), 'a Wizard’s robe has a sash');
  assertEqual(heroSprite({ ...testHero, look: { ...testHero.look, skin: 'green' } }).colors.s, '#6daa2c');
});

test('Creation: the Look step starts with the species’ look; a new class drops the wrong headgear', () => {
  let d = creation.chooseSpecies(creation.chooseClass(creation.emptyDraft(), 'wizard'), 'orc');
  assertEqual(creation.stepProblems(d, 'look'), ['Choose a look.']);
  d = creation.prepareStep(d, 'look');
  assertEqual([d.look.skin, d.look.outfit], ['green', 'blue']);
  d = creation.chooseLook(d, { headgear: 'hood', hairColor: 'white' });
  assertEqual(creation.stepProblems(d, 'look'), []);
  assertEqual(creation.chooseClass(d, 'fighter').look.headgear, 'none');
  const rolled = rollLook(createRng('look'), d);
  assertEqual(rollLook(createRng('look'), d), rolled, 'same seed, same look');
  assertEqual(lookProblems({ ...d, look: rolled }), []);
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

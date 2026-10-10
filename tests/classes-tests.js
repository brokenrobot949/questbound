// Class checks: each class's own rules, for the Cleric and the Rogue (Phase 2), and the
// companions who travel with the hero. Open tests/classes.html through the local server to
// run them. Add checks here whenever a class, one of its features, or a companion changes.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import * as creation from '../js/engine/character/creation.js';
import * as levelUp from '../js/engine/character/level-up.js';
import * as fight from '../js/engine/combat/battle.js';
import { heroAttackOptions, rollDamage } from '../js/engine/combat/attacks.js';
import { squaresBetween } from '../js/engine/combat/grid.js';
import { armorClass, armorTraining, checkModifiers, climbSpeed, maxHitPoints, proficientWithWeapon, sneakAttackDice, spellcasting, weaponProficiencies } from '../js/engine/character/sheet.js';
import { canCastSpell, classSpellCounts, domainSpells, preparePicks, togglePrepared } from '../js/engine/character/spells.js';
import { castSelfSpell, selfSpellProblem } from '../js/engine/character/spell-effects.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { freshResources, heroMaxHp, longRestRecovery, slotsAt } from '../js/engine/character/resources.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { newJournal } from '../js/engine/story/journal.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { jumpTo, makeChoice } from '../js/engine/story/story-runner.js';
import { gameToSave, newGame } from '../js/engine/save/save-format.js';
import { attackSummary } from '../js/engine/ui/attack-text.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';
import { approve, companionCharacter, joinParty, leaveParty, memberMaxHp, memberOf, partyLevelUp, partyLongRest, partyProblems, setTactic } from '../js/engine/character/party.js';

// Posy Hearthstone, the Quick Start Cleric: a halfling Acolyte, Thaumaturge, Wisdom 17 (+3, so
// spell save DC 13 and spell attack +5), Constitution 13 (+1), chain shirt and Shield.
const posy = quickStartHeroes.find((h) => h.id === 'posy').character;
// Posy at level 2 (Detect Magic prepared as her fifth spell), and at level 3 with the Life
// Domain (Hold Person as her new level 2 spell; Bless and Cure Wounds are domain spells now).
const posy2 = { ...posy, level: 2, hitPointRolls: [null], spells: { ...posy.spells, prepared: [...posy.spells.prepared, 'detect-magic'] } };
const posy3 = {
  ...posy,
  level: 3,
  subclassId: 'life',
  hitPointRolls: [null, null],
  spells: { ...posy.spells, prepared: ['guiding-bolt', 'sanctuary', 'detect-magic', 'hold-person'] },
};

// A game with what these checks need: the hero, their kit, full Hit Points, XP, the journal.
function gameFor(character, xp = 0, seed = 'classes') {
  return { character: structuredClone(character), rng: createRng(seed), ...startingInventory(character), ...freshResources(character), xp, day: 1, journal: newJournal(), battle: null, lastBattle: null, levelUp: null };
}

// A fight with the hero going first: Initiative is a 20 for the hero and a 1 for every foe.
function fightWith(character, encounterId, seed = 'cleric-fight') {
  const game = gameFor(character, 0, seed);
  game.rng = scriptedRng([20, 1, 1, 1, 1, 1, 1, 1]);
  fight.startBattle(game, encounterId, 0);
  game.rng = createRng(seed);
  return game;
}

const said = (game, text) => game.battle.log.some((e) => e.text.includes(text));

// ---- The Cleric: the sheet and creation ----

test('Cleric: Posy, the Quick Start Cleric, is legal, with her numbers from the rules', () => {
  assertEqual(validateCharacter(posy), []);
  const casting = spellcasting(posy);
  assertEqual([casting.saveDc.value, casting.attackBonus.value, maxHitPoints(posy).value, armorClass(posy).value], [13, 5, 9, 14], 'chain shirt 13, Dex −1, Shield +2');
  assertEqual(classSpellCounts(posy), { cantrips: 4, spellbook: 0, prepared: 4 }, 'Thaumaturge knows a fourth cantrip');
  const religion = checkModifiers(posy, 'religion').modifiers.map((m) => [m.label, m.value]);
  assertEqual(religion, [['Int', 0], ['Proficiency', 2], ['Thaumaturge', 3]], 'Thaumaturge adds Wisdom to Religion');
  assertTrue(canCastSpell(posy, 'healing-word') && !preparePicks(posy).from.includes('healing-word'), 'Healing Word comes from Magic Initiate, so it isn’t offered to prepare');
});

test('Creation: a Cleric chooses a Divine Order, and prepares straight from the Cleric list', () => {
  let draft = creation.chooseClass(creation.emptyDraft(), 'cleric');
  assertTrue(creation.stepProblems(draft, 'class').includes('Choose a Divine Order.'));
  assertEqual(creation.classSpellPicks(draft, 'spellbook'), null, 'no spellbook');
  draft = creation.chooseDivineOrder(draft, 'thaumaturge');
  assertEqual(creation.classSpellPicks(draft, 'cantrips').count, 4);
  for (const id of ['guidance', 'sacred-flame', 'thaumaturgy', 'light']) draft = creation.toggleClassSpell(draft, 'cantrips', id);
  draft = creation.chooseDivineOrder(draft, 'protector');
  assertEqual(draft.spells.cantrips, ['guidance', 'sacred-flame', 'thaumaturgy'], 'a Protector gives back the extra cantrip');
  const prepared = creation.classSpellPicks(draft, 'prepared');
  assertEqual([prepared.count, prepared.from.includes('bless'), prepared.from.includes('hold-person'), prepared.from.includes('magic-missile')], [4, true, false, false], 'level 1 Cleric spells only');
  const protector = { ...posy, classChoices: { divineOrder: 'protector' }, spells: { ...posy.spells, cantrips: posy.spells.cantrips.slice(0, 3) } };
  assertEqual([weaponProficiencies(protector), armorTraining(protector).includes('heavy')], [['simple', 'martial'], true]);
  assertEqual(validateCharacter(protector), []);
});

test('Creation: no spellbook, no spells off the Cleric list, and a Divine Order is a must', () => {
  const problems = (changes) => validateCharacter({ ...posy, ...changes }).join(' ');
  assertTrue(problems({ spells: { ...posy.spells, spellbook: ['bless'] } }).includes('has no spellbook'));
  assertTrue(problems({ spells: { ...posy.spells, prepared: ['magic-missile'] } }).includes('Prepared spells must be Cleric spells'));
  assertTrue(problems({ spells: { ...posy.spells, prepared: ['hold-person'] } }).includes('of level 1 to 1'), 'no level 2 spells at level 1');
  assertTrue(problems({ classChoices: {} }).includes('Choose a Divine Order.'));
});

// ---- Levelling up ----

// Takes the hero up one level with the given choices.
function levelWith(game, { subclass = null, prepared = [] } = {}) {
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, 'fixed');
  if (subclass) levelUp.chooseSubclass(game, subclass);
  for (const id of prepared) levelUp.toggleLevelUpSpell(game, 'prepared', id);
  return levelUp.finishLevelUp(game);
}

test('Level-up: one more spell from the list each level; at 3, level 2 spells and the Life Domain', () => {
  const game = gameFor(posy, 900);
  levelWith(game, { prepared: ['detect-magic'] });
  assertEqual([game.character.level, maxHitPoints(game.character).value], [2, 15], '8 + 1, then 5 + 1');
  levelUp.beginLevelUp(game);
  levelUp.chooseHitPoints(game, 'fixed');
  levelUp.chooseSubclass(game, 'life');
  // Bless and Cure Wounds are domain spells now, so two places free up, plus the new one:
  // three, from the Cleric spells of levels 1 and 2 not already ready.
  const plan = levelUp.levelUpPlan(game).prepared;
  assertEqual([plan.count, plan.from.includes('hold-person'), plan.from.includes('spiritual-weapon'), plan.from.includes('bless'), plan.from.includes('aid')], [3, true, true, false, false]);
  for (const id of ['hold-person', 'spiritual-weapon', 'bane']) levelUp.toggleLevelUpSpell(game, 'prepared', id);
  levelUp.finishLevelUp(game);
  const hero = game.character;
  assertEqual(hero.spells.prepared, ['guiding-bolt', 'sanctuary', 'detect-magic', 'hold-person', 'spiritual-weapon', 'bane']);
  assertEqual(domainSpells(hero), ['aid', 'bless', 'cure-wounds', 'lesser-restoration']);
  assertTrue(canCastSpell(hero, 'aid') && canCastSpell(hero, 'bless'));
  assertEqual([slotsAt(hero, 1), slotsAt(hero, 2), validateCharacter(hero)], [4, 2, []]);
});

// ---- Channel Divinity ----

test('Channel Divinity: two uses from level 2; Divine Spark at a foe (half on a Con save) or to heal', () => {
  assertTrue(!heroAttackOptions(fightWith(posy, 'mill-scavengers')).some((o) => o.source === 'channel'), 'not at level 1');
  const game = fightWith(posy2, 'mill-scavengers');
  const goblin = fight.enemies(game.battle)[0];
  goblin.hp = 30;
  assertEqual(attackSummary(heroAttackOptions(game).find((o) => o.id === 'channel-divine-spark')).join(' · '), 'Con save against DC 13 · 1d8 + 3 radiant · 7.5 on average · half on a save · range 30 ft · uses Channel Divinity');
  forceNextD20(20);
  fight.heroAttack(game, 'channel-divine-spark', goblin.id);
  assertTrue(said(game, 'You channel Divine Spark at Goblin Minion 1, who makes the save') && said(game, 'halved to'));
  assertEqual(game.featureUses['channel-divinity'], 1);
  fight.endHeroTurn(game);
  game.hp = 2;
  game.rng = scriptedRng([5]);
  fight.heroCastSelf(game, 'channel-divine-spark-heal');
  assertEqual(game.hp, 10, '1d8 (5) + 3');
  assertTrue(!heroAttackOptions(game).some((o) => o.source === 'channel'), 'both uses spent');
  longRestRecovery(game);
  assertEqual(game.featureUses['channel-divinity'] || 0, 0, 'back after a Long Rest');
});

test('Turn Undead: each Undead within 30 feet saves or flees, until it takes damage', () => {
  const mill = fightWith(posy2, 'mill-scavengers');
  assertEqual(fight.heroCantUse(mill, 'channel-turn-undead'), 'No Undead within 30 feet.');
  const game = fightWith(posy2, 'lower-dead');
  const hero = fight.heroCombatant(game.battle);
  const zombies = fight.enemies(game.battle);
  game.rng = scriptedRng([1, 1, 20]); // the first two fail their Wisdom saves, the third makes it
  fight.heroCastSelf(game, 'channel-turn-undead');
  const turned = zombies.filter((z) => fight.conditionsOf(game.battle, z.id).includes('turned'));
  assertEqual(turned.length, 2, game.battle.log.map((e) => e.text).join(' / '));
  assertTrue(said(game, 'stands its ground') && fight.isIncapacitated(game.battle, turned[0].id));
  const near = turned.map((z) => squaresBetween(hero.pos, z.pos));
  game.rng = createRng('fleeing');
  fight.endHeroTurn(game);
  assertTrue(turned.every((z, i) => squaresBetween(hero.pos, z.pos) > near[i] || said(game, 'nowhere farther to go')), 'they flee on their turns');
  forceNextD20(1); // its Dexterity save against Sacred Flame
  fight.heroAttack(game, 'spell-sacred-flame', turned[0].id);
  assertTrue(!fight.conditionsOf(game.battle, turned[0].id).includes('turned') && said(game, 'breaks Turn Undead'), 'damage ends it');
});

test('Preserve Life (Life Domain): heals a Bloodied Cleric, up to half their Hit Points', () => {
  const game = fightWith(posy3, 'mill-scavengers');
  assertEqual(heroMaxHp(game), 21);
  assertTrue(fight.heroCantUse(game, 'channel-preserve-life').includes('there already'), 'at full Hit Points');
  game.hp = 3;
  fight.heroCastSelf(game, 'channel-preserve-life');
  assertEqual(game.hp, 10, 'half of 21, rounded down');
});

// ---- Life Domain spells ----

test('Aid: the Hit Point maximum and current Hit Points rise by 5 until a Long Rest', () => {
  const game = gameFor(posy3);
  assertEqual(castSelfSpell(game, 'aid', 2), 'Aid: your Hit Point maximum and current Hit Points rise by 5, until your next Long Rest.');
  assertEqual([game.hp, heroMaxHp(game)], [26, 26]);
  longRestRecovery(game);
  assertEqual([game.hp, heroMaxHp(game)], [21, 21]);
});

test('Disciple of Life: healing from a spell slot heals 2 + the slot level more; a free cast doesn’t', () => {
  const game = gameFor(posy3);
  game.hp = 5;
  game.rng = scriptedRng([4, 4, 1, 1]);
  assertEqual(castSelfSpell(game, 'cure-wounds', 1), 'Cure Wounds: 2d8 (4, 4) + 3 + 3 (Disciple of Life) = 14. You regain 14 Hit Points.');
  game.hp = 5;
  assertTrue(castSelfSpell(game, 'healing-word', 'free').startsWith('Healing Word: 2d4 (1, 1) + 3 = 5.'), 'Magic Initiate’s free cast uses no slot');
  const cure = heroAttackOptions(gameFor(posy3)).find((o) => o.id === 'spell-cure-wounds');
  assertTrue(attackSummary(cure).join(' · ').includes('+3 with a slot (Disciple of Life)'));
});

// ---- More Cleric spells ----

// Posy with a fighting set of level 1 spells prepared, and at level 3 (Life Domain) with
// Blindness/Deafness and Spiritual Weapon.
const posyFights = { ...posy, spells: { ...posy.spells, prepared: ['shield-of-faith', 'bane', 'command', 'inflict-wounds'] } };
const posyWeapon = { ...posy3, spells: { ...posy3.spells, prepared: ['guiding-bolt', 'blindness-deafness', 'spiritual-weapon', 'prayer-of-healing'] } };

// The mill fight with the two goblins placed: one beside Posy at (3, 1), one 10 feet off.
function millWith(character, seed) {
  const game = fightWith(character, 'mill-scavengers', seed);
  const [near, far] = fight.enemies(game.battle);
  near.pos = { x: 3, y: 2 };
  far.pos = { x: 5, y: 3 };
  near.hp = 30;
  far.hp = 30;
  return { game, near, far };
}
const rollsSaid = (game, label) => game.battle.log.filter((e) => e.roll && e.roll.modifiers.some((m) => m.label === label));

test('Shield of Faith: a Bonus Action, +2 AC while Posy concentrates', () => {
  const { game } = millWith(posyFights, 'faith');
  fight.heroCastSelf(game, 'spell-shield-of-faith');
  assertEqual([game.battle.turnState.bonus, game.battle.turnState.action, game.battle.concentration.name], [true, false, 'Shield of Faith']);
  fight.endHeroTurn(game);
  const attack = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack').pop().roll;
  assertEqual(attack.target, { type: 'AC', value: 16 }, 'chain shirt and Shield 14, +2');
});

test('Inflict Wounds: by touch, 2d10 necrotic, half on a Constitution save', () => {
  const { game, near, far } = millWith(posyFights, 'inflict');
  assertTrue(!fight.attackPreview(game, 'spell-inflict-wounds', far.id).inRange, 'touch: only the goblin beside her');
  assertTrue(attackSummary(heroAttackOptions(game).find((o) => o.id === 'spell-inflict-wounds')).join(' · ').includes('2d10 necrotic · 11 on average · half on a save · touch'));
  forceNextD20(20);
  fight.heroAttack(game, 'spell-inflict-wounds', near.id);
  assertTrue(said(game, 'who makes the save') && said(game, 'halved to') && near.hp < 30);
});

test('Command: a failed Wisdom save, and the goblin grovels on its next turn instead of fighting', () => {
  const { game, near } = millWith(posyFights, 'command');
  forceNextD20(1);
  fight.heroAttack(game, 'spell-command', near.id);
  assertTrue(fight.conditionsOf(game.battle, near.id).includes('grovel'));
  const full = game.hp;
  game.battle.order = ['hero', near.id, fight.enemies(game.battle)[1].id];
  fight.enemies(game.battle)[1].hp = 0;
  fight.endHeroTurn(game);
  assertTrue(said(game, 'grovels') && fight.isProne(game.battle, near.id) && game.hp === full, game.battle.log.map((e) => e.text).join(' / '));
  assertEqual(fight.attackPreview(game, heroAttackOptions(game).find((o) => o.how === 'melee').id, near.id).advantage, ['Goblin Minion 1 is Prone, within 5 feet']);
});

test('Bane: the nearest foes in 30 feet save or take −1d4 on their attack rolls and saves', () => {
  const { game, near, far } = millWith(posyFights, 'bane');
  const option = heroAttackOptions(game).find((o) => o.id === 'spell-bane');
  assertEqual([fight.nearestTargets(game, option).map((c) => c.id), option.targets], [[near.id, far.id], 3]);
  game.rng = scriptedRng([1, 1]);
  fight.heroCastMulti(game, 'spell-bane');
  assertTrue([near, far].every((c) => fight.conditionsOf(game.battle, c.id).includes('baned')) && game.battle.concentration.name === 'Bane');
  game.rng = createRng('baned');
  game.battle.turnState.action = false; // as if it were her next turn
  fight.heroAttack(game, 'spell-sacred-flame', far.id);
  const save = rollsSaid(game, 'Bane').find((e) => e.roll.kind === 'save');
  assertTrue(save && save.roll.modifiers.find((m) => m.label === 'Bane').value < 0, 'their saves lose 1d4');
  fight.endHeroTurn(game);
  const attacks = rollsSaid(game, 'Bane').filter((e) => e.roll.kind === 'attack');
  assertTrue(attacks.length > 0 && attacks.every((e) => e.roll.modifiers.find((m) => m.label === 'Bane').value < 0), 'and so do their attack rolls');
});

test('Blindness/Deafness: Blinded for a minute, with a Constitution save at the end of each of its turns', () => {
  const { game, near } = millWith(posyWeapon, 'blind');
  forceNextD20(1);
  fight.heroAttack(game, 'spell-blindness-deafness', near.id);
  assertTrue(fight.conditionsOf(game.battle, near.id).includes('blinded') && !game.battle.concentration, 'no Concentration');
  const mace = heroAttackOptions(game).find((o) => o.how === 'melee').id;
  assertEqual(fight.attackPreview(game, mace, near.id).advantage, ['Goblin Minion 1 is Blinded']);
  fight.enemies(game.battle)[1].hp = 0;
  forceNextD20(10); // its Dagger
  fight.endHeroTurn(game);
  const stab = game.battle.log.find((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Goblin Minion 1'));
  assertTrue(stab.roll.disadvantage.includes('Goblin Minion 1 is Blinded'));
  assertTrue(said(game, 'is still blind') || said(game, 'can see again'), 'it saved at the end of its turn');
});

test('Spiritual Weapon: a Bonus Action strike beside a foe, then more strikes on later turns without a slot', () => {
  const { game, near, far } = millWith(posyWeapon, 'weapon');
  far.pos = { x: 6, y: 6 };
  fight.heroAttack(game, 'spell-spiritual-weapon', far.id);
  const scene = fight.battleScene(game);
  assertEqual([game.battle.turnState.bonus, game.slotsUsed[1], game.battle.concentration.name, squaresBetween(scene.weapon, far.pos)], [true, 1, 'Spiritual Weapon', 1]);
  assertTrue(said(game, 'spectral mace of light'));
  assertTrue(!heroAttackOptions(game).some((o) => o.id === 'spiritual-weapon-strike') || fight.heroCantUse(game, 'spiritual-weapon-strike') !== null, 'one Bonus Action a turn');
  fight.endHeroTurn(game);
  if (game.battle.outcome) return;
  const strike = heroAttackOptions(game).find((o) => o.id === 'spiritual-weapon-strike');
  assertTrue(attackSummary(strike).join(' · ').startsWith('Bonus Action · +5 to hit · 1d8 + 3 force'), attackSummary(strike).join(' · '));
  const foe = [near, far].find((c) => c.hp > 0 && fight.attackPreview(game, strike.id, c.id).inRange);
  fight.heroAttack(game, strike.id, foe.id);
  assertEqual([game.slotsUsed[1], squaresBetween(fight.battleScene(game).weapon, foe.pos)], [1, 1], 'no new slot; it moved beside the foe');
});

test('Prayer of Healing: 10 minutes, so from the Sheet only; 2d8 with no Wisdom, once per Long Rest', () => {
  assertTrue(!heroAttackOptions(fightWith(posyWeapon, 'mill-scavengers')).some((o) => o.spellId === 'prayer-of-healing'), 'not in a fight');
  const game = gameFor(posyWeapon);
  game.hp = 3;
  game.rng = scriptedRng([2, 3]);
  assertEqual(castSelfSpell(game, 'prayer-of-healing', 2), 'Prayer of Healing: 2d8 (2, 3) + 4 (Disciple of Life) = 9. You regain 9 Hit Points.');
  assertTrue(castSelfSpellProblem(game).includes('since your last Long Rest'));
  longRestRecovery(game);
  game.hp = 3;
  assertEqual(castSelfSpellProblem(game), null, 'a Long Rest lets it heal her again');
});
const castSelfSpellProblem = (game) => selfSpellProblem(game, 'prayer-of-healing', 2);

// ---- Preparing spells after a Long Rest ----

test('Preparing: after a Long Rest a Cleric can change prepared spells, until the story moves on', async () => {
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  const game = newGame(runtime, { slot: 1, seed: 'prepare', character: posy });
  assertTrue(!game.canPrepare);
  game.page = jumpTo(game, 'ch1_arrival.into_town'); // a night at the inn
  assertTrue(game.canPrepare && game.page.beats.some((b) => b.type === 'note' && b.text.includes('change your prepared spells')));
  assertThrows(() => togglePrepared(game.character, 'detect-magic'), 'four prepared already: unprepare one first');
  game.character = togglePrepared(togglePrepared(game.character, 'sanctuary'), 'detect-magic');
  assertEqual(game.character.spells.prepared, ['bless', 'cure-wounds', 'guiding-bolt', 'detect-magic']);
  assertEqual([gameToSave(game).game.canPrepare, validateCharacter(game.character)], [true, []]);
  game.page = makeChoice(game, game.story.currentChoices[0]);
  assertTrue(!game.canPrepare, 'set until the next Long Rest');
});

// ---- The Rogue ----

// Sorael Thornvale, the Quick Start Rogue: a wood elf Criminal, Dexterity 17 (+3), Constitution
// 14 (+2), leather armour, Expertise in Stealth and Sleight of Hand, Weapon Mastery with the
// Dagger (Nick) and the Shortsword (Vex).
const sorael = quickStartHeroes.find((h) => h.id === 'sorael').character;
const sorael2 = { ...sorael, level: 2, hitPointRolls: [null] };
const sorael3 = { ...sorael, level: 3, subclassId: 'thief', hitPointRolls: [null, null] };

// The mill fight with one goblin beside the Rogue (at 3, 1), tough enough to take a few hits,
// and the other out of it.
function rogueDuel(character) {
  const game = fightWith(character, 'mill-scavengers', 'rogue-fight');
  const [goblin, other] = fight.enemies(game.battle);
  goblin.pos = { x: 3, y: 2 };
  goblin.hp = goblin.maxHp = 40;
  other.hp = 0;
  return { game, goblin };
}

const lastHit = (game) => game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack').pop();

test('Rogue: Sorael, the Quick Start Rogue, is legal, with the numbers from the rules', () => {
  assertEqual([validateCharacter(sorael), validateCharacter(sorael2), validateCharacter(sorael3)], [[], [], []]);
  assertEqual([maxHitPoints(sorael).value, armorClass(sorael).value], [10, 14], '8 + Con 2; leather 11 + Dex 3');
  const parts = (testId) => checkModifiers(sorael, testId).modifiers.map((m) => [m.label, m.value]);
  assertEqual(parts('stealth'), [['Dex', 3], ['Expertise', 4]], 'Expertise doubles the Proficiency Bonus');
  assertEqual(parts('thieves-tools'), [['Dex', 3], ['Proficiency', 2]], 'Thieves’ Tools, from the class and the background');
  assertEqual(parts('athletics'), [['Str', 1]]);
  const findWeapon = (id) => ({ ...creation.findItem(id) });
  assertEqual(['shortsword', 'scimitar', 'longbow', 'greatsword', 'shortbow'].map((id) => proficientWithWeapon(sorael, findWeapon(id))), [true, true, false, false, true], 'Martial weapons only with Finesse or Light');
  const game = gameFor(sorael);
  assertEqual([game.money, game.inventory.find((e) => e.id === 'dagger').quantity], [5800, 2], '8 GP and the Criminal’s 50 GP');
  const options = heroAttackOptions(game);
  const shortsword = options.find((o) => o.id === 'shortsword-melee');
  assertEqual([shortsword.modifiers.reduce((s, m) => s + m.value, 0), shortsword.sneakAttack, shortsword.mastery.id], [5, '1d6', 'vex']);
  assertEqual(options.find((o) => o.id === 'shortbow-ranged').sneakAttack, '1d6', 'a Ranged weapon');
  assertTrue(attackSummary(shortsword).includes('Sneak Attack +1d6 with Advantage, once a turn'));
  assertEqual([sneakAttackDice(sorael), sneakAttackDice(sorael3), climbSpeed(sorael), climbSpeed(sorael3)], ['1d6', '2d6', 0, 35], 'and a Thief climbs at their Speed');
});

test('Creation: a Rogue picks four skills, Expertise in two skills they have, and two weapons to master', () => {
  let d = creation.chooseSpecies(creation.chooseBackground(creation.chooseClass(creation.emptyDraft(), 'rogue'), 'criminal'), 'halfling');
  assertEqual(creation.expertisePicks(d), { count: 2, from: ['sleight-of-hand', 'stealth'], chosen: [] }, 'the Criminal’s skills, to start with');
  for (const id of ['acrobatics', 'perception', 'deception', 'insight']) d = creation.toggleSkill(d, 'class', id);
  d = creation.toggleExpertise(creation.toggleExpertise(d, 'perception'), 'stealth');
  assertEqual(creation.stepProblems(d, 'skills'), []);
  assertEqual(creation.toggleExpertise(d, 'deception'), d, 'two at most');
  d = creation.toggleSkill(d, 'class', 'perception');
  assertEqual(d.classChoices.expertise, ['stealth'], 'no Expertise without proficiency');
  assertEqual(creation.stepProblems(d, 'skills'), ['Choose 4 Rogue skills (3 chosen).', 'Choose 2 skills for Expertise (1 chosen).']);
  d = creation.prepareStep(d, 'equipment');
  const masteries = creation.masteryPicks(d);
  assertEqual([masteries.count, masteries.chosen], [2, ['dagger', 'shortsword']], 'the kit’s weapons are suggested');
  assertTrue(masteries.from.includes('scimitar') && !masteries.from.includes('longbow'));
  assertTrue(validateCharacter({ ...sorael, classChoices: { ...sorael.classChoices, expertise: ['stealth', 'arcana'] } }).includes('Choose 2 different skills you’re proficient in for Expertise.'));
});

test('Sneak Attack: a hit with Advantage and a Finesse weapon adds 1d6, once a turn', () => {
  const { game, goblin } = rogueDuel(sorael);
  assertEqual(fight.attackPreview(game, 'shortsword-melee', goblin.id).sneak, null, 'no Advantage, no ally: no Sneak Attack');
  game.battle.effects.push({ kind: 'prone', target: goblin.id, endsOn: null });
  assertEqual(fight.attackPreview(game, 'shortsword-melee', goblin.id).sneak, '1d6', 'Advantage on a Prone foe within 5 feet');
  forceNextD20(18);
  fight.heroAttack(game, 'shortsword-melee', goblin.id);
  assertTrue(lastHit(game).text.includes('+ Sneak Attack 1d6 ('), lastHit(game).text);
  // The Dagger's Nick: the extra attack is part of the Attack action. It has Advantage (Prone,
  // and Vex from the Shortsword), but Sneak Attack is spent for this turn.
  forceNextD20(18);
  fight.heroAttack(game, 'dagger-melee-extra', goblin.id);
  assertTrue(lastHit(game).roll.mode === 'advantage' && !lastHit(game).text.includes('Sneak Attack'), lastHit(game).text);
  const crit = rollDamage(createRng('crit'), { dice: '1d6', bonus: 3, type: 'piercing' }, { critical: true, sneak: '1d6' });
  assertEqual([crit.sneak.dice, crit.sneak.rolls.length], ['2d6', 2], 'a Critical Hit doubles the Sneak Attack dice too');
});

test('Cunning Action: Dash and Disengage as a Bonus Action, from Rogue level 2', () => {
  const first = rogueDuel(sorael).game;
  assertThrows(() => fight.heroDash(first, { bonus: true }), 'not at level 1');
  const { game } = rogueDuel(sorael2);
  fight.heroDash(game, { bonus: true });
  assertEqual([game.battle.turnState.movementLeft, game.battle.turnState.bonus, game.battle.turnState.action], [70, true, false], 'Speed 35, twice');
  assertThrows(() => fight.heroDisengage(game, { bonus: true }), 'one Bonus Action a turn');
  fight.heroDisengage(game);
  assertTrue(game.battle.turnState.disengaged && game.battle.turnState.action, 'Disengage as the action, too');
});

test('Level-up: a Rogue gains Cunning Action at 2, then the Thief, Steady Aim and 2d6 Sneak Attack at 3', () => {
  const game = gameFor(sorael, 900);
  levelWith(game);
  assertEqual([game.character.level, maxHitPoints(game.character).value], [2, 17], '8 + 2, then 5 + 2');
  levelWith(game, { subclass: 'thief' });
  const hero = game.character;
  assertEqual([hero.level, hero.subclassId, sneakAttackDice(hero), validateCharacter(hero)], [3, 'thief', '2d6', []]);
  assertEqual(hero.classChoices, sorael.classChoices, 'Expertise and Weapon Mastery carry on');
});

test('Cunning Action: Hide as a Bonus Action, then shoot with Advantage for Sneak Attack', () => {
  const { game, goblin } = rogueDuel(sorael2);
  goblin.pos = { x: 3, y: 6 };
  fight.heroCombatant(game.battle).pos = { x: 3, y: 2 }; // behind the mill's barrel
  forceNextD20(10);
  fight.heroHide(game, { bonus: true });
  const roll = game.battle.log[game.battle.log.length - 1].roll;
  assertEqual([roll.total, roll.disadvantage, game.battle.turnState.bonus, game.battle.turnState.action], [17, [], true, false], '10 + Stealth +7 (Expertise), no noise in leather');
  fight.heroMove(game, { x: 4, y: 2 }); // out from behind the barrel: still hidden until found
  const preview = fight.attackPreview(game, 'shortbow-ranged', goblin.id);
  assertEqual([preview.advantage, preview.sneak], [['You’re hidden'], '1d6']);
  forceNextD20(15);
  fight.heroAttack(game, 'shortbow-ranged', goblin.id);
  assertTrue(game.battle.log.some((e) => e.text.includes('+ Sneak Attack 1d6')), 'a hidden shot gets Sneak Attack');
});

test('Steady Aim: Advantage on the next attack, if the Rogue hasn’t moved; Speed 0 afterwards', () => {
  const { game, goblin } = rogueDuel(sorael3);
  goblin.pos = { x: 3, y: 6 };
  assertTrue(fight.heroCanSteadyAim(game));
  fight.heroSteadyAim(game);
  assertEqual(game.battle.turnState.movementLeft, 0);
  const preview = fight.attackPreview(game, 'shortbow-ranged', goblin.id);
  assertEqual([preview.advantage, preview.sneak], [['Steady Aim'], '2d6']);
  fight.heroAttack(game, 'shortbow-ranged', goblin.id);
  assertEqual([lastHit(game).roll.mode, fight.attackPreview(game, 'shortbow-ranged', goblin.id).advantage], ['advantage', []], 'used up by the attack');
  fight.endHeroTurn(game);
  const moved = rogueDuel(sorael3).game;
  fight.heroMove(moved, { x: 2, y: 1 });
  assertTrue(!fight.heroCanSteadyAim(moved), 'not after moving');
  assertThrows(() => fight.heroSteadyAim(moved));
});

test('Rogue scenes: Thieves’ Tools open the postern; a Rogue reads the thieves’ chalk marks', async () => {
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  const choiceWith = (game, words) => game.story.currentChoices.find((c) => c.text.includes(words)) || null;
  const rogue = newGame(runtime, { slot: 1, seed: 'rogue-scenes', character: sorael });
  forceNextD20(15);
  rogue.page = makeChoice(rogue, choiceWith(rogue, 'postern'));
  assertTrue(rogue.flags.includes('picked_the_postern'), 'Dex +3, Proficiency +2 and a 15');
  rogue.page = jumpTo(rogue, 'notice_board');
  rogue.page = makeChoice(rogue, choiceWith(rogue, 'chalk marks'));
  assertTrue(rogue.flags.includes('read_cant_marks'));
  const cleric = newGame(runtime, { slot: 2, seed: 'rogue-scenes', character: posy });
  assertEqual(choiceWith(cleric, 'postern'), null, 'no Thieves’ Tools, no postern');
  cleric.page = jumpTo(cleric, 'notice_board');
  assertEqual(choiceWith(cleric, 'chalk marks'), null);
});

// ---- Companions ----

test('Companions: Odda and Fen are legal characters at every level, levelling with the hero', () => {
  for (const id of ['odda', 'fen']) {
    for (const level of [1, 2, 3]) assertEqual(validateCharacter(companionCharacter(id, level)), [], `${id} at level ${level}`);
  }
  const odda = companionCharacter('odda', 3);
  assertEqual([odda.subclassId, domainSpells(odda).includes('cure-wounds'), maxHitPoints(odda).value], ['life', true, 24], 'Life Domain at 3; 8 + 5 + 5, Con +1 and Dwarven Toughness +1 a level');
  assertEqual([companionCharacter('fen', 3).subclassId, companionCharacter('fen', 9).level], ['thief', 3], 'no higher than the rules data goes');
});

test('Party: up to two companions join with full Hit Points and their kit; rests and levels carry them along', () => {
  const game = gameFor(posy);
  game.party = [];
  const odda = joinParty(game, 'odda');
  assertEqual([odda.hp, odda.tactic, odda.approval, odda.inventory.some((e) => e.id === 'mace')], [10, 'support', 0, true]);
  joinParty(game, 'fen');
  assertThrows(() => joinParty(game, 'brakka'), 'no such companion yet');
  assertEqual(game.party.map((m) => m.id), ['odda', 'fen']);
  approve(game, 'fen', 1);
  setTactic(game, 'fen', 'defensive');
  assertEqual([memberOf(game, 'fen').approval, memberOf(game, 'fen').tactic], [1, 'defensive']);
  odda.hp = 3;
  odda.slotsUsed = [2];
  partyLongRest(game);
  assertEqual([odda.hp, odda.slotsUsed], [10, []]);
  // The hero reaches level 2, and so do they.
  game.character = { ...game.character, level: 2, hitPointRolls: [null], spells: { ...posy.spells, prepared: [...posy.spells.prepared, 'detect-magic'] } };
  partyLevelUp(game, 1);
  assertEqual([odda.hp, memberMaxHp(game, odda)], [17, 17]);
  assertEqual(partyProblems(game.party), []);
  leaveParty(game, 'fen');
  assertEqual(game.party.map((m) => m.id), ['odda']);
});

run(document.getElementById('summary'), document.getElementById('results'));

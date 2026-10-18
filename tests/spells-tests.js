// Spell checks: areas of effect, the Wizard's spells in a fight, Concentration, Shield, the
// spells a hero casts on themselves, the Cleric and Druid spells Magic Initiate gives, Hellish
// Rebuke, and spells in scenes. Open tests/spells.html through the local server to run them.
// Add checks here whenever a spell's rules change.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { parseMap } from '../js/engine/combat/grid.js';
import { areaSquares, directionTowards } from '../js/engine/combat/areas.js';
import { heroAttackOptions } from '../js/engine/combat/attacks.js';
import * as fight from '../js/engine/combat/battle.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { freshResources, longRestRecovery, maxHp } from '../js/engine/character/resources.js';
import { activeSpellIds, castFromSheet, sheetSpellProblem, sheetSpells, timePasses } from '../js/engine/character/spell-effects.js';
import { freeCastKey } from '../js/engine/character/spells.js';
import { takeDamage } from '../js/engine/character/hazards.js';
import { armorClass, speed } from '../js/engine/character/sheet.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { attackSummary } from '../js/engine/ui/attack-text.js';
import { castInScene, sceneCastCost } from '../js/engine/character/casting.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { jumpTo, makeChoice } from '../js/engine/story/story-runner.js';
import { newGame } from '../js/engine/save/save-format.js';
import { spells } from '../data/srd/spells.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';
import { companionCharacter, joinParty, memberOf } from '../js/engine/character/party.js';

const wren = quickStartHeroes.find((h) => h.id === 'wren').character;
const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;

// Juniper at level 3 with every Wizard spell these checks need prepared (Int 17: spell save
// DC 13, spell attack +5; AC 11 without armour).
const caster = {
  ...juniper,
  level: 3,
  subclassId: 'evoker',
  classChoices: { scholarSkill: 'arcana' },
  hitPointRolls: [null, null],
  spells: {
    cantrips: juniper.spells.cantrips,
    spellbook: ['burning-hands', 'false-life', 'hold-person', 'longstrider', 'mage-armor', 'misty-step', 'ray-of-sickness', 'shatter', 'shield', 'sleep'],
    prepared: ['burning-hands', 'false-life', 'hold-person', 'longstrider', 'mage-armor', 'misty-step', 'ray-of-sickness', 'shatter', 'shield', 'sleep'],
  },
};

function gameFor(character, seed = 'spells') {
  return { character, rng: createRng(seed), ...startingInventory(character), ...freshResources(character), battle: null, lastBattle: null, pending: [] };
}

// A fight with the hero going first. In the mill cellar the hero starts at (3, 1), there's a
// barrel at (3, 3) and flour sacks at (1, 1) and (6, 1).
function fightWith(character, encounterId = 'mill-scavengers') {
  const game = gameFor(character);
  const dice = game.rng;
  game.rng = scriptedRng([20, 1, 1, 1, 1, 1, 1, 1]); // Initiative: the hero rolls 20, every foe 1
  fight.startBattle(game, encounterId, 0);
  game.rng = dice;
  return game;
}

// The mill fight with one goblin standing where a check wants it and the other out of it.
function oneGoblin(pos, hp = 40) {
  const game = fightWith(caster);
  const [goblin, other] = fight.enemies(game.battle);
  goblin.pos = { ...pos };
  goblin.hp = hp;
  other.hp = 0;
  return { game, goblin };
}

const said = (game, text) => game.battle.log.some((e) => e.text.includes(text));
const has = (game, c, condition) => fight.conditionsOf(game.battle, c.id).includes(condition);

// ---- Areas of effect ----

const legend = { '#': { terrain: 'wall' }, '.': { terrain: 'floor' } };
const open = parseMap(Array(9).fill('.........'), legend);
const middle = { x: 4, y: 4 };

test('Areas: a 15-foot Cone is 1, 3 and 3 squares ahead (7 on a diagonal too), never your own square', () => {
  const north = areaSquares(open, { shape: 'cone', size: 15 }, middle, 'n');
  assertEqual(north.map((s) => `${s.x},${s.y}`).sort(), ['3,1', '3,2', '4,1', '4,2', '4,3', '5,1', '5,2']);
  assertEqual(areaSquares(open, { shape: 'cone', size: 15 }, middle, 'ne').length, 7);
});

test('Areas: a 15-foot Cube is a 3 × 3 block beside you; a Sphere is every square within its radius', () => {
  const east = areaSquares(open, { shape: 'cube', size: 15 }, middle, 'e');
  assertEqual([east.length, east.every((s) => s.x >= 5 && s.x <= 7 && s.y >= 3 && s.y <= 5)], [9, true]);
  assertEqual(areaSquares(open, { shape: 'cube', size: 15 }, middle, 'sw').length, 9);
  assertEqual([areaSquares(open, { shape: 'sphere', size: 5 }, middle).length, areaSquares(open, { shape: 'sphere', size: 10 }, middle).length], [9, 25]);
});

test('Areas: a Cube placed on a square (Faerie Fire’s 20 feet) is a 4 × 4 block around it', () => {
  const placed = areaSquares(open, { shape: 'cube', size: 20 }, middle);
  assertEqual([placed.length, placed.every((s) => s.x >= 3 && s.x <= 6 && s.y >= 3 && s.y <= 6)], [16, true]);
});

test('Areas: walls block an area, and tapping a square aims at the nearest of eight directions', () => {
  const walled = parseMap(['.....', '.....', '#####', '.....', '.....'], legend);
  assertEqual(areaSquares(walled, { shape: 'cone', size: 15 }, { x: 2, y: 4 }, 'n'), [{ x: 2, y: 3 }], 'nothing past the wall');
  assertEqual([directionTowards(middle, { x: 7, y: 3 }).id, directionTowards(middle, { x: 2, y: 2 }).id], ['e', 'nw']);
});

// ---- Area spells ----

test('Burning Hands: damage is rolled once; a failed Dexterity save takes it all, a success half', () => {
  const game = fightWith(caster);
  const [first, second] = fight.enemies(game.battle);
  first.pos = { x: 3, y: 2 };
  second.pos = { x: 4, y: 3 };
  first.hp = 30;
  second.hp = 30;
  game.rng = scriptedRng([6, 6, 6, 1, 20]); // 3d6 = 18; the first goblin rolls 1, the second 20
  const { caught } = fight.areaFor(game, 'spell-burning-hands', { direction: 's' });
  assertEqual(caught.map((c) => c.id), [first.id, second.id], 'the hero is never in their own cone');
  fight.heroCastArea(game, 'spell-burning-hands', { direction: 's' });
  assertEqual([first.hp, second.hp, game.slotsUsed[0], game.battle.turnState.action], [12, 21, 1, true]);
  assertTrue(said(game, 'fails the Dexterity save and takes 18 fire damage') && said(game, 'takes half: 9 fire damage'));
});

test('Thunderwave: a failed Constitution save throws a foe back, until something is in the way', () => {
  const { game, goblin } = oneGoblin({ x: 4, y: 1 });
  game.rng = scriptedRng([1, 1, 1]); // 2d8 = 2, then a save of 1
  fight.heroCastArea(game, 'spell-thunderwave', { direction: 'e' });
  assertEqual([goblin.hp, goblin.pos], [38, { x: 5, y: 1 }], 'only 5 feet: a flour sack stops it');
  assertTrue(said(game, 'is thrown back 5 feet'));
});

test('Shatter: a sphere centred within 60 feet; you can catch yourself, and the suggested aim never does', () => {
  const { game, goblin } = oneGoblin({ x: 3, y: 2 });
  const near = fight.areaFor(game, 'spell-shatter', { at: { x: 3, y: 3 } });
  assertTrue(near.caught.some((c) => c.side === 'hero'), 'the hero stands within 10 feet of that square');
  const aim = fight.suggestAim(game, 'spell-shatter');
  const best = fight.areaFor(game, 'spell-shatter', aim);
  assertTrue(best.caught.includes(goblin) && !best.caught.some((c) => c.side === 'hero'), JSON.stringify(aim));
  assertThrows(() => fight.areaFor(game, 'spell-shatter', { at: { x: 0, y: 3 } }), 'not inside a wall');
});

// ---- Sleep, Concentration and the helpless ----

test('Sleep: a failed Wisdom save leaves a foe drowsy, then asleep (Unconscious and Prone) after a second', () => {
  const { game, goblin } = oneGoblin({ x: 3, y: 4 });
  forceNextD20(1);
  fight.heroCastArea(game, 'spell-sleep', { at: { x: 3, y: 4 } });
  assertTrue(has(game, goblin, 'drowsy') && fight.isIncapacitated(game.battle, goblin.id));
  assertEqual(game.battle.concentration.name, 'Sleep');
  forceNextD20(1); // its save at the end of its next turn
  fight.endHeroTurn(game);
  assertTrue(said(game, 'too drowsy to act') && has(game, goblin, 'asleep') && fight.isProne(game.battle, goblin.id));
  // Unconscious gives Advantage; it's also Prone, and from more than 5 feet away that gives
  // Disadvantage, so a Fire Bolt from across the room is a plain roll.
  const preview = fight.attackPreview(game, 'spell-fire-bolt', goblin.id);
  assertEqual([preview.advantage, preview.disadvantage, preview.mode], [['Goblin Minion 1 is Unconscious'], ['Goblin Minion 1 is Prone, and more than 5 feet away'], 'normal']);
});

test('Sleep: the asleep fail Dexterity saves; damage wakes them, and a spell with nobody left ends', () => {
  const { game, goblin } = oneGoblin({ x: 3, y: 4 });
  forceNextD20(1);
  fight.heroCastArea(game, 'spell-sleep', { at: { x: 3, y: 4 } });
  forceNextD20(1);
  fight.endHeroTurn(game);
  fight.heroCastArea(game, 'spell-burning-hands', { direction: 's' });
  assertTrue(said(game, "can't move to save itself") && said(game, 'wakes with a start'));
  assertTrue(!has(game, goblin, 'asleep') && fight.isProne(game.battle, goblin.id), 'awake, but still on the ground');
  assertEqual(game.battle.concentration, null);
});

test('Sleep: the dead don’t sleep, and an awake goblin shakes its sleeping friend', () => {
  const zombies = fightWith(caster, 'lower-dead');
  const zombie = fight.enemies(zombies.battle)[0];
  fight.heroCastArea(zombies, 'spell-sleep', { at: zombie.pos });
  assertTrue(said(zombies, 'never sleeps') && !fight.isIncapacitated(zombies.battle, zombie.id));

  const game = fightWith(caster);
  const [sleeper, friend] = fight.enemies(game.battle);
  sleeper.pos = { x: 3, y: 5 };
  friend.pos = { x: 4, y: 6 };
  game.battle.order = ['hero', friend.id, sleeper.id];
  forceNextD20(1);
  fight.heroCastArea(game, 'spell-sleep', { at: { x: 3, y: 5 } }); // the friend at (4, 6) is caught too…
  game.battle.effects = game.battle.effects.filter((e) => e.target !== friend.id); // …but shook it off
  fight.endHeroTurn(game);
  assertTrue(said(game, `${friend.name} shakes ${sleeper.name} awake`) && !fight.isIncapacitated(game.battle, sleeper.id));
});

test('Concentration: damage means a Constitution save, and failing it ends Sleep', () => {
  const game = fightWith(caster);
  const [sleeper, biter] = fight.enemies(game.battle);
  sleeper.pos = { x: 3, y: 4 };
  biter.pos = { x: 3, y: 2 };
  game.battle.order = ['hero', biter.id, sleeper.id];
  forceNextD20(1);
  fight.heroCastArea(game, 'spell-sleep', { at: { x: 3, y: 4 } });
  // The biter hits (18), for 4; Juniper's Constitution save is a 1; then plenty of spare faces.
  game.rng = scriptedRng([18, 4, 1, 1, 1, 1, 1, 1, 1, 1]);
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Your concentration breaks: Sleep ends.'), game.battle.log.map((e) => e.text).join(' / '));
  assertEqual([game.battle.concentration, fight.isIncapacitated(game.battle, sleeper.id)], [null, false]);
});

test('Hold Person: only Humanoids; a Paralyzed singer stops the hymn, and attacks on it have Advantage', () => {
  const mill = fightWith(caster);
  const goblin = fight.enemies(mill.battle)[0];
  assertEqual(fight.attackPreview(mill, 'spell-hold-person', goblin.id).invalid, 'Not a Humanoid', 'goblins are Fey');
  assertThrows(() => fight.heroAttack(mill, 'spell-hold-person', goblin.id));

  const game = fightWith(caster, 'breach-hymn');
  const singer = fight.enemies(game.battle).find((c) => c.monsterId === 'cultist');
  forceNextD20(1);
  fight.heroAttack(game, 'spell-hold-person', singer.id);
  assertTrue(has(game, singer, 'paralyzed') && !game.battle.hymn.singing && said(game, 'The hymn falters'));
  assertEqual([game.battle.concentration.name, fight.attackPreview(game, 'spell-fire-bolt', singer.id).mode], ['Hold Person', 'advantage']);
});

test('Ray of Sickness: Poisoned until the end of your next turn (Disadvantage on its attacks); not the dead', () => {
  const { game, goblin } = oneGoblin({ x: 3, y: 4 });
  forceNextD20(15);
  fight.heroAttack(game, 'spell-ray-of-sickness', goblin.id);
  assertTrue(has(game, goblin, 'poisoned'));
  fight.endHeroTurn(game);
  const bite = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith(goblin.name)).pop();
  assertTrue(bite.roll.disadvantage.includes('Goblin Minion 1 is Poisoned'), 'its attack');
  assertTrue(has(game, goblin, 'poisoned'), 'still Poisoned during your next turn');
  fight.endHeroTurn(game);
  assertTrue(!has(game, goblin, 'poisoned'), 'gone at the end of it');

  const zombies = fightWith(caster, 'lower-dead');
  const zombie = fight.enemies(zombies.battle)[0];
  forceNextD20(15);
  fight.heroAttack(zombies, 'spell-ray-of-sickness', zombie.id);
  assertTrue(said(zombies, 'immune to poison damage') && !has(zombies, zombie, 'poisoned'));
});

// ---- Shield, Misty Step, and one spell slot a turn ----

test('Shield: cast for you when +5 AC turns a hit into a miss, never when it wouldn’t help', () => {
  const { game } = oneGoblin({ x: 3, y: 2 });
  forceNextD20(10); // 14 hits AC 11, misses AC 16
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Shield!') && said(game, 'and misses'), game.battle.log.map((e) => e.text).join(' / '));
  assertEqual([game.hp, game.slotsUsed[0]], [maxHp(caster), 1]);

  const big = oneGoblin({ x: 3, y: 2 }).game;
  forceNextD20(19); // 23 would hit AC 16 anyway
  fight.endHeroTurn(big);
  assertTrue(!said(big, 'Shield!') && !big.slotsUsed[0], 'the slot is kept');

  fight.setReactionPolicy({ shield: false });
  const off = oneGoblin({ x: 3, y: 2 }).game;
  forceNextD20(10);
  fight.endHeroTurn(off);
  fight.setReactionPolicy({ shield: true });
  assertTrue(!said(off, 'Shield!'), 'turned off in Settings');
});

test('Misty Step: a Bonus Action teleport to an empty square you can see; then no more spell slots that turn', () => {
  const { game } = oneGoblin({ x: 3, y: 2 });
  assertTrue(fight.teleportSquares(game, 'spell-misty-step').some((s) => s.x === 1 && s.y === 6));
  assertThrows(() => fight.heroTeleport(game, 'spell-misty-step', { x: 6, y: 1 }), 'a flour sack is in that square');
  fight.heroTeleport(game, 'spell-misty-step', { x: 1, y: 6 });
  const turn = game.battle.turnState;
  assertEqual([fight.heroCombatant(game.battle).pos, turn.bonus, turn.action, game.slotsUsed[1]], [{ x: 1, y: 6 }, true, false, 1]);
  assertTrue(!said(game, 'Opportunity Attack'), 'teleporting provokes nothing');
  assertThrows(() => fight.heroCastArea(game, 'spell-burning-hands', { direction: 'n' }), 'one spell slot a turn');
  assertTrue(fight.heroCantUse(game, 'spell-fire-bolt') === null, 'a cantrip is still fine');
});

test('Free casts: Magic Initiate’s Thunderwave once per Long Rest without a slot, then with slots', () => {
  const game = fightWith(juniper);
  assertTrue(heroAttackOptions(game).some((o) => o.id === 'spell-thunderwave-free'));
  fight.heroCastArea(game, 'spell-thunderwave-free', { direction: 's' });
  assertEqual([game.slotsUsed[0] || 0, game.featureUses[freeCastKey('thunderwave')], game.battle.turnState.slotSpent], [0, 1, false]);
  assertTrue(!heroAttackOptions(game).some((o) => o.id === 'spell-thunderwave-free') && heroAttackOptions(game).some((o) => o.id === 'spell-thunderwave'));
  longRestRecovery(game);
  assertTrue(heroAttackOptions(game).some((o) => o.id === 'spell-thunderwave-free'), 'back after a Long Rest');
});

// ---- Spells on yourself ----

test('Mage Armor: AC 13 + Dex until a Long Rest, and only without armour', () => {
  const game = gameFor(caster);
  castFromSheet(game, 'mage-armor', 1);
  assertEqual([armorClass(caster, activeSpellIds(game)).value, game.slotsUsed[0]], [14, 1]);
  assertTrue(sheetSpellProblem(gameFor({ ...caster, armorId: 'leather-armor' }), 'mage-armor', 1).includes('armour'));
  longRestRecovery(game);
  assertEqual(game.activeSpells, []);
});

test('False Life: Temporary Hit Points that don’t stack, and soak damage first, even from a trap', () => {
  const game = gameFor(caster);
  game.rng = scriptedRng([4, 4, 1, 1, 5]);
  castFromSheet(game, 'false-life', 1); // 2d4 (4, 4) + 4 = 12
  castFromSheet(game, 'false-life', 1); // 2d4 (1, 1) + 4 = 6: keep the 12
  assertEqual(game.tempHp, 12);
  const full = game.hp;
  takeDamage(game, '1d6', 'bludgeoning'); // 5
  assertEqual([game.hp, game.tempHp], [full, 7]);
  assertEqual(attackSummary(heroAttackOptions(fightWith(caster)).find((o) => o.id === 'spell-false-life-2')).join(' · ').includes('2d4 + 9'), true, 'a level 2 slot adds 5');
});

test('Longstrider: Speed +10 feet, until the time of day moves on; in a fight, faster that very turn', () => {
  const game = gameFor(caster);
  const before = speed(caster).value;
  castFromSheet(game, 'longstrider', 1);
  assertEqual(speed(caster, activeSpellIds(game)).value, before + 10);
  assertEqual(timePasses(game), ['Longstrider']);
  assertEqual(activeSpellIds(game), []);

  const { game: battling } = oneGoblin({ x: 3, y: 6 });
  const left = battling.battle.turnState.movementLeft;
  fight.heroCastSelf(battling, 'spell-longstrider');
  assertEqual(battling.battle.turnState.movementLeft, left + 10);
});

test('Longstrider on a companion from the Sheet, until the hour is up; Mage Armor needs someone unarmoured', () => {
  const game = gameFor(caster);
  joinParty(game, 'odda');
  joinParty(game, 'fen');
  assertEqual(sheetSpellProblem(game, 'mage-armor', 1, 'odda'), 'Odda is wearing armour.');
  assertEqual(sheetSpellProblem(game, 'false-life', 1, 'fen'), 'False Life only works on you.');
  const before = speed(companionCharacter('fen', 3)).value;
  assertEqual(castFromSheet(game, 'longstrider', 1, 'fen'), `Longstrider: Fen's Speed is now ${before + 10} feet, for about an hour.`);
  assertEqual(sheetSpellProblem(game, 'longstrider', 1, 'fen'), 'Longstrider is already on Fen.');
  assertEqual(timePasses(game), ['Longstrider on Fen']);
  assertEqual(memberOf(game, 'fen').activeSpells, []);
});

test('Spell buttons say what each spell does', () => {
  const options = heroAttackOptions(fightWith(caster));
  const text = (id) => attackSummary(options.find((o) => o.id === id)).join(' · ');
  assertEqual(text('spell-burning-hands'), 'Dex save against DC 13 · 3d6 fire · 10.5 on average · half on a save · 15-ft cone from you · uses a level 1 slot');
  assertEqual(text('spell-sleep'), 'Wis save against DC 13 · drowsy, then asleep · 5-ft-radius sphere within 60 ft · Concentration · uses a level 1 slot');
  assertEqual(text('spell-hold-person'), 'Wis save against DC 13 · Paralyzed · a Humanoid within 60 ft · Concentration · uses a level 2 slot');
  assertEqual(text('spell-misty-step'), 'Bonus Action · teleport up to 30 ft to a square you can see · uses a level 2 slot');
  assertEqual(text('spell-mage-armor'), 'your AC becomes 13 + Dex until your next Long Rest · uses a level 1 slot');
  assertEqual(text('spell-burning-hands-2').includes('4d6 fire · 14 on average'), true, 'a level 2 slot adds a die');
});

// ---- The Cleric and Druid spells (Magic Initiate), and Hellish Rebuke ----

// Wren with Magic Initiate (Cleric) and its one level 1 spell, cast with Charisma (13: +1,
// so spell save DC 11 and spell attack +3). A Fighter has no slots: the spell is free once
// per Long Rest.
const initiate = (spell, list = 'cleric') => ({
  ...wren,
  magicInitiate: [{ source: 'background', list, ability: 'charisma', cantrips: list === 'cleric' ? ['guidance', 'sacred-flame'] : ['druidcraft', 'guidance'], spell }],
});
// The level 3 Wizard with Magic Initiate (Cleric) too, with Wisdom (14: +2): the spell is free
// once, then takes her slots.
const clericWizard = (spell) => ({ ...caster, magicInitiate: [{ source: 'background', list: 'cleric', ability: 'wisdom', cantrips: ['guidance', 'sacred-flame'], spell }] });

// The mill fight with one goblin (AC 12, Wis save −1, Dagger +4 for 1d4 + 2) where a check
// wants it, and the other out of it.
function soloGoblin(character, pos, hp = 40) {
  const game = fightWith(character);
  const [goblin, other] = fight.enemies(game.battle);
  goblin.pos = { ...pos };
  goblin.hp = hp;
  other.hp = 0;
  return { game, goblin };
}
const swordOf = (game) => heroAttackOptions(game).find((o) => o.source === 'weapon' && o.how === 'melee');
const lastRoll = (game, kind) => game.battle.log.filter((e) => e.roll && e.roll.kind === kind).pop().roll;

test('Cure Wounds: 2d8 + your spellcasting modifier from the Sheet; a higher slot heals more, a full one can’t', () => {
  const game = gameFor(clericWizard('cure-wounds'));
  game.hp = 5;
  assertEqual(sheetSpells(game).find((c) => c.spell.id === 'cure-wounds').slots, ['free', 1, 2]);
  assertEqual(sheetSpells(game).find((c) => c.spell.id === 'mage-armor').slots, [1], 'a higher slot does nothing more for Mage Armor');
  game.rng = scriptedRng([3, 5]);
  assertEqual(castFromSheet(game, 'cure-wounds', 'free'), 'Cure Wounds: 2d8 (3, 5) + 2 = 10. You regain 10 Hit Points.');
  game.rng = scriptedRng([8, 8, 8, 8]);
  assertTrue(castFromSheet(game, 'cure-wounds', 2).startsWith('Cure Wounds: 4d8 (8, 8, 8, 8) + 2 = 34. You regain 5'), 'up to the maximum');
  assertEqual([game.hp, game.slotsUsed[1]], [maxHp(game.character), 1]);
  assertTrue(sheetSpellProblem(game, 'cure-wounds', 1).includes('full Hit Points'));
  const fighter = gameFor(initiate('cure-wounds'));
  const why = () => sheetSpells(fighter).find((c) => c.spell.id === 'cure-wounds').problem;
  assertTrue(why().includes('full Hit Points'), `a Fighter has no slots, but that's not why: ${why()}`);
  fighter.featureUses[freeCastKey('cure-wounds')] = 1;
  fighter.hp = 1;
  assertTrue(why().includes('no free casts'), why());
});

test('Healing Word: a Bonus Action in a fight, so the action is still free; not at full Hit Points', () => {
  const { game } = soloGoblin(initiate('healing-word'), { x: 3, y: 2 });
  assertTrue(fight.heroCantUse(game, 'spell-healing-word-free').includes('full Hit Points'));
  game.hp = 3;
  game.rng = scriptedRng([2, 3]);
  fight.heroCastSelf(game, 'spell-healing-word-free');
  assertEqual([game.hp, game.battle.turnState.bonus, game.battle.turnState.action], [9, true, false]);
  assertTrue(said(game, 'You cast Healing Word: 2d4 (2, 3) + 1 = 6. You regain 6 Hit Points.'));
  assertTrue(fight.heroCantUse(game, swordOf(game).id) === null && !heroAttackOptions(game).some((o) => o.spellId === 'healing-word'), 'the free cast is spent');
});

test('Bless: 1d4 on your attack rolls and saving throws while you concentrate', () => {
  const { game, goblin } = soloGoblin(initiate('bless'), { x: 3, y: 2 });
  fight.heroCastSelf(game, 'spell-bless-free');
  assertEqual([game.battle.concentration.name, fight.conditionsOf(game.battle, 'hero')], ['Bless', ['blessed']]);
  assertTrue(fight.heroCantUse(game, 'spell-bless-free') !== null);
  game.battle.turnState.action = false; // as if it were the next turn
  assertTrue(fight.attackPreview(game, swordOf(game).id, goblin.id).describe.includes('+ 1d4 (Bless)'));
  fight.heroAttack(game, swordOf(game).id, goblin.id);
  const bless = lastRoll(game, 'attack').modifiers.find((m) => m.label === 'Bless');
  assertTrue(bless && bless.value >= 1 && bless.value <= 4, JSON.stringify(lastRoll(game, 'attack').modifiers));
  // The goblin hits (18) for 3; the Concentration save adds 1d4 too.
  game.rng = scriptedRng([18, 1, 2, 10, 1, 1, 1, 1]);
  fight.endHeroTurn(game);
  assertTrue(lastRoll(game, 'save').modifiers.some((m) => m.label === 'Bless'), 'the Concentration save');
});

test('Sanctuary: a foe must make a Wisdom save to attack you; it ends when you attack', () => {
  const { game, goblin } = soloGoblin(initiate('sanctuary'), { x: 3, y: 2 });
  fight.heroCastSelf(game, 'spell-sanctuary-free');
  assertEqual([game.battle.turnState.bonus, game.battle.turnState.action], [true, false]);
  const full = game.hp;
  forceNextD20(1); // the goblin's Wisdom save
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Sanctuary turns it aside') && game.hp === full, game.battle.log.map((e) => e.text).join(' / '));
  assertEqual(lastRoll(game, 'save').target, { type: 'DC', value: 11 });
  fight.heroAttack(game, swordOf(game).id, goblin.id);
  assertTrue(said(game, 'Your Sanctuary ends: you attack.') && !fight.conditionsOf(game.battle, 'hero').includes('sanctuary'));
});

test('Guiding Bolt: 4d6 radiant, and the next attack roll against the target has Advantage', () => {
  const { game, goblin } = soloGoblin(initiate('guiding-bolt'), { x: 3, y: 6 });
  forceNextD20(15);
  fight.heroAttack(game, 'spell-guiding-bolt-free', goblin.id);
  assertTrue(said(game, 'Guiding Bolt (free) hits Goblin Minion 1: 4d6') && has(game, goblin, 'guided'));
  fight.endHeroTurn(game); // the goblin comes over and stabs; it's still glowing on your turn
  goblin.pos = { x: 3, y: 2 };
  assertTrue(has(game, goblin, 'guided'));
  fight.heroAttack(game, swordOf(game).id, goblin.id);
  assertEqual(lastRoll(game, 'attack').advantage, ['Goblin Minion 1 is lit by Guiding Bolt']);
  assertTrue(!has(game, goblin, 'guided'), 'used up by that roll');
  assertTrue(attackSummary(heroAttackOptions(fightWith(clericWizard('guiding-bolt'))).find((o) => o.id === 'spell-guiding-bolt-2')).join(' · ').includes('5d6 radiant'), 'a level 2 slot adds a die');
});

test('Faerie Fire: a 20-foot Cube; a failed Dexterity save outlines a foe, and attacks on it have Advantage', () => {
  const druidWizard = { ...caster, magicInitiate: [{ source: 'background', list: 'druid', ability: 'intelligence', cantrips: ['druidcraft', 'guidance'], spell: 'faerie-fire' }] };
  const { game, goblin } = soloGoblin(druidWizard, { x: 3, y: 5 });
  const ids = heroAttackOptions(game).filter((o) => o.spellId === 'faerie-fire').map((o) => o.id);
  assertEqual(ids, ['spell-faerie-fire-free', 'spell-faerie-fire'], 'no higher slots: they would do nothing more');
  const aim = fight.suggestAim(game, 'spell-faerie-fire-free');
  assertTrue(fight.areaFor(game, 'spell-faerie-fire-free', aim).caught.every((c) => c.side !== 'hero'));
  forceNextD20(1);
  fight.heroCastArea(game, 'spell-faerie-fire-free', { at: { x: 3, y: 5 } });
  assertTrue(has(game, goblin, 'outlined') && game.battle.concentration.name === 'Faerie Fire');
  assertEqual(fight.attackPreview(game, 'spell-fire-bolt', goblin.id).advantage, ['Goblin Minion 1 is outlined by Faerie Fire']);
  assertEqual(attackSummary(heroAttackOptions(game).find((o) => o.id === 'spell-faerie-fire')).join(' · '), 'Dex save against DC 13 · outlined: attacks against it have Advantage · 20-ft cube within 60 ft · Concentration · uses a level 1 slot');
});

test('Hellish Rebuke: cast for you with its free use when a foe hurts you; once, and only if Settings allow', () => {
  const tiefling = { ...caster, speciesId: 'tiefling', size: 'medium', speciesChoice: 'infernal', spellcastingAbility: 'charisma' };
  const { game, goblin } = soloGoblin(tiefling, { x: 3, y: 2 });
  forceNextD20(19); // 23 hits even with Shield, so Shield stays in the book
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Hellish Rebuke!') && goblin.hp < 40, game.battle.log.map((e) => e.text).join(' / '));
  assertEqual([game.featureUses[freeCastKey('hellish-rebuke')], game.slotsUsed[0] || 0], [1, 0]);
  assertEqual(lastRoll(game, 'save').target, { type: 'DC', value: 10 }, 'Charisma 10: 8 + 0 + 2');
  forceNextD20(19);
  fight.endHeroTurn(game);
  assertEqual(game.battle.log.filter((e) => e.text.startsWith('Hellish Rebuke!')).length, 1, 'no free use left');

  fight.setReactionPolicy({ rebuke: false });
  const off = soloGoblin(tiefling, { x: 3, y: 2 }).game;
  forceNextD20(19);
  fight.endHeroTurn(off);
  fight.setReactionPolicy({ rebuke: true });
  assertTrue(!said(off, 'Hellish Rebuke!'), 'turned off in Settings');
});

test('Spell buttons say what the Cleric spells do', () => {
  const text = (character, id) => attackSummary(heroAttackOptions(fightWith(character)).find((o) => o.id === id)).join(' · ');
  assertEqual(text(initiate('healing-word'), 'spell-healing-word-free'), 'Bonus Action · regain 2d4 + 1 Hit Points · 6 on average · free: once per Long Rest');
  assertEqual(text(initiate('bless'), 'spell-bless-free'), '+1d4 to your attack rolls and saving throws · Concentration · free: once per Long Rest');
  assertEqual(text(initiate('sanctuary'), 'spell-sanctuary-free'), 'Bonus Action · foes make a Wis save against DC 11 to attack you; ends if you attack or cast a spell · free: once per Long Rest');
});

// ---- Spells in scenes ----

const STORY_URL = new URL('../story/', import.meta.url);

async function storyGame(character, seed = 'scenes') {
  const story = await loadStory(STORY_URL);
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  return newGame(runtime, { slot: 1, seed, character });
}

const spellChoice = (game, id) => game.story.currentChoices.find((c) => (c.tags || []).includes(`spell:${id}`));
const notesOn = (page) => page.beats.filter((b) => b.type === 'note').map((b) => b.text);

// Juniper with Charm Person prepared instead of Sleep (level 1: 2 slots), and a Fighter with
// Magic Initiate (Cleric): Guidance, Spare the Dying and Thaumaturgy.
const charmer = { ...juniper, spells: { ...juniper.spells, spellbook: [...juniper.spells.spellbook, 'charm-person'], prepared: ['mage-armor', 'magic-missile', 'shield', 'charm-person'] } };
const acolyteFighter = {
  ...wren,
  magicInitiate: [{ source: 'background', list: 'cleric', ability: 'wisdom', cantrips: ['guidance', 'spare-the-dying'], spell: 'cure-wounds' }],
};

// Spells with no use in a fight yet that are waiting for scenes still to be written. Every
// other spell without one must unlock a choice somewhere.
const WAITING = {
  guidance: 'works on every ability check in a scene instead',
  // Heroes reach level 5 at the end of Act I, so these wait for Act II's scenes.
  'speak-with-dead': 'Act II: the dead who can be questioned',
  'tiny-hut': 'Act II: a safe camp in the wild, with travel',
  darkness: 'a Drow’s or an Infernal Tiefling’s at level 5 (and a Wizard spell): Act II',
  'pass-without-trace': 'a Wood Elf’s at level 5: Act II’s sneaking',
  'ray-of-enfeeblement': 'a Chthonic Tiefling’s at level 5 (and a Wizard spell): its fight rules come later',
};

test('Scenes: every spell without a use in a fight unlocks a choice in a scene (or waits for one)', async () => {
  const main = await (await fetch(new URL('main.ink', STORY_URL))).text();
  const files = [...main.matchAll(/^INCLUDE (.+)$/gm)].map((m) => m[1].trim());
  const source = (await Promise.all(files.map(async (f) => (await fetch(new URL(f, STORY_URL))).text()))).join('\n');
  const missing = spells.filter((s) => !s.combat && !WAITING[s.id] && !source.includes(`#spell:${s.id}`)).map((s) => s.id);
  assertEqual(missing, []);
  const stray = [...source.matchAll(/has_spell\("([^"]+)"\)\}? \[/g)].map((m) => m[1]);
  assertEqual(stray, [], 'spell choices use can_cast, so the card shows what they cost');
});

test('Scenes: a cantrip costs nothing, a Ritual no slot, and a spell with no slot left can’t be cast', async () => {
  const game = await storyGame(charmer);
  assertEqual([sceneCastCost(game, 'light').kind, sceneCastCost(game, 'detect-magic').kind, sceneCastCost(game, 'charm-person')], ['cantrip', 'ritual', { kind: 'slot', level: 1 }]);
  castInScene(game, 'detect-magic');
  assertEqual(game.slotsUsed[0] || 0, 0, 'Detect Magic as a Ritual, from the spellbook');
  castInScene(game, 'charm-person');
  castInScene(game, 'charm-person');
  assertEqual(sceneCastCost(game, 'charm-person'), null, 'both level 1 slots spent');
  assertThrows(() => castInScene(game, 'charm-person'));
});

test('Scenes: Charm Person at the gate uses a slot, and the warden rolls her save in the open', async () => {
  const game = await storyGame(charmer, 'charm');
  forceNextD20(1);
  const page = (game.page = makeChoice(game, spellChoice(game, 'charm-person')));
  const roll = page.beats.find((b) => b.type === 'roll').result;
  assertEqual([roll.opponent, roll.label, roll.success], ['Warden Pike', "Warden Pike's Wisdom save against Charm Person", false]);
  assertTrue(notesOn(page).includes('You cast Charm Person, using a level 1 slot.'));
  // (The slot itself comes back at once: the night at the inn is a Long Rest.)
  assertTrue(game.flags.includes('charmed_pike') && game.flags.includes('warden_opened_gate'));

  const wary = await storyGame(charmer, 'charm-fails');
  forceNextD20(20);
  wary.page = makeChoice(wary, spellChoice(wary, 'charm-person'));
  assertTrue(wary.flags.includes('saw_barrow_light') && !wary.flags.includes('charmed_pike'), 'she feels it, and you sleep outside');
});

test('Guidance: a hero who knows it adds 1d4 to ability checks in scenes', async () => {
  const game = await storyGame(acolyteFighter, 'guided');
  const talk = game.story.currentChoices.find((c) => c.text.startsWith('Talk her into opening the gate'));
  const page = makeChoice(game, talk);
  const guidance = page.beats.find((b) => b.type === 'roll').result.modifiers.find((m) => m.label === 'Guidance');
  assertTrue(guidance && guidance.value >= 1 && guidance.value <= 4, JSON.stringify(guidance));
});

// ---- Level 3 spells (level 5 heroes) ----

// Juniper at level 5 (Int 19: spell save DC 15) with the level 3 Wizard spells prepared, and
// Posy at level 5 (Wis 18: DC 15), a Life Cleric, with the Cleric's.
const wizard5 = {
  ...juniper,
  level: 5,
  subclassId: 'evoker',
  classChoices: { scholarSkill: 'arcana' },
  hitPointRolls: [null, null, null, null],
  levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { intelligence: 2 } }],
  spells: {
    cantrips: [...juniper.spells.cantrips, 'chill-touch'],
    spellbook: ['shield', 'magic-missile', 'mage-armor', 'sleep', 'fireball', 'lightning-bolt', 'hypnotic-pattern', 'counterspell', 'dispel-magic', 'tiny-hut'],
    prepared: ['shield', 'magic-missile', 'mage-armor', 'sleep', 'fireball', 'lightning-bolt', 'hypnotic-pattern', 'counterspell', 'dispel-magic'],
  },
};
const posy = quickStartHeroes.find((h) => h.id === 'posy').character;
const cleric5 = {
  ...posy,
  level: 5,
  subclassId: 'life',
  hitPointRolls: [null, null, null, null],
  levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { wisdom: 1, constitution: 1 } }],
  spells: { ...posy.spells, cantrips: [...posy.spells.cantrips, 'resistance'], prepared: ['guiding-bolt', 'sanctuary', 'detect-magic', 'hold-person', 'shield-of-faith', 'spiritual-weapon', 'command', 'spirit-guardians', 'dispel-magic'] },
};

// The mill fight with companions beside the hero: everyone after the hero rolls a 1.
function partyFight(character, party, setUp = () => {}) {
  const game = { ...gameFor(character, 'party-spells'), party: [] };
  for (const id of party) joinParty(game, id);
  setUp(game);
  game.rng = scriptedRng([20, 1, 1, 1, 1]);
  fight.startBattle(game, 'mill-scavengers', 0);
  game.rng = createRng('party-spells');
  return game;
}

test('Level 5 casters for these checks are legal', () => {
  assertEqual([validateCharacter(wizard5), validateCharacter(cleric5)], [[], []]);
});

test('Areas: a Line is one square wide, straight out from you, until the edge of the map or a wall', () => {
  assertEqual(areaSquares(open, { shape: 'line', size: 100 }, middle, 'e').map((s) => `${s.x},${s.y}`), ['5,4', '6,4', '7,4', '8,4']);
  assertEqual(areaSquares(open, { shape: 'line', size: 100 }, middle, 'ne').map((s) => `${s.x},${s.y}`), ['5,3', '6,2', '7,1', '8,0']);
  const walled = parseMap(['.....', '.....', '#####', '.....', '.....'], legend);
  assertEqual(areaSquares(walled, { shape: 'line', size: 100 }, { x: 2, y: 4 }, 'n'), [{ x: 2, y: 3 }], 'the wall stops it');
});

test('Fireball: a 20-foot-radius Sphere within 150 feet, 8d6 fire, half on a Dexterity save', () => {
  const game = fightWith(wizard5);
  const [first, second] = fight.enemies(game.battle);
  first.hp = 60;
  second.hp = 60;
  const option = heroAttackOptions(game).find((o) => o.id === 'spell-fireball');
  assertEqual([option.slotLevel, option.damage.dice, option.saveDc, option.targeting], [3, '8d6', 15, 'point']);
  assertEqual(attackSummary(option).join(' · '), 'Dex save against DC 15 · 8d6 fire · 28 on average · half on a save · 20-ft-radius sphere within 150 ft · uses a level 3 slot');
  const { caught } = fight.areaFor(game, option.id, { at: { x: 3, y: 6 } });
  assertEqual(caught.map((c) => c.id), [first.id, second.id], 'not you, 25 feet from its centre');
  game.rng = scriptedRng([3, 3, 3, 3, 3, 3, 3, 3, 1, 20]); // 8d6 = 24; the first fails, the second saves
  fight.heroCastArea(game, option.id, { at: { x: 3, y: 6 } });
  assertEqual([first.hp, second.hp, game.slotsUsed[2]], [36, 48, 1]);
});

test('Lightning Bolt: a 100-foot Line from you, 8d6 lightning, half on a Dexterity save', () => {
  const game = fightWith(wizard5);
  const [first, second] = fight.enemies(game.battle); // at (3, 7) and (4, 7); you're at (3, 1)
  first.hp = 60;
  const option = heroAttackOptions(game).find((o) => o.id === 'spell-lightning-bolt');
  assertEqual([option.targeting, attackSummary(option).includes('100-ft line from you')], ['direction', true]);
  assertEqual(fight.areaFor(game, option.id, { direction: 's' }).caught.map((c) => c.id), [first.id], 'straight down the room: only the first');
  game.rng = scriptedRng([1, 1, 1, 1, 1, 1, 1, 1, 1]); // 8d6 = 8, and a failed save
  fight.heroCastArea(game, option.id, { direction: 's' });
  assertEqual([first.hp, second.hp > 0], [52, true]);
});

test('Hypnotic Pattern: a failed Wisdom save leaves a foe Charmed (Incapacitated, Speed 0); damage or a friend’s shake ends it', () => {
  const game = fightWith(wizard5);
  const [first, second] = fight.enemies(game.battle);
  Object.assign(first, { pos: { x: 3, y: 5 }, hp: 60 });
  Object.assign(second, { pos: { x: 4, y: 5 }, hp: 60 });
  const option = heroAttackOptions(game).find((o) => o.id === 'spell-hypnotic-pattern');
  assertEqual(fight.areaFor(game, option.id, { at: { x: 3, y: 5 } }).squares.length, 26, 'a 6 × 6 block, cut short by the edge of the map and the walls');
  game.rng = scriptedRng([1, 1]);
  fight.heroCastArea(game, option.id, { at: { x: 3, y: 5 } });
  assertTrue(has(game, first, 'charmed') && has(game, second, 'charmed') && fight.isIncapacitated(game.battle, first.id), game.battle.log.map((e) => e.text).join(' / '));
  assertEqual(game.battle.concentration.name, 'Hypnotic Pattern');
  game.rng = createRng('pattern');
  forceNextD20(20);
  game.battle.turnState.action = false; // (a Fire Bolt next, for the check)
  fight.heroAttack(game, 'spell-fire-bolt', first.id);
  assertTrue(said(game, 'The pain snaps Goblin Minion 1 out of the swirling colours.') && !has(game, first, 'charmed'));
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Goblin Minion 1 shakes Goblin Minion 2 out of its daze.'), game.battle.log.map((e) => e.text).join(' / '));
  assertTrue(said(game, 'Hypnotic Pattern holds nobody now, and ends.'));
});

test('Mass Healing Word: a Bonus Action, one roll for everyone hurt within 60 feet; the fallen come to', () => {
  const game = partyFight(cleric5, ['odda', 'fen'], (g) => {
    g.hp = 10;
    memberOf(g, 'odda').hp = 0;
    memberOf(g, 'fen').hp = 20;
  });
  const option = heroAttackOptions(game).find((o) => o.spellId === 'mass-healing-word');
  assertEqual([option.targeting, option.bonusAction, option.slotLevel], ['party', true, 3]);
  game.rng = scriptedRng([2, 3]);
  fight.heroCastSelf(game, option.id);
  assertTrue(said(game, 'You cast Mass Healing Word: 2d4 (2, 3) + 4 + 5 (Disciple of Life) = 14 each.'), game.battle.log.map((e) => e.text).join(' / '));
  assertEqual([game.hp, memberOf(game, 'odda').hp, memberOf(game, 'fen').hp, fight.combatantById(game.battle, 'odda').state], [24, 14, 34, 'up']);
  assertEqual([game.battle.turnState.bonus, game.battle.turnState.action], [true, false]);
});

test('Revivify: a companion who died within the last minute comes back with 1 Hit Point, using up a diamond', () => {
  const game = partyFight(cleric5, ['fen']);
  const fen = fight.combatantById(game.battle, 'fen');
  const option = heroAttackOptions(game).find((o) => o.spellId === 'revivify');
  assertEqual(fight.heroCantUse(game, option.id), 'Nobody here has died.');
  Object.assign(fen, { state: 'dead', diedRound: game.battle.round });
  Object.assign(memberOf(game, 'fen'), { hp: 0, fallen: true });
  assertEqual(fight.heroCantUse(game, option.id), 'Revivify needs a diamond worth 300+ GP, which it uses up.');
  game.inventory.push({ id: 'diamond', quantity: 1 });
  fen.diedRound = game.battle.round - 10;
  assertEqual(fight.heroCantUse(game, option.id), 'Fen died more than a minute ago.');
  fen.diedRound = game.battle.round - 9;
  assertEqual(fight.heroCantUse(game, option.id), null);
  fight.heroCastOn(game, option.id, 'fen');
  assertEqual([fen.state, memberOf(game, 'fen').hp, memberOf(game, 'fen').fallen, game.inventory.some((e) => e.id === 'diamond' && e.quantity > 0), game.slotsUsed[2]], ['up', 1, false, false, 1]);
  assertTrue(said(game, 'and Fen gasps back to life with 1 Hit Point.'));
});

test('Spirit Guardians: foes save or take 3d8 radiant when it’s cast on them, when it reaches them, and at the end of their turn there, once a turn', () => {
  const game = fightWith(cleric5);
  const [first, second] = fight.enemies(game.battle);
  Object.assign(first, { pos: { x: 1, y: 3 }, hp: 60, maxHp: 60 }); // 10 feet from you
  Object.assign(second, { pos: { x: 3, y: 7 }, hp: 60, maxHp: 60 }); // 30 feet away
  game.rng = scriptedRng([1, 4, 4, 4]); // the first goblin's Wisdom save: 1; 3d8 = 12
  fight.heroCastSelf(game, 'spell-spirit-guardians');
  assertEqual([first.hp, second.hp, game.battle.concentration.name, game.slotsUsed[2]], [48, 60, 'Spirit Guardians', 1]);
  assertTrue(said(game, 'Your Spirit Guardians swirl round Goblin Minion 1: 3d8 (4, 4, 4) = 12 radiant damage.'));
  assertEqual(fight.battleScene(game).auras, [{ by: 'hero', radius: 15 }]);
  // Walking up to the second goblin brings the spirits onto it.
  game.rng = scriptedRng([20, 2, 2, 2]); // it saves: half of 6
  fight.heroMove(game, { x: 4, y: 4 });
  assertTrue(said(game, 'Your Spirit Guardians swirl round Goblin Minion 2: 3d8 (2, 2, 2) = 6 radiant damage, halved to 3 by its Wisdom save.'), game.battle.log.map((e) => e.text).join(' / '));
  // The first goblin, Charmed where it stands (inside), ends its turn there.
  game.battle.effects.push({ kind: 'charmed', target: first.id, endsOn: null });
  game.rng = createRng('guardians');
  fight.endHeroTurn(game);
  const log = game.battle.log.map((e) => e.text);
  const turn = log.indexOf('Goblin Minion 1\'s turn.');
  assertTrue(turn >= 0 && log.slice(turn).some((t) => t.startsWith('Your Spirit Guardians swirl round Goblin Minion 1')), log.join(' / '));
  assertEqual(log.filter((t) => t.startsWith('Your Spirit Guardians swirl round Goblin Minion 1')).length, 2, 'once on your turn, once on its own');
});

test('Dispel Magic: ends a foe’s Hold Person on a friend; a foe’s Spiritual Weapon can be dispelled too', () => {
  const game = partyFight(wizard5, ['odda']);
  const goblin = fight.enemies(game.battle)[0];
  const option = heroAttackOptions(game).find((o) => o.spellId === 'dispel-magic');
  assertEqual(fight.heroCantUse(game, option.id), 'No foe’s spell here to dispel.');
  goblin.concentration = { spellId: 'hold-person', name: 'Hold Person' };
  game.battle.effects.push({ kind: 'paralyzed', target: 'odda', endsOn: null, concentration: true, by: goblin.id, dc: 12 });
  const [held] = fight.dispelTargets(game, option);
  assertEqual([held.key, held.what, held.problem], ['held:odda', "Goblin Minion 1's Hold Person on Odda", null]);
  fight.heroDispel(game, option.id, 'held:odda');
  assertTrue(said(game, "You cast Dispel Magic: Goblin Minion 1's Hold Person on Odda unravels and ends. Odda can move again."), game.battle.log.map((e) => e.text).join(' / '));
  assertEqual([has(game, { id: 'odda' }, 'paralyzed'), goblin.concentration, game.slotsUsed[2]], [false, null, 1]);
  game.battle.effects.push({ kind: 'spiritual-weapon', target: goblin.id, by: goblin.id, endsOn: null, concentration: true, pos: { x: 4, y: 6 }, damage: { dice: '1d8', bonus: 2, type: 'force' }, modifiers: [] });
  assertEqual(fight.dispelTargets(game, option).map((t) => t.key), [`weapon:${goblin.id}`]);
});

test('Spare the Dying: a beaten lookout lives, Nettle hears of it, and it lies on the map', async () => {
  const game = await storyGame(acolyteFighter, 'spared');
  game.page = jumpTo(game, 'ch1_warren.lookout_down');
  game.page = makeChoice(game, spellChoice(game, 'spare-the-dying'));
  assertTrue(game.flags.includes('warren_lookout_spared') && !game.flags.includes('warren_lookout_killed'));
  game.page = jumpTo(game, 'ch1_warren.hall');
  assertTrue(game.page.beats.some((b) => b.type === 'text' && b.text.includes('sat with him so he didn')), 'her greeting');
  assertTrue(game.story.currentChoices.some((c) => (c.tags || []).includes('check:persuasion:10')), 'nobody died, so she listens');
});

run(document.getElementById('summary'), document.getElementById('results'));

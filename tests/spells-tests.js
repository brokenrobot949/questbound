// Spell checks: areas of effect, the Wizard's spells in a fight, Concentration, Shield, the
// spells a hero casts on themselves, and spells in scenes. Open tests/spells.html through the
// local server to run them. Add checks here whenever a spell's rules change.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { parseMap } from '../js/engine/combat/grid.js';
import { areaSquares, directionTowards } from '../js/engine/combat/areas.js';
import { heroAttackOptions } from '../js/engine/combat/attacks.js';
import * as fight from '../js/engine/combat/battle.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { freshResources, longRestRecovery, maxHp } from '../js/engine/character/resources.js';
import { activeSpellIds, castSelfSpell, selfSpellProblem, timePasses } from '../js/engine/character/spell-effects.js';
import { freeCastKey } from '../js/engine/character/spells.js';
import { takeDamage } from '../js/engine/character/hazards.js';
import { armorClass, speed } from '../js/engine/character/sheet.js';
import { attackSummary } from '../js/engine/ui/attack-text.js';
import { castInScene, sceneCastCost } from '../js/engine/character/casting.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { jumpTo, makeChoice } from '../js/engine/story/story-runner.js';
import { newGame } from '../js/engine/save/save-format.js';
import { spells } from '../data/srd/spells.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';

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
  castSelfSpell(game, 'mage-armor', 1);
  assertEqual([armorClass(caster, activeSpellIds(game)).value, game.slotsUsed[0]], [14, 1]);
  assertTrue(selfSpellProblem(gameFor({ ...caster, armorId: 'leather-armor' }), 'mage-armor', 1).includes('armour'));
  longRestRecovery(game);
  assertEqual(game.activeSpells, []);
});

test('False Life: Temporary Hit Points that don’t stack, and soak damage first, even from a trap', () => {
  const game = gameFor(caster);
  game.rng = scriptedRng([4, 4, 1, 1, 5]);
  castSelfSpell(game, 'false-life', 1); // 2d4 (4, 4) + 4 = 12
  castSelfSpell(game, 'false-life', 1); // 2d4 (1, 1) + 4 = 6: keep the 12
  assertEqual(game.tempHp, 12);
  const full = game.hp;
  takeDamage(game, '1d6', 'bludgeoning'); // 5
  assertEqual([game.hp, game.tempHp], [full, 7]);
  assertEqual(attackSummary(heroAttackOptions(fightWith(caster)).find((o) => o.id === 'spell-false-life-2')).join(' · ').includes('2d4 + 9'), true, 'a level 2 slot adds 5');
});

test('Longstrider: Speed +10 feet, until the time of day moves on; in a fight, faster that very turn', () => {
  const game = gameFor(caster);
  const before = speed(caster).value;
  castSelfSpell(game, 'longstrider', 1);
  assertEqual(speed(caster, activeSpellIds(game)).value, before + 10);
  assertEqual(timePasses(game), ['Longstrider']);
  assertEqual(activeSpellIds(game), []);

  const { game: battling } = oneGoblin({ x: 3, y: 6 });
  const left = battling.battle.turnState.movementLeft;
  fight.heroCastSelf(battling, 'spell-longstrider');
  assertEqual(battling.battle.turnState.movementLeft, left + 10);
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

// Spells with no use in a fight yet that are waiting for scenes still to be written, or for
// the next slice. Every other spell without one must unlock a choice somewhere.
const WAITING = {
  knock: 'Chapter 2: freeing Fen from the stocks (a level 2 spell, so not before level 3)',
  invisibility: 'Chapter 2: sneaking into the Choir camp at Cairnfield (level 2)',
  guidance: 'works on every ability check in a scene instead',
  bless: 'next slice: Cleric spells in a fight',
  'cure-wounds': 'next slice',
  'faerie-fire': 'next slice',
  'guiding-bolt': 'next slice',
  'healing-word': 'next slice',
  'hellish-rebuke': 'next slice',
  sanctuary: 'next slice',
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

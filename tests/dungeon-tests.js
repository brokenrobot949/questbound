// Dungeon checks: the maps, moving room to room, fights in a room, traps, and the
// Brackenhollow warren scenes. Open tests/dungeon.html through the local server to run them.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { isStandable, parseMap } from '../js/engine/combat/grid.js';
import * as fight from '../js/engine/combat/battle.js';
import { enterRoom, findDungeon, parseRoomTag } from '../js/engine/world/dungeons.js';
import { takeDamage } from '../js/engine/character/hazards.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { freshResources } from '../js/engine/character/resources.js';
import { dungeons } from '../data/campaign/dungeons.js';
import { encounters } from '../data/campaign/encounters.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { continueAfterBattle, currentDungeon, currentLocation, jumpTo, makeChoice, revealRoll, startFight } from '../js/engine/story/story-runner.js';
import { gameToSave, loadGame, newGame } from '../js/engine/save/save-format.js';

const wren = quickStartHeroes.find((h) => h.id === 'wren').character;

function gameFor(character, seed = 'dungeon') {
  return { character, rng: createRng(seed), ...startingInventory(character), ...freshResources(character), battle: null, lastBattle: null, pending: [] };
}

// ---- The maps ----

test('Maps: every room’s band, entrance and doorways fit its dungeon’s map', () => {
  for (const dungeon of dungeons) {
    const map = parseMap(dungeon.rows, dungeon.legend);
    for (const room of dungeon.rooms) {
      const [first, last] = room.rows;
      assertTrue(first >= 0 && last < map.height && first < last, `${room.id}: rows`);
      assertTrue(room.entry.y >= first && room.entry.y <= last && isStandable(map, room.entry), `${room.id}: entry`);
      for (const [to, squares] of Object.entries(room.exits)) {
        for (const pos of squares) assertTrue((pos.y === first || pos.y === last) && isStandable(map, pos), `${room.id} → ${to}: doorway`);
      }
    }
  }
});

test('Rooms: the map remembers where you’ve been, even after you leave', () => {
  let state = enterRoom(null, parseRoomTag('brackenhollow/mouth'));
  state = enterRoom(state, parseRoomTag('brackenhollow/pit'));
  state = enterRoom(state, parseRoomTag('brackenhollow/mouth'));
  assertEqual(state, { id: 'brackenhollow', room: 'mouth', explored: ['mouth', 'pit'] });
  assertEqual(enterRoom(state, parseRoomTag('none')), { id: 'brackenhollow', room: null, explored: ['mouth', 'pit'] });
  assertThrows(() => parseRoomTag('brackenhollow/ballroom'), 'a room that isn’t on the map');
});

test('Encounters: every fight’s difficulty starts with Low, Moderate, High or Deadly (the choice card shows it)', () => {
  for (const encounter of encounters) {
    assertTrue(['Low', 'Moderate', 'High', 'Deadly'].includes(encounter.difficulty.split(/[\s:(]/)[0]), encounter.id);
  }
});

// ---- Fights in the warren ----

// A fight with the hero going first.
function warrenFight(encounterId, character = wren, seed = 'warren') {
  const game = gameFor(character, seed);
  forceNextD20(20);
  fight.startBattle(game, encounterId, 0);
  return game;
}

test('Fights in a room: the battle map is that room’s band of the dungeon, with onlookers in the way', () => {
  const game = warrenFight('nettle-duel');
  const map = fight.battleMap(game.battle);
  const hall = findDungeon('brackenhollow').rooms.find((r) => r.id === 'hall');
  assertEqual(map.height, hall.rows[1] - hall.rows[0] + 1);
  assertEqual([map.cells[2][1].terrain, map.cells[2][1].decor], ['obstacle', 'goblin-onlooker']);
  assertEqual(fight.enemies(game.battle).map((c) => c.name), ['Mother Nettle']);
});

test('Goblin Boss: Multiattack is two attacks a turn', () => {
  const game = warrenFight('nettle-duel');
  const nettle = fight.enemies(game.battle)[0];
  nettle.pos = { x: 3, y: 2 }; // beside the hero at (3, 1)
  fight.endHeroTurn(game);
  const bites = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Mother Nettle'));
  assertEqual(bites.length, 2);
});

test('Goblin Boss: Redirect Attack drags an ally into the way, once a round', () => {
  const game = warrenFight('nettle-band', { ...wren, level: 2, hitPointRolls: [null] });
  const battle = game.battle;
  const nettle = fight.enemies(battle).find((c) => c.name === 'Mother Nettle');
  const warrior = fight.enemies(battle).find((c) => c.name === 'Goblin Warrior 1');
  nettle.pos = { x: 3, y: 2 };
  warrior.pos = { x: 4, y: 2 }; // beside both Nettle and the hero at (3, 1)
  forceNextD20(15);
  fight.heroAttack(game, 'greatsword-melee', nettle.id);
  assertTrue(battle.log.some((e) => e.text === 'Mother Nettle drags Goblin Warrior 1 into the way: Redirect Attack!'));
  assertEqual([warrior.pos, nettle.pos], [{ x: 3, y: 2 }, { x: 4, y: 2 }], 'they swapped places');
  assertTrue(battle.log.some((e) => e.text.includes('hit Goblin Warrior 1 with Greatsword')), 'the warrior took the blow');
  // Her reaction is spent until her next turn: Action Surge's second swing reaches her.
  fight.heroActionSurge(game);
  warrior.hp = 0;
  forceNextD20(15);
  fight.heroAttack(game, 'greatsword-melee', nettle.id);
  assertEqual(battle.log.filter((e) => e.text.includes('Redirect Attack')).length, 1);
});

// ---- Traps ----

test('Traps: a fall hurts; at 0 Hit Points you make death saves alone, and wake on three successes', () => {
  const game = gameFor(wren);
  game.hp = 3;
  game.rng = scriptedRng([5, 12, 15, 11]); // 1d6 of 5, then three successful death saves
  const result = takeDamage(game, '1d6', 'bludgeoning');
  assertEqual([result.taken, result.outcome, game.hp], [5, 'woke', 1]);
  assertEqual(game.pending.map((p) => p.result.label), ['Death saving throw', 'Death saving throw', 'Death saving throw']);
});

test('Traps: a natural 20 wakes you at once; three failures (a 1 counts twice) are death', () => {
  const lucky = gameFor(wren);
  lucky.hp = 1;
  lucky.rng = scriptedRng([4, 20]);
  assertEqual([takeDamage(lucky, '1d6', 'bludgeoning').outcome, lucky.hp], ['woke', 1]);
  const unlucky = gameFor(wren);
  unlucky.hp = 1;
  unlucky.rng = scriptedRng([4, 1, 7]);
  assertEqual([takeDamage(unlucky, '1d6', 'bludgeoning').outcome, unlucky.hp], ['dead', 0]);
  const crushed = gameFor(wren);
  crushed.hp = 1;
  crushed.rng = scriptedRng([6, 6, 6]); // 18 damage: 17 left over is more than 12 Hit Points
  assertEqual(takeDamage(crushed, '3d6', 'bludgeoning').outcome, 'dead', 'massive damage');
  const standing = gameFor(wren);
  standing.rng = scriptedRng([2]);
  assertEqual([takeDamage(standing, '1d6', 'bludgeoning').outcome, standing.hp], ['up', 10]);
});

// ---- The warren scenes ----

async function storyGame(seed, character = wren) {
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  return newGame(runtime, { slot: 1, seed, character });
}

function pick(game, start) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start));
  if (!choice) throw new Error(`No choice "${start}": ${game.story.currentChoices.map((c) => c.text).join(' / ')}`);
  game.page = makeChoice(game, choice);
  return game.page;
}

const tagsOf = (game) => game.story.currentChoices.map((c) => (c.tags || []).join(' '));
// As if the player had tapped every d20 on the page.
const revealAll = (game) => game.page.beats.filter((b) => b.type === 'roll' && !b.revealed).forEach((b) => revealRoll(game, b));
const pageText = (game) => game.page.beats.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
const notes = (game) => game.page.beats.filter((b) => b.type === 'note').map((b) => b.text);

// Jumps to a scene with some story flags set, as if the hero had got there.
async function at(path, flags = [], seed = path) {
  const game = await storyGame(seed);
  game.flags.push(...flags);
  game.page = jumpTo(game, path);
  return game;
}

test('Warren: the quarry mouth puts you on the map, in the first room', async () => {
  const game = await at('ch1_quarry_road.quarry_mouth');
  assertEqual(currentDungeon(game), { id: 'brackenhollow', room: 'mouth', explored: ['mouth'] });
  assertTrue(tagsOf(game).some((t) => t.includes('check:stealth:10')) && tagsOf(game).some((t) => t.includes('combat:warren-lookout')));
});

test('Warren: sneaking past the lookout, the pit catches a hurrying hero, and the traps face inward', async () => {
  const game = await at('ch1_quarry_road.quarry_mouth');
  const xp = game.xp;
  forceNextD20(20);
  pick(game, 'Creep along the foot of the cliff');
  revealAll(game);
  assertEqual(currentDungeon(game).room, 'pit');
  assertEqual(game.xp - xp, 50, 'past the lookout without a fight');
  const hp = game.hp;
  pick(game, 'Hurry on');
  assertTrue(game.hp < hp && notes(game).some((n) => n.startsWith('You take ') && n.includes('bludgeoning damage (1d6')), 'the fall hurts');
  assertTrue(game.flags.includes('traps_face_inward') && game.xp - xp === 75);
  assertTrue(tagsOf(game).some((t) => t.includes('go:larder')), 'the way on is a doorway on the map');
});

test('Warren: a guide shows you the pit if you talked the mill goblins down', async () => {
  const game = await at('ch1_warren', ['mill_goblins_talked']);
  assertTrue(pageText(game).includes('Mother says no stabbing') && pageText(game).includes('Step where I step'));
  assertEqual(currentDungeon(game).explored, ['pit']);
});

test('Warren: the larder has Dunn’s flour and a goblin child; sparing it is a Justice moment', async () => {
  const game = await at('ch1_warren.larder', [], 'larder');
  assertTrue(pageText(game).includes('DUNN\'S MILL'));
  game.character.drive = 'justice';
  pick(game, 'Crouch down and promise');
  assertTrue(game.flags.includes('larder_child_spared') && game.inspiration);
  assertTrue(tagsOf(game).some((t) => t.includes('go:hall')));
});

test('Warren: talking Nettle round (easier if you were gentle) is worth her XP, and strikes the bargain', async () => {
  const game = await at('ch1_warren.hall', ['larder_child_spared']);
  assertTrue(tagsOf(game).some((t) => t.includes('check:persuasion:10')) && !tagsOf(game).some((t) => t.includes('check:persuasion:15')));
  const xp = game.xp;
  forceNextD20(20);
  pick(game, 'Tell her you\'re here for the miller');
  assertEqual(game.xp - xp, 200);
  pick(game, 'Shake on it, if she throws in something');
  assertTrue(game.flags.includes('goblins_spared') && game.inventory.some((e) => e.id === 'potion-of-healing'));
  assertTrue(game.journal.quests.some((q) => q.id === 'goblin-bargain'), 'a new quest');
  assertEqual(game.story.currentChoices.length, 0, 'the way down is as far as the story goes');
});

test('Warren: losing to Nettle is Fate’s Mercy: robbed, tied up, and offered the bargain anyway', async () => {
  const game = await at('ch1_warren.hall', [], 'duel-lost');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:nettle-duel'));
  startFight(game, choice);
  game.hp = 0;
  game.battle.heroState = 'dead';
  game.battle.outcome = 'defeat';
  game.page = continueAfterBattle(game);
  assertEqual([game.money, game.hp > 0, game.flags.includes('nettle_spared_you')], [0, true, true]);
  assertTrue(game.story.currentChoices.some((c) => c.text.startsWith('Shake on it')));
});

test('Warren: winning the duel lets you spare Nettle, or finish her and scatter the band', async () => {
  const game = await at('ch1_warren.hall', [], 'duel-won');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:nettle-duel'));
  startFight(game, choice);
  fight.enemies(game.battle)[0].hp = 0;
  game.battle.outcome = 'victory';
  game.battle.xp = 200;
  game.page = continueAfterBattle(game);
  assertTrue(game.story.currentChoices.some((c) => c.text === 'Offer her your hand'));
  pick(game, 'Finish her');
  assertTrue(game.flags.includes('goblins_slain') && !game.flags.includes('goblins_spared'));
});

test('Warren: losing to the lookout wakes you before Nettle, on the map in her hall', async () => {
  const game = await at('ch1_quarry_road.quarry_mouth', [], 'lookout-lost');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:warren-lookout'));
  startFight(game, choice);
  game.hp = 0;
  game.battle.heroState = 'dead';
  game.battle.outcome = 'defeat';
  game.page = continueAfterBattle(game);
  assertEqual([currentDungeon(game).room, currentLocation(game)], ['hall', 'Brackenhollow warren, Nettle\'s hall']);
  assertTrue(game.story.currentChoices.some((c) => c.text.startsWith('Challenge her to single combat')));
});

test('Warren: where you are in the dungeon is saved and reloaded', async () => {
  const game = await at('ch1_warren.larder', [], 'save-room');
  const record = JSON.parse(JSON.stringify(gameToSave(game)));
  assertEqual(record.game.dungeon, { id: 'brackenhollow', room: 'larder', explored: ['larder'] });
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  assertEqual(currentDungeon(loadGame(runtime, record)), record.game.dungeon);
});

test('Warren: the map only moves once the player has seen the roll that got them there', async () => {
  const game = await at('ch1_quarry_road.quarry_mouth', [], 'unseen');
  forceNextD20(20);
  pick(game, 'Creep along the foot of the cliff');
  assertEqual(currentDungeon(game).room, 'mouth', 'the Stealth roll is still face down');
  revealRoll(game, game.page.beats.find((b) => b.type === 'roll'));
  assertEqual(currentDungeon(game).room, 'pit');
});

run(document.getElementById('summary'), document.getElementById('results'));

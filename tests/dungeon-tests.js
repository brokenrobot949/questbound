// Dungeon checks: the maps, moving room to room, fights in a room, traps, and the
// Brackenhollow warren scenes. Open tests/dungeon.html through the local server to run them.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { isStandable, parseMap } from '../js/engine/combat/grid.js';
import * as fight from '../js/engine/combat/battle.js';
import { enterRoom, findDungeon, parseRoomTag, roomFigures } from '../js/engine/world/dungeons.js';
import { sprites, tiles } from '../data/campaign/sprites.js';
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
import { encounterXp, partyBudget, ratingFor } from '../js/engine/combat/difficulty.js';
import { monsters } from '../data/srd/monsters.js';

const wren = quickStartHeroes.find((h) => h.id === 'wren').character;
const sorael = quickStartHeroes.find((h) => h.id === 'sorael').character;

// Scripted dice first (any die: a d20 face, a d6 face…), then the seeded ones.
function scriptedThen(faces, seed) {
  const queue = [...faces];
  const rest = createRng(seed);
  return { nextInt: (n) => (queue.length ? queue.shift() - 1 : rest.nextInt(n)), getState: () => rest.getState() };
}

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

test('Rooms: whoever is in a room stands on open floor inside it, with a picture to draw', () => {
  for (const dungeon of dungeons) {
    const map = parseMap(dungeon.rows, dungeon.legend);
    for (const room of dungeon.rooms) {
      for (const figure of room.figures || []) {
        const where = `${room.id}: ${figure.name} at ${figure.pos.x},${figure.pos.y}`;
        assertTrue(figure.pos.y >= room.rows[0] && figure.pos.y <= room.rows[1] && isStandable(map, figure.pos), where);
        assertTrue(Boolean(sprites[figure.sprite] || tiles[figure.sprite]), `${where}: picture`);
        assertTrue(figure.pos.x !== room.entry.x || figure.pos.y !== room.entry.y, `${where}: on the hero's square`);
      }
    }
  }
});

test('Rooms: Nettle and her band wait in the hall where the fights start them, and leave once it’s broken', () => {
  const hall = findDungeon('brackenhollow').rooms.find((r) => r.id === 'hall');
  const band = encounters.find((e) => e.id === 'nettle-band');
  const onMap = (pos) => ({ x: pos.x, y: pos.y + hall.rows[0] });
  const here = roomFigures(hall, []);
  for (const { pos } of band.monsters) assertTrue(here.some((f) => f.pos.x === onMap(pos).x && f.pos.y === onMap(pos).y), `someone stands at ${pos.x},${pos.y}`);
  assertEqual(here.find((f) => f.name === 'Mother Nettle').fallen, false);
  assertEqual(roomFigures(hall, ['goblins_spared']).length, here.length, 'a bargain keeps them home');
  assertEqual(roomFigures(hall, ['goblins_slain']), [], 'a broken band scatters');
  const lower = findDungeon('brackenhollow').rooms.find((r) => r.id === 'lower');
  assertTrue(roomFigures(lower, ['lower_dead_stilled']).every((f) => f.fallen), 'the stilled dead lie where they dug');
});

test('Encounters: every fight’s difficulty starts with Low, Moderate, High or Deadly (the choice card shows it)', () => {
  for (const encounter of encounters) {
    assertTrue(['Low', 'Moderate', 'High', 'Deadly'].includes(encounter.difficulty.split(/[\s:(,]/)[0]), encounter.id);
  }
});

test('Encounters: each one’s stated difficulty is what the 2024 budget gives the party it’s sized for', () => {
  for (const encounter of encounters) {
    const { level, party } = encounter.sizedFor;
    const rating = ratingFor(encounterXp(encounter), partyBudget(level, party));
    assertEqual(rating, encounter.difficulty.split(/[\s:(,]/)[0], encounter.id);
  }
  assertEqual(partyBudget(3, 2), { low: 300, moderate: 450, high: 800 }, 'two level 3 characters');
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

// ---- Chapter 2's monsters ----

const said = (game, text) => game.battle.log.some((e) => e.text.includes(text));
const logText = (game) => game.battle.log.map((e) => e.text).join(' / ');

// The ossuary fight with the hero (at (3, 8)) going first and Ghoul 1 beside them at (3, 7).
// Ghoul 2 is out of it, unless both: then it stands beside the hero too, at (4, 7), and acts
// after Ghoul 1. The hero has Hit Points to spare, to watch a few rounds.
function ghoulFight(character = wren, { both = false, seed = 'ghoul' } = {}) {
  const game = warrenFight('ossuary-ghouls', character, seed);
  const [first, second] = fight.enemies(game.battle);
  first.pos = { x: 3, y: 7 };
  if (both) second.pos = { x: 4, y: 7 };
  else second.hp = 0;
  game.battle.order = ['hero', first.id, second.id];
  game.battle.turn = 0;
  game.hp = 60;
  return game;
}

test('Ghoul: it rakes with its Claw first; fail the Con save (DC 10) and you’re Paralyzed until the end of your next turn, which is lost', () => {
  const game = ghoulFight();
  game.rng = scriptedThen([15, 2, 3], 'claw'); // the Claw hits, 1d4 = 2; then your save: a 3
  fight.endHeroTurn(game);
  const text = game.battle.log.map((e) => e.text);
  const at = (start) => text.findIndex((t) => t.startsWith(start));
  const steps = [at('Ghoul 1 hits you with Claw'), at('A cold numbness floods out'), at("You're Paralyzed until the end of your next turn"), at('You’re Paralyzed: you can’t move or act this turn'), at('The numbness fades: you can move again')];
  assertTrue(steps.every((i, n) => i >= 0 && (n === 0 || i > steps[n - 1])), `${steps} ${logText(game)}`);
  const save = game.battle.log[steps[1]].roll;
  assertEqual([save.label, save.target.value, save.success], ["Ghoul 1's paralysing Claw (Constitution save)", 10, false]);
  assertTrue(fight.isHeroTurn(game) && !fight.conditionsOf(game.battle, 'hero').includes('paralyzed'), 'your turn again, free to act');
});

test('Ghouls: the next one bites the Paralyzed hero twice with Advantage, and a hit from beside is a Critical Hit', () => {
  const game = ghoulFight(wren, { both: true, seed: 'pack' });
  // Ghoul 1: the Claw hits, 1d4 = 2, and your save is a 3. Ghoul 2: a Bite with Advantage (18
  // and 9) that hits, a Critical Hit: 2d6 (3, 4) + 2 piercing, plus 2d6 (2, 5) necrotic.
  game.rng = scriptedThen([15, 2, 3, 18, 9, 3, 4, 2, 5], 'pack');
  fight.endHeroTurn(game);
  const bite = game.battle.log.find((e) => e.text.startsWith('Critical hit! Ghoul 2 hits you with Bite'));
  assertTrue(Boolean(bite), logText(game));
  assertEqual([bite.roll.mode, bite.roll.advantage], ['advantage', ['You are Paralyzed']]);
  assertTrue(bite.text.includes('= 9 piercing damage plus 2d6 (2, 5) = 7 necrotic'), bite.text);
  assertEqual(game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.includes('Ghoul 2') && e.text.includes('Bite')).length >= 2, true, 'two Bites: its Multiattack');
});

test('Ghoul: an elf can’t be Paralyzed by its Claw, so it bites twice instead', () => {
  const game = ghoulFight(sorael, { seed: 'elf' });
  fight.endHeroTurn(game);
  const attacks = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.includes('Ghoul 1'));
  assertTrue(attacks.length >= 2 && attacks.every((e) => e.text.includes('Bite')), logText(game));
  assertTrue(!said(game, 'Claw'));
});

test('Bandit Captain: Parry turns a melee hit into a miss (+2 AC), once a round, never against a Critical Hit', () => {
  const start = () => {
    const game = warrenFight('stocks-hunters', { ...wren, level: 2, hitPointRolls: [null] });
    const captain = fight.enemies(game.battle).find((c) => c.monsterId === 'bandit-captain');
    captain.pos = { x: 3, y: 4 }; // beside the hero at (3, 5)
    return { game, captain };
  };
  const { game, captain } = start();
  const preview = fight.attackPreview(game, 'greatsword-melee', captain.id);
  assertTrue(preview.describe.includes('it can Parry'), preview.describe);
  const bonus = preview.option.modifiers.reduce((sum, m) => sum + m.value, 0);
  forceNextD20(15 - bonus); // exactly 15: a hit on its AC 15, a miss against 17
  fight.heroAttack(game, 'greatsword-melee', captain.id);
  assertTrue(said(game, 'Bandit Captain parries! (its reaction: AC 17 against this attack)') && said(game, 'You attack Bandit Captain with Greatsword, and miss'), logText(game));
  // Its reaction is spent until its next turn: Action Surge's swing lands.
  fight.heroActionSurge(game);
  forceNextD20(15 - bonus);
  fight.heroAttack(game, 'greatsword-melee', captain.id);
  assertTrue(said(game, 'You hit Bandit Captain with Greatsword'), logText(game));
  assertEqual(game.battle.log.filter((e) => e.text.includes('parries')).length, 1);

  const crit = start();
  forceNextD20(20);
  fight.heroAttack(crit.game, 'greatsword-melee', crit.captain.id);
  assertTrue(!said(crit.game, 'parries') && said(crit.game, 'Critical hit! You hit Bandit Captain'), logText(crit.game));
});

test('Bounty hunters: the Captain closes in and swings twice (a Light Crossbow, not a Pistol); the Bandits shoot', () => {
  const data = monsters.find((m) => m.id === 'bandit-captain');
  assertEqual([data.attacks.map((a) => a.id), data.multiattack, data.xp], [['scimitar', 'light-crossbow'], 2, 450]);
  assertTrue(data.variant.includes('in place of the Pistol') && data.source === 'SRD 5.2.1');
  const game = warrenFight('stocks-hunters', wren, 'hunters');
  game.hp = 60;
  fight.endHeroTurn(game);
  const swings = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.includes('Bandit Captain') && e.text.includes('Scimitar'));
  const shots = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && /^Bandit \d/.test(e.text) && e.text.includes('Light Crossbow'));
  assertEqual([swings.length, shots.length], [2, 2], logText(game));
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
  assertTrue(tagsOf(game).some((t) => t.includes('go:lower')), 'then the way down');
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

// ---- The undead and the Choir ----

const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;

test('Undead: a Skeleton takes double from bludgeoning; a Zombie takes nothing from poison', () => {
  const game = warrenFight('breach-hymn');
  const skeleton = fight.enemies(game.battle).find((c) => c.monsterId === 'skeleton');
  skeleton.pos = { x: 3, y: 2 }; // beside the hero
  skeleton.hp = 30;
  forceNextD20(15);
  fight.heroAttack(game, 'flail-melee', skeleton.id);
  const line = game.battle.log.find((e) => e.text.startsWith('Skeleton is vulnerable to bludgeoning damage'));
  assertTrue(Boolean(line), 'the flail is bludgeoning');
  const [, before, after] = /(\d+) becomes (\d+)/.exec(line.text).map(Number);
  assertEqual([after, skeleton.hp], [before * 2, 30 - before * 2]);

  const poisoner = { ...juniper, spells: { ...juniper.spells, cantrips: ['fire-bolt', 'poison-spray', 'mage-hand'] } };
  const zombies = warrenFight('lower-dead', poisoner);
  const zombie = fight.enemies(zombies.battle)[0]; // 20 feet away, in Poison Spray's range
  zombies.rng = scriptedRng([15, 12]); // Poison Spray hits, for 12 poison damage
  fight.heroAttack(zombies, 'spell-poison-spray', zombie.id);
  assertTrue(zombies.battle.log.some((e) => e.text === 'Zombie 1 is immune to poison damage.') && zombie.hp === 15);
});

test('Undead Fortitude: a Zombie dropped to 0 saves to stay at 1, but not against a Critical Hit', () => {
  const game = warrenFight('lower-dead', juniper);
  const zombie = fight.enemies(game.battle)[0];
  zombie.hp = 3;
  game.rng = scriptedRng([15, 8, 18]); // Fire Bolt hits for 8; the Zombie's save: 18 + 3 beats DC 13
  fight.heroAttack(game, 'spell-fire-bolt', zombie.id);
  assertEqual(zombie.hp, 1, 'Undead Fortitude');
  const crit = warrenFight('lower-dead', juniper, 'crit');
  const other = fight.enemies(crit.battle)[0];
  other.hp = 3;
  forceNextD20(20);
  fight.heroAttack(crit, 'spell-fire-bolt', other.id);
  assertTrue(other.hp === 0 && !crit.battle.log.some((e) => e.text.includes('Undead Fortitude')), 'no save against a Critical Hit');
});

test('Surprise: striking first, unseen, gives the foes Disadvantage on Initiative', () => {
  const game = gameFor(wren);
  fight.startBattle(game, 'lower-dead', 0, { surprise: true });
  const rolls = game.battle.log.filter((e) => e.roll && e.roll.label === 'Initiative' && e.text.startsWith('Zombie'));
  assertTrue(rolls.length === 3 && rolls.every((e) => e.roll.disadvantage.includes('Surprised')));
  assertTrue(game.battle.log.some((e) => e.text === 'You catch them by surprise.'));
});

test('The hymn: unless it’s stopped, a second Skeleton rises at the start of round 3', () => {
  const game = warrenFight('breach-hymn');
  game.hp = 50; // so the hero is still standing to watch
  assertTrue(fight.objectiveText(game.battle).includes('round 3'));
  fight.endHeroTurn(game);
  fight.endHeroTurn(game);
  assertEqual(game.battle.round, 3);
  assertTrue(game.battle.log.some((e) => e.text.includes('Skeleton 2 drags itself up out of the bones')));
  assertEqual(fight.enemies(game.battle).length, 3);
  assertEqual(fight.objectiveText(game.battle), 'The hymn is finished.');
});

test('The hymn: hurting the singer can break it (a Constitution save, DC 10), and then no more rise', () => {
  const game = warrenFight('breach-hymn', juniper);
  const singer = fight.enemies(game.battle).find((c) => c.monsterId === 'cultist');
  singer.hp = 30;
  game.rng = scriptedRng([15, 6, 3]); // Fire Bolt hits for 6; the singer's save: 3 + 0 fails DC 10
  fight.heroAttack(game, 'spell-fire-bolt', singer.id);
  assertTrue(game.battle.log.some((e) => e.text === 'Choir Acolyte chokes on a note: the hymn breaks off!'));
  game.rng = createRng('after');
  game.hp = 50; // so the hero is still standing to watch
  fight.endHeroTurn(game);
  fight.endHeroTurn(game);
  assertEqual(fight.enemies(game.battle).length, 2, 'nothing rose');
});

test('The acolyte: Bloodied, he runs for the far door; if he gets away he’s worth no XP', () => {
  const game = warrenFight('breach-hymn');
  const battle = game.battle;
  const singer = fight.enemies(battle).find((c) => c.monsterId === 'cultist');
  const skeleton = fight.enemies(battle).find((c) => c.monsterId === 'skeleton');
  battle.hymn.singing = false;
  singer.hp = 3;
  singer.pos = { x: 4, y: 6 };
  skeleton.hp = 0;
  fight.endHeroTurn(game);
  assertTrue(singer.escaped && battle.log.some((e) => e.text === 'Choir Acolyte flees into the dark and is gone.'));
  assertEqual([battle.outcome, battle.xp], ['victory', 50], 'the Skeleton’s XP only');
  fight.finishBattle(game);
  assertEqual(game.lastBattle.escaped, ['cultist']);
});

test('The acolyte’s Ritual Sickle adds 1 necrotic damage', () => {
  const game = warrenFight('breach-hymn');
  const battle = game.battle;
  const singer = fight.enemies(battle).find((c) => c.monsterId === 'cultist');
  battle.hymn.singing = false;
  singer.pos = { x: 3, y: 2 };
  fight.enemies(battle).find((c) => c.monsterId === 'skeleton').hp = 0;
  forceNextD20(19);
  fight.endHeroTurn(game);
  assertTrue(battle.log.some((e) => e.text.includes('Ritual Sickle') && e.text.includes('slashing damage plus 1 necrotic')));
});

// ---- The depths, and home ----

test('Depths: creeping past the dead is worth their XP; the breach can be a surprise attack', async () => {
  const game = await at('ch1_warren_depths', ['goblins_spared']);
  assertEqual(currentDungeon(game).room, 'lower');
  assertTrue(tagsOf(game).some((t) => t.includes('combat:lower-dead') && t.includes('surprise')), 'their backs are turned');
  const xp = game.xp;
  forceNextD20(20);
  pick(game, 'Slip past them');
  revealAll(game);
  assertEqual(game.xp - xp, 150);
  pick(game, 'Follow the singing');
  assertEqual(currentDungeon(game).room, 'breach');
  forceNextD20(20);
  pick(game, 'Creep close');
  assertTrue(tagsOf(game).some((t) => t.includes('combat:breach-hymn') && t.includes('surprise')));
});

test('Depths: catch the acolyte and make him talk; the hymnal, Nettle’s payment, and out', async () => {
  const game = await at('ch1_warren_depths.breach', ['goblins_spared']);
  game.journal.quests.push({ id: 'goblin-bargain', status: 'active', day: 1, notes: [] });
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:breach-hymn'));
  startFight(game, choice);
  for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  game.battle.outcome = 'victory';
  game.page = continueAfterBattle(game);
  forceNextD20(20);
  pick(game, 'Make him talk');
  assertTrue(game.flags.includes('acolyte_talked') && pageText(game).includes('the miller works the gates'));
  assertTrue(game.inventory.some((e) => e.id === 'choir-hymnal') && game.flags.includes('lower_dead_stilled'));
  pick(game, 'Climb back up');
  assertTrue(game.inventory.some((e) => e.id === 'goblin-tooth-charm'));
  assertEqual(game.journal.quests.find((q) => q.id === 'goblin-bargain').status, 'done');
  pick(game, 'Climb out');
  assertEqual(currentDungeon(game).room, null, 'out of the dungeon: the map goes away');
  assertTrue(pageText(game).includes('cookfires in the yard') && game.flags.includes('goblins_at_mill'));
});

test('Depths: if the acolyte gets away, he still leaves his hymnal behind', async () => {
  const game = await at('ch1_warren_depths.breach', [], 'fled');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:breach-hymn'));
  startFight(game, choice);
  for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  game.battle.combatants.find((c) => c.monsterId === 'cultist').escaped = true;
  game.battle.outcome = 'victory';
  game.page = continueAfterBattle(game);
  assertTrue(game.flags.includes('acolyte_escaped') && game.inventory.some((e) => e.id === 'choir-hymnal'));
});

// Settles the fight a choice starts as a win, worth xp.
function winFight(game, start, xp) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start));
  if (!choice) throw new Error(`No choice "${start}"`);
  startFight(game, choice);
  for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  game.battle.outcome = 'victory';
  game.battle.xp = xp;
  game.page = continueAfterBattle(game);
}

test('The whole slice: from the north gate to the lanterns on the hills, with level 3 earned', async () => {
  const game = await storyGame('whole-slice');
  const passing = (start) => {
    forceNextD20(20);
    pick(game, start);
    revealAll(game);
  };
  pick(game, "Show her your old regiment's token");
  pick(game, "Go to the reeve's hall");
  pick(game, 'Take the job, and ask');
  pick(game, 'Tell her to go home');
  pick(game, 'Set out for Dunn');
  pick(game, 'Go down to the cellar');
  passing("Tell them you're not here for them");
  pick(game, 'Throw it some of your food');
  pick(game, 'Go on to the quarry');
  pick(game, 'Go on, deeper');
  pick(game, 'Crouch down and promise');
  pick(game, 'Follow the passage');
  passing("Tell her you're here for the miller");
  pick(game, 'Shake on it: nobody');
  pick(game, 'Go down into the dark');
  passing('Slip past them');
  pick(game, 'Follow the singing');
  winFight(game, 'Charge him', 75);
  passing('Make him talk');
  pick(game, 'Climb back up');
  pick(game, 'Climb out');
  pick(game, 'Report to Reeve Corbin');
  pick(game, 'Show Morwen the hymnal');
  pick(game, 'Turn in for the night');
  assertTrue(game.xp >= 900, `level 3 needs 900 XP; the main path gives ${game.xp}`);
  pick(game, 'Wake in the dark');
  assertEqual(game.story.currentChoices.length, 0, 'the end of the slice');
  assertTrue(['goblins_spared', 'found_hymnal', 'acolyte_talked', 'goblins_at_mill', 'varrow_wary'].every((f) => game.flags.includes(f)));
});

test('Home: half the bounty, Varrow’s verdict, and level 3 at the inn; then lanterns on the hills', async () => {
  const game = await at('ch1_return', ['goblins_slain'], 'home');
  game.inventory.push({ id: 'choir-hymnal', quantity: 1 });
  game.page = jumpTo(game, 'ch1_return.town');
  const money = game.money;
  pick(game, 'Report to Reeve Corbin');
  assertEqual(game.money - money, 2500, '25 gold');
  assertTrue(game.flags.includes('varrow_approves'));
  pick(game, 'Show Morwen the hymnal');
  assertTrue(pageText(game).includes('The Ashen Choir'));
  game.xp = 800;
  pick(game, 'Turn in for the night');
  assertEqual(game.xp, 950, 'the raids are over: 150 XP');
  pick(game, 'Wake in the dark');
  assertTrue(pageText(game).includes('They\'re digging toward the Kings\' Barrow'));
  assertEqual(game.story.currentChoices.length, 0, 'the end of the slice');
});

run(document.getElementById('summary'), document.getElementById('results'));

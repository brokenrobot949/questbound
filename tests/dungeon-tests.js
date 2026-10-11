// Dungeon checks: the maps, moving room to room, fights in a room, traps, and the
// Brackenhollow warren scenes. Open tests/dungeon.html through the local server to run them.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { isStandable, parseMap } from '../js/engine/combat/grid.js';
import * as fight from '../js/engine/combat/battle.js';
import { besideEntry, enterRoom, findDungeon, parseRoomTag, roomFigures } from '../js/engine/world/dungeons.js';
import { sprites, tiles } from '../data/campaign/sprites.js';
import { people } from '../data/campaign/people.js';
import { joinParty, memberOf } from '../js/engine/character/party.js';
import { takeDamage } from '../js/engine/character/hazards.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { freshResources } from '../js/engine/character/resources.js';
import { dungeons } from '../data/campaign/dungeons.js';
import { encounters } from '../data/campaign/encounters.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { continueAfterBattle, currentDungeon, currentLocation, currentTime, jumpTo, makeChoice, revealRoll, startFight } from '../js/engine/story/story-runner.js';
import { gameToSave, loadGame, newGame } from '../js/engine/save/save-format.js';
import { encounterXp, fightRating, partyBudget, ratingFor } from '../js/engine/combat/difficulty.js';
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
        assertTrue(Boolean(sprites[figure.sprite] || tiles[figure.sprite] || people.some((p) => p.id === figure.person)), `${where}: picture`);
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

// The ossuary fight with the hero (at (3, 1)) going first and Ghoul 1 beside them at (3, 2).
// Ghoul 2 is out of it, unless both: then it stands beside the hero too, at (4, 2), and acts
// after Ghoul 1. The hero has Hit Points to spare, to watch a few rounds.
function ghoulFight(character = wren, { both = false, seed = 'ghoul' } = {}) {
  const game = warrenFight('ossuary-ghouls', character, seed);
  const [first, second] = fight.enemies(game.battle);
  first.pos = { x: 3, y: 2 };
  if (both) second.pos = { x: 4, y: 2 };
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
  assertTrue(preview.describe.includes('Mercy Gaunt can Parry'), preview.describe);
  const bonus = preview.option.modifiers.reduce((sum, m) => sum + m.value, 0);
  forceNextD20(15 - bonus); // exactly 15: a hit on its AC 15, a miss against 17
  fight.heroAttack(game, 'greatsword-melee', captain.id);
  assertTrue(said(game, 'Mercy Gaunt parries! (a reaction: AC 17 against this attack)') && said(game, 'You attack Mercy Gaunt with Greatsword, and miss'), logText(game));
  // Its reaction is spent until its next turn: Action Surge's swing lands.
  fight.heroActionSurge(game);
  forceNextD20(15 - bonus);
  fight.heroAttack(game, 'greatsword-melee', captain.id);
  assertTrue(said(game, 'You hit Mercy Gaunt with Greatsword'), logText(game));
  assertEqual(game.battle.log.filter((e) => e.text.includes('parries')).length, 1);

  const crit = start();
  forceNextD20(20);
  fight.heroAttack(crit.game, 'greatsword-melee', crit.captain.id);
  assertTrue(!said(crit.game, 'parries') && said(crit.game, 'Critical hit! You hit Mercy Gaunt'), logText(crit.game));
});

test('Bounty hunters: the Captain closes in and swings twice (a Light Crossbow, not a Pistol); the Bandits shoot', () => {
  const data = monsters.find((m) => m.id === 'bandit-captain');
  assertEqual([data.attacks.map((a) => a.id), data.multiattack, data.xp], [['scimitar', 'light-crossbow'], 2, 450]);
  assertTrue(data.variant.includes('in place of the Pistol') && data.source === 'SRD 5.2.1');
  const game = warrenFight('stocks-hunters', wren, 'hunters');
  game.hp = 60;
  fight.endHeroTurn(game);
  const swings = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.includes('Mercy Gaunt') && e.text.includes('Scimitar'));
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
const cards = (game) => game.story.currentChoices.map((c) => c.text);
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
  assertEqual(cards(game), ["Tell her you'll go at first light, and send her back to bed"], 'the end of Chapter 1, and on into Chapter 2');
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
  assertEqual(cards(game), ["Tell her you'll go at first light, and send her back to bed"], 'the end of Chapter 1, and on into Chapter 2');
  pick(game, "Tell her you'll go at first light");
  assertTrue(pageText(game).includes('Have you seen Lark?') && game.journal.quests.some((q) => q.id === 'millers-daughter'), 'Chapter 2: Lark is gone');
});

// ---- Chapter 2: under Dunn's Mill ----

const ossuaryRoom = () => findDungeon('mill-ossuary').rooms.find((r) => r.id === 'ossuary');
const champion = { ...wren, level: 3, subclassId: 'champion', hitPointRolls: [null, null] };
const posy = quickStartHeroes.find((h) => h.id === 'posy').character;
const lifeCleric = { ...posy, level: 3, subclassId: 'life', hitPointRolls: [null, null], spells: { ...posy.spells, prepared: ['guiding-bolt', 'sanctuary', 'detect-magic', 'hold-person'] } };

test('Under the mill: the Ghoul fight is the ossuary’s band of the map, with Lark on her ledge, out of everyone’s way', () => {
  const game = warrenFight('ossuary-ghouls');
  const map = fight.battleMap(game.battle);
  const room = ossuaryRoom();
  assertEqual(map.height, room.rows[1] - room.rows[0] + 1);
  assertEqual([map.cells[8][4].terrain, map.cells[8][4].decor], ['obstacle', undefined], 'her ledge: nobody steps there, and the screen draws her');
  // The ghouls stand on the map where the fight starts them, and Lark lies on her ledge.
  const encounter = encounters.find((e) => e.id === 'ossuary-ghouls');
  const onMap = (pos) => ({ x: pos.x, y: pos.y + room.rows[0] });
  const here = roomFigures(room, []);
  for (const { pos } of encounter.monsters) assertTrue(here.some((f) => f.sprite === 'ghoul' && f.pos.x === onMap(pos).x && f.pos.y === onMap(pos).y), `a ghoul at ${pos.x},${pos.y}`);
  const lark = here.find((f) => f.person === 'lark');
  assertEqual([lark.pos, lark.lying, lark.fallen], [onMap(encounter.onlookers[0].pos), true, false]);
  assertEqual(roomFigures(room, ['lark_rescued']).filter((f) => f.person).length, 0, 'rescued, she’s gone from the ledge');
  assertTrue(roomFigures(room, ['ossuary_ghouls_destroyed']).filter((f) => f.sprite === 'ghoul').every((f) => f.fallen), 'beaten, they lie where they fell');
  assertEqual(roomFigures(room, ['ossuary_ghouls_fled']).filter((f) => f.sprite === 'ghoul'), [], 'driven off, they’re gone');
});

test('Under the mill: companions stand a step behind the hero on the map, where the fight would start them', () => {
  const dungeon = findDungeon('mill-ossuary');
  const map = parseMap(dungeon.rows, dungeon.legend);
  const room = ossuaryRoom();
  assertEqual(besideEntry(map, room, roomFigures(room, []).map((f) => f.pos), 2), [{ x: 3, y: 18 }, { x: 4, y: 18 }]);
  const game = gameFor(wren);
  game.party = [];
  joinParty(game, 'odda');
  fight.startBattle(game, 'ossuary-ghouls', 0);
  assertEqual(fight.combatantById(game.battle, 'odda').pos, { x: 3, y: 0 }, 'the same square, counted from the room’s top row');
});

// Chapter 2 from the morning after, for a hero (a level 3 Champion unless given).
async function chapter2(seed, { character = champion, flags = [] } = {}) {
  const game = await storyGame(seed, character);
  game.flags.push(...flags);
  game.page = jumpTo(game, 'ch2_morning');
  return game;
}

// Down to the ossuary: Odda joins at the mill, then the cellar, the tunnel and the niches.
function downToTheOssuary(game) {
  pick(game, 'Run for the mill');
  pick(game, "Tell her you're glad");
  pick(game, 'Climb down into the tunnel');
  pick(game, 'Hurry on down');
  pick(game, 'Go on, towards the gnawing');
}

// Settles the Ghoul fight the shown choice starts: won, or lost.
function settleGhouls(game, won = true) {
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:ossuary-ghouls'));
  startFight(game, choice);
  if (won) for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  else game.hp = 0;
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

test('Chapter 2: Lark is gone; Odda joins at the mill, and the party goes down room by room', async () => {
  const game = await chapter2('ch2-down', { flags: ['goblins_at_mill', 'met_odda'] });
  assertEqual(game.journal.quests.find((q) => q.id === 'millers-daughter').status, 'active');
  pick(game, 'Run for the mill');
  assertTrue(pageText(game).includes('wolf-bait') && pageText(game).includes('Eat everybody'), 'Odda remembers you; the goblins saw Lark go');
  pick(game, 'Tell her you work alone');
  assertEqual(game.party.map((m) => m.id), ['odda'], 'she comes anyway');
  assertTrue(notes(game).some((n) => n.startsWith('Odda Brasswick joins you')));
  assertEqual(currentDungeon(game), { id: 'mill-ossuary', room: 'cellar', explored: ['cellar'] });
  forceNextD20(20);
  pick(game, 'Read the prints');
  revealAll(game);
  assertTrue(game.flags.includes('saw_ghoul_tracks'));
  pick(game, 'Climb down into the tunnel');
  assertEqual(currentDungeon(game).room, 'tunnel');
  assertTrue(pageText(game).includes("I'll have you loose before it bites"), 'at level 3, Odda has Lesser Restoration');
  forceNextD20(20);
  pick(game, 'Listen down the tunnel');
  revealAll(game);
  pick(game, 'Hurry on down');
  assertEqual(currentDungeon(game).room, 'niches');
  const money = game.money;
  pick(game, 'Pocket the silver pin');
  assertEqual([game.money - money, memberOf(game, 'odda').approval], [500, -1], 'five gold, and Odda saw');
  pick(game, 'Go on, towards the gnawing');
  assertEqual(currentDungeon(game).room, 'ossuary');
  assertTrue(tagsOf(game).some((t) => t === 'check:stealth:10'), 'heard from the tunnel: easier to creep up');
  pick(game, 'Shout to draw them away');
  assertEqual(memberOf(game, 'odda').approval, 0, 'protecting the weak');
  assertEqual(tagsOf(game), ['combat:ossuary-ghouls']);
});

test('Chapter 2: sneaking up on the ghouls, or luring them with Minor Illusion, is a surprise attack', async () => {
  const game = await chapter2('ch2-sneak');
  downToTheOssuary(game);
  assertTrue(tagsOf(game).some((t) => t === 'check:stealth:12'));
  forceNextD20(20);
  pick(game, 'Creep in');
  revealAll(game);
  assertEqual(tagsOf(game), ['combat:ossuary-ghouls surprise']);
  const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;
  const wizard = await chapter2('ch2-illusion', { character: juniper });
  downToTheOssuary(wizard);
  pick(wizard, 'Make a sound on the far side');
  assertEqual(tagsOf(wizard), ['combat:ossuary-ghouls surprise']);
});

test('Chapter 2: after the ghouls, Odda frees Lark with her Lesser Restoration; the truth pleases her; home', async () => {
  const game = await chapter2('ch2-odda-frees');
  downToTheOssuary(game);
  pick(game, 'Shout to draw them away');
  settleGhouls(game);
  assertTrue(game.flags.includes('ossuary_ghouls_destroyed'));
  assertEqual(cards(game), ['Ask Odda to free her', 'Lift her down and carry her out'], 'a Fighter has no Lesser Restoration');
  const card = game.story.currentChoices[0];
  assertTrue(card.tags.includes('spell:lesser-restoration') && card.tags.includes('by:odda'));
  pick(game, 'Ask Odda to free her');
  assertEqual(memberOf(game, 'odda').slotsUsed[1], 1, 'her level 2 slot');
  assertTrue(notes(game).includes('Odda casts Lesser Restoration, using a level 2 slot.'));
  assertTrue(['lark_rescued', 'lark_restored', 'found_garrick_neckerchief'].every((f) => game.flags.includes(f)));
  pick(game, 'Tell her the truth');
  assertEqual(memberOf(game, 'odda').approval, 2, 'the shout, then honesty');
  pick(game, 'Tell her to ask you again');
  pick(game, 'Climb back up to the daylight');
  assertEqual(currentDungeon(game).room, null, 'out from under the mill');
  assertEqual(game.journal.quests.find((q) => q.id === 'millers-daughter').status, 'done');
  assertTrue(pageText(game).includes('Somebody has to keep you breathing') && game.objective.includes('with Odda beside you'));
  assertEqual(cards(game), ['Head out into the market square'], 'on to Fen in the stocks');
  pick(game, 'Head out into the market square');
  assertTrue(pageText(game).includes('I used to sing with them') && currentLocation(game) === 'Bramblegate, the market square');
});

test('Chapter 2: a Life Cleric can free Lark herself; without Lesser Restoration you carry her out, and a lie displeases Odda', async () => {
  const cleric = await chapter2('ch2-cleric', { character: lifeCleric });
  downToTheOssuary(cleric);
  pick(cleric, 'Shout to draw them away');
  settleGhouls(cleric);
  assertEqual(cards(cleric).slice(0, 2), ['Free her with Lesser Restoration', 'Ask Odda to free her']);
  pick(cleric, 'Free her with Lesser Restoration');
  assertEqual([cleric.slotsUsed[1], memberOf(cleric, 'odda').slotsUsed[1] || 0], [1, 0], 'her own slot, not Odda’s');

  const low = await chapter2('ch2-carry', { character: wren }); // level 1: Odda is too
  downToTheOssuary(low);
  pick(low, 'Shout to draw them away');
  settleGhouls(low);
  assertEqual(cards(low), ['Lift her down and carry her out']);
  pick(low, 'Lift her down');
  assertEqual(currentDungeon(low).room, null, 'carried up into the yard');
  assertTrue(low.flags.includes('lark_carried_out'));
  pick(low, 'Tell her he');
  assertEqual(memberOf(low, 'odda').approval, 0, 'the shout, then the lie');
  pick(low, 'Tell her no');
  assertEqual(low.journal.quests.find((q) => q.id === 'millers-daughter').status, 'done');
});

test('Chapter 2: losing to the ghouls is Fate’s Mercy: Nettle’s goblins, or the watch, bring everyone up alive', async () => {
  const game = await chapter2('ch2-mercy', { flags: ['goblins_at_mill'] });
  downToTheOssuary(game);
  pick(game, 'Shout to draw them away');
  memberOf(game, 'odda').hp = 0;
  settleGhouls(game, false);
  assertTrue(pageText(game).includes('Goblins brought you in') && game.money === 0);
  assertTrue(['ossuary_ghouls_fled', 'lark_rescued', 'ossuary_fates_mercy'].every((f) => game.flags.includes(f)));
  assertTrue(memberOf(game, 'odda').hp > 0 && pageText(game).includes('we bring more friends'), 'the night’s rest brings Odda round');
  assertEqual(currentDungeon(game).room, null);

  const watch = await chapter2('ch2-watch');
  downToTheOssuary(watch);
  pick(watch, 'Shout to draw them away');
  settleGhouls(watch, false);
  assertTrue(pageText(watch).includes('Morwen raised the whole watch'));
});

test('Chapter 2: if Odda dies in the ossuary, the scenes go on without her, and the temple keeps her', async () => {
  const game = await chapter2('ch2-odda-dies');
  downToTheOssuary(game);
  pick(game, 'Shout to draw them away');
  memberOf(game, 'odda').fallen = true;
  settleGhouls(game);
  assertTrue(pageText(game).includes("she's gone"));
  assertEqual(cards(game), ['Lift her down and carry her out'], 'no Lesser Restoration from her now');
  pick(game, 'Lift her down');
  pick(game, 'Tell her the truth');
  assertTrue(!pageText(game).includes('Odda gives you a long look'));
  pick(game, 'Tell her she already is one');
  assertTrue(pageText(game).includes('lays her before the altar flame') && !pageText(game).includes('Somebody has to keep you breathing'));
  assertEqual(cards(game), ['Head out into the market square'], 'on to Fen, without her');
});

// ---- Chapter 2: Fen in the stocks ----

const rogue3 = { ...sorael, level: 3, subclassId: 'thief', hitPointRolls: [null, null] };
const knockWizard = {
  ...juniper,
  level: 3,
  subclassId: 'evoker',
  hitPointRolls: [null, null],
  spells: { ...juniper.spells, spellbook: [...juniper.spells.spellbook, 'knock'], prepared: [...juniper.spells.prepared, 'knock'] },
};

// The market square after Morwen's breakfast: a hero (a level 3 Champion unless given) with
// Odda (unless odda is false) and 25 gold.
async function atTheStocks(seed, { character = champion, flags = [], odda = true, gold = 25 } = {}) {
  const game = await storyGame(seed, character);
  game.flags.push(...flags);
  game.money = gold * 100;
  if (odda) joinParty(game, 'odda');
  game.page = jumpTo(game, 'ch2_stocks');
  return game;
}

// Hears Fen out; then the hunters ride in.
const huntersArrive = (game) => pick(game, 'Decide what to do about him');

// Settles the hunters' fight the shown choice starts: won, or lost.
function settleHunters(game, won = true) {
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:stocks-hunters'));
  if (!choice) throw new Error(`No fight: ${cards(game).join(' / ')}`);
  startFight(game, choice);
  if (won) for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  else game.hp = 0;
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

const fenIn = (game) => game.party.some((m) => m.id === 'fen');
const missingMiller = (game) => game.journal.quests.find((q) => q.id === 'missing-miller').notes.map((n) => n.text).join(' ');
// The end of the scene: the lead to Cairnfield, and the end of what's written of Chapter 2.
const toCairnfield = (game) => game.flags.includes('heard_of_cairnfield') && game.objective.includes('Cairnfield') && missingMiller(game).includes('Cairnfield') && game.story.currentChoices.length === 0;

test('Chapter 2: Fen begs from the stocks; questions don’t repeat; a Rogue who read the chalk marks knows the songbird', async () => {
  const game = await atTheStocks('stocks-talk');
  assertTrue(pageText(game).includes('I used to sing with them'));
  assertEqual(cards(game), ['Ask who he is', 'Ask who he used to sing with', 'Watch his face while he talks', "Ask where they're taking the miller", 'Decide what to do about him'], 'no chalk marks: not a Rogue');
  const said = pick(game, 'Ask who he is').beats.filter((b) => b.type === 'text');
  assertEqual([said.length, said[0].speaker], [1, 'fen'], 'his answer, and no greeting after it');
  assertTrue(!cards(game).includes('Ask who he is'), 'asked once');
  forceNextD20(20);
  pick(game, 'Watch his face');
  revealAll(game);
  assertTrue(game.flags.includes('fen_read_true'));

  const rogue = await atTheStocks('stocks-rogue', { character: rogue3, flags: ['read_cant_marks'] });
  pick(rogue, 'Tell him you read the chalk mark');
  assertTrue(rogue.flags.includes('knew_fen_songbird') && pageText(rogue).includes("So you're one of us"));
});

test('Chapter 2: Mercy Gaunt’s hunters come for Fen, and every way out is offered, to the heroes who can take it', async () => {
  const game = await atTheStocks('stocks-hunters', { flags: ['varrow_approves'] });
  huntersArrive(game);
  assertTrue(pageText(game).includes('The Choir pays double for dead') && pageText(game).includes('Choir money'), 'Gaunt, and Odda’s word on it');
  assertEqual(game.page.beats.find((b) => b.type === 'text' && b.text.includes('Dead or alive')).speaker, 'gaunt');
  assertEqual(cards(game), ['Pay his fine', 'Fetch Captain Varrow from the watch-house, and talk him round', "Tell Gaunt that if she wants him, she'll come through you", "Take Gaunt's ten gold, and walk on", "Leave him to it: he's a thief, and it's none of yours"], 'a Fighter has no picks and no Knock');
  assertEqual(tagsOf(game).slice(0, 2), ['pay:10', 'check:persuasion:10 drive:justice'], 'Varrow liked how you dealt with the goblins');
  assertEqual(tagsOf(game).slice(2, 4), ['drive:freedom', 'drive:wealth']);

  const wary = await atTheStocks('stocks-wary', { flags: ['varrow_wary'], gold: 9 });
  huntersArrive(wary);
  assertTrue(!cards(wary).includes('Pay his fine'), 'nine gold won’t pay a ten gold fine');
  assertTrue(tagsOf(wary).includes('check:persuasion:15 drive:justice'), 'he was wary of the goblin bargain');
  const rogue = await atTheStocks('stocks-tools', { character: rogue3 });
  huntersArrive(rogue);
  assertTrue(tagsOf(rogue).includes('check:thieves-tools:13') && tagsOf(rogue).includes('check:persuasion:13 drive:justice'));
  const wizard = await atTheStocks('stocks-wizard', { character: knockWizard });
  huntersArrive(wizard);
  assertTrue(tagsOf(wizard).includes('spell:knock') && !tagsOf(wizard).includes('check:thieves-tools:13'));
});

test('Chapter 2: paying Fen’s fine frees him by law; the hunters back off, and he joins with the lead to Cairnfield', async () => {
  const game = await atTheStocks('stocks-fine');
  huntersArrive(game);
  const xp = game.xp;
  pick(game, 'Pay his fine');
  assertEqual(game.money, 1500, 'ten of the 25 gold');
  assertTrue(notes(game).includes('You pay 10 GP.') && notes(game).some((n) => n.startsWith('Fen Underbough joins you')), notes(game).join(' / '));
  assertEqual(game.party.map((m) => m.id), ['odda', 'fen']);
  assertTrue(['fen_freed', 'hunters_backed_off'].every((f) => game.flags.includes(f)));
  assertEqual(game.xp - xp, 500, 'the hunters’ XP, without a fight');
  assertTrue(pageText(game).includes('water and wheels') && pageText(game).includes('Keep your hands where I can see them'));
  assertTrue(toCairnfield(game) && missingMiller(game).includes('water and wheels'));
});

test('Chapter 2: talking Varrow round is a Justice moment; if he won’t, the other ways are still there', async () => {
  const game = await atTheStocks('stocks-varrow-no', { flags: ['varrow_wary'] }); // Wren's Drive is Justice
  huntersArrive(game);
  game.inspiration = false;
  forceNextD20(1);
  pick(game, 'Fetch Captain Varrow');
  revealAll(game);
  assertTrue(game.inspiration, 'her Drive');
  assertTrue(pageText(game).includes('He sits till sundown') && !fenIn(game));
  assertTrue(!cards(game).some((t) => t.startsWith('Fetch Captain Varrow')) && cards(game).includes('Pay his fine'), 'asked once; the other ways are still there');

  const agrees = await atTheStocks('stocks-varrow-yes', { flags: ['varrow_approves'] });
  huntersArrive(agrees);
  forceNextD20(20);
  pick(agrees, 'Fetch Captain Varrow');
  revealAll(agrees);
  assertTrue(fenIn(agrees) && ['varrow_freed_fen', 'hunters_backed_off'].every((f) => agrees.flags.includes(f)) && toCairnfield(agrees));
});

test('Chapter 2: picking the padlock pleases Fen, but the hunters draw: face them down, or fight', async () => {
  const fumble = await atTheStocks('stocks-fumble', { character: rogue3 });
  huntersArrive(fumble);
  forceNextD20(1);
  pick(fumble, 'Pick the padlock');
  revealAll(fumble);
  assertTrue(!fenIn(fumble) && !cards(fumble).some((t) => t.startsWith('Pick the padlock')) && cards(fumble).includes('Pay his fine'), 'the watchman woke up');

  const game = await atTheStocks('stocks-pick', { character: rogue3 });
  huntersArrive(game);
  forceNextD20(20);
  pick(game, 'Pick the padlock');
  revealAll(game);
  assertTrue(fenIn(game) && game.flags.includes('picked_the_stocks'));
  assertEqual(memberOf(game, 'fen').approval, 1, 'cleverness');
  assertEqual(cards(game), ['Face them down', 'Fight them']);
  assertEqual(tagsOf(game), ['check:intimidation:13', 'combat:stocks-hunters']);
  const xp = game.xp;
  forceNextD20(20);
  pick(game, 'Face them down');
  revealAll(game);
  assertTrue(game.flags.includes('hunters_faced_down') && game.xp - xp === 500 && toCairnfield(game));
});

test('Chapter 2: Knock springs the padlock with a bang; if Gaunt won’t be stared down, it’s a fight', async () => {
  const game = await atTheStocks('stocks-knock', { character: knockWizard });
  huntersArrive(game);
  pick(game, 'Knock the padlock open');
  assertEqual(game.slotsUsed[1], 1, 'a level 2 slot');
  assertTrue(notes(game).includes('You cast Knock, using a level 2 slot.') && fenIn(game) && game.flags.includes('knocked_the_stocks'));
  forceNextD20(1);
  pick(game, 'Face them down');
  revealAll(game);
  assertEqual(cards(game), ['Fight!']);
  assertEqual(tagsOf(game), ['combat:stocks-hunters']);
});

test('Chapter 2: fighting for Fen frees him first, so he fights beside you; then you decide whether Gaunt hangs', async () => {
  const game = await atTheStocks('stocks-fight');
  huntersArrive(game);
  pick(game, 'Tell Gaunt that if she wants him');
  assertTrue(fenIn(game) && pageText(game).includes('Been at it since breakfast'));
  assertEqual(cards(game), ['Fight!']);
  assertEqual(fightRating(game, 'stocks-hunters').rating, 'Moderate', 'for the three of you');
  startFight(game, game.story.currentChoices[0]);
  const at = (id) => fight.combatantById(game.battle, id).pos;
  assertEqual([at('hero'), at('odda'), at('fen')], [{ x: 3, y: 5 }, { x: 2, y: 4 }, { x: 3, y: 4 }], 'the party together, the hunters across the square');
  assertEqual(fight.enemies(game.battle).map((c) => c.name), ['Mercy Gaunt', 'Bandit 1', 'Bandit 2']);
  for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  game.battle.outcome = 'victory';
  game.page = continueAfterBattle(game);
  assertTrue(game.flags.includes('hunters_beaten') && pageText(game).includes("That's a hanging") && pageText(game).includes('Not even single'));
  assertEqual(cards(game), ["Speak for her: there's been enough blood for one day", "Leave her to the captain's law"]);
  pick(game, 'Speak for her');
  assertEqual([memberOf(game, 'fen').approval, memberOf(game, 'odda').approval], [1, 1], 'sparing people; mercy');
  assertTrue(game.flags.includes('gaunt_spared') && toCairnfield(game));

  const rope = await atTheStocks('stocks-rope');
  huntersArrive(rope);
  pick(rope, 'Tell Gaunt that if she wants him');
  settleHunters(rope);
  pick(rope, 'Leave her to the captain');
  assertEqual([memberOf(rope, 'fen').approval, memberOf(rope, 'odda').approval], [-1, 0], 'Fen hates a hanging');
  assertTrue(rope.flags.includes('gaunt_hanged') && toCairnfield(rope));

  const pair = await atTheStocks('stocks-pair', { odda: false });
  huntersArrive(pair);
  pick(pair, 'Tell Gaunt that if she wants him');
  assertEqual(fightRating(pair, 'stocks-hunters').rating, 'High', 'just you and Fen');
});

test('Chapter 2: losing to the hunters is Fate’s Mercy: robbed, but they ran without Fen', async () => {
  const game = await atTheStocks('stocks-mercy');
  huntersArrive(game);
  pick(game, 'Tell Gaunt that if she wants him');
  memberOf(game, 'fen').hp = 0;
  memberOf(game, 'odda').hp = 0;
  settleHunters(game, false);
  assertTrue(game.money === 0 && ['hunters_fled', 'stocks_fates_mercy'].every((f) => game.flags.includes(f)));
  assertTrue(fenIn(game) && memberOf(game, 'fen').hp > 0 && pageText(game).includes('horse trough'), 'still with you, and rested');
  assertEqual(currentLocation(game), 'Bramblegate, the Tallow and Thistle');
  assertTrue(toCairnfield(game));
});

test('Chapter 2: if Fen dies fighting the hunters, the temple keeps him, and their writ points to Cairnfield', async () => {
  const game = await atTheStocks('stocks-fen-dies');
  huntersArrive(game);
  pick(game, 'Tell Gaunt that if she wants him');
  memberOf(game, 'fen').fallen = true;
  settleHunters(game);
  assertTrue(pageText(game).includes("he's gone") && game.flags.includes('fen_fell_at_the_stocks'));
  pick(game, 'Speak for her');
  assertTrue(!pageText(game).includes('card trick') && pageText(game).includes('laid before the altar flame') && pageText(game).includes('Deliver him, or proof of him'));
  assertTrue(toCairnfield(game));
});

test('Chapter 2: selling Fen is a Wealth moment that Odda hates; Gaunt names Cairnfield, and he remembers your face', async () => {
  const game = await atTheStocks('stocks-sold', { character: { ...champion, drive: 'wealth' } });
  huntersArrive(game);
  game.inspiration = false;
  pick(game, "Take Gaunt's ten gold");
  assertEqual(game.money, 3500);
  assertTrue(game.inspiration && memberOf(game, 'odda').approval === -1 && !fenIn(game) && game.flags.includes('fen_sold'));
  assertTrue(pageText(game).includes("I'll remember your face") && pageText(game).includes('floury fellow'));
  assertEqual(currentTime(game), 'Dusk');
  assertTrue(toCairnfield(game));
});

test('Chapter 2: leave Fen to the hunters, and the lead comes from Nettle’s goblins (for a favour) or from Varrow', async () => {
  const goblins = await atTheStocks('stocks-left-goblins', { flags: ['goblins_at_mill'] });
  huntersArrive(goblins);
  pick(goblins, 'Leave him to it');
  assertTrue(['fen_left_behind', 'owe_nettle'].every((f) => goblins.flags.includes(f)) && pageText(goblins).includes('now you owe her') && toCairnfield(goblins));

  const alone = await atTheStocks('stocks-left-varrow', { odda: false });
  huntersArrive(alone);
  assertTrue(!pageText(alone).includes('Choir money'), 'no Odda, no word from her');
  pick(alone, 'Leave him to it');
  assertTrue(pageText(alone).includes("If your miller's anywhere, he's there") && !alone.flags.includes('owe_nettle') && toCairnfield(alone));
});

run(document.getElementById('summary'), document.getElementById('results'));

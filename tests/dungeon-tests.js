// Dungeon checks: the maps, moving room to room, fights in a room, traps, and the
// Brackenhollow warren scenes. Open tests/dungeon.html through the local server to run them.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { isStandable, parseMap } from '../js/engine/combat/grid.js';
import * as fight from '../js/engine/combat/battle.js';
import { besideEntry, dungeonRows, enterRoom, findDungeon, parseRoomTag, roomEntry, roomFigures } from '../js/engine/world/dungeons.js';
import { sprites, tiles } from '../data/campaign/sprites.js';
import { people } from '../data/campaign/people.js';
import { joinParty, memberMaxHp, memberOf } from '../js/engine/character/party.js';
import { findTrap, springTrap, takeDamage, trapDamageDice } from '../js/engine/character/hazards.js';
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
import { findPerson, speakerName } from '../js/engine/ui/speakers.js';

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
    // The map as first drawn, and as each of its rooms' changes leaves it (a doorway can be shut
    // until the room changes: the stair under the vault's water).
    const changed = dungeon.rooms.flatMap((r) => (r.changes || []).map((c) => parseMap(dungeonRows(dungeon, c.on), dungeon.legend)));
    const openSometime = (pos) => [map, ...changed].some((m) => isStandable(m, pos));
    for (const room of dungeon.rooms) {
      const [first, last] = room.rows;
      assertTrue(first >= 0 && last < map.height && first < last, `${room.id}: rows`);
      for (const entry of [room.entry, ...(room.entryWhen || []).map((e) => e.pos)]) {
        assertTrue(entry.y >= first && entry.y <= last && isStandable(map, entry), `${room.id}: entry`);
      }
      for (const [to, squares] of Object.entries(room.exits)) {
        for (const pos of squares) assertTrue((pos.y === first || pos.y === last) && openSometime(pos), `${room.id} → ${to}: doorway`);
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
// The end of the scene: the lead to Cairnfield, then a night at the inn before the road north
// to the Old Ford (ch2-old-ford.ink).
const toCairnfield = (game) =>
  game.flags.includes('heard_of_cairnfield') &&
  game.objective.includes('Cairnfield') &&
  missingMiller(game).includes('Cairnfield') &&
  pageText(game).includes('That night you sleep at the Tallow and Thistle') &&
  cards(game).join() === 'Set out north at first light';

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
  assertTrue(game.page.beats.some((b) => b.type === 'time' && b.value === 'Dusk'), 'they ride out at sundown');
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

// ---- Chapter 2: the Old Ford, and the Bond ----

// The night at the inn after the stocks: a hero (a level 3 Champion unless given; Wren's Bond
// is her sibling, Kit Ashdown) with Odda and Fen (unless left out) and 25 gold.
async function toTheFord(seed, { character = champion, flags = [], odda = true, fen = true, gold = 25 } = {}) {
  const game = await storyGame(seed, character);
  game.flags.push(...flags);
  game.money = gold * 100;
  if (odda) joinParty(game, 'odda');
  if (fen) joinParty(game, 'fen');
  game.page = jumpTo(game, 'ch2_old_ford');
  return game;
}

// Up the barrow road to the post, and ready for the night (Fen, if he's waiting there, has to
// be answered first: reply is the start of the answer).
function readyAtTheFord(game, reply = null) {
  pick(game, 'Set out north at first light');
  pick(game, 'Walk on');
  if (reply) pick(game, reply);
  pick(game, 'Get ready for the night');
}

// Settles the ford fight: won or lost, with these of the watch still standing.
function settleFord(game, { won = true, standing = ['brannock', 'wat', 'nell'], setUp = () => {} } = {}) {
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:ford-dead'));
  if (!choice) throw new Error(`No fight: ${cards(game).join(' / ')}`);
  startFight(game, choice);
  for (const ally of fight.allyCombatants(game.battle)) ally.hp = standing.includes(ally.id) ? Math.max(1, ally.hp) : 0;
  setUp(game);
  if (won) for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  else game.hp = 0;
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

// The oath-stone in the shallows, read with a roll of 20.
function readTheStone(game) {
  forceNextD20(20);
  pick(game, 'Read the carving');
  revealAll(game);
}

const speakersOf = (game) => game.page.beats.filter((b) => b.type === 'text' && b.speaker).map((b) => b.speaker);
const deeds = (game) => game.journal.deeds.map((d) => d.text).join(' ');

test('Chapter 2: a night at the inn, then the barrow road north, where every old barrow stands open', async () => {
  const game = await toTheFord('ford-road');
  assertTrue(notes(game).some((n) => n.startsWith('A good place to stop')), 'a long rest at the inn');
  pick(game, 'Set out north at first light');
  assertEqual(currentLocation(game), 'The barrow road');
  assertTrue(pageText(game).includes('Every barrow you pass has been opened') && speakersOf(game).includes('fen'));
  assertEqual(cards(game), ['Read the ground round the nearest barrow', 'Walk on: you want the ford by nightfall']);
  forceNextD20(20);
  pick(game, 'Read the ground');
  revealAll(game);
  assertTrue(game.flags.includes('saw_capstone_tracks') && missingMiller(game).includes('capstones'));
  assertEqual([currentLocation(game), currentTime(game)], ['The Old Ford', 'Dusk']);
  assertEqual(cards(game), ["Ask what's been happening here", 'Ask where the stones come from', 'Ask why the watch is still here', 'Get ready for the night'], 'Fen is with you already');
  const said = pick(game, "Ask what's been happening here").beats.filter((b) => b.type === 'text');
  assertTrue(said.every((b) => b.speaker === 'brannock') && !pageText(game).includes("That's far enough"), 'her answer, and no greeting after it');
  assertTrue(!cards(game).includes("Ask what's been happening here"), 'asked once');
  pick(game, 'Get ready for the night');
  assertEqual(cards(game), ['Hold the ford with the watch', 'Slip away upriver in the dark, and leave the watch to it']);
  assertTrue(game.objective.includes("keep Sergeant Brannock's watch alive"));
});

test('Chapter 2: hold the ford with all three of the watch alive: the Regency’s favour, and Varrow’s help to come', async () => {
  const game = await toTheFord('ford-all');
  readyAtTheFord(game);
  const xp = game.xp;
  settleFord(game);
  assertTrue(['ford_held', 'ford_watch_saved', 'regency_favour', 'varrow_holds_cairns'].every((f) => game.flags.includes(f)) && !game.flags.includes('ford_fell'));
  assertTrue(pageText(game).includes('All of us') && speakersOf(game).includes('brannock'));
  assertEqual(cards(game), ['Read the carving'], 'no Comprehend Languages for a Champion');
  readTheStone(game);
  assertTrue(['read_the_oath_stone', 'knows_oath_wards'].every((f) => game.flags.includes(f)) && pageText(game).includes('TAMAR OAKHEART'));
  assertTrue(pageText(game).includes('An oath-grave') && missingMiller(game).includes('oath-stone') && game.xp - xp === 50, 'the clue is worth 50 XP');
  assertTrue(deeds(game).includes('Kept all three') && pageText(game).includes('The captain'));
  // Wren's Bond: a letter from her sibling, in the post's mailbag.
  assertTrue(pageText(game).includes("Kit Ashdown's") && game.flags.includes('sibling_letter') && missingMiller(game).includes('A letter from Kit Ashdown'));
  assertTrue(game.objective.startsWith('Cross the Old Ford'));
  assertEqual(cards(game), ['Follow the barrow road north'], 'on to Cairnfield');
});

test('Chapter 2: if the sergeant falls, the post still holds, and whoever’s left takes up her sash', async () => {
  const nell = await toTheFord('ford-nell');
  readyAtTheFord(nell);
  settleFord(nell, { standing: ['wat', 'nell'] });
  assertTrue(nell.flags.includes('ford_held') && !['ford_watch_saved', 'regency_favour', 'ford_fell'].some((f) => nell.flags.includes(f)));
  assertTrue(pageText(nell).includes('ties it round her own arm') && speakersOf(nell).includes('nell') && !speakersOf(nell).includes('brannock'));

  const wat = await toTheFord('ford-wat');
  readyAtTheFord(wat);
  settleFord(wat, { standing: ['wat'] });
  assertTrue(pageText(wat).includes("Didn't it? It held.") && speakersOf(wat).includes('wat'));

  const sergeant = await toTheFord('ford-sergeant');
  readyAtTheFord(sergeant);
  settleFord(sergeant, { standing: ['brannock'] });
  assertTrue(pageText(sergeant).includes('But the post held') && speakersOf(sergeant).includes('brannock'));
});

test('Chapter 2: if none of the watch live, the post falls, and you carry the news back to Bramblegate', async () => {
  const game = await toTheFord('ford-fell');
  readyAtTheFord(game);
  settleFord(game, { standing: [] });
  assertTrue(game.flags.includes('ford_fell') && !game.flags.includes('ford_held') && pageText(game).includes('nobody left to keep it'));
  readTheStone(game);
  assertTrue(game.objective.startsWith('Carry word to Bramblegate that the Old Ford has fallen'));
});

test('Chapter 2: losing at the ford is Fate’s Mercy: the river takes your purse, and whoever of the watch still stood drags you in', async () => {
  const game = await toTheFord('ford-mercy');
  readyAtTheFord(game);
  settleFord(game, { won: false, standing: ['brannock', 'nell'] });
  assertTrue(['ford_fates_mercy', 'ford_held'].every((f) => game.flags.includes(f)) && game.money === 0);
  assertTrue(pageText(game).includes('dragged you in') && speakersOf(game).includes('brannock') && notes(game).some((n) => n.startsWith('A good place to stop')));
  assertEqual(game.hp, fight.maxHpOf(game, { id: 'hero' }), 'a long rest');

  const alone = await toTheFord('ford-mercy-alone');
  readyAtTheFord(alone);
  settleFord(alone, { won: false, standing: [] });
  assertTrue(alone.flags.includes('ford_fell') && pageText(alone).includes('You come to in the reeds'));
});

test('Chapter 2: slipping away leaves the watch to the dead: the post falls, and Odda thinks less of you', async () => {
  const game = await toTheFord('ford-abandoned', { character: knockWizard });
  readyAtTheFord(game);
  const xp = game.xp;
  pick(game, 'Slip away upriver');
  assertTrue(['ford_abandoned', 'ford_fell'].every((f) => game.flags.includes(f)) && memberOf(game, 'odda').approval === -1 && game.xp === xp);
  // A Wizard can read the oath-stone with Comprehend Languages, as a Ritual.
  assertEqual(cards(game), ['Read the carving', 'Read it with Comprehend Languages']);
  pick(game, 'Read it with Comprehend Languages');
  assertTrue(game.flags.includes('read_the_oath_stone') && pageText(game).includes('TAMAR OAKHEART'));
  // Juniper's Bond: her mentor's letter.
  assertTrue(pageText(game).includes('If you hear singers in grey, run') && pageText(game).includes('Orrin Mossbottom') && game.flags.includes('mentor_warned'));
  assertTrue(game.objective.startsWith('Carry word to Bramblegate'));
});

test('Chapter 2: sold at the stocks, Fen is waiting at the ford, sour; he fights beside you, and comes along after', async () => {
  const game = await toTheFord('ford-fen-sold', { fen: false, flags: ['fen_sold'] });
  pick(game, 'Set out north at first light');
  pick(game, 'Walk on');
  assertTrue(pageText(game).includes('Ten gold') && fenIn(game) && memberOf(game, 'fen').approval === -2, 'he joins for the night, liking you less');
  assertEqual(cards(game), ["Tell him you're sorry", "Give him Gaunt's ten gold", 'Tell him it was nothing personal']);
  pick(game, "Give him Gaunt's ten gold");
  assertEqual([game.money, memberOf(game, 'fen').approval], [1500, -1]);
  pick(game, 'Get ready for the night');
  settleFord(game);
  readTheStone(game);
  assertTrue(pageText(game).includes("It's arithmetic") && game.flags.includes('fen_returned'));
  assertEqual(cards(game), ["Tell him you're glad", 'Tell him to suit himself']);
  pick(game, 'Tell him to suit himself');
  assertTrue(fenIn(game) && game.objective.startsWith('Cross the Old Ford'));

  const left = await toTheFord('ford-fen-left', { fen: false, flags: ['fen_left_behind'] });
  pick(left, 'Set out north at first light');
  pick(left, 'Walk on');
  assertTrue(pageText(left).includes('You walked on') && memberOf(left, 'fen').approval === -1);
  assertEqual(cards(left), ["Tell him you're sorry", 'Tell him it was nothing personal'], 'no gold to give back');
  pick(left, "Tell him you're sorry");
  assertEqual(memberOf(left, 'fen').approval, 0);
});

test('Chapter 2: a companion who falls at the ford lies in state until they can be raised', async () => {
  const game = await toTheFord('ford-fen-falls');
  readyAtTheFord(game);
  settleFord(game, {
    setUp: (g) => {
      fight.combatantById(g.battle, 'fen').state = 'dead';
      Object.assign(memberOf(g, 'fen'), { hp: 0, fallen: true });
    },
  });
  assertTrue(game.flags.includes('fen_fell_at_the_ford') && !game.flags.includes('odda_fell_at_the_ford'));
  assertTrue(pageText(game).includes('Somebody has to close his eyes') && pageText(game).includes('supply cart'));
});

test('Chapter 2: a Rival rides in at dawn after the same bounty, under the name you gave them, and goes on ahead alone', async () => {
  const character = { ...champion, bond: { type: 'rival', name: 'Sable Rook' } };
  const game = await toTheFord('ford-rival', { character });
  readyAtTheFord(game);
  settleFord(game);
  readTheStone(game);
  assertTrue(pageText(game).includes("It's Sable Rook") && speakersOf(game).includes('rival'));
  assertEqual(speakerName(findPerson('rival'), character), 'Sable Rook', 'the portrait shows the name you gave them');
  assertEqual(speakerName(findPerson('rival'), wren), 'Your rival', 'for a hero with another Bond');
  assertEqual(cards(game), ['Offer to go after the miller together', 'Warn them about the Choir', "Tell them the miller's yours"]);
  pick(game, 'Offer to go after the miller together');
  assertTrue(['rival_offered_truce', 'rival_went_ahead'].every((f) => game.flags.includes(f)) && missingMiller(game).includes('Your rival, Sable Rook'));
  assertTrue(game.objective.startsWith('Cross the Old Ford'));
  assertEqual(cards(game), ['Follow the barrow road north'], 'on to Cairnfield');
});

test('Chapter 2: for a Debt, a Free League factor offers to square it for anything shiny from the barrow', async () => {
  const game = await toTheFord('ford-debt', { character: rogue3 });
  readyAtTheFord(game);
  settleFord(game);
  readTheStone(game);
  assertTrue(pageText(game).includes('You owe Old Mother Quill a great deal of money') && speakersOf(game).includes('penhallow'));
  forceNextD20(20);
  pick(game, 'Ask what the League really wants');
  revealAll(game);
  assertTrue(game.flags.includes('league_wants_crowns') && pageText(game).includes('Anything with a crown on it'));
  assertEqual(cards(game), ['Shake on it', "Turn him down: you don't rob the dead"]);
  pick(game, 'Shake on it');
  assertTrue(['league_deal', 'met_penhallow'].every((f) => game.flags.includes(f)) && memberOf(game, 'odda').approval === -1);
  assertTrue(deeds(game).includes('your debt to Old Mother Quill') && game.objective.startsWith('Cross the Old Ford'));
});

// ---- Chapter 2, beat 7: the camp at Cairnfield ----

// The start of the Cairnfield scene, just after the Old Ford: a hero (a level 3 Champion unless
// given) with Odda and Fen (unless false), and anything extra in the pack (items: ids).
async function atCairnfield(seed, { character = champion, flags = [], odda = true, fen = true, items = [] } = {}) {
  const game = await storyGame(seed, character);
  game.flags.push(...flags);
  for (const id of items) game.inventory.push({ id, quantity: 1 });
  if (odda) joinParty(game, 'odda');
  if (fen) joinParty(game, 'fen');
  game.page = jumpTo(game, 'ch2_cairnfield');
  return game;
}

// Up the road (by way of Bramblegate, if the ford fell: the temple, the inn, and the road north
// in the morning), a night in the sheepfold, and up to the ridge at dusk.
function upToTheRidge(game) {
  if (game.flags.includes('ford_fell')) {
    pick(game, 'Carry the news down to Bramblegate');
    throughTheTemple(game);
    pick(game, 'Go out into the town at first light');
    pick(game, 'Take the barrow road north again');
  } else {
    pick(game, 'Follow the barrow road north');
  }
  pick(game, 'Get some sleep');
  pick(game, 'Go up to the ridge');
}

// Settles the camp fight from the choice starting `start`: won (with the foes in `fled` run
// off) or lost.
function settleCamp(game, start, { won = true, fled = [], setUp = () => {} } = {}) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start) && (c.tags || []).includes('combat:cairnfield-camp'));
  if (!choice) throw new Error(`No fight "${start}": ${cards(game).join(' / ')}`);
  startFight(game, choice);
  setUp(game);
  if (won) {
    for (const foe of fight.enemies(game.battle)) {
      foe.hp = 0;
      if (fled.includes(foe.id)) foe.escaped = true;
    }
  } else {
    game.hp = 0;
  }
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

// Juniper at level 3 with Invisibility in her spellbook, prepared.
const invisibleWizard = {
  ...knockWizard,
  spells: { ...knockWizard.spells, spellbook: [...knockWizard.spells.spellbook, 'invisibility'], prepared: [...knockWizard.spells.prepared, 'invisibility'] },
};

test('Cairnfield: Rhosyn sings, the acolytes are numbered, and unless the hymn breaks, another Zombie rises on round 3', () => {
  const game = warrenFight('cairnfield-camp', champion);
  game.hp = 300; // so the hero is still standing to watch
  assertEqual(fight.enemies(game.battle).map((c) => c.name), ['Sister Rhosyn', 'Choir Acolyte 1', 'Choir Acolyte 2', 'Choir Acolyte 3', 'Choir Acolyte 4', 'Zombie 1', 'Zombie 2']);
  assertTrue(fight.objectiveText(game.battle).includes('another Zombie rises at the start of round 3'));
  fight.endHeroTurn(game);
  assertTrue(game.battle.log.some((e) => e.text.startsWith('Sister Rhosyn sings on')), 'she does nothing but sing');
  fight.endHeroTurn(game);
  assertTrue(game.battle.log.some((e) => e.text.includes('Zombie 3 drags itself up out of the opened barrow')));
  assertEqual(fight.objectiveText(game.battle), 'The hymn is finished.');
});

test('Cairnfield: Sister Rhosyn is a Cultist Fanatic, with her Pact Blade and SRD 5.2.1’s Spellcasting', () => {
  const fanatic = monsters.find((m) => m.id === 'cultist-fanatic');
  assertEqual([fanatic.ac, fanatic.hp.average, fanatic.xp, fanatic.saves.wisdom], [13, 44, 450, 4]);
  assertEqual(fanatic.attacks[0].damage, { dice: '1d8', bonus: 2, type: 'slashing', plus: { dice: '2d6', type: 'necrotic' } });
  const { ability, saveDc, attackBonus, atWill, spells } = fanatic.spellcasting;
  assertEqual([ability, saveDc, attackBonus, atWill], ['wisdom', 12, 4, ['light', 'thaumaturgy']]);
  assertEqual(spells.map((s) => [s.id, s.perDay, Boolean(s.bonusAction)]), [['hold-person', 1, false], ['command', 2, false], ['spiritual-weapon', 2, true]]);
  assertEqual(spells.find((s) => s.id === 'command').words, ['grovel', 'halt']);
  assertTrue(fanatic.variant.includes('Grovel and Halt') && Boolean(sprites[fanatic.sprite]));
});

// ---- A foe's spells: the Cultist Fanatic (Sister Rhosyn) ----

// Sister Rhosyn at Cairnfield with her hymn broken, at `at` (two squares above the hero at
// (3, 8) unless given), every other foe out of it, and Odda or Fen at their squares if given.
// It's the hero's turn, then Rhosyn's, then any companions'. spent: the spells she has cast
// already today ({ 'hold-person': 1 }). The hero has Hit Points to spare, to watch a few rounds.
function fanaticFight({ character = champion, seed = 'fanatic', at = { x: 3, y: 6 }, odda = null, fen = null, spent = {}, inspiration = false } = {}) {
  const game = { ...gameFor(character, seed), party: [], inspiration };
  if (odda) joinParty(game, 'odda');
  if (fen) joinParty(game, 'fen');
  forceNextD20(20);
  fight.startBattle(game, 'cairnfield-camp', 0);
  const battle = game.battle;
  const rhosyn = fight.combatantById(battle, 'cultist-fanatic-1');
  for (const foe of fight.enemies(battle)) if (foe !== rhosyn) foe.hp = 0;
  battle.hymn = { singing: false, risen: false };
  Object.assign(rhosyn, { pos: { ...at }, spellsCast: { ...spent } });
  fight.heroCombatant(battle).pos = { x: 3, y: 8 };
  if (odda) fight.combatantById(battle, 'odda').pos = { ...odda };
  if (fen) fight.combatantById(battle, 'fen').pos = { ...fen };
  battle.order = ['hero', rhosyn.id, ...(odda ? ['odda'] : []), ...(fen ? ['fen'] : [])];
  battle.turn = 0;
  game.hp = 300;
  return { game, rhosyn };
}

// The scene just after a log line (who stood where, and how), for a line written this visit.
const sceneAt = (entry) => fight.replayOf(entry).scene;
const unitIn = (scene, id) => scene.units.find((u) => u.id === id);
const apart = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
// The lines starting with these words, in order, from the first: their indices (-1 if missing).
function linesInOrder(game, starts) {
  const log = game.battle.log;
  let from = 0;
  return starts.map((start) => {
    const i = log.findIndex((e, n) => n >= from && e.text.startsWith(start));
    if (i >= 0) from = i + 1;
    return i;
  });
}

test('Fanatic: Hold Person on you, the save in full; Held, you lose your turns until a Wisdom save at the end of one breaks it', () => {
  const { game, rhosyn } = fanaticFight();
  game.rng = scriptedThen([2, 15], 'held'); // your save against it: a 2; at the end of your next turn, a 15
  fight.endHeroTurn(game);
  const steps = linesInOrder(game, ['Sister Rhosyn raises a hand towards you and casts Hold Person', 'You fail the Wisdom save', "You're Paralyzed: you can't move or act", 'You’re Paralyzed: you can’t move or act this turn', 'You break free of Hold Person, and can move again', 'Sister Rhosyn casts Spiritual Weapon']);
  assertTrue(steps.every((i) => i >= 0), `${steps} ${logText(game)}`);
  const log = game.battle.log;
  const save = log[steps[1]].roll;
  assertEqual([save.label, save.kind, save.target.value, save.natural, save.success], ["Sister Rhosyn's Hold Person (Wisdom save)", 'save', 12, 2, false]);
  assertTrue(save.modifiers.some((m) => m.source === 'Wisdom saving throw'), 'your Wisdom save, shown in full');
  assertTrue(log[steps[2]].text.endsWith('A Wisdom save at the end of each of your turns can break it.'));
  const held = sceneAt(log[steps[2]]);
  assertTrue(['held', 'paralyzed'].every((kind) => unitIn(held, 'hero').conditions.includes(kind)), 'Held, in the turn order');
  assertEqual(unitIn(held, rhosyn.id).concentrating, 'Hold Person');
  const lost = sceneAt(log[steps[3]]);
  assertEqual(apart(unitIn(lost, 'hero').pos, unitIn(lost, rhosyn.id).pos), 1, 'she closed in after casting');
  const again = log[steps[4]].roll;
  assertEqual([again.label, again.natural, again.success], ["Sister Rhosyn's Hold Person (Wisdom save)", 15, true]);
  assertEqual(rhosyn.spellsCast['hold-person'], 1, 'once a day');
});

test('Fanatic: Hold Person on Odda, the nearest; hurting Rhosyn can break her Concentration and free Odda, and so does felling her', () => {
  const heldOdda = () => {
    const { game, rhosyn } = fanaticFight({ at: { x: 4, y: 4 }, odda: { x: 4, y: 6 } });
    game.rng = scriptedThen([2, 3], 'odda-held'); // Odda's save: a 2; at the end of her turn: a 3
    fight.endHeroTurn(game);
    return { game, rhosyn };
  };
  const { game, rhosyn } = heldOdda();
  assertTrue(said(game, 'Sister Rhosyn raises a hand towards Odda and casts Hold Person') && said(game, 'Odda is Paralyzed'), logText(game));
  const strain = game.battle.log.find((e) => e.text === 'Odda strains against the spell, and stays held.');
  assertEqual(strain.roll.label, "Sister Rhosyn's Hold Person (Odda's Wisdom save)");
  assertTrue(fight.isHeroTurn(game) && fight.conditionsOf(game.battle, 'odda').includes('held'));
  assertTrue(fight.holdingSomeone(game.battle, rhosyn) && rhosyn.concentration.name === 'Hold Person');
  // You hit her for 15 (DC 10 to keep it), and her Constitution save is a 2 + 1.
  rhosyn.pos = { x: 3, y: 7 };
  game.rng = scriptedThen([15, 6, 6, 6, 6, 2], 'odda-freed');
  fight.heroAttack(game, 'greatsword-melee', rhosyn.id);
  const broke = game.battle.log.find((e) => e.text.startsWith("Sister Rhosyn's concentration breaks"));
  assertEqual(broke.text, "Sister Rhosyn's concentration breaks: Hold Person ends. Odda can move again.");
  assertEqual([broke.roll.label, broke.roll.target.value, broke.roll.success], ["Concentration (Sister Rhosyn's Constitution save)", 10, false]);
  assertTrue(!fight.conditionsOf(game.battle, 'odda').includes('paralyzed') && rhosyn.concentration === null && !fight.holdingSomeone(game.battle, rhosyn));
  // Felling her ends it too.
  const second = heldOdda();
  Object.assign(second.rhosyn, { pos: { x: 3, y: 7 }, hp: 1 });
  forceNextD20(15);
  fight.heroAttack(second.game, 'greatsword-melee', second.rhosyn.id);
  assertTrue(said(second.game, 'Hold Person ends with Sister Rhosyn. Odda can move again.'), logText(second.game));
  assertTrue(!fight.conditionsOf(second.game.battle, 'odda').includes('paralyzed'));
});

test('Fanatic: Command says “Halt!” to you from afar and “Grovel!” from beside you; either way your turn is lost', () => {
  const { game, rhosyn } = fanaticFight({ spent: { 'hold-person': 1, 'spiritual-weapon': 2 } });
  game.rng = scriptedThen([3, 3], 'command'); // both your saves against it fail
  fight.endHeroTurn(game);
  const steps = linesInOrder(game, [
    'Sister Rhosyn points at you and casts Command: “Halt!” On your next turn you must stand still and do nothing.',
    'Your turn.',
    "You obey Sister Rhosyn's command to halt: you stand rooted to the spot, and don't move or act this turn.",
    'Sister Rhosyn points at you and casts Command: “Grovel!” On your next turn you must throw yourself down and grovel.',
    'Your turn.',
    "You obey Sister Rhosyn's command: you throw yourself flat on the ground and grovel, and your turn ends.",
  ]);
  assertTrue(steps.every((i) => i >= 0) && steps[2] === steps[1] + 1 && steps[5] === steps[4] + 1, `${steps} ${logText(game)}`);
  const log = game.battle.log;
  const save = log[steps[0]].roll;
  assertEqual([save.label, save.target.value, save.success], ["Sister Rhosyn's Command (Wisdom save)", 12, false]);
  assertTrue(unitIn(sceneAt(log[steps[0]]), 'hero').conditions.includes('halt') && unitIn(sceneAt(log[steps[3]]), 'hero').conditions.includes('grovel'), 'Commanded, in the turn order');
  assertTrue(fight.isHeroTurn(game) && fight.isProne(game.battle, 'hero'), 'you grovelled, and are still on the ground');
  assertEqual(rhosyn.spellsCast.command, 2, 'twice a day');
  assertTrue(said(game, 'Sister Rhosyn attacks you with Pact Blade') || said(game, 'Sister Rhosyn hits you with Pact Blade'), 'its spells spent, its blade');
});

test('Fanatic: Command on Odda: she halts, and her turn passes', () => {
  const { game } = fanaticFight({ at: { x: 4, y: 4 }, odda: { x: 4, y: 6 }, spent: { 'hold-person': 1, 'spiritual-weapon': 2 } });
  game.rng = scriptedThen([2], 'odda-halts');
  fight.endHeroTurn(game);
  const steps = linesInOrder(game, ['Sister Rhosyn points at Odda and casts Command: “Halt!” On their next turn Odda must stand still and do nothing.', "Odda's turn.", "Odda obeys Sister Rhosyn's command to halt, and stands rooted to the spot, doing nothing this turn.", 'Round 2.']);
  assertTrue(steps.every((i) => i >= 0) && steps[2] === steps[1] + 1 && steps[3] === steps[2] + 1, `${steps} ${logText(game)}`);
});

test('Fanatic: Spiritual Weapon, a Bonus Action: a blade of ash beside you, +4 to hit for 1d8 + 2 Force, striking each turn while she concentrates', () => {
  const { game, rhosyn } = fanaticFight({ spent: { 'hold-person': 1, command: 2 } });
  game.rng = scriptedThen([15, 5], 'blade'); // its attack: a 15 (19 against your AC 17), and 1d8 = 5
  fight.endHeroTurn(game);
  const steps = linesInOrder(game, ['Sister Rhosyn casts Spiritual Weapon: a spectral blade of grey ash flickers into being beside you.', 'Spiritual Weapon hits you: 1d8 (5) + 2 = 7 force damage.']);
  assertTrue(steps.every((i) => i >= 0) && steps[1] === steps[0] + 1, `${steps} ${logText(game)}`);
  const roll = game.battle.log[steps[1]].roll;
  assertEqual([roll.kind, roll.modifiers, roll.target.type], ['attack', [{ label: 'Spell attack', value: 4, source: "Sister Rhosyn's Spellcasting" }], 'AC']);
  assertTrue(said(game, 'Sister Rhosyn attacks you with Pact Blade') || said(game, 'Sister Rhosyn hits you with Pact Blade'), 'and her action still for her blade');
  assertEqual([rhosyn.concentration.name, rhosyn.spellsCast['spiritual-weapon']], ['Spiritual Weapon', 1]);
  assertEqual(fight.battleScene(game).weapons.map((w) => [w.by, w.foe]), [[rhosyn.id, true]], 'drawn on the grid as a foe’s');
  fight.endHeroTurn(game);
  assertTrue(said(game, "Sister Rhosyn's Spiritual Weapon sweeps across to you."), logText(game));
  // Break her Concentration, and the blade is gone.
  rhosyn.pos = { x: 3, y: 7 };
  game.rng = scriptedThen([15, 6, 6, 6, 6, 2], 'blade-broken');
  fight.heroAttack(game, 'greatsword-melee', rhosyn.id);
  assertTrue(said(game, "Sister Rhosyn's concentration breaks: Spiritual Weapon ends.") && fight.battleScene(game).weapons.length === 0, logText(game));
});

test('Fanatic: fail your first save against Hold Person with Heroic Inspiration, and the game spends it to roll again (Settings can say not to)', () => {
  const { game } = fanaticFight({ inspiration: true });
  game.rng = scriptedThen([2, 17], 'inspired'); // a 2, then the reroll: a 17
  fight.endHeroTurn(game);
  const line = game.battle.log.find((e) => e.text === 'You shake off the spell.');
  assertEqual([line.roll.natural, line.roll.success, line.roll.rerolled], [17, true, { index: 0, from: 2, to: 17 }]);
  assertTrue(said(game, 'Your limbs begin to lock. You spend your Heroic Inspiration, and roll the save again.') && game.inspiration === false);
  fight.setReactionPolicy({ inspiration: false });
  try {
    const { game: kept } = fanaticFight({ inspiration: true, seed: 'kept' });
    kept.rng = scriptedThen([2, 17], 'kept'); // the 2 stands; the 17 is the save at the end of your turn
    fight.endHeroTurn(kept);
    assertTrue(said(kept, 'You fail the Wisdom save') && !said(kept, 'Heroic Inspiration') && kept.inspiration === true, logText(kept));
  } finally {
    fight.setReactionPolicy({ inspiration: true });
  }
});

test('Fanatic: Odda frees you from Hold Person with Lesser Restoration, and Rhosyn’s spell ends', () => {
  const { game, rhosyn } = fanaticFight({ odda: { x: 2, y: 8 } });
  game.rng = scriptedThen([2], 'restored'); // your save fails
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Odda casts Lesser Restoration on you, with a touch: you are no longer Paralyzed.'), logText(game));
  assertTrue(fight.isHeroTurn(game) && !fight.conditionsOf(game.battle, 'hero').includes('paralyzed') && rhosyn.concentration === null);
});

// Level 5 heroes against the Fanatic: Juniper with Counterspell (Int 19: spell save DC 15), and
// Wren (so Odda is level 5, with Dispel Magic).
const counterWizard = {
  ...juniper,
  level: 5,
  subclassId: 'evoker',
  classChoices: { scholarSkill: 'arcana' },
  hitPointRolls: [null, null, null, null],
  levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { intelligence: 2 } }],
  spells: { cantrips: [...juniper.spells.cantrips, 'chill-touch'], spellbook: ['shield', 'magic-missile', 'mage-armor', 'sleep', 'counterspell', 'fireball'], prepared: ['shield', 'magic-missile', 'mage-armor', 'sleep', 'counterspell', 'fireball'] },
};
const champion5 = {
  ...champion,
  level: 5,
  hitPointRolls: [null, null, null, null],
  classChoices: { ...wren.classChoices, weaponMasteries: [...wren.classChoices.weaponMasteries, 'longbow'] },
  levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { strength: 1, constitution: 1 } }],
};

test('Counterspell: cast for you with a level 3 slot as Rhosyn casts Hold Person; it fizzles and her use is gone (Settings can say not to)', () => {
  const { game, rhosyn } = fanaticFight({ character: counterWizard, seed: 'counter' });
  game.rng = scriptedThen([3], 'counter'); // her Constitution save: 3
  fight.endHeroTurn(game);
  assertTrue(said(game, "Counterspell! (your reaction, a level 3 slot) You tear Sister Rhosyn's Hold Person apart as it's spoken: the spell fizzles."), logText(game));
  const save = game.battle.log.find((e) => e.text.startsWith('Counterspell!')).roll;
  assertEqual([save.label, save.target.value, save.success], ['Constitution save', 15, false]);
  assertEqual([game.slotsUsed[2], rhosyn.spellsCast['hold-person'], said(game, 'You fail the Wisdom save'), said(game, 'casts Command')], [1, 1, false, false], 'her action is wasted');
  fight.setReactionPolicy({ counterspell: false });
  try {
    const { game: kept } = fanaticFight({ character: counterWizard, seed: 'no-counter' });
    kept.rng = scriptedThen([2], 'no-counter'); // your Wisdom save: 2
    fight.endHeroTurn(kept);
    assertTrue(!said(kept, 'Counterspell!') && said(kept, 'You fail the Wisdom save') && !kept.slotsUsed[2], logText(kept));
  } finally {
    fight.setReactionPolicy({ counterspell: true });
  }
});

test('Fanatic: Odda at level 5 ends Rhosyn’s Hold Person on you with Dispel Magic when Lesser Restoration can’t reach you', () => {
  const { game, rhosyn } = fanaticFight({ character: champion5, odda: { x: 3, y: 0 }, seed: 'dispel' }); // 40 feet away: too far to touch you this turn
  game.rng = scriptedThen([2], 'dispel'); // your save fails
  fight.endHeroTurn(game);
  assertTrue(said(game, "Odda casts Dispel Magic: Sister Rhosyn's Hold Person on you unravels and ends. You can move again."), logText(game));
  assertTrue(fight.isHeroTurn(game) && !fight.conditionsOf(game.battle, 'hero').includes('paralyzed') && rhosyn.concentration === null);
  assertEqual(memberOf(game, 'odda').slotsUsed[2], 1);
});

test('Companions: Fen shoots the Fanatic holding you, though a Zombie would be easier to hit', () => {
  const firstShot = (holding) => {
    const { game, rhosyn } = fanaticFight({ at: { x: 4, y: 3 }, fen: { x: 4, y: 9 }, seed: 'fen-aims' });
    Object.assign(fight.combatantById(game.battle, 'zombie-1'), { hp: 22, pos: { x: 5, y: 3 } });
    game.battle.order = ['hero', 'fen']; // (neither foe takes a turn here)
    if (holding) {
      game.battle.effects.push({ kind: 'paralyzed', target: 'hero', endsOn: null, concentration: true, by: rhosyn.id, dc: 12 });
      rhosyn.concentration = { spellId: 'hold-person', name: 'Hold Person' };
    }
    game.rng = scriptedThen(holding ? [2] : [], 'fen-aims'); // your save against it fails
    fight.endHeroTurn(game);
    const shot = game.battle.log.find((e) => e.text.includes('with Shortbow'));
    return shot ? shot.text : 'no shot';
  };
  assertTrue(firstShot(false).includes('Zombie 1'), 'the easier mark');
  assertTrue(firstShot(true).includes('Sister Rhosyn'), 'breaking her Concentration would free you');
});

test('Fanatic: Rhosyn casts nothing while she sings; once the hymn is done, she does', () => {
  const game = warrenFight('cairnfield-camp', champion, 'singing');
  game.hp = 400;
  for (let i = 0; i < 4 && !game.battle.outcome; i++) fight.endHeroTurn(game);
  const log = game.battle.log.map((e) => e.text);
  const hymn = log.findIndex((t) => t.includes('drags itself up out of the opened barrow'));
  const cast = log.findIndex((t) => ['Sister Rhosyn raises a hand', 'Sister Rhosyn points at', 'Sister Rhosyn casts'].some((s) => t.startsWith(s)));
  assertTrue(hymn >= 0 && cast > hymn, `${hymn} ${cast} ${log.join(' / ')}`);
});

test('The Chantry of Ash: Cantor Vesk casts once his hymn is done, and Sister Rhosyn as soon as she comes down the stair', () => {
  const game = chantryFight('chantry', ['vault_drained', 'rhosyn_lives']);
  game.hp = 600;
  for (let i = 0; i < 4 && !game.battle.outcome; i++) fight.endHeroTurn(game);
  const log = game.battle.log.map((e) => e.text);
  const casts = (name) => log.findIndex((t) => [`${name} raises a hand`, `${name} points at`, `${name} casts`].some((s) => t.startsWith(s)));
  const hymn = log.findIndex((t) => t.includes('drags itself up out of the ash'));
  const arrived = log.findIndex((t) => t.includes('come Sister Rhosyn'));
  assertTrue(hymn >= 0 && casts('Cantor Vesk') > hymn, `Vesk: ${hymn} ${casts('Cantor Vesk')}`);
  assertTrue(arrived >= 0 && casts('Sister Rhosyn') > arrived, `Rhosyn: ${arrived} ${casts('Sister Rhosyn')} ${log.join(' / ')}`);
});

test('Chapter 2: from the ford the barrow road climbs onto the moor; a night in a sheepfold, and a word with Fen or Odda', async () => {
  const game = await atCairnfield('cairn-road');
  assertEqual(cards(game), ['Follow the barrow road north']);
  pick(game, 'Follow the barrow road north');
  assertEqual([currentLocation(game), currentTime(game)], ['A sheepfold on the high moor', 'Night']);
  assertTrue(pageText(game).includes('Every one stands open') && speakersOf(game).includes('fen'));
  assertEqual(cards(game), ['Ask Fen what the Choir is like, from the inside', "Ask Odda what she thinks is under the Kings' Barrow", 'Get some sleep']);
  pick(game, 'Ask Fen');
  assertTrue(pageText(game).includes('sang like a lost child') && !cards(game).some((c) => c.startsWith('Ask Fen')), 'asked once');
  game.hp = 1;
  pick(game, 'Get some sleep');
  assertTrue(notes(game).some((n) => n.startsWith('A good place to stop')));
  assertEqual(game.hp, fight.maxHpOf(game, { id: 'hero' }), 'a long rest at last, after the night at the ford');
  pick(game, 'Go up to the ridge');
  assertEqual([currentLocation(game), currentTime(game)], ['Cairnfield', 'Dusk']);
  assertTrue(pageText(game).includes("the Kings' Barrow") && speakersOf(game).includes('fen') && !game.flags.includes('rival_taken'));
  assertEqual(cards(game), ['Follow Fen down the gully the sentries never watch', 'Put on grey and sing with Fen', 'Attack the camp']);
  assertEqual(tagsOf(game), ['check:stealth:12', 'check:performance:13', 'combat:cairnfield-camp']);
});

test('Chapter 2: down Fen’s gully unseen, you overhear the Choir’s plan, then slip away with the fight’s full XP', async () => {
  const game = await atCairnfield('cairn-sneak', { character: rogue3 });
  upToTheRidge(game);
  const xp = game.xp;
  forceNextD20(20);
  pick(game, 'Follow Fen down the gully');
  revealAll(game);
  assertTrue(speakersOf(game).includes('rhosyn') && speakersOf(game).includes('tobin') && pageText(game).includes('the dark of the moon'));
  assertTrue(['knows_dark_of_moon', 'knows_miller_at_sluices', 'cairnfield_sneaked'].every((f) => game.flags.includes(f)));
  assertTrue(missingMiller(game).includes('turning the sluice wheels') && game.xp - xp === 50, 'the plan is worth 50 XP');
  assertEqual(cards(game), ['Slip away the way you came, with what you know', "Fetch the others, and strike while the camp doesn't know you're here"]);
  assertTrue(tagsOf(game)[1].includes('surprise'));
  pick(game, 'Slip away');
  assertTrue(['cairnfield_slipped_away', 'rhosyn_lives'].every((f) => game.flags.includes(f)) && game.xp - xp === 700, 'and the fight’s 650 XP');
  assertTrue(pageText(game).includes('I do like clever') && memberOf(game, 'fen').approval === 1);
  assertTrue(game.objective === 'Go back to Bramblegate and rally help before the dark of the moon, three nights away.');
  assertEqual(cards(game), ['Go back down the barrow road to Bramblegate'], 'on to beat 6');
});

test('Chapter 2: spotted in the heather, it’s a fight; Tobin yields after it and tells what he knows, and an acolyte who ran warns Vesk', async () => {
  const game = await atCairnfield('cairn-spotted', { character: lifeCleric, fen: false });
  upToTheRidge(game);
  assertEqual(cards(game), ['Creep down through the heather after dark', 'Attack the camp'], 'no gully and no hymn without Fen');
  assertEqual(tagsOf(game)[0], 'check:stealth:15');
  forceNextD20(1);
  pick(game, 'Creep down');
  revealAll(game);
  assertTrue(game.flags.includes('cairnfield_spotted') && !game.flags.includes('knows_dark_of_moon') && pageText(game).includes('In the heather!'));
  assertEqual([cards(game), tagsOf(game)], [['Fight'], ['combat:cairnfield-camp']], 'no surprise');
  settleCamp(game, 'Fight', { fled: ['cultist-2'] });
  assertTrue(['cairnfield_won', 'rhosyn_dead', 'vesk_warned', 'knows_dark_of_moon'].every((f) => game.flags.includes(f)));
  assertTrue(pageText(game).includes('booms shut') && speakersOf(game).includes('tobin') && pageText(game).includes('He hums while he works'));
  assertEqual(cards(game), ['Let him go home to Ashby', 'Send him down to Captain Varrow, to answer for the Choir', 'Leave him tied by the fire for the Choir to find']);
  pick(game, 'Send him down');
  assertTrue(game.flags.includes('tobin_to_varrow') && deeds(game).includes('Broke the Ashen Choir'));
  assertTrue(game.objective.startsWith('Go back to Bramblegate'));
});

test('Chapter 2: in borrowed grey, singing with Fen (easier with the Choir’s hymnal), you hear Rhosyn’s sermon; strike with surprise, then let Tobin go', async () => {
  const game = await atCairnfield('cairn-hymn', { character: rogue3, items: ['choir-hymnal'] });
  upToTheRidge(game);
  assertTrue(cards(game).includes('Put on grey and sing with Fen: you know the words from the hymnal') && tagsOf(game).includes('check:performance:10'));
  forceNextD20(20);
  pick(game, 'Put on grey and sing with Fen');
  revealAll(game);
  assertTrue(game.flags.includes('tobin_saw_fen') && pageText(game).includes('Sing, Tobin') && pageText(game).includes("I'll not sing their songs"));
  assertTrue(game.flags.includes('knows_dark_of_moon') && speakersOf(game).includes('rhosyn'));
  let surprised = false;
  settleCamp(game, 'Fetch the others', { setUp: (g) => (surprised = g.battle.surprise) });
  assertTrue(surprised && game.flags.includes('cairnfield_struck_first') && !game.flags.includes('vesk_warned'));
  assertTrue(pageText(game).includes('You were supposed to be dead') && pageText(game).includes('the singing never stops'), 'Tobin adds what you didn’t hear');
  pick(game, 'Let him go home');
  assertEqual([memberOf(game, 'fen').approval, memberOf(game, 'odda').approval], [1, 1]);
  assertTrue(game.flags.includes('tobin_freed'));
});

test('Chapter 2: Invisibility walks you into the camp alone, for a level 2 slot, and back out again', async () => {
  const game = await atCairnfield('cairn-invisible', { character: invisibleWizard, flags: ['mentor_warned'] });
  upToTheRidge(game);
  assertTrue(pageText(game).includes("Orrin Mossbottom's letter: if you hear singers in grey, run"));
  assertTrue(cards(game).includes('Cast Invisibility, and walk into the camp alone') && tagsOf(game).includes('spell:invisibility'));
  pick(game, 'Cast Invisibility');
  assertTrue(notes(game).includes('You cast Invisibility, using a level 2 slot.') && game.slotsUsed[1] === 1);
  assertTrue(pageText(game).includes('watch your own hands fade') && speakersOf(game).includes('rhosyn') && game.flags.includes('knows_dark_of_moon'));
  pick(game, 'Slip away');
  assertTrue(pageText(game).includes("the spell holds until you're back out in the heather") && game.flags.includes('cairnfield_invisible'));
});

test('Chapter 2: beaten at Cairnfield, you wake robbed in an opened barrow; Tobin lets down a rope and tells you the plan', async () => {
  const character = { ...champion, bond: { type: 'rival', name: 'Sable Rook' } };
  const game = await atCairnfield('cairn-mercy', { character, flags: ['rival_went_ahead'] });
  game.money = 2500;
  upToTheRidge(game);
  assertTrue(game.flags.includes('rival_taken') && pageText(game).includes("It's Sable Rook") && missingMiller(game).includes('took Sable Rook prisoner'));
  settleCamp(game, 'Attack the camp', { won: false });
  assertTrue(['cairnfield_fates_mercy', 'rhosyn_lives', 'vesk_warned', 'knows_dark_of_moon', 'cairnfield_attacked'].every((f) => game.flags.includes(f)) && game.money === 0);
  assertTrue(pageText(game).includes('bed of old bones') && pageText(game).includes('Odda and Fen lie beside you') && speakersOf(game).includes('tobin'));
  assertTrue(notes(game).some((n) => n.startsWith('A good place to stop')) && game.hp === fight.maxHpOf(game, { id: 'hero' }));
  pick(game, 'Leave him tied');
  assertEqual([memberOf(game, 'odda').approval, memberOf(game, 'fen').approval], [-1, -1]);
});

test('Chapter 2: if the Old Ford fell, the news goes to Varrow first; a companion who falls at Cairnfield goes home to the temple', async () => {
  const game = await atCairnfield('cairn-fell', { flags: ['ford_fell'] });
  assertEqual(cards(game), ['Carry the news down to Bramblegate']);
  pick(game, 'Carry the news down to Bramblegate');
  assertTrue(speakersOf(game).includes('varrow') && pageText(game).includes("I can't spare you a single spear"));
  assertTrue(speakersOf(game).includes('crane'), 'then the temple, before the inn');
  throughTheTemple(game);
  assertTrue(notes(game).some((n) => n.startsWith('A good place to stop')));
  pick(game, 'Go out into the town at first light');
  pick(game, 'Take the barrow road north again');
  assertTrue(pageText(game).includes('fresh graves on the north bank'));
  pick(game, 'Get some sleep');
  pick(game, 'Go up to the ridge');
  settleCamp(game, 'Attack the camp', {
    setUp: (g) => {
      fight.combatantById(g.battle, 'odda').state = 'dead';
      Object.assign(memberOf(g, 'odda'), { hp: 0, fallen: true });
    },
  });
  assertTrue(game.flags.includes('odda_fell_at_cairnfield') && !game.flags.includes('fen_fell_at_cairnfield'));
  assertTrue(pageText(game).includes("Odda didn't get up") && pageText(game).includes("Bramblegate's temple"));
  pick(game, 'Let him go home');
  assertTrue(game.objective.startsWith('Make camp near Cairnfield'));
  assertEqual(cards(game), ['Lie low near Cairnfield until the dark of the moon'], 'on to the eve of the barrow');
});

// ---- Chapter 2, beat 6: the temple's secret, and rallying help ----

// Back from Cairnfield (the Old Ford held): a hero (a level 3 Champion unless given) with Odda
// and Fen (unless false), at the start of the road home. fallen: companion ids who died.
async function homeFromCairnfield(seed, { character = champion, flags = [], odda = true, fen = true, fallen = [], gold = 0 } = {}) {
  const game = await storyGame(seed, character);
  game.flags.push('knows_dark_of_moon', ...flags);
  game.money = gold * 100;
  if (odda) joinParty(game, 'odda');
  if (fen) joinParty(game, 'fen');
  for (const id of fallen) Object.assign(memberOf(game, id), { hp: 0, fallen: true });
  game.page = jumpTo(game, 'ch2_homeward');
  return game;
}

// Through the temple the quickest way (whatever the party): the rite if anyone needs it,
// leave it until Crane comes to the inn, then decide what's to be done with him.
function throughTheTemple(game, judgement = 'Help him make it right') {
  if (cards(game).includes('Let him')) pick(game, 'Let him');
  pick(game, 'Leave it, for now');
  pick(game, judgement);
}

// From the temple's judgement to the next morning in the square.
function toTheMorning(game, judgement = 'Help him make it right') {
  pick(game, judgement);
  pick(game, 'Go out into the town at first light');
}

test('Chapter 2: home from Cairnfield on the watch’s cart; at the temple, Odda asks for the barrow’s old survey, and the case is empty', async () => {
  const game = await homeFromCairnfield('temple-home');
  assertEqual(game.objective, 'Go back to Bramblegate and rally help before the dark of the moon, three nights away.');
  pick(game, 'Go back down the barrow road');
  assertEqual([currentLocation(game), currentTime(game)], ['Bramblegate, the temple', 'Dusk']);
  assertTrue(pageText(game).includes('supply cart') && speakersOf(game).includes('pike') && speakersOf(game).includes('crane'));
  assertTrue(pageText(game).includes('survey of the Kings') && pageText(game).includes('no dust in it'));
  assertEqual(cards(game), ['Watch his face as he says it', "Let Odda ask to see the temple's books", "Catch Fen's eye, and nod at the iron chest", 'Leave it, for now']);
  assertEqual(tagsOf(game)[0], 'check:insight:12');
});

test('Chapter 2: Odda’s right to see the books opens Crane’s ledger: the Choir’s three hundred gold went to the Free League (50 XP)', async () => {
  const game = await homeFromCairnfield('temple-books', { flags: ['met_penhallow'] });
  pick(game, 'Go back down the barrow road');
  const xp = game.xp;
  pick(game, "Let Odda ask to see the temple's books");
  assertTrue(game.flags.includes('crane_secret_known') && game.xp - xp === 50);
  assertTrue(pageText(game).includes('Received of the Choir of Ash') && pageText(game).includes("Free League's counting-house") && pageText(game).includes('Factor Penhallow'));
  assertTrue(pageText(game).includes('the answer was here all along') && pageText(game).includes('three hundred anything'), 'Odda and Fen take it in');
  assertEqual(cards(game), ['Take the ledger to Reeve Corbin', "Let Odda decide what's to be done", "Tell him his secret's safe with you, for a price", 'Help him make it right']);
  assertEqual(tagsOf(game), ['drive:justice', 'drive:faith drive:kinship', 'drive:wealth', '']);
});

test('Chapter 2: letting Odda decide is a confession to the whole town, and the ward-word; Odda +2, and a Faith hero is inspired', async () => {
  const game = await homeFromCairnfield('temple-confess', { character: lifeCleric });
  pick(game, 'Go back down the barrow road');
  pick(game, 'Catch Fen');
  assertTrue(pageText(game).includes("No, it isn't") && memberOf(game, 'fen').approval === 1, 'Fen likes clever');
  game.inspiration = false;
  pick(game, "Let Odda decide what's to be done");
  assertTrue(notes(game).includes('That’s your Drive (Faith) talking. You gain Heroic Inspiration.') && game.flags.includes('crane_confessed') && memberOf(game, 'odda').approval === 2);
  assertTrue(pageText(game).includes('The roof is better') && speakersOf(game).includes('morwen') && pageText(game).includes('Ysolde the Binder'));
  assertTrue(game.flags.includes('knows_ward_word') && missingMiller(game).includes('ward-word') && missingMiller(game).includes('Ysolde'));
  assertTrue(deeds(game).includes('Prior Crane told all Bramblegate'));
  assertTrue(notes(game).some((n) => n.startsWith('A good place to stop')) && cards(game)[0] === 'Go out into the town at first light', 'then a night at the inn');
});

test('Chapter 2: taking the ledger to the reeve jails Crane without the ward-word, for 25 gold and the Regency’s favour; Odda and Fen think less of you', async () => {
  const game = await homeFromCairnfield('temple-reeve');
  pick(game, 'Go back down the barrow road');
  pick(game, "Let Odda ask to see the temple's books");
  const money = game.money;
  game.inspiration = false;
  pick(game, 'Take the ledger to Reeve Corbin');
  assertTrue(notes(game).includes('That’s your Drive (Justice) talking. You gain Heroic Inspiration.'), 'Wren’s Drive is Justice');
  assertTrue(['crane_exposed', 'regency_favour'].every((f) => game.flags.includes(f)) && !game.flags.includes('knows_ward_word'));
  assertEqual([game.money - money, memberOf(game, 'odda').approval, memberOf(game, 'fen').approval], [2500, -1, -1]);
  assertTrue(speakersOf(game).includes('corbin') && pageText(game).includes('He was ours to judge') && pageText(game).includes("won't say it"));
});

test('Chapter 2: blackmailing Crane pays fifty gold of the Choir’s money and the ward-word; Odda −2', async () => {
  const game = await homeFromCairnfield('temple-blackmail');
  pick(game, 'Go back down the barrow road');
  pick(game, "Let Odda ask to see the temple's books");
  const money = game.money;
  pick(game, "Tell him his secret's safe with you");
  assertTrue(['crane_blackmailed', 'knows_ward_word'].every((f) => game.flags.includes(f)));
  assertEqual([game.money - money, memberOf(game, 'odda').approval, memberOf(game, 'fen').approval], [5000, -2, 0]);
  assertTrue(pageText(game).includes('with her back to the door') && deeds(game).includes('Took fifty gold from Prior Crane'));
});

test('Chapter 2: helping Crane make it right gives the ward-word; Odda and Fen both like it', async () => {
  const game = await homeFromCairnfield('temple-amends', { fen: false });
  pick(game, 'Go back down the barrow road');
  assertTrue(!cards(game).some((c) => c.startsWith('Catch Fen')), 'no Fen, no picked chest');
  pick(game, "Let Odda ask to see the temple's books");
  pick(game, 'Help him make it right');
  assertTrue(['crane_made_amends', 'knows_ward_word'].every((f) => game.flags.includes(f)) && memberOf(game, 'odda').approval === 1);
  assertTrue(pageText(game).includes("Ysolde. I don't know whose") && pageText(game).includes('very nearly a blessing'));
});

test('Chapter 2: if you’ve seen Crane’s face before, no roll; a missed Insight leaves the other ways, and leaving it brings him to the inn', async () => {
  const seen = await homeFromCairnfield('temple-seen', { flags: ['crane_knows_the_map'] });
  pick(seen, 'Go back down the barrow road');
  assertEqual(cards(seen)[0], "Tell him you've seen his face whenever the Kings' Barrow comes up");
  assertEqual(tagsOf(seen)[0], '');
  pick(seen, "Tell him you've seen his face");
  assertTrue(pageText(seen).includes("in the Choir's hymnal") && pageText(seen).includes('Received of the Choir of Ash'));

  const alone = await homeFromCairnfield('temple-alone', { character: lifeCleric, odda: false, fen: false });
  pick(alone, 'Go back down the barrow road');
  assertTrue(pageText(alone).includes("you'd rather not go in blind"));
  assertEqual(cards(alone), ['Watch his face as he says it', 'Leave it, for now']);
  forceNextD20(1);
  pick(alone, 'Watch his face');
  revealAll(alone);
  assertTrue(pageText(alone).includes('better at it than you'));
  assertEqual(cards(alone), ['Leave it, for now'], 'never a dead end');
  pick(alone, 'Leave it, for now');
  assertTrue(currentLocation(alone) === 'Bramblegate, the Tallow and Thistle' && pageText(alone).includes('ledger under his arm') && alone.flags.includes('crane_secret_known'));
  assertEqual(cards(alone), ['Take the ledger to Reeve Corbin', "Tell him his secret's safe with you, for a price", 'Help him make it right'], 'no Odda to decide');
});

test('Chapter 2: without Fen, a hero with Thieves’ Tools can pick the Prior’s chest; a slip, and he breaks down anyway', async () => {
  const game = await homeFromCairnfield('temple-pick', { character: rogue3, fen: false });
  pick(game, 'Go back down the barrow road');
  assertTrue(cards(game).includes("Pick the iron chest's lock while he's looking at the map case") && tagsOf(game).includes('check:thieves-tools:13'));
  game.rng = scriptedThen([1], 'temple-pick');
  pick(game, 'Pick the iron chest');
  revealAll(game);
  assertTrue(pageText(game).includes('sees what you') && pageText(game).includes('as if his legs have given way') && game.flags.includes('crane_secret_known'));
});

test('Chapter 2: a companion who died lies before the altar flame; Crane gives the great candle, and they live again', async () => {
  const game = await homeFromCairnfield('temple-raise', { fallen: ['odda', 'fen'] });
  pick(game, 'Go back down the barrow road');
  assertTrue(pageText(game).includes('Odda and Fen lie side by side') && pageText(game).includes("It's the least I owe"));
  assertEqual(cards(game), ['Let him']);
  pick(game, 'Let him');
  assertTrue(notes(game).includes('Odda lives again, at full Hit Points.') && notes(game).includes('Fen lives again, at full Hit Points.'));
  for (const id of ['odda', 'fen']) {
    const member = memberOf(game, id);
    assertEqual([member.fallen, member.hp], [false, memberMaxHp(game, member)], id);
  }
  assertTrue(['flame_spent', 'odda_raised', 'fen_raised'].every((f) => game.flags.includes(f)));
  assertTrue(pageText(game).includes('Who put out the Flame?') && pageText(game).includes('who was dead until a few minutes ago'));
  assertTrue(cards(game).includes("Let Odda ask to see the temple's books"), 'her hook goes on');
  pick(game, "Let Odda ask to see the temple's books");
  assertTrue(pageText(game).includes('cold stub of the great candle'));
});

test('Chapter 2: in the morning Varrow’s watch will hold the outer cairns (all three lived at the ford), Nettle’s goblins will come, Nan sells potions, and Lark sees you off', async () => {
  const flags = ['ford_held', 'varrow_holds_cairns', 'goblins_at_mill', 'owe_nettle', 'tobin_to_varrow', 'lark_apprentice'];
  const game = await homeFromCairnfield('rally-all', { flags, gold: 60 });
  pick(game, 'Go back down the barrow road');
  pick(game, "Let Odda ask to see the temple's books");
  toTheMorning(game);
  assertEqual([currentLocation(game), currentTime(game)], ['Bramblegate, the square', 'Morning']);
  assertTrue(pageText(game).includes('The dark of the moon is tomorrow night'));
  assertEqual(cards(game), ['Ask Captain Varrow for the watch', 'Go out to Dunn\'s Mill, and ask Mother Nettle for help', "Call in at Hob's forge", "Visit Nan Burdock's stall", 'Go with Fen to the old hanging tree at the crossroads', "Take the barrow road north, to the Kings' Barrow"]);
  pick(game, 'Ask Captain Varrow');
  assertTrue(pageText(game).includes("I'll not hang a child") && pageText(game).includes('outer cairns') && game.flags.includes('varrow_rallied'));
  assertTrue(missingMiller(game).includes('Captain Varrow will hold the outer cairns'));
  pick(game, 'Go out to Dunn');
  assertTrue(speakersOf(game).includes('nettle') && pageText(game).includes('Nettle does not forget'));
  assertEqual(cards(game), ['Promise her Brackenhollow is hers again, after', "Tell her it isn't yours to promise, but you'll speak for her"]);
  pick(game, 'Tell her it isn');
  assertTrue(game.flags.includes('nettle_rallied') && !game.flags.includes('promised_nettle_warren') && memberOf(game, 'odda').approval === 2, 'Odda likes honesty');
  pick(game, 'Visit Nan');
  assertTrue(speakersOf(game).includes('nan') && cards(game)[0] === 'Buy a Potion of Healing');
  pick(game, 'Buy a Potion of Healing');
  assertTrue(game.inventory.some((i) => i.id === 'potion-of-healing') && !cards(game).includes('Buy a Potion of Healing'), 'ten gold left');
  pick(game, 'Back to the square');
  assertEqual(cards(game), ["Call in at Hob's forge", "Visit Nan Burdock's stall", 'Go with Fen to the old hanging tree at the crossroads', "Take the barrow road north, to the Kings' Barrow"]);
  pick(game, 'Take the barrow road north');
  assertTrue(speakersOf(game).includes('lark') && pageText(game).includes('a pack on her back'));
  assertTrue(game.objective.startsWith('Take the barrow road north, make camp near Cairnfield'));
  assertEqual(cards(game), ['Follow the barrow road north, onto the moor'], 'on to the eve of the barrow');
});

test('Chapter 2: if only some of the watch lived, Varrow takes talking round (Persuasion 15 if he was wary); if he won’t, he keeps them home', async () => {
  const wary = await homeFromCairnfield('rally-wary', { character: lifeCleric, flags: ['ford_held', 'varrow_wary'] });
  pick(wary, 'Go back down the barrow road');
  pick(wary, "Let Odda ask to see the temple's books");
  toTheMorning(wary, 'Take the ledger to Reeve Corbin');
  assertEqual(cards(wary), ['Ask Captain Varrow for the watch', "Call in at Hob's forge", "Visit Nan Burdock's stall", 'Go with Fen to the old hanging tree at the crossroads', "Take the barrow road north, to the Kings' Barrow"], 'no goblins at the mill');
  pick(wary, 'Ask Captain Varrow');
  assertTrue(pageText(wary).includes("the Prior's in the cell next door") && pageText(wary).includes('I lost people at that ford'));
  assertEqual(tagsOf(wary)[0], 'check:persuasion:15');
  forceNextD20(1);
  pick(wary, 'Ask him to hold the outer cairns');
  revealAll(wary);
  assertTrue(pageText(wary).includes('Somebody has to hold this town') && !wary.flags.includes('varrow_holds_cairns'));

  const approving = await homeFromCairnfield('rally-approves', { flags: ['ford_held', 'varrow_approves'] });
  pick(approving, 'Go back down the barrow road');
  pick(approving, "Let Odda ask to see the temple's books");
  toTheMorning(approving);
  pick(approving, 'Ask Captain Varrow');
  assertEqual(tagsOf(approving)[0], 'check:persuasion:12');
  forceNextD20(20);
  pick(approving, 'Ask him to hold the outer cairns');
  revealAll(approving);
  assertTrue(['varrow_holds_cairns', 'varrow_rallied'].every((f) => approving.flags.includes(f)) && pageText(approving).includes('every one of them'));
});

test('Chapter 2: if the Old Ford fell, the temple comes before Cairnfield: Odda, who fell at the ford, is raised; in the morning Nettle, then north', async () => {
  const game = await atCairnfield('fell-temple', { flags: ['ford_fell', 'odda_fell_at_the_ford', 'goblins_at_mill'] });
  Object.assign(memberOf(game, 'odda'), { hp: 0, fallen: true });
  pick(game, 'Carry the news down to Bramblegate');
  assertTrue(speakersOf(game).includes('varrow') && pageText(game).includes('lies Odda Brasswick'));
  pick(game, 'Let him');
  assertTrue(!memberOf(game, 'odda').fallen && game.flags.includes('odda_raised'));
  pick(game, "Let Odda ask to see the temple's books");
  toTheMorning(game);
  assertEqual(cards(game), ['Go out to Dunn\'s Mill, and ask Mother Nettle for help', "Call in at Hob's forge", "Visit Nan Burdock's stall", 'Go with Fen to the old hanging tree at the crossroads', 'Take the barrow road north again'], 'Varrow has no spears to spare');
  pick(game, 'Go out to Dunn');
  assertTrue(pageText(game).includes("you're going there next"));
  pick(game, 'Promise her');
  assertTrue(pageText(game).includes('Goblins hear singing a long way off'), 'they don’t know the date yet');
  assertTrue(['nettle_rallied', 'promised_nettle_warren'].every((f) => game.flags.includes(f)));
  pick(game, 'Take the barrow road north again');
  assertTrue(pageText(game).includes('Bring him home') && pageText(game).includes('fresh graves on the north bank'));
  assertTrue(speakersOf(game).includes('odda') || pageText(game).includes('Odda brews tea'), 'Odda comes north with you');
});

// ---- Chapter 2, beat 8: the eve of the barrow ----

// The start of the eve (on the road north from Bramblegate, or near Cairnfield if ford_fell): a
// hero (a level 3 Champion unless given) with Odda and Fen (unless false), their approval
// ({ odda, fen }), and XP.
async function atTheEve(seed, { character = champion, flags = [], odda = true, fen = true, approval = {}, xp = 3000 } = {}) {
  const game = await storyGame(seed, character);
  game.flags.push(...flags);
  game.xp = xp;
  if (odda) joinParty(game, 'odda');
  if (fen) joinParty(game, 'fen');
  for (const [id, value] of Object.entries(approval)) memberOf(game, id).approval = value;
  game.page = jumpTo(game, 'ch2_eve');
  return game;
}

// Up to the camp, by whichever path the flags say.
function toTheCamp(game) {
  pick(game, game.flags.includes('ford_fell') ? 'Lie low' : 'Follow the barrow road north');
}

test('Eve of the barrow: up from Bramblegate in a day, with the watch on the road behind you, back to the sheepfold', async () => {
  const game = await atTheEve('eve-road', { flags: ['varrow_rallied', 'nettle_rallied', 'cairnfield_won'] });
  assertEqual(cards(game), ['Follow the barrow road north, onto the moor']);
  toTheCamp(game);
  assertEqual([currentLocation(game), currentTime(game)], ['A sheepfold on the high moor', 'Night']);
  assertTrue(pageText(game).includes("Captain Varrow's watch comes marching north") && pageText(game).includes('a goblin wave'));
  assertTrue(pageText(game).includes('No juniper smoke') && pageText(game).includes('Odda brews tea') && pageText(game).includes('Fen sits'));
  assertEqual(cards(game), ['Ask Odda what she makes of what you did with the Prior', 'Ask Fen about the Precentor', 'Go over tomorrow, all together', 'Get some sleep']);
});

test('Eve of the barrow: if the Old Ford fell, you lie low near Cairnfield for two days, and the Choir is still there', async () => {
  const game = await atTheEve('eve-fell', { flags: ['ford_fell'] });
  assertEqual(cards(game), ['Lie low near Cairnfield until the dark of the moon']);
  toTheCamp(game);
  assertTrue(pageText(game).includes('For two days you lie low') && pageText(game).includes('grey tents') && pageText(game).includes('no more than a paring'));
});

test('Eve of the barrow: Odda, who likes you, talks about the Prior and being dead, then tells you her order began in Emberdeep', async () => {
  const game = await atTheEve('eve-odda-warm', { flags: ['crane_confessed', 'odda_raised', 'flame_spent'], approval: { odda: 3 } });
  toTheCamp(game);
  assertTrue(cards(game).includes('Ask Odda what it was like, being dead') && !cards(game).includes('Sit with Odda while the fire burns down'));
  pick(game, 'Ask Odda what it was like');
  assertTrue(pageText(game).includes('the moment before the kettle sings'));
  pick(game, 'Ask Odda what she makes');
  assertTrue(pageText(game).includes('The roof is better') && pageText(game).includes('Ask me later, when the fire'));
  pick(game, 'Sit with Odda');
  assertTrue(game.flags.includes('odda_told_of_emberdeep') && pageText(game).includes('Emberdeep') && pageText(game).includes('The Prior said it was lit'));
  assertTrue(!cards(game).some((c) => c.startsWith('Ask Odda') || c.startsWith('Sit with Odda')), 'each talk once');
});

test('Eve of the barrow: Odda, who dislikes you, won’t talk about the blackmailed Prior, and means to go home after the barrow', async () => {
  const game = await atTheEve('eve-odda-cold', { flags: ['crane_blackmailed'], approval: { odda: -2 } });
  toTheCamp(game);
  pick(game, 'Ask Odda what she makes');
  assertTrue(pageText(game).includes("I'll not talk about the Prior") && pageText(game).includes('go home to my order') && game.flags.includes('odda_means_to_go_home'));
  assertTrue(!cards(game).includes('Sit with Odda while the fire burns down'));
});

test('Eve of the barrow: in between, Odda just answers (the Prior helped, or handed to the reeve), and nothing more', async () => {
  for (const [flag, line] of [['crane_made_amends', 'Wise, I think'], ['crane_exposed', 'you never gave it the chance']]) {
    const game = await atTheEve(`eve-odda-${flag}`, { flags: [flag], approval: { odda: 1 } });
    toTheCamp(game);
    pick(game, 'Ask Odda what she makes');
    assertTrue(pageText(game).includes(line) && !pageText(game).includes('Ask me later') && !game.flags.includes('odda_means_to_go_home'), flag);
  }
});

test('Eve of the barrow: Fen on the Precentor (the crowned signet); if he likes you, he owns up to stealing her ledger', async () => {
  const game = await atTheEve('eve-fen-warm', { flags: ['rhosyn_dead', 'fen_raised'], approval: { fen: 4 } });
  toTheCamp(game);
  pick(game, 'Ask Fen what it was like');
  assertTrue(pageText(game).includes('nobody had a hand in my purse'));
  pick(game, 'Ask Fen about the Precentor');
  assertTrue(pageText(game).includes('a signet with a crown cut in it') && pageText(game).includes('Rhosyn did, in a way') && pageText(game).includes('a bit I left out'));
  pick(game, 'Ask Fen what he left out');
  assertTrue(game.flags.includes('fen_told_of_ledger') && pageText(game).includes('Every name') && pageText(game).includes('Odda is snoring'));
});

test('Eve of the barrow: Fen, who dislikes you, says it’s only arithmetic', async () => {
  const game = await atTheEve('eve-fen-cold', { approval: { fen: -3 } });
  toTheCamp(game);
  pick(game, 'Ask Fen about the Precentor');
  assertTrue(pageText(game).includes('So would Rhosyn') && pageText(game).includes("It's arithmetic") && game.flags.includes('fen_just_arithmetic'));
  assertTrue(!cards(game).includes('Ask Fen what he left out'));
});

test('Eve of the barrow: going over tomorrow names who’s coming and what waits under the hill', async () => {
  const character = { ...champion, bond: { type: 'rival', name: 'Sable Rook' } };
  const game = await atTheEve('eve-plan', { character, flags: ['varrow_rallied', 'knows_ward_word', 'knows_miller_at_sluices', 'rival_taken', 'vesk_warned'] });
  toTheCamp(game);
  assertTrue(pageText(game).includes('Somewhere under that hill is Sable Rook'));
  pick(game, 'Go over tomorrow');
  const text = pageText(game);
  assertTrue(['outer cairns', 'Ysolde', 'Garrick, at his sluice wheels', 'Sable Rook, somewhere in the dark', 'He knows you', 'Say the name like you mean it'].every((s) => text.includes(s)));
  assertTrue(!text.includes('Nobody else is coming'));

  const alone = await atTheEve('eve-plan-alone');
  toTheCamp(alone);
  pick(alone, 'Go over tomorrow');
  assertTrue(pageText(alone).includes('Nobody else is coming') && pageText(alone).includes('we stop that hymn'));
});

test('Eve of the barrow: on the last watch the dead walk in with the last stones; the rest brings a hero short of level 4 up to it', async () => {
  const game = await atTheEve('eve-watch', { xp: 2000 });
  toTheCamp(game);
  game.hp = 1;
  pick(game, 'Get some sleep');
  assertTrue(pageText(game).includes('Fen the second, and you the last') && pageText(game).includes('the singing starts up under the hill'));
  assertTrue(notes(game).includes('A milestone: your XP rises to 2,700, enough for level 4.') && notes(game).some((n) => n.startsWith('A good place to stop')));
  assertEqual([game.xp, game.hp, currentTime(game)], [2700, fight.maxHpOf(game, { id: 'hero' }), 'Dawn']);
  assertEqual(game.objective, "Go down into the Kings' Barrow tonight, under the dark of the moon.");
  assertEqual(cards(game), ['Wait out the day, and go down to the barrow at nightfall'], 'and Chapter 3 begins');

  const ahead = await atTheEve('eve-ahead', { xp: 3100, odda: false, fen: false });
  toTheCamp(ahead);
  assertTrue(pageText(ahead).includes('cold camp') && pageText(ahead).includes('alone'));
  assertEqual(cards(ahead), ['Get some sleep'], 'nobody to talk to');
  pick(ahead, 'Get some sleep');
  assertTrue(pageText(ahead).includes('You sleep in snatches') && !notes(ahead).some((n) => n.startsWith('A milestone')) && ahead.xp === 3100);
});

// ---- Chapter 3, beats 1 and 2: under the dark moon, and the barrow gate ----

test('Animated Armor: SRD 5.2.1’s stat block, two Slams a turn, and drawn as plate with a closed helm', () => {
  const armor = monsters.find((m) => m.id === 'animated-armor');
  assertEqual([armor.ac, armor.hp.average, armor.speed, armor.initiative, armor.cr, armor.xp, armor.multiattack], [18, 33, 25, 2, '1', 200, 2]);
  assertEqual(armor.attacks, [{ id: 'slam', name: 'Slam', kind: 'melee', bonus: 4, reach: 5, damage: { dice: '1d6', bonus: 2, type: 'bludgeoning' } }]);
  assertEqual([armor.immunities, armor.conditionImmunities.includes('paralyzed'), armor.type, armor.source], [['poison', 'psychic'], true, 'Construct', 'SRD 5.2.1']);
  assertTrue(Boolean(sprites[armor.sprite]) && armor.variant.includes('Blindsight'));
});

test('The barrow gate: two Gate Guardians either side of the sealing stone, which stands in the way; Low for a level 4 party of three', () => {
  const game = warrenFight('barrow-gate', champion);
  assertEqual(fight.enemies(game.battle).map((c) => c.name), ['Gate Guardian 1', 'Gate Guardian 2']);
  const map = fight.battleMap(game.battle);
  assertEqual([map.cells[8][3].terrain, map.cells[8][3].decor, map.cells[8][4].decor], ['obstacle', 'sealing-stone', 'sealing-stone']);
  const gate = encounters.find((e) => e.id === 'barrow-gate');
  assertEqual([encounterXp(gate), ratingFor(encounterXp(gate), partyBudget(4, 3)), ratingFor(500, partyBudget(4, 3))], [400, 'Low', 'Low'], 'still Low with the two stragglers');
});

test('The barrow gate: without Varrow’s watch at the cairns, two Zombies come in off the moor behind you on round 3', () => {
  const game = warrenFight('barrow-gate', champion, 'gate-stragglers');
  game.hp = 300; // so the hero is still standing to watch
  assertEqual(fight.objectiveText(game.battle), 'Two Zombies are coming from the moor: they arrive at the start of round 3.');
  fight.endHeroTurn(game);
  assertEqual(fight.enemies(game.battle).length, 2, 'not yet on round 2');
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Out of the dark from the moor come Zombie 1 and Zombie 2, and join the fight!'), logText(game));
  const zombies = fight.enemies(game.battle).filter((c) => c.monsterId === 'zombie');
  assertEqual(zombies.map((c) => c.pos.y), [0, 0], 'at the top of the map, behind the party');
  assertTrue(zombies.every((z) => game.battle.order.includes(z.id)) && fight.objectiveText(game.battle) === '', 'they take turns, and the screen stops warning');
  for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  zombies[0].hp = 1;
  zombies[0].pos = { x: 3, y: 3 }; // beside the hero
  forceNextD20(20);
  fight.heroAttack(game, 'greatsword-melee', zombies[0].id);
  assertEqual([game.battle.outcome, game.battle.xp], ['victory', 500], 'their XP counts once they come');
});

test('The barrow gate: with Varrow’s watch holding the cairns, nobody comes up behind you', () => {
  const game = gameFor(champion, 'gate-held');
  game.flags = ['varrow_rallied'];
  game.hp = 300;
  forceNextD20(20);
  fight.startBattle(game, 'barrow-gate', 0);
  assertEqual([game.battle.reinforcements, fight.objectiveText(game.battle)], [null, '']);
  fight.endHeroTurn(game);
  fight.endHeroTurn(game);
  assertEqual(fight.enemies(game.battle).length, 2);
});

// The start of Chapter 3, at dawn after the eve of the barrow: a hero (a level 3 Champion unless
// given) with Odda and Fen (unless false).
async function atTheDarkMoon(seed, { character = champion, flags = [], odda = true, fen = true } = {}) {
  const game = await storyGame(seed, character);
  game.flags.push(...flags);
  if (odda) joinParty(game, 'odda');
  if (fen) joinParty(game, 'fen');
  game.page = jumpTo(game, 'ch3_dark_moon');
  return game;
}

// The day in the sheepfold, then up to the ridge (beat 1), then down to the great gate (beat 2).
function toTheGate(game) {
  pick(game, 'Wait out the day');
  pick(game, 'Go down into the bowl');
}

// Settles the fight at the gate from the choice starting `start`: won or lost.
function settleGate(game, start, { won = true, setUp = () => {} } = {}) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start) && (c.tags || []).includes('combat:barrow-gate'));
  if (!choice) throw new Error(`No fight "${start}": ${cards(game).join(' / ')}`);
  startFight(game, choice);
  setUp(game);
  if (won) for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  else game.hp = 0;
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

const gateRoom = () => findDungeon('kings-barrow').rooms.find((r) => r.id === 'forecourt');
const dwarf = { ...champion, speciesId: 'dwarf' };

test('Chapter 3: the day in the sheepfold, then the watch takes the outer cairns and Nettle’s goblins draw off Vesk’s lookout', async () => {
  const character = { ...champion, bond: { type: 'rival', name: 'Sable Rook' } };
  const game = await atTheDarkMoon('dark-moon-allies', { character, flags: ['varrow_rallied', 'nettle_rallied', 'vesk_warned', 'knows_miller_at_sluices', 'rival_taken', 'cairnfield_won', 'knows_ward_word'] });
  assertEqual([cards(game), game.objective], [['Wait out the day, and go down to the barrow at nightfall'], "Go down into the Kings' Barrow tonight, under the dark of the moon."]);
  pick(game, 'Wait out the day');
  assertEqual([currentLocation(game), currentTime(game)], ['Cairnfield', 'Night']);
  const text = pageText(game);
  assertTrue(['Fen sleeps through', 'ashes and trampled canvas', "Captain Varrow's watch", 'go no farther', 'Garrick is alive', 'is Sable Rook, in Choir chains', 'the door the ward-word was made for', 'a lantern burns', 'goes bobbing away over the top', 'Oh, I like her'].every((s) => text.includes(s)), text);
  assertTrue(!text.includes('Nobody holds the cairns') && speakersOf(game).includes('odda') && speakersOf(game).includes('fen'));
  assertEqual(cards(game), ['Go down into the bowl, to the great gate']);
  pick(game, 'Go down into the bowl');
  assertTrue(game.flags.includes('gate_unseen') && !game.flags.includes('gate_guardians_woken') && pageText(game).includes('while the goblins hold every eye'));
  assertEqual(currentDungeon(game), { id: 'kings-barrow', room: 'forecourt', explored: ['forecourt'] });
  assertEqual(currentLocation(game), "The Kings' Barrow, the great gate");
  assertTrue(pageText(game).includes('Neither of them stirs') && pageText(game).includes('Made to keep her door'));
  assertEqual(cards(game), ['Speak the ward-word: "Ysolde"', 'Greet them in the old forms of the faith, with Odda prompting you', "Give them the old court's words of passage", 'Strike before they wake']);
  assertEqual(tagsOf(game).slice(1), ['check:religion:10 drive:faith', 'check:history:13 drive:knowledge', 'combat:barrow-gate surprise']);
  assertEqual(roomFigures(gateRoom(), game.flags).map((f) => f.sprite), ['sealing-stone', 'sealing-stone', 'animated-armor', 'animated-armor']);
});

test('Chapter 3: with Vesk warned and no goblins, his lookout hammers on the stone and the guardians are waiting; nobody holds the cairns', async () => {
  const game = await atTheDarkMoon('dark-moon-warned', { character: dwarf, flags: ['vesk_warned'], odda: false });
  pick(game, 'Wait out the day');
  assertTrue(pageText(game).includes('Fen sleeps through the whole of it') && pageText(game).includes('Nobody holds the cairns tonight'));
  assertTrue(pageText(game).includes('a lantern burns') && !pageText(game).includes('the din'));
  pick(game, 'Go down into the bowl');
  assertTrue(game.flags.includes('gate_guardians_woken') && !game.flags.includes('gate_unseen'));
  assertTrue(pageText(game).includes('a hammer rings on stone') && pageText(game).includes("They're awake"));
  assertEqual(cards(game), ['Greet them in the old forms of the faith', "Give them the old court's words of passage", 'Fight them'], 'no ward-word, no dwarf’s look at the stone, no surprise');
  assertEqual(tagsOf(game), ['check:religion:13 drive:faith', 'check:history:13 drive:knowledge', 'combat:barrow-gate']);
});

test('Chapter 3: the ward-word, and the guardians kneel and roll the stone aside: the fight’s 400 XP, and a stair goes down from the open gate', async () => {
  const game = await atTheDarkMoon('gate-word', { flags: ['knows_ward_word', 'varrow_rallied'] });
  toTheGate(game);
  const xp = game.xp;
  pick(game, 'Speak the ward-word');
  assertTrue(['between the two guardians', '"Ysolde," you say', 'go down on one knee', 'You said it like you meant it', 'swings round on a hidden pivot', 'a stair goes down into the dark', 'After you'].every((s) => pageText(game).includes(s)));
  assertTrue(['gate_ward_word', 'gate_guardians_knelt', 'gate_opened'].every((f) => game.flags.includes(f)) && game.xp - xp === 400);
  assertTrue(deeds(game).includes('they knelt') && missingMiller(game).includes('great gate of the Kings'));
  assertEqual([cards(game), tagsOf(game), game.objective], [['Go down the stair into the dark'], ['go:corridor'], "Go down into the Kings' Barrow, find Garrick, and stop the Choir's hymn."]);
  assertEqual(roomFigures(gateRoom(), game.flags).map((f) => [f.sprite, f.fallen]), [['animated-armor', false], ['animated-armor', false]], 'the stone is gone from the map; the guardians stand');
});

test('Chapter 3: the old forms of the faith (easier with Odda) or the words of passage make them kneel; a wrong word is the fight', async () => {
  const game = await atTheDarkMoon('gate-faith', { character: lifeCleric, fen: false });
  toTheGate(game);
  forceNextD20(20);
  pick(game, 'Greet them in the old forms');
  revealAll(game);
  assertTrue(pageText(game).includes('Odda murmurs the old forms') && ['gate_old_forms', 'gate_guardians_knelt', 'gate_opened'].every((f) => game.flags.includes(f)));

  const scholar = await atTheDarkMoon('gate-history', { character: lifeCleric, odda: false, fen: false });
  toTheGate(scholar);
  assertTrue(pageText(scholar).includes('Neither of them stirs') && !speakersOf(scholar).length, 'nobody to whisper to');
  forceNextD20(20);
  pick(scholar, 'Give them the old court');
  revealAll(scholar);
  assertTrue(pageText(scholar).includes('who you are, whose peace you keep') && scholar.flags.includes('gate_words_of_passage'));

  const wrong = await atTheDarkMoon('gate-wrong', { character: lifeCleric, odda: false });
  toTheGate(wrong);
  forceNextD20(1);
  pick(wrong, 'Greet them in the old forms');
  revealAll(wrong);
  assertTrue(pageText(wrong).includes("The guardians don't kneel") && !wrong.flags.includes('gate_guardians_knelt'));
  assertEqual([cards(wrong), tagsOf(wrong)], [['Fight'], ['combat:barrow-gate']], 'they’re awake now: no surprise');
});

test('Chapter 3: a Dwarf sees the sealing stone is dwarf-cut and pivots, and opens it without waking the guardians', async () => {
  const game = await atTheDarkMoon('gate-dwarf', { character: dwarf });
  toTheGate(game);
  assertTrue(cards(game).includes('Look at how the sealing stone is cut') && !cards(game).some((c) => c.startsWith('Speak the ward-word')));
  const xp = game.xp;
  pick(game, 'Look at how the sealing stone is cut');
  assertTrue(['this sealing stone is dwarf-cut. It pivots.', 'the guardians never stir', 'My grandmother would have boxed my ears'].every((s) => pageText(game).includes(s)));
  assertTrue(['gate_pivoted', 'gate_opened'].every((f) => game.flags.includes(f)) && !game.flags.includes('gate_guardians_knelt') && game.xp - xp === 400);

  const human = await atTheDarkMoon('gate-not-dwarf');
  toTheGate(human);
  assertTrue(!cards(human).includes('Look at how the sealing stone is cut'));
});

test('Chapter 3: the guardians beaten, the stone opens by itself; a companion who falls is carried home by the watch', async () => {
  const game = await atTheDarkMoon('gate-won', { flags: ['varrow_rallied'] });
  toTheGate(game);
  settleGate(game, 'Strike before they wake', {
    setUp: (g) => {
      assertTrue(g.battle.surprise && g.battle.reinforcements === null, 'a surprise attack, and nobody behind you');
      fight.combatantById(g.battle, 'fen').state = 'dead';
      Object.assign(memberOf(g, 'fen'), { hp: 0, fallen: true });
    },
  });
  assertTrue(['gate_guardians_destroyed', 'gate_opened', 'fen_fell_at_the_gate'].every((f) => game.flags.includes(f)) && !game.flags.includes('odda_fell_at_the_gate'));
  assertTrue(['crash like a dropped armoury', "I'd sooner they'd knelt", 'Fen lies small and still', "Two of Varrow's watch", 'waiting for leave'].every((s) => pageText(game).includes(s)));
  assertTrue(!pageText(game).includes('After you'), 'Fen has nothing to say');
  assertEqual(roomFigures(gateRoom(), game.flags).map((f) => f.fallen), [true, true], 'the guardians lie where they fell');
  assertEqual(game.lastBattle.outcome, 'victory');
});

test('Chapter 3: beaten at the gate, you wake robbed at the edge of the forecourt, and the guardians kneel when you come back', async () => {
  const game = await atTheDarkMoon('gate-mercy', { flags: ['nettle_rallied'] });
  game.money = 2500;
  toTheGate(game);
  settleGate(game, 'Strike before they wake', { won: false });
  assertTrue(['gate_fates_mercy', 'gate_guardians_knelt', 'gate_opened'].every((f) => game.flags.includes(f)) && game.money === 0);
  assertTrue(['They keep the door', 'Odda and Fen lie beside you', 'a goblin giggles', 'getting up again counts', 'swings round on a hidden pivot'].every((s) => pageText(game).includes(s)));
  assertTrue(notes(game).some((n) => n.startsWith('A good place to stop')) && game.hp === fight.maxHpOf(game, { id: 'hero' }));
  assertEqual(cards(game), ['Go down the stair into the dark']);
});

// ---- Chapter 3, beat 3: the Hall of Champions ----

const darts = findTrap('poisoned-darts');
const barrowRoom = (id) => findDungeon('kings-barrow').rooms.find((r) => r.id === id);
// A level 4 Champion, so Odda is level 4 too, with Detect Magic prepared.
const champion4 = { ...champion, level: 4, hitPointRolls: [null, null, null] };

test('Poisoned Darts: SRD 5.2.1’s trap, a DC 13 Dexterity save or 1d3 darts of 1d6 Poison each, and more at higher levels', () => {
  assertEqual([darts.save, darts.hits, darts.damage, darts.detect, darts.source], [{ ability: 'dexterity', dc: 13 }, '1d3', { dice: '1d6', type: 'poison' }, { skill: 'perception', dc: 15 }, 'SRD 5.2.1']);
  assertEqual([1, 4, 5, 10, 11, 16, 17, 20].map((level) => trapDamageDice(darts, level)), ['1d6', '1d6', '2d6', '2d6', '4d6', '4d6', '7d6', '7d6']);
});

test('Traps: make the save and nothing strikes you; fail it and each dart does its damage, halved for a Dwarf', () => {
  const safe = gameFor(wren);
  const hp = safe.hp;
  safe.rng = scriptedRng([20]);
  const dodged = springTrap(safe, darts);
  assertEqual([dodged.outcome, dodged.hits, safe.hp], ['safe', 0, hp]);
  assertEqual(safe.pending.map((p) => [p.result.kind, p.result.label, p.result.target.value, p.result.success]), [['save', 'Poisoned Darts (Dexterity save)', 13, true]]);
  assertTrue(safe.pending[0].result.modifiers.every((m) => m.source === 'Dexterity saving throw'), 'the hero’s Dexterity save, shown in full');

  const struck = gameFor(wren);
  struck.hp = 20;
  struck.rng = scriptedRng([1, 3, 4, 5, 6]); // the save fails; three darts, for 4, 5 and 6
  let told = null;
  const hit = springTrap(struck, darts, { onHits: (n) => (told = n) });
  assertEqual([hit.outcome, hit.hits, told, struck.hp], ['up', 3, 3, 5]);

  const dwarfHero = gameFor({ ...wren, speciesId: 'dwarf' });
  dwarfHero.hp = 20;
  dwarfHero.rng = scriptedRng([1, 3, 4, 5, 6]);
  springTrap(dwarfHero, darts);
  assertEqual(dwarfHero.hp, 13, 'a Dwarf resists Poison: 15 damage halves to 7');
});

test('The upper barrow: the gate, the crowned passage, the hall and the oath-wall; the plates show once found, and the oath-wall’s door goes once it opens', () => {
  const barrow = findDungeon('kings-barrow');
  assertEqual(barrow.rooms.map((r) => [r.id, r.rows]), [['forecourt', [0, 8]], ['corridor', [8, 15]], ['hall', [15, 24]], ['oath-wall', [24, 29]]]);
  assertEqual(barrowRoom('corridor').name, 'The crowned passage', 'the map’s title doesn’t give the darts away');
  const map = parseMap(barrow.rows, barrow.legend);
  assertEqual(map.cells.flat().filter((cell) => cell.decor === 'bier').length, 5, 'five champions’ tombs');
  const passage = barrowRoom('corridor');
  assertEqual(roomFigures(passage, ['gate_opened']), [], 'no plates to see until you find them');
  assertEqual(roomFigures(passage, ['darts_sprung']).map((f) => [f.sprite, f.pos.x, f.pos.y]), [['dart-plate', 3, 12], ['dart-plate', 4, 13], ['dart-plate', 3, 14]]);
  assertEqual(roomFigures(passage, ['darts_spotted']).length, 3);
  assertEqual(roomFigures(barrowRoom('oath-wall'), []).map((f) => f.sprite), ['oath-door', 'oath-door']);
  assertEqual(roomFigures(barrowRoom('oath-wall'), ['oath_wall_opened']), []);
});

// Through the great gate by the ward-word, and down the stair into the crowned passage (a level
// 3 Champion unless given, with Odda and Fen unless false).
async function atTheHall(seed, { character = champion, flags = [], odda = true, fen = true } = {}) {
  const game = await atTheDarkMoon(seed, { character, flags: ['knows_ward_word', 'varrow_rallied', ...flags], odda, fen });
  toTheGate(game);
  pick(game, 'Speak the ward-word');
  pick(game, 'Go down the stair');
  return game;
}

// Searches the passage (a natural 20 finds the plates), and goes on into the hall.
function intoTheHall(game) {
  forceNextD20(20);
  pick(game, 'Search the floor and walls');
  revealAll(game);
  pick(game, 'Go on into the hall');
}

test('Chapter 3: down the stair into the crowned passage; searching finds the dart plates, and you step round them', async () => {
  const game = await atTheHall('hall-search');
  assertEqual(currentDungeon(game), { id: 'kings-barrow', room: 'corridor', explored: ['forecourt', 'corridor'] });
  assertEqual([currentLocation(game), game.objective], ["The Kings' Barrow, the crowned passage", "Go down into the Kings' Barrow, find Garrick, and stop the Choir's hymn."]);
  assertTrue(['a skeleton lies on its face', 'Something small and dark sticks out', 'They die facing the treasure'].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual([cards(game), tagsOf(game)], [['Search the floor and walls before you go on', 'Walk on down the passage'], ['check:perception:15', '']], 'no Mage Hand for a Champion');
  const xp = game.xp;
  forceNextD20(20);
  pick(game, 'Search the floor and walls');
  revealAll(game);
  assertTrue(game.flags.includes('darts_spotted') && !game.flags.includes('darts_sprung') && game.xp - xp === 50);
  assertTrue(pageText(game).includes('three flagstones that sit a hair proud') && pageText(game).includes('setting their feet exactly where you set yours'));
  assertEqual([cards(game), tagsOf(game)], [['Go on into the hall'], ['go:hall']]);
  assertEqual(roomFigures(barrowRoom('corridor'), game.flags).length, 3, 'the plates show on the map');
});

test('Chapter 3: walk on and a plate goes off: the darts’ Dexterity save, then 1d3 darts of Poison, or nothing if you throw yourself flat', async () => {
  const game = await atTheHall('hall-darts');
  game.hp = 30;
  game.rng = scriptedThen([2, 2, 3, 4], 'hall-darts'); // the save fails; two darts, for 3 and 4
  pick(game, 'Walk on down the passage');
  revealAll(game);
  assertTrue(game.flags.includes('darts_sprung') && !game.flags.includes('darts_spotted') && game.hp === 23, `${game.hp}`);
  assertEqual(game.page.beats.filter((b) => b.type === 'roll').map((b) => b.result.label), ['Poisoned Darts (Dexterity save)']);
  assertTrue(notes(game).includes('Struck by 2 darts.') && notes(game).includes('You take 7 poison damage (2d6: 3, 4).'), notes(game).join(' / '));
  assertTrue(['sinks under your boot', 'sting like hornets', 'you can see the rest'].every((s) => pageText(game).includes(s)));
  assertEqual(cards(game), ['Go on into the hall']);
  assertEqual(roomFigures(barrowRoom('corridor'), game.flags).length, 3, 'now you know where they are');

  const flat = await atTheHall('hall-darts-flat');
  const hp = flat.hp;
  forceNextD20(20);
  pick(flat, 'Walk on down the passage');
  revealAll(flat);
  assertTrue(pageText(flat).includes('You throw yourself flat') && flat.hp === hp && !notes(flat).some((n) => n.startsWith('Struck by')));
});

test('Chapter 3: struck down by the darts with nobody to help, three failed death saves are Fate’s Mercy: you wake hours later on the stair', async () => {
  const game = await atTheHall('hall-darts-mercy');
  game.hp = 1;
  game.rng = scriptedThen([2, 1, 6, 1, 1], 'hall-darts-mercy'); // the save fails; one dart for 6; two natural 1s
  pick(game, 'Walk on down the passage');
  revealAll(game);
  assertTrue(game.flags.includes('darts_fates_mercy') && game.hp === fight.maxHpOf(game, { id: 'hero' }), 'a long rest');
  assertTrue(notes(game).includes('Darkness takes you.') && notes(game).some((n) => n.startsWith('A good place to stop')));
  assertEqual(game.deaths, 1, 'a death outside a fight counts, for the playtest log');
  assertTrue(['Odda has been praying over you, and Fen swearing at you', "Don't do that again", 'Hours have gone', 'you can see the rest'].every((s) => pageText(game).includes(s)));
  assertTrue(deeds(game).includes('struck down by poisoned darts'));
  assertEqual(cards(game), ['Go on into the hall']);
});

test('Chapter 3: a Mage Hand sent down the passage sets the darts off where you would have been, with no roll', async () => {
  const game = await atTheHall('hall-mage-hand', { character: juniper, odda: false, fen: false });
  assertEqual(cards(game), ['Search the floor and walls before you go on', 'Send a Mage Hand down the passage ahead of you', 'Walk on down the passage']);
  const hp = game.hp;
  pick(game, 'Send a Mage Hand');
  assertTrue(game.flags.includes('darts_spotted') && game.hp === hp && !game.page.beats.some((b) => b.type === 'roll'));
  assertTrue(pageText(game).includes('patting the floor ahead of it') && pageText(game).includes('nothing so much as clicks'));
});

test('Chapter 3: the Hall of Champions: five tombs and their gold, and Odda’s Detect Magic shows every one is a ward', async () => {
  const game = await atTheHall('hall-wards', { character: champion4, flags: ['knows_oath_wards'] });
  intoTheHall(game);
  assertEqual([currentDungeon(game).room, currentLocation(game)], ['hall', "The Kings' Barrow, the Hall of Champions"]);
  assertTrue(['There are five of them', 'gold glints on every tomb', 'Every one of them a seal', "I'm only looking"].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual(cards(game), ['Ask Odda to look at the tombs with Detect Magic', "Take the grave goods: the champions won't miss them", 'Go to the carved wall at the end of the hall']);
  assertEqual(tagsOf(game), ['spell:detect-magic by:odda', 'drive:wealth', 'go:oath-wall']);
  pick(game, 'Ask Odda');
  assertTrue(game.flags.includes('saw_oath_wards') && pageText(game).includes('Every tomb glows') && pageText(game).includes('the oaths are still holding'));
  assertTrue(notes(game).some((n) => n.startsWith('Odda casts Detect Magic')), notes(game).join(' / '));
  assertEqual(cards(game), ["Take the grave goods: the champions won't miss them", 'Go to the carved wall at the end of the hall'], 'once is enough');
});

test('Chapter 3: robbing the champions’ graves is fifty gold and a Wealth moment; Odda minds, and the wards go out', async () => {
  const game = await atTheHall('hall-loot', { character: champion4 });
  intoTheHall(game);
  assertTrue(pageText(game).includes('the old lists of my order say'), 'Odda without the Old Ford’s lesson');
  const money = game.money;
  pick(game, 'Take the grave goods');
  assertTrue(game.flags.includes('looted_the_champions') && game.money - money === 5000);
  assertEqual(memberOf(game, 'odda').approval, -1);
  assertTrue(['stamped with a little crown', 'the hymn under the floor swells', "you've picked their pockets", "for once he doesn't make a joke"].every((s) => pageText(game).includes(s)));
  assertTrue(!cards(game).some((c) => c.startsWith('Take the grave goods')), 'once');
  pick(game, 'Ask Odda');
  assertTrue(pageText(game).includes('The tombs are dark') && pageText(game).includes('still glows'));
});

test('Chapter 3: the oath-wall: reading it learns the seven champions, Aveline first, and speaking the oath opens the way down', async () => {
  const game = await atTheHall('hall-oath', { flags: ['read_the_oath_stone'] });
  intoTheHall(game);
  pick(game, 'Go to the carved wall');
  assertEqual([currentDungeon(game).room, currentLocation(game)], ['oath-wall', "The Kings' Barrow, the oath-wall"]);
  assertTrue(pageText(game).includes('framed in tarnished gilt') && !pageText(game).includes('every letter of it glows'));
  assertEqual(cards(game), ['Read the names and oaths, from what you know of the old court', 'Read the names and oaths by the wards worked into the words']);
  assertEqual(tagsOf(game), ['check:history:13 drive:knowledge', 'check:arcana:13 drive:knowledge']);
  const xp = game.xp;
  forceNextD20(20);
  pick(game, 'Read the names and oaths, from what');
  revealAll(game);
  assertTrue(game.flags.includes('read_the_oath_wall') && game.xp - xp === 100);
  const text = pageText(game);
  assertTrue(['and squint', 'AVELINE, FIRST OF THE SWORN', 'UNTIL I AM CALLED BY NAME', 'You know that name', 'until the dead lifted the stone', 'INGRITH HAMMERFALL OF EMBERDEEP', 'DAME MAUD HAWKRIDGE', 'whose words they were', 'SPEAK IT, SWORN, AND PASS'].every((s) => text.includes(s)), text);
  assertTrue(missingMiller(game).includes('Dame Aveline') && game.flags.includes('odda_saw_ingriths_oath'));
  assertEqual(cards(game), ['Swear it, and mean it', 'Say the words']);
  pick(game, 'Swear it');
  assertTrue(['swore_the_oath', 'oath_wall_opened'].every((f) => game.flags.includes(f)));
  assertTrue(['you mean every word', 'the gilt-framed panel folds back', "It's always down", 'like a great wheel turning'].every((s) => pageText(game).includes(s)));
  assertEqual([cards(game), game.objective], [['Go down the stair into the deep barrow'], "Go down into the deep barrow, find Garrick at the sluices, and stop the Choir's hymn."]);
  assertEqual(roomFigures(barrowRoom('oath-wall'), game.flags), [], 'the way through is open on the map');
});

test('Chapter 3: the oath-wall reads easier for a Sage or in the wards’ glow, Comprehend Languages reads it all, and a bad reading opens it without the names', async () => {
  const sage = await atTheHall('hall-sage', { character: juniper, odda: false, fen: false });
  intoTheHall(sage);
  pick(sage, 'Go to the carved wall');
  assertEqual(cards(sage), ['Read the wall with Comprehend Languages', 'Read the names and oaths, from what you know of the old court', 'Read the names and oaths by the wards worked into the words']);
  assertEqual(tagsOf(sage).slice(1), ['check:history:10 drive:knowledge', 'check:arcana:10 drive:knowledge'], 'a Sage');
  pick(sage, 'Read the wall with Comprehend Languages');
  assertTrue(sage.flags.includes('read_the_oath_wall') && pageText(sage).includes('swim and settle') && !pageText(sage).includes('whose words they were'), 'no Odda to know the words');
  assertTrue(pageText(sage).includes('for seven names. And Aveline') && !pageText(sage).includes('You know that name'), 'never read the capstone at the Old Ford');
  assertTrue(!sage.page.beats.some((b) => b.type === 'roll'));

  const glow = await atTheHall('hall-glow', { character: champion4 });
  intoTheHall(glow);
  pick(glow, 'Ask Odda');
  pick(glow, 'Go to the carved wall');
  assertTrue(pageText(glow).includes('every letter of it glows'));
  assertEqual(tagsOf(glow), ['check:history:10 drive:knowledge', 'check:arcana:10 drive:knowledge'], 'in the wards’ glow');
  forceNextD20(20);
  pick(glow, 'Read the names and oaths by the wards');
  revealAll(glow);
  assertTrue(pageText(glow).includes('like gold thread') && glow.flags.includes('read_the_oath_wall'));

  const lost = await atTheHall('hall-lost', { character: lifeCleric, fen: false });
  intoTheHall(lost);
  assertTrue(cards(lost).includes('Look at the tombs with Detect Magic') && !cards(lost).some((c) => c.startsWith('Ask Odda')), 'the hero’s own Detect Magic');
  pick(lost, 'Go to the carved wall');
  forceNextD20(1);
  pick(lost, 'Read the names and oaths by the wards');
  revealAll(lost);
  assertTrue(!lost.flags.includes('read_the_oath_wall') && pageText(lost).includes('The old court hand beats you') && pageText(lost).includes('SPEAK IT, SWORN, AND PASS'));
  assertTrue(!missingMiller(lost).includes('Aveline'), 'her name isn’t learned');
  pick(lost, 'Say the words');
  assertTrue(lost.flags.includes('oath_wall_opened') && !lost.flags.includes('swore_the_oath'));
  assertEqual(cards(lost), ['Go down the stair into the deep barrow']);
});

// ---- Chapter 3, beat 4: the flooded vault ----

const vaultRoom = () => findDungeon('deep-barrow').rooms.find((r) => r.id === 'vault');
const sable = { ...champion4, bond: { type: 'rival', name: 'Sable Rook' } };

test('Ogre Zombie: SRD 5.2.1’s stat block, a 2d8 + 4 Slam and Undead Fortitude; Large, but one square on the grid for now', () => {
  const ogre = monsters.find((m) => m.id === 'ogre-zombie');
  assertEqual([ogre.size, ogre.ac, ogre.hp.average, ogre.speed, ogre.initiative, ogre.cr, ogre.xp], ['large', 8, 85, 30, -2, '2', 450]);
  assertEqual(ogre.attacks, [{ id: 'slam', name: 'Slam', kind: 'melee', bonus: 6, reach: 5, damage: { dice: '2d8', bonus: 4, type: 'bludgeoning' } }]);
  assertEqual([ogre.traits, ogre.immunities, ogre.conditionImmunities, ogre.type, ogre.source], [['undead-fortitude'], ['poison'], ['exhaustion', 'poisoned'], 'Undead', 'SRD 5.2.1']);
  assertTrue(Boolean(sprites[ogre.sprite]) && ogre.variant.includes('one square'));
});

test('The flooded vault: an Ogre Zombie, a Ghoul and five acolytes are Moderate, and the one at the wheel sings a Zombie up out of the black water', () => {
  const game = warrenFight('vault-wheel', champion);
  assertEqual(fight.enemies(game.battle).map((c) => c.name), ['Choir Acolyte 1', 'Ogre Zombie', 'Ghoul', 'Choir Acolyte 2', 'Choir Acolyte 3', 'Choir Acolyte 4', 'Choir Acolyte 5']);
  const vault = encounters.find((e) => e.id === 'vault-wheel');
  assertEqual([encounterXp(vault), ratingFor(encounterXp(vault), partyBudget(4, 3))], [775, 'Moderate']);
  const map = fight.battleMap(game.battle);
  assertEqual([map.cells[3][3].terrain, map.cells[3][2].terrain, map.cells[5][3].terrain, map.cells[8][3].decor, map.cells[8][4].decor], ['water', 'difficult', 'floor', 'sluice-wheel', 'sluice-gate']);
  assertEqual(fight.objectiveText(game.battle), 'The hymn: unless the singer is stopped, a Zombie rises at the start of round 3. Hurting the singer may break it.');
  game.hp = 300; // so the hero is still standing to watch
  fight.endHeroTurn(game);
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Zombie 1 drags itself up out of the black water'), logText(game));
});

test('The flooded vault: the Rival stands chained at the wheel only if the Choir took them; Garrick always does', () => {
  const alone = warrenFight('vault-wheel', champion);
  const map = fight.battleMap(alone.battle);
  assertEqual([alone.battle.absentOnlookers, map.cells[8][2].terrain, map.cells[8][5].terrain], [[1], 'obstacle', 'floor']);
  const taken = gameFor(champion, 'vault-rival');
  taken.flags = ['rival_taken'];
  forceNextD20(20);
  fight.startBattle(taken, 'vault-wheel', 0);
  assertEqual([taken.battle.absentOnlookers, fight.battleMap(taken.battle).cells[8][5].terrain], [[], 'obstacle']);
  assertEqual(fight.battleMap(alone.battle).cells[8][5].terrain, 'floor', 'each fight keeps its own map');
});

test('The deep barrow: the vault drains to silt and a stair, or floods to the landing; the Choir and Garrick stand where the fight starts them', () => {
  const deep = findDungeon('deep-barrow');
  assertEqual(dungeonRows(deep, ['rival_taken']), deep.rows, 'as first drawn');
  const drained = parseMap(dungeonRows(deep, ['vault_drained']), deep.legend);
  assertEqual([drained.cells[10][3].decor, drained.cells[10][3].terrain, drained.cells[3][3].terrain, drained.cells[8][3].decor], ['stair-down', 'floor', 'floor', 'sluice-wheel']);
  assertEqual(parseMap(deep.rows, deep.legend).cells[10][3].terrain, 'water', 'the stair is under the water until then');
  const flooded = parseMap(dungeonRows(deep, ['vault_flooded']), deep.legend);
  assertEqual([flooded.cells[1][3].terrain, flooded.cells[2][3].terrain, flooded.cells[5][1].terrain, flooded.cells[10][7].terrain], ['floor', 'difficult', 'water', 'water']);
  for (const room of deep.rooms) {
    for (const change of room.changes || []) {
      assertEqual(change.rows.length, room.rows[1] - room.rows[0] + 1, `${room.id}: a change covers the room's band`);
      assertTrue(change.rows.every((row) => row.length === deep.rows[0].length && [...row].every((letter) => deep.legend[letter])), `${room.id}: every square has a picture`);
    }
  }
  const vault = vaultRoom();
  const here = roomFigures(vault, []);
  assertEqual(here.map((f) => f.person || f.sprite), ['cultist', 'ogre-zombie', 'ghoul', 'cultist', 'cultist', 'cultist', 'cultist', 'garrick'], 'no Rival unless the Choir took them');
  const withRival = roomFigures(vault, ['rival_taken']);
  assertTrue(withRival.some((f) => f.person === 'rival'));
  const fightStart = encounters.find((e) => e.id === 'vault-wheel');
  for (const { pos } of [...fightStart.monsters, ...fightStart.onlookers]) assertTrue(withRival.some((f) => f.pos.x === pos.x && f.pos.y === pos.y), `someone stands at ${pos.x},${pos.y}`);
  assertEqual(roomFigures(vault, ['vault_won', 'garrick_freed']).filter((f) => !f.fallen), [], 'the Choir lies where it fell, and the wheel is empty');
  assertEqual(roomFigures(vault, ['vault_fates_mercy', 'garrick_freed']), [], 'gone down to their rite');
});

// At the top of the stair down from the oath-wall (a level 4 Champion unless given, with Odda
// and Fen unless false).
async function atTheVault(seed, { character = champion4, flags = [], odda = true, fen = true } = {}) {
  const game = await atTheDarkMoon(seed, { character, flags, odda, fen });
  game.page = jumpTo(game, 'ch3_vault');
  return game;
}

// Settles the fight at the wheel from the choice starting `start`: won or lost.
function settleVault(game, start, { won = true, setUp = () => {} } = {}) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start) && (c.tags || []).includes('combat:vault-wheel'));
  if (!choice) throw new Error(`No fight "${start}": ${cards(game).join(' / ')}`);
  startFight(game, choice);
  setUp(game);
  if (won) for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  else game.hp = 0;
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

test('Chapter 3: down the stair from the oath-wall to the flooded vault, where Garrick and the Rival walk the Choir’s wheel', async () => {
  const game = await atTheVault('vault-arrive', { character: sable, flags: ['rival_taken'] });
  assertEqual([cards(game), game.objective], [['Go down the stair into the deep barrow'], "Go down into the deep barrow, find Garrick at the sluices, and stop the Choir's hymn."]);
  pick(game, 'Go down the stair');
  assertEqual([currentDungeon(game), currentLocation(game)], [{ id: 'deep-barrow', room: 'vault', explored: ['vault'] }, "The Kings' Barrow, the flooded vault"]);
  const text = pageText(game);
  assertTrue(['half full of black water', 'Garrick Dunn', 'walks Sable Rook, looking furious about it', 'something that was an ogre once', "That's the raising hymn", 'Thank the Flame'].every((s) => text.includes(s)), text);
  assertEqual([cards(game), tagsOf(game)], [["Creep down off the landing while they're busy at the wheel", 'Attack them from the landing'], ['check:stealth:12', 'combat:vault-wheel']]);
  assertTrue(['odda_at_the_vault', 'fen_at_the_vault'].every((f) => game.flags.includes(f)));
  forceNextD20(20);
  pick(game, 'Creep down');
  revealAll(game);
  assertTrue(pageText(game).includes('before anyone at the wheel knows you'));
  assertEqual([cards(game), tagsOf(game)], [['Strike before they see you'], ['combat:vault-wheel surprise']]);
});

test('Chapter 3: a slip on the landing is the fight without surprise; a Minor Illusion’s splash gets you down unseen', async () => {
  const clumsy = await atTheVault('vault-seen', { character: lifeCleric });
  pick(clumsy, 'Go down the stair');
  assertTrue(!pageText(clumsy).includes('walks Sable Rook') && !pageText(clumsy).includes('On the far side of the wheel'), 'no Rival');
  forceNextD20(1);
  pick(clumsy, 'Creep down');
  revealAll(clumsy);
  assertTrue(pageText(clumsy).includes('Down there! On the landing!'));
  assertEqual([cards(clumsy), tagsOf(clumsy)], [['Fight'], ['combat:vault-wheel']]);

  const trickster = await atTheVault('vault-illusion', { character: juniper, odda: false, fen: false });
  pick(trickster, 'Go down the stair');
  assertTrue(cards(trickster).includes('Make a great splash at the far end of the vault') && tagsOf(trickster).includes('spell:minor-illusion'));
  pick(trickster, 'Make a great splash');
  assertTrue(!trickster.page.beats.some((b) => b.type === 'roll') && pageText(trickster).includes('Every head at the wheel turns'));
  assertEqual(cards(trickster), ['Strike before they see you']);
});

test('Chapter 3: the Choir beaten at the wheel: Garrick freed with Lark’s news, the Rival freed, and an acolyte who ran will warn the Cantor', async () => {
  const game = await atTheVault('vault-won', { character: sable, flags: ['rival_taken', 'rival_offered_truce', 'lark_apprentice', 'found_garrick_neckerchief'] });
  pick(game, 'Go down the stair');
  settleVault(game, 'Attack them from the landing', {
    setUp: (g) => {
      fight.enemies(g.battle).find((c) => c.monsterId === 'cultist').escaped = true;
      fight.combatantById(g.battle, 'fen').state = 'dead';
      Object.assign(memberOf(g, 'fen'), { hp: 0, fallen: true });
    },
  });
  assertTrue(['vault_won', 'garrick_freed', 'rival_freed', 'vault_acolyte_fled', 'fen_fell_in_the_vault'].every((f) => game.flags.includes(f)) && !game.flags.includes('odda_fell_in_the_vault'));
  const text = pageText(game);
  const said = ['goes over backwards', 'running feet', 'Fen lies on the gantry', 'carry the fallen up onto the landing', 'The key to the chains', "she's decided she's my apprentice", 'Course she has', 'I tied it there', 'Sable Rook rubs their wrists', 'I should have said yes', 'Three days', "There's a stair under that water", 'Flood it, and nobody comes at our backs'];
  assertTrue(said.every((s) => text.includes(s)), said.filter((s) => !text.includes(s)).join(' / '));
  assertTrue(!text.includes('Drain it, and we') && speakersOf(game).includes('garrick') && speakersOf(game).includes('rival'), 'Fen has nothing to say');
  assertTrue(missingMiller(game).includes('Sable Rook is free') && deeds(game).includes('freed Garrick Dunn'));
  assertEqual(cards(game), ['Drain the vault, and take the quick way down', 'Flood it back, cut the Choir off, and take the long way round']);
  assertEqual(roomFigures(vaultRoom(), game.flags).filter((f) => !f.fallen), [], 'the Choir lies where it fell, and the wheel is empty');
  pick(game, 'Drain the vault');
  assertTrue(game.flags.includes('vault_drained') && !game.flags.includes('vault_flooded'));
  assertTrue(['a stair cut in the rock', 'Whoever comes down from the low door after you', "If we're not back by dawn", 'You bring yourselves back'].every((s) => pageText(game).includes(s)));
  assertEqual([cards(game), tagsOf(game), game.objective], [['Go down the stair in the drained vault'], ['go:chantry'], "Go down to the Chantry of Ash, and stop Cantor Vesk's hymn."]);
  assertTrue(missingMiller(game).includes('waiting at the great gate'));
  assertEqual(parseMap(dungeonRows(findDungeon('deep-barrow'), game.flags), findDungeon('deep-barrow').legend).cells[10][3].decor, 'stair-down', 'the stair shows on the map');
});

test('Chapter 3: flooding the vault back fills the Choir’s crawl, and the long way round is the builders’ old drain; the watch sees Garrick home', async () => {
  const game = await atTheVault('vault-flood', { flags: ['varrow_rallied', 'lark_stays_home'] });
  pick(game, 'Go down the stair');
  settleVault(game, 'Attack them from the landing');
  assertTrue(!game.flags.includes('vault_acolyte_fled') && !game.flags.includes('rival_freed'));
  assertTrue(pageText(game).includes("she's promised me she'll stay there") && !pageText(game).includes('rubs their wrists') && !pageText(game).includes('neckerchief'));
  assertTrue(pageText(game).includes('Drain it, and we') && pageText(game).includes('Flood it, and nobody'));
  pick(game, 'Flood it back');
  assertTrue(game.flags.includes('vault_flooded') && !game.flags.includes('vault_drained'));
  assertTrue(['full to the roof', 'Nobody is coming down from the low door now', 'the long way round', "Captain Varrow's watch is out on the cairns"].every((s) => pageText(game).includes(s)));
  assertEqual(cards(game), ["Take the long way round, through the builders' old drain"]);
  assertEqual(roomFigures(vaultRoom(), game.flags), [], 'the water takes the fallen, and the wheel is empty');
});

test('Chapter 3: beaten at the wheel, you wake chained to it and robbed; Fen slips the chains, or Garrick’s loose pin does', async () => {
  const game = await atTheVault('vault-mercy');
  game.money = 2500;
  pick(game, 'Go down the stair');
  settleVault(game, 'Attack them from the landing', { won: false });
  assertTrue(['vault_fates_mercy', 'garrick_freed'].every((f) => game.flags.includes(f)) && !game.flags.includes('vault_won') && game.money === 0);
  assertTrue(game.hp === fight.maxHpOf(game, { id: 'hero' }) && notes(game).some((n) => n.startsWith('A good place to stop')));
  assertTrue(['You come to walking', 'Odda and Fen walk the wheel behind you', "They've gone down to their rite", 'the cheap stuff', 'Over my dead body'].every((s) => pageText(game).includes(s)), pageText(game));
  assertTrue(!pageText(game).includes('The key to the chains') && !pageText(game).includes('Give it a kick'));
  assertEqual(roomFigures(vaultRoom(), game.flags), [], 'the Choir took its dead down to the rite');
  assertEqual(cards(game), ['Drain the vault, and take the quick way down', 'Flood it back, cut the Choir off, and take the long way round']);

  const alone = await atTheVault('vault-mercy-alone', { fen: false });
  pick(alone, 'Go down the stair');
  settleVault(alone, 'Attack them from the landing', { won: false });
  assertTrue(pageText(alone).includes('Give it a kick') && pageText(alone).includes('Odda walks the wheel behind you') && !pageText(alone).includes('the cheap stuff'));
});

// ---- Chapter 3, beat 5: the Chantry of Ash ----

const chantryRoom = () => findDungeon('deep-barrow').rooms.find((r) => r.id === 'chantry');

// A fight in the chantry with these story flags, the hero (Sable Rook's rival unless given)
// going first.
function chantryFight(encounterId, flags = [], character = sable, seed = 'chantry') {
  const game = gameFor(character, seed);
  game.flags = flags;
  forceNextD20(20);
  fight.startBattle(game, encounterId, 0);
  return game;
}

test('Wight: SRD 5.2.1’s stat block, two Necrotic Sword or Bow attacks a turn; Life Drain isn’t played yet', () => {
  const wight = monsters.find((m) => m.id === 'wight');
  assertEqual([wight.ac, wight.hp.average, wight.speed, wight.initiative, wight.cr, wight.xp, wight.multiattack], [14, 82, 30, 4, '3', 700, 2]);
  assertEqual(wight.attacks.map((a) => [a.id, a.kind, a.bonus, a.damage.dice, a.damage.bonus, a.damage.type, a.damage.plus.dice, a.damage.plus.type]), [
    ['necrotic-sword', 'melee', 4, '1d8', 2, 'slashing', '1d8', 'necrotic'],
    ['necrotic-bow', 'ranged', 4, '1d8', 2, 'piercing', '1d8', 'necrotic'],
  ]);
  assertEqual([wight.resistances, wight.immunities, wight.conditionImmunities, wight.type, wight.source], [['necrotic'], ['poison'], ['exhaustion', 'poisoned'], 'Undead', 'SRD 5.2.1']);
  assertTrue(Boolean(sprites[wight.sprite]) && wight.variant.includes('Life Drain'));
});

test('The Chantry of Ash: Vesk, Dame Aveline and the dead are High; Vesk sings, and the Choir follows you down the drained stair', () => {
  const game = chantryFight('chantry', ['vault_drained']);
  assertEqual(fight.enemies(game.battle).map((c) => c.name), ['Cantor Vesk', 'Dame Aveline', 'Zombie 1', 'Zombie 2']);
  const xp = ['chantry', 'chantry-late'].map((id) => encounterXp(encounters.find((e) => e.id === id)));
  assertEqual([xp, xp.map((n) => ratingFor(n, partyBudget(4, 3)))], [[1250, 1300], ['High', 'High']]);
  assertEqual(fight.objectiveText(game.battle), 'Two Choir Acolytes are coming from the stair: they arrive at the start of round 3.');
  assertEqual(fight.battleMap(game.battle).cells[0][3].decor, 'stair-down', 'the drained vault’s stair, at the top of the fight');
  assertEqual(fight.combatantById(game.battle, 'rival'), undefined, 'no Rival unless freed');
  game.hp = 300; // so the hero is still standing to watch
  fight.endHeroTurn(game);
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Out of the dark from the stair come Choir Acolyte 1 and Choir Acolyte 2, and join the fight!'), logText(game));
  assertTrue(said(game, 'drags itself up out of the ash'), logText(game));
});

test('The Chantry of Ash: Sister Rhosyn leads the Choir down if she lives, and your freed Rival fights beside you, by name', () => {
  const game = chantryFight('chantry', ['vault_drained', 'rhosyn_lives', 'rival_freed']);
  assertEqual(fight.objectiveText(game.battle), 'Sister Rhosyn and two Choir Acolytes are coming from the stair: they arrive at the start of round 3.');
  const rival = fight.combatantById(game.battle, 'rival');
  assertEqual([rival.name, rival.side, rival.ally, rival.monsterId, rival.pos], ['Sable Rook', 'hero', true, 'bandit-captain', { x: 4, y: 1 }]);
  game.hp = 300;
  fight.endHeroTurn(game);
  fight.endHeroTurn(game);
  assertTrue(said(game, 'come Sister Rhosyn, Choir Acolyte 1 and Choir Acolyte 2'), logText(game));
});

test('The Chantry of Ash, the long way round: out of the drain in the left wall, nobody behind you, but a third Zombie is up already', () => {
  const game = chantryFight('chantry-late', ['vault_flooded', 'rhosyn_lives']);
  assertEqual([fight.heroCombatant(game.battle).pos, game.battle.reinforcements, fight.enemies(game.battle).length], [{ x: 1, y: 3 }, null, 5]);
  assertEqual(fight.battleMap(game.battle).cells[0][3].terrain, 'water', 'the flooded vault above');
  assertEqual(fight.objectiveText(game.battle), 'The hymn: unless the singer is stopped, another Zombie rises at the start of round 3. Hurting the singer may break it.');
});

test('The Chantry of Ash: a hero who read the oath-wall calls Dame Aveline by name within 30 feet, and she turns on Vesk', () => {
  assertEqual(fight.nameCall(chantryFight('chantry', ['vault_drained'])), null, 'never learned her name');
  const game = chantryFight('chantry', ['vault_drained', 'read_the_oath_wall']);
  const call = fight.nameCall(game);
  assertEqual([call.action, call.target.name, call.problem], ['Call her by name: “Aveline!”', 'Dame Aveline', 'Dame Aveline is too far away to hear you: get within 30 feet.']);
  fight.heroCombatant(game.battle).pos = { x: 4, y: 4 }; // 25 feet from her
  assertEqual(fight.nameCall(game).problem, null);
  fight.heroCallByName(game);
  const aveline = fight.combatantById(game.battle, 'wight-1');
  assertEqual([aveline.side, aveline.ally, aveline.turned, game.battle.turnState.action], ['hero', true, true, true]);
  assertTrue(said(game, 'Aveline! First of the sworn!') && said(game, 'goes for Cantor Vesk!'), logText(game));
  assertEqual(fight.nameCall(game), null, 'once is enough');
  game.hp = 300;
  fight.endHeroTurn(game);
  const swings = game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Dame Aveline'));
  assertTrue(swings.length > 0 && swings.every((e) => e.text.includes('Cantor Vesk')), logText(game));
  for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  game.battle.outcome = 'victory';
  fight.finishBattle(game);
  assertEqual(game.lastBattle.turned, ['wight']);
});

test('The deep barrow: the chantry below the vault, the long way round in by the old drain, and Vesk, Aveline and the dead where the fights start them', () => {
  const room = chantryRoom();
  assertEqual([room.rows, roomEntry(room, []), roomEntry(room, ['vault_flooded'])], [[10, 21], { x: 3, y: 11 }, { x: 1, y: 13 }]);
  const late = roomFigures(room, ['vault_flooded']);
  for (const id of ['chantry', 'chantry-late']) {
    for (const { pos } of encounters.find((e) => e.id === id).monsters) assertTrue(late.some((f) => f.pos.x === pos.x && f.pos.y === pos.y + room.rows[0]), `${id}: someone at ${pos.x},${pos.y}`);
  }
  assertEqual(roomFigures(room, []).length, 4, 'the third Zombie only once you arrive late');
  assertEqual(roomFigures(room, ['chantry_won', 'aveline_rested']).filter((f) => !f.fallen), [], 'all of them down');
});

// At the foot of the flooded vault, ready to go down to the chantry (a level 4 Champion with Odda
// and Fen unless given), with the vault drained unless the flags say flooded.
async function atTheChantry(seed, { character = champion4, flags = [], odda = true, fen = true } = {}) {
  const game = await atTheDarkMoon(seed, { character, flags: flags.includes('vault_flooded') ? flags : ['vault_drained', ...flags], odda, fen });
  game.page = jumpTo(game, 'ch3_chantry');
  return game;
}

// Settles the chantry fight from the choice starting `start`: won or lost.
function settleChantry(game, start, { won = true, setUp = () => {} } = {}) {
  const choice = game.story.currentChoices.find((c) => c.text.startsWith(start) && (c.tags || []).some((t) => t.startsWith('combat:chantry')));
  if (!choice) throw new Error(`No fight "${start}": ${cards(game).join(' / ')}`);
  startFight(game, choice);
  setUp(game);
  if (won) for (const foe of fight.enemies(game.battle)) foe.hp = 0;
  else game.hp = 0;
  game.battle.outcome = won ? 'victory' : 'defeat';
  game.page = continueAfterBattle(game);
}

test('Chapter 3: down the drained stair into the Chantry of Ash: Vesk singing, Aveline rising, and a chance to creep down unseen', async () => {
  const game = await atTheChantry('chantry-stair', { character: sable, flags: ['read_the_oath_wall', 'rival_freed'] });
  assertEqual([cards(game), tagsOf(game), game.objective], [['Go down the stair in the drained vault'], ['go:chantry'], "Go down to the Chantry of Ash, and stop Cantor Vesk's hymn."]);
  pick(game, 'Go down the stair');
  assertEqual([currentDungeon(game).room, currentLocation(game)], ['chantry', "The Kings' Barrow, the Chantry of Ash"]);
  const text = pageText(game);
  assertTrue(['Cantor Vesk', 'Two of the dead', 'something sits up in it', 'You know her. AVELINE', "That's no Choir dead", 'The singer\'s mine', 'Nobody has'].every((s) => text.includes(s)), text);
  assertTrue(['odda_at_the_chantry', 'fen_at_the_chantry'].every((f) => game.flags.includes(f)) && speakersOf(game).includes('rival'));
  assertEqual([cards(game), tagsOf(game)], [['Creep down the last steps while he sings', 'Charge down into the ash'], ['check:stealth:13', 'combat:chantry']]);
  forceNextD20(20);
  pick(game, 'Creep down');
  revealAll(game);
  assertEqual([cards(game), tagsOf(game)], [['Strike before they see you'], ['combat:chantry surprise']]);

  const warned = await atTheChantry('chantry-warned', { flags: ['vault_acolyte_fled'] });
  pick(warned, 'Go down the stair');
  assertTrue(pageText(warned).includes('There you are') && speakersOf(warned).includes('vesk') && !pageText(warned).includes('You know her'));
  assertEqual([cards(warned), tagsOf(warned)], [['Fight'], ['combat:chantry']]);
});

test('Chapter 3: the long way round: a roof fall in the old drain, then out behind the Choir’s backs for a surprise attack, late', async () => {
  const game = await atTheChantry('chantry-drain', { character: juniper, flags: ['vault_flooded'] }); // no Guidance or Tactical Mind to change the check
  assertEqual(cards(game), ["Take the long way round, through the builders' old drain"]);
  pick(game, 'Take the long way round');
  assertEqual([cards(game), tagsOf(game)], [['Squeeze through the gap at the top', 'Shift the fallen stones, and shore up the roof'], ['check:acrobatics:12', 'check:athletics:12']]);
  game.hp = 30;
  game.rng = scriptedThen([1, 3, 4], 'chantry-drain'); // the check fails; 2d6 of 3 and 4
  pick(game, 'Squeeze through');
  revealAll(game);
  assertTrue(notes(game).includes('You take 7 bludgeoning damage (2d6: 3, 4).') && game.hp === 23, notes(game).join(' / '));
  assertTrue(['the roof comes down on your back', 'crawl on', "you're late", 'Three of the dead', 'Nobody is looking at the drain'].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual([currentDungeon(game).room, cards(game), tagsOf(game)], ['chantry', ['Drop down from the drain and strike before they turn'], ['combat:chantry-late surprise']]);
});

test('Chapter 3: called by name, Aveline lies down at rest (her 700 XP); your Rival stands; Vesk lies dying, reaching for the gold on her breast', async () => {
  const game = await atTheChantry('chantry-rests', { character: sable, flags: ['read_the_oath_wall', 'rival_freed', 'swore_the_oath'] });
  pick(game, 'Go down the stair');
  const xp = game.xp;
  settleChantry(game, 'Charge down', {
    setUp: (g) => Object.assign(fight.combatantById(g.battle, 'wight-1'), { side: 'hero', ally: true, turned: true }),
  });
  assertTrue(['chantry_won', 'aveline_rested'].every((f) => game.flags.includes(f)) && !game.flags.includes('aveline_destroyed') && game.xp - xp === 700);
  const text = pageText(game);
  assertTrue(['"Called," she says', 'Hold the door', "That's that settled", 'lies on the altar steps', 'The Sleeping King', 'the gold on her breast'].every((s) => text.includes(s)), text);
  assertTrue(speakersOf(game).includes('aveline') && deeds(game).includes('Called Dame Aveline'));
  assertEqual([cards(game), game.objective], [['Kneel beside him, and hear him out', 'Get to the gold before he does', 'Stand back, and see what he does'], 'See what Cantor Vesk was reaching for.']);
  assertEqual(roomFigures(chantryRoom(), game.flags).filter((f) => !f.fallen), [], 'all of them down');
});

test('Chapter 3: not called, Aveline is destroyed; a Rival cut down lives, badly hurt; a companion who falls is noted', async () => {
  const game = await atTheChantry('chantry-destroyed', { character: sable, flags: ['rival_freed'] });
  pick(game, 'Go down the stair');
  settleChantry(game, 'Charge down', {
    setUp: (g) => {
      fight.combatantById(g.battle, 'rival').hp = 0;
      fight.combatantById(g.battle, 'fen').state = 'dead';
      Object.assign(memberOf(g, 'fen'), { hp: 0, fallen: true });
    },
  });
  assertTrue(['chantry_won', 'aveline_destroyed', 'rival_wounded', 'fen_fell_in_the_chantry'].every((f) => game.flags.includes(f)) && !game.flags.includes('aveline_rested'));
  assertTrue(['the dark goes out of her helm', 'She deserved better than him', 'find a pulse', 'Fen lies small and still in the ash'].every((s) => pageText(game).includes(s)), pageText(game));
});

test('Chapter 3: beaten in the chantry, Aveline remembers by herself and cuts Vesk down; you wake in the ash, robbed', async () => {
  const game = await atTheChantry('chantry-mercy', { character: sable, flags: ['vault_flooded', 'rival_freed'] });
  game.money = 2500;
  pick(game, 'Take the long way round');
  forceNextD20(20);
  pick(game, 'Shift the fallen stones');
  revealAll(game);
  settleChantry(game, 'Drop down', { won: false });
  assertTrue(['chantry_fates_mercy', 'aveline_rested'].every((f) => game.flags.includes(f)) && !game.flags.includes('chantry_won') && game.money === 0);
  assertTrue(['the sword comes down on the Cantor instead', 'with your purse', 'She did it', 'lies on the altar steps'].every((s) => pageText(game).includes(s)), pageText(game));
  assertTrue(!pageText(game).includes("That's that settled"), 'no victory talk after a defeat');
  assertTrue(game.hp === fight.maxHpOf(game, { id: 'hero' }) && notes(game).some((n) => n.startsWith('A good place to stop')));
});

// ---- Chapter 3, beat 6: the first shard, and the way out ----

// With Cantor Vesk dying at the altar after the chantry fight (a level 4 Champion with Odda and
// Fen unless given; the vault drained unless the flags say flooded), at the choice of what to do
// as he reaches for the gold. at: a stitch of ch3_shard to start from instead.
async function atTheShard(seed, { character = champion4, flags = [], odda = true, fen = true, at = '' } = {}) {
  const game = await atTheChantry(seed, { character, flags: ['chantry_won', ...flags], odda, fen });
  game.page = jumpTo(game, at ? `ch3_shard.${at}` : 'ch3_shard');
  return game;
}

// A companion who fell (died) earlier in the barrow.
function fallen(game, id) {
  Object.assign(memberOf(game, id), { hp: 0, fallen: true });
}

const shardCards = ["Lay it back on Dame Aveline's breast", 'Hold the shard over the dead Cantor, and make him answer', 'Get everyone out of here'];
// At the gate at dawn, the answers to Garrick's "Is it done?" (beat 7).
const garrickAnswers = ["Tell him it's done", 'Show him what flew to your hand', "Tell him the singing's over, but you don't think it's done"];

test('Chapter 3: the first shard: Vesk sings his last note, the gold flies to your hand and says your whole name as your Rival does, and you see the crown break', async () => {
  const game = await atTheChantry('shard-called', { character: sable, flags: ['read_the_oath_wall', 'rival_freed'] });
  pick(game, 'Go down the stair');
  settleChantry(game, 'Charge down', {
    setUp: (g) => Object.assign(fight.combatantById(g.battle, 'wight-1'), { side: 'hero', ally: true, turned: true }),
  });
  const approval = memberOf(game, 'odda').approval;
  pick(game, 'Kneel beside him');
  assertEqual(memberOf(game, 'odda').approval - approval, 1, 'mercy');
  const text = pageText(game);
  assertTrue(
    ['Forty years I dug graves', 'the words her order says over the dying', 'one cracked note', "Under Dame Aveline's folded hands", 'not to the Cantor, but to you', 'Then he\'s gone',
      'It says your name: Wren Ashdown, all of it, the way Sable Rook says it, as if it\'s a joke only they get.', 'Sable Rook is across the hall'].every((s) => text.includes(s)),
    text,
  );
  assertEqual([cards(game), speakersOf(game)], [['Open your hand, and look at it'], ['vesk', 'vesk']]);
  pick(game, 'Open your hand');
  const vision = pageText(game);
  assertTrue(
    ['a crown half off his head', 'seven sparks', 'she looks straight at you', 'turned over in its sleep', "That isn't Choir work", "Why'd it go to you?", 'Of course it went to you'].every((s) => vision.includes(s)),
    vision,
  );
  assertTrue(game.flags.includes('shard_names') && game.inventory.some((i) => i.id === 'shard-of-names') && notes(game).includes('You now have: The Shard of Names.'));
  assertEqual(speakersOf(game), ['odda', 'fen', 'rival']);
  assertTrue(deeds(game).includes('Caught a sliver of gold'));
  assertEqual([cards(game), tagsOf(game)], [shardCards, ['', 'shard:names', '']]);
});

test('Chapter 3: the shard won’t stay with Aveline; held over the dead Cantor, it makes him answer, and it’s a flag for the Whisper', async () => {
  const game = await atTheShard('shard-asked', { flags: ['aveline_destroyed'] }); // Wren, whose Bond is her sibling Kit
  pick(game, 'Get to the gold');
  const text = pageText(game);
  assertTrue(['On Dame Aveline\'s breastplate', 'leaps the last inch into your hand', 'the way Kit Ashdown used to say it when you were small and in trouble'].every((s) => text.includes(s)), text);
  assertTrue(!game.flags.includes('shard_names'), 'not until the vision');
  pick(game, 'Open your hand');
  const approval = memberOf(game, 'odda').approval;
  pick(game, 'Lay it back');
  assertTrue(game.flags.includes('tried_to_return_the_shard') && memberOf(game, 'odda').approval - approval === 1);
  assertTrue(['back on Dame Aveline\'s breastplate', 'back in your palm', "It's chosen, then"].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual(cards(game), shardCards.slice(1));
  pick(game, 'Hold the shard');
  assertTrue(game.flags.includes('asked_the_dead_cantor') && pageText(game).includes('"Who calls?"') && speakersOf(game).includes('vesk'));
  assertEqual(cards(game), ['Ask him what the Sleeping King is', 'Ask him what the Choir was digging for', 'Let him rest'], 'who "she" is, once he speaks of her');
  pick(game, 'Ask him what the Sleeping King is');
  assertTrue(pageText(game).includes('He went to sleep with the crown on his head'));
  pick(game, 'Ask him who');
  assertTrue(pageText(game).includes('The Precentor. She was there when he went to sleep.'));
  pick(game, 'Ask him what the Choir');
  assertTrue(pageText(game).includes('The old dead remember where.'));
  assertEqual(cards(game), ['Let him rest']);
  pick(game, 'Let him rest');
  assertTrue(['only a dead man', 'Horrible. But useful.', "Don't make a habit of that"].every((s) => pageText(game).includes(s)), pageText(game));
  assertTrue(missingMiller(game).includes('The Precentor, who leads the Choir, was there') && deeds(game).includes('made him answer'));
  assertEqual(cards(game), ['Get everyone out of here']);
});

test('Chapter 3: the way out: the barrow shudders again; up the drained stair, through the hall where the oaths hold, to Garrick at the gate at dawn', async () => {
  const flags = ['aveline_rested', 'varrow_rallied', 'nettle_rallied', 'gate_guardians_knelt'];
  const game = await atTheShard('shard-stair', { character: juniper, flags, at: 'with_the_shard' }); // no Guidance or Tactical Mind to change the check
  pick(game, 'Get everyone out');
  assertTrue(['turning for the stair', 'A pillar splits', '"Out," Odda says.'].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual([cards(game), tagsOf(game), game.objective], [['Haul everyone up the stair before it goes', 'Dodge up the stair between the falling stones'], ['check:athletics:12', 'check:acrobatics:12'], "Get out of the Kings' Barrow."]);
  forceNextD20(20);
  pick(game, 'Haul everyone');
  revealAll(game);
  const climb = pageText(game);
  assertTrue(['like a mule up a mountain', 'silt and puddles', 'The oaths are still holding', '"Thank you," Odda says to the tombs'].every((s) => climb.includes(s)), climb);
  assertEqual([currentDungeon(game).room, cards(game)], ['hall', ['Go on up, through the crowned passage, and out']]);
  pick(game, 'Go on up');
  const text = pageText(game);
  assertTrue(
    ['climb the last stair into the open air', "It's dawn", 'stand on their plinths', "exactly where he said he'd wait", '"Is it done?"', "Varrow's watch are putting out their torches", 'goblin cheer', 'warm as a hand'].every((s) => text.includes(s)),
    text,
  );
  assertTrue(!text.includes('carry the fallen home') && !text.includes('your rival'), 'nobody fell, and no Rival');
  assertEqual([currentDungeon(game).id, currentDungeon(game).room, currentLocation(game), currentTime(game)], ['kings-barrow', 'forecourt', "The Kings' Barrow, the great gate", 'Dawn']);
  assertEqual([cards(game), game.objective], [garrickAnswers, 'Take Garrick home to Bramblegate.']);
  assertTrue(speakersOf(game).includes('garrick') && missingMiller(game).includes('Take him home to Lark'));
});

test('Chapter 3: the long way out, through the old drain: a falling stone, the fallen carried and a wounded Rival helped; the robbed hall shakes', async () => {
  const flags = ['vault_flooded', 'aveline_destroyed', 'rival_freed', 'rival_wounded', 'odda_at_the_chantry', 'odda_fell_in_the_chantry', 'fen_fell_in_the_vault', 'looted_the_champions', 'gate_guardians_destroyed'];
  const game = await atTheShard('shard-drain', { character: { ...juniper, bond: { type: 'rival', name: 'Sable Rook' } }, flags, at: 'with_the_shard' });
  fallen(game, 'odda');
  fallen(game, 'fen');
  pick(game, 'Get everyone out');
  assertTrue(['turning for the drain', 'You get her across your shoulders anyway', 'Sable Rook comes round as you haul them up'].every((s) => pageText(game).includes(s)), pageText(game));
  assertTrue(!pageText(game).includes('"Out," Odda says'), 'Odda fell');
  assertEqual([cards(game), tagsOf(game)], [['Heave the stones aside, and hold up the roof while everyone crawls through', 'Squeeze through ahead of the fall, and drag the others after you'], ['check:athletics:12', 'check:acrobatics:12']]);
  game.hp = 30;
  game.rng = scriptedThen([1, 3, 4], 'shard-drain'); // the check fails; 2d6 of 3 and 4
  pick(game, 'Squeeze through');
  revealAll(game);
  assertTrue(notes(game).includes('You take 7 bludgeoning damage (2d6: 3, 4).') && game.hp === 23, notes(game).join(' / '));
  const climb = pageText(game);
  assertTrue(['the size of a bread oven', 'You get up anyway', 'The black water heaves', 'stop for the fallen you left there', "you don't look at them"].every((s) => climb.includes(s)), climb);
  assertTrue(!climb.includes('The oaths are still holding'), 'the robbed tombs don’t hold');
  pick(game, 'Go on up');
  const text = pageText(game);
  assertTrue(['lie in pieces', "You'll carry the fallen home to Bramblegate's temple", 'They are not fine'].every((s) => text.includes(s)), text);
  assertTrue(!text.includes('the cloak lies where you left it'), 'nobody fell at the gate');
  assertEqual(cards(game), garrickAnswers);
});

test('Chapter 3: struck down on the way out is Fate’s Mercy: carried up to the forecourt, your purse lost under the hill', async () => {
  const game = await atTheShard('shard-mercy', { character: juniper, flags: ['aveline_rested'], fen: false, at: 'with_the_shard' });
  game.money = 500;
  game.hp = 1;
  pick(game, 'Get everyone out');
  game.rng = scriptedThen([1, 1, 1, 2, 2, 2], 'shard-mercy'); // the check fails; 2d6 of 1 and 1; three failed death saves
  pick(game, 'Dodge up the stair');
  revealAll(game);
  assertTrue(['escape_fates_mercy'].every((f) => game.flags.includes(f)) && game.money === 0 && game.hp === fight.maxHpOf(game, { id: 'hero' }));
  const text = pageText(game);
  assertTrue(['Somebody carried you up out of the barrow', 'your purse came loose', 'Garrick Dunn looks at you'].every((s) => text.includes(s)), text);
  assertTrue(!text.includes("exactly where he said he'd wait") && !text.includes('silt and puddles'), 'straight to the gate');
  assertEqual([currentDungeon(game).room, cards(game)], ['forecourt', garrickAnswers]);
});

test('Chapter 3: a Dwarf feels where the stone will hold on the way out, with no roll', async () => {
  const game = await atTheShard('shard-dwarf', { character: dwarf, flags: ['vault_flooded'], at: 'with_the_shard' });
  pick(game, 'Get everyone out');
  assertEqual(cards(game).length, 3);
  pick(game, 'Feel where the stone will hold');
  assertTrue(game.page.beats.every((b) => b.type !== 'roll') && pageText(game).includes('listened to stone') && pageText(game).includes('the landing above the flooded vault'));
});

// ---- Chapter 3, beat 7: Bramblegate's thanks, and the end of Act I ----

// After the barrow, with the Shard of Names in the pack (a level 4 Champion with Odda and Fen
// unless given): up the last stair onto the forecourt, at Garrick's "Is it done?" at the great
// gate; or at another knot or stitch (at: 'ch3_feast').
async function atTheHomecoming(seed, { character = champion4, flags = [], odda = true, fen = true, at = 'ch3_shard.into_the_air' } = {}) {
  const game = await atTheDarkMoon(seed, { character, flags: ['chantry_won', 'aveline_rested', ...flags], odda, fen });
  jumpTo(game, 'ch3_shard.the_vision'); // the shard goes in the pack
  game.page = jumpTo(game, at);
  return game;
}

// At the feast, after the tale and the toast, at the choices of who to see.
function toTheFaces(game) {
  pick(game, 'Eat, and then tell it');
  pick(game, 'Drink to it');
}

const hasShard = (game) => game.inventory.some((i) => i.id === 'shard-of-names');

test('Chapter 3, beat 7: Garrick’s answer, two days down the barrow road with the watch, and Lark at the north gate', async () => {
  const game = await atTheHomecoming('home-road', { flags: ['varrow_rallied', 'nettle_rallied', 'cairnfield_won', 'lark_apprentice'] });
  assertTrue(hasShard(game));
  assertEqual([cards(game), game.objective, currentDungeon(game).room], [garrickAnswers, 'Take Garrick home to Bramblegate.', 'forecourt']);
  pick(game, "Tell him it's done");
  const road = pageText(game);
  assertTrue(["I've a girl to see", 'the cold ashes of the Choir', 'Garrick talks about Lark', 'goblins melt away', 'turns out to cheer you over the river'].every((s) => road.includes(s)), road);
  assertTrue(!road.includes('litter') && !road.includes('leans on your shoulder'), 'nobody to carry');
  assertEqual([currentDungeon(game).room, currentLocation(game), cards(game)], [null, 'The Old Ford', ['Go on, south']], 'out of the barrow, and off its map');
  pick(game, 'Go on, south');
  const wives = pageText(game);
  assertTrue(['three barrows on its crown', 'The Three Wives', 'They rose when the barrow shook', 'the carter, who has heard of the Wives too', 'Somebody is sitting on the mounting block'].every((s) => wives.includes(s)), wives);
  assertTrue(game.flags.includes('saw_the_barrow_wives'), 'seen, for the last morning');
  assertEqual([currentLocation(game), currentTime(game), cards(game)], ['Bramblegate, north gate', 'Dusk', ['Walk the last of the way']]);
  pick(game, 'Walk the last of the way');
  const gate = pageText(game);
  assertTrue(['her father\'s hatchet lies in the road', 'With my hatchet', 'Somebody had to', 'Warden Pike has found something very interesting', 'Apprentice, is it'].every((s) => gate.includes(s)), gate);
  assertEqual(speakersOf(game), ['garrick', 'lark', 'garrick']);
  assertTrue(game.flags.includes('garrick_home') && deeds(game).includes('Brought Garrick Dunn home'));
  assertEqual(cards(game), ['Go to the Tallow and Thistle'], 'nobody for the temple');
});

test('Chapter 3, beat 7: the great candle calls back the companions who fell in the barrow; with the Prior in the cells, Varrow brings him up to light it; the wounded Rival goes to the surgeon', async () => {
  const flags = ['odda_fell_in_the_chantry', 'fen_fell_in_the_vault', 'crane_exposed', 'rival_freed', 'rival_wounded', 'ford_fell'];
  const game = await atTheHomecoming('home-candle', { character: sable, flags });
  fallen(game, 'odda');
  fallen(game, 'fen');
  pick(game, 'Show him what flew');
  const road = pageText(game);
  assertTrue(['Put it away', 'the Choir\'s empty tents', 'a litter of hazel poles', 'Sable Rook leans on your shoulder', 'new graves on the north bank'].every((s) => road.includes(s)), road);
  pick(game, 'Go on, south');
  assertTrue(pageText(game).includes('walks faster, and you go with him') && !pageText(game).includes('They rose'), 'on foot, with the ford fallen; Odda lies on the litter');
  pick(game, 'Walk the last of the way');
  assertEqual(cards(game), ['Go up to the temple first']);
  pick(game, 'Go up to the temple first');
  const temple = pageText(game);
  assertTrue(
    ['two lay sisters', 'Prior Crane beside him in irons', 'awkwardly, in his irons', 'You lay the fallen before the altar flame', 'Oh, Jessamy', 'died for a draw', 'this time everybody knows what he means', 'forearms like a smith', 'They won\'t be.'].every((s) => temple.includes(s)),
    temple,
  );
  assertEqual(speakersOf(game), ['varrow', 'crane', 'odda', 'fen', 'crane', 'rival']);
  assertTrue(['flame_spent', 'odda_raised', 'fen_raised'].every((f) => game.flags.includes(f)));
  assertTrue(['odda', 'fen'].every((id) => !memberOf(game, id).fallen && memberOf(game, id).hp === memberMaxHp(game, memberOf(game, id))), 'both alive, with all their Hit Points');
  assertEqual(cards(game), ['Go down to the Tallow and Thistle']);
});

test('Chapter 3, beat 7: with the great candle spent, the fallen lie before the altar to wait; one who fell at the gate came home with the watch', async () => {
  const game = await atTheHomecoming('home-waiting', { flags: ['flame_spent', 'fen_fell_at_the_gate', 'varrow_rallied', 'crane_made_amends'] });
  fallen(game, 'fen');
  pick(game, "Tell him the singing's over");
  assertTrue(pageText(game).includes('Nothing ever is') && !pageText(game).includes('litter'), 'the watch carried Fen home from the gate that night');
  pick(game, 'Go on, south');
  pick(game, 'Walk the last of the way');
  pick(game, 'Go up to the temple first');
  const temple = pageText(game);
  assertTrue(['Prior Crane is at the altar, and gets up', 'Fen lies before the altar flame', "The great candle's spent", 'nobody in Bramblegate will forget them'].every((s) => temple.includes(s)), temple);
  assertTrue(!temple.includes('You lay the fallen') && !temple.includes('roars up white'), 'already there, and no candle');
  assertTrue(memberOf(game, 'fen').fallen);
});

test('Chapter 3, beat 7: the feast: the tale, the reeve’s last 25 gold and The Missing Miller done, and two faces in the crowd', async () => {
  const game = await atTheHomecoming('feast', { flags: ['goblins_at_mill', 'varrow_rallied', 'escape_fates_mercy'], at: 'ch3_feast' });
  game.money = 0;
  const xp = game.xp;
  assertTrue(['a version of your story that has a dragon in it', 'an orderly queue for pie', 'the size of a cartwheel'].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual([currentLocation(game), currentTime(game), cards(game)], ['Bramblegate, the Tallow and Thistle', 'Night', ['Eat, and then tell it']]);
  pick(game, 'Eat, and then tell it');
  assertTrue(['not to look at your pocket', 'until Morwen threatens them with a ladle', 'Twenty-five I paid', 'since the hill took the last of it', 'To the ones who came looking'].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual([game.money, game.xp - xp, game.journal.quests.find((q) => q.id === 'missing-miller').status], [2500, 200, 'done']);
  assertTrue(notes(game).includes('Quest complete: The Missing Miller.') && notes(game).some((n) => n.startsWith('A good place to stop')));
  pick(game, 'Drink to it');
  assertTrue(['the Regent\'s blue', 'an owl on her shoulder', 'looking straight at you'].every((s) => pageText(game).includes(s)), pageText(game));
  assertEqual(cards(game), [
    "See what the knight in the Regent's blue wants", 'Go over to the old woman with the owl', "Hold the shard, and ask it the old woman's name", 'Sit with Odda for a while', 'Find out what Fen is up to', 'Go up to bed',
  ]);
  assertEqual(tagsOf(game)[2], 'shard:names');
});

test('Chapter 3, beat 7: Knight-Captain Marchbank’s request: the shard won’t go to her; refuse, and a Free League courier slips you a letter', async () => {
  const debtor = { ...champion4, bond: { type: 'debt', name: 'Hollis Grange' } };
  const game = await atTheHomecoming('feast-marchbank', { character: debtor, flags: ['regency_favour', 'league_deal', 'looted_the_champions'], at: 'ch3_feast' });
  toTheFaces(game);
  pick(game, 'See what the knight');
  const meeting = pageText(game);
  assertTrue(['lets you come to her', 'Knight-Captain Beatrix Marchbank', 'Twice, and both times kindly', 'to be kept safe until the crown is mended'].every((s) => meeting.includes(s)), meeting);
  assertEqual(cards(game), ["Tell her you'll bring it to Highcrown", "Tell her it isn't the Regent's to ask for", "Tell her you'll think about it", 'Hold the shard out to her, and let her take it']);
  assertEqual(tagsOf(game).slice(0, 2), ['drive:glory', 'drive:freedom']);
  pick(game, 'Hold the shard out');
  assertTrue(game.flags.includes('marchbank_saw_it_return') && hasShard(game) && pageText(game).includes("That's going in my report"));
  assertEqual(cards(game).length, 3);
  const approval = memberOf(game, 'fen').approval;
  pick(game, "Tell her it isn't");
  assertTrue(['marchbank_refused', 'met_marchbank'].every((f) => game.flags.includes(f)) && memberOf(game, 'fen').approval - approval === 1);
  assertTrue(['Or it.', 'Fen raises his cup', 'Beg pardon', 'a folded letter in your hand'].every((s) => pageText(game).includes(s)), pageText(game));
  assertTrue(game.inventory.some((i) => i.id === 'league-letter') && speakersOf(game).includes('courier'));
  assertTrue(!cards(game).some((c) => c.startsWith('See what the knight')) && cards(game).includes('Read the letter'));
  pick(game, 'Read the letter');
  const letter = pageText(game);
  assertTrue(['a little gold ship', 'ask for Silas Dray', 'O. Kettering, Magister', 'Our arrangement stands', 'stamped with a crown', 'We have taken an interest in what you owe Hollis Grange', 'put a price on a thing in writing'].every((s) => letter.includes(s)), letter);
});

test('Chapter 3, beat 7: going up to bed without hearing Marchbank out, she stops you on the stair; that night the shard says your name, you reach level 5, the shard points south, and after one last morning Act I ends', async () => {
  const game = await atTheHomecoming('feast-night', { at: 'ch3_feast' }); // Wren, whose Bond is her sibling Kit
  game.xp = 5000;
  toTheFaces(game);
  pick(game, 'Go up to bed');
  assertTrue(['a hand in a steel gauntlet', 'Knight-Captain Beatrix Marchbank'].every((s) => pageText(game).includes(s)) && !pageText(game).includes('both times kindly'), pageText(game));
  pick(game, "Tell her you'll think about it");
  const night = pageText(game);
  assertTrue(['asking again', 'Beg pardon', 'a hot brick in your bed', 'it says your name again', "It's Kit Ashdown's voice", 'something else is listening', "you can't remember whether you answered"].every((s) => night.includes(s)), night);
  assertTrue(game.flags.includes('marchbank_put_off') && game.inventory.some((i) => i.id === 'league-letter'));
  assertEqual([game.xp, cards(game)], [6500, ['Wake, and go down into the morning']]);
  assertTrue(notes(game).some((n) => n.startsWith('A milestone') && n.includes('level 5')), notes(game).join(' / '));
  assertTrue(deeds(game).includes('was feasted at the Tallow and Thistle'));
  pick(game, 'Wake, and go down');
  const morning = pageText(game);
  assertTrue(['enormous', 'Have you thought?', 'Odda is packing, and Fen is eating', 'pointing south'].every((s) => morning.includes(s)), morning);
  assertTrue(!morning.includes("Don't come after me"), 'no Rival');
  assertTrue(!game.page.beats.some((b) => b.heading) && !game.flags.includes('act_1_complete'), 'not the end yet');
  assertEqual(cards(game), ['Go out into Bramblegate, one last time']);
  pick(game, 'Go out into Bramblegate');
  assertTrue(pageText(game).includes('letters for Highcrown') && cards(game).includes('Ride south with the shard'), pageText(game));
  pick(game, 'Ride south');
  const heading = game.page.beats.filter((b) => b.heading);
  assertEqual(heading, [{ type: 'text', text: 'End of Act I · The Barrow Dead', heading: true }]);
  assertTrue(game.flags.includes('act_1_complete') && !game.flags.includes('rival_left_bramblegate'));
  assertTrue(pageText(game).includes('Odda and Fen are arguing'), pageText(game));
  assertEqual([cards(game), game.objective, currentTime(game)], [[], 'Follow the shard south.', 'Afternoon']);
});

test('Chapter 3, beat 7: the old woman with the owl says a few words if you go over, and you don’t answer the shard that night', async () => {
  const game = await atTheHomecoming('feast-owl', { flags: ['tried_to_return_the_shard'], at: 'ch3_feast' });
  toTheFaces(game);
  pick(game, 'Go over to the old woman');
  const words = pageText(game);
  assertTrue(['smells faintly of mice', 'You tried to put it back', "don't answer it", 'a single grey feather'].every((s) => words.includes(s)), words);
  assertTrue(speakersOf(game).every((s) => s === 'owl-woman') && game.flags.includes('met_hesper') && !game.flags.includes('named_hesper'));
  assertTrue(!cards(game).some((c) => c.includes('old woman')), 'she’s gone');
  pick(game, 'Go up to bed');
  pick(game, "Tell her you'll bring it");
  assertTrue(game.flags.includes('marchbank_agreed') && pageText(game).includes("you don't answer. It's harder than it ought to be."), pageText(game));
});

test('Chapter 3, beat 7: the shard learns the old woman’s name, Hesper Wildmoor, its second use and a flag for the Whisper; she tells you not to do it again', async () => {
  const game = await atTheHomecoming('feast-hesper', { flags: ['asked_the_dead_cantor'], at: 'ch3_feast' });
  toTheFaces(game);
  pick(game, 'Hold the shard, and ask');
  const text = pageText(game);
  assertTrue(['like a fish coming up through dark water: Hesper Wildmoor', 'head snaps round', 'it learns you a little better', "That's twice now"].every((s) => text.includes(s)), text);
  assertEqual(speakersOf(game), ['hesper', 'odda']);
  assertTrue(['named_hesper', 'met_hesper'].every((f) => game.flags.includes(f)) && deeds(game).includes('learned her name: Hesper Wildmoor'));
  assertTrue(!cards(game).some((c) => c.includes('old woman')));
});

test('Chapter 3, beat 7: an Odda who dislikes you stays for the shard; Fen’s arithmetic; Lark asks again; the Rival asks to hold the shard, and is gone by morning', async () => {
  const game = await atTheHomecoming('feast-friends', { character: sable, flags: ['odda_means_to_go_home', 'lark_apprentice_later', 'rival_freed'], at: 'ch3_feast' });
  memberOf(game, 'odda').approval = -3;
  memberOf(game, 'fen').approval = -3;
  toTheFaces(game);
  assertTrue(cards(game).includes('Take a cup over to your rival, alone in the corner') && cards(game).includes('Answer the question Lark has been working up to all evening'));
  pick(game, 'Sit with Odda');
  assertTrue(['the one quiet corner', 'I meant it', "I'll not leave it alone with you", 'Don\'t take it for forgiveness'].every((s) => pageText(game).includes(s)) && game.flags.includes('odda_stays_for_the_shard'), pageText(game));
  pick(game, 'Find out what Fen');
  assertTrue(pageText(game).includes('Arithmetic') && pageText(game).includes('given three of it back'), pageText(game));
  pick(game, 'Answer the question Lark');
  assertEqual(cards(game), ['Take her on as your apprentice', 'Tell her the mill needs her more, for now']);
  pick(game, 'Take her on');
  assertTrue(game.flags.includes('lark_apprentice') && pageText(game).includes('Then we\'ll see'));
  pick(game, 'Take a cup over to your rival');
  assertTrue(pageText(game).includes('a play you\'d been left out of') && pageText(game).includes('I want to know why it was you'), pageText(game));
  pick(game, 'Put it in their hand');
  assertTrue(game.flags.includes('rival_held_the_shard') && hasShard(game) && pageText(game).includes('it isn\'t a good laugh'));
  assertEqual(cards(game), ["See what the knight in the Regent's blue wants", 'Go over to the old woman with the owl', "Hold the shard, and ask it the old woman's name", 'Go up to bed']);
  pick(game, 'See what the knight');
  pick(game, "Tell her you'll bring it");
  pick(game, 'Go up to bed');
  assertTrue(pageText(game).includes("It's Sable Rook's voice, and it sounds as if it's laughing at you"), pageText(game));
  pick(game, 'Wake, and go down');
  assertTrue(['Your rival\'s place at the long table is empty', 'signed Sable Rook', 'Whenever you\'re ready'].every((s) => pageText(game).includes(s)) && game.flags.includes('rival_left_bramblegate'), pageText(game));
});

test('Chapter 3, beat 7: a wounded Rival asks for the shard from the temple’s infirmary', async () => {
  const game = await atTheHomecoming('feast-wounded', { character: sable, flags: ['rival_freed', 'rival_wounded'], fen: false, at: 'ch3_feast' });
  toTheFaces(game);
  pick(game, 'Slip out to the temple');
  assertTrue(pageText(game).includes('propped up on pillows') && currentLocation(game) === 'Bramblegate, the temple');
  pick(game, 'Tell them no');
  assertTrue(game.flags.includes('rival_refused_the_shard') && pageText(game).includes('Why would you.') && pageText(game).includes('back down the hill to the feast alone'));
  assertEqual(currentLocation(game), 'Bramblegate, the Tallow and Thistle');
});

run(document.getElementById('summary'), document.getElementById('results'));

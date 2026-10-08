// Combat checks. Open tests/combat.html through the local server to run them.
// Add checks here whenever combat rules change.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { parseMap, reachableSquares, squaresBetween, key } from '../js/engine/combat/grid.js';
import { heroAttackOptions, hitChance, rollDamage } from '../js/engine/combat/attacks.js';
import * as fight from '../js/engine/combat/battle.js';
import { startingInventory } from '../js/engine/character/inventory.js';
import { freshResources } from '../js/engine/character/resources.js';
import { monsters } from '../data/srd/monsters.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { continueAfterBattle, currentLocation, makeChoice, startFight } from '../js/engine/story/story-runner.js';
import { gameToSave, loadGame, newGame } from '../js/engine/save/save-format.js';
import { validateCharacter } from '../js/engine/character/validate.js';

const wren = quickStartHeroes.find((h) => h.id === 'wren').character;
const juniper = quickStartHeroes.find((h) => h.id === 'juniper').character;

// A game with just what combat needs: the hero, their kit, full Hit Points and seeded dice.
function gameFor(character, seed = 'combat') {
  return { character, rng: createRng(seed), ...startingInventory(character), ...freshResources(character), battle: null, lastBattle: null };
}

// ---- The grid ----

const legend = { '#': { terrain: 'wall' }, '.': { terrain: 'floor' }, '~': { terrain: 'difficult' } };

test('Grid: diagonals cost the same as straight lines', () => {
  assertEqual([squaresBetween({ x: 0, y: 0 }, { x: 3, y: 3 }), squaresBetween({ x: 0, y: 0 }, { x: 3, y: 1 })], [3, 3]);
});

test('Grid: walls block, corners can’t be cut, difficult terrain costs double', () => {
  const map = parseMap(['....', '.#..', '..~.', '....'], legend);
  const reach = reachableSquares(map, { x: 0, y: 0 }, 5);
  assertTrue(!reach.has(key({ x: 1, y: 1 })), 'a wall');
  const corner = reachableSquares(parseMap(['.#', '..'], legend), { x: 0, y: 0 }, 5);
  assertTrue(!corner.has(key({ x: 1, y: 1 })), 'no cutting past the corner of a wall');
  const mud = reachableSquares(map, { x: 2, y: 3 }, 5);
  assertTrue(!mud.has(key({ x: 2, y: 2 })), 'difficult terrain needs 10 feet');
  assertEqual(reachableSquares(map, { x: 2, y: 3 }, 10).get(key({ x: 2, y: 2 })).cost, 10);
});

test('Grid: crawling costs 5 feet more a square, 15 in difficult terrain', () => {
  const map = parseMap(['.~..'], legend);
  const crawl = reachableSquares(map, { x: 0, y: 0 }, 25, () => null, { crawling: true });
  assertEqual([crawl.get(key({ x: 1, y: 0 })).cost, crawl.get(key({ x: 2, y: 0 })).cost], [15, 25]);
  assertTrue(!crawl.has(key({ x: 3, y: 0 })), 'three squares of crawling is more than 25 feet');
});

test('Grid: pass through an ally but not an enemy, and stop in nobody’s square', () => {
  const map = parseMap(['...'], legend);
  const ally = reachableSquares(map, { x: 0, y: 0 }, 10, (p) => (p.x === 1 ? 'ally' : null));
  assertTrue(ally.has(key({ x: 2, y: 0 })) && !ally.has(key({ x: 1, y: 0 })));
  const foe = reachableSquares(map, { x: 0, y: 0 }, 10, (p) => (p.x === 1 ? 'enemy' : null));
  assertTrue(!foe.has(key({ x: 2, y: 0 })));
});

// ---- Attack options and maths ----

test('Attacks: a Fighter attacks with every weapon in the pack, at the right bonus', () => {
  const options = heroAttackOptions(gameFor(wren));
  const names = options.map((o) => o.id);
  assertTrue(['greatsword-melee', 'flail-melee', 'javelin-melee', 'javelin-ranged', 'spear-ranged', 'shortbow-ranged'].every((id) => names.includes(id)), names.join(', '));
  const greatsword = options.find((o) => o.id === 'greatsword-melee');
  assertEqual(greatsword.modifiers.reduce((s, m) => s + m.value, 0), 5, 'Str +3, Proficiency +2');
  assertEqual([greatsword.damage.dice, greatsword.damage.bonus], ['2d6', 3]);
  assertEqual(options.find((o) => o.id === 'spear-melee').damage.dice, '1d8', 'a Versatile spear in two hands');
});

test('Attacks: a Shield rules out two-handed weapons; arrows are needed for a bow', () => {
  const game = gameFor({ ...wren, shield: true });
  const ids = heroAttackOptions(game).map((o) => o.id);
  assertTrue(!ids.includes('greatsword-melee') && !ids.includes('shortbow-ranged'));
  assertEqual(heroAttackOptions(game).find((o) => o.id === 'spear-melee').damage.dice, '1d6', 'one-handed with a Shield');
  const noArrows = gameFor(wren);
  noArrows.inventory = noArrows.inventory.filter((e) => e.id !== 'arrow');
  assertTrue(!heroAttackOptions(noArrows).some((o) => o.id === 'shortbow-ranged'));
});

test('Attacks: a Wizard has attack cantrips and Magic Missile while slots last', () => {
  const game = gameFor(juniper);
  const ids = heroAttackOptions(game).map((o) => o.id);
  assertTrue(['spell-fire-bolt', 'spell-ray-of-frost', 'spell-magic-missile'].every((id) => ids.includes(id)), ids.join(', '));
  const fireBolt = heroAttackOptions(game).find((o) => o.id === 'spell-fire-bolt');
  assertEqual([fireBolt.modifiers.reduce((s, m) => s + m.value, 0), fireBolt.damage.dice, fireBolt.range], [5, '1d10', [120, 120]]);
  game.slotsUsed = [2];
  assertTrue(!heroAttackOptions(game).some((o) => o.id === 'spell-magic-missile'), 'no slots, no Magic Missile');
  assertEqual(heroAttackOptions(gameFor({ ...juniper, level: 5, classChoices: { scholarSkill: 'arcana' } })).find((o) => o.id === 'spell-fire-bolt').damage.dice, '2d10', 'cantrips grow at level 5');
});

test('Attacks: the chance to hit counts a natural 1 as a miss and a 20 as a hit', () => {
  assertEqual(hitChance(5, 12), 0.7, 'need 7 or better');
  assertEqual(hitChance(0, 30), 0.05, 'only a 20');
  assertEqual(hitChance(20, 5), 0.95, 'all but a 1');
  assertEqual(Math.round(hitChance(5, 12, 'advantage') * 100), 91);
});

test('Damage: a Critical Hit doubles the dice; Great Weapon Fighting and Savage Attacker', () => {
  const crit = rollDamage(createRng('d'), { dice: '2d6', bonus: 3, type: 'slashing' }, { critical: true });
  assertEqual([crit.dice.length, crit.total], [4, crit.dice.reduce((s, v) => s + v, 0) + 3]);
  const gwf = rollDamage(createRng('gwf'), { dice: '20d6', bonus: 0, type: 'slashing' }, { greatWeapon: true });
  assertTrue(gwf.dice.every((d) => d >= 3), 'ones and twos count as threes');
  const savage = rollDamage(createRng('sav'), { dice: '1d8', bonus: 0, type: 'slashing' }, { savage: true });
  const sum = (l) => l.reduce((s, v) => s + v, 0);
  assertEqual(sum(savage.dice), Math.max(sum(savage.savaged.first), sum(savage.savaged.second)), 'keeps the better roll');
  const goblin = monsters.find((m) => m.id === 'goblin-warrior').attacks[0];
  const withAdvantage = rollDamage(createRng('adv'), { ...goblin.damage, extraOnAdvantage: goblin.advantageExtra }, { advantage: true });
  assertEqual(withAdvantage.extra.length, 1, 'the extra 1d4 with Advantage');
});

// ---- A fight ----

// Starts the mill fight with the hero going first (forced Initiative), for checks that need it.
function millFight(character = wren, seed = 'fight') {
  const game = gameFor(character, seed);
  forceNextD20(20);
  fight.startBattle(game, 'mill-scavengers', 0);
  return game;
}

test('Fight: everyone rolls Initiative and the order is set', () => {
  const game = millFight();
  const battle = game.battle;
  assertEqual(battle.order.length, 3);
  assertEqual(battle.order[0], 'hero', 'a natural 20 goes first');
  assertEqual(fight.enemies(battle).map((c) => c.name), ['Goblin Minion 1', 'Goblin Minion 2']);
  assertTrue(fight.isHeroTurn(game));
  assertTrue(battle.log.filter((e) => e.roll && e.roll.label === 'Initiative').length === 3, 'every roll is in the log');
});

test('Fight: the hero moves within their Speed, then attacks once per turn', () => {
  const game = millFight();
  const battle = game.battle;
  const hero = fight.heroCombatant(battle);
  const goblin = fight.enemies(battle)[0];
  // Bring the goblin next to the hero's path, so the test controls the distance.
  goblin.pos = { x: 3, y: 4 };
  fight.heroMove(game, { x: 4, y: 3 }); // (3, 3) is a barrel
  assertEqual([hero.pos, battle.turnState.movementLeft], [{ x: 4, y: 3 }, 20]);
  assertThrows(() => fight.heroMove(game, goblin.pos), 'nobody can stop in a foe’s square');
  assertThrows(() => fight.heroMove(game, { x: 0, y: 3 }), 'nor walk into a wall');
  goblin.hp = 1;
  forceNextD20(15);
  fight.heroAttack(game, 'greatsword-melee', goblin.id);
  assertEqual(goblin.hp, 0, 'a hit with a greatsword drops a 1 HP goblin');
  assertThrows(() => fight.heroAttack(game, 'greatsword-melee', fight.enemies(battle)[1].id), 'one action per turn');
});

test('Fight: leaving a foe’s reach provokes an Opportunity Attack, unless you Disengage', () => {
  const game = millFight();
  const battle = game.battle;
  const goblin = fight.enemies(battle)[0];
  goblin.pos = { x: 3, y: 2 }; // next to the hero at (3, 1)
  fight.heroMove(game, { x: 1, y: 2 });
  assertTrue(battle.log.some((e) => e.text.includes('an Opportunity Attack!')), 'the goblin lashes out');

  const careful = millFight(wren, 'careful');
  const nearby = fight.enemies(careful.battle)[0];
  nearby.pos = { x: 3, y: 2 };
  fight.heroDisengage(careful);
  fight.heroMove(careful, { x: 1, y: 2 });
  assertTrue(!careful.battle.log.some((e) => e.text.includes('an Opportunity Attack!')));
});

test('Fight: goblins close in and attack on their turn', () => {
  const game = millFight();
  fight.endHeroTurn(game);
  const battle = game.battle;
  const hero = fight.heroCombatant(battle);
  assertTrue(fight.isHeroTurn(game) || battle.outcome !== null, 'back to the hero');
  const adjacent = fight.enemies(battle).filter((c) => squaresBetween(c.pos, hero.pos) === 1);
  assertTrue(adjacent.length >= 1, 'the goblins reached the hero');
  assertTrue(battle.log.some((e) => e.roll && e.roll.kind === 'attack' && e.text.includes('Goblin Minion')), 'and attacked');
});

test('Fight: Second Wind and a Potion of Healing are Bonus Actions', () => {
  const game = millFight();
  game.hp = 3;
  game.inventory.push({ id: 'potion-of-healing', quantity: 1 });
  fight.heroSecondWind(game);
  assertTrue(game.hp > 3 && game.featureUses['second-wind'] === 1);
  assertThrows(() => fight.heroDrinkPotion(game), 'one Bonus Action per turn');
});

// A fight that starts with the hero already at 0 Hit Points, with scripted d20s: the hero's
// Initiative, the two goblins' (who go first), then each death save in turn. The goblins
// don't attack a fallen hero, so only death saves are rolled after Initiative.
function downedFight(deathSaves) {
  const game = gameFor(wren);
  game.hp = 0;
  game.rng = scriptedRng([2, 15, 15, ...deathSaves]);
  fight.startBattle(game, 'mill-scavengers', 0);
  return game;
}

test('Fight: at 0 Hit Points the hero makes death saves; a natural 20 brings them back', () => {
  const game = downedFight([20]);
  assertEqual([game.battle.heroState, game.hp, fight.isHeroTurn(game)], ['up', 1, true]);
  assertTrue(game.battle.log.some((e) => e.text.includes('rummages')), 'the goblins went for the flour instead');
});

test('Fight: three failed death saves (a natural 1 counts twice) end the fight in defeat', () => {
  const game = downedFight([1, 5]);
  assertEqual([game.battle.heroState, game.battle.outcome, game.battle.deathSaves.failures], ['dead', 'defeat', 3]);
});

test('Fight: three successful death saves leave the hero stable, which still loses the fight', () => {
  const game = downedFight([12, 14, 10]);
  assertEqual([game.battle.heroState, game.battle.outcome, game.battle.deathSaves.successes], ['stable', 'defeat', 3]);
});

test('Fight: winning gives the monsters’ XP once the player carries on', () => {
  const game = millFight();
  for (const goblin of fight.enemies(game.battle)) goblin.hp = 0;
  const goblin = fight.enemies(game.battle)[1];
  goblin.hp = 1;
  goblin.pos = { x: 4, y: 2 };
  forceNextD20(19);
  fight.heroAttack(game, 'greatsword-melee', goblin.id);
  assertEqual([game.battle.outcome, game.battle.xp], ['victory', 50]);
  const { outcome, choiceIndex } = fight.finishBattle(game);
  assertEqual([outcome, choiceIndex, game.xp, game.battle, game.lastBattle.outcome], ['victory', 0, 50, null, 'victory']);
});

// ---- Level 2 and 3 features ----

const wren2 = { ...wren, level: 2, hitPointRolls: [null] };
const champion = { ...wren, level: 3, subclassId: 'champion', hitPointRolls: [null, null] };
// Juniper at level 3, as an Evoker with Scorching Ray prepared.
const evoker = {
  ...juniper,
  level: 3,
  subclassId: 'evoker',
  classChoices: { scholarSkill: 'arcana' },
  hitPointRolls: [null, null],
  spells: {
    cantrips: juniper.spells.cantrips,
    spellbook: [...juniper.spells.spellbook, 'burning-hands', 'false-life', 'scorching-ray', 'shatter', 'misty-step', 'knock'],
    prepared: [...juniper.spells.prepared, 'burning-hands', 'scorching-ray'],
  },
};

test('Level 3 heroes for these checks are legal', () => {
  assertEqual([validateCharacter(champion), validateCharacter(evoker)], [[], []]);
});

test('Action Surge: one more action, once until a rest', () => {
  const game = millFight(wren2);
  const [first, second] = fight.enemies(game.battle);
  first.pos = { x: 2, y: 2 };
  second.pos = { x: 4, y: 2 };
  first.hp = 1;
  second.hp = 1;
  assertTrue(!fight.heroCanSurge(game), 'only once the action is used');
  forceNextD20(15);
  fight.heroAttack(game, 'greatsword-melee', first.id);
  assertTrue(fight.heroCanSurge(game));
  fight.heroActionSurge(game);
  assertEqual([game.battle.turnState.action, game.featureUses['action-surge']], [false, 1]);
  forceNextD20(15);
  fight.heroAttack(game, 'greatsword-melee', second.id);
  assertEqual([first.hp, second.hp, game.battle.outcome], [0, 0, 'victory']);
  assertThrows(() => fight.heroActionSurge(game), 'spent');
  assertTrue(!fight.heroCanSurge(millFight(wren)), 'level 1 Fighters don’t have it');
});

test('Improved Critical: a Champion’s natural 19 is a Critical Hit, then a free move', () => {
  assertEqual(hitChance(0, 30, 'normal', 19), 0.1, 'a 19 or a 20');
  const game = millFight(champion);
  const battle = game.battle;
  assertEqual(battle.log[0].roll.advantage, ['Remarkable Athlete'], 'Advantage on Initiative');
  const [first, second] = fight.enemies(battle);
  first.pos = { x: 3, y: 2 };
  second.pos = { x: 2, y: 2 };
  forceNextD20(19);
  fight.heroAttack(game, 'greatsword-melee', first.id);
  assertTrue(battle.log.some((e) => e.text.startsWith('Critical hit (Improved Critical)!')), 'logged as a Critical Hit');
  assertEqual(battle.turnState.athleteMove, 15, 'half of a 30-foot Speed');
  const free = [...fight.heroReachable(game).values()].filter((s) => s.free && s.cost > 0);
  assertTrue(free.length > 0 && free.every((s) => s.cost <= 15));
  // Step away from the goblin beside you: no Opportunity Attack, and no movement spent.
  fight.heroMove(game, { x: 5, y: 1 });
  assertTrue(!battle.log.some((e) => e.text.includes('an Opportunity Attack!')));
  assertEqual([battle.turnState.movementLeft, battle.turnState.athleteMove], [30, 0]);
});

test('Potent Cantrip: an Evoker’s missed Fire Bolt still deals half damage', () => {
  const game = millFight(evoker);
  const goblin = fight.enemies(game.battle)[0];
  goblin.hp = 20;
  forceNextD20(1);
  fight.heroAttack(game, 'spell-fire-bolt', goblin.id);
  const line = game.battle.log.find((e) => e.text.includes('Potent Cantrip'));
  assertTrue(Boolean(line), 'a miss, but half damage');
  const half = Number(/halved to (\d+)/.exec(line.text)[1]);
  assertEqual(goblin.hp, 20 - half);
  assertTrue(fight.attackPreview(game, 'spell-fire-bolt', goblin.id).describe.includes('Potent Cantrip'), 'and the preview says so');
});

test('Spell slots: Magic Missile from a level 2 slot fires four darts', () => {
  const game = millFight(evoker);
  const ids = heroAttackOptions(game).map((o) => o.id);
  assertTrue(ids.includes('spell-magic-missile') && ids.includes('spell-magic-missile-2'), ids.join(', '));
  game.slotsUsed = [4];
  const options = heroAttackOptions(game);
  assertTrue(!options.some((o) => o.id === 'spell-magic-missile'), 'no level 1 slots left');
  assertEqual(options.find((o) => o.id === 'spell-magic-missile-2').darts, 4);
  const goblin = fight.enemies(game.battle)[0];
  goblin.hp = 30;
  fight.heroAttack(game, 'spell-magic-missile-2', goblin.id);
  assertEqual(game.slotsUsed, [4, 1]);
  assertTrue(game.battle.log.some((e) => e.text.includes('4 glowing darts')));
});

test('Scorching Ray: an attack for each ray, moving on when the target falls', () => {
  const game = millFight(evoker);
  const [first, second] = fight.enemies(game.battle);
  first.hp = 1;
  // Each ray: a d20 of 15 (hits AC 12), then 2d6 of 3 and 3.
  game.rng = scriptedRng([15, 3, 3, 15, 3, 3, 15, 3, 3]);
  fight.heroAttack(game, 'spell-scorching-ray', first.id);
  const rays = game.battle.log.filter((e) => /^Ray \d hits/.test(e.text)).map((e) => e.text.split(':')[0]);
  assertEqual(rays, ['Ray 1 hits Goblin Minion 1', 'Ray 2 hits Goblin Minion 2', 'Ray 3 hits Goblin Minion 2']);
  assertEqual([first.hp, second.hp, game.slotsUsed[1], game.battle.outcome], [0, 0, 1, 'victory'], 'one level 2 slot spent');
});

// ---- The Wolf, Prone and Pack Tactics ----

// The quarry-road fight with the hero going first, the wolf moved next to them.
function wolfFight(character = wren, seed = 'wolf') {
  const game = gameFor(character, seed);
  forceNextD20(20);
  fight.startBattle(game, 'quarry-wolf', 0);
  const wolf = fight.enemies(game.battle)[0];
  wolf.pos = { x: 3, y: 7 }; // the hero starts at (3, 8)
  return { game, wolf };
}

test('Wolf: its Bite knocks a Medium hero Prone', () => {
  const { game, wolf } = wolfFight();
  assertEqual([wolf.name, wolf.hp, fight.findMonster('wolf').speed], ['Wolf', 11, 40]);
  forceNextD20(15); // the wolf's Bite: 15 + 4 = 19 hits AC 17
  fight.endHeroTurn(game);
  assertTrue(game.battle.log.some((e) => e.text === 'You are knocked Prone.'), 'knocked down');
  assertTrue(fight.isProne(game.battle, 'hero') && fight.isHeroTurn(game));
});

test('Prone: your attacks have Disadvantage; crawling costs double; standing costs half your Speed', () => {
  const { game, wolf } = wolfFight();
  game.battle.effects.push({ kind: 'prone', target: 'hero', endsOn: null });
  assertTrue(fight.attackPreview(game, 'greatsword-melee', wolf.id).disadvantage.includes('You are Prone'));
  assertEqual(fight.heroReachable(game).get(key({ x: 2, y: 8 })).cost, 10, 'one square of crawling');
  assertTrue(fight.heroCanStand(game));
  fight.heroStandUp(game);
  assertEqual([fight.isProne(game.battle, 'hero'), game.battle.turnState.movementLeft], [false, 15]);
  assertThrows(() => fight.heroStandUp(game), 'already standing');
  assertEqual(fight.attackPreview(game, 'greatsword-melee', wolf.id).disadvantage, []);
});

test('Prone: attacks from within 5 feet have Advantage, and from farther away Disadvantage', () => {
  const { game, wolf } = wolfFight();
  game.battle.effects.push({ kind: 'prone', target: wolf.id, endsOn: null });
  assertTrue(fight.attackPreview(game, 'greatsword-melee', wolf.id).advantage.includes('Wolf is Prone, within 5 feet'));
  wolf.pos = { x: 3, y: 4 };
  assertTrue(fight.attackPreview(game, 'shortbow-ranged', wolf.id).disadvantage.includes('Wolf is Prone, and more than 5 feet away'));
  // A Prone monster gets up at the start of its turn.
  fight.endHeroTurn(game);
  assertTrue(game.battle.log.some((e) => e.text === 'Wolf gets back on its feet.') && !fight.isProne(game.battle, wolf.id));
});

test('Pack Tactics: a wolf with an ally beside you attacks with Advantage', () => {
  const { game } = wolfFight();
  game.battle.combatants.push({ id: 'wolf-2', side: 'enemy', name: 'Wolf 2', monsterId: 'wolf', pos: { x: 4, y: 7 }, hp: 11, maxHp: 11 });
  fight.endHeroTurn(game);
  const bite = game.battle.log.find((e) => e.roll && e.roll.kind === 'attack');
  assertTrue(bite.roll.advantage.includes('Pack Tactics'), JSON.stringify(bite.roll.advantage));
});

test('Wolf: while the hero is down, it goes back to the dead goblin, and the fall leaves you Prone', () => {
  const game = gameFor(wren);
  game.hp = 0;
  // Initiative: the hero 2, the wolf 15. Then a natural 20 death save.
  game.rng = scriptedRng([2, 15, 20]);
  fight.startBattle(game, 'quarry-wolf', 0);
  assertTrue(game.battle.log.some((e) => e.text === 'Wolf goes back to tearing at the dead goblin.'));
  assertEqual([game.battle.heroState, game.hp], ['up', 1]);

  const hurt = wolfFight();
  hurt.game.hp = 1;
  forceNextD20(15);
  fight.endHeroTurn(hurt.game);
  assertTrue(hurt.game.battle.log.some((e) => e.text.startsWith('You drop to 0 Hit Points')));
  assertTrue(fight.isProne(hurt.game.battle, 'hero'), 'Unconscious includes Prone');
});

// ---- The story ----

async function storyGame(character, seed) {
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

// Plays from the gate to the goblins in the mill cellar.
async function toTheCellar(seed, character = wren) {
  const game = await storyGame(character, seed);
  pick(game, character.backgroundId === 'soldier' ? "Show her your old regiment's token" : 'Wait out the night');
  pick(game, "Go to the reeve's hall");
  pick(game, 'Take the job, and ask');
  pick(game, 'Tell her to go home');
  pick(game, 'Set out for Dunn');
  pick(game, 'Go down to the cellar');
  return game;
}

test('Story: the mill fight starts from a tagged choice, and winning carries the scene on', async () => {
  const game = await toTheCellar('mill-win');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:mill-scavengers'));
  assertTrue(Boolean(choice), 'the Fight choice is tagged');
  startFight(game, choice);
  assertTrue(game.battle !== null && game.battle.choiceIndex === choice.index);
  // Settle it quickly: both goblins fall.
  for (const goblin of fight.enemies(game.battle)) goblin.hp = 0;
  game.battle.outcome = 'victory';
  game.battle.xp = 50;
  const xpBefore = game.xp;
  const page = continueAfterBattle(game);
  assertTrue(game.flags.includes('mill_goblins_fought'), 'the scene knew it was won');
  assertEqual(game.xp, xpBefore + 50);
  assertTrue(page.beats.some((b) => b.type === 'note' && b.text.includes('Victory')));
});

test('Story: losing the mill fight is Fate’s Mercy: robbed, rested, and the story goes on', async () => {
  const game = await toTheCellar('mill-lose');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:mill-scavengers'));
  startFight(game, choice);
  game.hp = 0;
  game.battle.heroState = 'dead';
  game.battle.outcome = 'defeat';
  const day = game.day;
  continueAfterBattle(game);
  assertEqual([game.money, game.day, game.hp > 0], [0, day + 1, true], 'no purse, a new day, Hit Points back');
  assertTrue(game.journal.deeds.some((d) => d.text.includes('carried home by Lark')));
});

// Plays from the cellar, talking the goblins down, to the wolf on the quarry road.
async function toTheWolf(seed, character = wren) {
  const game = await toTheCellar(seed, character);
  forceNextD20(20);
  pick(game, "Tell them you're not here for them");
  return game;
}

test('Story: the quarry road meets a wolf; the goblins you talked down have gone ahead', async () => {
  const game = await toTheWolf('quarry-meet');
  assertTrue(game.page.beats.some((b) => b.type === 'text' && b.text.includes('to tell Mother Nettle')));
  const tags = game.story.currentChoices.map((c) => c.tags || []);
  assertTrue(tags.some((t) => t.includes('combat:quarry-wolf')), 'a Fight choice');
  assertTrue(tags.some((t) => t.includes('check:animal-handling:15')), 'an Animal Handling choice');
  assertTrue(!tags.some((t) => t.includes('spell:fire-bolt')), 'Wren can’t cast Fire Bolt');
});

test('Story: food gets you past the wolf for the same XP, then the body tells its tale', async () => {
  const game = await toTheWolf('quarry-food');
  const xp = game.xp;
  pick(game, 'Throw it some of your food'); // Wren's Dungeoneer's Pack has rations
  assertEqual([game.xp - xp, game.flags.includes('quarry_wolf_spared')], [50, true]);
  forceNextD20(20);
  pick(game, 'Look at its wounds');
  assertTrue(game.flags.includes('saw_dead_hands') && game.xp - xp === 75);
  pick(game, 'Go on to the quarry');
  assertEqual([game.story.currentChoices.length, currentLocation(game)], [0, 'Brackenhollow, the quarry mouth']);
  assertTrue(game.page.beats.some((b) => b.type === 'text' && b.text.includes('waves both arms')), 'the lookout expects you');
});

test('Story: bought rations are handed over and leave the pack', async () => {
  const game = await toTheCellar('quarry-rations', juniper);
  game.inventory.push({ id: 'rations', quantity: 1 }); // as if bought at the market
  forceNextD20(20);
  pick(game, "Tell them you're not here for them");
  // Juniper can also scare it with Fire Bolt or Minor Illusion.
  const tags = game.story.currentChoices.map((c) => (c.tags || []).join(' '));
  assertTrue(tags.includes('spell:fire-bolt') && tags.includes('spell:minor-illusion'));
  pick(game, 'Throw it some of your food');
  assertTrue(!game.inventory.some((e) => e.id === 'rations'), 'the rations are gone');
  assertTrue(game.page.beats.some((b) => b.type === 'note' && b.text === 'Gone from your pack: Rations.'));
});

test('Story: losing to the wolf is Fate’s Mercy: Odda Brasswick carts you home', async () => {
  const game = await toTheWolf('quarry-lose');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:quarry-wolf'));
  startFight(game, choice);
  game.hp = 0;
  game.battle.heroState = 'dead';
  game.battle.outcome = 'defeat';
  const day = game.day;
  continueAfterBattle(game);
  assertEqual([game.money, game.day, game.hp > 0], [0, day + 1, true]);
  assertTrue(game.flags.includes('met_odda') && game.journal.deeds.some((d) => d.text.includes('Odda Brasswick')));
  assertTrue(game.story.currentChoices.some((c) => c.text.startsWith('Look at its wounds')), 'the story goes on, at the body');
});

test('Story: a fight in progress is saved and reloaded exactly', async () => {
  const game = await toTheCellar('mill-save');
  const choice = game.story.currentChoices.find((c) => (c.tags || []).includes('combat:mill-scavengers'));
  startFight(game, choice);
  const record = JSON.parse(JSON.stringify(gameToSave(game)));
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  const reloaded = loadGame(runtime, record);
  assertEqual(reloaded.battle, JSON.parse(JSON.stringify(game.battle)));
  assertTrue(reloaded.story.currentChoices.some((c) => c.index === reloaded.battle.choiceIndex), 'the story waits at the same choice');
});

run(document.getElementById('summary'), document.getElementById('results'));

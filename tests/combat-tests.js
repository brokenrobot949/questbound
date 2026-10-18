// Combat checks. Open tests/combat.html through the local server to run them.
// Add checks here whenever combat rules change.

import { test, assertEqual, assertTrue, assertThrows, scriptedRng, run } from './harness.js';
import { createRng } from '../js/engine/rules/rng.js';
import { forceNextD20 } from '../js/engine/rules/dice.js';
import { isStandable, lineBlock, parseMap, reachableSquares, squaresBetween, key } from '../js/engine/combat/grid.js';
import { heroAttackOptions, hitChance, rollDamage } from '../js/engine/combat/attacks.js';
import * as fight from '../js/engine/combat/battle.js';
import { addItem, findItem, inventoryProblems, makeMagicWeapon, plainWeapons, startingInventory, wornItems } from '../js/engine/character/inventory.js';
import { freshResources } from '../js/engine/character/resources.js';
import { monsters } from '../data/srd/monsters.js';
import { quickStartHeroes } from '../data/campaign/quick-start.js';
import { loadStory } from '../js/engine/story/ink-loader.js';
import { bindExternals } from '../js/engine/story/externals.js';
import { continueAfterBattle, currentLocation, makeChoice, startFight, startPractice } from '../js/engine/story/story-runner.js';
import { fightRating } from '../js/engine/combat/difficulty.js';
import { gameToSave, loadGame, newGame } from '../js/engine/save/save-format.js';
import { validateCharacter } from '../js/engine/character/validate.js';
import { attackSummary, averageDamage } from '../js/engine/ui/attack-text.js';
import { attackToReroll, rerollAttack } from '../js/engine/rules/inspiration.js';
import { canResolve, resolveFight, resolveLimit } from '../js/engine/combat/resolve.js';
import { heal, heroMaxHp, longRestRecovery, maxHp } from '../js/engine/character/resources.js';
import { joinParty, memberMaxHp, memberOf, partyLongRest, setTactic } from '../js/engine/character/party.js';
import { armorClass } from '../js/engine/character/sheet.js';
import { encounters } from '../data/campaign/encounters.js';
import { freeCastKey } from '../js/engine/character/spells.js';

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

test('Grid: where a creature’s Speed is halved (Spirit Guardians), each step costs double', () => {
  const map = parseMap(['.....'], legend);
  const slowAt = (pos) => pos.x >= 2;
  const reach = reachableSquares(map, { x: 0, y: 0 }, 30, () => null, { slowAt });
  assertEqual([reach.get(key({ x: 1, y: 0 })).cost, reach.get(key({ x: 2, y: 0 })).cost, reach.get(key({ x: 3, y: 0 })).cost], [5, 15, 25]);
  assertTrue(!reach.has(key({ x: 4, y: 0 })), '35 feet is too far');
});

test('Grid: pass through an ally but not an enemy, and stop in nobody’s square', () => {
  const map = parseMap(['...'], legend);
  const ally = reachableSquares(map, { x: 0, y: 0 }, 10, (p) => (p.x === 1 ? 'ally' : null));
  assertTrue(ally.has(key({ x: 2, y: 0 })) && !ally.has(key({ x: 1, y: 0 })));
  const foe = reachableSquares(map, { x: 0, y: 0 }, 10, (p) => (p.x === 1 ? 'enemy' : null));
  assertTrue(!foe.has(key({ x: 2, y: 0 })));
});

test('Grid: walls block sight and attacks; obstacles block sight only; neighbours always see each other', () => {
  const map = parseMap(['.....', '..#..', '.....', '..o..', '.....'], { ...legend, o: { terrain: 'obstacle' } });
  assertEqual([lineBlock(map, { x: 0, y: 1 }, { x: 4, y: 1 }), lineBlock(map, { x: 0, y: 3 }, { x: 4, y: 3 }), lineBlock(map, { x: 0, y: 0 }, { x: 4, y: 0 })], ['wall', 'obstacle', null]);
  assertEqual(lineBlock(parseMap(['.#', '#.'], legend), { x: 0, y: 0 }, { x: 1, y: 1 }), null, 'diagonal neighbours, past a corner');
});

test('Grid: nobody can wade into deep water, but you can see and shoot across it', () => {
  const map = parseMap(['.~.', '.~.', '...'], { ...legend, '~': { terrain: 'water' } });
  assertTrue(!isStandable(map, { x: 1, y: 0 }) && isStandable(map, { x: 1, y: 2 }));
  assertEqual(lineBlock(map, { x: 0, y: 0 }, { x: 2, y: 0 }), null, 'water blocks neither sight nor attacks');
  const reach = reachableSquares(map, { x: 0, y: 0 }, 30);
  assertTrue(!reach.has(key({ x: 1, y: 0 })) && !reach.has(key({ x: 1, y: 1 })), 'nobody wades in');
  assertEqual(reach.get(key({ x: 2, y: 0 })).cost, 30, 'the long way round, by the bank');
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

test('Magic weapons: a Greatsword +1 adds 1 to its attack rolls and damage rolls, and keeps its Weapon Mastery', () => {
  const item = findItem('greatsword-plus-1');
  assertEqual([item.name, item.category, item.baseId, item.magicBonus, item.rarity, item.damage.dice, item.cost], ['Greatsword +1', 'weapon', 'greatsword', 1, 'uncommon', '2d6', null]);
  assertEqual([findItem('greatsword-plus-4'), findItem('banana-plus-1'), findItem('rope-plus-1')], [null, null, null], 'only +1 to +3, and only weapons');
  const game = gameFor(wren);
  const plain = heroAttackOptions(game).find((o) => o.id === 'greatsword-melee');
  assertEqual(makeMagicWeapon(game, 'greatsword').name, 'Greatsword +1');
  assertTrue(!game.inventory.some((e) => e.id === 'greatsword') && game.inventory.some((e) => e.id === 'greatsword-plus-1'));
  const magic = heroAttackOptions(game).find((o) => o.id === 'greatsword-plus-1-melee');
  const total = (o) => o.modifiers.reduce((s, m) => s + m.value, 0);
  assertEqual([total(magic) - total(plain), magic.damage.bonus - plain.damage.bonus, magic.damage.dice], [1, 1, '2d6']);
  assertEqual(magic.modifiers.find((m) => m.label === 'Magic').source, 'Greatsword +1 (a magic weapon)');
  assertEqual(magic.modifiers.find((m) => m.label === 'Proficiency').source, 'Proficient with Greatswords');
  assertEqual([magic.mastery && magic.mastery.id, magic.abilityMod], [plain.mastery && plain.mastery.id, plain.abilityMod], 'Wren’s mastery still works with it, and Graze still deals only her Strength');
  assertEqual(inventoryProblems(game.money, game.inventory), [], 'a save keeps it');
  assertTrue(plainWeapons(game).includes('flail') && !plainWeapons(game).some((id) => id.startsWith('greatsword')), plainWeapons(game).join(', '));
  // One of a stack: seven plain javelins and a Javelin +1.
  makeMagicWeapon(game, 'javelin');
  assertEqual([game.inventory.find((e) => e.id === 'javelin').quantity, game.inventory.find((e) => e.id === 'javelin-plus-1').quantity], [7, 1]);
  assertThrows(() => makeMagicWeapon(game, 'greatsword-plus-1'), 'already magic');
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

// ---- Weapon Mastery and the Light property ----

// Wren with kit B (a Scimitar, a Shortsword and a Longbow) and Two-Weapon Fighting, with
// Weapon Mastery of all three: Nick, Vex and Slow.
const duelist = {
  ...wren,
  startingEquipment: { class: 'B', background: 'A' },
  armorId: 'studded-leather-armor',
  classChoices: { fightingStyle: 'two-weapon-fighting', weaponMasteries: ['scimitar', 'shortsword', 'longbow'] },
};

// The mill fight with one goblin beside the hero (at 3, 1), tough enough to take a few hits,
// and the other one out of it.
function duel(character) {
  const game = millFight(character);
  const [goblin, other] = fight.enemies(game.battle);
  goblin.pos = { x: 3, y: 2 };
  goblin.hp = goblin.maxHp = 30;
  other.hp = 0;
  return { game, goblin };
}

const lastAttackRoll = (game) => game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack').pop().roll;

test('Weapon Mastery: Vex gives Advantage on the next attack; Nick makes the Light extra attack part of the Attack action', () => {
  assertEqual(validateCharacter(duelist), []);
  const { game, goblin } = duel(duelist);
  assertTrue(!heroAttackOptions(game).some((o) => o.extra), 'no extra attack before a Light weapon is used');
  forceNextD20(18);
  fight.heroAttack(game, 'shortsword-melee', goblin.id);
  assertTrue(fight.conditionsOf(game.battle, goblin.id).includes('vexed'), 'a Shortsword hit vexes');
  const extra = heroAttackOptions(game).find((o) => o.id === 'scimitar-melee-extra');
  assertEqual([extra.nick, extra.bonusAction, extra.damage.bonus], [true, false, 3], 'Nick; Two-Weapon Fighting adds Str to the damage');
  assertEqual(fight.attackPreview(game, extra.id, goblin.id).advantage, ['Vex: your Shortsword hit it']);
  fight.heroAttack(game, extra.id, goblin.id);
  assertEqual(lastAttackRoll(game).mode, 'advantage');
  assertTrue(!fight.conditionsOf(game.battle, goblin.id).includes('vexed'), 'the Advantage is used up');
  assertEqual([game.battle.turnState.bonus, heroAttackOptions(game).some((o) => o.extra)], [false, false], 'the Bonus Action is still free, and the extra attack comes once a turn');
});

test('Light: without Nick the extra attack is a Bonus Action, with no ability modifier on its damage', () => {
  const plain = { ...duelist, classChoices: { fightingStyle: 'defense', weaponMasteries: ['shortsword', 'longbow', 'spear'] } };
  assertEqual(validateCharacter(plain), []);
  const { game, goblin } = duel(plain);
  forceNextD20(18);
  fight.heroAttack(game, 'scimitar-melee', goblin.id);
  const extra = heroAttackOptions(game).find((o) => o.id === 'shortsword-melee-extra');
  assertEqual([extra.nick, extra.bonusAction, extra.damage.bonus, extra.mastery.id], [false, true, 0, 'vex']);
  fight.heroAttack(game, extra.id, goblin.id);
  assertTrue(game.battle.turnState.bonus, 'it took the Bonus Action');
  const shielded = duel({ ...plain, shield: true }).game;
  fight.heroAttack(shielded, 'scimitar-melee', fight.enemies(shielded.battle)[0].id);
  assertTrue(!heroAttackOptions(shielded).some((o) => o.extra), 'a Shield leaves no hand for a second weapon');
});

test('Weapon Mastery: Sap gives the foe Disadvantage on its next attack; Slow cuts its Speed', () => {
  const { game, goblin } = duel(wren);
  forceNextD20(18);
  fight.heroAttack(game, 'flail-melee', goblin.id);
  assertTrue(fight.conditionsOf(game.battle, goblin.id).includes('sapped'));
  fight.endHeroTurn(game);
  const attack = game.battle.log.find((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Goblin Minion 1'));
  assertTrue(attack.roll.disadvantage.includes('Goblin Minion 1 is Sapped'), JSON.stringify(attack.roll.disadvantage));
  assertTrue(!fight.conditionsOf(game.battle, goblin.id).includes('sapped'), 'used up');

  const thrown = duel(wren);
  thrown.goblin.pos = { x: 3, y: 5 };
  forceNextD20(18);
  fight.heroAttack(thrown.game, 'javelin-ranged', thrown.goblin.id);
  assertTrue(fight.conditionsOf(thrown.game.battle, thrown.goblin.id).includes('slowed'), 'a Javelin hit slows');
});

test('Weapon Mastery: Topple knocks a foe Prone on a failed save; Graze hurts even on a miss', () => {
  const toppler = { ...wren, classChoices: { fightingStyle: 'defense', weaponMasteries: ['greatsword', 'quarterstaff', 'javelin'] } };
  const { game, goblin } = duel(toppler);
  game.inventory.push({ id: 'quarterstaff', quantity: 1 });
  assertEqual(heroAttackOptions(game).find((o) => o.id === 'quarterstaff-melee').mastery.dc, 13, '8 + Str 3 + Proficiency 2');
  game.rng = scriptedRng([18, 4, 5, 2]); // the attack, the damage (twice: Savage Attacker), the save
  fight.heroAttack(game, 'quarterstaff-melee', goblin.id);
  assertTrue(fight.isProne(game.battle, goblin.id), 'a 2 on the Constitution save');

  const grazed = duel(wren);
  forceNextD20(2);
  fight.heroAttack(grazed.game, 'greatsword-melee', grazed.goblin.id);
  assertEqual(grazed.goblin.hp, 27, 'a miss, but Graze deals the Str +3');
});

// ---- Hiding ----

// The mill fight with the hero (at 3, 2) behind the barrel (at 3, 3) from one goblin (at 3, 6),
// and the other goblin out of it.
function behindTheBarrel(character = wren) {
  const { game, goblin } = duel(character);
  goblin.pos = { x: 3, y: 6 };
  fight.heroCombatant(game.battle).pos = { x: 3, y: 2 };
  return { game, goblin };
}

test('Hide: only out of every foe’s sight; noisy armour gives Disadvantage on the Stealth check', () => {
  const { game, goblin } = duel(wren);
  goblin.pos = { x: 5, y: 6 }; // a clear view of the hero at (3, 1)
  assertEqual(fight.heroHideProblem(game), 'Goblin Minion 1 can see you. Get a wall or an obstacle between you first.');
  const hiding = behindTheBarrel().game;
  assertEqual([fight.heroHideProblem(hiding), fight.foesWatching(hiding).length], [null, 0]);
  assertThrows(() => fight.heroHide(hiding, { bonus: true }), 'a Bonus Action Hide is a Rogue’s Cunning Action');
  forceNextD20(18);
  fight.heroHide(hiding);
  const roll = hiding.battle.log[hiding.battle.log.length - 1].roll;
  assertEqual([roll.disadvantage, roll.total, roll.success], [['Chain Mail: noisy to sneak in'], 19, true]);
  assertTrue(fight.conditionsOf(hiding.battle, 'hero').includes('hidden'));
});

test('Hide: foes search instead of attacking; the hero’s attack has Advantage, then gives them away', () => {
  const { game, goblin } = behindTheBarrel();
  forceNextD20(18);
  fight.heroHide(game); // Stealth 19
  forceNextD20(2); // the goblin's Search: 2 − 1 Perception
  fight.endHeroTurn(game);
  const log = game.battle.log.map((e) => e.text);
  assertTrue(log.some((t) => t.includes('searches, but can’t find you')) && !game.battle.log.some((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Goblin')), log.slice(-4).join(' / '));
  assertTrue(fight.isHeroTurn(game) && fight.conditionsOf(game.battle, 'hero').includes('hidden'), 'still hidden');
  assertTrue(fight.attackPreview(game, 'javelin-ranged', goblin.id).advantage.includes('You’re hidden'));
  fight.heroAttack(game, 'javelin-ranged', goblin.id);
  assertTrue(!fight.conditionsOf(game.battle, 'hero').includes('hidden') && game.battle.log.some((e) => e.text === 'You’re no longer hidden: you attack.'));

  const found = behindTheBarrel().game;
  forceNextD20(18);
  fight.heroHide(found);
  forceNextD20(20); // 20 − 1 = 19 finds Stealth 19
  fight.endHeroTurn(found);
  assertTrue(found.battle.log.some((e) => e.text.includes('spots you')) && !fight.conditionsOf(found.battle, 'hero').includes('hidden'));
});

// ---- Companions ----

// Scripted d20 faces first, then the seeded dice: for setting up a fight exactly.
function scriptedThen(faces, seed) {
  const queue = [...faces];
  const rest = createRng(seed);
  return { nextInt: (n) => (queue.length ? queue.shift() - 1 : rest.nextInt(n)), getState: () => rest.getState() };
}

// Wren with Odda and Fen in the mill fight. Initiative is rolled in the order the combatants
// are listed (Wren, the two goblins, then Odda and Fen); by default Wren goes first, then
// Odda, then Fen, then the goblins. after: d20 faces scripted after Initiative.
function partyFight({ character = wren, initiative = [20, 1, 1, 19, 10], after = [], seed = 'party', setUp = () => {} } = {}) {
  const game = { ...gameFor(character, seed), party: [] };
  joinParty(game, 'odda');
  joinParty(game, 'fen');
  setUp(game);
  game.rng = scriptedThen([...initiative, ...after], seed);
  fight.startBattle(game, 'mill-scavengers', 0);
  return game;
}

const said = (game, text) => game.battle.log.some((e) => e.text.includes(text));

test('Companions: they start beside the hero, roll Initiative, and take their own turns', () => {
  const game = partyFight();
  const battle = game.battle;
  assertEqual(battle.order, ['hero', 'odda', 'fen', 'goblin-minion-1', 'goblin-minion-2']);
  const [odda, fen] = fight.companionCombatants(battle);
  assertEqual([odda.name, odda.pos, fen.name, fen.pos], ['Odda', { x: 2, y: 1 }, 'Fen', { x: 4, y: 1 }]);
  assertTrue(fight.isHeroTurn(game));
  fight.endHeroTurn(game);
  assertTrue(said(game, "Odda's turn.") && said(game, "Fen's turn.") && said(game, "Goblin Minion 2's turn."));
  assertTrue(game.battle.log.some((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Fen ')) || said(game, 'Fen moves'), 'Fen goes after the goblins');
});

test('Companions: foes go after the nearest of the party; Fen gets Sneak Attack with the hero beside the foe', () => {
  const game = partyFight();
  const [goblin, other] = fight.enemies(game.battle);
  other.hp = 0;
  goblin.hp = goblin.maxHp = 40;
  goblin.pos = { x: 5, y: 1 }; // beside Fen (4, 1), two squares from the hero
  assertEqual(fight.attackPreview(game, 'shortsword-melee', goblin.id, 'fen').sneak, null, 'nobody else beside it');
  goblin.pos = { x: 4, y: 2 }; // beside the hero (3, 1) and Fen
  const preview = fight.attackPreview(game, 'shortsword-melee', goblin.id, 'fen');
  assertEqual([preview.sneak, preview.mode], ['1d6', 'normal'], 'an ally beside the target is enough');
  goblin.pos = { x: 5, y: 1 };
  fight.endHeroTurn(game);
  const swing = game.battle.log.find((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Goblin Minion 1'));
  assertTrue(swing && swing.text.includes('Fen'), swing ? swing.text : 'no goblin attack');
});

test('Companions: with the hero down, Odda heals them back up and the fight goes on', () => {
  // Wren starts at 0 Hit Points; her death save is a 10.
  const game = partyFight({ after: [10], setUp: (g) => (g.hp = 0) });
  assertTrue(said(game, 'Odda casts Healing Word on you'), game.battle.log.map((e) => e.text).join(' / '));
  assertEqual([game.battle.heroState, game.hp > 0, fight.isHeroTurn(game) || Boolean(game.battle.outcome)], ['up', true, true]);
});

test('Companions: with no healing left, Odda stabilises a fallen Fen with Spare the Dying', () => {
  const game = partyFight({
    setUp: (g) => {
      memberOf(g, 'odda').slotsUsed = [2];
      memberOf(g, 'odda').featureUses[freeCastKey('healing-word')] = 1;
      memberOf(g, 'fen').hp = 0;
    },
  });
  const fen = fight.combatantById(game.battle, 'fen');
  assertEqual(fen.state, 'down');
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Odda casts Spare the Dying: Fen stops bleeding'));
  assertEqual(fen.state, 'stable');
});

test('Companions: the fight is lost only once nobody is left standing; a win patches the fallen up', () => {
  // Everyone starts at 0: Wren saves 10, 10, 10 while Odda and Fen roll 5s.
  const lost = partyFight({ after: [10, 5, 5, 10, 5, 5, 10], setUp: (g) => { g.hp = 0; for (const m of g.party) m.hp = 0; } });
  assertEqual([lost.battle.heroState, lost.battle.outcome, fight.combatantById(lost.battle, 'odda').state], ['stable', 'defeat', 'down']);

  const won = partyFight({ setUp: (g) => (memberOf(g, 'fen').hp = 0) });
  for (const goblin of fight.enemies(won.battle)) goblin.hp = 0;
  const last = fight.enemies(won.battle)[0];
  last.hp = 1;
  last.pos = { x: 3, y: 2 };
  forceNextD20(19);
  fight.heroAttack(won, 'greatsword-melee', last.id);
  assertEqual([won.battle.outcome, memberOf(won, 'fen').hp, fight.combatantById(won.battle, 'fen').state], ['victory', 1, 'up']);
  assertTrue(said(won, 'Fen comes to with 1 Hit Point.'));
});

test('Companions: tactics; Hold never moves, and Defensive stays within 10 feet of the hero', () => {
  const game = partyFight({ setUp: (g) => { setTactic(g, 'fen', 'hold'); setTactic(g, 'odda', 'defensive'); } });
  const fen = fight.combatantById(game.battle, 'fen');
  const odda = fight.combatantById(game.battle, 'odda');
  const fenAt = { ...fen.pos };
  fight.endHeroTurn(game);
  assertEqual(fen.pos, fenAt, 'Hold');
  assertTrue(squaresBetween(odda.pos, fight.heroCombatant(game.battle).pos) <= 2, 'Defensive');
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

// ---- Stirges (Too Many Cats) ----

// The hayloft fight, with the nest smoked (two Stirges) and the hero going first: Stirge 1 moved
// beside the hero (on the hatch at (3, 7)), Stirge 2 out of the fight unless kept (keepSecond).
// Initiative is rolled hero first, then the Stirges in order: 20, 1, 1.
function stirgeFight({ character = wren, seed = 'stirge', keepSecond = false, flags = ['smoked_the_nest'] } = {}) {
  const game = { ...gameFor(character, seed), flags: [...flags] };
  game.rng = scriptedThen([20, 1, 1], seed);
  fight.startBattle(game, 'loft-stirges', 0);
  const [first, second] = fight.enemies(game.battle);
  first.pos = { x: 3, y: 6 };
  if (!keepSecond) second.hp = 0;
  return { game, first, second };
}

const isAdjacentTo = (a, b) => squaresBetween(a.pos, b.pos) === 1;

// Ends the hero's turn with Stirge 1's Proboscis hitting (a 15: 20 against Wren's AC).
function stirgeClings(game) {
  game.rng = scriptedThen([15], 'cling');
  fight.endHeroTurn(game);
}

test('Stirge: a Tiny flyer worth 25 XP, it flies 40 feet to reach you', () => {
  const stirge = fight.findMonster('stirge');
  assertEqual([stirge.size, stirge.speed, stirge.fly, stirge.xp, stirge.hp.average], ['tiny', 10, 40, 25, 5]);
  const { game, second } = stirgeFight({ keepSecond: true });
  second.pos = { x: 6, y: 2 }; // 25 feet away: too far to walk at 10 feet, not to fly
  const first = fight.enemies(game.battle)[0];
  first.pos = { x: 1, y: 2 };
  fight.endHeroTurn(game);
  const hero = fight.heroCombatant(game.battle);
  assertTrue(isAdjacentTo(second, hero) && isAdjacentTo(first, hero), JSON.stringify([first.pos, second.pos]));
});

test('Stirge: a hit clings on; it drinks 2d4 necrotic as each of its turns begins, and strikes no more', () => {
  const { game, first } = stirgeFight();
  stirgeClings(game);
  assertTrue(game.battle.log.some((e) => e.text === 'Stirge 1 clings on to you, and starts to drink!'), 'it clings on');
  assertEqual(fight.clingingTo(game.battle, first), fight.heroCombatant(game.battle));
  assertEqual(fight.battleScene(game).units.find((u) => u.id === first.id).clinging, 'hero');
  const hp = game.hp;
  const lines = game.battle.log.length;
  fight.endHeroTurn(game);
  const turn = game.battle.log.slice(lines);
  const drink = turn.find((e) => e.text.startsWith('Stirge 1 drinks from you: 2d4 ('));
  assertTrue(Boolean(drink), turn.map((e) => e.text).join(' | '));
  const drunk = Number(drink.text.match(/= (\d+) necrotic/)[1]);
  assertTrue(drunk >= 2 && drunk <= 8 && game.hp === hp - drunk, `${hp} → ${game.hp}`);
  assertTrue(!turn.some((e) => e.roll && e.roll.kind === 'attack'), 'no Proboscis attack while it clings');
});

test('Stirge: it goes along when you walk, and makes no Opportunity Attack as you go', () => {
  const { game, first } = stirgeFight();
  stirgeClings(game);
  const lines = game.battle.log.length;
  fight.heroMove(game, { x: 5, y: 7 });
  assertTrue(!game.battle.log.slice(lines).some((e) => e.text.includes('Opportunity Attack')), 'nothing to dodge');
  assertTrue(isAdjacentTo(first, fight.heroCombatant(game.battle)), `it came along, to ${JSON.stringify(first.pos)}`);
  assertEqual(fight.clingingTo(game.battle, first), fight.heroCombatant(game.battle));
});

test('Stirge: pull it off with your action; kill it, and it lets go', () => {
  const { game, first } = stirgeFight();
  stirgeClings(game);
  assertEqual(fight.pullOffTargets(game).map(({ foe, host }) => [foe.id, host.id]), [[first.id, 'hero']]);
  fight.heroPullOff(game, first.id);
  assertTrue(game.battle.turnState.action && fight.clingingTo(game.battle, first) === null);
  assertTrue(game.battle.log.some((e) => e.text === 'You tear Stirge 1 off yourself.'));
  assertThrows(() => fight.heroPullOff(game, first.id), 'nothing clinging any more');

  const killed = stirgeFight({ seed: 'stirge-kill' });
  stirgeClings(killed.game);
  forceNextD20(19); // a hit; the greatsword's 2d6 + 3 is always 5 or more
  fight.heroAttack(killed.game, 'greatsword-melee', killed.first.id);
  assertEqual(killed.first.hp, 0);
  assertTrue(!killed.game.battle.effects.some((e) => e.kind === 'attached'), 'a fallen Stirge lets go');
});

test('Stirge: it lets go of someone who falls, rather than drink from the dying', () => {
  const { game, first } = stirgeFight({ seed: 'stirge-falls' });
  stirgeClings(game);
  game.hp = 1;
  // Its next drink (2d4: 1 and 1) drops the hero; then three death saves of 10 (Stable).
  game.rng = scriptedThen([1, 1, 10, 10, 10], 'stirge-falls');
  fight.endHeroTurn(game);
  const text = game.battle.log.map((e) => e.text);
  assertTrue(text.filter((t) => t.startsWith('Stirge 1 drinks from you')).length === 1, 'one drink, then no more');
  assertTrue(text.includes('Stirge 1 lets go of you, and flutters off.'), text.slice(-12).join(' | '));
  assertEqual(fight.clingingTo(game.battle, first), null);
});

test('Stirge: companions go for a Stirge clinging to one of the party before one that isn’t', () => {
  const game = { ...gameFor(wren, 'stirge-party'), party: [], flags: ['smoked_the_nest'] };
  joinParty(game, 'fen');
  // Initiative, rolled Wren, the two Stirges, then Fen: Wren goes first, then Fen (1 + his
  // Dexterity beats the Stirges' 1 + 3).
  game.rng = scriptedThen([20, 1, 1, 1], 'stirge-party');
  fight.startBattle(game, 'loft-stirges', 0);
  assertEqual(game.battle.order.slice(0, 2), ['hero', 'fen']);
  const [first, second] = fight.enemies(game.battle);
  // Both Stirges beside Wren and Fen, so they're as easy to hurt; Stirge 2 clings to Wren.
  fight.combatantById(game.battle, 'fen').pos = { x: 4, y: 6 };
  first.pos = { x: 3, y: 6 };
  second.pos = { x: 4, y: 7 };
  game.battle.effects.push({ kind: 'attached', target: 'hero', by: second.id, dice: '2d4', damageType: 'necrotic' });
  const lines = game.battle.log.length;
  fight.endHeroTurn(game);
  const fens = game.battle.log.slice(lines).filter((e) => e.text.startsWith('Fen ') && e.roll && e.roll.kind === 'attack');
  assertTrue(fens.length > 0 && fens[0].text.includes('Stirge 2'), game.battle.log.slice(lines).map((e) => e.text).join(' | '));
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
  assertEqual(currentLocation(game), 'Brackenhollow warren, the passage', 'on into the warren');
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

// ---- Playing turns back on screen ----

test('Replay: each turn is announced, and every line remembers the scene just after it', () => {
  const game = millFight();
  fight.endHeroTurn(game);
  const log = game.battle.log;
  assertTrue(log.every((entry) => fight.replayOf(entry)), 'every line written this visit can be played back');
  const turns = log.filter((entry) => entry.turnOf).map((entry) => entry.text);
  assertTrue(turns.includes("Goblin Minion 1's turn.") && turns[turns.length - 1] === 'Your turn.', turns.join(' / '));
  assertEqual(fight.replayOf(log[log.length - 1]).scene, fight.battleScene(game), 'the last line shows the fight as it stands');
  assertTrue(!JSON.stringify(game.battle).includes('"scene"'), 'the replay isn’t part of the saved fight');
});

test('Replay: a walk goes square by square, and an Opportunity Attack breaks it in two', () => {
  const game = millFight();
  const battle = game.battle;
  const hero = fight.heroCombatant(battle);
  const start = { ...hero.pos };
  fight.enemies(battle)[0].pos = { x: 3, y: 2 }; // next to the hero at (3, 1)
  fight.heroMove(game, { x: 1, y: 2 });
  const attack = battle.log.find((entry) => entry.text.includes('an Opportunity Attack!'));
  const before = fight.replayOf(attack).moves;
  assertEqual([before.length, before[0].id, before[0].from, before[0].path.length], [1, 'hero', start, 1], 'one step, then the goblin lashes out');
  const after = fight.replayOf(battle.log.find((entry) => entry.text === 'You move.')).moves;
  assertEqual([after[0].from, after[0].path], [before[0].path[0], [{ x: 1, y: 2 }]], 'then the rest of the walk');
});

test('Replay: damage shows on the line that deals it', () => {
  const game = millFight();
  const goblin = fight.enemies(game.battle)[0];
  goblin.pos = { x: 3, y: 2 };
  goblin.hp = 30; // so it doesn't fall, and no later line shows the damage instead
  forceNextD20(15);
  fight.heroAttack(game, 'greatsword-melee', goblin.id);
  const hit = game.battle.log.find((entry) => entry.text.includes('hit Goblin Minion 1 with Greatsword'));
  assertEqual(fight.replayOf(hit).scene.units.find((u) => u.id === goblin.id).hp, goblin.hp);
  assertTrue(goblin.hp < 30);
});

test('Action buttons say what an attack does: to hit, damage, the average, and reach', () => {
  const wrenOptions = heroAttackOptions(millFight());
  assertEqual(attackSummary(wrenOptions.find((o) => o.id === 'greatsword-melee')), ['+5 to hit', '2d6 + 3 slashing', '10 on average', 'melee', 'Graze: a miss still deals 3 damage']);
  assertEqual(attackSummary(wrenOptions.find((o) => o.id === 'spear-ranged')), ['+5 to hit', '1d6 + 3 piercing', '6.5 on average', 'thrown 20/60 ft'], 'no mastery for the spear');
  const evokerGame = millFight(evoker);
  const options = heroAttackOptions(evokerGame);
  const missile = attackSummary(options.find((o) => o.id === 'spell-magic-missile'), { slotsLeft: () => 4 });
  assertEqual(missile, ['3 darts that never miss', '1d4 + 1 force each', '10.5 on average', 'range 120 ft', 'uses a level 1 slot (4 left)']);
  assertTrue(attackSummary(options.find((o) => o.id === 'spell-fire-bolt')).includes('half damage even on a miss'), 'Potent Cantrip');
  assertEqual(averageDamage({ dice: '2d6', bonus: 3 }, { greatWeapon: true }), 11, 'Great Weapon Fighting counts 1s and 2s as 3s');
});

// ---- Quick Resolve ----

test('Resolve: offered only for a fight well under the hero’s strength, and never for a story fight', () => {
  assertEqual([resolveLimit(1), resolveLimit(2), resolveLimit(3)], [25, 50, 75], 'half the Low budget');
  assertTrue(!canResolve(millFight(wren)), 'two Goblin Minions (50 XP) are a real fight at level 1');
  assertTrue(canResolve(millFight(champion)), 'at level 3 they’re well under');
  const hurt = millFight(champion);
  hurt.hp = Math.floor(maxHp(champion) / 2) - 1;
  assertTrue(!canResolve(hurt), 'not below half your Hit Points');
  const duel = gameFor(champion);
  forceNextD20(20);
  fight.startBattle(duel, 'nettle-duel', 0);
  assertTrue(fight.isHeroTurn(duel) && !canResolve(duel), 'Mother Nettle is always fought by hand');
});

// ---- Fights sized for the party (SRD 5.2.1, "Combat Encounters") ----

const withParty = (character, ids) => {
  const game = { ...gameFor(character), party: [] };
  for (const id of ids) joinParty(game, id);
  return game;
};
const wren3 = champion;

test('Fight cards: how hard a fight is counts the companions with you, at your level now', () => {
  const rate = (game, id) => fightRating(game, id).rating;
  assertEqual([rate(withParty(wren2, []), 'nettle-duel'), rate(withParty(wren2, ['odda', 'fen']), 'nettle-duel')], ['High', 'Low'], 'Nettle (200 XP) for one level 2 hero, then for three');
  assertEqual([rate(withParty(wren2, []), 'lower-dead'), rate(withParty(wren2, ['odda']), 'lower-dead')], ['Moderate', 'Low'], 'three Zombies (150 XP)');
  assertEqual([rate(withParty(wren3, []), 'ossuary-ghouls'), rate(withParty(wren3, ['odda']), 'ossuary-ghouls')], ['High', 'Moderate'], 'two Ghouls (400 XP) at level 3');
  const fallen = withParty(wren2, ['odda', 'fen']);
  memberOf(fallen, 'fen').fallen = true;
  assertEqual(fightRating(fallen, 'nettle-duel').size, 2, 'a fallen companion doesn’t fight');
  assertEqual(fightRating(fallen, 'nettle-duel').budget, { low: 200, moderate: 300, high: 400 });
});

test('Resolve: with companions the limit is half the party’s Low budget, and anyone below half stops it', () => {
  assertEqual([resolveLimit(2, 1), resolveLimit(2, 3)], [50, 150]);
  const start = (ids, setUp = () => {}) => {
    const game = withParty(wren2, ids);
    setUp(game);
    game.rng = scriptedThen([20, 1, 1, 1, 1, 1], 'resolve-dead');
    fight.startBattle(game, 'lower-dead', 0);
    return game;
  };
  assertTrue(!canResolve(start([])), 'three Zombies (150 XP) are a real fight for one level 2 hero');
  assertTrue(canResolve(start(['odda', 'fen'])), 'but well under for three');
  assertTrue(!canResolve(start(['odda', 'fen'], (g) => (memberOf(g, 'fen').hp = 3))), 'not while Fen is below half his Hit Points');
});

test('Resolve: companions fight their own turns, and the report says what each of you lost', () => {
  const game = withParty(wren3, ['odda', 'fen']);
  game.rng = scriptedThen([20, 1, 1, 1, 1], 'resolve-party');
  fight.startBattle(game, 'mill-scavengers', 0);
  assertTrue(canResolve(game));
  const result = resolveFight(game);
  assertEqual([result.outcome, result.losses.map((l) => l.id)], ['victory', ['hero', 'odda', 'fen']], game.battle.log.map((e) => e.text).join(' / '));
  const report = game.battle.log.find((e) => e.text.startsWith('Resolved in')).text;
  assertTrue(/: (nobody lost a Hit Point|.* lost \d+)/.test(report), report);
  assertTrue(game.battle.log.some((e) => e.text.startsWith("Odda's turn.") || e.text.startsWith("Fen's turn.")), 'they took their turns');
});

test('Practice fight (debug): any fight from wherever the story is; afterwards everyone is back as they were', async () => {
  const game = await storyGame(wren, 'practice');
  joinParty(game, 'odda');
  const choices = game.story.currentChoices.map((c) => c.text);
  const before = { hp: game.hp, xp: game.xp, odda: memberOf(game, 'odda').hp, slots: structuredClone(memberOf(game, 'odda').slotsUsed) };
  startPractice(game, 'ossuary-ghouls');
  assertEqual([game.battle.choiceIndex, Boolean(game.battle.practice)], [null, true]);
  // Saved and reloaded mid-fight, it's still a practice fight.
  const record = JSON.parse(JSON.stringify(gameToSave(game)));
  const story = await loadStory(new URL('../story/', import.meta.url));
  const runtime = { story, game: null };
  bindExternals(story, runtime);
  const reloaded = loadGame(runtime, record);
  assertTrue(fight.battleOk(reloaded.battle) && Boolean(reloaded.battle.practice));
  // A beating, then the end of it.
  game.hp = 1;
  memberOf(game, 'odda').hp = 0;
  memberOf(game, 'odda').slotsUsed = [2];
  game.battle.outcome = 'defeat';
  const page = continueAfterBattle(game);
  assertEqual([game.battle, game.hp, game.xp, memberOf(game, 'odda').hp, memberOf(game, 'odda').slotsUsed], [null, before.hp, before.xp, before.odda, before.slots]);
  assertEqual(game.story.currentChoices.map((c) => c.text), choices, 'the story is where it was');
  assertTrue(page.beats.some((b) => b.type === 'note' && b.text.startsWith('Practice fight lost')));
});

test('Resolve: plays the fight out with real rolls, spending nothing, and says how it went', () => {
  const game = millFight(champion, 'resolve');
  const { outcome, stopped, rounds } = resolveFight(game);
  assertEqual([outcome, stopped], ['victory', false], game.battle.log.map((e) => e.text).join(' / '));
  assertTrue(rounds >= 1 && game.battle.log.some((e) => e.text.startsWith('Resolved in')));
  assertEqual([game.featureUses, game.slotsUsed], [{}, []], 'no Second Wind, no Action Surge');
});

test('Resolve: stops and hands the fight back once the hero is below half their Hit Points', () => {
  const game = millFight(champion, 'tough');
  game.hp = Math.ceil(maxHp(champion) / 2);
  for (const [i, goblin] of fight.enemies(game.battle).entries()) {
    goblin.pos = { x: 2 + i * 2, y: 2 };
    goblin.hp = 60;
  }
  const result = resolveFight(game);
  assertEqual([result.stopped, result.outcome, fight.isHeroTurn(game)], [true, null, true], game.battle.log.map((e) => e.text).join(' / '));
  assertTrue(game.hp * 2 < maxHp(champion) && game.battle.log.at(-1).text.includes('the fight is yours to play'));
});

// ---- Heroic Inspiration ----

// The mill fight with Wren holding Heroic Inspiration and a goblin beside her, swinging and
// rolling a 1 (or the face given).
function swingAtGoblin(seed, face = 1) {
  const game = millFight(wren, seed);
  game.inspiration = true;
  const goblin = fight.enemies(game.battle)[0];
  goblin.pos = { x: 3, y: 2 };
  goblin.hp = 50;
  const weapon = heroAttackOptions(game).find((o) => o.source === 'weapon' && o.how === 'melee');
  forceNextD20(face);
  fight.heroAttack(game, weapon.id, goblin.id);
  return { game, goblin };
}

test('Heroic Inspiration: a missed attack can be rolled again straight away, and the new roll stands', () => {
  const { game } = swingAtGoblin('inspired');
  const missed = attackToReroll(game);
  assertTrue(missed && missed.roll.natural === 1 && missed.roll.yours);
  const { kept } = rerollAttack(game);
  assertTrue(game.battle.log[kept].text.startsWith('You spend your Heroic Inspiration'));
  const roll = game.battle.log.slice(kept).find((e) => e.roll && e.roll.kind === 'attack').roll;
  assertEqual([roll.rerolled.from, roll.natural, game.inspiration, attackToReroll(game)], [1, roll.rerolled.to, false, null]);
  assertEqual(game.battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.roll.yours).length, 1, 'the missed swing is gone from the log');
});

test('Heroic Inspiration: not for a hit, and not once the hero has done something else', () => {
  assertEqual(attackToReroll(swingAtGoblin('hit', 20).game), null);
  const { game } = swingAtGoblin('moved');
  const step = [...fight.heroReachable(game).values()].find((s) => s.cost > 0);
  fight.heroMove(game, step.pos);
  assertEqual(attackToReroll(game), null);
});

// ---- Allies: the Old Ford's watch ----

const champion3 = { ...wren, level: 3, subclassId: 'champion', hitPointRolls: [null, null] };

// The Old Ford at night: a level 3 Wren, any companions, and the watch's three Guards. Wren
// goes first; everyone else rolls a 1 for Initiative. Tests set the turn order by hand after.
function fordFight({ party = [], seed = 'ford' } = {}) {
  const game = { ...gameFor(champion3, seed), party: [] };
  for (const id of party) joinParty(game, id);
  game.rng = scriptedThen([20, ...Array(12).fill(1)], seed);
  fight.startBattle(game, 'ford-dead', 0);
  return game;
}

test('Allies: the Old Ford’s watch fight on your side as Guards, and don’t count towards how hard it is', () => {
  const game = fordFight({ party: ['odda', 'fen'] });
  const battle = game.battle;
  const allies = fight.allyCombatants(battle);
  assertEqual(
    allies.map((c) => [c.id, c.name, c.side, c.monsterId, c.hp, c.maxHp]),
    [
      ['brannock', 'Sergeant Brannock', 'hero', 'guard', 11, 11],
      ['wat', 'Wat', 'hero', 'guard', 11, 11],
      ['nell', 'Nell', 'hero', 'guard', 11, 11],
    ],
  );
  assertEqual(fight.partyCombatants(battle).map((c) => c.id), ['hero', 'odda', 'fen'], 'the party is the hero and companions');
  assertTrue(allies.every((c) => battle.order.includes(c.id)), 'each rolls Initiative');
  assertEqual(fight.companionCombatants(battle).map((c) => c.pos), [{ x: 3, y: 2 }, { x: 2, y: 3 }], 'companions take the free squares nearest you, not the watch’s');
  assertEqual(fightRating(game, 'ford-dead').rating, 'Moderate', 'a Ghoul and six Zombies, for three');
  assertEqual(fight.objectiveText(battle), 'Keep the watch alive: 3 of 3 still standing.');
  assertTrue(!fight.isPartyMember(allies[0]) && fight.upright(game, allies[0]) && fight.stateOf(battle, allies[0]) === 'up');
});

test('Allies: foes go after the nearest of your side, a soldier too; a soldier fights the foe beside them, or braces', () => {
  const game = fordFight();
  const battle = game.battle;
  const zombie = fight.combatantById(battle, 'zombie-1');
  const wat = fight.combatantById(battle, 'wat');
  const nell = fight.combatantById(battle, 'nell');
  zombie.pos = { x: 0, y: 2 }; // beside Wat, and three squares from you
  battle.order = ['hero', 'zombie-1', 'wat', 'nell'];
  battle.turn = 0;
  // The zombie's Slam (15: a hit on AC 16, 1d8 4), then Wat's Spear (10: a hit on AC 8, 1d6 3).
  game.rng = scriptedThen([15, 4, 10, 3], 'ford-turns');
  fight.endHeroTurn(game);
  assertEqual([wat.hp, zombie.hp], [6, 11]);
  assertTrue(said(game, 'Zombie 1 hits Wat with Slam') && said(game, 'Wat hits Zombie 1 with Spear'));
  assertEqual([wat.pos, nell.pos], [{ x: 1, y: 3 }, { x: 6, y: 3 }], 'they hold their ground');
  assertTrue(said(game, 'Nell braces and holds the line (Dodge)') && fight.conditionsOf(battle, 'nell').includes('dodging'), 'no foe beside her, but foes near');
});

test('Allies: a soldier at 0 Hit Points dies, and the story hears who lived', () => {
  const game = fordFight();
  const battle = game.battle;
  const wat = fight.combatantById(battle, 'wat');
  fight.combatantById(battle, 'zombie-1').pos = { x: 0, y: 2 };
  wat.hp = 1;
  battle.order = ['hero', 'zombie-1', 'wat'];
  battle.turn = 0;
  game.rng = scriptedThen([15, 4], 'ford-falls');
  fight.endHeroTurn(game);
  assertEqual([wat.hp, fight.stateOf(battle, wat), fight.upright(game, wat)], [0, 'dead', false]);
  assertTrue(said(game, "Wat falls, and doesn't get up."));
  assertTrue(!battle.log.some((e) => e.turnOf === 'wat'), 'the dead take no more turns');
  assertEqual(fight.objectiveText(battle), 'Keep the watch alive: 2 of 3 still standing.');
  for (const foe of fight.enemies(battle)) foe.hp = 0;
  battle.outcome = 'victory';
  fight.finishBattle(game);
  assertEqual(game.lastBattle.alliesAlive, ['brannock', 'nell']);
});

test('Allies: a Ghoul’s Claw can paralyse a soldier, who loses their turn', () => {
  const game = fordFight();
  const battle = game.battle;
  const wat = fight.combatantById(battle, 'wat');
  fight.combatantById(battle, 'ghoul-1').pos = { x: 0, y: 2 };
  battle.order = ['hero', 'ghoul-1', 'wat'];
  battle.turn = 0;
  // The Claw (15: a hit, 1d4 2), and Wat's Constitution save (3 + 1: a fail against DC 10).
  game.rng = scriptedThen([15, 2, 3], 'ford-claw');
  fight.endHeroTurn(game);
  assertEqual(wat.hp, 7);
  assertTrue(said(game, "Wat is Paralyzed, and can't move or act."), 'he loses his turn');
  assertTrue(said(game, 'The numbness fades: Wat can move again.') && !fight.conditionsOf(battle, 'wat').includes('paralyzed'), 'at the end of his next turn');
});

test('Allies: your potions and healing reach a soldier, though wards are for the party, and the dead are past help', () => {
  const game = fordFight();
  const battle = game.battle;
  const potions = game.inventory.find((e) => e.id === 'potion-of-healing');
  if (potions) potions.quantity = 1;
  else game.inventory.push({ id: 'potion-of-healing', quantity: 1 });
  const brannock = fight.combatantById(battle, 'brannock');
  const wat = fight.combatantById(battle, 'wat');
  brannock.hp = 3;
  const targets = fight.friendTargets(game, 'potion');
  assertEqual(targets.map(({ c, problem }) => [c.id, problem]), [
    ['hero', 'You’re at full Hit Points.'],
    ['brannock', null],
    ['wat', 'Wat isn’t beside you.'],
    ['nell', 'Nell isn’t beside you.'],
  ]);
  fight.heroDrinkPotion(game, 'brannock');
  assertTrue(brannock.hp > 3 && brannock.hp <= 11 && said(game, 'You give Sergeant Brannock a Potion of Healing'));
  const ward = { how: 'ward', effect: 'shield-of-faith', spellId: 'shield-of-faith', range: [60, 60] };
  assertEqual(fight.friendProblem(game, ward, brannock), 'Shield of Faith is only for you and your companions.');
  wat.hp = 0;
  assertEqual(fight.friendProblem(game, { id: 'potion', name: 'Potion of Healing', how: 'potion', range: [5, 5] }, wat), 'Wat is dead.');
  assertEqual(fight.healCombatant(game, wat, 5), 0);
});

// ---- Level 5: Extra Attack and Tactical Shift ----

// Wren at level 5: a Champion with Strength 18 (+4) and Proficiency +3, so +7 with her Greatsword.
const fighter5 = {
  ...champion,
  level: 5,
  hitPointRolls: [null, null, null, null],
  classChoices: { ...wren.classChoices, weaponMasteries: [...wren.classChoices.weaponMasteries, 'longbow'] },
  levelFeats: [{ level: 4, id: 'ability-score-improvement', increases: { strength: 1, constitution: 1 } }],
};

test('Extra Attack: the Attack action is two attacks, and no more; Action Surge brings two more', () => {
  assertEqual(validateCharacter(fighter5), []);
  const game = millFight(fighter5);
  const battle = game.battle;
  const [first, second] = fight.enemies(battle);
  first.pos = { x: 2, y: 2 };
  second.pos = { x: 4, y: 2 };
  first.hp = 60;
  second.hp = 60;
  const greatsword = heroAttackOptions(game).find((o) => o.id === 'greatsword-melee');
  assertEqual(greatsword.modifiers.reduce((s, m) => s + m.value, 0), 7, 'Str +4, Proficiency +3');
  const swing = (target) => {
    forceNextD20(15);
    fight.heroAttack(game, 'greatsword-melee', target.id);
  };
  swing(first);
  assertEqual([battle.turnState.action, battle.turnState.attacksLeft, fight.heroCantUse(game, 'greatsword-melee')], [true, 1, null], 'the second attack is still to come');
  assertThrows(() => fight.heroDodge(game), 'the action is the Attack action');
  swing(second);
  assertEqual([battle.turnState.attacksLeft, Boolean(fight.heroCantUse(game, 'greatsword-melee'))], [0, true], 'no third attack');
  fight.heroActionSurge(game);
  swing(first);
  assertEqual(battle.turnState.attacksLeft, 1, 'Action Surge’s action is two attacks too');
  swing(second);
  assertThrows(() => swing(first));
  assertEqual(battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.roll.yours).length, 4);
  // Next turn the count starts again; a level 4 Fighter attacks once.
  fight.endHeroTurn(game);
  assertEqual(game.battle.turnState.attacksLeft, 0);
  const four = millFight(wren4Fighter);
  const near = fight.enemies(four.battle)[0];
  Object.assign(near, { pos: { x: 3, y: 2 }, hp: 60 });
  forceNextD20(15);
  fight.heroAttack(four, 'greatsword-melee', near.id);
  assertEqual([four.battle.turnState.attacksLeft, Boolean(fight.heroCantUse(four, 'greatsword-melee'))], [0, true]);
});

const wren4Fighter = { ...fighter5, level: 4, hitPointRolls: [null, null, null] };

test('Tactical Shift: Second Wind, then a free move of half your Speed without Opportunity Attacks', () => {
  const game = millFight(fighter5);
  const battle = game.battle;
  const [goblin, other] = fight.enemies(battle);
  goblin.pos = { x: 3, y: 2 };
  other.pos = { x: 6, y: 5 };
  game.hp = 10;
  fight.heroSecondWind(game);
  assertEqual([battle.turnState.athleteMove, battle.turnState.freeMoveFrom], [15, 'Tactical Shift']);
  assertTrue(battle.log.some((e) => e.text === 'Tactical Shift: you can move up to 15 feet straight away without provoking Opportunity Attacks.'));
  fight.heroMove(game, { x: 5, y: 1 });
  assertTrue(!battle.log.some((e) => e.text.includes('an Opportunity Attack!')) && battle.log.some((e) => e.text === 'You move, light on your feet (Tactical Shift).'));
  assertEqual([battle.turnState.movementLeft, battle.turnState.athleteMove], [30, 0], 'and the turn’s own movement is untouched');
});

test('Resolve: a level 5 Fighter makes both attacks each turn', () => {
  const game = millFight(fighter5, 'resolve-five');
  for (const goblin of fight.enemies(game.battle)) goblin.hp = 60;
  game.battle.log = [];
  resolveFight(game);
  const firstTurn = [];
  for (const entry of game.battle ? game.battle.log : []) {
    if (entry.turnOf && entry.turnOf !== 'hero' && firstTurn.length) break;
    if (entry.roll && entry.roll.kind === 'attack' && entry.roll.yours) firstTurn.push(entry);
  }
  assertTrue(firstTurn.length >= 2, `${firstTurn.length} attacks on the first turn`);
});

// ---- The gnolls in the Gorse Cut (Chapter 2, Hob's ore) ----

// The Gorse Cut: a level 3 Wren, any companions, Dabbin on his cart's tail-board, and a Giant
// Hyena and four Gnoll Warriors. Wren goes first; everyone else rolls a 1 for Initiative. keep:
// the foes to leave standing (all of them, if not given). Tests move people and set the turn
// order by hand after.
function gnollFight({ party = [], seed = 'gnolls', keep = null } = {}) {
  const game = { ...gameFor(champion3, seed), party: [] };
  for (const id of party) joinParty(game, id);
  game.rng = scriptedThen([20, ...Array(12).fill(1)], seed);
  fight.startBattle(game, 'gorse-cut-gnolls', 0);
  if (keep) for (const foe of fight.enemies(game.battle)) if (!keep.includes(foe.id)) foe.hp = 0;
  return game;
}

test('Gnolls: a Giant Hyena and four Gnoll Warriors, 600 XP; Dabbin fights beside you as a Scout, drawn as himself', () => {
  const gnoll = fight.findMonster('gnoll-warrior');
  const hyena = fight.findMonster('giant-hyena');
  assertEqual([gnoll.xp, gnoll.ac, gnoll.hp.average, hyena.xp, hyena.speed], [100, 15, 27, 200, 50]);
  const game = gnollFight({ party: ['odda', 'fen'] });
  const battle = game.battle;
  assertEqual(fight.enemies(battle).map((c) => c.name), ['Giant Hyena', 'Gnoll Warrior 1', 'Gnoll Warrior 2', 'Gnoll Warrior 3', 'Gnoll Warrior 4']);
  const [dabbin] = fight.allyCombatants(battle);
  assertEqual([dabbin.id, dabbin.name, dabbin.monsterId, dabbin.hp, dabbin.person, dabbin.fallsHurt, dabbin.pos], ['dabbin', 'Dabbin', 'scout', 16, 'dabbin', true, { x: 4, y: 5 }]);
  assertEqual(fight.objectiveText(battle), 'Keep Dabbin alive: still standing.');
  assertEqual(fightRating(game, 'gorse-cut-gnolls').rating, 'Moderate', 'for a level 3 party of three, as Chapter 2 expects');
});

test('Gnolls: Rampage. Hurting someone already Bloodied, a gnoll Rends again with its Bonus Action, once a fight', () => {
  const game = gnollFight({ keep: ['gnoll-warrior-1'] });
  const battle = game.battle;
  const gnoll = fight.combatantById(battle, 'gnoll-warrior-1');
  gnoll.pos = { x: 3, y: 3 }; // beside Wren
  battle.order = ['hero', gnoll.id];
  battle.turn = 0;
  const bloodied = Math.floor(fight.maxHpOf(game, fight.heroCombatant(battle)) / 2);
  game.hp = bloodied;
  // Rend (15: a hit on AC 17, 1d6 1 + 2 = 3), then Rampage's Rend (15, 1 + 2 = 3).
  game.rng = scriptedThen([15, 1, 15, 1], 'rampage');
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Gnoll Warrior 1 smells blood, and Rampages!'));
  const rends = () => battle.log.filter((e) => e.roll && e.roll.kind === 'attack' && e.text.startsWith('Gnoll Warrior 1 hits you with Rend')).length;
  assertEqual([rends(), game.hp, gnoll.rampaged], [2, bloodied - 6, true]);
  // Once a fight: the next hit on a Bloodied hero is only a hit.
  game.rng = scriptedThen([15, 1], 'rampage-again');
  fight.endHeroTurn(game);
  assertEqual([rends(), battle.log.filter((e) => e.text.includes('Rampages')).length], [3, 1]);
});

test('Gnolls: no Rampage when the one it hurts wasn’t Bloodied yet', () => {
  const game = gnollFight({ keep: ['gnoll-warrior-1'] });
  const battle = game.battle;
  const gnoll = fight.combatantById(battle, 'gnoll-warrior-1');
  gnoll.pos = { x: 3, y: 3 };
  battle.order = ['hero', gnoll.id];
  battle.turn = 0;
  game.rng = scriptedThen([15, 6], 'no-rampage'); // a hit for 8, from full Hit Points
  fight.endHeroTurn(game);
  assertTrue(!said(game, 'Rampages') && !gnoll.rampaged);
});

test('Gnolls: a Giant Hyena that drops Dabbin Rampages on, bounding up to 25 feet to bite you; Dabbin goes down badly hurt', () => {
  const game = gnollFight({ keep: ['giant-hyena-1'] });
  const battle = game.battle;
  const hyena = fight.combatantById(battle, 'giant-hyena-1');
  const dabbin = fight.combatantById(battle, 'dabbin');
  const hero = fight.heroCombatant(battle);
  hyena.pos = { x: 5, y: 6 }; // beside Dabbin on the tail-board
  hero.pos = { x: 2, y: 8 }; // three squares off
  dabbin.hp = 5; // Bloodied
  battle.order = ['hero', hyena.id];
  battle.turn = 0;
  const hp = game.hp;
  // A Bite on Dabbin (15: a hit on AC 13, 2d6 1 1 + 3 = 5), then Rampage's Bite on you (15: a
  // hit on AC 17, 2d6 2 2 + 3 = 7).
  game.rng = scriptedThen([15, 1, 1, 15, 2, 2], 'hyena-rampage');
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Dabbin goes down, badly hurt.') && said(game, 'Giant Hyena smells blood, and Rampages!'));
  assertEqual([dabbin.hp, squaresBetween(hyena.pos, hero.pos), game.hp], [0, 1, hp - 7]);
  assertEqual(fight.objectiveText(battle), 'Keep Dabbin alive: down, badly hurt.');
  for (const foe of fight.enemies(battle)) foe.hp = 0;
  battle.outcome = 'victory';
  fight.finishBattle(game);
  assertEqual(game.lastBattle.alliesAlive, [], 'the story hears he fell');
});

test('Allies: Dabbin, a Scout, holds the tail-board and shoots his longbow twice at the nearest gnoll', () => {
  const game = gnollFight({ keep: ['gnoll-warrior-1', 'gnoll-warrior-4'] });
  const battle = game.battle;
  const dabbin = fight.combatantById(battle, 'dabbin');
  const near = fight.combatantById(battle, 'gnoll-warrior-4');
  near.pos = { x: 6, y: 9 }; // 20 feet behind the cart; Gnoll Warrior 1 is 25 feet ahead
  battle.order = ['hero', 'dabbin'];
  battle.turn = 0;
  // Two Longbow shots (15: hits on AC 15, 1d8 4 + 2 = 6 each).
  game.rng = scriptedThen([15, 4, 15, 4], 'dabbin-shoots');
  fight.endHeroTurn(game);
  assertEqual(battle.log.filter((e) => e.text.startsWith('Dabbin hits Gnoll Warrior 4 with Longbow')).length, 2);
  assertEqual([near.hp, dabbin.pos], [15, { x: 4, y: 5 }]);
});

// ---- The Specter (Chapter 3's side quest, The Barrow-Wives) ----

// Wren at level 5 in a barrow on the Three Wives, against one barrow-wife (a Specter), with
// any companions. Wren goes first, then the Specter. at: where the Specter starts (Wren is at
// the passage's mouth, x 3, y 7).
function specterFight({ party = [], seed = 'specter', at = null } = {}) {
  const game = { ...gameFor(fighter5, seed), party: [] };
  for (const id of party) joinParty(game, id);
  game.rng = scriptedThen([20, ...Array(6).fill(1)], seed);
  fight.startBattle(game, 'barrow-wife', 0);
  const specter = fight.enemies(game.battle)[0];
  if (at) specter.pos = at;
  game.battle.order = ['hero', specter.id];
  game.battle.turn = 0;
  return game;
}

test('Specters: the Specter (SRD 5.2.1); a barrow-wife alone in her barrow is Low for a level 5 party of three', () => {
  const specter = fight.findMonster('specter');
  assertEqual([specter.xp, specter.ac, specter.hp.average, specter.speed, specter.fly, specter.attacks[0].damage.dice, specter.attacks[0].drainsMax], [200, 12, 22, 30, 50, '2d6', true]);
  assertTrue(['bludgeoning', 'piercing', 'slashing'].every((t) => specter.resistances.includes(t)) && specter.immunities.includes('necrotic') && specter.traits.includes('incorporeal-movement'));
  const game = specterFight({ party: ['odda', 'fen'] });
  assertEqual(fight.enemies(game.battle).map((c) => [c.name, c.hp]), [['The barrow-wife', 22]]);
  assertEqual(fightRating(game, 'barrow-wife').rating, 'Low');
});

test('Specters: Life Drain lowers your Hit Point maximum by the damage you take; healing stops there, and a Long Rest puts it back', () => {
  const game = specterFight({ at: { x: 3, y: 6 } }); // beside Wren
  const max = heroMaxHp(game);
  game.rng = scriptedThen([18, 3, 4], 'drain'); // a hit (18 + 4), 2d6 3 + 4 = 7 Necrotic
  fight.endHeroTurn(game);
  assertTrue(said(game, `Life Drain: your Hit Point maximum drops by 7, to ${max - 7}, until you finish a Long Rest.`), game.battle.log.map((e) => e.text).join(' / '));
  assertEqual([game.hp, game.hpMaxDrop, heroMaxHp(game), fight.maxHpOf(game, fight.heroCombatant(game.battle))], [max - 7, 7, max - 7, max - 7]);
  assertEqual(heal(game, 50), 0, 'already at the lowered maximum');
  longRestRecovery(game);
  assertEqual([game.hpMaxDrop, game.hp, heroMaxHp(game)], [0, max, max]);
});

test('Specters: Temporary Hit Points take the blow, but the maximum still drops by all of it', () => {
  const game = specterFight({ at: { x: 3, y: 6 } });
  const max = heroMaxHp(game);
  game.hp = max - 20; // well below the new maximum, so none is trimmed off
  const hp = game.hp;
  game.tempHp = 5;
  game.rng = scriptedThen([18, 3, 4], 'drain-temp');
  fight.endHeroTurn(game);
  assertEqual([game.tempHp, game.hp, game.hpMaxDrop, heroMaxHp(game)], [0, hp - 2, 7, max - 7]);
});

test('Specters: Life Drain on a companion lowers their maximum too, until the party’s Long Rest', () => {
  const game = specterFight({ party: ['odda'], at: { x: 3, y: 5 } });
  const battle = game.battle;
  const odda = fight.combatantById(battle, 'odda');
  fight.heroCombatant(battle).pos = { x: 1, y: 2 }; // across the chamber: Odda is nearer
  odda.pos = { x: 3, y: 6 };
  const member = memberOf(game, 'odda');
  const max = memberMaxHp(game, member);
  game.rng = scriptedThen([18, 2, 3], 'drain-odda'); // 2 + 3 = 5 Necrotic
  fight.endHeroTurn(game);
  assertTrue(said(game, `Life Drain: ${odda.name}'s Hit Point maximum drops by 5, to ${max - 5}, until they finish a Long Rest.`), battle.log.map((e) => e.text).join(' / '));
  assertEqual([member.hp, member.hpMaxDrop, memberMaxHp(game, member), fight.maxHpOf(game, odda)], [max - 5, 5, max - 5, max - 5]);
  game.battle = null;
  partyLongRest(game);
  assertEqual([member.hpMaxDrop, member.hp], [0, max]);
});

test('Specters: a Hit Point maximum drained to 0 is death', () => {
  const game = specterFight({ at: { x: 3, y: 6 } });
  game.hpMaxDrop = heroMaxHp(game) - 7; // a maximum of 7
  game.hp = 7;
  game.rng = scriptedThen([18, 3, 4], 'drained');
  fight.endHeroTurn(game);
  assertTrue(said(game, 'Your Hit Point maximum is drained to nothing.'));
  assertEqual([game.battle.heroState, game.battle.outcome, heroMaxHp(game)], ['dead', 'defeat', 0]);
});

test('Grid: an incorporeal Specter moves through walls and people as difficult terrain, never stopping inside them, and not into deep water', () => {
  const walls = { '#': { terrain: 'wall' }, '.': { terrain: 'floor' }, w: { terrain: 'water' } };
  const map = parseMap(['.#..', 'wwww'], walls);
  const ghost = reachableSquares(map, { x: 0, y: 0 }, 15, () => null, { incorporeal: true });
  assertEqual(ghost.get(key({ x: 2, y: 0 })).cost, 15, '10 feet through the wall, 5 out of it');
  assertTrue(!ghost.has(key({ x: 1, y: 0 })), 'it doesn’t stop inside the wall');
  assertTrue(!ghost.has(key({ x: 0, y: 1 })), 'not into deep water');
  assertTrue(!reachableSquares(map, { x: 0, y: 0 }, 50).has(key({ x: 2, y: 0 })), 'a walker can’t get there');
  const open = parseMap(['...'], walls);
  const foe = (pos) => (pos.x === 1 ? 'enemy' : null);
  const through = reachableSquares(open, { x: 0, y: 0 }, 15, foe, { incorporeal: true });
  assertEqual([through.get(key({ x: 2, y: 0 })).cost, through.has(key({ x: 1, y: 0 }))], [15, false], 'through someone, as difficult terrain');
  assertTrue(!reachableSquares(open, { x: 0, y: 0 }, 50, foe).has(key({ x: 2, y: 0 })), 'a walker can’t pass a foe');
});

test('Specters: a barrow-wife drifts through a wall to reach you', () => {
  const wall = {
    id: 'test-through-the-wall',
    name: 'Through the wall',
    difficulty: 'Low (a test)',
    sizedFor: { level: 5, party: 1 },
    map: { rows: ['#######', '#..#..#', '#######'], legend: { '#': { terrain: 'wall', wall: 'stone' }, '.': { terrain: 'floor', tile: 'crypt-floor' } } },
    hero: { x: 1, y: 1 },
    monsters: [{ monster: 'specter', pos: { x: 5, y: 1 } }],
    source: 'original',
  };
  encounters.push(wall);
  try {
    const game = { ...gameFor(fighter5, 'through-the-wall'), party: [] };
    game.rng = scriptedThen([20, 1], 'through-the-wall');
    fight.startBattle(game, wall.id, 0);
    const specter = fight.enemies(game.battle)[0];
    game.battle.order = ['hero', specter.id];
    game.battle.turn = 0;
    game.rng = scriptedThen([1], 'through-the-wall-miss');
    fight.endHeroTurn(game);
    assertEqual(specter.pos, { x: 2, y: 1 }, 'beside Wren, on her side of the wall');
    assertTrue(said(game, 'Specter attacks you with Life Drain, and misses.'), game.battle.log.map((e) => e.text).join(' / '));
  } finally {
    encounters.splice(encounters.indexOf(wall), 1);
  }
});

test('Cloak of Protection: worn in a fight, +1 Armor Class against the barrow-wife, and +1 on a death save', () => {
  const game = specterFight({ at: { x: 3, y: 6 } });
  const ac = armorClass(game.character).value;
  addItem(game.inventory, 'cloak-of-protection');
  assertEqual(wornItems(game).map((i) => i.id), ['cloak-of-protection']);
  game.rng = scriptedThen([1], 'cloak-miss');
  fight.endHeroTurn(game);
  const attack = game.battle.log.find((e) => e.roll && e.roll.kind === 'attack');
  assertEqual(attack.roll.target, { type: 'AC', value: ac + 1 });
  // At 1 Hit Point, the barrow-wife drops you (18 to hit, 3 + 4); then your death save, 9 + 1.
  game.hp = 1;
  game.rng = scriptedThen([18, 3, 4, 9], 'cloak-death-save');
  fight.endHeroTurn(game);
  const save = game.battle.log.find((e) => e.roll && e.roll.label === 'Death saving throw');
  assertTrue(save.roll.modifiers.some((m) => m.label === 'Cloak of Protection' && m.value === 1) && save.roll.success, JSON.stringify(save.roll));
});

run(document.getElementById('summary'), document.getElementById('results'));

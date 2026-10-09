// A fight on the battle grid: initiative, turns, moving, attacking, and how it ends.
// Rules: SRD 5.2.1, "Combat", "Actions", "Opportunity Attacks", "Dropping to 0 Hit Points"
// and "Death Saving Throws".
//
// The fight is plain data on game.battle, saved after every action, so a reload picks up
// exactly where it was:
//   encounterId, choiceIndex   the encounter, and the story choice to take when it ends
//   round, order, turn         the round, combatant ids in initiative order, whose turn it is
//   combatants   [{ id, side: 'hero' | 'enemy', name, pos: { x, y }, monsterId, hp, maxHp }]
//                (the hero's Hit Points are game.hp)
//   turnState    { movementLeft, action, bonus, disengaged, savageUsed, surged, athleteMove }
//                for the current turn: surged after Action Surge; athleteMove is the free
//                move Remarkable Athlete gives straight after a Critical Hit (feet, or 0)
//   effects      [{ kind, target, endsOn }]: 'dodging', 'slowed', 'no-reactions' or
//                'no-healing', lasting until the start of endsOn's next turn; and 'prone'
//                (endsOn null), which lasts until the creature stands up
//   reactionsUsed  ids that have used their reaction since their last turn
//   heroState    'up', 'down' (0 Hit Points, making death saves), 'stable' or 'dead'
//   deathSaves   { successes, failures }
//   log          [{ round, text, roll, turnOf, newRound }]: everything that happened, in
//                order; turnOf marks the line that starts a combatant's turn, and newRound
//                the line that starts a round
//   outcome      null while fighting, then 'victory' or 'defeat'; xp: earned on victory
//   surprise     true if the hero caught the foes unawares (they rolled Initiative with
//                Disadvantage)
//   hymn         for an encounter with a hymn: { singing, risen } (see encounters.js)
// A foe that flees the fight is marked escaped, and its hp set to 0 so it no longer counts.
//
// Replays (not saved): each log line written in this visit also remembers the scene just
// after it (who stood where, with how many Hit Points) and any moves it covers, so the battle
// screen can play a turn back a line at a time, walking each creature square by square.
// Lines from a loaded save have none, and the screen shows them at once.

import { encounters } from '../../../data/campaign/encounters.js';
import { monsters } from '../../../data/srd/monsters.js';
import { d20Test } from '../rules/d20-test.js';
import { rollDice } from '../rules/dice.js';
import { armorClass, findClass, hasFeature, initiative as heroInitiative, speed as heroSpeed } from '../character/sheet.js';
import { heal, featureUsesLeft, maxHp, spendFeature, spendSlot } from '../character/resources.js';
import { hasItem, removeItem } from '../character/inventory.js';
import { feetBetween, isAdjacent, isStandable, key, parseMap, reachableSquares, squaresBetween, stepCost } from './grid.js';
import { encounterRows } from '../world/dungeons.js';
import {
  attackRoll,
  damageAfterResistance,
  damageText,
  heroAttackOptions,
  heroResistances,
  hitChance,
  monsterAttackOptions,
  monsterSave,
  rollDamage,
} from './attacks.js';

export const findEncounter = (id) => encounters.find((e) => e.id === id) || null;
export const findMonster = (id) => monsters.find((m) => m.id === id) || null;

const maps = new Map();
// The encounter's map, parsed once: its own, or its room of a dungeon. Onlookers (goblins
// watching a duel, say) stand in the way like any obstacle.
export function battleMap(battle) {
  if (!maps.has(battle.encounterId)) {
    const encounter = findEncounter(battle.encounterId);
    const { rows, legend } = encounterRows(encounter);
    const map = parseMap(rows, legend);
    for (const { decor, pos } of encounter.onlookers || []) {
      map.cells[pos.y][pos.x] = { ...map.cells[pos.y][pos.x], terrain: 'obstacle', decor };
    }
    maps.set(battle.encounterId, map);
  }
  return maps.get(battle.encounterId);
}

export const combatantById = (battle, id) => battle.combatants.find((c) => c.id === id);
export const currentCombatant = (battle) => combatantById(battle, battle.order[battle.turn]);
export const heroCombatant = (battle) => combatantById(battle, 'hero');
export const enemies = (battle) => battle.combatants.filter((c) => c.side === 'enemy');

export function hpOf(game, c) {
  return c.side === 'hero' ? game.hp : c.hp;
}

const upright = (game, c) => (c.side === 'hero' ? game.battle.heroState === 'up' : c.hp > 0);
const hasEffect = (battle, id, kind) => battle.effects.some((e) => e.target === id && e.kind === kind);
const STEPS_AROUND = [[0, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]];

// The Prone condition (SRD 5.2.1): crawling costs extra, standing up costs half your Speed,
// your attacks have Disadvantage, and attacks against you have Advantage from within 5 feet
// and Disadvantage from farther away.
export const isProne = (battle, id) => hasEffect(battle, id, 'prone');

function knockProne(game, c) {
  if (!isProne(game.battle, c.id)) game.battle.effects.push({ kind: 'prone', target: c.id, endsOn: null });
}

// Sizes, smallest first, for "Medium or smaller" rules.
const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
const sizeOf = (game, c) => (c.side === 'hero' ? game.character.size : findMonster(c.monsterId).size);

// Standing up costs half the creature's Speed, rounded down. With a Speed of 0 it can't.
function standCost(game, c) {
  return Math.floor(speedOf(game, c) / 2);
}

function standUp(game, c) {
  const battle = game.battle;
  const cost = standCost(game, c);
  battle.turnState.movementLeft -= cost;
  battle.effects = battle.effects.filter((e) => !(e.target === c.id && e.kind === 'prone'));
  log(game, c.side === 'hero' ? `You get back on your feet (${cost} feet of movement).` : `${c.name} gets back on its feet.`);
}

const replays = new WeakMap(); // log line → { scene, moves }
const walking = new WeakMap(); // battle → the walk in progress: { id, from, path }

// Writes a line in the fight log. moves: creatures shifted outside a walk (Redirect Attack's
// swap), as { id, from, path }.
function log(game, text, extra = {}, moves = []) {
  const battle = game.battle;
  const entry = { round: battle.round, text, ...extra };
  battle.log.push(entry);
  // The steps walked since the last line belong to this one (an Opportunity Attack can break
  // a walk in two).
  const walk = walking.get(battle);
  const walked = [];
  if (walk && walk.path.length) {
    walked.push({ id: walk.id, from: walk.from, path: walk.path });
    walk.from = { ...walk.path[walk.path.length - 1] };
    walk.path = [];
  }
  replays.set(entry, { scene: battleScene(game), moves: [...walked, ...moves] });
}

// What a log line remembers for the replay ({ scene, moves }), or null for a line from a save.
export const replayOf = (entry) => replays.get(entry) || null;

// Where everyone is and how they're doing right now: the round, whose turn it is, the hero's
// state, and each creature's square, Hit Points, and whether it's Prone or has fled.
export function battleScene(game) {
  const battle = game.battle;
  return {
    round: battle.round,
    actor: battle.order.length ? battle.order[battle.turn] : null,
    heroState: battle.heroState,
    units: battle.combatants.map((c) => ({ id: c.id, pos: { ...c.pos }, hp: hpOf(game, c), prone: isProne(battle, c.id), escaped: Boolean(c.escaped) })),
  };
}

// After damage lands, the line that announced it shows the new Hit Points.
function rescene(game) {
  const entry = game.battle.log[game.battle.log.length - 1];
  const replay = entry && replays.get(entry);
  if (replay) replay.scene = battleScene(game);
}

// ---- Starting ----

// Starts a fight. choiceIndex: the story choice that started it, taken again when it ends.
// surprise: the hero caught the foes unawares (SRD 5.2.1, "Surprise": they roll Initiative
// with Disadvantage).
export function startBattle(game, encounterId, choiceIndex, { surprise = false } = {}) {
  const encounter = findEncounter(encounterId);
  if (!encounter) throw new Error(`Unknown encounter: ${encounterId}`);
  const counts = {};
  for (const { monster } of encounter.monsters) counts[monster] = (counts[monster] || 0) + 1;
  const numbered = {};
  const combatants = [{ id: 'hero', side: 'hero', name: game.character.name, pos: { ...encounter.hero } }];
  for (const { monster: id, pos, name: given } of encounter.monsters) {
    const monster = findMonster(id);
    if (!monster) throw new Error(`Unknown monster: ${id}`);
    numbered[id] = (numbered[id] || 0) + 1;
    const name = given || (counts[id] > 1 ? `${monster.name} ${numbered[id]}` : monster.name);
    combatants.push({ id: `${id}-${numbered[id]}`, side: 'enemy', name, monsterId: id, pos: { ...pos }, hp: monster.hp.average, maxHp: monster.hp.average });
  }
  game.battle = {
    encounterId,
    choiceIndex,
    round: 1,
    order: [],
    turn: 0,
    combatants,
    turnState: null,
    effects: [],
    reactionsUsed: [],
    heroState: game.hp > 0 ? 'up' : 'down',
    deathSaves: { successes: 0, failures: 0 },
    log: [],
    outcome: null,
    xp: 0,
    surprise,
    hymn: encounter.hymn ? { singing: true, risen: false } : null,
  };
  rollInitiative(game);
  beginTurn(game);
  runEnemyTurns(game);
  return game.battle;
}

// Everyone rolls Initiative; the highest goes first (the hero wins ties). A Champion's
// Remarkable Athlete gives Advantage.
function rollInitiative(game) {
  const battle = game.battle;
  const results = battle.combatants.map((c) => {
    const modifiers =
      c.side === 'hero'
        ? heroInitiative(game.character).parts.map((p) => ({ ...p, source: 'Initiative' }))
        : [{ label: 'Initiative', value: findMonster(c.monsterId).initiative, source: c.name }];
    const advantage = c.side === 'hero' && hasFeature(game.character, 'remarkable-athlete') ? ['Remarkable Athlete'] : [];
    const disadvantage = c.side === 'enemy' && battle.surprise ? ['Surprised'] : [];
    const roll = d20Test({ rng: game.rng, kind: 'check', label: 'Initiative', modifiers, advantage, disadvantage });
    log(game, `${c.side === 'hero' ? 'You roll' : `${c.name} rolls`} Initiative.`, { roll });
    return { id: c.id, total: roll.total, hero: c.side === 'hero' };
  });
  results.sort((a, b) => b.total - a.total || Number(b.hero) - Number(a.hero));
  battle.order = results.map((r) => r.id);
  if (battle.surprise) log(game, 'You catch them by surprise.');
  const first = combatantById(battle, battle.order[0]);
  log(game, `${first.side === 'hero' ? 'You go' : `${first.name} goes`} first.`);
}

// ---- Turns ----

function speedOf(game, c) {
  const base = c.side === 'hero' ? heroSpeed(game.character).value : findMonster(c.monsterId).speed;
  return Math.max(0, base - (hasEffect(game.battle, c.id, 'slowed') ? 10 : 0));
}

function beginTurn(game) {
  const battle = game.battle;
  const c = currentCombatant(battle);
  battle.effects = battle.effects.filter((e) => e.endsOn !== c.id);
  battle.reactionsUsed = battle.reactionsUsed.filter((id) => id !== c.id);
  battle.turnState = { movementLeft: speedOf(game, c), action: false, bonus: false, disengaged: false, savageUsed: false, surged: false, athleteMove: 0 };
  log(game, c.side === 'hero' ? 'Your turn.' : `${c.name}'s turn.`, { turnOf: c.id });
  if (c.side === 'hero' && battle.heroState === 'down') deathSave(game);
}

function advanceTurn(game) {
  const battle = game.battle;
  do {
    battle.turn += 1;
    if (battle.turn >= battle.order.length) {
      battle.turn = 0;
      battle.round += 1;
      log(game, `Round ${battle.round}.`, { newRound: true });
      hymnRises(game);
    }
  } while (currentCombatant(battle).side === 'enemy' && currentCombatant(battle).hp <= 0);
  beginTurn(game);
}

// ---- A hymn (the Ashen Choir) ----

// The monster singing the encounter's hymn, or null.
function singerOf(battle) {
  const hymn = findEncounter(battle.encounterId).hymn;
  return hymn ? enemies(battle).find((c) => c.monsterId === hymn.singer) || null : null;
}

// At the start of the hymn's round, if the singing hasn't been stopped, the monster rises.
function hymnRises(game) {
  const battle = game.battle;
  const hymn = findEncounter(battle.encounterId).hymn;
  if (!battle.hymn || !battle.hymn.singing || battle.round < hymn.round) return;
  const monster = findMonster(hymn.rises.monster);
  const blocked = blockedFor(game, { side: 'enemy' });
  const map = battleMap(battle);
  const spot = [hymn.rises.pos, ...STEPS_AROUND.map(([dx, dy]) => ({ x: hymn.rises.pos.x + dx, y: hymn.rises.pos.y + dy }))].find(
    (pos) => isStandable(map, pos) && !blocked(pos),
  );
  battle.hymn = { singing: false, risen: true };
  if (!spot) return;
  const count = battle.combatants.filter((c) => c.monsterId === monster.id).length + 1;
  const risen = { id: `${monster.id}-${count}`, side: 'enemy', name: `${monster.name} ${count}`, monsterId: monster.id, pos: { ...spot }, hp: monster.hp.average, maxHp: monster.hp.average };
  battle.combatants.push(risen);
  battle.order.push(risen.id);
  log(game, `The hymn swells to its end, and ${risen.name} drags itself up out of the bones!`);
}

// Damage makes the singer save to keep singing: Constitution, DC 10 or half the damage.
function hymnHurt(game, singer, taken) {
  const battle = game.battle;
  if (!battle.hymn || !battle.hymn.singing || singer !== singerOf(battle)) return;
  if (singer.hp <= 0) {
    battle.hymn.singing = false;
    log(game, 'The hymn dies with the singer.');
    return;
  }
  const dc = Math.max(10, Math.floor(taken / 2));
  const save = monsterSave(game.rng, findMonster(singer.monsterId), 'constitution', dc);
  if (save.success) {
    log(game, `${singer.name} winces, but keeps singing.`, { roll: save });
  } else {
    battle.hymn.singing = false;
    log(game, `${singer.name} chokes on a note: the hymn breaks off!`, { roll: save });
  }
}

// What the fight is about beyond winning it, for the battle screen, or ''.
export function objectiveText(battle) {
  const hymn = findEncounter(battle.encounterId).hymn;
  if (!hymn || !battle.hymn) return '';
  if (battle.hymn.risen) return 'The hymn is finished.';
  if (!battle.hymn.singing) return 'The hymn is broken. No more of the dead will rise here.';
  return `The hymn: unless the singer is stopped, a second ${findMonster(hymn.rises.monster).name} rises at the start of round ${hymn.round}. Hurting the singer may break it.`;
}

// Plays every enemy turn (and a downed hero's death saves) until the hero can act or the
// fight is over.
function runEnemyTurns(game) {
  const battle = game.battle;
  let guard = 0;
  while (!battle.outcome && guard++ < 200) {
    const c = currentCombatant(battle);
    if (c.side === 'enemy') {
      enemyTurn(game, c);
    } else if (battle.heroState === 'up') {
      return;
    }
    if (battle.outcome) return;
    advanceTurn(game);
  }
}

export const isHeroTurn = (game) => Boolean(game.battle && !game.battle.outcome && currentCombatant(game.battle).side === 'hero' && game.battle.heroState === 'up');

function requireHeroTurn(game) {
  if (!isHeroTurn(game)) throw new Error("It isn't your turn.");
}

export function endHeroTurn(game) {
  requireHeroTurn(game);
  game.battle.turnState.athleteMove = 0;
  log(game, 'You end your turn.');
  advanceTurn(game);
  runEnemyTurns(game);
}

// ---- Moving ----

// Who's standing where, from the point of view of a creature on one side.
function blockedFor(game, mover) {
  const battle = game.battle;
  return (pos) => {
    const other = battle.combatants.find((c) => c !== mover && c.pos.x === pos.x && c.pos.y === pos.y && (c.side === 'hero' || c.hp > 0));
    if (!other) return null;
    return other.side === mover.side ? 'ally' : 'enemy';
  };
}

// Where the hero can move now. Squares within a Remarkable Athlete free move are marked
// free: going there costs no movement and provokes no Opportunity Attacks.
export function heroReachable(game) {
  if (!isHeroTurn(game)) return new Map();
  const battle = game.battle;
  const hero = heroCombatant(battle);
  const map = battleMap(battle);
  const crawling = isProne(battle, hero.id);
  const squares = reachableSquares(map, hero.pos, battle.turnState.movementLeft, blockedFor(game, hero), { crawling });
  const free = battle.turnState.athleteMove || 0;
  if (free > 0) {
    for (const [at, step] of reachableSquares(map, hero.pos, free, blockedFor(game, hero), { crawling })) squares.set(at, { ...step, free: true });
  }
  return squares;
}

// A Prone hero can stand up if they have half their Speed left to spend. It's not an action.
export function heroStandCost(game) {
  return standCost(game, heroCombatant(game.battle));
}

export function heroCanStand(game) {
  const cost = heroStandCost(game);
  return isHeroTurn(game) && isProne(game.battle, 'hero') && speedOf(game, heroCombatant(game.battle)) > 0 && game.battle.turnState.movementLeft >= cost;
}

export function heroStandUp(game) {
  requireHeroTurn(game);
  const battle = game.battle;
  if (!isProne(battle, 'hero')) throw new Error('You are already on your feet.');
  const cost = heroStandCost(game);
  if (speedOf(game, heroCombatant(battle)) === 0) throw new Error("With a Speed of 0 you can't stand up.");
  if (battle.turnState.movementLeft < cost) throw new Error(`Standing up takes ${cost} feet of movement, and you have ${battle.turnState.movementLeft} left.`);
  battle.turnState.athleteMove = 0;
  standUp(game, heroCombatant(battle));
}

export function heroMove(game, pos) {
  requireHeroTurn(game);
  const step = heroReachable(game).get(key(pos));
  if (!step || step.cost === 0) throw new Error("You can't reach that square this turn.");
  game.battle.turnState.athleteMove = 0;
  moveAlong(game, heroCombatant(game.battle), step.path, { free: Boolean(step.free) });
}

// Moves one square at a time, provoking an Opportunity Attack from any foe whose reach the
// mover leaves, unless the mover took the Disengage action. A free move (Remarkable Athlete)
// costs no movement and provokes nothing.
function moveAlong(game, mover, path, { free = false } = {}) {
  const battle = game.battle;
  const map = battleMap(battle);
  const crawling = isProne(battle, mover.id);
  walking.set(battle, { id: mover.id, from: { ...mover.pos }, path: [] });
  try {
    for (const next of path) {
      if (!battle.turnState.disengaged && !free) {
        for (const foe of battle.combatants) {
          if (foe.side === mover.side || !upright(game, foe)) continue;
          if (battle.reactionsUsed.includes(foe.id) || hasEffect(battle, foe.id, 'no-reactions')) continue;
          if (isAdjacent(foe.pos, mover.pos) && !isAdjacent(foe.pos, next)) {
            opportunityAttack(game, foe, mover);
            if (battle.outcome || !upright(game, mover)) return;
          }
        }
      }
      if (!free) battle.turnState.movementLeft -= stepCost(map, next, crawling);
      mover.pos = { ...next };
      walking.get(battle).path.push({ ...next });
    }
    if (free) log(game, 'You move, light on your feet (Remarkable Athlete).');
    else if (crawling) log(game, mover.side === 'hero' ? 'You crawl.' : `${mover.name} crawls.`);
    else log(game, mover.side === 'hero' ? 'You move.' : `${mover.name} moves.`);
  } finally {
    walking.delete(battle);
  }
}

function opportunityAttack(game, attacker, target) {
  const options = attacker.side === 'hero' ? heroAttackOptions(game).filter((o) => o.how === 'melee' && o.source === 'weapon') : monsterAttackOptions(findMonster(attacker.monsterId)).filter((o) => o.how === 'melee');
  if (options.length === 0) return;
  game.battle.reactionsUsed.push(attacker.id);
  log(game, attacker.side === 'hero' ? `${target.name} tries to slip past you: an Opportunity Attack!` : `You leave ${attacker.name}'s reach: an Opportunity Attack!`);
  performAttack(game, attacker, target, options[0]);
}

// ---- Attacking ----

// Advantage and Disadvantage on an attack, with the reasons.
function attackConditions(game, attacker, target, option) {
  const battle = game.battle;
  const advantage = [];
  const disadvantage = [];
  if (hasEffect(battle, target.id, 'dodging')) disadvantage.push(`${target.side === 'hero' ? 'You are' : `${target.name} is`} Dodging`);
  if (option.how === 'ranged' || option.how === 'rays') {
    if (feetBetween(attacker.pos, target.pos) > option.range[0]) disadvantage.push('Long range');
    const foeNearby = battle.combatants.some((c) => c.side !== attacker.side && upright(game, c) && isAdjacent(c.pos, attacker.pos));
    if (foeNearby) disadvantage.push('An enemy is within 5 feet');
  }
  if (option.heavyDisadvantage) disadvantage.push('Heavy weapon without the Strength or Dexterity 13 it needs');
  if (target.side === 'hero' && battle.heroState !== 'up') advantage.push('You are Unconscious');
  const is = (c) => (c.side === 'hero' ? 'You are' : `${c.name} is`);
  if (isProne(battle, attacker.id)) disadvantage.push(`${is(attacker)} Prone`);
  if (isProne(battle, target.id)) {
    if (isAdjacent(attacker.pos, target.pos)) advantage.push(`${is(target)} Prone, within 5 feet`);
    else disadvantage.push(`${is(target)} Prone, and more than 5 feet away`);
  }
  // Pack Tactics: an ally of the attacker, not Incapacitated, within 5 feet of the target.
  if (attacker.side === 'enemy' && (findMonster(attacker.monsterId).traits || []).includes('pack-tactics')) {
    const ally = battle.combatants.some((c) => c !== attacker && c.side === attacker.side && upright(game, c) && isAdjacent(c.pos, target.pos));
    if (ally) advantage.push('Pack Tactics');
  }
  return { advantage, disadvantage };
}

export function inRange(attacker, target, option) {
  const feet = feetBetween(attacker.pos, target.pos);
  if (option.how === 'melee') return feet <= option.reach;
  return feet <= option.range[1];
}

function acOf(game, c) {
  return c.side === 'hero' ? armorClass(game.character).value : findMonster(c.monsterId).ac;
}

// What the hero sees before committing to an attack: in range, the chance to hit, and why.
export function attackPreview(game, optionId, targetId) {
  const battle = game.battle;
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  const target = combatantById(battle, targetId);
  const hero = heroCombatant(battle);
  if (!option || !target) return null;
  const { advantage, disadvantage } = attackConditions(game, hero, target, option);
  const mode = advantage.length && !disadvantage.length ? 'advantage' : disadvantage.length && !advantage.length ? 'disadvantage' : 'normal';
  const bonus = option.modifiers.reduce((s, m) => s + m.value, 0);
  const preview = { option, target, inRange: inRange(hero, target, option), advantage, disadvantage, mode };
  if (option.how === 'save') {
    const save = findMonster(target.monsterId).saves[option.saveAbility] || 0;
    preview.chance = 1 - Math.min(1, Math.max(0, (21 - (option.saveDc - save)) / 20));
    preview.describe = `${target.name} makes a ${option.saveAbility} save against DC ${option.saveDc}`;
  } else if (option.how === 'darts') {
    preview.chance = 1;
    preview.describe = `Never misses: ${option.darts} darts`;
  } else {
    const criticalOn = option.criticalOn || 20;
    preview.chance = hitChance(bonus, acOf(game, target), mode, criticalOn);
    preview.describe = `${option.how === 'rays' ? `${option.rays} rays, each ` : ''}+${bonus} to hit against AC ${acOf(game, target)}`;
    if (criticalOn < 20) preview.describe += ` · Critical Hit on ${criticalOn}–20`;
  }
  if (option.potent) preview.describe += ` · half damage even on a ${option.how === 'save' ? 'save' : 'miss'} (Potent Cantrip)`;
  return preview;
}

export function heroAttack(game, optionId, targetId) {
  requireHeroTurn(game);
  const battle = game.battle;
  if (battle.turnState.action) throw new Error('You have already used your action this turn.');
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (option && option.source === 'spell' && battle.turnState.surged) throw new Error("Action Surge's extra action can't be used to cast a spell.");
  const target = combatantById(battle, targetId);
  if (!option) throw new Error(`You can't attack with ${optionId} right now.`);
  if (!target || target.side !== 'enemy' || target.hp <= 0) throw new Error('Choose a foe to attack.');
  const hero = heroCombatant(battle);
  if (!inRange(hero, target, option)) throw new Error(`${target.name} is out of range.`);
  battle.turnState.action = true;
  battle.turnState.athleteMove = 0;
  if (option.slotLevel) spendSlot(game, option.slotLevel);
  const { critical } = performAttack(game, hero, target, option);
  checkEnd(game);
  // Champion: straight after a Critical Hit, move up to half your Speed without provoking.
  if (critical && !battle.outcome && battle.heroState === 'up' && hasFeature(game.character, 'remarkable-athlete')) {
    battle.turnState.athleteMove = Math.floor(heroSpeed(game.character).value / 2 / 5) * 5;
    log(game, `Remarkable Athlete: you can move up to ${battle.turnState.athleteMove} feet straight away without provoking Opportunity Attacks.`);
  }
}

// The nearest foe still standing that an attack can reach, or null.
function nextFoe(game, attacker, option) {
  const foes = enemies(game.battle).filter((c) => c.hp > 0 && inRange(attacker, c, option));
  return foes.sort((a, b) => feetBetween(attacker.pos, a.pos) - feetBetween(attacker.pos, b.pos))[0] || null;
}

// Resolves an attack or attack spell from one combatant on another, and logs it.
// Returns { critical }: whether it scored a Critical Hit.
function performAttack(game, attacker, target, option) {
  const battle = game.battle;
  const you = attacker.side === 'hero';
  const who = you ? 'You' : attacker.name;
  const whom = target.side === 'hero' ? 'you' : target.name;

  if (option.how === 'darts') {
    const darts = option.darts;
    let total = 0;
    const rolls = [];
    for (let i = 0; i < darts; i++) {
      const dart = rollDamage(game.rng, option.damage);
      rolls.push(dart.total);
      total += dart.total;
    }
    log(game, `${who} cast ${option.name}: ${darts} glowing darts strike ${whom} for ${rolls.join(' + ')} = ${total} force damage.`);
    applyDamage(game, target, total, { type: option.damage.type });
    return { critical: false };
  }

  // Scorching Ray: an attack roll for each ray. When the target falls, the rest go to the
  // nearest foe still standing in range.
  if (option.how === 'rays') {
    log(game, `${who} cast ${option.name}: ${option.rays} rays of fire streak out.`);
    let aim = target;
    let critical = false;
    for (let ray = 1; ray <= option.rays; ray++) {
      if (aim.hp <= 0) aim = nextFoe(game, attacker, option);
      if (!aim) break;
      const result = performAttack(game, attacker, aim, { ...option, how: 'ranged', name: `Ray ${ray}`, ray });
      critical = critical || result.critical;
    }
    return { critical };
  }

  if (option.how === 'save') {
    const save = monsterSave(game.rng, findMonster(target.monsterId), option.saveAbility, option.saveDc, hasEffect(battle, target.id, 'dodging') ? ['Dodging'] : []);
    if (save.success && option.potent) {
      halfDamage(game, target, option, `${who} cast ${option.name} at ${whom}, who saves`, save);
      return { critical: false };
    }
    if (save.success) {
      log(game, `${who} cast ${option.name} at ${whom}, who shrugs it off.`, { roll: save });
      return { critical: false };
    }
    const damage = rollDamage(game.rng, option.damage);
    log(game, `${who} cast ${option.name}: ${whom} fails the save and takes ${damageText(damage, option.damage.dice)} damage.`, { roll: save });
    applyDamage(game, target, damage.total, { type: damage.type });
    return { critical: false };
  }

  // A Goblin Boss can pull an ally into the way.
  const redirected = redirectAttack(game, target);
  if (redirected !== target) return performAttack(game, attacker, redirected, option);

  const { advantage, disadvantage } = attackConditions(game, attacker, target, option);
  const roll = attackRoll(game.rng, option, acOf(game, target), advantage, disadvantage);
  // Hitting an Unconscious creature from within 5 feet is a Critical Hit.
  const critical = roll.criticalHit || (roll.success && target.side === 'hero' && battle.heroState !== 'up' && isAdjacent(attacker.pos, target.pos));
  if (!roll.success && option.potent) {
    halfDamage(game, target, option, `${who} cast ${option.name} at ${whom}, and miss`, roll);
    return { critical: false };
  }
  if (!roll.success) {
    const tries = option.source === 'spell' ? `cast${you ? '' : 's'} ${option.name} at ${whom}` : `attack${you ? '' : 's'} ${whom} with ${option.name}`;
    if (option.ray) log(game, `${option.name} misses ${whom}.`, { roll });
    else log(game, `${who} ${tries}, and miss${you ? '' : 'es'}.`, { roll });
    return { critical: false };
  }
  const savage = option.savage && !battle.turnState.savageUsed && you;
  if (savage) battle.turnState.savageUsed = true;
  const damage = rollDamage(game.rng, option.damage, { critical, advantage: roll.mode === 'advantage', greatWeapon: option.greatWeapon, savage });
  const how = option.source === 'spell' ? `${option.name} hits ${whom}` : `${who} hit${you ? '' : 's'} ${whom} with ${option.name}`;
  const savaged = damage.savaged ? ' (Savage Attacker: rolled twice, kept the better)' : '';
  const improved = roll.criticalHit && roll.natural < 20 ? 'Critical hit (Improved Critical)! ' : '';
  const plus = option.damage.plus || null;
  const plusText = plus ? ` plus ${plus.amount} ${plus.type}` : '';
  log(game, `${improved || (critical ? 'Critical hit! ' : '')}${how}: ${damageText(damage, option.damage.dice)} damage${plusText}${savaged}.`, { roll });
  applyDamage(game, target, damage.total, { type: damage.type, critical, plus });
  if (option.rider && target.hp > 0) addRider(game, attacker, target, option);
  if (option.onHit && !battle.outcome) onHitCondition(game, target, option.onHit);
  return { critical };
}

// A condition a monster's hit gives, such as the Wolf's Bite knocking a Medium or smaller
// creature Prone.
function onHitCondition(game, target, { condition, maxSize }) {
  if (condition !== 'prone') throw new Error(`Unknown condition from a hit: ${condition}`);
  if (maxSize && SIZES.indexOf(sizeOf(game, target)) > SIZES.indexOf(maxSize)) return;
  if (isProne(game.battle, target.id) || (target.side === 'enemy' && target.hp <= 0)) return;
  knockProne(game, target);
  if (target.side === 'hero' && game.battle.heroState === 'up') log(game, 'You are knocked Prone.');
  else if (target.side === 'enemy') log(game, `${target.name} is knocked Prone.`);
}

// Redirect Attack (Goblin Boss reaction): when attacked, it swaps places with a Small or
// Medium ally within 5 feet, and the ally becomes the target instead. Returns who is attacked.
function redirectAttack(game, target) {
  const battle = game.battle;
  if (target.side !== 'enemy' || target.hp <= 0) return target;
  if (!(findMonster(target.monsterId).reactions || []).includes('redirect-attack')) return target;
  if (battle.reactionsUsed.includes(target.id) || hasEffect(battle, target.id, 'no-reactions')) return target;
  const allies = battle.combatants.filter(
    (c) => c !== target && c.side === 'enemy' && c.hp > 0 && isAdjacent(c.pos, target.pos) && ['small', 'medium'].includes(findMonster(c.monsterId).size),
  );
  if (allies.length === 0) return target;
  const ally = allies.sort((a, b) => b.hp - a.hp)[0];
  const swap = [
    { id: ally.id, from: { ...ally.pos }, path: [{ ...target.pos }] },
    { id: target.id, from: { ...target.pos }, path: [{ ...ally.pos }] },
  ];
  [ally.pos, target.pos] = [target.pos, ally.pos];
  battle.reactionsUsed.push(target.id);
  log(game, `${target.name} drags ${ally.name} into the way: Redirect Attack!`, {}, swap);
  return ally;
}

// Evoker's Potent Cantrip: a damaging cantrip that misses, or that the target saves against,
// still deals half its damage, with none of its other effects.
function halfDamage(game, target, option, what, roll) {
  const damage = rollDamage(game.rng, option.damage);
  const half = Math.floor(damage.total / 2);
  log(game, `${what}, but Potent Cantrip deals half damage: ${damageText(damage, option.damage.dice)}, halved to ${half}.`, { roll });
  applyDamage(game, target, half, { type: damage.type });
}

function addRider(game, attacker, target, option) {
  const battle = game.battle;
  if (option.rider === 'slowed') {
    battle.effects.push({ kind: 'slowed', target: target.id, endsOn: attacker.id });
    log(game, `${target.name} is slowed by frost: Speed −10 feet until your next turn.`);
  } else if (option.rider === 'no-reactions') {
    battle.effects.push({ kind: 'no-reactions', target: target.id, endsOn: target.id });
    log(game, `${target.name} can't take Opportunity Attacks until its next turn.`);
  } else if (option.rider === 'no-healing') {
    battle.effects.push({ kind: 'no-healing', target: target.id, endsOn: attacker.id });
  }
}

// A monster's immunities, vulnerabilities and resistances change the damage it takes.
function monsterDamage(game, target, amount, type) {
  const monster = findMonster(target.monsterId);
  if ((monster.immunities || []).includes(type)) {
    log(game, `${target.name} is immune to ${type} damage.`);
    return 0;
  }
  if ((monster.vulnerabilities || []).includes(type)) {
    log(game, `${target.name} is vulnerable to ${type} damage: ${amount} becomes ${amount * 2}.`);
    return amount * 2;
  }
  if ((monster.resistances || []).includes(type)) {
    log(game, `${target.name} resists ${type} damage: ${amount} becomes ${Math.floor(amount / 2)}.`);
    return Math.floor(amount / 2);
  }
  return amount;
}

// Damage of one type, plus any flat extra of another type (plus: { amount, type }).
function applyDamage(game, target, amount, damage) {
  takeHit(game, target, amount, damage);
  rescene(game);
}

function takeHit(game, target, amount, { type, critical = false, plus = null }) {
  const battle = game.battle;
  if (target.side === 'enemy') {
    if (target.hp <= 0) return;
    const monster = findMonster(target.monsterId);
    const taken = monsterDamage(game, target, amount, type) + (plus ? monsterDamage(game, target, plus.amount, plus.type) : 0);
    // Undead Fortitude: a Constitution save (DC 5 + the damage) to stay up at 1 Hit Point,
    // unless the damage is Radiant or from a Critical Hit.
    if (taken >= target.hp && (monster.traits || []).includes('undead-fortitude') && type !== 'radiant' && !critical) {
      const save = monsterSave(game.rng, monster, 'constitution', 5 + taken);
      if (save.success) {
        target.hp = 1;
        log(game, `${target.name} should fall, but doesn't: Undead Fortitude leaves it at 1 Hit Point.`, { roll: save });
        hymnHurt(game, target, taken);
        return;
      }
      log(game, `Undead Fortitude fails ${target.name}.`, { roll: save });
    }
    target.hp = Math.max(0, target.hp - taken);
    if (target.hp === 0) log(game, `${target.name} falls.`);
    if (taken > 0) hymnHurt(game, target, taken);
    return;
  }
  const resisted = heroResistances(game.character);
  const taken = damageAfterResistance(amount, type, resisted) + (plus ? damageAfterResistance(plus.amount, plus.type, resisted) : 0);
  if (taken < amount + (plus ? plus.amount : 0)) log(game, `You resist some of the damage: you take ${taken}.`);
  if (battle.heroState === 'up') {
    const overflow = taken - game.hp;
    game.hp = Math.max(0, game.hp - taken);
    if (game.hp === 0) {
      // Damage left over that equals your Hit Point maximum kills outright.
      if (overflow >= maxHp(game.character)) return heroDies(game, 'The blow is too much.');
      battle.heroState = 'down';
      battle.deathSaves = { successes: 0, failures: 0 };
      knockProne(game, target); // the Unconscious condition includes Prone
      log(game, 'You drop to 0 Hit Points and fall Unconscious.');
    }
    return;
  }
  // Damage while at 0 Hit Points: a failed death save (two for a Critical Hit).
  if (taken >= maxHp(game.character)) return heroDies(game, 'The blow is too much.');
  battle.deathSaves.failures += critical ? 2 : 1;
  battle.heroState = 'down';
  log(game, `You take damage while down: ${critical ? 'two death save failures' : 'a death save failure'}.`);
  if (battle.deathSaves.failures >= 3) heroDies(game, 'Your third death save fails.');
}

// ---- Death saves ----

function deathSave(game) {
  const battle = game.battle;
  const roll = d20Test({ rng: game.rng, kind: 'save', label: 'Death saving throw', target: { type: 'DC', value: 10 } });
  if (roll.natural === 20) {
    game.hp = 1;
    battle.heroState = 'up';
    battle.deathSaves = { successes: 0, failures: 0 };
    log(game, `A natural 20! You gasp and come to with 1 Hit Point${isProne(battle, 'hero') ? ', still on the ground' : ''}.`, { roll });
    return;
  }
  if (roll.natural === 1) battle.deathSaves.failures += 2;
  else if (roll.success) battle.deathSaves.successes += 1;
  else battle.deathSaves.failures += 1;
  const { successes, failures } = battle.deathSaves;
  log(game, `Death saving throw: ${successes} success${successes === 1 ? '' : 'es'}, ${failures} failure${failures === 1 ? '' : 's'}.`, { roll });
  if (failures >= 3) heroDies(game, 'Your third death save fails.');
  else if (successes >= 3) {
    battle.heroState = 'stable';
    log(game, 'You stop bleeding: you are stable, but still Unconscious.');
    endBattle(game, 'defeat');
  }
}

function heroDies(game, reason) {
  game.battle.heroState = 'dead';
  log(game, `${reason} Darkness takes you.`);
  endBattle(game, 'defeat');
}

// ---- Bonus actions and other actions ----

export function heroDash(game) {
  heroUseAction(game, 'Dash');
  game.battle.turnState.movementLeft += speedOf(game, heroCombatant(game.battle));
  log(game, 'You Dash: double movement this turn.');
}

export function heroDisengage(game) {
  heroUseAction(game, 'Disengage');
  game.battle.turnState.disengaged = true;
  log(game, 'You Disengage: you can move without provoking Opportunity Attacks this turn.');
}

export function heroDodge(game) {
  heroUseAction(game, 'Dodge');
  game.battle.effects.push({ kind: 'dodging', target: 'hero', endsOn: 'hero' });
  log(game, 'You Dodge: attacks against you have Disadvantage until your next turn.');
}

function heroUseAction(game, name) {
  requireHeroTurn(game);
  if (game.battle.turnState.action) throw new Error(`You have already used your action, so you can't ${name}.`);
  game.battle.turnState.action = true;
  game.battle.turnState.athleteMove = 0;
}

function heroUseBonus(game, name) {
  requireHeroTurn(game);
  if (game.battle.turnState.bonus) throw new Error(`You have already used your Bonus Action, so you can't ${name}.`);
  game.battle.turnState.bonus = true;
  game.battle.turnState.athleteMove = 0;
}

// Fighter level 2, Action Surge: one more action this turn, though not to cast a spell.
// Offered once the turn's action is used. One use per Short or Long Rest.
export function heroCanSurge(game) {
  const turn = game.battle && game.battle.turnState;
  return Boolean(isHeroTurn(game) && hasFeature(game.character, 'action-surge') && featureUsesLeft(game, 'action-surge') > 0 && turn.action && !turn.surged);
}

export function heroActionSurge(game) {
  requireHeroTurn(game);
  const turn = game.battle.turnState;
  if (!hasFeature(game.character, 'action-surge')) throw new Error('Action Surge comes at Fighter level 2.');
  if (featureUsesLeft(game, 'action-surge') < 1) throw new Error('Action Surge is spent until you rest.');
  if (!turn.action) throw new Error('Use your action first: Action Surge gives you one more.');
  if (turn.surged) throw new Error('You have already used Action Surge this turn.');
  spendFeature(game, 'action-surge');
  turn.action = false;
  turn.surged = true;
  turn.athleteMove = 0;
  log(game, 'Action Surge! You push past your limits: one more action this turn.');
}

// Which bonus actions the hero has right now.
export function heroBonusActions(game) {
  const list = [];
  if (game.character.classId === 'fighter' && featureUsesLeft(game, 'second-wind') > 0) list.push('second-wind');
  if (hasItem(game, 'potion-of-healing')) list.push('potion');
  return list;
}

// Fighter: regain 1d10 + Fighter level Hit Points.
export function heroSecondWind(game) {
  if (!heroBonusActions(game).includes('second-wind')) throw new Error('No Second Wind left.');
  heroUseBonus(game, 'use Second Wind');
  spendFeature(game, 'second-wind');
  const roll = rollDice(game.rng, 1, 10);
  const level = Math.min(game.character.level, findClass('fighter').levels.length);
  const gained = heal(game, roll.total + level);
  log(game, `Second Wind: 1d10 (${roll.total}) + ${level} = ${roll.total + level}. You regain ${gained} Hit Points.`);
}

// Drink a Potion of Healing: regain 2d4 + 2 Hit Points.
export function heroDrinkPotion(game) {
  if (!hasItem(game, 'potion-of-healing')) throw new Error('You have no Potion of Healing.');
  heroUseBonus(game, 'drink a potion');
  removeItem(game.inventory, 'potion-of-healing', 1);
  const roll = rollDice(game.rng, 2, 4);
  const gained = heal(game, roll.total + 2);
  log(game, `You drink a Potion of Healing: 2d4 (${roll.rolls.join(', ')}) + 2 = ${roll.total + 2}. You regain ${gained} Hit Points.`);
}

// ---- Enemy turns ----

// Each monster fights to its behaviour profile (data/srd/monsters.js):
//   brute       closes in and attacks; throws or shoots only when it can't reach
//   skirmisher  shoots when it can't reach you this turn
//   coward      fights like a brute, but flees once Bloodied (at half its Hit Points or
//               fewer) if the encounter has a way out (its escape squares)
// A Prone monster stands up first. A monster singing a hymn does nothing but sing. The foes
// so far don't attack a hero who's down: each encounter says what they do instead (its
// whileHeroDown line).
function enemyTurn(game, c) {
  const battle = game.battle;
  const monster = findMonster(c.monsterId);
  const hero = heroCombatant(battle);
  const encounter = findEncounter(battle.encounterId);
  if (battle.heroState !== 'up') {
    const line = encounter.whileHeroDown || '{name} waits.';
    log(game, line.replace('{name}', c.name));
    return;
  }
  if (isProne(battle, c.id) && speedOf(game, c) > 0) standUp(game, c);
  if (battle.hymn && battle.hymn.singing && c === singerOf(battle)) {
    log(game, `${c.name} sings on, eyes closed, and the bones on the floor twitch in time.`);
    return;
  }
  if (monster.behaviour === 'coward' && encounter.escape && c.hp <= c.maxHp / 2) return flee(game, c, encounter.escape);
  const options = monsterAttackOptions(monster);
  const melee = options.find((o) => o.how === 'melee');
  const ranged = options.find((o) => o.how === 'ranged');
  // Multiattack: several attacks with the one action, stopping once the hero falls.
  const attackTimes = (option) => {
    for (let i = 0; i < (monster.multiattack || 1); i++) {
      if (battle.outcome || battle.heroState !== 'up' || c.hp <= 0) break;
      performAttack(game, c, hero, option);
    }
    return checkEnd(game);
  };

  if (melee && isAdjacent(c.pos, hero.pos)) return attackTimes(melee);
  const map = battleMap(battle);
  const crawling = isProne(battle, c.id);
  const reach = reachableSquares(map, c.pos, battle.turnState.movementLeft, blockedFor(game, c), { crawling });
  const closest = [...reach.values()].filter((s) => isAdjacent(s.pos, hero.pos)).sort((a, b) => a.cost - b.cost)[0];
  const prefersRanged = monster.behaviour === 'skirmisher' && ranged && inRange(c, hero, ranged);
  if (melee && closest && !prefersRanged) {
    moveAlong(game, c, closest.path);
    if (battle.outcome || c.hp <= 0) return checkEnd(game);
    return attackTimes(melee);
  }
  if (ranged && feetBetween(c.pos, hero.pos) <= ranged.range[0]) return attackTimes(ranged);
  // Too far: Dash towards the hero.
  battle.turnState.movementLeft += speedOf(game, c);
  const farther = reachableSquares(map, c.pos, battle.turnState.movementLeft, blockedFor(game, c), { crawling });
  const nearest = [...farther.values()].sort((a, b) => squaresBetween(a.pos, hero.pos) - squaresBetween(b.pos, hero.pos) || a.cost - b.cost)[0];
  if (nearest && nearest.path.length) moveAlong(game, c, nearest.path);
  return checkEnd(game);
}

// A Bloodied coward runs for the nearest way out, Dashing. If it gets there, it's gone.
function flee(game, c, exits) {
  const battle = game.battle;
  battle.turnState.movementLeft += speedOf(game, c);
  const reach = reachableSquares(battleMap(battle), c.pos, battle.turnState.movementLeft, blockedFor(game, c), { crawling: isProne(battle, c.id) });
  const steps = [...reach.values()];
  const out = steps.filter((s) => exits.some((e) => e.x === s.pos.x && e.y === s.pos.y)).sort((a, b) => a.cost - b.cost)[0];
  const nearest = (s) => Math.min(...exits.map((e) => squaresBetween(s.pos, e)));
  const toward = out || steps.sort((a, b) => nearest(a) - nearest(b) || a.cost - b.cost)[0];
  log(game, `${c.name} turns and runs!`);
  if (toward && toward.path.length) moveAlong(game, c, toward.path);
  if (c.hp > 0 && exits.some((e) => e.x === c.pos.x && e.y === c.pos.y)) {
    c.escaped = true;
    c.hp = 0;
    log(game, `${c.name} flees into the dark and is gone.`);
  }
  return checkEnd(game);
}

// ---- Ending ----

function checkEnd(game) {
  const battle = game.battle;
  if (battle.outcome) return;
  if (enemies(battle).every((c) => c.hp <= 0)) {
    // Foes that fled are worth nothing.
    battle.xp = enemies(battle).filter((c) => !c.escaped).reduce((sum, c) => sum + findMonster(c.monsterId).xp, 0);
    log(game, `Victory! The fight is over. (${battle.xp} XP)`);
    endBattle(game, 'victory');
  }
}

function endBattle(game, outcome) {
  game.battle.outcome = outcome;
}

// Called once the player has seen the end: banks XP, remembers the result for the story,
// and clears the fight. Returns { outcome, choiceIndex }.
export function finishBattle(game) {
  const battle = game.battle;
  if (!battle || !battle.outcome) throw new Error('The fight is not over yet.');
  if (battle.outcome === 'victory') game.xp += battle.xp;
  const escaped = enemies(battle).filter((c) => c.escaped).map((c) => c.monsterId);
  game.lastBattle = { encounterId: battle.encounterId, outcome: battle.outcome, escaped };
  game.battle = null;
  return { outcome: battle.outcome, choiceIndex: battle.choiceIndex };
}

// Checks a saved fight's shape, for loading saves.
export function battleOk(battle) {
  return Boolean(
    battle &&
      findEncounter(battle.encounterId) &&
      Number.isInteger(battle.choiceIndex) &&
      Number.isInteger(battle.round) &&
      Array.isArray(battle.order) &&
      Number.isInteger(battle.turn) &&
      Array.isArray(battle.combatants) &&
      battle.combatants.every((c) => c && c.pos && Number.isInteger(c.pos.x) && Number.isInteger(c.pos.y)) &&
      battle.turnState &&
      Array.isArray(battle.effects) &&
      Array.isArray(battle.log) &&
      ['up', 'down', 'stable', 'dead'].includes(battle.heroState),
  );
}

export { heroAttackOptions };

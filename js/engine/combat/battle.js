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
//   turnState    { movementLeft, action, bonus, disengaged, savageUsed, surged, athleteMove,
//                slotSpent } for the current turn: surged after Action Surge; athleteMove is
//                the free move Remarkable Athlete gives straight after a Critical Hit (feet,
//                or 0); slotSpent once a spell slot has been used (one a turn)
//   effects      [{ kind, target, endsOn, endsAt, fromRound, concentration, dc, untilRound }]:
//                'dodging', 'slowed', 'no-reactions', 'no-healing' and 'shield' last until
//                the start of endsOn's next turn; 'poisoned' and 'guided' (endsAt 'end')
//                until the end of endsOn's next turn after fromRound; 'prone' until the
//                creature stands up; the spell conditions 'drowsy', 'asleep', 'paralyzed'
//                and 'outlined' (see "Spell conditions" below), which last while the hero
//                concentrates (concentration true), the first three carrying the DC of the
//                save that ends them; and the hero's wards (see "Wards" below): 'blessed'
//                (concentration) and 'sanctuary' (with the DC foes save against, until the
//                start of the hero's turn in untilRound)
//   concentration  the spell the hero is concentrating on: { spellId, name }, or null
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
import { d20Test, retarget, startD20Count, stopD20Count } from '../rules/d20-test.js';
import { rollDice, rollDie } from '../rules/dice.js';
import { armorClass, findAbility, findClass, hasFeature, initiative as heroInitiative, savingThrow, speed as heroSpeed } from '../character/sheet.js';
import { heal, featureUsesLeft, maxHp, slotsLeft, spendFeature, spendSlot } from '../character/resources.js';
import { activeSpellIds, castSelfSpell, soakDamage } from '../character/spell-effects.js';
import { canCastSpell, findSpell, freeCastKey, freeCastsLeft } from '../character/spells.js';
import { spellSaveDc } from '../character/casting.js';
import { takeUndoPoint } from '../save/undo.js';
import { hasItem, removeItem } from '../character/inventory.js';
import { SQUARE_FEET, cellAt, feetBetween, inBounds, isAdjacent, isStandable, key, parseMap, reachableSquares, squaresBetween, stepCost } from './grid.js';
import { areaSquares, DIRECTIONS, findDirection, lineOfEffect } from './areas.js';
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

// ---- Spell conditions (SRD 5.2.1, Rules Glossary) ----
//   'poisoned'   Ray of Sickness: Disadvantage on attack rolls
//   'drowsy'     Sleep, at first: Incapacitated (no actions, Bonus Actions or reactions)
//                until the end of its next turn, when it saves again or falls asleep
//   'asleep'     Sleep, after a second failed save: Unconscious (Incapacitated and Prone,
//                Speed 0, fails Strength and Dexterity saves; attacks against it have
//                Advantage, and a hit from within 5 feet is a Critical Hit). Damage wakes it,
//                and so does an ally shaking it as an action.
//   'paralyzed'  Hold Person: as Unconscious but not Prone, and a Wisdom save at the end of
//                each of its turns ends it
//   'outlined'   Faerie Fire: attack rolls against it have Advantage
//   'guided'     Guiding Bolt: the next attack roll against it has Advantage (the roll uses
//                it up), until the end of the caster's next turn
// An Incapacitated singer can't sing (it can't speak), so the hymn stops.
const INCAPACITATING = ['drowsy', 'asleep', 'paralyzed'];
export const isIncapacitated = (battle, id) => battle.effects.some((e) => e.target === id && INCAPACITATING.includes(e.kind));
const isHelpless = (battle, id) => hasEffect(battle, id, 'asleep') || hasEffect(battle, id, 'paralyzed');
const autoFails = (battle, c, abilityId) => c.side === 'enemy' && isHelpless(battle, c.id) && ['strength', 'dexterity'].includes(abilityId);

// ---- Wards (spells the hero casts on themselves for the fight) ----
//   'blessed'    Bless: the hero adds 1d4 to attack rolls and saving throws while they
//                concentrate
//   'sanctuary'  Sanctuary: a foe that attacks the hero must first make a Wisdom save, or the
//                attack is lost. It ends when the hero attacks, casts a spell or deals
//                damage, or after a minute (10 rounds).

// Conditions on a creature, for the battle screen: e.g. ['asleep', 'poisoned'].
const SHOWN = ['drowsy', 'asleep', 'paralyzed', 'poisoned', 'outlined', 'guided', 'shield', 'dodging', 'blessed', 'sanctuary'];
export function conditionsOf(battle, id) {
  return SHOWN.filter((kind) => hasEffect(battle, id, kind));
}

// Can this creature take a reaction now (an Opportunity Attack, Redirect Attack)?
function canReact(game, c) {
  const battle = game.battle;
  return upright(game, c) && !isIncapacitated(battle, c.id) && !battle.reactionsUsed.includes(c.id) && !hasEffect(battle, c.id, 'no-reactions');
}

// Reactions the game takes for the hero: Shield, cast when it would turn a hit into a miss,
// and Hellish Rebuke, cast with its free use when a foe hurts the hero. The Settings screen
// turns each on or off (see setReactionPolicy).
const reactionPolicy = { shield: true, rebuke: true };
export function setReactionPolicy(policy) {
  Object.assign(reactionPolicy, policy);
}

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

const replays = new WeakMap(); // log line → { scene, moves, area }
const walking = new WeakMap(); // battle → the walk in progress: { id, from, path }

// Writes a line in the fight log. show, for the replay: moves, creatures shifted outside a
// walk ({ id, from, path, teleport }: Redirect Attack's swap, a push, Misty Step); area, the
// squares a spell covered.
function log(game, text, extra = {}, { moves = [], area = null } = {}) {
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
  replays.set(entry, { scene: battleScene(game), moves: [...walked, ...moves], area });
}

// A line in the fight log from outside the fight's own rules (spending Heroic Inspiration).
export function addLogLine(game, text) {
  log(game, text);
}

// What a log line remembers for the replay ({ scene, moves, area }), or null for a line from a
// save.
export const replayOf = (entry) => replays.get(entry) || null;

// Where everyone is and how they're doing right now: the round, whose turn it is, the hero's
// state and concentration, and each creature's square, Hit Points (and the hero's Temporary
// Hit Points), conditions, and whether it's Prone or has fled.
export function battleScene(game) {
  const battle = game.battle;
  return {
    round: battle.round,
    actor: battle.order.length ? battle.order[battle.turn] : null,
    heroState: battle.heroState,
    concentration: battle.concentration ? battle.concentration.name : null,
    units: battle.combatants.map((c) => ({
      id: c.id,
      pos: { ...c.pos },
      hp: hpOf(game, c),
      temp: c.side === 'hero' ? game.tempHp || 0 : 0,
      prone: isProne(battle, c.id),
      conditions: conditionsOf(battle, c.id),
      escaped: Boolean(c.escaped),
    })),
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
    concentration: null,
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

// Speed, with Longstrider, Ray of Frost's slowing, and 0 for the Unconscious and Paralyzed.
function speedOf(game, c) {
  if (isHelpless(game.battle, c.id)) return 0;
  const base = c.side === 'hero' ? heroSpeed(game.character, activeSpellIds(game)).value : findMonster(c.monsterId).speed;
  return Math.max(0, base - (hasEffect(game.battle, c.id, 'slowed') ? 10 : 0));
}

function beginTurn(game) {
  const battle = game.battle;
  const c = currentCombatant(battle);
  battle.effects = battle.effects.filter((e) => e.endsOn !== c.id || e.endsAt === 'end');
  battle.reactionsUsed = battle.reactionsUsed.filter((id) => id !== c.id);
  battle.turnState = { movementLeft: speedOf(game, c), action: false, bonus: false, disengaged: false, savageUsed: false, surged: false, athleteMove: 0, slotSpent: false };
  log(game, c.side === 'hero' ? 'Your turn.' : `${c.name}'s turn.`, { turnOf: c.id });
  const ward = battle.effects.find((e) => e.target === c.id && e.kind === 'sanctuary');
  if (ward && battle.round >= ward.untilRound) {
    battle.effects.splice(battle.effects.indexOf(ward), 1);
    log(game, 'Your Sanctuary fades: its minute is up.');
  }
  if (c.side === 'hero' && battle.heroState === 'down') deathSave(game);
}

function advanceTurn(game) {
  const battle = game.battle;
  endOfTurn(game, currentCombatant(battle));
  if (battle.outcome) return;
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
  checkEnd(game); // a Hellish Rebuke on the way can finish the fight
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
          if (foe.side === mover.side || !canReact(game, foe)) continue;
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
  if (attacker.side === 'hero') breakSanctuary(game, 'you attack');
  performAttack(game, attacker, target, options[0]);
}

// ---- Attacking ----

// Advantage and Disadvantage on an attack, with the reasons.
function attackConditions(game, attacker, target, option) {
  const battle = game.battle;
  const advantage = [];
  const disadvantage = [];
  const is = (c) => (c.side === 'hero' ? 'You are' : `${c.name} is`);
  if (hasEffect(battle, target.id, 'dodging')) disadvantage.push(`${is(target)} Dodging`);
  if (option.how === 'ranged' || option.how === 'rays') {
    if (feetBetween(attacker.pos, target.pos) > option.range[0]) disadvantage.push('Long range');
    const foeNearby = battle.combatants.some((c) => c.side !== attacker.side && upright(game, c) && !isIncapacitated(battle, c.id) && isAdjacent(c.pos, attacker.pos));
    if (foeNearby) disadvantage.push('An enemy is within 5 feet');
  }
  if (option.heavyDisadvantage) disadvantage.push('Heavy weapon without the Strength or Dexterity 13 it needs');
  if (target.side === 'hero' && battle.heroState !== 'up') advantage.push('You are Unconscious');
  if (hasEffect(battle, target.id, 'asleep')) advantage.push(`${is(target)} Unconscious`);
  if (hasEffect(battle, target.id, 'paralyzed')) advantage.push(`${is(target)} Paralyzed`);
  if (hasEffect(battle, target.id, 'outlined')) advantage.push(`${is(target)} outlined by Faerie Fire`);
  if (hasEffect(battle, target.id, 'guided')) advantage.push(`${is(target)} lit by Guiding Bolt`);
  if (hasEffect(battle, attacker.id, 'poisoned')) disadvantage.push(`${is(attacker)} Poisoned`);
  if (isProne(battle, attacker.id)) disadvantage.push(`${is(attacker)} Prone`);
  if (isProne(battle, target.id)) {
    if (isAdjacent(attacker.pos, target.pos)) advantage.push(`${is(target)} Prone, within 5 feet`);
    else disadvantage.push(`${is(target)} Prone, and more than 5 feet away`);
  }
  // Pack Tactics: an ally of the attacker, not Incapacitated, within 5 feet of the target.
  if (attacker.side === 'enemy' && (findMonster(attacker.monsterId).traits || []).includes('pack-tactics')) {
    const ally = battle.combatants.some((c) => c !== attacker && c.side === attacker.side && upright(game, c) && !isIncapacitated(battle, c.id) && isAdjacent(c.pos, target.pos));
    if (ally) advantage.push('Pack Tactics');
  }
  return { advantage, disadvantage };
}

export function inRange(attacker, target, option) {
  const feet = feetBetween(attacker.pos, target.pos);
  if (option.how === 'melee') return feet <= option.reach;
  return feet <= option.range[1];
}

// Armor Class, with Mage Armor and the Shield spell for the hero.
function acOf(game, c) {
  if (c.side !== 'hero') return findMonster(c.monsterId).ac;
  const shield = hasEffect(game.battle, 'hero', 'shield') ? findSpell('shield').combat.acBonus : 0;
  return armorClass(game.character, activeSpellIds(game)).value + shield;
}

// Why a spell can't be aimed at this creature (Hold Person needs a Humanoid), or null.
function wrongTarget(option, target) {
  const monster = findMonster(target.monsterId);
  if (option.creatureType && !monster.type.startsWith(option.creatureType)) return `Not a ${option.creatureType}`;
  if (option.condition && (monster.conditionImmunities || []).includes(option.condition)) return `Can't be ${option.condition}`;
  return null;
}

// What the hero sees before committing to an attack: in range, the chance to hit, and why.
export function attackPreview(game, optionId, targetId) {
  const battle = game.battle;
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  const target = combatantById(battle, targetId);
  const hero = heroCombatant(battle);
  if (!option || !target || (option.targeting && option.targeting !== 'foe')) return null;
  const { advantage, disadvantage } = attackConditions(game, hero, target, option);
  const mode = advantage.length && !disadvantage.length ? 'advantage' : disadvantage.length && !advantage.length ? 'disadvantage' : 'normal';
  const bonus = option.modifiers.reduce((s, m) => s + m.value, 0);
  const preview = { option, target, inRange: inRange(hero, target, option), advantage, disadvantage, mode, invalid: null };
  if (option.how === 'save') {
    preview.invalid = wrongTarget(option, target);
    if (preview.invalid) preview.inRange = false;
    const save = findMonster(target.monsterId).saves[option.saveAbility] || 0;
    preview.chance = autoFails(battle, target, option.saveAbility) ? 1 : 1 - Math.min(1, Math.max(0, (21 - (option.saveDc - save)) / 20));
    preview.describe = `${target.name} makes a ${findAbility(option.saveAbility).name} save against DC ${option.saveDc}`;
  } else if (option.how === 'darts') {
    preview.chance = 1;
    preview.describe = `Never misses: ${option.darts} darts`;
  } else {
    // Bless adds 1d4: the chance is the average over its four faces.
    const criticalOn = option.criticalOn || 20;
    const ac = acOf(game, target);
    const blessed = hasEffect(battle, 'hero', 'blessed');
    preview.chance = blessed ? [1, 2, 3, 4].reduce((sum, d4) => sum + hitChance(bonus + d4, ac, mode, criticalOn), 0) / 4 : hitChance(bonus, ac, mode, criticalOn);
    preview.describe = `${option.how === 'rays' ? `${option.rays} rays, each ` : ''}+${bonus}${blessed ? ' + 1d4 (Bless)' : ''} to hit against AC ${ac}`;
    if (criticalOn < 20) preview.describe += ` · Critical Hit on ${criticalOn}–20`;
  }
  if (option.potent) preview.describe += ` · half damage even on a ${option.how === 'save' ? 'save' : 'miss'} (Potent Cantrip)`;
  return preview;
}

// Attacks a foe with a weapon, or casts a spell aimed at one creature. reroll: a Heroic
// Inspiration reroll plan for one of its d20s (see rules/inspiration.js), or null.
export function heroAttack(game, optionId, targetId, { reroll = null } = {}) {
  requireHeroTurn(game);
  const battle = game.battle;
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (!option) throw new Error(`You can't attack with ${optionId} right now.`);
  if (option.targeting && option.targeting !== 'foe') throw new Error(`${option.name} isn't aimed at a creature.`);
  checkCanAct(game, option);
  const target = combatantById(battle, targetId);
  if (!target || target.side !== 'enemy' || target.hp <= 0) throw new Error('Choose a foe to attack.');
  const hero = heroCombatant(battle);
  if (!inRange(hero, target, option)) throw new Error(`${target.name} is out of range.`);
  const wrong = option.how === 'save' ? wrongTarget(option, target) : null;
  if (wrong) throw new Error(`${option.name} can't be cast on ${target.name}: ${wrong.toLowerCase()}.`);
  // With Heroic Inspiration in hand, keep an undo point: a missed attack roll can be rerolled.
  takeUndoPoint(game, 'attack', { attack: { optionId, targetId }, logLength: battle.log.length });
  startD20Count(reroll);
  let critical;
  try {
    useAction(game, option);
    if (option.concentration) startConcentration(game, option);
    ({ critical } = performAttack(game, hero, target, option));
    if (option.concentration) tidyConcentration(game);
    checkEnd(game);
  } finally {
    stopD20Count();
  }
  // Champion: straight after a Critical Hit, move up to half your Speed without provoking.
  if (critical && !battle.outcome && battle.heroState === 'up' && hasFeature(game.character, 'remarkable-athlete')) {
    battle.turnState.athleteMove = Math.floor(speedOf(game, hero) / 2 / 5) * 5;
    log(game, `Remarkable Athlete: you can move up to ${battle.turnState.athleteMove} feet straight away without provoking Opportunity Attacks.`);
  }
  if (game.undo) game.undo.after = battle.log.length;
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
    // The Unconscious and the Paralyzed fail Strength and Dexterity saves without a roll.
    const helpless = autoFails(battle, target, option.saveAbility);
    const save = helpless ? null : monsterSave(game.rng, findMonster(target.monsterId), option.saveAbility, option.saveDc, hasEffect(battle, target.id, 'dodging') ? ['Dodging'] : []);
    const fails = helpless ? `${whom} can't move to save itself` : `${whom} fails the save`;
    if (option.condition) {
      if (save && save.success) {
        log(game, `${who} cast ${option.name} at ${whom}, who resists it.`, { roll: save });
        return { critical: false };
      }
      log(game, `${who} cast ${option.name}: ${fails}.`, { roll: save });
      applyCondition(game, target, option.condition, { concentration: option.concentration, dc: option.saveDc });
      return { critical: false };
    }
    if (save && save.success && option.potent) {
      halfDamage(game, target, option, `${who} cast ${option.name} at ${whom}, who saves`, save);
      return { critical: false };
    }
    if (save && save.success) {
      log(game, `${who} cast ${option.name} at ${whom}, who shrugs it off.`, { roll: save });
      return { critical: false };
    }
    const damage = rollDamage(game.rng, option.damage);
    log(game, `${who} cast ${option.name}: ${fails} and takes ${damageText(damage, option.damage.dice)} damage.`, { roll: save });
    applyDamage(game, target, damage.total, { type: damage.type });
    return { critical: false };
  }

  // Sanctuary: a foe must make a Wisdom save to attack the hero, or the attack is lost.
  const ward = target.side === 'hero' && !you ? battle.effects.find((e) => e.target === 'hero' && e.kind === 'sanctuary') : null;
  if (ward) {
    const save = monsterSave(game.rng, findMonster(attacker.monsterId), 'wisdom', ward.dc);
    if (!save.success) {
      log(game, `${attacker.name} goes for you with its ${option.name}, then falters: Sanctuary turns it aside.`, { roll: save });
      return { critical: false };
    }
    log(game, `${attacker.name} pushes past your Sanctuary.`, { roll: save });
  }

  // A Goblin Boss can pull an ally into the way.
  const redirected = redirectAttack(game, target);
  if (redirected !== target) return performAttack(game, attacker, redirected, option);

  const { advantage, disadvantage } = attackConditions(game, attacker, target, option);
  const blessed = you ? blessing(game) : [];
  const rolled = blessed.length ? { ...option, modifiers: [...option.modifiers, ...blessed] } : option;
  let roll = attackRoll(game.rng, rolled, acOf(game, target), advantage, disadvantage);
  if (you) roll.yours = true; // the hero's own roll, which Heroic Inspiration can reroll
  // Guiding Bolt's light is used up by the first attack roll against its target.
  battle.effects = battle.effects.filter((e) => !(e.target === target.id && e.kind === 'guided'));
  if (target.side === 'hero' && roll.success && !roll.criticalHit) roll = castShield(game, roll);
  // Hitting an Unconscious or Paralyzed creature from within 5 feet is a Critical Hit.
  const helpless = target.side === 'hero' ? battle.heroState !== 'up' : isHelpless(battle, target.id);
  const critical = roll.criticalHit || (roll.success && helpless && isAdjacent(attacker.pos, target.pos));
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
  applyDamage(game, target, damage.total, { type: damage.type, critical, plus, from: attacker });
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
  if (!canReact(game, target)) return target;
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
  log(game, `${target.name} drags ${ally.name} into the way: Redirect Attack!`, {}, { moves: swap });
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
  } else if (option.rider === 'poisoned') {
    // Until the end of the caster's next turn.
    if (applyCondition(game, target, 'poisoned', { endsOn: attacker.id, endsAt: 'end', fromRound: battle.round })) {
      log(game, `${target.name} is Poisoned: Disadvantage on its attacks until the end of your next turn.`);
    }
  } else if (option.rider === 'no-healing') {
    battle.effects.push({ kind: 'no-healing', target: target.id, endsOn: attacker.id });
  } else if (option.rider === 'guided') {
    // Until the end of the caster's next turn.
    battle.effects = battle.effects.filter((e) => !(e.target === target.id && e.kind === 'guided'));
    battle.effects.push({ kind: 'guided', target: target.id, endsOn: attacker.id, endsAt: 'end', fromRound: battle.round });
    log(game, `${target.name} glitters with light: the next attack roll against it has Advantage.`);
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

// Damage of one type, plus any flat extra of another type (plus: { amount, type }). from: the
// creature that dealt it, if it can be paid back (Hellish Rebuke).
function applyDamage(game, target, amount, damage) {
  const before = target.side === 'hero' ? game.hp + (game.tempHp || 0) : 0;
  takeHit(game, target, amount, damage);
  rescene(game);
  if (target.side === 'hero' && damage.from && game.hp + (game.tempHp || 0) < before) hellishRebuke(game, damage.from);
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
    // Damage ends Sleep on a creature.
    if (taken > 0 && target.hp > 0) wake(game, target, `${target.name} wakes with a start.`);
    return;
  }
  const resisted = heroResistances(game.character);
  const taken = damageAfterResistance(amount, type, resisted) + (plus ? damageAfterResistance(plus.amount, plus.type, resisted) : 0);
  if (taken < amount + (plus ? plus.amount : 0)) log(game, `You resist some of the damage: you take ${taken}.`);
  if (battle.heroState === 'up') {
    // Temporary Hit Points go first.
    const { soaked, rest } = soakDamage(game, taken);
    if (soaked) log(game, rest ? `Your Temporary Hit Points take ${soaked} of it.` : `Your Temporary Hit Points take all ${soaked} of it.`);
    const overflow = rest - game.hp;
    game.hp = Math.max(0, game.hp - rest);
    if (game.hp === 0) {
      // Damage left over that equals your Hit Point maximum kills outright.
      if (overflow >= maxHp(game.character)) return heroDies(game, 'The blow is too much.');
      battle.heroState = 'down';
      battle.deathSaves = { successes: 0, failures: 0 };
      knockProne(game, target); // the Unconscious condition includes Prone
      log(game, 'You drop to 0 Hit Points and fall Unconscious.');
      if (battle.concentration) endConcentration(game, `Your concentration breaks: ${battle.concentration.name} ends.`);
      return;
    }
    if (taken > 0 && battle.concentration) concentrationCheck(game, taken);
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

// ---- Casting spells ----
// Rules: SRD 5.2.1, "Spells" ("Casting Spells"), "Concentration", the Rules Glossary's areas
// of effect and conditions, and each spell's own description (data/srd/spells.js).

// Before an attack or spell: is its action (or Bonus Action) free? You can spend only one
// spell slot on your turn, and Action Surge's extra action can't cast a spell.
function checkCanAct(game, option) {
  const turn = game.battle.turnState;
  if (option.bonusAction && turn.bonus) throw new Error('You have already used your Bonus Action this turn.');
  if (!option.bonusAction && turn.action) throw new Error('You have already used your action this turn.');
  if (option.source === 'spell' && !option.bonusAction && turn.surged) throw new Error("Action Surge's extra action can't be used to cast a spell.");
  if (option.slotLevel && turn.slotSpent) throw new Error('You can spend only one spell slot on your turn, and you already have.');
}

// Spends the action (or Bonus Action), and the spell slot (or free cast) unless it's already
// been spent.
function useAction(game, option, { slotAlreadySpent = false } = {}) {
  const turn = game.battle.turnState;
  if (option.bonusAction) turn.bonus = true;
  else turn.action = true;
  turn.athleteMove = 0;
  breakSanctuary(game, option.source === 'spell' ? 'you cast a spell' : 'you attack');
  if (option.freeCast && !slotAlreadySpent) game.featureUses[option.freeCast] = (game.featureUses[option.freeCast] || 0) + 1;
  if (option.slotLevel) {
    if (!slotAlreadySpent) spendSlot(game, option.slotLevel);
    turn.slotSpent = true;
  }
}

// Why a spell on the hero would do nothing now (healing at full Hit Points, a ward already
// up), or null.
function optionProblem(game, option) {
  if (option.how === 'heal' && game.hp >= maxHp(game.character)) return 'You’re at full Hit Points.';
  if (option.how === 'ward' && hasEffect(game.battle, 'hero', option.effect)) return `${findSpell(option.spellId).name} is already on you.`;
  return null;
}

// Why the hero can't use an attack or spell right now, or null if they can (for the battle
// screen to grey out its button).
export function heroCantUse(game, optionId) {
  if (!isHeroTurn(game)) return "It isn't your turn.";
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (!option) return 'You can’t use that now.';
  try {
    checkCanAct(game, option);
    return optionProblem(game, option);
  } catch (error) {
    return error.message;
  }
}

// Bless: while it's on the hero, each of their attack rolls and saving throws adds 1d4.
// Returns the modifier to add (one, or none).
function blessing(game) {
  if (!hasEffect(game.battle, 'hero', 'blessed')) return [];
  const roll = rollDie(game.rng, 4);
  return [{ label: 'Bless', value: roll, source: `Bless: 1d4 (${roll})` }];
}

// Sanctuary ends as soon as the hero attacks, casts a spell or deals damage.
function breakSanctuary(game, why) {
  const battle = game.battle;
  if (!hasEffect(battle, 'hero', 'sanctuary')) return;
  battle.effects = battle.effects.filter((e) => !(e.target === 'hero' && e.kind === 'sanctuary'));
  log(game, `Your Sanctuary ends: ${why}.`);
}

// A saving throw by the hero: to keep Concentration, or against their own Shatter.
function heroSave(game, abilityId, dc, label) {
  const ability = findAbility(abilityId);
  const modifiers = savingThrow(game.character, abilityId).parts.map((p) => ({ ...p, source: `${ability.name} saving throw` }));
  modifiers.push(...blessing(game));
  return d20Test({ rng: game.rng, kind: 'save', label: `${label} (${ability.name} save)`, modifiers, target: { type: 'DC', value: dc } });
}

// Concentration: one spell at a time. Starting another, dropping to 0 Hit Points, or failing a
// Constitution save after taking damage (DC 10 or half the damage, up to 30) ends it, and with
// it every effect it holds up.
function startConcentration(game, option) {
  const battle = game.battle;
  const name = findSpell(option.spellId).name;
  if (battle.concentration) endConcentration(game, `You let go of ${battle.concentration.name} to concentrate on ${name}.`);
  battle.concentration = { spellId: option.spellId, name };
}

function endConcentration(game, why, roll = null) {
  const battle = game.battle;
  if (!battle.concentration) return;
  battle.concentration = null;
  battle.effects = battle.effects.filter((e) => !e.concentration);
  log(game, why, roll ? { roll } : {});
}

// A concentration spell that no longer holds anyone has nothing left to do, and ends.
function tidyConcentration(game) {
  const battle = game.battle;
  if (battle.concentration && !battle.effects.some((e) => e.concentration)) {
    endConcentration(game, `${battle.concentration.name} holds nobody now, and ends.`);
  }
}

function concentrationCheck(game, damage) {
  const battle = game.battle;
  const name = battle.concentration.name;
  const dc = Math.min(30, Math.max(10, Math.floor(damage / 2)));
  const save = heroSave(game, 'constitution', dc, 'Concentration');
  if (save.success) log(game, `You hold your concentration on ${name}.`, { roll: save });
  else endConcentration(game, `Your concentration breaks: ${name} ends.`, save);
}

// Puts a spell's condition on a creature (Faerie Fire can catch the hero too), unless it's
// immune. Returns true if it took hold.
const CONDITION_NAMES = { poisoned: 'Poisoned', paralyzed: 'Paralyzed', drowsy: 'put to sleep', asleep: 'put to sleep', outlined: 'outlined' };
function applyCondition(game, target, kind, extra = {}) {
  const battle = game.battle;
  const monster = target.side === 'enemy' ? findMonster(target.monsterId) : null;
  if (monster && (monster.conditionImmunities || []).includes(kind)) {
    log(game, `${target.name} can't be ${CONDITION_NAMES[kind]}.`);
    return false;
  }
  battle.effects = battle.effects.filter((e) => !(e.target === target.id && e.kind === kind));
  battle.effects.push({ kind, target: target.id, endsOn: null, ...extra });
  if (kind === 'paralyzed') log(game, `${target.name} is Paralyzed: it can't move or act, attacks against it have Advantage, and a hit from within 5 feet is a Critical Hit.`);
  if (kind === 'drowsy') log(game, `${target.name}'s eyes droop: too drowsy to act until the end of its next turn, when it must save again or fall asleep.`);
  if (kind === 'outlined') {
    log(game, target.side === 'hero' ? 'Violet light outlines you: attacks against you have Advantage.' : `Violet light outlines ${target.name}: attacks against it have Advantage.`);
  }
  if (INCAPACITATING.includes(kind)) silenceSinger(game, target);
  return true;
}

// An Incapacitated singer can't sing, so the hymn stops.
function silenceSinger(game, c) {
  const battle = game.battle;
  if (battle.hymn && battle.hymn.singing && c === singerOf(battle)) {
    battle.hymn.singing = false;
    log(game, `The hymn falters: ${c.name} can't sing another note.`);
  }
}

// Sleep ends on a creature that takes damage or that an ally shakes awake. It stays Prone.
function wake(game, c, why) {
  const battle = game.battle;
  const sleeping = (e) => e.target === c.id && (e.kind === 'drowsy' || e.kind === 'asleep');
  if (!battle.effects.some(sleeping)) return;
  battle.effects = battle.effects.filter((e) => !sleeping(e));
  log(game, why);
  tidyConcentration(game);
}

// The end of a creature's turn: effects that last "until the end of your next turn" end, and
// a foe under Sleep or Hold Person makes its Wisdom save.
function endOfTurn(game, c) {
  const battle = game.battle;
  battle.effects = battle.effects.filter((e) => !(e.endsAt === 'end' && e.endsOn === c.id && e.fromRound < battle.round));
  if (c.side !== 'enemy' || c.hp <= 0) return;
  const monster = findMonster(c.monsterId);
  for (const effect of battle.effects.filter((e) => e.target === c.id && (e.kind === 'drowsy' || e.kind === 'paralyzed'))) {
    const save = monsterSave(game.rng, monster, 'wisdom', effect.dc);
    if (effect.kind === 'drowsy' && save.success) {
      battle.effects.splice(battle.effects.indexOf(effect), 1);
      log(game, `${c.name} shakes off the drowsiness.`, { roll: save });
    } else if (effect.kind === 'drowsy') {
      effect.kind = 'asleep';
      knockProne(game, c);
      log(game, `${c.name} slumps to the ground, fast asleep (Unconscious).`, { roll: save });
    } else if (save.success) {
      battle.effects.splice(battle.effects.indexOf(effect), 1);
      log(game, `${c.name} breaks free of Hold Person.`, { roll: save });
    } else {
      log(game, `${c.name} strains against the spell, and stays held.`, { roll: save });
    }
  }
  tidyConcentration(game);
}

// Shield, a reaction: when an attack hits the hero and +5 AC would make it miss, the game casts
// it with the lowest spell slot left, if the hero has it prepared, their reaction is free and
// Settings allow it. Returns the attack roll judged against the new AC.
function castShield(game, roll) {
  const battle = game.battle;
  if (!reactionPolicy.shield || !canReact(game, heroCombatant(battle)) || hasEffect(battle, 'hero', 'shield')) return roll;
  if (hasEffect(battle, 'hero', 'sanctuary')) return roll; // casting it would end Sanctuary
  if (!canCastSpell(game.character, 'shield')) return roll;
  const spell = findSpell('shield');
  let slot = null;
  for (let level = spell.level; level <= 9 && slot === null; level++) if (slotsLeft(game, level) > 0) slot = level;
  if (slot === null) return roll;
  const ac = acOf(game, heroCombatant(battle)) + spell.combat.acBonus;
  if (roll.total >= ac) return roll; // it would hit anyway: keep the slot
  spendSlot(game, slot);
  battle.reactionsUsed.push('hero');
  battle.effects.push({ kind: 'shield', target: 'hero', endsOn: 'hero' });
  log(game, `Shield! A shimmering barrier springs up (your reaction, a level ${slot} slot): your AC is ${ac} until your next turn.`);
  return retarget(roll, ac);
}

// Hellish Rebuke, a reaction: when a foe within 60 feet hurts the hero, the game casts it
// with its free use (a Tiefling's, once per Long Rest), if Settings allow and the hero's
// reaction is free. It never spends a spell slot, and never ends the hero's Sanctuary. The
// foe makes a Dexterity save and takes half the fire damage on a success.
function hellishRebuke(game, attacker) {
  const battle = game.battle;
  if (!reactionPolicy.rebuke || battle.outcome || attacker.side !== 'enemy' || attacker.hp <= 0) return;
  const hero = heroCombatant(battle);
  if (!canReact(game, hero) || hasEffect(battle, 'hero', 'sanctuary') || freeCastsLeft(game, 'hellish-rebuke') < 1) return;
  const spell = findSpell('hellish-rebuke');
  if (feetBetween(hero.pos, attacker.pos) > spell.combat.range) return;
  game.featureUses[freeCastKey(spell.id)] = (game.featureUses[freeCastKey(spell.id)] || 0) + 1;
  battle.reactionsUsed.push('hero');
  const damage = rollDamage(game.rng, spell.combat.damage);
  const dodging = hasEffect(battle, attacker.id, 'dodging') ? ['Dodging'] : [];
  const save = monsterSave(game.rng, findMonster(attacker.monsterId), 'dexterity', spellSaveDc(game.character, spell.id), dodging);
  const amount = save.success ? Math.floor(damage.total / 2) : damage.total;
  const halved = save.success ? `, halved to ${amount} by its Dexterity save` : '';
  log(game, `Hellish Rebuke! (your reaction, its free cast) Green flames engulf ${attacker.name}: ${damageText(damage, spell.combat.damage.dice)} damage${halved}.`, { roll: save });
  applyDamage(game, attacker, amount, { type: damage.type });
}

// The squares an area spell would cover aimed this way, and who's in them: { option, squares,
// caught }. aim: { direction } for a spell that starts from you (Burning Hands, Thunderwave),
// or { at: { x, y } } for one centred on a square within range (Shatter, Sleep). You're caught
// too if you're in the area, unless the spell only touches the creatures you choose.
export function areaFor(game, optionId, aim) {
  const battle = game.battle;
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (!option || !option.area) throw new Error(`${optionId} isn't an area spell you can cast now.`);
  const hero = heroCombatant(battle);
  const map = battleMap(battle);
  let squares;
  if (option.targeting === 'direction') {
    if (!aim || !findDirection(aim.direction)) throw new Error(`Choose which way to aim ${option.name}.`);
    squares = areaSquares(map, option.area, hero.pos, aim.direction);
  } else {
    const at = aim && aim.at;
    if (!at || !inBounds(map, at) || cellAt(map, at).terrain === 'wall') throw new Error(`Choose where to centre ${option.name}.`);
    if (feetBetween(hero.pos, at) > option.range[1]) throw new Error(`That's more than ${option.range[1]} feet away.`);
    if (!lineOfEffect(map, hero.pos, at)) throw new Error('A wall is in the way.');
    squares = areaSquares(map, option.area, at);
  }
  const inside = (pos) => squares.some((s) => s.x === pos.x && s.y === pos.y);
  const caught = battle.combatants.filter((c) => inside(c.pos) && (c.side === 'hero' ? !option.foesOnly : c.hp > 0 && !c.escaped));
  return { option, squares, caught };
}

// The best way to aim an area spell: the most foes, never catching you. An aim, or null if no
// aim catches a foe without you.
export function suggestAim(game, optionId) {
  const battle = game.battle;
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (!option || !option.area) return null;
  const hero = heroCombatant(battle);
  const map = battleMap(battle);
  const aims = [];
  if (option.targeting === 'direction') for (const d of DIRECTIONS) aims.push({ direction: d.id });
  else for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) aims.push({ at: { x, y } });
  let best = null;
  let bestScore = 0;
  for (const aim of aims) {
    let result;
    try {
      result = areaFor(game, optionId, aim);
    } catch {
      continue;
    }
    if (result.caught.some((c) => c.side === 'hero')) continue;
    const foes = result.caught.length;
    // More foes first; then, for a point, the nearer one.
    const score = foes * 100 - (aim.at ? squaresBetween(hero.pos, aim.at) : 0);
    if (foes > 0 && score > bestScore) {
      best = aim;
      bestScore = score;
    }
  }
  return best;
}

// Casts an area spell: Burning Hands, Thunderwave, Shatter or Sleep. Damage is rolled once for
// everyone in the area; each makes the save, and a save halves it (or, for Sleep, keeps it
// awake).
export function heroCastArea(game, optionId, aim) {
  requireHeroTurn(game);
  const battle = game.battle;
  const { option, squares, caught } = areaFor(game, optionId, aim);
  checkCanAct(game, option);
  useAction(game, option);
  if (option.concentration) startConcentration(game, option);
  const hero = heroCombatant(battle);
  const way = aim.direction ? `, to the ${findDirection(aim.direction).name}` : '';
  const damage = option.damage ? rollDamage(game.rng, option.damage) : null;
  log(game, `You cast ${option.name}${way}${damage ? `: ${damageText(damage, option.damage.dice)} damage` : ''}.`, {}, { area: squares });
  if (!caught.length) log(game, 'It catches nobody.');
  for (const c of caught) {
    if (battle.outcome) break;
    if (option.condition === 'drowsy') putToSleep(game, c, option);
    else if (option.damage) areaDamage(game, c, option, damage, hero);
    else areaCondition(game, c, option);
  }
  if (option.concentration) tidyConcentration(game);
  checkEnd(game);
}

function areaDamage(game, c, option, damage, hero) {
  const battle = game.battle;
  const you = c.side === 'hero';
  const ability = findAbility(option.saveAbility).name;
  const helpless = autoFails(battle, c, option.saveAbility);
  const dodging = option.saveAbility === 'dexterity' && hasEffect(battle, c.id, 'dodging') ? ['Dodging'] : [];
  let save = null;
  if (you) save = heroSave(game, option.saveAbility, option.saveDc, option.name);
  else if (!helpless) save = monsterSave(game.rng, findMonster(c.monsterId), option.saveAbility, option.saveDc, dodging);
  const saved = Boolean(save && save.success);
  const amount = saved ? (option.halfOnSave ? Math.floor(damage.total / 2) : 0) : damage.total;
  const s = you ? '' : 's';
  const who = you ? 'You' : c.name;
  let text;
  if (helpless) text = `${c.name} can't move to save itself, and takes ${amount} ${damage.type} damage.`;
  else if (saved) text = amount ? `${who} make${s} the ${ability} save and take${s} half: ${amount} ${damage.type} damage.` : `${who} make${s} the ${ability} save.`;
  else text = `${who} fail${s} the ${ability} save and take${s} ${amount} ${damage.type} damage.`;
  log(game, text, { roll: save });
  if (amount) applyDamage(game, c, amount, { type: damage.type });
  if (!saved && option.push && !you && c.hp > 0 && !battle.outcome) pushAway(game, c, hero.pos, option.push);
}

// Faerie Fire on one creature (the hero too, if they're inside it): a Dexterity save, or it's
// outlined in light.
function areaCondition(game, c, option) {
  const battle = game.battle;
  const you = c.side === 'hero';
  const ability = findAbility(option.saveAbility).name;
  const helpless = autoFails(battle, c, option.saveAbility);
  const dodging = option.saveAbility === 'dexterity' && hasEffect(battle, c.id, 'dodging') ? ['Dodging'] : [];
  let save = null;
  if (you) save = heroSave(game, option.saveAbility, option.saveDc, option.name);
  else if (!helpless) save = monsterSave(game.rng, findMonster(c.monsterId), option.saveAbility, option.saveDc, dodging);
  const who = you ? 'You' : c.name;
  const s = you ? '' : 's';
  if (save && save.success) {
    log(game, `${who} make${s} the ${ability} save.`, { roll: save });
    return;
  }
  log(game, helpless ? `${c.name} can't move to save itself.` : `${who} fail${s} the ${ability} save.`, { roll: save });
  applyCondition(game, c, option.condition, { concentration: option.concentration });
}

// Sleep on one foe: a creature that never sleeps (immune to Exhaustion) shrugs it off; the
// rest make a Wisdom save or grow drowsy.
function putToSleep(game, c, option) {
  const monster = findMonster(c.monsterId);
  if ((monster.conditionImmunities || []).includes('exhaustion')) {
    log(game, `${c.name} never sleeps, and the spell slides off it.`);
    return;
  }
  const save = monsterSave(game.rng, monster, 'wisdom', option.saveDc);
  if (save.success) {
    log(game, `${c.name} blinks the drowsiness away.`, { roll: save });
    return;
  }
  log(game, `${c.name} fails the Wisdom save.`, { roll: save });
  applyCondition(game, c, 'drowsy', { concentration: true, dc: option.saveDc });
}

// Pushes a creature straight away from a square, one square at a time, until it has gone the
// distance or something's in the way. Being pushed provokes no Opportunity Attacks.
function pushAway(game, c, from, feet) {
  const battle = game.battle;
  const map = battleMap(battle);
  const step = { x: Math.sign(c.pos.x - from.x), y: Math.sign(c.pos.y - from.y) };
  const start = { ...c.pos };
  const path = [];
  let at = c.pos;
  for (let i = 0; i < feet / SQUARE_FEET; i++) {
    const next = { x: at.x + step.x, y: at.y + step.y };
    const occupied = battle.combatants.some((o) => o !== c && o.pos.x === next.x && o.pos.y === next.y && (o.side === 'hero' || o.hp > 0));
    const corner = step.x && step.y && (!isStandable(map, { x: at.x + step.x, y: at.y }) || !isStandable(map, { x: at.x, y: at.y + step.y }));
    if (!isStandable(map, next) || occupied || corner) break;
    path.push(next);
    at = next;
  }
  if (!path.length) {
    log(game, `${c.name} is slammed back, but has nowhere to go.`);
    return;
  }
  c.pos = { ...at };
  log(game, `${c.name} is thrown back ${path.length * SQUARE_FEET} feet.`, {}, { moves: [{ id: c.id, from: start, path }] });
}

// A spell on the hero, cast as the turn's action (or Bonus Action): Mage Armor, False Life or
// Longstrider; Cure Wounds or Healing Word (see character/spell-effects.js); or a ward, Bless
// or Sanctuary.
export function heroCastSelf(game, optionId) {
  requireHeroTurn(game);
  const battle = game.battle;
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (!option || option.targeting !== 'self') throw new Error(`You can't cast ${optionId} on yourself right now.`);
  checkCanAct(game, option);
  const problem = optionProblem(game, option);
  if (problem) throw new Error(problem);
  if (option.how === 'ward') return castWard(game, option);
  const faster = option.speedBonus && !activeSpellIds(game).includes(option.spellId);
  const text = castSelfSpell(game, option.spellId, option.freeCast ? 'free' : option.slotLevel);
  useAction(game, option, { slotAlreadySpent: true });
  if (faster) battle.turnState.movementLeft += option.speedBonus; // quicker this very turn
  log(game, `You cast ${text}`);
}

// Bless (Concentration) or Sanctuary (a minute: 10 rounds), on the hero for the fight.
function castWard(game, option) {
  const battle = game.battle;
  useAction(game, option);
  if (option.concentration) startConcentration(game, option);
  if (option.effect === 'blessed') {
    battle.effects.push({ kind: 'blessed', target: 'hero', endsOn: null, concentration: true });
    log(game, `You cast ${findSpell(option.spellId).name}: while you concentrate, you add 1d4 to your attack rolls and saving throws.`);
  } else if (option.effect === 'sanctuary') {
    battle.effects.push({ kind: 'sanctuary', target: 'hero', endsOn: null, dc: option.saveDc, untilRound: battle.round + 10 });
    log(game, `You cast ${findSpell(option.spellId).name}: a foe must make a DC ${option.saveDc} Wisdom save to attack you. It ends if you attack, cast a spell or deal damage.`);
  } else {
    throw new Error(`Unknown ward: ${option.effect}`);
  }
}

// Where Misty Step can take the hero: an empty square they can see, within its range.
export function teleportSquares(game, optionId) {
  const battle = game.battle;
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (!option || option.how !== 'teleport') return [];
  const hero = heroCombatant(battle);
  const map = battleMap(battle);
  const squares = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const pos = { x, y };
      if ((x === hero.pos.x && y === hero.pos.y) || !isStandable(map, pos) || feetBetween(hero.pos, pos) > option.range[1]) continue;
      if (battle.combatants.some((c) => c.pos.x === x && c.pos.y === y && (c.side === 'hero' || c.hp > 0))) continue;
      if (lineOfEffect(map, hero.pos, pos)) squares.push(pos);
    }
  }
  return squares;
}

// Misty Step: a Bonus Action teleport, which provokes no Opportunity Attacks.
export function heroTeleport(game, optionId, pos) {
  requireHeroTurn(game);
  const option = heroAttackOptions(game).find((o) => o.id === optionId);
  if (!option || option.how !== 'teleport') throw new Error(`You can't cast ${optionId} right now.`);
  checkCanAct(game, option);
  if (!teleportSquares(game, optionId).some((s) => s.x === pos.x && s.y === pos.y)) throw new Error(`${option.name} can't take you there: it needs an empty square you can see within ${option.range[1]} feet.`);
  useAction(game, option);
  const hero = heroCombatant(game.battle);
  const from = { ...hero.pos };
  hero.pos = { ...pos };
  log(game, `You cast ${option.name}: silver mist swallows you, and you step out ${feetBetween(from, pos)} feet away.`, {}, { moves: [{ id: 'hero', from, path: [{ ...pos }], teleport: true }] });
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
  // Asleep, drowsy or held by Hold Person: no actions at all.
  if (isIncapacitated(battle, c.id)) {
    if (hasEffect(battle, c.id, 'asleep')) log(game, `${c.name} is fast asleep.`);
    else if (hasEffect(battle, c.id, 'paralyzed')) log(game, `${c.name} strains against the spell, frozen in place.`);
    else log(game, `${c.name} sways on its feet, too drowsy to act.`);
    return;
  }
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
  // A sleeping ally beside it, and you out of reach: it shakes the sleeper awake (its action).
  if (!isAdjacent(c.pos, hero.pos)) {
    const sleeper = enemies(battle).find((o) => o !== c && o.hp > 0 && isAdjacent(o.pos, c.pos) && (hasEffect(battle, o.id, 'asleep') || hasEffect(battle, o.id, 'drowsy')));
    if (sleeper) return wake(game, sleeper, `${c.name} shakes ${sleeper.name} awake.`);
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
  game.battle.concentration = null; // spells held up for the fight end with it
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

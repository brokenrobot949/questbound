// Quick Resolve (docs/DESIGN.md, "Quick resolve and speed"): a fight well under the hero's
// strength can be played out at once, with real rolls, instead of turn by turn. Story and boss
// fights (encounters marked byHand, or with a hymn) are always played by hand.
//
// "Well under": the monsters' XP adds up to no more than half the Low budget for one
// character of the hero's level (SRD 5.2.1, XP Budget per Character; data/srd/encounter-
// budget.js). In Chapter 1 that's a level 2 hero against a lone Wolf or Goblin Warrior, or the
// mill's two Goblin Minions.
//
// The hero fights the plain way. Each turn they stand up if they're Prone, close in if no foe
// is in reach, and attack the foe they'd hurt most, with a weapon or a cantrip (and with a
// second Light weapon, its extra attack, as the Light property allows). They never
// spend a spell slot, a free cast, Second Wind or a potion. If they're below half their Hit
// Points at the start of one of their turns, Resolve stops and hands the fight back.
// Everything goes through the fight's own rules (combat/battle.js), so it's logged and saved
// like any other turn.

import {
  addLogLine,
  attackPreview,
  clearShot,
  endHeroTurn,
  enemies,
  findEncounter,
  findMonster,
  heroAttack,
  heroAttackOptions,
  heroCanStand,
  heroCantUse,
  heroCombatant,
  heroMove,
  heroReachable,
  heroStandUp,
  inRange,
  isHeroTurn,
  isProne,
} from './battle.js';
import { parseDice } from './attacks.js';
import { squaresBetween } from './grid.js';
import { heroMaxHp } from '../character/resources.js';
import { xpBudgetPerCharacter } from '../../../data/srd/encounter-budget.js';

// Hero turns Resolve plays before it gives up and hands the fight back.
const MAX_TURNS = 30;

// The most XP of monsters a fight can have for Resolve to be offered, at a hero level.
export function resolveLimit(level) {
  const row = xpBudgetPerCharacter.find((r) => r.level === level) || xpBudgetPerCharacter[0];
  return row.low / 2;
}

const monstersXp = (battle) => enemies(battle).reduce((sum, c) => sum + findMonster(c.monsterId).xp, 0);
const belowHalf = (game) => game.hp * 2 < heroMaxHp(game);

// True if Resolve can be offered now: the hero's turn, a fight well under their strength
// that isn't played by hand, a weapon or cantrip to fight with, and at least half their Hit
// Points.
export function canResolve(game) {
  const battle = game.battle;
  if (!battle || battle.outcome || !isHeroTurn(game)) return false;
  const encounter = findEncounter(battle.encounterId);
  if (encounter.byHand || encounter.hymn || belowHalf(game)) return false;
  if (!plainAttacks(game).length) return false;
  return monstersXp(battle) <= resolveLimit(game.character.level);
}

// Plays the fight out. Returns { rounds, lost, stopped, outcome }: how many rounds it took,
// the Hit Points (and Temporary Hit Points) the hero lost, whether it stopped to hand the
// fight back, and how the fight ended (null if it hasn't).
export function resolveFight(game) {
  if (!canResolve(game)) throw new Error('This fight can’t be resolved: play it by hand.');
  const battle = game.battle;
  const health = () => game.hp + (game.tempHp || 0);
  const startHealth = health();
  const startRound = battle.round;
  addLogLine(game, 'You let the fight play itself out (Resolve).');
  let turns = 0;
  let stopped = null;
  while (isHeroTurn(game)) {
    if (turns > 0 && belowHalf(game)) stopped = 'You’re below half your Hit Points, so Resolve stops here: the fight is yours to play.';
    else if (turns >= MAX_TURNS) stopped = 'This is taking too long, so Resolve stops here: the fight is yours to play.';
    if (stopped) break;
    playTurn(game);
    turns += 1;
  }
  const rounds = battle.round - startRound + 1;
  const lost = Math.max(0, startHealth - health());
  const roundText = `${rounds} round${rounds === 1 ? '' : 's'}`;
  const lostText = lost ? `you lost ${lost} Hit Point${lost === 1 ? '' : 's'}` : 'you came through without a scratch';
  if (stopped) addLogLine(game, stopped);
  else if (battle.outcome === 'victory') addLogLine(game, `Resolved in ${roundText}: ${lostText}.`);
  else if (battle.outcome === 'defeat') addLogLine(game, `Resolved in ${roundText}, and it went badly: you fell.`);
  return { rounds, lost, stopped: Boolean(stopped), outcome: battle.outcome };
}

// One of the hero's turns, played plainly.
function playTurn(game) {
  if (isProne(game.battle, 'hero') && heroCanStand(game)) heroStandUp(game);
  let best = bestAttack(game);
  if (!best) {
    const step = approach(game);
    if (step) heroMove(game, step.pos);
    if (!isHeroTurn(game)) return; // the fight ended, or the hero fell, on the way
    best = bestAttack(game);
  }
  if (best) heroAttack(game, best.option.id, best.foe.id);
  // After a Light weapon, the extra attack with the other one (the action is spent, so it's
  // all that's left to attack with).
  const extra = isHeroTurn(game) && best ? bestAttack(game) : null;
  if (extra && extra.option.extra) heroAttack(game, extra.option.id, extra.foe.id);
  if (isHeroTurn(game)) endHeroTurn(game);
}

// Weapons and cantrips aimed at a foe: what Resolve fights with.
function plainAttacks(game) {
  return heroAttackOptions(game).filter((o) => o.damage && (o.source === 'weapon' || (o.source === 'spell' && o.spellLevel === 0 && o.targeting === 'foe')));
}

function averageOf(damage) {
  const { count, sides } = parseDice(damage.dice);
  return (count * (sides + 1)) / 2 + (damage.bonus || 0);
}

const standing = (game) => enemies(game.battle).filter((c) => c.hp > 0);

// Every attack the hero could make now on every foe still standing, with the damage it
// would do on average, counting the chance it hits (or that the foe fails its save):
// [{ option, foe, value, inRange }]. inRange: it can reach that foe from where the hero is.
function attacksOnFoes(game) {
  const list = [];
  for (const option of plainAttacks(game)) {
    if (heroCantUse(game, option.id)) continue;
    for (const foe of standing(game)) {
      const preview = attackPreview(game, option.id, foe.id);
      if (!preview || preview.invalid) continue;
      list.push({ option, foe, value: preview.chance * averageOf(option.damage) * (option.rays || 1), inRange: preview.inRange });
    }
  }
  return list;
}

// The attack that would hurt a foe most from where the hero stands: { option, foe }, or null.
function bestAttack(game) {
  const reachable = attacksOnFoes(game).filter((a) => a.inRange && a.value > 0);
  return reachable.sort((a, b) => b.value - a.value)[0] || null;
}

// Where to move: the square (within this turn's movement) the best attack can be made from,
// the cheapest of equals; or, if none, the one nearest a foe. Null if nowhere is better.
function approach(game) {
  const hero = heroCombatant(game.battle);
  const foes = standing(game);
  if (!foes.length) return null;
  const nearest = (pos) => Math.min(...foes.map((f) => squaresBetween(pos, f.pos)));
  const attacks = attacksOnFoes(game);
  let best = null;
  let bestValue = 0;
  for (const step of heroReachable(game).values()) {
    if (step.cost === 0) continue;
    for (const { option, foe, value } of attacks) {
      if (!value || !inRange({ pos: step.pos }, foe, option) || !clearShot(game, step.pos, foe.pos)) continue;
      if (value > bestValue || (value === bestValue && step.cost < best.cost)) {
        best = step;
        bestValue = value;
      }
    }
  }
  if (best) return best;
  const closer = [...heroReachable(game).values()].filter((s) => s.cost > 0 && nearest(s.pos) < nearest(hero.pos));
  return closer.sort((a, b) => nearest(a.pos) - nearest(b.pos) || a.cost - b.cost)[0] || null;
}

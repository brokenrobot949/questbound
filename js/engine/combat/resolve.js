// Quick Resolve (docs/DESIGN.md, "Quick resolve and speed"): a fight well under the party's
// strength can be played out at once, with real rolls, instead of turn by turn. Story and boss
// fights (encounters marked byHand, or with a hymn or reinforcements) are always played by hand.
//
// "Well under": the monsters' XP adds up to no more than half the Low budget of the party in
// the fight, at the hero's level (SRD 5.2.1, XP Budget per Character, times the number of the
// party: combat/difficulty.js). Alone, in Chapter 1, that's a level 2 hero against a lone Wolf
// or Goblin Warrior, or the mill's two Goblin Minions; with Odda and Fen it's three times as
// much.
//
// The hero fights the plain way. Each turn they stand up if they're Prone, close in if no foe
// is in reach, and attack the foe they'd hurt most, with a weapon or a cantrip (and with a
// second Light weapon, its extra attack, as the Light property allows). They never
// spend a spell slot, a free cast, Second Wind or a potion. Companions take their own turns as
// always (combat/companion-ai.js). If anyone in the party is below half their Hit Points at the
// start of one of the hero's turns, Resolve stops and hands the fight back.
// Everything goes through the fight's own rules (combat/battle.js), so it's logged and saved
// like any other turn.

import {
  actorGame,
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
  hpOf,
  inRange,
  isHero,
  isHeroTurn,
  isProne,
  maxHpOf,
  partyCombatants,
  stateOf,
} from './battle.js';
import { parseDice } from './attacks.js';
import { squaresBetween } from './grid.js';
import { partyBudget } from './difficulty.js';
import { namesText } from '../character/spell-effects.js';

// Hero turns Resolve plays before it gives up and hands the fight back.
const MAX_TURNS = 30;

// The most XP of monsters a fight can have for Resolve to be offered, at a hero level, for a
// party of `size` (the hero alone is 1).
export function resolveLimit(level, size = 1) {
  return partyBudget(level, size).low / 2;
}

const monstersXp = (battle) => enemies(battle).reduce((sum, c) => sum + findMonster(c.monsterId).xp, 0);

// The party in the fight: the hero, and every companion who isn't dead.
const theParty = (game) => partyCombatants(game.battle).filter((c) => stateOf(game.battle, c) !== 'dead');

// The first of the party below half their Hit Points (at 0, or under half their maximum), or
// null.
const belowHalf = (game) => theParty(game).find((c) => hpOf(game, c) * 2 < maxHpOf(game, c)) || null;

// True if Resolve can be offered now: the hero's turn, a fight well under the party's strength
// that isn't played by hand, a weapon or cantrip to fight with, and everyone in the party at
// half their Hit Points or more.
export function canResolve(game) {
  const battle = game.battle;
  if (!battle || battle.outcome || !isHeroTurn(game)) return false;
  const encounter = findEncounter(battle.encounterId);
  if (encounter.byHand || encounter.hymn || encounter.reinforcements || belowHalf(game)) return false;
  if (!plainAttacks(game).length) return false;
  return monstersXp(battle) <= resolveLimit(game.character.level, theParty(game).length);
}

// Plays the fight out. Returns { rounds, lost, losses, stopped, outcome }: how many rounds it
// took, the Hit Points (and Temporary Hit Points) the hero lost, what each of the party lost
// ([{ id, name, lost }], the hero first), whether it stopped to hand the fight back, and how
// the fight ended (null if it hasn't).
export function resolveFight(game) {
  if (!canResolve(game)) throw new Error('This fight can’t be resolved: play it by hand.');
  const battle = game.battle;
  const party = theParty(game);
  const health = (c) => hpOf(game, c) + (actorGame(game, c).tempHp || 0);
  const slotsSpent = (c) => (actorGame(game, c).slotsUsed || []).reduce((sum, n) => sum + (n || 0), 0);
  const before = party.map((c) => ({ c, health: health(c), slots: slotsSpent(c) }));
  const startRound = battle.round;
  addLogLine(game, 'You let the fight play itself out (Resolve).');
  let turns = 0;
  let stopped = null;
  while (isHeroTurn(game)) {
    const low = turns > 0 ? belowHalf(game) : null;
    if (low && isHero(low)) stopped = 'You’re below half your Hit Points, so Resolve stops here: the fight is yours to play.';
    else if (low) stopped = `${low.name} is ${stateOf(battle, low) === 'up' ? 'below half their Hit Points' : 'down'}, so Resolve stops here: the fight is yours to play.`;
    else if (turns >= MAX_TURNS) stopped = 'This is taking too long, so Resolve stops here: the fight is yours to play.';
    if (stopped) break;
    playTurn(game);
    turns += 1;
  }
  const rounds = battle.round - startRound + 1;
  const losses = before.map(({ c, health: was }) => ({ id: c.id, name: isHero(c) ? 'you' : c.name, lost: Math.max(0, was - health(c)) }));
  const roundText = `${rounds} round${rounds === 1 ? '' : 's'}`;
  if (stopped) addLogLine(game, stopped);
  else if (battle.outcome === 'victory') addLogLine(game, `Resolved in ${roundText}: ${lossText(losses)}.${slotText(before, slotsSpent)}`);
  else if (battle.outcome === 'defeat') addLogLine(game, `Resolved in ${roundText}, and it went badly: you fell.`);
  return { rounds, lost: losses[0].lost, losses, stopped: Boolean(stopped), outcome: battle.outcome };
}

// "you lost 6 Hit Points", "you lost 6 Hit Points and Fen lost 3", "nobody lost a Hit Point".
function lossText(losses) {
  const hurt = losses.filter((l) => l.lost > 0);
  const points = (n) => `${n} Hit Point${n === 1 ? '' : 's'}`;
  if (losses.length === 1) return hurt.length ? `you lost ${points(hurt[0].lost)}` : 'you came through without a scratch';
  if (!hurt.length) return 'nobody lost a Hit Point';
  return namesText(hurt.map((l, i) => `${l.name} lost ${i === 0 ? points(l.lost) : l.lost}`));
}

// " Odda spent a spell slot." for each companion whose healing used slots along the way.
function slotText(before, slotsSpent) {
  const spent = before.map(({ c, slots }) => ({ c, n: slotsSpent(c) - slots })).filter(({ n }) => n > 0);
  return spent.map(({ c, n }) => ` ${c.name} spent ${n === 1 ? 'a spell slot' : `${n} spell slots`}.`).join('');
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

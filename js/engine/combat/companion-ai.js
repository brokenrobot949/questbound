// How a companion fights on their own (docs/DESIGN.md, "Companions"), by the tactic the player
// sets in the Party section of the Sheet (data/campaign/companions.js):
//   aggressive  goes after the foe they'd hurt most, closing in or shooting
//   defensive   stays within 10 feet of the hero and fights whatever they can reach from
//               there, or takes the Dodge action
//   support     heals first, then fights from beside the hero like Defensive
//   hold        doesn't move; fights only what they can reach from where they stand, or Dodges
// Whatever the tactic, a companion first helps anyone in the party at 0 Hit Points (the hero
// first): a healing spell if they have one, or else Spare the Dying, or the Help action's
// Medicine check (DC 10) to stabilise them. Support also heals anyone Bloodied (at half
// their Hit Points or fewer).
// So far companions spend spell slots only on healing (attacks are weapons and cantrips), and
// don't cast Concentration spells or use Bonus Action features such as Cunning Action. Every
// move goes through the fight's own rules (combat/battle.js), so it's logged and saved like
// any other turn.

import {
  addLogLine,
  attackPreview,
  clearShot,
  companionAttack,
  companionCantUse,
  companionDodge,
  companionHeal,
  companionMedicine,
  companionMove,
  companionOptions,
  companionReach,
  companionSpareTheDying,
  companionStandUp,
  enemies,
  heroCombatant,
  hpOf,
  inRange,
  isHero,
  isIncapacitated,
  maxHpOf,
  partyCombatants,
  stateOf,
  upright,
  actorGame,
} from './battle.js';
import { parseDice } from './attacks.js';
import { feetBetween, isAdjacent, squaresBetween } from './grid.js';
import { memberOf } from '../character/party.js';
import { canCastSpell, findSpell } from '../character/spells.js';

// The squares from the hero a Defensive or Support companion keeps within (10 feet).
const STAY_NEAR = 2;

export function companionTurn(game, c) {
  const battle = game.battle;
  companionStandUp(game, c);
  if (isIncapacitated(battle, c.id)) {
    addLogLine(game, `${c.name} can't act.`);
    return;
  }
  const tactic = memberOf(game, c.id).tactic;
  rescue(game, c) || (tactic === 'support' && patchUp(game, c));
  if (!battle.outcome && upright(game, c)) fight(game, c, tactic);
}

// ---- Helping the fallen and the hurt ----

const actionFree = (game) => !game.battle.turnState.action;

// The path to a square within `feet` of a spot (beside it, for 5 feet), the cheapest one, or
// null if there's none this turn. An empty path: already there.
function pathWithin(game, c, pos, feet) {
  if (feetBetween(c.pos, pos) <= feet) return [];
  const steps = [...companionReach(game, c).values()].filter((s) => s.cost > 0 && feetBetween(s.pos, pos) <= feet);
  steps.sort((a, b) => a.cost - b.cost);
  return steps[0] ? steps[0].path : null;
}

// The healing spells the companion can cast now: a Bonus Action one first (it leaves the
// action free), then a free cast, then the lowest spell slot.
function healingOptions(game, c) {
  const options = companionOptions(game, c).filter((o) => o.how === 'heal' && !companionCantUse(game, c, o));
  return options.sort((a, b) => Number(b.bonusAction) - Number(a.bonusAction) || Number(Boolean(b.freeCast)) - Number(Boolean(a.freeCast)) || (a.slotLevel || 0) - (b.slotLevel || 0));
}

// Heals the target with the first healing spell that can reach them this turn, moving if it
// has to. True if it did.
function healSomeone(game, c, target) {
  for (const option of healingOptions(game, c)) {
    const path = pathWithin(game, c, target.pos, findSpell(option.spellId).combat.range);
    if (!path) continue;
    companionMove(game, c, path);
    if (game.battle.outcome || !upright(game, c)) return true;
    companionHeal(game, c, option.id, target);
    return true;
  }
  return false;
}

// Anyone at 0 Hit Points: heal them, or else stabilise them. True if the companion did.
function rescue(game, c) {
  const battle = game.battle;
  const fallen = partyCombatants(battle).filter((p) => p !== c && ['down', 'stable'].includes(stateOf(battle, p)));
  fallen.sort((a, b) => Number(isHero(b)) - Number(isHero(a)) || squaresBetween(c.pos, a.pos) - squaresBetween(c.pos, b.pos));
  for (const target of fallen) {
    if (healSomeone(game, c, target)) return true;
    if (stateOf(battle, target) !== 'down' || !actionFree(game)) continue;
    if (canCastSpell(actorGame(game, c).character, 'spare-the-dying')) {
      const path = pathWithin(game, c, target.pos, 15);
      if (path) {
        companionMove(game, c, path);
        if (!battle.outcome && upright(game, c)) companionSpareTheDying(game, c, target);
        return true;
      }
    }
    const path = pathWithin(game, c, target.pos, 5);
    if (path) {
      companionMove(game, c, path);
      if (!battle.outcome && upright(game, c) && isAdjacent(c.pos, target.pos)) companionMedicine(game, c, target);
      return true;
    }
  }
  return false;
}

// Support: heals whoever in the party is Bloodied, the most hurt first. True if they did.
function patchUp(game, c) {
  const battle = game.battle;
  const hurt = partyCombatants(battle).filter((p) => upright(game, p) && hpOf(game, p) * 2 <= maxHpOf(game, p));
  hurt.sort((a, b) => hpOf(game, a) / maxHpOf(game, a) - hpOf(game, b) / maxHpOf(game, b));
  return hurt.some((target) => healSomeone(game, c, target));
}

// ---- Fighting ----

function averageOf(damage) {
  const { count, sides } = parseDice(damage.dice);
  return (count * (sides + 1)) / 2 + (damage.bonus || 0);
}

// Weapons and cantrips aimed at a foe that the companion can use now. extra: only the Light
// property's extra attack.
function attacks(game, c, { extra = false } = {}) {
  return companionOptions(game, c).filter(
    (o) => o.damage && !companionCantUse(game, c, o) && Boolean(o.extra) === extra && (o.source === 'weapon' || (o.source === 'spell' && o.spellLevel === 0 && o.targeting === 'foe')),
  );
}

// Every attack on every foe still standing, with the damage it would do on average (counting
// the chance it hits, and Sneak Attack): [{ option, foe, value, preview }].
function weighUp(game, c, options) {
  const list = [];
  for (const option of options) {
    for (const foe of enemies(game.battle).filter((e) => e.hp > 0)) {
      const preview = attackPreview(game, option.id, foe.id, c.id);
      if (!preview || preview.invalid) continue;
      const sneak = preview.sneak ? averageOf({ dice: preview.sneak, bonus: 0 }) : 0;
      list.push({ option, foe, value: preview.chance * (averageOf(option.damage) + sneak), preview });
    }
  }
  return list;
}

// The best attack the companion can make from where they stand, or null.
function bestFromHere(game, c, options) {
  const ready = weighUp(game, c, options).filter((a) => a.preview.inRange && a.value > 0);
  return ready.sort((a, b) => b.value - a.value)[0] || null;
}

function fight(game, c, tactic) {
  const battle = game.battle;
  const hero = heroCombatant(battle);
  const allowed = (pos) => (tactic === 'defensive' || tactic === 'support' ? squaresBetween(pos, hero.pos) <= STAY_NEAR : true);
  const options = attacks(game, c);
  let best = actionFree(game) ? bestFromHere(game, c, options) : null;
  if (!best && actionFree(game) && tactic !== 'hold') {
    // Somewhere to attack from: the square (that the tactic allows) with the best attack, the
    // cheapest of equals.
    const weighed = weighUp(game, c, options);
    let spot = null;
    let spotValue = 0;
    for (const step of companionReach(game, c).values()) {
      if (step.cost === 0 || !allowed(step.pos)) continue;
      for (const { option, foe, value } of weighed) {
        if (!value || !inRange({ pos: step.pos }, foe, option) || !clearShot(game, step.pos, foe.pos)) continue;
        if (value > spotValue || (value === spotValue && step.cost < spot.cost)) {
          spot = step;
          spotValue = value;
        }
      }
    }
    if (!spot) spot = closerStep(game, c, tactic, hero);
    if (spot) companionMove(game, c, spot.path);
    if (battle.outcome || !upright(game, c)) return;
    best = bestFromHere(game, c, attacks(game, c));
  }
  if (best) {
    companionAttack(game, c, best.option.id, best.foe.id);
    // A second Light weapon: the extra attack (free with Nick, otherwise the Bonus Action).
    const extra = !battle.outcome && upright(game, c) ? bestFromHere(game, c, attacks(game, c, { extra: true })) : null;
    if (extra) companionAttack(game, c, extra.option.id, extra.foe.id);
    return;
  }
  // Nothing to attack: guard yourself if foes are near.
  const near = enemies(battle).some((e) => e.hp > 0 && squaresBetween(e.pos, c.pos) <= 6);
  if (actionFree(game) && near && tactic !== 'aggressive') companionDodge(game, c);
}

// With nothing to attack from anywhere in reach: an Aggressive companion heads for the nearest
// foe; a Defensive or Support one gets back beside the hero. Null to stay put.
function closerStep(game, c, tactic, hero) {
  const steps = [...companionReach(game, c).values()].filter((s) => s.cost > 0);
  if (tactic === 'aggressive') {
    const foes = enemies(game.battle).filter((e) => e.hp > 0);
    if (!foes.length) return null;
    const gap = (pos) => Math.min(...foes.map((f) => squaresBetween(pos, f.pos)));
    const closer = steps.filter((s) => gap(s.pos) < gap(c.pos));
    return closer.sort((a, b) => gap(a.pos) - gap(b.pos) || a.cost - b.cost)[0] || null;
  }
  if (tactic === 'hold' || squaresBetween(c.pos, hero.pos) <= STAY_NEAR) return null;
  const closer = steps.filter((s) => squaresBetween(s.pos, hero.pos) < squaresBetween(c.pos, hero.pos));
  return closer.sort((a, b) => squaresBetween(a.pos, hero.pos) - squaresBetween(b.pos, hero.pos) || a.cost - b.cost)[0] || null;
}

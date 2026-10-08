// The one function every d20 test goes through: ability checks, saving throws and attack rolls.
// It rolls the dice and returns the full breakdown, so the UI and roll log can show exactly
// what happened. Rules: SRD 5.2.1, "D20 Tests", "Advantage/Disadvantage", "Rolling 20 or 1".

import { rollDie, takeForcedD20 } from './dice.js';

const KINDS = ['check', 'save', 'attack'];

// options:
//   rng           the game's seeded RNG
//   kind          'check', 'save' or 'attack'
//   label         what is being rolled, e.g. 'Persuasion check'
//   modifiers     [{ label: 'Cha', value: 3, source: 'Charisma 16' }, ...]
//   advantage     reasons the roll has Advantage, e.g. ['Help action'] (empty for none)
//   disadvantage  reasons the roll has Disadvantage
//   target        { type: 'DC' or 'AC', value: 15 }, or null when there is no target number
//   criticalOn    attack rolls only: the lowest natural roll that is a Critical Hit (20, or 19
//                 with the Champion's Improved Critical). A Critical Hit always hits.
export function d20Test({
  rng,
  kind,
  label,
  modifiers = [],
  advantage = [],
  disadvantage = [],
  target = null,
  criticalOn = 20,
}) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown d20 test kind: ${kind}`);

  // Advantage and Disadvantage don't stack, and having both means rolling one die.
  let mode = 'normal';
  if (advantage.length > 0 && disadvantage.length === 0) mode = 'advantage';
  if (disadvantage.length > 0 && advantage.length === 0) mode = 'disadvantage';

  // Debug mode can force the result. The dice are still rolled, so the RNG moves on exactly
  // as it would have, and the result is marked forced so the roll log stays honest.
  const forced = takeForcedD20();
  const roll = () => {
    const face = rollDie(rng, 20);
    return forced === null ? face : forced;
  };
  const dice = [roll()];
  if (mode !== 'normal') dice.push(roll());

  let keptIndex = 0;
  if (mode === 'advantage' && dice[1] > dice[0]) keptIndex = 1;
  if (mode === 'disadvantage' && dice[1] < dice[0]) keptIndex = 1;
  const natural = dice[keptIndex];

  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
  const total = natural + modifierTotal;

  // Meeting or beating the target succeeds. A natural 20 or 1 only matters for attack rolls:
  // a 20 always hits (a Critical Hit) and a 1 always misses. Improved Critical makes a 19 a
  // Critical Hit too.
  let success = null;
  let automatic = null;
  if (target) success = total >= target.value;
  if (kind === 'attack' && natural >= criticalOn) {
    success = true;
    automatic = `natural ${natural}`;
  } else if (kind === 'attack' && natural === 1) {
    success = false;
    automatic = 'natural 1';
  }

  let outcome = null;
  if (success !== null) {
    if (kind === 'attack') outcome = success ? 'hit' : 'miss';
    else outcome = success ? 'success' : 'failure';
  }

  return {
    kind,
    label,
    mode,
    advantage: [...advantage],
    disadvantage: [...disadvantage],
    dice,
    forced: forced !== null,
    keptIndex,
    natural,
    modifiers: modifiers.map((m) => ({ ...m })),
    modifierTotal,
    total,
    target: target ? { ...target } : null,
    success,
    outcome,
    automatic,
    criticalHit: kind === 'attack' && natural >= criticalOn,
  };
}

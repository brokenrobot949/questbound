// The one function every d20 test goes through: ability checks, saving throws and attack rolls.
// It rolls the dice and returns the full breakdown, so the UI and roll log can show exactly
// what happened. Rules: SRD 5.2.1, "D20 Tests", "Advantage/Disadvantage", "Rolling 20 or 1",
// and "Heroic Inspiration" (a reroll).

import { rollDie, takeForcedD20 } from './dice.js';

const KINDS = ['check', 'save', 'attack'];

// Heroic Inspiration (see rules/inspiration.js): during a story choice or one of the hero's
// attacks, d20 tests are numbered from 0 (sequence), so the same test can be found again when
// that moment is replayed. A reroll plan, { sequence, face, from }, makes that test's kept die
// show the new face (from: the face the player saw); the dice are still rolled, so everything
// else plays out as it did. Outside those moments tests have no number.
let counted = null;
let rerollPlan = null;

// Starts numbering d20 tests from 0, with a reroll plan or none.
export function startD20Count(plan = null) {
  counted = 0;
  rerollPlan = plan;
}

// Stops numbering them (and drops a plan that never came up).
export function stopD20Count() {
  counted = null;
  rerollPlan = null;
}

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
  const sequence = counted === null ? null : counted++;
  const dice = [roll()];
  if (mode !== 'normal') dice.push(roll());

  const kept = () => {
    if (mode === 'advantage' && dice[1] > dice[0]) return 1;
    if (mode === 'disadvantage' && dice[1] < dice[0]) return 1;
    return 0;
  };
  // A reroll replaces the die that was kept; with two dice, the better (or worse) is kept again.
  let rerolled = null;
  if (rerollPlan && sequence !== null && rerollPlan.sequence === sequence) {
    const index = kept();
    rerolled = { index, from: rerollPlan.from || dice[index], to: rerollPlan.face };
    dice[index] = rerollPlan.face;
    rerollPlan = null;
  }
  const keptIndex = kept();
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
    rerolled, // { index, from, to }: the die rerolled with Heroic Inspiration, or null
    sequence, // which d20 test this was in its choice or attack, or null
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

// The same roll judged against a new target number: no new dice. For a target that changes
// after the roll is seen, as when the Shield spell raises AC against an attack that hit. A
// natural 20 or 1 on an attack still decides it whatever the number.
export function retarget(result, value) {
  if (!result.target) throw new Error('This roll had no target number to change');
  const success = result.automatic ? result.success : result.total >= value;
  const outcome = result.kind === 'attack' ? (success ? 'hit' : 'miss') : success ? 'success' : 'failure';
  return { ...result, target: { ...result.target, value }, success, outcome };
}

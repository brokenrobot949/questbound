// Turns a d20 test result into words for the roll panel and the roll log, e.g.
// "d20 (14) + Cha 3 + Proficiency 2 = 19 vs DC 20 — failure".

import { difficultyClasses } from '../../../data/srd/difficulty.js';

const MINUS = '−';

// The difficulty name for a DC: the nearest row of the table at or below it.
export function difficultyName(dc) {
  let name = difficultyClasses[0].name;
  for (const row of difficultyClasses) {
    if (dc >= row.dc) name = row.name;
  }
  return name;
}

// "d20 (14)", or with two dice "d20 with advantage (14 and 7, keep 14)".
export function diceText(result) {
  if (result.mode === 'normal') return `d20 (${result.dice[0]})`;
  const [first, second] = result.dice;
  return `d20 with ${result.mode} (${first} and ${second}, keep ${result.natural})`;
}

// "+3", "+0" or "−1".
export function signedNumber(n) {
  return `${n < 0 ? MINUS : '+'}${Math.abs(n)}`;
}

// "+ Cha 3" or "− Str 1".
export function modifierText(modifier) {
  const sign = modifier.value < 0 ? MINUS : '+';
  return `${sign} ${modifier.label} ${Math.abs(modifier.value)}`;
}

export function targetText(result) {
  return result.target ? `${result.target.type} ${result.target.value}` : '';
}

// "success", "failure", "hit", "miss", "critical hit" or "miss (natural 1)".
export function outcomeText(result) {
  if (result.outcome === null) return '';
  if (result.criticalHit) return 'critical hit';
  if (result.automatic === 'natural 1') return 'miss (natural 1)';
  return result.outcome;
}

// The whole roll on one line.
export function rollLine(result) {
  let line = [diceText(result), ...result.modifiers.map(modifierText)].join(' ');
  line += ` = ${result.total}`;
  if (result.target) line += ` vs ${targetText(result)}`;
  const outcome = outcomeText(result);
  if (outcome) line += ` — ${outcome}`;
  return line;
}

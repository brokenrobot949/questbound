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

// How hard a check is, before it's rolled, as the "Check difficulty" setting asks: the word
// ("Medium"), the number ("DC 15") or nothing (''). show: 'word', 'number' or 'hidden'. The
// roll itself always shows the DC once it's made.
export function difficultyLabel(dc, show = 'word') {
  if (show === 'hidden') return '';
  if (show === 'number') return `DC ${dc}`;
  return difficultyName(dc);
}

// "d20 (14)", or with two dice "d20 with advantage (14 and 7, keep 14)".
// A result forced in debug mode says so: "d20 (20, forced)". A die rerolled with Heroic
// Inspiration shows both faces: "d20 (4 → 15, Heroic Inspiration)".
export function diceText(result) {
  const forced = result.forced ? ', forced' : '';
  const rerolled = result.rerolled;
  const face = (i) => (rerolled && rerolled.index === i ? `${rerolled.from} → ${result.dice[i]}` : String(result.dice[i]));
  const inspired = rerolled ? ', Heroic Inspiration' : '';
  if (result.mode === 'normal') return `d20 (${face(0)}${forced}${inspired})`;
  return `d20 with ${result.mode} (${face(0)} and ${face(1)}, keep ${result.natural}${forced}${inspired})`;
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

// Plain words for what an attack does, for the battle screen's buttons and the Sheet:
// "+5 to hit · 2d6 + 3 slashing · 10 on average · melee". The numbers are the ones the
// fight itself uses (combat/attacks.js).

import { parseDice } from '../combat/attacks.js';
import { findAbility } from '../character/sheet.js';
import { signedNumber } from './roll-format.js';

const MINUS = '−';

// The average of an attack's damage: its dice and bonus. Great Weapon Fighting counts 1s and
// 2s on the dice as 3s.
export function averageDamage(damage, { greatWeapon = false } = {}) {
  const { count, sides } = parseDice(damage.dice);
  let faces = 0;
  for (let face = 1; face <= sides; face++) faces += greatWeapon ? Math.max(face, 3) : face;
  return (count * faces) / sides + (damage.bonus || 0);
}

// 10 → "10", 5.5 → "5.5", 10.25 → "10.3"
export function averageText(average) {
  return Number.isInteger(average) ? String(average) : String(Math.round(average * 10) / 10);
}

// "2d6 + 3 slashing", "1d6 − 1 piercing", "1d10 fire"
export function damageDice(damage) {
  const bonus = damage.bonus ? ` ${damage.bonus < 0 ? MINUS : '+'} ${Math.abs(damage.bonus)}` : '';
  return `${damage.dice}${bonus} ${damage.type}`;
}

// What an attack option does, as short phrases to join with " · ". slotsLeft(level), if
// given, says how many slots of a level are left, for spells that use one.
export function attackSummary(option, { slotsLeft = null } = {}) {
  const toHit = `${signedNumber(option.modifiers.reduce((sum, m) => sum + m.value, 0))} to hit`;
  const average = averageText(averageDamage(option.damage, option));
  const dice = damageDice(option.damage);
  const parts = [];
  if (option.how === 'darts') {
    parts.push(`${option.darts} darts that never miss`, `${dice} each`, `${averageText(averageDamage(option.damage) * option.darts)} on average`);
  } else if (option.how === 'rays') {
    parts.push(`${option.rays} rays, each ${toHit}`, `${dice} a ray`, `${average} on average a ray`);
  } else if (option.how === 'save') {
    parts.push(`${findAbility(option.saveAbility).abbreviation} save against DC ${option.saveDc}`, dice, `${average} on average`);
  } else {
    parts.push(toHit, dice, `${average} on average`);
  }
  parts.push(reachText(option));
  if (option.rider) parts.push(RIDERS[option.rider]);
  if (option.potent) parts.push(`half damage even on a ${option.how === 'save' ? 'save' : 'miss'}`);
  if (option.heavyDisadvantage) parts.push('Disadvantage: too heavy for you');
  if (option.slotLevel) {
    const left = slotsLeft ? ` (${slotsLeft(option.slotLevel)} left)` : '';
    parts.push(`uses a level ${option.slotLevel} slot${left}`);
  }
  return parts;
}

// "melee", "range 80/320 ft", "thrown 20/60 ft", "range 120 ft"
function reachText(option) {
  if (option.how === 'melee') return option.reach > 5 ? `melee, reach ${option.reach} ft` : 'melee';
  const [normal, long] = option.range;
  const distance = normal === long ? `${normal} ft` : `${normal}/${long} ft`;
  return `${option.name.endsWith('(thrown)') ? 'thrown' : 'range'} ${distance}`;
}

// What a spell's hit does besides damage (see data/srd/spells.js).
const RIDERS = {
  slowed: 'on a hit, its Speed drops by 10 ft',
  'no-reactions': 'on a hit, no Opportunity Attacks from it',
  'no-healing': 'on a hit, it can’t regain Hit Points',
};

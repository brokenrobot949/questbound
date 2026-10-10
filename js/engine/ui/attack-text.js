// Plain words for what an attack does, for the battle screen's buttons and the Sheet:
// "+5 to hit · 2d6 + 3 slashing · 10 on average · melee". The numbers are the ones the
// fight itself uses (combat/attacks.js).

import { parseDice } from '../combat/attacks.js';
import { findAbility, findMastery } from '../character/sheet.js';
import { discipleOfLife, healingFor } from '../character/spell-effects.js';
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

// What an attack or spell option does, as short phrases to join with " · ". slotsLeft(level),
// if given, says how many slots of a level are left, for spells that use one.
export function attackSummary(option, { slotsLeft = null } = {}) {
  const toHit = `${signedNumber(option.modifiers.reduce((sum, m) => sum + m.value, 0))} to hit`;
  const save = option.saveAbility ? `${findAbility(option.saveAbility).abbreviation} save against DC ${option.saveDc}` : null;
  const parts = [];
  if (option.bonusAction) parts.push('Bonus Action');
  if (option.how === 'self') parts.push(selfText(option));
  else if (option.how === 'heal') parts.push(...healText(option.heal));
  else if (option.how === 'ward') parts.push(WARDS[option.effect](option));
  else if (option.how === 'turn') parts.push(`each Undead within 30 ft makes a Wis save against DC ${option.saveDc} or is Turned: it flees and can’t act for a minute, or until it takes damage`);
  else if (option.how === 'preserve') parts.push(`if you’re Bloodied, regain up to ${option.amount} Hit Points, but no more than half your maximum`);
  else if (option.how === 'teleport') parts.push(`teleport up to ${option.range[1]} ft to a square you can see`);
  else if (option.how === 'darts') {
    parts.push(`${option.darts} darts that never miss`, `${damageDice(option.damage)} each`, `${averageText(averageDamage(option.damage) * option.darts)} on average`);
  } else if (option.how === 'rays') {
    parts.push(`${option.rays} rays, each ${toHit}`, `${damageDice(option.damage)} a ray`, `${averageText(averageDamage(option.damage))} on average a ray`);
  } else {
    parts.push(save || toHit);
    if (option.damage) parts.push(damageDice(option.damage), `${averageText(averageDamage(option.damage, option))} on average`);
    if (option.condition) parts.push(CONDITIONS[option.condition]);
    if (option.halfOnSave) parts.push('half on a save');
    if (option.push) parts.push(`pushed ${option.push} ft on a failed save`);
  }
  if (option.targeting !== 'self' && option.how !== 'teleport') parts.push(reachText(option));
  if (option.rider) parts.push(RIDERS[option.rider]);
  if (option.sneakAttack) parts.push(`Sneak Attack +${option.sneakAttack} with Advantage, once a turn`);
  if (option.nick) parts.push('part of your Attack action (Nick)');
  if (option.mastery && !(option.extra && option.mastery.id === 'nick')) parts.push(masteryText(option));
  if (option.potent) parts.push(`half damage even on a ${option.how === 'save' ? 'save' : 'miss'}`);
  if (option.heavyDisadvantage) parts.push('Disadvantage: too heavy for you');
  if (option.concentration) parts.push('Concentration');
  if (option.freeCast) parts.push('free: once per Long Rest');
  if (option.featureUse === 'channel-divinity') parts.push('uses Channel Divinity');
  if (option.slotLevel) {
    const left = slotsLeft ? ` (${slotsLeft(option.slotLevel)} left)` : '';
    parts.push(`uses a level ${option.slotLevel} slot${left}`);
  }
  return parts;
}

// What a spell you cast on yourself does, from its data (data/srd/spells.js), for the Sheet.
export function selfSpellText(spell, character) {
  const combat = spell.combat;
  if (combat.kind === 'heal') {
    const parts = healText({ ...healingFor(character, spell.id), extra: discipleOfLife(character, spell.level) });
    const average = parts.pop();
    const slow = combat.outOfFight ? `; it takes ${spell.castingTime}` : '';
    const once = combat.oncePerLongRest ? ', and heals you once until your next Long Rest' : '';
    return `${parts.join(', ')} (${average})${slow}${once}`;
  }
  return selfText({ self: combat.self, baseAc: combat.baseAc, lasts: combat.lasts, speedBonus: combat.speed, tempHp: combat.tempHp, hpBonus: combat.hpBonus });
}

// "regain 2d8 + 3 Hit Points", ("+4 with a slot (Disciple of Life)"), "12 on average": what
// a healing spell gives back.
function healText(heal) {
  const average = averageText(Math.max(0, averageDamage(heal)) + (heal.extra || 0));
  const bonus = heal.bonus ? ` ${heal.bonus < 0 ? MINUS : '+'} ${Math.abs(heal.bonus)}` : '';
  const extra = heal.extra ? `+${heal.extra} with a slot (Disciple of Life)` : null;
  return [`regain ${heal.dice}${bonus} Hit Points`, extra, `${average} on average`].filter(Boolean);
}

// What a ward on yourself does for the fight.
const WARDS = {
  blessed: () => '+1d4 to your attack rolls and saving throws',
  sanctuary: (option) => `foes make a Wis save against DC ${option.saveDc} to attack you; ends if you attack or cast a spell`,
  'shield-of-faith': () => '+2 to your AC',
};

// What a spell on yourself does: Mage Armor, False Life, Longstrider, Aid.
function selfText(option) {
  const lasts = option.lasts === 'hour' ? 'for about an hour' : 'until your next Long Rest';
  if (option.self === 'mage-armor') return `your AC becomes ${option.baseAc} + Dex ${lasts}`;
  if (option.self === 'longstrider') return `your Speed +${option.speedBonus} ft ${lasts}`;
  if (option.self === 'aid') return `your Hit Point maximum and Hit Points +${option.hpBonus} ${lasts}`;
  const temp = option.tempHp;
  const average = averageText(averageDamage({ dice: temp.dice, bonus: temp.bonus }));
  return `gain ${temp.dice} + ${temp.bonus} Temporary Hit Points (${average} on average)`;
}

// What a failed save does, for spells that leave a condition.
const CONDITIONS = {
  drowsy: 'drowsy, then asleep',
  paralyzed: 'Paralyzed',
  outlined: 'outlined: attacks against it have Advantage',
  grovel: 'Grovel: on its next turn it falls Prone and does nothing else',
  blinded: 'Blinded: its attacks have Disadvantage, attacks on it Advantage; it saves again each turn',
  baned: '−1d4 on their attack rolls and saves',
};

// "melee", "range 80/320 ft", "thrown 20/60 ft", "range 120 ft", "15-ft cone from you",
// "10-ft-radius sphere within 60 ft", "a Humanoid within 60 ft"
function reachText(option) {
  if (option.touch) return 'touch';
  if (option.how === 'multi') return `the nearest ${option.targets} foes within ${option.range[1]} ft`;
  if (option.how === 'spirit') return `appears beside a foe within ${option.range[1] - 5} ft, then strikes again each turn as a Bonus Action`;
  if (option.how === 'spirit-strike') return 'moves up to 20 ft to a foe and strikes';
  if (option.area) {
    const { shape, size } = option.area;
    if (shape === 'sphere') return `${size}-ft-radius sphere within ${option.range[1]} ft`;
    return option.range[1] ? `${size}-ft ${shape} within ${option.range[1]} ft` : `${size}-ft ${shape} from you`;
  }
  if (option.creatureType) return `a ${option.creatureType} within ${option.range[1]} ft`;
  if (option.how === 'melee') return option.reach > 5 ? `melee, reach ${option.reach} ft` : 'melee';
  const [normal, long] = option.range;
  const distance = normal === long ? `${normal} ft` : `${normal}/${long} ft`;
  const thrown = option.name.endsWith('(thrown)') || (option.properties || []).includes('thrown');
  return `${thrown ? 'thrown' : 'range'} ${distance}`;
}

// A weapon's mastery property, as the hero uses it: "Vex: a hit gives you Advantage on your
// next attack against that foe".
export function masteryText(option) {
  const { id, name, dc } = option.mastery;
  if (id === 'topple') return `Topple: on a hit, the foe makes a Con save against DC ${dc} or falls Prone`;
  if (id === 'graze') return option.abilityMod > 0 ? `Graze: a miss still deals ${option.abilityMod} damage` : 'Graze: a miss deals your ability modifier in damage (none for you)';
  return `${name}: ${findMastery(id).summary}`;
}

// What a spell's hit does besides damage (see data/srd/spells.js).
const RIDERS = {
  slowed: 'on a hit, its Speed drops by 10 ft',
  'no-reactions': 'on a hit, no Opportunity Attacks from it',
  'no-healing': 'on a hit, it can’t regain Hit Points',
  poisoned: 'on a hit, Poisoned until the end of your next turn',
  guided: 'on a hit, the next attack on it has Advantage',
};

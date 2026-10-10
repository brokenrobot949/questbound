// Attacks and damage on the battle grid, for heroes and monsters alike. Every attack roll goes
// through d20Test, so the log can show it in full. Rules: SRD 5.2.1, "Making an Attack",
// "Damage and Healing", "Weapons", and the spell descriptions.
//
// An attack option (what the attacker can use):
//   { id, name, source: 'weapon' | 'spell' | 'monster',
//     how: 'melee' | 'ranged' | 'save' | 'darts' | 'rays' | 'area' | 'self' | 'heal' | 'ward' |
//          'teleport',
//     reach (feet, melee), range ([normal, long] feet, ranged), modifiers (to hit, for d20Test),
//     damage: { dice, bonus, type, extraOnAdvantage } (null for spells that do no damage),
//     saveDc, saveAbility, darts, rays,
//     slotLevel (the spell slot it uses), rider, greatWeapon, savage, heavyDisadvantage,
//     criticalOn (19 with Improved Critical), potent (a cantrip with Potent Cantrip),
//     onHit (a monster attack's condition on a hit, e.g. the Wolf's Bite knocking you Prone) }
// Spells also carry: spellId, spellLevel, concentration, bonusAction, and how they're aimed,
// targeting: 'foe' (choose a creature), 'direction' (an area that starts from you: Burning
// Hands), 'point' (an area centred on a square within range: Shatter), 'self' or 'square'
// (Misty Step); and from the spell's data, area, halfOnSave, push, condition, foesOnly,
// creatureType, self, tempHp, speedBonus, effect (a 'ward' spell's: 'blessed' or
// 'sanctuary') and heal ({ dice, bonus }: a healing spell's dice and spellcasting modifier)
// (see data/srd/spells.js).

import { d20Test } from '../rules/d20-test.js';
import { rollDice } from '../rules/dice.js';
import { abilityModifierOf, characterFeats, findAbility, findClass, hasFeature, proficiencyBonus, abilityScore, resistances } from '../character/sheet.js';
import { findItem } from '../character/inventory.js';
import { freeCastKey, freeCastsLeft, spellGroups, spellNumbers, upcastDice, upcastHelps } from '../character/spells.js';
import { slotsLeft } from '../character/resources.js';

// The highest spell slot level there is.
const TOP_SLOT = 9;

export function parseDice(text) {
  const match = /^(\d+)d(\d+)$/.exec(text);
  if (!match) throw new Error(`Not a dice expression: ${text}`);
  return { count: Number(match[1]), sides: Number(match[2]) };
}

// Cantrip damage grows at character levels 5, 11 and 17.
function cantripDice(dice, level) {
  const { count, sides } = parseDice(dice);
  const times = level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
  return `${count * times}d${sides}`;
}

const short = (abilityId) => findAbility(abilityId).abbreviation;

// ---- What the hero can attack with ----

// Weapons in the pack, then attack spells the hero can cast now.
export function heroAttackOptions(game) {
  const { character } = game;
  const options = [];
  const cls = findClass(character.classId);
  const pb = proficiencyBonus(character.level);
  const styles = characterFeats(character).map((entry) => entry.feat.id);
  const savage = styles.includes('savage-attacker');
  const str = abilityModifierOf(character, 'strength');
  const dex = abilityModifierOf(character, 'dexterity');
  const criticalOn = hasFeature(character, 'improved-critical') ? 19 : 20;
  const potent = hasFeature(character, 'potent-cantrip');

  for (const entry of game.inventory) {
    const item = findItem(entry.id);
    if (!item || item.category !== 'weapon' || entry.quantity < 1) continue;
    const props = item.properties || [];
    if (props.includes('two-handed') && character.shield) continue; // a shield needs a free hand
    const proficient = cls.weaponProficiencies.includes(item.weaponType.split('-')[0]);
    const twoHands = props.includes('two-handed') || (props.includes('versatile') && !character.shield);
    const dice = props.includes('versatile') && !character.shield ? item.versatile : item.damage.dice;

    const make = (how, abilityId) => {
      const mod = abilityId === 'strength' ? str : dex;
      const modifiers = [{ label: short(abilityId), value: mod, source: `${findAbility(abilityId).name} ${abilityScore(character, abilityId).value}` }];
      if (proficient) modifiers.push({ label: 'Proficiency', value: pb, source: `Proficient with ${item.weaponType.split('-')[0]} weapons` });
      if (how === 'ranged' && styles.includes('archery')) modifiers.push({ label: 'Archery', value: 2, source: 'Archery fighting style' });
      // Heavy weapons need Strength 13 (melee) or Dexterity 13 (ranged).
      const needed = how === 'ranged' && props.includes('ammunition') ? 'dexterity' : 'strength';
      const heavyDisadvantage = props.includes('heavy') && abilityScore(character, needed).value < 13;
      return {
        id: `${item.id}-${how}`,
        name: how === 'ranged' && props.includes('thrown') ? `${item.name} (thrown)` : item.name,
        source: 'weapon',
        itemId: item.id,
        how,
        reach: how === 'melee' ? 5 : null,
        range: how === 'ranged' ? item.range : null,
        modifiers,
        damage: { dice: how === 'melee' ? dice : item.damage.dice, bonus: mod, type: item.damage.type },
        greatWeapon: styles.includes('great-weapon-fighting') && how === 'melee' && twoHands,
        savage,
        heavyDisadvantage,
        criticalOn,
      };
    };

    const finesseBest = props.includes('finesse') && dex > str ? 'dexterity' : 'strength';
    if (item.weaponType.endsWith('-melee')) {
      options.push(make('melee', finesseBest));
      if (props.includes('thrown')) options.push(make('ranged', finesseBest));
    } else {
      const ammo = item.ammunition ? game.inventory.find((e) => e.id === item.ammunition && e.quantity > 0) : true;
      if (ammo) options.push(make('ranged', 'dexterity'));
    }
  }

  // Spells: cantrips and prepared spells that work in a fight. A levelled spell is offered
  // once for each slot level it can use that has slots left, when a higher slot adds damage
  // or healing dice (upcast), or a dart or a ray (Magic Missile, Scorching Ray), or Temporary
  // Hit Points; otherwise only with the lowest slot left.
  // A spell that comes with free casts (Magic Initiate's, a species') is offered free first,
  // while one is left (freeCast: where the use is counted). Shield isn't offered: it's a
  // reaction the game casts for you (combat/battle.js).
  for (const group of spellGroups(character)) {
    if (!group.ability) continue;
    const numbers = spellNumbers(character, group.ability);
    const castable = [...group.cantrips, ...group.prepared, ...group.always.map((a) => a.spell)];
    for (const spell of castable) {
      if (!spell || !spell.combat || options.some((o) => o.spellId === spell.id)) continue;
      const c = spell.combat;
      if (c.kind === 'reaction') continue;
      if (c.self === 'mage-armor' && character.armorId) continue; // only for the unarmoured
      if (c.lasts && (game.activeSpells || []).some((s) => s.id === spell.id)) continue; // already on the hero
      const modifiers = numbers.attackBonus.parts.map((p) => ({ ...p, source: `${group.label} spellcasting` }));
      const made = { modifiers, saveDc: numbers.saveDc.value, level: character.level, potent, abilityMod: abilityModifierOf(character, group.ability) };
      if (spell.level > 0 && freeCastsLeft(game, spell.id) > 0) {
        options.push({ ...spellOption(spell, null, 0, made), id: `spell-${spell.id}-free`, name: `${spell.name} (free)`, freeCast: freeCastKey(spell.id) });
      }
      const slots = [];
      if (spell.level === 0) slots.push(null);
      else for (let slot = spell.level; slot <= TOP_SLOT; slot++) if (slotsLeft(game, slot) > 0) slots.push(slot);
      if (!upcastHelps(spell)) slots.splice(1);
      for (const slot of slots) options.push(spellOption(spell, slot, slot ? slot - spell.level : 0, made));
    }
  }
  return options;
}

// How each kind of spell is aimed (see the option fields above). Healing and wards go on you
// until companions join the fights.
const TARGETING = { attack: 'foe', save: 'foe', darts: 'foe', rays: 'foe', self: 'self', heal: 'self', ward: 'self', teleport: 'square' };

function spellOption(spell, slot, above, { modifiers, saveDc, level, potent, abilityMod }) {
  const c = spell.combat;
  const melee = c.kind === 'attack' && c.attack === 'melee';
  const onYou = TARGETING[c.kind] === 'self';
  return {
    id: above ? `spell-${spell.id}-${slot}` : `spell-${spell.id}`,
    name: above ? `${spell.name} (level ${slot} slot)` : spell.name,
    source: 'spell',
    spellId: spell.id,
    spellLevel: spell.level,
    slotLevel: slot,
    how: c.kind === 'attack' ? c.attack : c.kind,
    targeting: c.kind === 'area' ? (c.range ? 'point' : 'direction') : TARGETING[c.kind],
    bonusAction: Boolean(c.bonusAction),
    concentration: Boolean(spell.concentration),
    reach: melee ? c.range : null,
    range: melee || onYou ? null : [c.range, c.range],
    modifiers,
    damage: c.damage ? { dice: spellDice(spell, level, above), bonus: c.damage.bonus || 0, type: c.damage.type } : null,
    saveDc,
    saveAbility: c.save || null,
    darts: c.darts ? c.darts + above : null,
    rays: c.rays ? c.rays + above : null,
    rider: c.rider || null,
    potent: potent && spell.level === 0 && Boolean(c.damage),
    area: c.area || null,
    halfOnSave: Boolean(c.halfOnSave),
    push: c.push || 0,
    condition: c.condition || null,
    foesOnly: Boolean(c.foesOnly),
    creatureType: c.creatureType || null,
    self: c.self || null,
    tempHp: c.tempHp ? { dice: c.tempHp.dice, bonus: c.tempHp.bonus + above * (c.upcastTempHp || 0) } : null,
    speedBonus: c.speed || 0,
    baseAc: c.baseAc || null,
    lasts: c.lasts || null,
    effect: c.effect || null,
    heal: c.heal ? { dice: upcastDice(c.heal.dice, c.upcast, above), bonus: abilityMod } : null,
  };
}

// A spell's damage dice: a cantrip's grow with the caster's level; a levelled spell's grow by
// its upcast dice for each slot level above its own.
function spellDice(spell, level, above) {
  const c = spell.combat;
  if (spell.level === 0 && c.scales) return cantripDice(c.damage.dice, level);
  return upcastDice(c.damage.dice, c.upcast, above);
}

// A monster's attacks, from its stat block.
export function monsterAttackOptions(monster) {
  const options = [];
  for (const attack of monster.attacks) {
    const base = {
      source: 'monster',
      modifiers: [{ label: 'Attack', value: attack.bonus, source: `${monster.name}'s ${attack.name}` }],
      damage: { ...attack.damage, extraOnAdvantage: attack.advantageExtra || null },
      onHit: attack.onHit || null,
    };
    if (attack.kind === 'melee' || attack.kind === 'melee-or-ranged') {
      options.push({ ...base, id: `${attack.id}-melee`, name: attack.name, how: 'melee', reach: attack.reach });
    }
    if (attack.kind === 'ranged' || attack.kind === 'melee-or-ranged') {
      options.push({ ...base, id: `${attack.id}-ranged`, name: attack.kind === 'ranged' ? attack.name : `${attack.name} (thrown)`, how: 'ranged', range: attack.range });
    }
  }
  return options;
}

// ---- Rolling ----

// Damage dice and bonus. A Critical Hit rolls the dice twice over. Great Weapon Fighting
// treats 1s and 2s as 3s; Savage Attacker rolls the dice twice and keeps the better.
export function rollDamage(rng, damage, { critical = false, advantage = false, greatWeapon = false, savage = false } = {}) {
  const { count, sides } = parseDice(damage.dice);
  const n = critical ? count * 2 : count;
  const once = () => {
    const rolled = rollDice(rng, n, sides).rolls;
    return greatWeapon ? rolled.map((r) => Math.max(r, 3)) : rolled;
  };
  let dice = once();
  let savaged = null;
  if (savage) {
    const second = once();
    const sum = (list) => list.reduce((s, v) => s + v, 0);
    savaged = { first: dice, second };
    if (sum(second) > sum(dice)) dice = second;
  }
  let extra = [];
  if (advantage && damage.extraOnAdvantage) {
    const more = parseDice(damage.extraOnAdvantage);
    extra = rollDice(rng, critical ? more.count * 2 : more.count, more.sides).rolls;
  }
  const total = Math.max(0, [...dice, ...extra].reduce((s, v) => s + v, 0) + (damage.bonus || 0));
  return { dice, extra, bonus: damage.bonus || 0, total, type: damage.type, critical, savaged };
}

// "1d8 (5) + 3 = 8 slashing", "2d6 (4, 6) − 1 = 9 piercing".
export function damageText(rolled, dice) {
  const parts = [`${dice} (${rolled.dice.join(', ')})`];
  if (rolled.extra.length) parts.push(`+ ${rolled.extra.join(' + ')}`);
  if (rolled.bonus) parts.push(`${rolled.bonus < 0 ? '−' : '+'} ${Math.abs(rolled.bonus)}`);
  return `${parts.join(' ')} = ${rolled.total} ${rolled.type}`;
}

// Halved, rounded down, if the target resists the damage type.
export function damageAfterResistance(total, type, resisted) {
  return resisted.includes(type) ? Math.floor(total / 2) : total;
}

export function heroResistances(character) {
  return resistances(character);
}

// The chance an attack hits, from 0 to 1: a natural 1 always misses and a Critical Hit (a 20,
// or criticalOn and up) always hits.
export function hitChance(modifierTotal, ac, mode = 'normal', criticalOn = 20) {
  let faces = 21 - criticalOn;
  for (let face = 2; face < criticalOn; face++) if (face + modifierTotal >= ac) faces += 1;
  const p = faces / 20;
  if (mode === 'advantage') return 1 - (1 - p) ** 2;
  if (mode === 'disadvantage') return p ** 2;
  return p;
}

// An attack roll against AC, through the one d20 function.
export function attackRoll(rng, option, ac, advantage, disadvantage) {
  return d20Test({
    rng,
    kind: 'attack',
    label: `${option.name} attack`,
    modifiers: option.modifiers,
    advantage,
    disadvantage,
    target: { type: 'AC', value: ac },
    criticalOn: option.criticalOn || 20,
  });
}

// A saving throw made by a monster against the hero's spell.
export function monsterSave(rng, monster, abilityId, dc, advantage = []) {
  return d20Test({
    rng,
    kind: 'save',
    label: `${findAbility(abilityId).name} save`,
    modifiers: [{ label: `${short(abilityId)} save`, value: monster.saves[abilityId] || 0, source: monster.name }],
    advantage,
    target: { type: 'DC', value: dc },
  });
}

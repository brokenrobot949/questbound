// Character sheet maths. A character stores only the player's choices; every number here is
// worked out from those choices and the rules data, and reports how it was calculated.
//
// A character (choices only):
//   name, level
//   classId, subclassId (null until chosen at level 3)
//   speciesId, size, speciesChoice (ancestry / lineage / legacy id, if the species has one),
//   spellcastingAbility (for species spells, if any)
//   backgroundId, backgroundIncreases ({ ability: 2, other: 1 } or three abilities at 1)
//   abilityScoreMethod ('standard-array', 'point-buy', 'random' or 'manual'), baseAbilityScores
//   classSkills, speciesSkills, featSkills (skills picked from each source)
//   originFeat (the Human's Versatile feat), classChoices ({ fightingStyle, scholarSkill })
//   hitPointRolls (the Hit Die rolled at each level after 1; null = took the fixed value)
//   armorId (null = no armour), shield (true or false)
//
// Most functions return { value, parts: [{ label, value }] }, and the parts add up to the value.

import { abilities } from '../../../data/srd/abilities.js';
import { skills } from '../../../data/srd/skills.js';
import { advancement } from '../../../data/srd/advancement.js';
import { classes } from '../../../data/srd/classes.js';
import { species } from '../../../data/srd/species.js';
import { backgrounds } from '../../../data/srd/backgrounds.js';
import { feats } from '../../../data/srd/feats.js';
import { armor, shield, unarmoredBaseAc } from '../../../data/srd/armor.js';
import { maxAbilityScore } from '../../../data/srd/character-creation.js';

// ---- Looking things up ----

export const findAbility = (id) => abilities.find((a) => a.id === id) || null;
export const findSkill = (id) => skills.find((s) => s.id === id) || null;
export const findClass = (id) => classes.find((c) => c.id === id) || null;
export const findSpecies = (id) => species.find((s) => s.id === id) || null;
export const findBackground = (id) => backgrounds.find((b) => b.id === id) || null;
export const findFeat = (id) => feats.find((f) => f.id === id) || null;
export const findArmor = (id) => armor.find((a) => a.id === id) || null;

function classOf(character) {
  const found = findClass(character.classId);
  if (!found) throw new Error(`Unknown class: ${character.classId}`);
  return found;
}

function speciesOf(character) {
  const found = findSpecies(character.speciesId);
  if (!found) throw new Error(`Unknown species: ${character.speciesId}`);
  return found;
}

function backgroundOf(character) {
  const found = findBackground(character.backgroundId);
  if (!found) throw new Error(`Unknown background: ${character.backgroundId}`);
  return found;
}

// The chosen ancestry, lineage or legacy, or null.
export function speciesOption(character) {
  const { choice } = speciesOf(character);
  return choice ? choice.options.find((o) => o.id === character.speciesChoice) || null : null;
}

export function subclassOf(character) {
  const cls = classOf(character);
  return cls.subclasses.find((s) => s.id === character.subclassId) || null;
}

// The class's numbers for the character's level (the highest level in the data, if beyond it).
function classLevelRow(character) {
  const { levels } = classOf(character);
  return levels[Math.min(character.level, levels.length) - 1];
}

// "Human Fighter 1"
export function describeCharacter(character) {
  return `${speciesOf(character).name} ${classOf(character).name} ${character.level}`;
}

// ---- Abilities and proficiency ----

// SRD 5.2.1, "Ability Scores and Modifiers": subtract 10, halve, round down.
export function abilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level) {
  const row = advancement.find((r) => r.level === level);
  if (!row) throw new Error(`No Proficiency Bonus for level ${level}`);
  return row.proficiencyBonus;
}

// A score: the assigned score plus the background increase, never above 20.
export function abilityScore(character, abilityId) {
  const ability = findAbility(abilityId);
  if (!ability) throw new Error(`Unknown ability: ${abilityId}`);
  const base = character.baseAbilityScores[abilityId];
  if (!Number.isInteger(base)) throw new Error(`${character.name} has no ${ability.name} score`);
  const parts = [{ label: 'Assigned score', value: base }];
  const increase = (character.backgroundIncreases || {})[abilityId] || 0;
  if (increase) parts.push({ label: `Background (${backgroundOf(character).name})`, value: increase });
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (total > maxAbilityScore) parts.push({ label: `Capped at ${maxAbilityScore}`, value: maxAbilityScore - total });
  return derived(parts);
}

export function abilityModifierOf(character, abilityId) {
  return abilityModifier(abilityScore(character, abilityId).value);
}

// ---- Feats ----

// Every feat the character has, with where it came from.
export function characterFeats(character) {
  const list = [];
  const background = backgroundOf(character);
  list.push({ feat: findFeat(background.feat.id), source: `Background (${background.name})`, spellList: background.feat.spellList || null });
  if (speciesOf(character).originFeat && character.originFeat) {
    list.push({ feat: findFeat(character.originFeat), source: `Species (${speciesOf(character).name})` });
  }
  const style = (character.classChoices || {}).fightingStyle;
  if (style) list.push({ feat: findFeat(style), source: `Class (${classOf(character).name})` });
  return list.filter((entry) => entry.feat);
}

const hasFeat = (character, featId) => characterFeats(character).some((entry) => entry.feat.id === featId);

// ---- Skills, checks and saves ----

// Whether the character is proficient in a skill, and why.
// Returns { level: 'none' | 'proficient' | 'expertise', sources: ['Soldier background', ...] }.
export function skillProficiency(character, skillId) {
  const sources = [];
  if ((character.classSkills || []).includes(skillId)) sources.push(`${classOf(character).name} skill`);
  if (backgroundOf(character).skills.includes(skillId)) sources.push(`${backgroundOf(character).name} background`);
  if ((character.speciesSkills || []).includes(skillId)) sources.push(`${speciesOf(character).name} trait`);
  if ((character.featSkills || []).includes(skillId)) sources.push('Skilled feat');
  const choices = character.classChoices || {};
  const expert = character.classId === 'wizard' && character.level >= 2 && choices.scholarSkill === skillId;
  if (expert) return { level: 'expertise', sources: [...sources, 'Scholar'] };
  return { level: sources.length > 0 ? 'proficient' : 'none', sources };
}

// Everything added to the d20 for an ability check, each with where it comes from.
// testId is a skill ('persuasion') or, for a plain ability check, an ability ('strength').
export function checkModifiers(character, testId) {
  const skill = findSkill(testId);
  const ability = findAbility(skill ? skill.ability : testId);
  if (!ability) throw new Error(`Unknown skill or ability: ${testId}`);

  const score = abilityScore(character, ability.id).value;
  const modifiers = [{ label: ability.abbreviation, value: abilityModifier(score), source: `${ability.name} ${score}` }];

  if (skill) {
    const proficiency = skillProficiency(character, skill.id);
    const bonus = proficiencyBonus(character.level);
    const from = proficiency.sources.join(', ');
    if (proficiency.level === 'proficient') {
      modifiers.push({ label: 'Proficiency', value: bonus, source: `Proficient in ${skill.name} (${from}); +${bonus} at level ${character.level}` });
    } else if (proficiency.level === 'expertise') {
      modifiers.push({ label: 'Expertise', value: bonus * 2, source: `Expertise in ${skill.name} (${from}); twice the +${bonus} at level ${character.level}` });
    }
  }

  return { ability, skill, modifiers, total: modifiers.reduce((sum, m) => sum + m.value, 0) };
}

export function skillBonus(character, skillId) {
  return derived(checkModifiers(character, skillId).modifiers.map(({ label, value }) => ({ label, value })));
}

export function savingThrow(character, abilityId) {
  const ability = findAbility(abilityId);
  const parts = [{ label: ability.abbreviation, value: abilityModifierOf(character, abilityId) }];
  if (classOf(character).savingThrows.includes(abilityId)) {
    parts.push({ label: `Proficiency (${classOf(character).name})`, value: proficiencyBonus(character.level) });
  }
  return derived(parts);
}

// 10 plus the Wisdom (Perception) check modifier.
export function passivePerception(character) {
  return derived([{ label: 'Base', value: 10 }, ...skillBonus(character, 'perception').parts]);
}

export function initiative(character) {
  const parts = [{ label: 'Dex', value: abilityModifierOf(character, 'dexterity') }];
  if (characterFeats(character).some((entry) => entry.feat.initiativeProficiency)) {
    parts.push({ label: 'Proficiency (Alert)', value: proficiencyBonus(character.level) });
  }
  return derived(parts);
}

// ---- Hit points, armour and movement ----

// Level 1: the class's starting Hit Points. Each later level: the Hit Die roll or the fixed
// value. Every level adds the Constitution modifier, and each level gives at least 1.
export function maxHitPoints(character) {
  const cls = classOf(character);
  const con = abilityModifierOf(character, 'constitution');
  const rolls = character.hitPointRolls || [];
  const parts = [];
  for (let level = 1; level <= character.level; level++) {
    let base;
    let label;
    if (level === 1) {
      base = cls.hitPointsAtLevel1;
      label = `Level 1: ${cls.name} ${base}`;
    } else {
      const roll = rolls[level - 2];
      base = Number.isInteger(roll) ? roll : cls.hitPointsPerLevel;
      label = Number.isInteger(roll) ? `Level ${level}: rolled ${roll}` : `Level ${level}: fixed ${base}`;
    }
    const gained = Math.max(1, base + con);
    parts.push({ label: `${label}, Con ${signed(con)}${gained === 1 && base + con < 1 ? ' (at least 1)' : ''}`, value: gained });
  }
  const perLevel = speciesOf(character).hitPointsPerLevel || 0;
  if (perLevel) parts.push({ label: `${speciesOf(character).name} toughness`, value: perLevel * character.level });
  return derived(parts);
}

export function hitDice(character) {
  const cls = classOf(character);
  return { count: character.level, die: cls.hitDie, text: `${character.level}d${cls.hitDie}` };
}

export function armorClass(character) {
  const worn = character.armorId ? findArmor(character.armorId) : null;
  if (character.armorId && !worn) throw new Error(`Unknown armor: ${character.armorId}`);
  const dex = abilityModifierOf(character, 'dexterity');
  const parts = [];
  if (worn) {
    parts.push({ label: worn.name, value: worn.baseAc });
    const counted = worn.dexCap === null ? dex : Math.min(dex, worn.dexCap);
    if (worn.dexCap !== 0) parts.push({ label: worn.dexCap === null ? 'Dex' : `Dex (max +${worn.dexCap})`, value: counted });
  } else {
    parts.push({ label: 'Unarmored', value: unarmoredBaseAc }, { label: 'Dex', value: dex });
  }
  if (character.shield) parts.push({ label: shield.name, value: shield.acBonus });
  if (worn) {
    for (const { feat } of characterFeats(character)) {
      if (feat.armoredAcBonus) parts.push({ label: feat.name, value: feat.armoredAcBonus });
    }
  }
  return derived(parts);
}

// Walking speed: the species' Speed (some lineages change it), less 10 feet in armour the
// character isn't strong enough for.
export function speed(character) {
  const option = speciesOption(character);
  const base = (option && option.speed) || speciesOf(character).speed;
  const parts = [{ label: option && option.speed ? option.name : speciesOf(character).name, value: base }];
  const worn = character.armorId ? findArmor(character.armorId) : null;
  if (worn && worn.strength && abilityScore(character, 'strength').value < worn.strength) {
    parts.push({ label: `${worn.name} needs Str ${worn.strength}`, value: -10 });
  }
  return derived(parts);
}

export function darkvision(character) {
  const option = speciesOption(character);
  return Math.max(speciesOf(character).darkvision || 0, (option && option.darkvision) || 0);
}

export function resistances(character) {
  const option = speciesOption(character);
  const list = [...(speciesOf(character).resistances || [])];
  if (option && option.damageType) list.push(option.damageType); // Dragonborn ancestry
  if (option && option.resistance) list.push(option.resistance); // Tiefling legacy
  return [...new Set(list)];
}

// ---- Spellcasting ----

// The character's own spellcasting from their class, or null for classes without it.
export function spellcasting(character) {
  const cls = classOf(character);
  if (!cls.spellcasting) return null;
  const ability = findAbility(cls.spellcasting.ability);
  const mod = abilityModifierOf(character, ability.id);
  const bonus = proficiencyBonus(character.level);
  const row = classLevelRow(character);
  return {
    ability: ability.id,
    saveDc: derived([
      { label: 'Base', value: 8 },
      { label: ability.abbreviation, value: mod },
      { label: 'Proficiency', value: bonus },
    ]),
    attackBonus: derived([
      { label: ability.abbreviation, value: mod },
      { label: 'Proficiency', value: bonus },
    ]),
    cantrips: row.cantrips,
    preparedSpells: row.preparedSpells,
    slots: [...row.slots], // per spell level, starting at level 1
    spellbookSize: cls.spellcasting.spellbookAtLevel1 + cls.spellcasting.spellbookPerLevel * (character.level - 1),
  };
}

// ---- Features ----

// Class, subclass and species features the character has at their level, plus feats.
export function characterFeatures(character) {
  const cls = classOf(character);
  const list = [];
  for (const row of cls.levels.filter((r) => r.level <= character.level)) {
    for (const id of row.features) list.push({ ...cls.features[id], level: row.level, source: cls.name });
  }
  const sub = subclassOf(character);
  if (sub) {
    for (const row of sub.levels.filter((r) => r.level <= character.level)) {
      for (const id of row.features) list.push({ ...sub.features[id], level: row.level, source: sub.name });
    }
  }
  for (const trait of speciesOf(character).traits) {
    if (!trait.level || trait.level <= character.level) list.push({ ...trait, source: speciesOf(character).name });
  }
  for (const { feat, source } of characterFeats(character)) list.push({ name: feat.name, text: feat.text, source });
  return list;
}

// ---- Helpers ----

function derived(parts) {
  return { value: parts.reduce((sum, p) => sum + p.value, 0), parts };
}

function signed(n) {
  return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
}

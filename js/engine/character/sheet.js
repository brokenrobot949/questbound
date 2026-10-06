// Character sheet maths. Numbers are worked out from data and the character's choices,
// never stored, and each one can report how it was calculated.

import { abilities } from '../../../data/srd/abilities.js';
import { skills } from '../../../data/srd/skills.js';
import { advancement } from '../../../data/srd/advancement.js';

export function findAbility(id) {
  return abilities.find((a) => a.id === id) || null;
}

export function findSkill(id) {
  return skills.find((s) => s.id === id) || null;
}

// SRD 5.2.1, "Ability Scores and Modifiers": subtract 10, halve, round down.
export function abilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level) {
  const row = advancement.find((r) => r.level === level);
  if (!row) throw new Error(`No Proficiency Bonus for level ${level}`);
  return row.proficiencyBonus;
}

// A character's score in one ability, with the parts that make it up.
// For now that is only the score assigned at creation; species, background and
// Ability Score Improvements add parts here as they arrive.
export function abilityScore(character, abilityId) {
  const ability = findAbility(abilityId);
  if (!ability) throw new Error(`Unknown ability: ${abilityId}`);
  const base = character.baseAbilityScores[abilityId];
  if (!Number.isInteger(base)) throw new Error(`${character.name} has no ${ability.name} score`);
  const parts = [{ label: 'Assigned score', value: base }];
  return { value: parts.reduce((sum, p) => sum + p.value, 0), parts };
}

// 'expertise', 'proficient' or 'none' for one skill.
export function skillProficiency(character, skillId) {
  if (character.expertise.includes(skillId)) return 'expertise';
  if (character.skillProficiencies.includes(skillId)) return 'proficient';
  return 'none';
}

// Everything added to the d20 for an ability check, each with where it comes from.
// testId is a skill ('persuasion') or, for a plain ability check, an ability ('strength').
export function checkModifiers(character, testId) {
  const skill = findSkill(testId);
  const ability = findAbility(skill ? skill.ability : testId);
  if (!ability) throw new Error(`Unknown skill or ability: ${testId}`);

  const score = abilityScore(character, ability.id).value;
  const modifiers = [
    {
      label: ability.abbreviation,
      value: abilityModifier(score),
      source: `${ability.name} ${score}`,
    },
  ];

  if (skill) {
    const proficiency = skillProficiency(character, skill.id);
    const bonus = proficiencyBonus(character.level);
    if (proficiency === 'proficient') {
      modifiers.push({
        label: 'Proficiency',
        value: bonus,
        source: `Proficient in ${skill.name}; +${bonus} at level ${character.level}`,
      });
    } else if (proficiency === 'expertise') {
      modifiers.push({
        label: 'Expertise',
        value: bonus * 2,
        source: `Expertise in ${skill.name}; twice the +${bonus} at level ${character.level}`,
      });
    }
  }

  return { ability, skill, modifiers, total: modifiers.reduce((sum, m) => sum + m.value, 0) };
}

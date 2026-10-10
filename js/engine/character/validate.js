// Checks a character's choices against the creation rules (SRD 5.2.1, "Character Creation").
// Returns a list of plain-language problems; an empty list means the character is legal.
// Character creation uses it to guide the player; loading a save uses it to refuse a hero
// that has been damaged or tampered with.

import { abilities } from '../../../data/srd/abilities.js';
import { skills } from '../../../data/srd/skills.js';
import { standardArray, pointBuy, maxAbilityScore } from '../../../data/srd/character-creation.js';
import { drives } from '../../../data/campaign/drives.js';
import { bonds } from '../../../data/campaign/bonds.js';
import { expertiseChoices, expertiseCount, findArmor, findBackground, findClass, findFeat, findSpecies, masteryChoices, weaponMasteryCount } from './sheet.js';
import { spellProblems } from './spells.js';
import { lookProblems } from './look.js';

const ABILITY_IDS = abilities.map((a) => a.id);
const SKILL_IDS = skills.map((s) => s.id);
const SPELLCASTING_ABILITIES = ['intelligence', 'wisdom', 'charisma'];

// Names are kept short enough to fit the screen.
export const MAX_NAME_LENGTH = 40;

export function validateCharacter(character) {
  const problems = [];
  const need = (ok, message) => {
    if (!ok) problems.push(message);
  };

  need(typeof character.name === 'string' && character.name.trim() !== '', 'The hero needs a name.');
  need(typeof character.name !== 'string' || character.name.length <= MAX_NAME_LENGTH, `Names can be up to ${MAX_NAME_LENGTH} letters.`);

  const cls = findClass(character.classId);
  const sp = findSpecies(character.speciesId);
  const bg = findBackground(character.backgroundId);
  need(cls, `Unknown class: ${character.classId}.`);
  need(sp, `Unknown species: ${character.speciesId}.`);
  need(bg, `Unknown background: ${character.backgroundId}.`);
  if (!cls || !sp || !bg) return problems;

  const maxLevel = cls.levels.length;
  need(Number.isInteger(character.level) && character.level >= 1 && character.level <= maxLevel, `Level must be 1 to ${maxLevel} for now.`);

  // Subclass: chosen at level 3, from the class's list.
  if (character.subclassId !== null && character.subclassId !== undefined) {
    need(cls.subclasses.some((s) => s.id === character.subclassId), `Unknown ${cls.name} subclass: ${character.subclassId}.`);
    need(character.level >= 3, 'A subclass is chosen at level 3.');
  }

  // Species: size and any ancestry, lineage or legacy.
  need(sp.sizes.includes(character.size), `A ${sp.name} can be ${sp.sizes.join(' or ')}.`);
  if (sp.choice) {
    need(sp.choice.options.some((o) => o.id === character.speciesChoice), `Choose a ${sp.choice.name}.`);
  }
  if (sp.spellcastingAbilityChoice) {
    need(SPELLCASTING_ABILITIES.includes(character.spellcastingAbility), 'Choose Intelligence, Wisdom or Charisma for species spells.');
  }

  // Ability scores.
  const base = character.baseAbilityScores || {};
  const scores = ABILITY_IDS.map((id) => base[id]);
  need(scores.every(Number.isInteger), 'Every ability needs a score.');
  if (scores.every(Number.isInteger)) {
    const method = character.abilityScoreMethod;
    if (method === 'standard-array') {
      const sorted = [...scores].sort((a, b) => b - a);
      need(JSON.stringify(sorted) === JSON.stringify(standardArray), `The Standard Array is ${standardArray.join(', ')}, each used once.`);
    } else if (method === 'point-buy') {
      const inRange = scores.every((s) => s in pointBuy.costs);
      need(inRange, 'Point Cost scores must be 8 to 15.');
      if (inRange) {
        const spent = scores.reduce((sum, s) => sum + pointBuy.costs[s], 0);
        need(spent <= pointBuy.budget, `That costs ${spent} points; the limit is ${pointBuy.budget}.`);
      }
    } else if (method === 'random' || method === 'manual') {
      need(scores.every((s) => s >= 3 && s <= 18), 'Rolled scores are 3 to 18.');
    } else {
      problems.push(`Unknown ability score method: ${method}.`);
    }
  }

  // Background increases: +2/+1 to two listed abilities, or +1 to all three; none above 20.
  const increases = Object.entries(character.backgroundIncreases || {}).filter(([, v]) => v !== 0);
  const amounts = increases.map(([, v]) => v).sort();
  const pattern = JSON.stringify(amounts);
  need(
    increases.every(([id]) => bg.abilities.includes(id)),
    `The ${bg.name} background can only raise ${bg.abilities.join(', ')}.`,
  );
  need(pattern === '[1,2]' || pattern === '[1,1,1]', 'Background increases are +2 and +1, or +1 to all three.');
  for (const [id, amount] of increases) {
    if (Number.isInteger(base[id])) need(base[id] + amount <= maxAbilityScore, `No score can go above ${maxAbilityScore}.`);
  }

  // Skills.
  const classSkills = character.classSkills || [];
  need(
    classSkills.length === cls.skillChoices.count && new Set(classSkills).size === classSkills.length,
    `Choose ${cls.skillChoices.count} different ${cls.name} skills.`,
  );
  need(classSkills.every((s) => cls.skillChoices.from.includes(s)), `${cls.name} skills must come from the ${cls.name} list.`);
  const speciesSkills = character.speciesSkills || [];
  if (sp.skillChoice) {
    const allowed = sp.skillChoice.from || SKILL_IDS;
    need(speciesSkills.length === sp.skillChoice.count && speciesSkills.every((s) => allowed.includes(s)), `Choose ${sp.skillChoice.count} skill from your ${sp.name} traits.`);
  } else {
    need(speciesSkills.length === 0, `A ${sp.name} doesn't choose a skill.`);
  }

  // Feats: the Human's Origin feat, Skilled's skills, the Fighter's Fighting Style; and the
  // Cleric's Divine Order.
  const originFeat = character.originFeat ? findFeat(character.originFeat) : null;
  if (sp.originFeat) {
    need(originFeat && originFeat.category === 'origin', 'Choose an Origin feat.');
  } else {
    need(!character.originFeat, `A ${sp.name} doesn't get an extra Origin feat.`);
  }
  const skilledCount = [bg.feat.id, character.originFeat].filter((id) => id === 'skilled').length * 3;
  const featSkills = character.featSkills || [];
  need(featSkills.length === skilledCount && featSkills.every((s) => SKILL_IDS.includes(s)), `Choose ${skilledCount} skills for Skilled.`);

  const choices = character.classChoices || {};
  if (character.classId === 'fighter') {
    const style = findFeat(choices.fightingStyle);
    need(style && style.category === 'fighting-style', 'Choose a Fighting Style.');
  }
  if (cls.divineOrders) {
    need(cls.divineOrders.some((o) => o.id === choices.divineOrder), 'Choose a Divine Order.');
  }
  if (character.classId === 'wizard' && character.level >= 2) {
    const ok = cls.scholarSkills.includes(choices.scholarSkill) && classSkills.concat(bg.skills, speciesSkills, featSkills).includes(choices.scholarSkill);
    need(ok, 'Choose a Scholar skill you are proficient in.');
  }
  // Weapon Mastery (the Fighter and the Rogue): as many different weapons as the class gives,
  // each one the hero is proficient with.
  if (Number.isInteger(character.level) && character.level >= 1 && character.level <= maxLevel) {
    const count = weaponMasteryCount(character);
    const mastered = choices.weaponMasteries || [];
    const allowed = masteryChoices(character);
    const ok = mastered.length === count && new Set(mastered).size === count && mastered.every((id) => allowed.includes(id));
    need(ok, count ? `Choose ${count} different weapons you’re proficient with for Weapon Mastery.` : `A ${cls.name} has no Weapon Mastery.`);
    // A Rogue's Expertise: as many different skills as the class gives, each one the hero is
    // proficient in.
    const experts = expertiseCount(character);
    const expertise = choices.expertise || [];
    const skilled = expertiseChoices(character);
    const expertOk = expertise.length === experts && new Set(expertise).size === experts && expertise.every((id) => skilled.includes(id));
    need(expertOk, experts ? `Choose ${experts} different skills you’re proficient in for Expertise.` : `A ${cls.name} has no Expertise to choose.`);
  }

  // Drive and Bond (original additions; see docs/DESIGN.md, "Character Creation").
  need(drives.some((d) => d.id === character.drive), 'Choose a Drive.');
  const bond = character.bond || {};
  need(bonds.some((b) => b.id === bond.type), 'Choose a Bond.');
  need(typeof bond.name === 'string' && bond.name.trim() !== '', 'Name your Bond.');
  need(typeof bond.name !== 'string' || bond.name.length <= MAX_NAME_LENGTH, `Names can be up to ${MAX_NAME_LENGTH} letters.`);

  // Starting equipment: which kit option was taken from the class and from the background.
  const kit = character.startingEquipment || {};
  need(cls.startingEquipment.some((o) => o.option === kit.class), `Choose ${cls.name} starting equipment.`);
  need(bg.equipment.some((o) => o.option === kit.background), `Choose ${bg.name} starting equipment.`);

  // Spells: the class's cantrips, spellbook and prepared spells, and Magic Initiate's choices.
  problems.push(...spellProblems(character));

  // Look: skin, hair, outfit and headgear from the Look step's options.
  problems.push(...lookProblems(character));

  // Hit Point rolls for levels after 1: a Hit Die result, or null for the fixed value.
  const rolls = character.hitPointRolls || [];
  need(rolls.length <= Math.max(0, character.level - 1), 'There are more Hit Point rolls than levels.');
  need(rolls.every((r) => r === null || (Number.isInteger(r) && r >= 1 && r <= cls.hitDie)), `Hit Point rolls must be 1 to ${cls.hitDie}.`);

  // Armour must exist (wearing it untrained is allowed, but has penalties in play).
  if (character.armorId) need(findArmor(character.armorId), `Unknown armor: ${character.armorId}.`);
  need(typeof character.shield === 'boolean', 'Say whether the hero carries a Shield.');

  return problems;
}

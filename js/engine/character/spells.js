// A hero's spells: which they know, where each comes from, and which they can cast now.
//
// Stored on the character (choices only):
//   spells         for a class with Spellcasting (the Wizard), else null:
//                  { cantrips: [ids], spellbook: [ids], prepared: [ids] }
//                  The spellbook holds level 1+ spells; prepared ones come from the spellbook
//                  and can be changed after a Long Rest.
//   magicInitiate  one entry per Magic Initiate feat (from the background, or the Human's
//                  Versatile trait): { source: 'background' | 'species', list: 'cleric' |
//                  'druid' | 'wizard', ability, cantrips: [two ids], spell: id }
// Species spells (Elf, Gnome and Tiefling lineages) come from the species data and need
// no choices beyond the spellcasting ability.

import { spells } from '../../../data/srd/spells.js';
import { abilityModifierOf, findAbility, findBackground, findClass, findFeat, findSpecies, proficiencyBonus, speciesOption } from './sheet.js';

export const findSpell = (id) => spells.find((s) => s.id === id) || null;

// Spells on a class's list at a level (0 = cantrips).
export function spellsOnList(listId, level) {
  return spells.filter((s) => s.level === level && s.lists.includes(listId));
}

export const SPELLCASTING_ABILITIES = ['intelligence', 'wisdom', 'charisma'];

// The class row for the character's level, for a class with Spellcasting.
function classRow(character) {
  const cls = findClass(character.classId);
  if (!cls || !cls.spellcasting) return null;
  return cls.levels[Math.min(character.level, cls.levels.length) - 1];
}

// The highest spell level the character has slots for (0 if none).
export function highestSpellLevel(character) {
  const row = classRow(character);
  return row ? row.slots.length : 0;
}

// How many cantrips, spellbook spells and prepared spells the class gives at this level.
export function classSpellCounts(character) {
  const cls = findClass(character.classId);
  const row = classRow(character);
  if (!row) return null;
  return {
    cantrips: row.cantrips,
    spellbook: cls.spellcasting.spellbookAtLevel1 + cls.spellcasting.spellbookPerLevel * (character.level - 1),
    prepared: row.preparedSpells,
  };
}

// The Magic Initiate feats the character has, and which spell list each is tied to
// (null = the player picks, which is the Human's Versatile trait).
export function magicInitiateSources(character) {
  const sources = [];
  const background = findBackground(character.backgroundId);
  if (background && background.feat.id === 'magic-initiate') sources.push({ source: 'background', list: background.feat.spellList });
  const sp = findSpecies(character.speciesId);
  if (sp && sp.originFeat && character.originFeat === 'magic-initiate') sources.push({ source: 'species', list: null });
  return sources;
}

// The lists a Magic Initiate feat can use: any the feat allows, except one already taken
// by the character's other Magic Initiate (the feat can repeat, with a different list).
export function magicInitiateLists(character, source) {
  const other = (character.magicInitiate || []).find((entry) => entry.source !== source);
  return findFeat('magic-initiate').spellLists.filter((list) => !other || other.list !== list);
}

// The spells a species gives at the character's level: cantrips, plus spells it can cast
// once per Long Rest without a slot (or always has prepared).
export function speciesSpells(character) {
  const sp = findSpecies(character.speciesId);
  if (!sp || !sp.spellcastingAbilityChoice) return null;
  const option = speciesOption(character);
  const cantrips = [sp.cantrip, option && option.cantrip, ...((option && option.cantrips) || [])].filter(Boolean);
  const always = [];
  const bonus = proficiencyBonus(character.level);
  if (option && option.alwaysPrepared) always.push({ id: option.alwaysPrepared, note: 'without a spell slot as many times as your Proficiency Bonus per Long Rest', freeUses: bonus });
  if (option && option.level3Spell && character.level >= 3) always.push({ id: option.level3Spell, note: 'once per Long Rest without a spell slot', freeUses: 1 });
  if (option && option.level5Spell && character.level >= 5) always.push({ id: option.level5Spell, note: 'once per Long Rest without a spell slot', freeUses: 1 });
  return { label: option ? option.name : sp.name, ability: character.spellcastingAbility, cantrips, always };
}

// Every spell the hero has, grouped by where it comes from, for the character sheet:
// [{ label, ability, cantrips: [spell], prepared: [spell], spellbook: [spell],
//    always: [{ spell, note, freeUses }] }]
// freeUses: how many times the spell can be cast without a spell slot each Long Rest (it can
// always be cast with a slot too). Free casts spent are counted in game.featureUses, under
// freeCastKey(spell id).
export function spellGroups(character) {
  const groups = [];
  const cls = findClass(character.classId);
  if (cls && cls.spellcasting && character.spells) {
    groups.push({
      label: cls.name,
      ability: cls.spellcasting.ability,
      cantrips: character.spells.cantrips.map(findSpell),
      prepared: character.spells.prepared.map(findSpell),
      spellbook: character.spells.spellbook.map(findSpell),
      always: [],
    });
  }
  for (const entry of character.magicInitiate || []) {
    groups.push({
      label: `Magic Initiate (${capitalise(entry.list)})`,
      ability: entry.ability,
      cantrips: entry.cantrips.map(findSpell),
      prepared: [],
      spellbook: [],
      always: entry.spell ? [{ spell: findSpell(entry.spell), note: 'once per Long Rest without a spell slot', freeUses: 1 }] : [],
    });
  }
  const fromSpecies = speciesSpells(character);
  if (fromSpecies) {
    groups.push({
      label: fromSpecies.label,
      ability: fromSpecies.ability,
      cantrips: fromSpecies.cantrips.map(findSpell),
      prepared: [],
      spellbook: [],
      always: fromSpecies.always.map(({ id, note, freeUses }) => ({ spell: findSpell(id), note, freeUses })),
    });
  }
  return groups;
}

// Where the free casts of a spell spent since the last Long Rest are counted in
// game.featureUses (a Long Rest clears them).
export const freeCastKey = (spellId) => `free-cast:${spellId}`;

// How many free casts of a spell the hero has left before their next Long Rest (0 if the
// spell doesn't come with any).
export function freeCastsLeft(game, spellId) {
  let uses = 0;
  for (const group of spellGroups(game.character)) {
    for (const entry of group.always) if (entry.spell && entry.spell.id === spellId) uses = Math.max(uses, entry.freeUses || 0);
  }
  return Math.max(0, uses - ((game.featureUses || {})[freeCastKey(spellId)] || 0));
}

// Spell save DC and spell attack bonus for a spellcasting ability, with their parts.
export function spellNumbers(character, abilityId) {
  const mod = abilityModifierOf(character, abilityId);
  const bonus = proficiencyBonus(character.level);
  const short = findAbility(abilityId).abbreviation;
  return {
    saveDc: derived([{ label: 'Base', value: 8 }, { label: short, value: mod }, { label: 'Proficiency', value: bonus }]),
    attackBonus: derived([{ label: short, value: mod }, { label: 'Proficiency', value: bonus }]),
  };
}

// True if the hero can cast this spell right now (ignoring spent slots): a cantrip they
// know, a prepared or always-prepared spell, or a Wizard ritual in their spellbook
// (Ritual Adept). Scenes use it to offer spell choices.
export function canCastSpell(character, spellId) {
  for (const group of spellGroups(character)) {
    if (group.cantrips.some((s) => s && s.id === spellId)) return true;
    if (group.prepared.some((s) => s && s.id === spellId)) return true;
    if (group.always.some(({ spell }) => spell && spell.id === spellId)) return true;
    if (group.spellbook.some((s) => s && s.id === spellId && s.ritual)) return true;
  }
  return false;
}

// Problems with the character's spell choices, for the rules checker. Counts can be lower
// than the class allows (new levels are filled in by the level-up screen), never higher.
export function spellProblems(character) {
  const problems = [];
  const need = (ok, message) => {
    if (!ok) problems.push(message);
  };
  const cls = findClass(character.classId);
  const distinct = (list) => new Set(list).size === list.length;

  if (cls && cls.spellcasting) {
    const book = character.spells;
    const ok = book && ['cantrips', 'spellbook', 'prepared'].every((k) => Array.isArray(book[k]));
    need(ok, `A ${cls.name} needs cantrips, a spellbook and prepared spells.`);
    if (ok) {
      const counts = classSpellCounts(character);
      const top = highestSpellLevel(character);
      const onList = (id, test) => {
        const spell = findSpell(id);
        return Boolean(spell && spell.lists.includes(cls.id) && test(spell.level));
      };
      need(book.cantrips.length <= counts.cantrips && distinct(book.cantrips), `A ${cls.name} knows up to ${counts.cantrips} different cantrips.`);
      need(book.cantrips.every((id) => onList(id, (l) => l === 0)), `Cantrips must be ${cls.name} cantrips.`);
      need(distinct(book.spellbook) && book.spellbook.every((id) => onList(id, (l) => l >= 1 && l <= top)), `The spellbook holds ${cls.name} spells of level 1 to ${top}.`);
      need(book.prepared.length <= counts.prepared && distinct(book.prepared), `A ${cls.name} prepares up to ${counts.prepared} spells.`);
      need(book.prepared.every((id) => book.spellbook.includes(id)), 'Prepared spells must come from the spellbook.');
    }
  } else {
    need(!character.spells, `A ${cls ? cls.name : 'hero'} has no Spellcasting feature.`);
  }

  const expected = magicInitiateSources(character);
  const entries = character.magicInitiate || [];
  need(entries.length === expected.length && expected.every((e) => entries.some((x) => x.source === e.source)), 'Each Magic Initiate feat needs its spells chosen.');
  for (const entry of entries) {
    const wanted = expected.find((e) => e.source === entry.source);
    if (!wanted) continue;
    const listOk = wanted.list ? entry.list === wanted.list : magicInitiateLists(character, entry.source).includes(entry.list);
    need(listOk, 'Magic Initiate needs a spell list it can use.');
    need(SPELLCASTING_ABILITIES.includes(entry.ability), 'Magic Initiate needs Intelligence, Wisdom or Charisma.');
    const cantrips = entry.cantrips || [];
    need(cantrips.length === 2 && distinct(cantrips) && cantrips.every((id) => isOn(id, entry.list, 0)), 'Magic Initiate gives two cantrips from its list.');
    need(isOn(entry.spell, entry.list, 1), 'Magic Initiate gives one level 1 spell from its list.');
  }
  return problems;
}

function isOn(id, list, level) {
  const spell = findSpell(id);
  return Boolean(spell && spell.level === level && spell.lists.includes(list));
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function derived(parts) {
  return { value: parts.reduce((sum, p) => sum + p.value, 0), parts };
}

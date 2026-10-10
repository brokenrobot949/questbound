// Companions (original): the people who can travel and fight beside the hero (docs/DESIGN.md,
// "Companions"; docs/STORY.md has who they are). Up to two at a time.
//
// A companion is a full character, built like a hero (see character/sheet.js), and levels
// with the hero: they're always the hero's level. Only their level 1 choices are written out;
// `levels` says what changes from a later level on (a new spell prepared, the subclass at 3),
// and every level after 1 takes the fixed Hit Points.
//
//   speaker   their id in people.js, for their portrait in scenes
//   summary   who they are, in a line, for the Party section of the Sheet
//   likes, dislikes   what wins or loses their approval, for writing scenes (STORY.md)
//   tactic    how they fight until the player changes it: 'aggressive', 'defensive',
//             'support' or 'hold' (see combat/companion-ai.js)
//
// Safe to edit, as long as their choices stay legal: tests/classes.html checks every level.

export const companions = [
  {
    id: 'odda',
    speaker: 'odda',
    summary: 'A dwarf priest of the Steadfast Flame: brusque, kind, and always brewing tea.',
    likes: ['mercy', 'honesty', 'protecting the weak'],
    dislikes: ['robbing tombs', 'cruelty', 'lies'],
    tactic: 'support',
    character: {
      name: 'Odda Brasswick',
      level: 1,
      classId: 'cleric',
      subclassId: null,
      speciesId: 'dwarf',
      size: 'medium',
      speciesChoice: null,
      spellcastingAbility: null,
      backgroundId: 'acolyte',
      // The Cleric's suggested Standard Array, then the Acolyte's +2 Wisdom and +1 Charisma.
      abilityScoreMethod: 'standard-array',
      baseAbilityScores: { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 15, charisma: 12 },
      backgroundIncreases: { wisdom: 2, charisma: 1 },
      classSkills: ['medicine', 'persuasion'], // the Acolyte gives Insight and Religion
      speciesSkills: [],
      featSkills: [],
      originFeat: null,
      classChoices: { divineOrder: 'protector' }, // trained for battle
      drive: 'faith',
      bond: { type: 'mentor', name: 'Abbess Hulda' },
      startingEquipment: { class: 'A', background: 'A' }, // chain shirt, Shield, mace
      spells: {
        cantrips: ['sacred-flame', 'spare-the-dying', 'guidance'],
        spellbook: [],
        prepared: ['cure-wounds', 'bless', 'guiding-bolt', 'shield-of-faith'],
      },
      // The Acolyte's Magic Initiate (Cleric): Healing Word, free once per Long Rest.
      magicInitiate: [{ source: 'background', list: 'cleric', ability: 'wisdom', cantrips: ['light', 'thaumaturgy'], spell: 'healing-word' }],
      look: { skin: 'tan', hairStyle: 'long', hairColor: 'auburn', beard: false, outfit: 'yellow', accent: 'red', headgear: 'none' },
      hitPointRolls: [],
      armorId: 'chain-shirt',
      shield: true,
    },
    levels: {
      2: { prepared: ['cure-wounds', 'bless', 'guiding-bolt', 'shield-of-faith', 'sanctuary'] },
      // The Life Domain: Aid, Bless, Cure Wounds and Lesser Restoration are always prepared.
      3: { subclassId: 'life', prepared: ['guiding-bolt', 'shield-of-faith', 'sanctuary', 'spiritual-weapon', 'prayer-of-healing', 'command'] },
    },
    source: 'original',
  },
  {
    id: 'fen',
    speaker: 'fen',
    summary: 'A halfling informant with a price on his head, who used to sing for the Ashen Choir.',
    likes: ['cleverness', 'freedom', 'sparing people'],
    dislikes: ['hangings', 'people who worship authority', 'the Ashen Choir'],
    tactic: 'aggressive',
    character: {
      name: 'Fen Underbough',
      level: 1,
      classId: 'rogue',
      subclassId: null,
      speciesId: 'halfling',
      size: 'small',
      speciesChoice: null,
      spellcastingAbility: null,
      backgroundId: 'criminal',
      // The Standard Array with a talker's Charisma, then the Criminal's +2 Dexterity and +1
      // Intelligence.
      abilityScoreMethod: 'standard-array',
      baseAbilityScores: { strength: 8, dexterity: 15, constitution: 13, intelligence: 12, wisdom: 10, charisma: 14 },
      backgroundIncreases: { dexterity: 2, intelligence: 1 },
      classSkills: ['deception', 'insight', 'perception', 'persuasion'], // the Criminal gives Sleight of Hand and Stealth
      speciesSkills: [],
      featSkills: [],
      originFeat: null,
      classChoices: { expertise: ['stealth', 'deception'], weaponMasteries: ['dagger', 'shortsword'] },
      drive: 'freedom',
      bond: { type: 'debt', name: 'the Ashen Choir' },
      startingEquipment: { class: 'A', background: 'B' }, // leather, daggers, shortsword, shortbow
      spells: null,
      magicInitiate: [],
      look: { skin: 'peach', hairStyle: 'tousled', hairColor: 'brown', beard: false, outfit: 'green', accent: 'brown', headgear: 'hood' },
      hitPointRolls: [],
      armorId: 'leather-armor',
      shield: false,
    },
    levels: {
      3: { subclassId: 'thief' },
    },
    source: 'original',
  },
];

// How companions fight (the Party section of the Sheet lets the player choose).
export const tactics = [
  { id: 'aggressive', name: 'Aggressive', summary: 'Goes after the foe they can hurt most.' },
  { id: 'defensive', name: 'Defensive', summary: 'Stays close to you and fights whatever comes near.' },
  { id: 'support', name: 'Support', summary: 'Heals and helps first, and fights from beside you.' },
  { id: 'hold', name: 'Hold', summary: 'Stays put, and fights only what they can reach from there.' },
];

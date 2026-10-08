// How to upgrade a save from one version to the next.
//
// When the save format changes:
//   1. raise SAVE_VERSION in save-format.js by one;
//   2. add a step here, keyed by the OLD version number, that takes a save in the old shape
//      and returns it in the new shape with version set one higher.
// Never edit or remove a step once released: old saves on players' phones still need it.

import { startingInventory } from '../character/inventory.js';
import { maxHitPoints } from '../character/sheet.js';

export const migrations = {
  // Version 2 remembers which session the save was last backed up in, for the backup reminder.
  // Older saves have never been backed up.
  1: (save) => ({ ...save, version: 2, lastBackupSession: 0 }),

  // Version 3 adds story flags (none set yet) and names the scene each page happens in.
  2: (save) => ({
    ...save,
    version: 3,
    game: { ...save.game, flags: [], page: { scene: null, ...save.game.page } },
  }),

  // Version 4 gives heroes a class, species and background. Saves before it held a stand-in
  // test hero with none of those, so it becomes the version 4 stand-in (a Human Fighter with
  // the Soldier background), keeping its name and level. The rules data covers levels 1–3 so far.
  3: (save) => {
    const old = save.game.character;
    return {
      ...save,
      version: 4,
      game: {
        ...save.game,
        character: {
          name: old.name,
          level: Math.min(Math.max(old.level, 1), 3),
          classId: 'fighter',
          subclassId: null,
          speciesId: 'human',
          size: 'medium',
          speciesChoice: null,
          spellcastingAbility: null,
          backgroundId: 'soldier',
          abilityScoreMethod: 'standard-array',
          baseAbilityScores: { strength: 15, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 10, charisma: 13 },
          backgroundIncreases: { strength: 2, constitution: 1 },
          classSkills: ['persuasion', 'perception'],
          speciesSkills: ['insight'],
          featSkills: [],
          originFeat: 'alert',
          classChoices: { fightingStyle: 'defense' },
          hitPointRolls: [],
          armorId: 'chain-mail',
          shield: false,
          source: 'original',
        },
      },
    };
  },

  // Version 5 adds the hero's Drive, Bond and starting equipment choice, made at character
  // creation. Saves before it held the stand-in Human Fighter, who gets the same Drive and
  // Bond as the Quick Start Fighter and the kit with the Chain Mail they already wear.
  4: (save) => ({
    ...save,
    version: 5,
    game: {
      ...save.game,
      character: {
        ...save.game.character,
        drive: 'justice',
        bond: { type: 'sibling', name: 'Kit Ashdown' },
        startingEquipment: { class: 'A', background: 'A' },
      },
    },
  }),

  // Version 6 adds spells. Wizards made before it get a starter set, and Acolyte and Sage
  // heroes get Magic Initiate spells (Humans couldn't take Magic Initiate before it).
  5: (save) => {
    const hero = save.game.character;
    const spells =
      hero.classId === 'wizard'
        ? {
            cantrips: ['fire-bolt', 'light', 'mage-hand'],
            spellbook: ['burning-hands', 'detect-magic', 'mage-armor', 'magic-missile', 'shield', 'sleep'],
            prepared: ['mage-armor', 'magic-missile', 'shield', 'sleep'],
          }
        : null;
    const magicInitiate = [];
    if (hero.backgroundId === 'acolyte') {
      magicInitiate.push({ source: 'background', list: 'cleric', ability: 'wisdom', cantrips: ['guidance', 'sacred-flame'], spell: 'cure-wounds' });
    }
    if (hero.backgroundId === 'sage') {
      magicInitiate.push({ source: 'background', list: 'wizard', ability: 'intelligence', cantrips: ['minor-illusion', 'ray-of-frost'], spell: 'false-life' });
    }
    return { ...save, version: 6, game: { ...save.game, character: { ...hero, spells, magicInitiate } } };
  },

  // Version 7 adds the hero's look (skin, hair, outfit). Heroes made before it get the
  // starting look for their species and class.
  6: (save) => {
    const hero = save.game.character;
    const bySpecies = {
      dragonborn: ['copper', 'bald', 'black', false],
      dwarf: ['tan', 'tousled', 'auburn', true],
      elf: ['porcelain', 'long', 'blonde', false],
      gnome: ['peach', 'tousled', 'white', false],
      goliath: ['grey', 'bald', 'black', false],
      halfling: ['peach', 'tousled', 'brown', false],
      human: ['peach', 'tousled', 'brown', false],
      orc: ['green', 'long', 'black', false],
      tiefling: ['crimson', 'long', 'black', false],
    };
    const [skin, hairStyle, hairColor, beard] = bySpecies[hero.speciesId] || bySpecies.human;
    const [outfit, accent] = hero.classId === 'wizard' ? ['blue', 'red'] : ['red', 'brown'];
    const look = { skin, hairStyle, hairColor, beard, outfit, accent, headgear: 'none' };
    return { ...save, version: 7, game: { ...save.game, character: { ...hero, look } } };
  },

  // Version 8 adds the in-game day and time, Heroic Inspiration, the journal, and money and
  // a pack. Games before it start on day 1 with an empty journal and the kits the hero chose.
  7: (save) => {
    const { inventory, money } = startingInventory(save.game.character);
    return {
      ...save,
      version: 8,
      game: {
        ...save.game,
        time: null,
        day: 1,
        inspiration: false,
        journal: { quests: [], deeds: [], unread: false },
        money,
        inventory,
      },
    };
  },

  // Version 9 adds what a hero spends in a fight: Hit Points, spell slots and feature uses,
  // plus XP and a fight in progress. Heroes before it were never hurt: full Hit Points.
  8: (save) => ({
    ...save,
    version: 9,
    game: {
      ...save.game,
      hp: maxHitPoints(save.game.character).value,
      slotsUsed: [],
      featureUses: {},
      xp: 0,
      battle: null,
      lastBattle: null,
    },
  }),

  // Version 10 adds a level-up in progress. Saves before it had none.
  9: (save) => ({ ...save, version: 10, game: { ...save.game, levelUp: null } }),

  // Version 11 adds where the hero is in a dungeon. Saves before it had never been in one.
  10: (save) => ({ ...save, version: 11, game: { ...save.game, dungeon: null } }),

  // Version 12 adds the session ritual: session summaries in the journal, the hero's aim,
  // and where this session began (taken as the moment the save was last played).
  11: (save) => {
    const { game } = save;
    const session = {
      number: save.sessionCount,
      startedAt: save.savedAt,
      day: game.day,
      xp: game.xp,
      level: game.character.level,
      deeds: game.journal.deeds.length,
      quests: Object.fromEntries(game.journal.quests.map((q) => [q.id, q.status])),
      ended: false,
    };
    return { ...save, version: 12, game: { ...game, objective: null, session, journal: { ...game.journal, sessions: [] } } };
  },
};

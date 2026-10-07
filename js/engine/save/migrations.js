// How to upgrade a save from one version to the next.
//
// When the save format changes:
//   1. raise SAVE_VERSION in save-format.js by one;
//   2. add a step here, keyed by the OLD version number, that takes a save in the old shape
//      and returns it in the new shape with version set one higher.
// Never edit or remove a step once released: old saves on players' phones still need it.

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
};

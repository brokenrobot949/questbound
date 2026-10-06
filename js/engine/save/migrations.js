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
};

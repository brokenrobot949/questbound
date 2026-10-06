// How to upgrade a save from one version to the next.
//
// When the save format changes:
//   1. raise SAVE_VERSION in save-format.js by one;
//   2. add a step here, keyed by the OLD version number, that takes a save in the old shape
//      and returns it in the new shape with version set one higher.
// Never edit or remove a step once released: old saves on players' phones still need it.
//
// Example:
//   1: (save) => ({ ...save, version: 2, game: { ...save.game, gold: 0 } }),

export const migrations = {};

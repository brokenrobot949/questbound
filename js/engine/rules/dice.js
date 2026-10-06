// Dice. Every die is rolled with the game's seeded RNG (see rng.js), never Math.random().

// One die with the given number of sides: a d20 gives 1 to 20.
export function rollDie(rng, sides) {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new Error(`A die needs a whole number of sides, got ${sides}`);
  }
  return rng.nextInt(sides) + 1;
}

// Several dice of the same size, e.g. rollDice(rng, 2, 6) for 2d6.
// Returns each die as well as the total, so the UI can show them all.
export function rollDice(rng, count, sides) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Dice count must be a whole number of 1 or more, got ${count}`);
  }
  const rolls = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(rng, sides));
  return { count, sides, rolls, total: rolls.reduce((sum, r) => sum + r, 0) };
}

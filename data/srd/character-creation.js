// Character creation rules (SRD 5.2.1, "Character Creation").

// Standard Array: assign these six scores to the six abilities.
export const standardArray = [15, 14, 13, 12, 10, 8];

// Point Cost: 27 points, scores from 8 to 15.
export const pointBuy = {
  budget: 27,
  costs: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
};

// Random Generation: roll four d6s and keep the highest three, six times.
export const randomGeneration = { dice: 4, sides: 6, keep: 3, scores: 6 };

// Background increases: +2 and +1 to two different listed abilities, or +1 to all three.
// None can raise a score above this.
export const maxAbilityScore = 20;

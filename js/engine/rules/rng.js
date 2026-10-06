// The game's one seeded random number generator. All game randomness goes through it;
// never call Math.random() in game logic.
//
// Algorithm: sfc32, seeded by hashing a seed string with cyrb128. Its whole state is four
// 32-bit numbers, which the save file stores so that reloading reproduces the same rolls.
// Changing the algorithm would change every roll in existing saves, so don't.

export function createRng(seed) {
  return new Rng(seedToState(String(seed)));
}

// A fresh random seed for a new game, from the browser's crypto source.
export function randomSeed() {
  const words = new Uint32Array(2);
  crypto.getRandomValues(words);
  return Array.from(words, (w) => w.toString(36)).join('');
}

export class Rng {
  constructor(state) {
    this.setState(state);
  }

  // The next raw value: a whole number from 0 to 4,294,967,295.
  nextUint32() {
    const s = this.state;
    const t = (((s[0] + s[1]) | 0) + s[3]) | 0;
    s[3] = (s[3] + 1) | 0;
    s[0] = s[1] ^ (s[1] >>> 9);
    s[1] = (s[2] + (s[2] << 3)) | 0;
    s[2] = (s[2] << 21) | (s[2] >>> 11);
    s[2] = (s[2] + t) | 0;
    return t >>> 0;
  }

  // A whole number from 0 to n - 1, every value equally likely.
  // Raw values from the uneven top end of the range are thrown away and redrawn.
  nextInt(n) {
    if (!Number.isInteger(n) || n < 1 || n > 0x100000000) {
      throw new Error(`nextInt needs a whole number from 1 to 2^32, got ${n}`);
    }
    const limit = Math.floor(0x100000000 / n) * n;
    let x = this.nextUint32();
    while (x >= limit) x = this.nextUint32();
    return x % n;
  }

  // A copy of the state, as plain numbers, ready to save as JSON.
  getState() {
    return this.state.map((v) => v >>> 0);
  }

  setState(state) {
    if (!Array.isArray(state) || state.length !== 4 || !state.every(Number.isInteger)) {
      throw new Error('RNG state must be an array of four whole numbers');
    }
    this.state = state.map((v) => v | 0);
  }
}

// cyrb128: turns any string into four well-mixed 32-bit numbers.
function seedToState(seed) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;

  // Warm up so that similar seeds ("a", "b") don't start with similar values.
  const rng = new Rng([h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]);
  for (let i = 0; i < 15; i++) rng.nextUint32();
  return rng.getState();
}

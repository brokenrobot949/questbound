// Player settings, kept in localStorage. Every key starts with "questbound:" because Rob's
// other games share the same web address and storage.
// Settings belong to the device, not to a save slot.

const PREFIX = 'questbound:';

// Each setting and its value when the player hasn't chosen one.
const DEFAULTS = {
  autoRoll: false, // roll the d20 straight away instead of waiting for a tap
  plainNarration: false, // show the story in a plain font instead of the pixel font
  battleSpeed: 'normal', // how fast turns play out in a fight: 'slow', 'normal' or 'fast'
};

// Settings changed on this visit. If storage is full or blocked, they still last until the page closes.
const changed = {};

export function getSetting(name) {
  if (!(name in DEFAULTS)) throw new Error(`Unknown setting: ${name}`);
  if (name in changed) return changed[name];
  try {
    const stored = localStorage.getItem(PREFIX + name);
    return stored === null ? DEFAULTS[name] : JSON.parse(stored);
  } catch {
    return DEFAULTS[name];
  }
}

export function setSetting(name, value) {
  if (!(name in DEFAULTS)) throw new Error(`Unknown setting: ${name}`);
  changed[name] = value;
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    // Kept in memory only; see above.
  }
}

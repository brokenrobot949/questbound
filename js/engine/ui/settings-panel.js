// The Settings panel, opened from the title screen or during play. Settings belong to this
// device, not to a save slot. (The full Menu screen arrives later; this is its first piece.)

import { getSetting, setSetting } from '../save/settings.js';
import { actionButton } from './backup-panels.js';
import { el } from './dom.js';

const OPTIONS = [
  {
    name: 'plainNarration',
    label: 'Plain font for the story',
    hint: 'Shows narration and choices in an easy-reading font instead of the pixel font.',
  },
  {
    name: 'autoRoll',
    label: 'Roll the d20 automatically',
    hint: "Skips tapping the die. You still see every roll in full.",
  },
];

// Puts the display settings into effect. Call at startup and after any change.
export function applySettings() {
  document.documentElement.dataset.narration = getSetting('plainNarration') ? 'plain' : 'pixel';
}

// onClose(): the player pressed Done.
export function settingsPanel({ onClose }) {
  const panel = el('section', 'settings-panel');
  panel.setAttribute('aria-label', 'Settings');
  panel.append(el('h2', 'panel-heading', 'Settings'));
  for (const option of OPTIONS) {
    const row = el('label', 'setting');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = getSetting(option.name);
    box.addEventListener('change', () => {
      setSetting(option.name, box.checked);
      applySettings();
    });
    const text = el('span', 'setting-text');
    text.append(el('span', 'setting-label', option.label), el('span', 'setting-hint', option.hint));
    row.append(box, text);
    panel.append(row);
  }
  panel.append(actionButton('Done', onClose));
  return panel;
}

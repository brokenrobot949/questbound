// Building blocks for screens where the player picks things: option cards, chips, sections,
// text fields and "tap to show the maths" numbers.
//
// Every control gets a data-key, so a screen that redraws itself can put the keyboard focus
// back where it was (see keepFocus).

import { el } from './dom.js';

// A large card the player picks one of. selected shows it chosen; lines are short facts.
// media: a picture to show beside the text (a hero's sprite), or null.
export function optionCard({ key, title, lines = [], tag = '', selected = false, disabled = false, media = null, onSelect }) {
  const card = el('button', 'choice-card option-card');
  card.type = 'button';
  card.dataset.key = key;
  card.setAttribute('aria-pressed', String(selected));
  card.disabled = disabled;
  const text = media ? el('span', 'option-text') : card;
  const top = el('span', 'option-top');
  top.append(el('span', 'option-title', title));
  if (tag) top.append(el('span', 'choice-tag', tag));
  text.append(top);
  for (const line of lines) text.append(el('span', 'option-line', line));
  if (media) {
    card.classList.add('has-media');
    card.append(media, text);
  }
  card.addEventListener('click', onSelect);
  return card;
}

// A chip with a colour sample in front of its name, for picking colours.
export function swatchChip({ key, label, color, selected = false, onToggle }) {
  const button = chip({ key, label: '', selected, onToggle });
  const sample = el('span', 'swatch');
  sample.style.background = color;
  button.append(sample, document.createTextNode(label));
  return button;
}

// A small toggle button, in a row of others.
export function chip({ key, label, selected = false, disabled = false, onToggle, title = '' }) {
  const button = el('button', 'chip', label);
  button.type = 'button';
  button.dataset.key = key;
  button.setAttribute('aria-pressed', String(selected));
  button.disabled = disabled;
  if (title) button.title = title;
  button.addEventListener('click', onToggle);
  return button;
}

export function chipRow(chips, label) {
  const row = el('div', 'chip-row');
  row.setAttribute('role', 'group');
  if (label) row.setAttribute('aria-label', label);
  row.append(...chips);
  return row;
}

export function optionList(cards) {
  const list = el('div', 'option-list');
  list.append(...cards);
  return list;
}

// A boxed part of a screen with a heading and an optional hint underneath.
export function section(heading, hint = '') {
  const box = el('section', 'creation-section');
  box.append(el('h3', 'section-heading', heading));
  if (hint) box.append(el('p', 'section-hint', hint));
  return box;
}

// A name that can be expanded to show its full text (a trait, a feature, a feat).
export function expandable(summary, text) {
  const details = el('details', 'expandable');
  details.append(el('summary', '', summary), el('p', 'expandable-text', text));
  return details;
}

// A labelled one-line text box. onInput(value) runs on every change.
export function textField({ key, label, value, maxLength, onInput, placeholder = '' }) {
  const wrap = el('label', 'text-field');
  wrap.append(el('span', 'text-field-label', label));
  const input = el('input', 'text-input');
  input.type = 'text';
  input.value = value;
  input.maxLength = maxLength;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.dataset.key = key;
  input.addEventListener('input', () => onInput(input.value));
  wrap.append(input);
  return { wrap, input };
}

// A number from the rules engine that shows how it was worked out when tapped.
// stat: { value, parts: [{ label, value }] }. format(value) turns the number into text.
export function mathsNumber({ label, stat, format = String, unit = '' }) {
  const details = el('details', 'stat');
  const summary = el('summary', 'stat-summary');
  summary.append(el('span', 'stat-label', label), el('span', 'stat-value', `${format(stat.value)}${unit}`));
  const parts = el('ul', 'stat-parts');
  for (const part of stat.parts) parts.append(el('li', '', `${part.label}: ${signedOrPlain(part.value, stat.parts[0] === part)}`));
  details.append(summary, parts);
  return details;
}

// The first part reads as a plain number (Base 10); later parts show their sign (+2, −1).
function signedOrPlain(n, first) {
  if (first) return String(n);
  return `${n < 0 ? '−' : '+'}${Math.abs(n)}`;
}

// Redraws with fill(), then puts the focus back on the control that had it.
export function keepFocus(container, fill) {
  const key = document.activeElement && container.contains(document.activeElement) ? document.activeElement.dataset.key : null;
  fill();
  if (!key) return;
  const again = [...container.querySelectorAll('[data-key]')].find((node) => node.dataset.key === key);
  if (again && !again.disabled) again.focus({ preventScroll: true });
}

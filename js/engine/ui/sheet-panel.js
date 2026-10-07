// The Sheet tab during play: the hero's sheet (every number taps open to show its maths),
// plus what changes in play: Heroic Inspiration, coins and the pack.

import { findBond, findDrive } from '../character/creation.js';
import { findItem, itemText, moneyText } from '../character/inventory.js';
import { heroSheet } from './hero-sheet.js';
import { el } from './dom.js';
import { expandable } from './widgets.js';

export function sheetPanel(game) {
  const { character } = game;
  const panel = el('div', 'sheet-panel');
  panel.append(heroSheet(character));

  const drive = findDrive(character.drive);
  const bond = findBond(character.bond.type);
  const story = el('section', 'sheet-block');
  story.append(el('h3', 'section-heading', 'Drive, Bond and Inspiration'));
  story.append(el('p', 'sheet-line', `Drive: ${drive.name}. ${drive.inspiration}`));
  story.append(el('p', 'sheet-line', `Bond: ${bond.name}, ${character.bond.name}.`));
  story.append(
    el(
      'p',
      'sheet-line',
      game.inspiration ? 'Heroic Inspiration: ★ you have it.' : 'Heroic Inspiration: not right now. Choices that fit your Drive earn it.',
    ),
  );
  panel.append(story);

  const pack = el('section', 'sheet-block');
  pack.append(el('h3', 'section-heading', 'Pack'));
  pack.append(el('p', 'sheet-line', `Coins: ${moneyText(game.money)}`));
  const held = game.inventory.filter((entry) => entry.quantity > 0);
  if (held.length === 0) pack.append(el('p', 'section-hint', 'Your pack is empty.'));
  for (const entry of held) {
    const item = findItem(entry.id);
    pack.append(item.text ? expandable(itemText(entry), item.text) : el('p', 'pack-item', itemText(entry)));
  }
  panel.append(pack);
  return panel;
}

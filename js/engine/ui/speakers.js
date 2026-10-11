// Portraits of the people who speak in scenes (data/campaign/people.js), shown beside the
// lines they speak: a small framed picture and their name. People are drawn like heroes
// (character/look.js); creatures (goblins, the Choir, a wolf) come from the DawnLike sheets.

import { people } from '../../../data/campaign/people.js';
import { sprites } from '../../../data/campaign/sprites.js';
import { heroSprite } from '../character/look.js';
import { spriteCanvas } from './sprite-canvas.js';
import { drawTile, loadArt, TILE } from './tile-art.js';
import { el, showFatalError } from './dom.js';

const SCALE = 3; // 48 pixels across

export const findPerson = (id) => people.find((p) => p.id === id) || null;

// The sprite of someone drawn like a hero. The class only decides whether they wear a robe.
export function personSprite(person) {
  return heroSprite({
    classId: person.robe ? 'wizard' : 'fighter',
    speciesId: person.species,
    speciesChoice: null,
    size: person.size,
    armorId: person.armor,
    shield: false,
    look: person.look,
  });
}

// The name under someone's portrait. The hero's Bond (a rival, say) goes by the name the
// player gave them at creation (hero: the hero's character).
export function speakerName(person, hero = null) {
  const bond = hero && hero.bond;
  if (person.bond && bond && bond.type === person.bond && bond.name) return bond.name;
  return person.name;
}

// A line someone speaks: their portrait and name, then the paragraph. continued: the same
// person spoke the paragraph before, so the portrait isn't repeated. hero: the hero's
// character, for their Bond's name.
export function speechBlock(text, speakerId, { continued = false, hero = null } = {}) {
  const person = findPerson(speakerId);
  const block = el('div', `speech${continued ? ' is-continued' : ''}`);
  const body = el('div', 'speech-body');
  if (!continued) {
    block.append(portraitOf(person));
    body.append(el('p', 'speaker-name', person ? speakerName(person, hero) : speakerId));
  }
  body.append(el('p', 'narration-text', text));
  block.append(body);
  return block;
}

function portraitOf(person) {
  const frame = el('div', 'speaker-portrait');
  if (!person) return frame;
  if (person.sprite) frame.append(tileCanvas(person.sprite, person.name));
  else frame.append(spriteCanvas(personSprite(person), { scale: SCALE, label: person.name, animate: false }));
  return frame;
}

// A creature from the DawnLike sheets, drawn once the sheets have loaded.
function tileCanvas(spriteId, label) {
  const canvas = el('canvas', 'sprite');
  canvas.width = TILE;
  canvas.height = TILE;
  canvas.style.width = `${TILE * SCALE}px`;
  canvas.style.height = `${TILE * SCALE}px`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  loadArt()
    .then((art) => {
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      drawTile(ctx, art, sprites[spriteId], 0, 0, TILE);
    })
    .catch(showFatalError);
  return canvas;
}

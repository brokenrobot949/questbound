// The hero look gallery: draws heroes of every species and class, and every look option,
// so the pixel art can be checked by eye. Open tests/looks.html through the local server.

import { species } from '../data/srd/species.js';
import { classes } from '../data/srd/classes.js';
import { skinTones, hairColors, hairStyles, clothColors, headgear } from '../data/campaign/hero-looks.js';
import { defaultLook, heroSprite } from '../js/engine/character/look.js';

const gallery = document.getElementById('gallery');
// Add ?scale=10 to the address to look closer.
const SCALE = Number(new URLSearchParams(window.location.search).get('scale')) || 5;

function hero(overrides = {}) {
  const base = {
    classId: 'fighter',
    speciesId: 'human',
    speciesChoice: null,
    size: 'medium',
    armorId: null,
    shield: false,
    ...overrides,
  };
  return { ...base, look: { ...defaultLook(base), ...(overrides.look || {}) } };
}

// Both frames side by side, so the bob can be checked.
function figure(character, caption) {
  const sprite = heroSprite(character);
  const box = document.createElement('figure');
  for (const rows of sprite.frames) {
    const canvas = document.createElement('canvas');
    canvas.width = sprite.size;
    canvas.height = sprite.size;
    canvas.style.width = `${sprite.size * SCALE}px`;
    canvas.style.height = `${sprite.size * SCALE}px`;
    canvas.style.display = 'inline-block';
    const image = new ImageData(sprite.size, sprite.size);
    rows.forEach((row, y) => {
      [...row].forEach((letter, x) => {
        const hex = sprite.colors[letter];
        if (!hex) return;
        const i = (y * sprite.size + x) * 4;
        image.data.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255], i);
      });
    });
    canvas.getContext('2d').putImageData(image, 0, 0);
    box.append(canvas);
  }
  const text = document.createElement('figcaption');
  text.textContent = caption;
  box.append(text);
  return box;
}

function section(title, figures) {
  const heading = document.createElement('h2');
  heading.textContent = title;
  const row = document.createElement('div');
  row.className = 'row';
  row.append(...figures);
  gallery.append(heading, row);
}

const lineageOf = (sp) => (sp.choice ? sp.choice.options[0].id : null);

for (const cls of classes) {
  section(
    `${cls.name}s`,
    species.map((sp) => figure(hero({ classId: cls.id, speciesId: sp.id, speciesChoice: lineageOf(sp), size: sp.sizes[0] }), sp.name)),
  );
}

section('Armour and shields', [
  figure(hero({ armorId: 'chain-mail' }), 'Chain Mail'),
  figure(hero({ armorId: 'chain-mail', shield: true }), 'Chain Mail and Shield'),
  figure(hero({ armorId: 'studded-leather-armor' }), 'Studded Leather'),
  figure(hero({ armorId: 'chain-mail', look: { headgear: 'helmet' } }), 'Helmet'),
  figure(hero({ classId: 'wizard', look: { headgear: 'hood' } }), 'Hood'),
  figure(hero({ classId: 'wizard', speciesId: 'elf', speciesChoice: 'high-elf', look: { headgear: 'hood' } }), 'Elf in a hood'),
  figure(hero({ speciesId: 'tiefling', speciesChoice: 'infernal', armorId: 'chain-mail', look: { headgear: 'helmet' } }), 'Tiefling, helmet'),
]);

section('Small heroes', [
  figure(hero({ size: 'small' }), 'Small human'),
  figure(hero({ classId: 'wizard', speciesId: 'gnome', speciesChoice: 'rock-gnome', size: 'small' }), 'Gnome wizard'),
  figure(hero({ speciesId: 'halfling', size: 'small', armorId: 'leather-armor', shield: true }), 'Halfling in leather'),
]);

section('Hairstyles', hairStyles.map((h) => figure(hero({ look: { hairStyle: h.id } }), h.name)));
section('Beard', [figure(hero({ look: { beard: true } }), 'Beard'), figure(hero({ speciesId: 'dwarf', armorId: 'chain-mail' }), 'Dwarf')]);
section('Skin', skinTones.map((s) => figure(hero({ look: { skin: s.id } }), s.name)));
section('Hair colour', hairColors.map((h) => figure(hero({ look: { hairColor: h.id } }), h.name)));
section('Outfit', clothColors.map((c) => figure(hero({ classId: 'wizard', look: { outfit: c.id } }), c.name)));
section('Accent', clothColors.map((c) => figure(hero({ armorId: 'chain-mail', look: { accent: c.id } }), c.name)));
section('Headgear', headgear.map((h) => figure(hero({ classId: h.classes ? h.classes[0] : 'fighter', look: { headgear: h.id } }), h.name)));

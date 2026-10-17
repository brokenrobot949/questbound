// The dungeon map in the Adventure tab, while the hero is in a dungeon: the room they're in,
// drawn with the battle grid's tiles, with the hero standing at its entrance. "Whole map"
// shows every room explored so far, and keeps the rest dark.
//
// A choice tagged #go:room-id lights up the doorway to that room in gold; tapping the
// doorway takes the choice (the choice cards work too). Whoever is in a room (Mother Nettle
// on her throne, the dead at their digging, Lark on her ledge) stands on the map too, until
// the story moves them on. The hero's companions stand beside the hero.

import { parseMap } from '../combat/grid.js';
import { besideEntry, dungeonRows, findDungeon, findRoom, roomFigures } from '../world/dungeons.js';
import { drawCell, drawTile, frameSquare, loadArt, pixelScale, sizeCanvas, spriteImage, blit, TILE } from './tile-art.js';
import { sprites, tiles } from '../../../data/campaign/sprites.js';
import { findPerson, personSprite } from './speakers.js';
import { el } from './dom.js';

// People from data/campaign/people.js, drawn once each.
const personImages = new Map();
function personImage(id) {
  if (!personImages.has(id)) {
    const person = findPerson(id);
    if (!person) throw new Error(`Unknown person for a figure: ${id}`);
    const sprite = personSprite(person);
    personImages.set(id, spriteImage(sprite, sprite.frames[0]));
  }
  return personImages.get(id);
}

// The map as the story has left it (a drained vault, say), parsed once for each way it looks.
const parsed = new Map();
function dungeonMap(dungeon, flags) {
  const rows = dungeonRows(dungeon, flags);
  const key = `${dungeon.id}:${rows.join('/')}`;
  if (!parsed.has(key)) parsed.set(key, parseMap(rows, dungeon.legend));
  return parsed.get(key);
}

// The rows a room covers, inclusive.
const inRoom = (room, y) => y >= room.rows[0] && y <= room.rows[1];

// container: where to show it. state: { id, room, explored } (see world/dungeons.js).
// flags: the story flags, which say who is still in each room.
// hero: the hero's sprite (character/look.js). party: the companions with them, in the order
// they joined: [{ sprite, name }]. doors: [{ room: id, choice }] from the choices tagged #go.
// onGo(choice): the player tapped a lit doorway. stillWanted(): false if the page has moved on
// while the pictures loaded, and this map shouldn't appear after all.
export async function showDungeonMap({ container, state, flags = [], hero, party = [], doors = [], onGo, stillWanted = () => true }) {
  const dungeon = findDungeon(state.id);
  const room = findRoom(state.id, state.room);
  const map = dungeonMap(dungeon, flags);
  const art = await loadArt();
  if (!stillWanted()) return;
  const heroImage = spriteImage(hero, hero.frames[0]);
  const partyImages = party.map(({ sprite }) => spriteImage(sprite, sprite.frames[0]));
  let whole = false;

  const panel = el('section', 'dungeon-map');
  const top = el('div', 'dungeon-map-header');
  const title = el('span', 'dungeon-map-title', `${dungeon.name} · ${room.name}`);
  const toggle = el('button', 'slot-button dungeon-map-toggle', 'Whole map');
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', () => {
    whole = !whole;
    toggle.setAttribute('aria-pressed', String(whole));
    toggle.textContent = whole ? 'This room' : 'Whole map';
    draw();
  });
  top.append(title, toggle);
  const frame = el('div', 'dungeon-map-frame');
  const canvas = el('canvas', 'dungeon-map-canvas');
  canvas.setAttribute('role', 'img');
  frame.append(canvas);
  panel.append(top, frame);
  container.replaceChildren(panel);

  // Exit squares that a choice can take, with that choice.
  const lit = [];
  for (const { room: to, choice } of doors) {
    for (const pos of (room.exits && room.exits[to]) || []) lit.push({ pos, choice });
  }

  const view = { first: 0, last: 0, size: 0 };

  function draw() {
    // This room, or every row from the top of the map to the deepest room explored.
    const explored = dungeon.rooms.filter((r) => state.explored.includes(r.id));
    view.first = whole ? 0 : room.rows[0];
    view.last = whole ? Math.max(...explored.map((r) => r.rows[1])) : room.rows[1];
    const height = view.last - view.first + 1;
    const scale = pixelScale(map.width, panel);
    const ctx = sizeCanvas(canvas, map.width, height, scale);
    const size = TILE * scale;
    view.size = size;
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = view.first; y <= view.last; y++) {
      if (!explored.some((r) => inRoom(r, y))) continue; // unexplored stays dark
      for (let x = 0; x < map.width; x++) drawCell(ctx, art, map, x, y, size, x, y - view.first);
    }
    for (const { pos } of lit) {
      ctx.fillStyle = 'rgba(240, 200, 90, 0.35)';
      ctx.fillRect(pos.x * size, (pos.y - view.first) * size, size, size);
      frameSquare(ctx, { x: pos.x, y: pos.y - view.first }, size, scale, '#f0c85a');
    }
    // The people in the rooms shown: the fallen first, so the standing are drawn on top.
    const shown = whole ? explored : [room];
    const figures = shown.flatMap((r) => roomFigures(r, flags)).sort((a, b) => b.fallen - a.fallen);
    for (const figure of figures) {
      const how = { alpha: figure.fallen ? 0.45 : 1, lying: figure.fallen || figure.lying };
      if (figure.person) {
        blit(ctx, personImage(figure.person), 0, 0, figure.pos.x, figure.pos.y - view.first, size, how);
        continue;
      }
      const picture = sprites[figure.sprite] || tiles[figure.sprite];
      if (!picture) throw new Error(`Unknown sprite for a figure in ${dungeon.name}: ${figure.sprite}`);
      drawTile(ctx, art, picture, figure.pos.x, figure.pos.y - view.first, size, 0, how);
    }
    // The hero at the room's entry, and their companions on the free squares beside them.
    const spots = besideEntry(map, room, roomFigures(room, flags).map((f) => f.pos), partyImages.length);
    partyImages.forEach((image, i) => {
      if (spots[i]) blit(ctx, image, 0, 0, spots[i].x, spots[i].y - view.first, size);
    });
    blit(ctx, heroImage, 0, 0, room.entry.x, room.entry.y - view.first, size);
    const ways = lit.length ? ` Lit doorways lead on: ${[...new Set(doors.map((d) => findRoom(state.id, d.room).name))].join(', ')}.` : '';
    const here = [...new Set(roomFigures(room, flags).filter((f) => !f.fallen && f.name).map((f) => f.name))];
    const company = here.length ? ` Here: ${here.join(', ')}.` : '';
    const withYou = party.length ? ` With you: ${party.map((p) => p.name).join(' and ')}.` : '';
    canvas.setAttribute('aria-label', `Map of ${dungeon.name}. You are in ${room.name}.${withYou}${company}${ways}`);
    canvas.classList.toggle('has-doors', lit.length > 0);
  }

  canvas.addEventListener('click', (event) => {
    if (!lit.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * map.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * (view.last - view.first + 1)) + view.first;
    const door = lit.find(({ pos }) => pos.x === x && pos.y === y);
    if (door) onGo(door.choice);
  });

  draw();
}

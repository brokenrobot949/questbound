// The dungeon map in the Adventure tab, while the hero is in a dungeon: the room they're in,
// drawn with the battle grid's tiles, with the hero standing at its entrance. "Whole map"
// shows every room explored so far, and keeps the rest dark.
//
// A choice tagged #go:room-id lights up the doorway to that room in gold; tapping the
// doorway takes the choice (the choice cards work too). Whoever is in a room (Mother Nettle
// on her throne, the dead at their digging) stands on the map too, until the story moves
// them on.

import { parseMap } from '../combat/grid.js';
import { findDungeon, findRoom, roomFigures } from '../world/dungeons.js';
import { drawCell, drawTile, frameSquare, loadArt, pixelScale, sizeCanvas, spriteImage, blit, TILE } from './tile-art.js';
import { sprites, tiles } from '../../../data/campaign/sprites.js';
import { el } from './dom.js';

const parsed = new Map();
function dungeonMap(dungeon) {
  if (!parsed.has(dungeon.id)) parsed.set(dungeon.id, parseMap(dungeon.rows, dungeon.legend));
  return parsed.get(dungeon.id);
}

// The rows a room covers, inclusive.
const inRoom = (room, y) => y >= room.rows[0] && y <= room.rows[1];

// container: where to show it. state: { id, room, explored } (see world/dungeons.js).
// flags: the story flags, which say who is still in each room.
// hero: the hero's sprite (character/look.js). doors: [{ room: id, choice }] from the choices
// tagged #go. onGo(choice): the player tapped a lit doorway. stillWanted(): false if the page
// has moved on while the pictures loaded, and this map shouldn't appear after all.
export async function showDungeonMap({ container, state, flags = [], hero, doors = [], onGo, stillWanted = () => true }) {
  const dungeon = findDungeon(state.id);
  const room = findRoom(state.id, state.room);
  const map = dungeonMap(dungeon);
  const art = await loadArt();
  if (!stillWanted()) return;
  const heroImage = spriteImage(hero, hero.frames[0]);
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
      const picture = sprites[figure.sprite] || tiles[figure.sprite];
      if (!picture) throw new Error(`Unknown sprite for a figure in ${dungeon.name}: ${figure.sprite}`);
      drawTile(ctx, art, picture, figure.pos.x, figure.pos.y - view.first, size, 0, { alpha: figure.fallen ? 0.45 : 1, lying: figure.fallen });
    }
    blit(ctx, heroImage, 0, 0, room.entry.x, room.entry.y - view.first, size);
    const ways = lit.length ? ` Lit doorways lead on: ${[...new Set(doors.map((d) => findRoom(state.id, d.room).name))].join(', ')}.` : '';
    const here = [...new Set(roomFigures(room, flags).filter((f) => !f.fallen && f.name).map((f) => f.name))];
    const company = here.length ? ` Here: ${here.join(', ')}.` : '';
    canvas.setAttribute('aria-label', `Map of ${dungeon.name}. You are in ${room.name}.${company}${ways}`);
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

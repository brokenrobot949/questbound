// Dungeons: where the hero is, which rooms they've seen, and the battle map for a room.
// The maps are in data/campaign/dungeons.js.
//
// Saved on the game (it changes in play):
//   game.dungeon   null (never been in one), or { id, room, explored: [room ids] }.
//                  room is null once the hero has left the dungeon; explored is kept, so the
//                  map remembers it if they come back.
// Scenes move the hero with the line tag #room:dungeon-id/room-id, and #room:none to leave.

import { dungeons } from '../../../data/campaign/dungeons.js';
import { isStandable, squaresBetween } from '../combat/grid.js';

export const findDungeon = (id) => dungeons.find((d) => d.id === id) || null;

export function findRoom(dungeonId, roomId) {
  const dungeon = findDungeon(dungeonId);
  return dungeon ? dungeon.rooms.find((r) => r.id === roomId) || null : null;
}

// "brackenhollow/mouth" → { dungeonId: 'brackenhollow', roomId: 'mouth' }; "none" → null.
export function parseRoomTag(value) {
  if (value === 'none') return null;
  const [dungeonId, roomId] = value.split('/').map((part) => part.trim());
  if (!findRoom(dungeonId, roomId)) throw new Error(`Unknown room: ${value}`);
  return { dungeonId, roomId };
}

// The dungeon state after the hero enters a room (or leaves, with null).
export function enterRoom(state, where) {
  if (!where) return state ? { ...state, room: null } : null;
  const known = state && state.id === where.dungeonId ? state.explored : [];
  return {
    id: where.dungeonId,
    room: where.roomId,
    explored: known.includes(where.roomId) ? [...known] : [...known, where.roomId],
  };
}

// Who the hero finds in a room, given the story flags: [{ sprite, person, pos, name, lying,
// fallen }] (sprite or person is null). Anyone who has left (a goneOn flag is set) isn't
// there; anyone who fell (a fallenOn flag is set) lies where they fell.
export function roomFigures(room, flags) {
  const anySet = (list) => (list || []).some((flag) => flags.includes(flag));
  return (room.figures || [])
    .filter((figure) => !anySet(figure.goneOn))
    .map((figure) => ({
      sprite: figure.sprite || null,
      person: figure.person || null,
      pos: figure.pos,
      name: figure.name || null,
      lying: Boolean(figure.lying),
      fallen: anySet(figure.fallenOn),
    }));
}

// Where the hero's companions stand in a room: the free squares nearest its entry, in the
// order they joined, as at the start of a fight (combat/battle.js). map: the dungeon's parsed
// map (combat/grid.js). taken: squares someone already stands on. Only the room's own squares
// count. Returns up to `count` squares.
export function besideEntry(map, room, taken, count) {
  const isTaken = (pos) => taken.some((t) => t.x === pos.x && t.y === pos.y) || (pos.x === room.entry.x && pos.y === room.entry.y);
  const free = [];
  for (let y = room.rows[0]; y <= room.rows[1]; y++) {
    for (let x = 0; x < map.width; x++) if (isStandable(map, { x, y }) && !isTaken({ x, y })) free.push({ x, y });
  }
  free.sort((a, b) => squaresBetween(a, room.entry) - squaresBetween(b, room.entry) || a.y - b.y || a.x - b.x);
  return free.slice(0, count);
}

// The rows and legend of a fight's map: its own map, or a room's band of a dungeon map
// (encounter.map = { dungeon, room }), so the fight happens where the hero is standing.
export function encounterRows(encounter) {
  const { map } = encounter;
  if (!map.dungeon) return { rows: map.rows, legend: map.legend };
  const dungeon = findDungeon(map.dungeon);
  const room = findRoom(map.dungeon, map.room);
  if (!room) throw new Error(`Unknown room for ${encounter.id}: ${map.dungeon}/${map.room}`);
  return { rows: dungeon.rows.slice(room.rows[0], room.rows[1] + 1), legend: dungeon.legend };
}

// Checks a saved dungeon state, for loading saves.
export function dungeonStateOk(state) {
  if (state === null) return true;
  if (!state || !findDungeon(state.id) || !Array.isArray(state.explored)) return false;
  if (!state.explored.every((id) => findRoom(state.id, id))) return false;
  return state.room === null || findRoom(state.id, state.room) !== null;
}

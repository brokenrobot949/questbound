// Areas of effect on the battle grid: which squares a Cone, Cube or Sphere covers, and
// whether walls are in the way. Rules: SRD 5.2.1, "Area of Effect" (Cone, Cube, Sphere).
//
// The rules give the shapes in feet; on the 5-foot grid the game lays them out like this
// (and the battle screen shows the squares before you cast):
//   Cone    from your square, in one of eight directions. Straight ahead, each row is about
//           as wide as it is far from you: 1 square, then 3, then 3 for a 15-foot Cone (then
//           5, 5, 7 for longer ones). On a diagonal, the squares in that corner near the
//           diagonal line: 7 for a 15-foot Cone, the same as straight ahead.
//   Cube    from your square: a block as many squares across as the Cube's side, straight
//           ahead (centred on you) or in the corner of a diagonal.
//   Sphere  every square within its radius of the centre square, counted the way movement
//           is (each diagonal is 5 feet): a 5-foot radius is a 3 × 3 block, 10 feet is 5 × 5.
// A Cone's or Cube's point of origin isn't part of it, so your own square never is; a
// Sphere's centre is. Walls block an area: a square only counts if a straight line from the
// point of origin reaches it without passing through a wall.

import { SQUARE_FEET, cellAt, inBounds } from './grid.js';

// The eight directions an area can face from the caster.
export const DIRECTIONS = [
  { id: 'n', name: 'north', dx: 0, dy: -1 },
  { id: 'ne', name: 'north-east', dx: 1, dy: -1 },
  { id: 'e', name: 'east', dx: 1, dy: 0 },
  { id: 'se', name: 'south-east', dx: 1, dy: 1 },
  { id: 's', name: 'south', dx: 0, dy: 1 },
  { id: 'sw', name: 'south-west', dx: -1, dy: 1 },
  { id: 'w', name: 'west', dx: -1, dy: 0 },
  { id: 'nw', name: 'north-west', dx: -1, dy: -1 },
];

export const findDirection = (id) => DIRECTIONS.find((d) => d.id === id) || null;

// The direction from one square towards another, to the nearest of the eight (for tapping
// a square to aim at). Null if they're the same square.
export function directionTowards(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!dx && !dy) return null;
  const turn = Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)); // 0 = north, clockwise
  return DIRECTIONS[(turn + 8) % 8];
}

// The squares an area covers on a map. shape and size come from the spell's area
// ({ shape: 'cone', size: 15 }); origin is the caster's square for a Cone or Cube and the
// centre for a Sphere; direction (a DIRECTIONS id) is needed for a Cone or Cube.
export function areaSquares(map, { shape, size }, origin, direction = null) {
  const length = Math.round(size / SQUARE_FEET);
  let offsets;
  if (shape === 'sphere') offsets = sphereOffsets(length);
  else {
    const dir = findDirection(direction);
    if (!dir) throw new Error(`A ${shape} needs a direction`);
    offsets = shape === 'cone' ? coneOffsets(length, dir) : cubeOffsets(length, dir);
  }
  return offsets
    .map(([dx, dy]) => ({ x: origin.x + dx, y: origin.y + dy }))
    .filter((pos) => inBounds(map, pos) && cellAt(map, pos).terrain !== 'wall' && lineOfEffect(map, origin, pos));
}

function sphereOffsets(radius) {
  const offsets = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) offsets.push([dx, dy]);
  return offsets;
}

function coneOffsets(length, { dx, dy }) {
  const offsets = [];
  if (dx && dy) {
    // A diagonal: squares in that corner, close to the diagonal line.
    for (let i = 1; i <= length; i++) {
      for (let j = 1; j <= length; j++) {
        if (Math.abs(i - j) <= Math.floor(Math.max(i, j) / 2)) offsets.push([i * dx, j * dy]);
      }
    }
    return offsets;
  }
  // Straight ahead: at distance d, a row reaching floor(d / 2) squares to each side.
  for (let d = 1; d <= length; d++) {
    const reach = Math.floor(d / 2);
    for (let side = -reach; side <= reach; side++) offsets.push(dx ? [d * dx, side] : [side, d * dy]);
  }
  return offsets;
}

function cubeOffsets(side, { dx, dy }) {
  const offsets = [];
  if (dx && dy) {
    for (let i = 1; i <= side; i++) for (let j = 1; j <= side; j++) offsets.push([i * dx, j * dy]);
    return offsets;
  }
  const low = -Math.floor((side - 1) / 2);
  for (let d = 1; d <= side; d++) {
    for (let across = low; across < low + side; across++) offsets.push(dx ? [d * dx, across] : [across, d * dy]);
  }
  return offsets;
}

// True if a straight line from the middle of one square to the middle of another passes
// through no wall on the way (the two end squares themselves don't count).
export function lineOfEffect(map, from, to) {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * 4;
  for (let i = 1; i < steps; i++) {
    const x = Math.floor(from.x + 0.5 + ((to.x - from.x) * i) / steps);
    const y = Math.floor(from.y + 0.5 + ((to.y - from.y) * i) / steps);
    if ((x === from.x && y === from.y) || (x === to.x && y === to.y)) continue;
    const cell = cellAt(map, { x, y });
    if (!cell || cell.terrain === 'wall') return false;
  }
  return true;
}

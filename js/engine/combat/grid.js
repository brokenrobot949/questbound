// The battle grid: squares 5 feet across, positions { x, y } from the top left.
// Rules: SRD 5.2.1, "Combat on a Grid". Every square costs 5 feet to enter, diagonals included;
// difficult terrain costs 10. You can move through an ally's square but not an enemy's, and
// you can't end your move in anyone's square. Walls and obstacles can't be entered, and a
// diagonal step can't cut across the corner of a wall. Crawling costs 5 feet more a square.

export const SQUARE_FEET = 5;

// A map from its rows of letters and a legend, e.g. legend['#'] = { terrain: 'wall' }.
// Terrain: 'floor', 'wall', 'obstacle' (blocks movement, like a pile of sacks), 'difficult'.
export function parseMap(rows, legend) {
  const height = rows.length;
  const width = rows[0].length;
  const cells = rows.map((row, y) => {
    if (row.length !== width) throw new Error(`Map row ${y} is ${row.length} squares wide, not ${width}`);
    return [...row].map((letter) => {
      const cell = legend[letter];
      if (!cell) throw new Error(`The map legend has no "${letter}"`);
      return { letter, ...cell };
    });
  });
  return { width, height, cells };
}

export const inBounds = (map, { x, y }) => x >= 0 && y >= 0 && x < map.width && y < map.height;
export const cellAt = (map, pos) => (inBounds(map, pos) ? map.cells[pos.y][pos.x] : null);
export const key = ({ x, y }) => `${x},${y}`;
export const samePos = (a, b) => a.x === b.x && a.y === b.y;

export function isStandable(map, pos) {
  const cell = cellAt(map, pos);
  return Boolean(cell && cell.terrain !== 'wall' && cell.terrain !== 'obstacle');
}

// Squares between two creatures: diagonals count the same as straight lines.
export function squaresBetween(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function feetBetween(a, b) {
  return squaresBetween(a, b) * SQUARE_FEET;
}

export const isAdjacent = (a, b) => squaresBetween(a, b) === 1;

const STEPS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Every square a creature can reach this turn, with what it costs and the way there.
// blockedBy(pos): 'enemy' (can't pass), 'ally' (can pass, can't stop) or null.
// crawling: a Prone creature crawls, and every square costs 5 feet more.
// Returns a Map from key(pos) to { pos, cost (feet), path: [pos, …] (not including the start) }.
export function reachableSquares(map, start, feet, blockedBy = () => null, { crawling = false } = {}) {
  const best = new Map([[key(start), { pos: start, cost: 0, path: [] }]]);
  const queue = [{ pos: start, cost: 0, path: [] }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const here = queue.shift();
    for (const [dx, dy] of STEPS) {
      const next = { x: here.pos.x + dx, y: here.pos.y + dy };
      if (!isStandable(map, next)) continue;
      if (dx && dy && (!isStandable(map, { x: here.pos.x + dx, y: here.pos.y }) || !isStandable(map, { x: here.pos.x, y: here.pos.y + dy }))) {
        continue; // no cutting corners
      }
      if (blockedBy(next) === 'enemy') continue;
      const cost = here.cost + stepCost(map, next, crawling);
      if (cost > feet) continue;
      const known = best.get(key(next));
      if (known && known.cost <= cost) continue;
      const step = { pos: next, cost, path: [...here.path, next] };
      best.set(key(next), step);
      queue.push(step);
    }
  }
  // Nobody can end their move in a square someone else is standing in.
  for (const [k, step] of best) if (k !== key(start) && blockedBy(step.pos)) best.delete(k);
  return best;
}

// What it costs to move into a square: 5 feet, 10 in difficult terrain, and 5 more when
// crawling (SRD 5.2.1, "Crawling": each foot costs 1 extra foot, 2 extra in difficult terrain).
export function stepCost(map, pos, crawling = false) {
  return ((cellAt(map, pos).terrain === 'difficult' ? 2 : 1) + (crawling ? 1 : 0)) * SQUARE_FEET;
}

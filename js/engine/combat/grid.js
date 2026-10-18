// The battle grid: squares 5 feet across, positions { x, y } from the top left.
// Rules: SRD 5.2.1, "Combat on a Grid". Every square costs 5 feet to enter, diagonals included;
// difficult terrain costs 10. You can move through an ally's square but not an enemy's, and
// you can't end your move in anyone's square. Walls, obstacles and deep water can't be entered,
// and a diagonal step can't cut across the corner of one. Crawling costs 5 feet more a square.
// An incorporeal creature (a Specter) passes through walls, obstacles and creatures as if they
// were difficult terrain (see reachableSquares).

export const SQUARE_FEET = 5;

// A map from its rows of letters and a legend, e.g. legend['#'] = { terrain: 'wall' }.
// Terrain: 'floor', 'wall', 'obstacle' (blocks movement, like a pile of sacks), 'difficult',
// 'water' (deep water: nobody can wade in, but it blocks neither sight nor attacks).
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
  return Boolean(cell && cell.terrain !== 'wall' && cell.terrain !== 'obstacle' && cell.terrain !== 'water');
}

// What's in the way on a straight line from the middle of one square to the middle of
// another (the two end squares themselves don't count): 'wall' if a wall is (it blocks sight
// and attacks: Total Cover), 'obstacle' if only an obstacle is (sacks, a barrel, a tree: they
// block sight, so a creature can hide behind them), or null for a clear line. A line that runs
// exactly between two squares, past a corner, is blocked only if both squares block it.
export function lineBlock(map, from, to) {
  const steps = squaresBetween(from, to) * 8;
  const order = { wall: 2, obstacle: 1 };
  let worst = null;
  for (let i = 1; i < steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    // The squares the point lies in: two on a boundary between squares, four on a corner.
    const near = (v) => (Math.abs(v - Math.floor(v) - 0.5) < 1e-9 ? [Math.floor(v), Math.ceil(v)] : [Math.round(v)]);
    const cells = near(x).flatMap((cx) => near(y).map((cy) => ({ x: cx, y: cy })));
    if (cells.some((c) => samePos(c, from) || samePos(c, to))) continue;
    const blocks = cells.map((c) => {
      const cell = cellAt(map, c);
      if (!cell || cell.terrain === 'wall') return 'wall';
      return cell.terrain === 'obstacle' ? 'obstacle' : null;
    });
    if (blocks.includes(null)) continue;
    const here = blocks.includes('obstacle') ? 'obstacle' : 'wall';
    if (!worst || order[here] > order[worst]) worst = here;
  }
  return worst;
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
// slowAt(pos): true where the creature's Speed is halved (a foe inside Spirit Guardians), so
// moving into that square costs twice as much.
// incorporeal: a Specter's Incorporeal Movement (SRD 5.2.1): it moves through other creatures,
// walls and obstacles as if they were Difficult Terrain, and can cut corners, but not through
// deep water or off the map. It never ends its move inside a wall or an obstacle (the SRD would
// let it, at a cost of 1d10 Force damage; the game's foes never choose to), nor in someone's
// square.
// Returns a Map from key(pos) to { pos, cost (feet), path: [pos, …] (not including the start) }.
export function reachableSquares(map, start, feet, blockedBy = () => null, { crawling = false, slowAt = null, incorporeal = false } = {}) {
  const best = new Map([[key(start), { pos: start, cost: 0, path: [] }]]);
  const queue = [{ pos: start, cost: 0, path: [] }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const here = queue.shift();
    for (const [dx, dy] of STEPS) {
      const next = { x: here.pos.x + dx, y: here.pos.y + dy };
      if (incorporeal ? !passable(map, next) : !isStandable(map, next)) continue;
      if (!incorporeal && dx && dy && (!isStandable(map, { x: here.pos.x + dx, y: here.pos.y }) || !isStandable(map, { x: here.pos.x, y: here.pos.y + dy }))) {
        continue; // no cutting corners
      }
      if (!incorporeal && blockedBy(next) === 'enemy') continue;
      const cost = here.cost + stepCost(map, next, crawling, slowAt, incorporeal && passingThrough(map, next, blockedBy));
      if (cost > feet) continue;
      const known = best.get(key(next));
      if (known && known.cost <= cost) continue;
      const step = { pos: next, cost, path: [...here.path, next] };
      best.set(key(next), step);
      queue.push(step);
    }
  }
  // Nobody can end their move in a square someone else is standing in, or inside a wall.
  for (const [k, step] of best) if (k !== key(start) && (blockedBy(step.pos) || !isStandable(map, step.pos))) best.delete(k);
  return best;
}

// Squares an incorporeal creature can move into: anything on the map but deep water.
const passable = (map, pos) => Boolean(cellAt(map, pos) && cellAt(map, pos).terrain !== 'water');

// True if moving into this square takes an incorporeal creature through something: a wall, an
// obstacle, or another creature (which costs as Difficult Terrain does).
export function passingThrough(map, pos, blockedBy = () => null) {
  return !isStandable(map, pos) || Boolean(blockedBy(pos));
}

// What it costs to move into a square: 5 feet, 10 in difficult terrain, and 5 more when
// crawling (SRD 5.2.1, "Crawling": each foot costs 1 extra foot, 2 extra in difficult terrain);
// all twice over where the creature's Speed is halved (slowAt, see reachableSquares).
// difficult: true to count the square as difficult terrain whatever it is (an incorporeal
// creature passing through a wall or someone).
export function stepCost(map, pos, crawling = false, slowAt = null, difficult = false) {
  const cost = ((difficult || cellAt(map, pos).terrain === 'difficult' ? 2 : 1) + (crawling ? 1 : 0)) * SQUARE_FEET;
  return slowAt && slowAt(pos) ? cost * 2 : cost;
}

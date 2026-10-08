// Drawing DawnLike pixel art on a canvas: loading the sheets, drawing a square of the map
// (floor, walls that join up with their neighbours, things on the floor), sprites lying down
// or faded, and the hero's paper-doll sprite. The battle grid and the dungeon map share it.
// Everything is drawn at a whole-number scale so the pixels stay crisp.

import { sheets, tiles, wallPieces, wallStyles } from '../../../data/campaign/sprites.js';

export const TILE = 16;

const images = new Map();
// Loads a DawnLike sheet once (path from the repo root, as in data/campaign/sprites.js).
function sheetImage(path) {
  if (!images.has(path)) {
    images.set(
      path,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Couldn't load ${path}`));
        image.src = new URL(`../../../${path}`, import.meta.url).href;
      }),
    );
  }
  return images.get(path);
}

// Every sheet, loaded: { player: [frame 0 image, frame 1 image], floor: [image], … }.
export async function loadArt() {
  const loaded = {};
  for (const [name, paths] of Object.entries(sheets)) loaded[name] = await Promise.all(paths.map(sheetImage));
  return loaded;
}

// The largest whole number of device pixels per sprite pixel that fits `squares` across the
// container, so the pixel art stays crisp on every screen.
export function pixelScale(squares, container) {
  const dpr = window.devicePixelRatio || 1;
  const available = Math.max(160, container.clientWidth || 320) * dpr;
  return Math.max(1, Math.floor(available / (squares * TILE)));
}

// Sizes a canvas for a grid of squares at a pixel scale. Returns the 2D context.
export function sizeCanvas(canvas, width, height, scale) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * TILE * scale;
  canvas.height = height * TILE * scale;
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// Draws one 16 × 16 square of an image onto grid square (x, y), faded by alpha, and turned a
// quarter on its side when lying (a whole quarter turn keeps the pixels crisp).
export function blit(ctx, image, sx, sy, x, y, size, { alpha = 1, lying = false } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (lying) {
    ctx.translate(x * size + size / 2, y * size + size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(image, sx, sy, TILE, TILE, -size / 2, -size / 2, size, size);
  } else {
    ctx.drawImage(image, sx, sy, TILE, TILE, x * size, y * size, size, size);
  }
  ctx.restore();
}

// A picture from the sheets. The tile's own alpha and lying (data/campaign/sprites.js)
// combine with any given here.
export function drawTile(ctx, art, tile, x, y, size, frame = 0, { alpha = 1, lying = false } = {}) {
  const sheet = art[tile.sheet][Math.min(frame, art[tile.sheet].length - 1)];
  blit(ctx, sheet, tile.col * TILE, tile.row * TILE, x, y, size, { alpha: alpha * (tile.alpha || 1), lying: lying || Boolean(tile.lying) });
}

// One square of a parsed map (see combat/grid.js): its floor and anything on it, or a wall
// that picks its tile from which neighbours are walls too. (x, y) is the square on the map;
// it's drawn at (drawX, drawY) on the canvas, for maps shown a part at a time.
export function drawCell(ctx, art, map, x, y, size, drawX = x, drawY = y) {
  const cell = map.cells[y][x];
  if (cell.terrain === 'wall') {
    const style = wallStyles[cell.wall];
    const wallAt = (dx, dy) => {
      const other = map.cells[y + dy] && map.cells[y + dy][x + dx];
      return Boolean(other && other.terrain === 'wall');
    };
    const mask = (wallAt(0, -1) ? 'N' : '') + (wallAt(1, 0) ? 'E' : '') + (wallAt(0, 1) ? 'S' : '') + (wallAt(-1, 0) ? 'W' : '');
    const [dx, dy] = wallPieces[mask] || wallPieces.NESW;
    drawTile(ctx, art, { sheet: style.sheet, col: style.col + dx, row: style.row + dy }, drawX, drawY, size);
    return;
  }
  drawTile(ctx, art, tiles[cell.tile], drawX, drawY, size);
  if (cell.decor) drawTile(ctx, art, tiles[cell.decor], drawX, drawY, size);
}

// A thin coloured frame around a square.
export function frameSquare(ctx, pos, size, scale, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = scale;
  ctx.strokeRect(pos.x * size + scale / 2, pos.y * size + scale / 2, size - scale, size - scale);
}

// A hero sprite frame (see character/look.js) as a 16 × 16 canvas, ready to draw.
export function spriteImage(sprite, rows) {
  const image = document.createElement('canvas');
  image.width = sprite.size;
  image.height = sprite.size;
  const data = new ImageData(sprite.size, sprite.size);
  rows.forEach((row, y) => {
    [...row].forEach((letter, x) => {
      const hex = sprite.colors[letter];
      if (!hex) return;
      data.data.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255], (y * sprite.size + x) * 4);
    });
  });
  image.getContext('2d').putImageData(data, 0, 0);
  return image;
}

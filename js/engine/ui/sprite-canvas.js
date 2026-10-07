// Draws a sprite (see character/look.js) on a canvas at a whole-number scale, with crisp
// pixels, and plays its two-frame idle. Every sprite on screen steps in time together.
// With "reduce motion" turned on in the device settings, sprites stand still.

import { el } from './dom.js';

const FRAME_MS = 500;
const animated = new Set();
let timer = null;
let frame = 0;

const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// sprite: { size, frames, colors }. scale: 2, 3, 4… label: what the picture shows, for screen readers.
export function spriteCanvas(sprite, { scale = 3, label = '', animate = true } = {}) {
  const canvas = el('canvas', 'sprite');
  canvas.width = sprite.size;
  canvas.height = sprite.size;
  canvas.style.width = `${sprite.size * scale}px`;
  canvas.style.height = `${sprite.size * scale}px`;
  if (label) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  } else {
    canvas.setAttribute('aria-hidden', 'true');
  }
  const images = sprite.frames.map((rows) => frameImage(sprite, rows));
  canvas.showFrame = (n) => canvas.getContext('2d').putImageData(images[n % images.length], 0, 0);
  canvas.showFrame(0);
  if (animate && images.length > 1 && !reduceMotion()) {
    animated.add(canvas);
    if (!timer) timer = setInterval(tick, FRAME_MS);
  }
  return canvas;
}

// A sprite inside a framed box: the hero's portrait.
export function portrait(sprite, { scale = 4, label = '' } = {}) {
  const frame = el('div', 'portrait');
  frame.append(spriteCanvas(sprite, { scale, label }));
  return frame;
}

function frameImage(sprite, rows) {
  const image = new ImageData(sprite.size, sprite.size);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const hex = sprite.colors[row[x]];
      if (!hex) continue; // '.' and unknown letters stay see-through
      const i = (y * sprite.size + x) * 4;
      image.data[i] = parseInt(hex.slice(1, 3), 16);
      image.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      image.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      image.data[i + 3] = 255;
    }
  });
  return image;
}

function tick() {
  frame += 1;
  for (const canvas of animated) {
    if (!canvas.isConnected) {
      animated.delete(canvas);
      continue;
    }
    canvas.showFrame(frame);
  }
  if (animated.size === 0) {
    clearInterval(timer);
    timer = null;
  }
}

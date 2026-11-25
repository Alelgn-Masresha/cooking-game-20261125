// Mouse and keyboard: maps a click on the play field to the station under it, and keys to the same
// stations, then hands each one to the game as a target for kitchen.use().
import { BOWL_SLOTS, STATIONS, VIEW } from './config.js';
import { CRATE_ORDER } from './recipes.js';
import { crateRect } from './kitchen.js';

const inside = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** The station at play-field point (x, y), or null. */
export function targetAt(x, y) {
  for (let index = 0; index < CRATE_ORDER.length; index += 1) {
    if (inside(x, y, crateRect(index))) return { type: 'crate', id: CRATE_ORDER[index], index };
  }
  for (let index = 0; index < STATIONS.pots.length; index += 1) {
    if (inside(x, y, STATIONS.pots[index])) return { type: 'pot', index };
  }
  for (let index = 0; index < BOWL_SLOTS.length; index += 1) {
    const s = BOWL_SLOTS[index];
    const dx = (x - s.cx) / (s.rx * 1.1);
    const dy = (y - s.cy - 20) / (s.ry * 1.7);
    if (dx * dx + dy * dy <= 1) return { type: 'slot', index };
  }
  if (inside(x, y, STATIONS.cauldron)) return { type: 'cauldron' };
  if (inside(x, y, STATIONS.board)) return { type: 'board' };
  if (inside(x, y, STATIONS.pass)) return { type: 'pass' };
  if (inside(x, y, STATIONS.bin)) return { type: 'bin' };
  return null;
}

const KEY_TARGETS = {
  b: { type: 'cauldron' },
  a: { type: 'pot', index: 0 },
  s: { type: 'pot', index: 1 },
  q: { type: 'slot', index: 0 },
  w: { type: 'slot', index: 1 },
  e: { type: 'slot', index: 2 },
  enter: { type: 'pass' },
  x: { type: 'bin' },
  backspace: { type: 'bin' },
};

/** Listens on the canvas; `handlers` gets onPoint(x, y), onUse(target), onChop(), onPause(), onMute(), onClick(). */
export function bindInput(canvas, handlers) {
  const toField = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * VIEW.width,
      y: ((event.clientY - box.top) / box.height) * VIEW.height,
    };
  };
  canvas.addEventListener('pointermove', (event) => {
    const p = toField(event);
    handlers.onPoint(p.x, p.y);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toField(event);
    handlers.onPoint(p.x, p.y);
    handlers.onClick(targetAt(p.x, p.y));
  });
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === ' ') {
      event.preventDefault();
      handlers.onChop();
      return;
    }
    if (key === 'p' || key === 'escape') return handlers.onPause();
    if (key === 'm') return handlers.onMute();
    const crate = Number(key);
    if (crate >= 1 && crate <= CRATE_ORDER.length) {
      return handlers.onUse({ type: 'crate', id: CRATE_ORDER[crate - 1], index: crate - 1 });
    }
    if (KEY_TARGETS[key]) handlers.onUse(KEY_TARGETS[key]);
  });
}

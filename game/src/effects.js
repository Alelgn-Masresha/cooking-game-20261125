// Juice: steam over pots and ready bowls, wood chips off the board, sparkles and floating coin text when a
// bowl goes out, and a shake when a ticket walks out. Fed by the events the kitchen emits.
import { BOWL_SLOTS, COLORS, FONT, STATIONS } from './config.js';
import { createRandom } from './random.js';
import { slotReady } from './kitchen.js';

const TONES = { info: '#ffe3b8', warn: COLORS.warn, bad: '#ff8a7a', good: '#9df2a8', gold: '#ffd166' };

export function createEffects(seed) {
  return { particles: [], texts: [], shake: 0, random: createRandom(seed ^ 0x5eed), steamClock: 0 };
}

function float(fx, value, x, y, tone, size = 22) {
  fx.texts.push({ value, x, y, tone, size, age: 0, life: 1.4 });
}

function burst(fx, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = fx.random.range(0, Math.PI * 2);
    const v = fx.random.range(speed * 0.4, speed);
    fx.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, g: 380, r: fx.random.range(2, 5), color, age: 0, life: 0.7 });
  }
}

/** Turns this frame's kitchen events into effects. */
export function absorbEvents(fx, events) {
  const pass = STATIONS.pass;
  const board = STATIONS.board;
  for (const event of events) {
    if (event.type === 'say') float(fx, event.text, event.place.x, event.place.y - 20, event.tone, 20);
    if (event.type === 'chop') burst(fx, board.x + 150, board.y + 80, event.done ? '#7ed37f' : '#e7c48f', event.done ? 14 : 6, 220);
    if (event.type === 'add') {
      const slot = BOWL_SLOTS[event.index];
      burst(fx, slot.cx, slot.cy - 10, event.ready ? '#ffd166' : '#fff6e3', event.ready ? 22 : 8, event.ready ? 300 : 160);
      if (event.ready) float(fx, 'Bowl ready!', slot.cx, slot.cy - 120, 'good', 22);
    }
    if (event.type === 'served') {
      burst(fx, pass.x + pass.w / 2, pass.y + 150, '#ffd166', 30, 360);
      float(fx, `+$${event.earned}`, pass.x + pass.w / 2, pass.y + 120, 'gold', 34);
      if (event.tip > 0) float(fx, `tip $${event.tip}`, pass.x + pass.w / 2, pass.y + 160, 'good', 18);
    }
    if (event.type === 'missed') {
      fx.shake = 0.35;
      float(fx, `Ticket #${event.order.id} walked out!`, 470, 150, 'bad', 26);
    }
  }
}

/** Steam rises from busy pots, the cauldron and every bowl that is ready to go out. */
function emitSteam(fx, world) {
  const sources = [];
  world.pots.forEach((pot, index) => {
    if (pot.cook !== null) sources.push([STATIONS.pots[index].x + 85, 322]);
  });
  sources.push([STATIONS.cauldron.x + 85, 392]);
  BOWL_SLOTS.forEach((slot, index) => {
    if (slotReady(world, index)) sources.push([slot.cx, slot.cy - 20]);
  });
  for (const [x, y] of sources) {
    fx.particles.push({
      x: x + fx.random.range(-30, 30), y, vx: fx.random.range(-8, 8), vy: fx.random.range(-46, -30),
      g: 0, r: fx.random.range(9, 16), color: 'steam', age: 0, life: 1.6,
    });
  }
}

export function updateEffects(fx, world, dt) {
  fx.steamClock += dt;
  while (fx.steamClock >= 0.12) {
    fx.steamClock -= 0.12;
    emitSteam(fx, world);
  }
  for (const p of fx.particles) {
    p.age += dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  fx.particles = fx.particles.filter((p) => p.age < p.life);
  for (const t of fx.texts) {
    t.age += dt;
    t.y -= 34 * dt;
  }
  fx.texts = fx.texts.filter((t) => t.age < t.life);
  fx.shake = Math.max(0, fx.shake - dt);
}

export function shakeOffset(fx, time) {
  if (fx.shake <= 0) return { x: 0, y: 0 };
  return { x: Math.sin(time * 90) * fx.shake * 18, y: Math.cos(time * 70) * fx.shake * 10 };
}

export function drawEffects(ctx, fx) {
  for (const p of fx.particles) {
    const fade = 1 - p.age / p.life;
    ctx.beginPath();
    if (p.color === 'steam') {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.22 * fade})`;
      ctx.arc(p.x, p.y, p.r * (1 + p.age), 0, Math.PI * 2);
    } else {
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.min(1, (1 - t.age / t.life) * 2);
    ctx.font = `bold ${t.size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(20, 10, 4, 0.85)';
    ctx.strokeText(t.value, t.x, t.y);
    ctx.fillStyle = TONES[t.tone] ?? TONES.info;
    ctx.fillText(t.value, t.x, t.y);
    ctx.globalAlpha = 1;
  }
}

// The service information around the kitchen: the shift clock, coins and streak, the order tickets with
// their patience bars, the menu cards, and the title, pause and end-of-shift screens.
import { COLORS, FONT, RAIL, RUSH_FROM, SHIFT_SECONDS, STATIONS, VIEW } from './config.js';
import { RECIPES } from './recipes.js';
import { drawBowl, drawIngredient } from './food.js';
import { shiftProgress } from './orders.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r, fill, stroke, width = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function text(ctx, value, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

export function clock(seconds) {
  const left = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

function drawTopBar(ctx, world) {
  ctx.fillStyle = '#120c08';
  ctx.fillRect(0, 0, VIEW.width, 62);
  // Logo: a lantern and the stall's name.
  ctx.beginPath();
  ctx.ellipse(40, 31, 15, 18, 0, 0, TAU);
  ctx.fillStyle = COLORS.lantern;
  ctx.fill();
  text(ctx, 'LANTERN NOODLE BAR', 66, 31, 26, '#ffe3b8', 'left');
  // Shift clock: a ring that drains, turning orange then red.
  const left = SHIFT_SECONDS - world.time;
  const share = Math.max(0, left / SHIFT_SECONDS);
  const color = left > 60 ? COLORS.good : left > 30 ? COLORS.warn : COLORS.bad;
  const pulse = left <= 30 ? 1 + Math.max(0, Math.sin(world.time * 10)) * 0.08 : 1;
  ctx.save();
  ctx.translate(640, 31);
  ctx.scale(pulse, pulse);
  roundRect(ctx, -110, -24, 220, 48, 24, '#2b1d14', color, 3);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(-80, 0, 15, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(-80, 0, 15, -Math.PI / 2, -Math.PI / 2 + TAU * share);
  ctx.stroke();
  text(ctx, clock(left), 12, 1, 30, '#fff');
  text(ctx, 'SHIFT', 78, 1, 13, color);
  ctx.restore();
  // Coins, streak and served count.
  const stats = world.stats;
  ctx.beginPath();
  ctx.arc(1010, 31, 15, 0, TAU);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  text(ctx, '$', 1010, 32, 18, '#8a5a12');
  text(ctx, String(stats.coins), 1034, 32, 28, '#ffd166', 'left');
  text(ctx, `served ${stats.served}`, 1150, 20, 14, '#ffe3b8', 'left', 'normal');
  text(ctx, `streak x${stats.streak}`, 1150, 42, 14, stats.streak >= 3 ? '#ffd166' : '#ffe3b8', 'left');
}

function drawTicket(ctx, order, index, time) {
  const x = RAIL.x + index * (RAIL.ticketW + RAIL.gap);
  const y = RAIL.y + 6;
  const share = Math.max(0, 1 - order.age / order.patience);
  const urgent = share < 0.3;
  const shake = urgent ? Math.sin(time * 30 + index) * 1.5 : 0;
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.rotate((index % 2 ? 1 : -1) * 0.012);
  roundRect(ctx, 0, 0, RAIL.ticketW, RAIL.ticketH - 8, 6, COLORS.paper, urgent ? COLORS.bad : '#c9b48f', urgent ? 3 : 2);
  ctx.beginPath();
  ctx.arc(RAIL.ticketW / 2, 6, 6, 0, TAU);
  ctx.fillStyle = '#c0392b';
  ctx.fill();
  text(ctx, `#${order.id}`, 10, 20, 14, '#8a6d4b', 'left');
  text(ctx, `$${order.recipe.price}`, RAIL.ticketW - 10, 20, 14, '#8a6d4b', 'right');
  text(ctx, order.recipe.name, RAIL.ticketW / 2, 40, 17, COLORS.ink);
  // The toppings are what tell dishes apart; noodles and broth go in every bowl.
  const toppings = order.recipe.toppings;
  toppings.forEach((id, i) => {
    const cx = RAIL.ticketW / 2 + (i - (toppings.length - 1) / 2) * 50;
    ctx.beginPath();
    ctx.arc(cx, 78, 22, 0, TAU);
    ctx.fillStyle = '#f1e2c2';
    ctx.fill();
    drawIngredient(ctx, id, 'ready', cx, 78, 0.75);
  });
  text(ctx, 'noodles + broth', RAIL.ticketW / 2, 110, 12, '#8a6d4b', 'center', 'normal');
  const color = share > 0.55 ? COLORS.good : share > 0.3 ? COLORS.warn : COLORS.bad;
  roundRect(ctx, 10, 122, RAIL.ticketW - 20, 10, 5, '#e3d3b3');
  roundRect(ctx, 10, 122, (RAIL.ticketW - 20) * share, 10, 5, color);
  ctx.restore();
}

function drawRail(ctx, world) {
  ctx.fillStyle = '#7b8794';
  ctx.fillRect(RAIL.x - 8, RAIL.y + 2, 5 * (RAIL.ticketW + RAIL.gap) + 4, 6);
  world.orders.forEach((order, index) => drawTicket(ctx, order, index, world.time));
  if (world.orders.length === 0) text(ctx, 'No tickets yet: get noodles boiling!', 470, 140, 20, 'rgba(255,227,184,0.7)');
}

function drawMenu(ctx, world) {
  const rect = STATIONS.cards;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, '#f7ecd4', '#6e3f22', 3);
  text(ctx, 'MENU', rect.x + rect.w / 2, rect.y + 20, 18, COLORS.ink);
  const progress = shiftProgress(world);
  RECIPES.forEach((recipe, index) => {
    const y = rect.y + 52 + index * 50;
    const open = recipe.from <= progress;
    ctx.globalAlpha = open ? 1 : 0.4;
    text(ctx, recipe.name, rect.x + 14, y, 15, COLORS.ink, 'left');
    text(ctx, open ? `$${recipe.price}` : `at ${clock(recipe.from * SHIFT_SECONDS)}`, rect.x + 14, y + 18, 12, '#8a6d4b', 'left', 'normal');
    recipe.toppings.forEach((id, i) => drawIngredient(ctx, id, 'ready', rect.x + 166 + i * 44, y + 8, 0.6));
    ctx.globalAlpha = 1;
  });
}

function drawRushBanner(ctx, world) {
  if (shiftProgress(world) < RUSH_FROM || world.over) return;
  const glow = 0.75 + Math.sin(world.time * 6) * 0.25;
  roundRect(ctx, 330, 236, 280, 40, 20, `rgba(217, 75, 61, ${glow})`, '#fff', 2);
  text(ctx, 'DINNER RUSH!', 470, 257, 22, '#fff');
}

/** Everything drawn over the kitchen during a shift. */
export function drawHud(ctx, world) {
  drawTopBar(ctx, world);
  drawRail(ctx, world);
  drawMenu(ctx, world);
  drawRushBanner(ctx, world);
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(10, 6, 4, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

export function drawTitle(ctx, time) {
  dim(ctx, 0.62);
  roundRect(ctx, 250, 120, 780, 560, 24, '#f7ecd4', '#6e3f22', 5);
  text(ctx, 'LANTERN NOODLE BAR', 640, 180, 48, COLORS.ink);
  text(ctx, 'One night-market noodle stall. Three minutes. Keep every ticket happy.', 640, 226, 18, '#6e4a2c', 'center', 'normal');
  drawBowl(ctx, 640, 330, 130, 60, ['noodles', 'broth', 'egg', 'scallion', 'shrimp']);
  const steps = [
    'Boil noodles in a pot  ·  chop veg on the board  ·  ladle broth',
    'Build each bowl on the counter to match a ticket',
    'Carry the finished bowl to the pass before the ticket runs out',
    'Mouse: click stations  ·  Keys: 1-7 crates, B broth, Space chop,',
    'A/S pots, Q/W/E bowls, Enter serve, X bin, P pause',
  ];
  steps.forEach((line, i) => text(ctx, line, 640, 440 + i * 30, 17, COLORS.ink, 'center', i < 3 ? 'bold' : 'normal'));
  const pulse = 0.8 + Math.sin(time * 4) * 0.2;
  roundRect(ctx, 500, 600, 280, 54, 27, `rgba(63, 174, 90, ${pulse})`, '#1f6b35', 3);
  text(ctx, 'CLICK TO OPEN THE STALL', 640, 628, 18, '#fff');
}

export function drawPaused(ctx) {
  dim(ctx, 0.55);
  text(ctx, 'PAUSED', 640, 380, 56, '#ffe3b8');
  text(ctx, 'press P to keep cooking', 640, 430, 20, '#ffe3b8', 'center', 'normal');
}

export function starsFor(stats) {
  if (stats.coins >= 420) return 3;
  if (stats.coins >= 260) return 2;
  if (stats.coins >= 120) return 1;
  return 0;
}

function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd166' : '#d9c9a8';
  ctx.fill();
  ctx.strokeStyle = '#8a5a12';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function drawResults(ctx, world, time) {
  dim(ctx, 0.66);
  const stats = world.stats;
  roundRect(ctx, 300, 130, 680, 540, 24, '#f7ecd4', '#6e3f22', 5);
  text(ctx, 'SHIFT OVER', 640, 190, 46, COLORS.ink);
  text(ctx, 'The lanterns dim and the last bowl goes out.', 640, 232, 18, '#6e4a2c', 'center', 'normal');
  const stars = starsFor(stats);
  for (let i = 0; i < 3; i += 1) star(ctx, 540 + i * 100, 300, 38 + (i === 1 ? 8 : 0), i < stars);
  const rows = [
    ['Bowls served', String(stats.served)],
    ['Tickets missed', String(stats.missed)],
    ['Best streak', `x${stats.bestStreak}`],
    ['Coins earned', `$${stats.coins}`],
  ];
  rows.forEach(([name, value], i) => {
    const y = 382 + i * 46;
    text(ctx, name, 420, y, 22, COLORS.ink, 'left', 'normal');
    text(ctx, value, 860, y, 26, COLORS.ink, 'right');
  });
  const pulse = 0.8 + Math.sin(time * 4) * 0.2;
  roundRect(ctx, 500, 588, 280, 52, 26, `rgba(63, 174, 90, ${pulse})`, '#1f6b35', 3);
  text(ctx, 'CLICK FOR ANOTHER SHIFT', 640, 615, 18, '#fff');
}

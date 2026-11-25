// Boots Lantern Noodle Bar: sizes the canvas to the window, runs the fixed-step game loop and switches
// between the title, the shift, pause and the end-of-shift card. With ?shot=<scene> it draws one staged
// screenshot frame instead (see shots.js).
import { SHIFT_SECONDS, STEP, VIEW } from './config.js';
import { chop, createKitchen, updateKitchen, use } from './kitchen.js';
import { drawKitchen } from './render.js';
import { drawHud, drawPaused, drawResults, drawTitle } from './hud.js';
import { absorbEvents, createEffects, drawEffects, shakeOffset, updateEffects } from './effects.js';
import { createAudio } from './audio.js';
import { bindInput, targetAt } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const audio = createAudio();

const state = {
  screen: 'title',
  world: createKitchen(1),
  fx: createEffects(1),
  pointer: { x: VIEW.width / 2, y: VIEW.height / 2 },
  hover: null,
  clock: 0,
  lastSecond: null,
};

function fit() {
  const ratio = window.devicePixelRatio || 1;
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  const width = Math.round(VIEW.width * scale);
  const height = Math.round(VIEW.height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - width) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - height) / 2)}px`;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
}

function drawCursor(pointer) {
  if (!pointer) return;
  ctx.beginPath();
  ctx.moveTo(pointer.x, pointer.y);
  ctx.lineTo(pointer.x, pointer.y + 26);
  ctx.lineTo(pointer.x + 7, pointer.y + 20);
  ctx.lineTo(pointer.x + 18, pointer.y + 20);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#2b1d14';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function draw() {
  ctx.setTransform(canvas.width / VIEW.width, 0, 0, canvas.height / VIEW.height, 0, 0);
  const { world, fx } = state;
  const shake = shakeOffset(fx, world.time);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  const playing = state.screen === 'play' || state.screen === 'paused';
  drawKitchen(ctx, world, { hover: state.hover, pointer: playing ? state.pointer : null });
  drawEffects(ctx, fx);
  drawHud(ctx, world);
  ctx.restore();
  if (state.screen === 'title') drawTitle(ctx, state.clock);
  if (state.screen === 'paused') drawPaused(ctx);
  if (state.screen === 'over') drawResults(ctx, world, state.clock);
  drawCursor(state.pointer);
}

function announce(events) {
  for (const event of events) {
    if (event.type === 'served') status.textContent = `${event.order.recipe.name} served, $${event.earned}`;
    if (event.type === 'missed') status.textContent = `Ticket ${event.order.id} walked out`;
    if (event.type === 'order') status.textContent = `New ticket: ${event.order.recipe.name}`;
  }
}

function drainEvents() {
  const events = state.world.events;
  if (events.length === 0) return;
  absorbEvents(state.fx, events);
  audio.play(events);
  announce(events);
  events.length = 0;
}

function startShift() {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffff)) >>> 0;
  state.world = createKitchen(seed);
  state.fx = createEffects(seed);
  state.screen = 'play';
  state.lastSecond = null;
}

function tick(dt) {
  state.clock += dt;
  if (state.screen === 'play') {
    updateKitchen(state.world, dt);
    const left = Math.ceil(SHIFT_SECONDS - state.world.time);
    if (left <= 10 && left !== state.lastSecond && left > 0) audio.tick();
    state.lastSecond = left;
    if (state.world.over) state.screen = 'over';
  }
  drainEvents();
  updateEffects(state.fx, state.world, dt);
}

function run() {
  let last = performance.now();
  let pending = 0;
  const loop = (now) => {
    pending += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (pending >= STEP) {
      tick(STEP);
      pending -= STEP;
    }
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function play(action) {
  if (state.screen !== 'play') return;
  action();
  drainEvents();
}

const shot = new URLSearchParams(window.location.search).get('shot');
fit();
if (shot) {
  const seed = Number(new URLSearchParams(window.location.search).get('seed') ?? 1);
  const staged = stageShot(shot, seed);
  Object.assign(state, { world: staged.world, fx: staged.fx, screen: staged.screen, pointer: staged.pointer, clock: staged.world.time });
  draw();
  window.shotReady = true;
} else {
  window.addEventListener('resize', fit);
  bindInput(canvas, {
    onPoint: (x, y) => {
      state.pointer = { x, y };
      state.hover = targetAt(x, y);
    },
    onClick: (target) => {
      audio.unlock();
      if (state.screen === 'title' || state.screen === 'over') startShift();
      else if (target) play(() => use(state.world, target));
    },
    onUse: (target) => {
      audio.unlock();
      play(() => use(state.world, target));
    },
    onChop: () => play(() => chop(state.world)),
    onPause: () => {
      if (state.screen === 'play') state.screen = 'paused';
      else if (state.screen === 'paused') state.screen = 'play';
    },
    onMute: () => audio.toggleMute(),
  });
  run();
}

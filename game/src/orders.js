// The order rail: tickets arrive faster and wait less as the shift wears on, and serving one pays its
// price, a tip for speed and a bonus for an unbroken streak.
import { SCORE, SHIFT_SECONDS, TIMING } from './config.js';
import { bowlMatches, menuAt } from './recipes.js';

const lerp = (a, b, t) => a + (b - a) * t;

export function shiftProgress(world) {
  return Math.min(1, world.time / SHIFT_SECONDS);
}

export function isRush(world, rushFrom) {
  return shiftProgress(world) >= rushFrom;
}

function spawnOrder(world) {
  const progress = shiftProgress(world);
  const menu = menuAt(progress);
  // Avoid hanging the same dish twice in a row so the rail reads as a real service.
  const last = world.orders[world.orders.length - 1];
  const choices = menu.length > 1 && last ? menu.filter((recipe) => recipe.id !== last.recipe.id) : menu;
  const recipe = world.random.pick(choices);
  const order = {
    id: world.nextOrderId,
    recipe,
    age: 0,
    patience: lerp(TIMING.patienceStart, TIMING.patienceEnd, progress),
  };
  world.nextOrderId += 1;
  world.orders.push(order);
  world.events.push({ type: 'order', order });
}

export function updateOrders(world, dt) {
  const progress = shiftProgress(world);
  world.spawnIn -= dt;
  if (world.spawnIn <= 0) {
    if (world.orders.length < TIMING.maxTickets) spawnOrder(world);
    world.spawnIn = lerp(TIMING.spawnStart, TIMING.spawnEnd, progress) * world.random.range(0.85, 1.15);
  }
  for (const order of world.orders) order.age += dt;
  const late = world.orders.filter((order) => order.age >= order.patience);
  for (const order of late) {
    world.orders.splice(world.orders.indexOf(order), 1);
    world.stats.missed += 1;
    world.stats.streak = 0;
    world.stats.coins = Math.max(0, world.stats.coins - SCORE.missPenalty);
    world.events.push({ type: 'missed', order });
  }
}

/** The oldest ticket this bowl fills, or undefined. */
export function ticketFor(world, items) {
  return world.orders.find((order) => bowlMatches(items, order.recipe));
}

/** Serves a finished bowl to the oldest ticket it fills; returns the coins earned, or null if none wants it. */
export function serveBowl(world, items) {
  const order = ticketFor(world, items);
  if (!order) return null;
  world.orders.splice(world.orders.indexOf(order), 1);
  const stats = world.stats;
  stats.streak += 1;
  stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  stats.served += 1;
  const left = Math.max(0, 1 - order.age / order.patience);
  const tip = Math.round(order.recipe.price * SCORE.tipShare * left);
  const bonus = (stats.streak - 1) * SCORE.streakBonus;
  const earned = order.recipe.price + tip + bonus;
  stats.coins += earned;
  world.events.push({ type: 'served', order, earned, tip, bonus });
  return earned;
}

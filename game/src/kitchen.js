// The kitchen's rules: what is in your hands, in the pots, on the board and in each bowl, and what
// happens when you use a station. Both the mouse/keyboard and the screenshot scenes drive it through use().
import { BOWL_SLOTS, CRATE, SHIFT_SECONDS, STATIONS, TIMING } from './config.js';
import { INGREDIENTS } from './recipes.js';
import { createRandom } from './random.js';
import { serveBowl, ticketFor, updateOrders } from './orders.js';

export const NOODLES_RAW = 'raw';
export const NOODLES_DONE = 'cooked';
export const NOODLES_SOGGY = 'soggy';

export function createKitchen(seed) {
  return {
    seed,
    random: createRandom(seed),
    time: 0,
    over: false,
    hand: null,
    pots: [{ cook: null }, { cook: null }],
    board: null,
    slots: BOWL_SLOTS.map(() => ({ items: [] })),
    refill: BOWL_SLOTS.map(() => 0),
    orders: [],
    nextOrderId: 1,
    spawnIn: TIMING.firstOrder,
    stats: { coins: 0, served: 0, missed: 0, streak: 0, bestStreak: 0 },
    knife: 0,
    events: [],
  };
}

/** Noodle state from seconds in the pot. */
export function noodleState(seconds) {
  if (seconds >= TIMING.noodleSoggy) return NOODLES_SOGGY;
  if (seconds >= TIMING.noodleCook) return NOODLES_DONE;
  return NOODLES_RAW;
}

export function updateKitchen(world, dt) {
  if (world.over) return;
  world.time += dt;
  for (const pot of world.pots) if (pot.cook !== null) pot.cook += dt;
  world.knife = Math.max(0, world.knife - dt * 6);
  world.refill.forEach((left, index) => {
    if (world.slots[index] !== null || left <= 0) return;
    world.refill[index] = left - dt;
    if (world.refill[index] <= 0) {
      world.slots[index] = { items: [] };
      world.events.push({ type: 'cleanBowl', index });
    }
  });
  updateOrders(world, dt);
  if (world.time >= SHIFT_SECONDS) {
    world.over = true;
    world.events.push({ type: 'shiftOver' });
  }
}

const say = (world, text, place, tone = 'info') => world.events.push({ type: 'say', text, place, tone });

function centerOf(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function crateRect(index) {
  return { x: CRATE.x + index * CRATE.step, y: CRATE.y, w: CRATE.w, h: CRATE.h };
}

/** A held ingredient is ready for a bowl once it needs no more cooking or chopping. */
function bowlReady(hand) {
  if (hand.id === 'noodles') return hand.state === NOODLES_DONE;
  return hand.state === 'ready';
}

function useCrate(world, index, id) {
  const place = centerOf(crateRect(index));
  if (world.hand === null) {
    const prep = INGREDIENTS[id].prep;
    world.hand = { kind: 'ingredient', id, state: prep === 'boil' || prep === 'chop' ? 'raw' : 'ready' };
    world.events.push({ type: 'grab', id });
    return;
  }
  if (world.hand.kind === 'ingredient' && world.hand.id === id && world.hand.state !== NOODLES_SOGGY) {
    world.hand = null; // put it back
    return;
  }
  say(world, 'Hands full!', place, 'warn');
}

function usePot(world, index) {
  const pot = world.pots[index];
  const place = centerOf(STATIONS.pots[index]);
  const hand = world.hand;
  if (pot.cook === null) {
    if (hand && hand.kind === 'ingredient' && hand.id === 'noodles' && hand.state === NOODLES_RAW) {
      pot.cook = 0;
      world.hand = null;
      world.events.push({ type: 'boil', index });
    } else {
      say(world, 'Pots take raw noodles', place, 'warn');
    }
    return;
  }
  if (hand !== null) {
    say(world, 'Hands full!', place, 'warn');
    return;
  }
  const state = noodleState(pot.cook);
  if (state === NOODLES_RAW) {
    say(world, 'Still boiling...', place, 'info');
    return;
  }
  world.hand = { kind: 'ingredient', id: 'noodles', state };
  pot.cook = null;
  world.events.push({ type: 'grab', id: 'noodles' });
  if (state === NOODLES_SOGGY) say(world, 'Soggy! Bin them', place, 'bad');
}

function useCauldron(world) {
  if (world.hand !== null) {
    say(world, 'Hands full!', centerOf(STATIONS.cauldron), 'warn');
    return;
  }
  world.hand = { kind: 'ingredient', id: 'broth', state: 'ready' };
  world.events.push({ type: 'ladle' });
}

function useBoard(world) {
  const place = centerOf(STATIONS.board);
  const hand = world.hand;
  if (world.board === null) {
    if (hand && hand.kind === 'ingredient' && INGREDIENTS[hand.id].prep === 'chop' && hand.state === 'raw') {
      world.board = { id: hand.id, chops: 0 };
      world.hand = null;
    } else {
      say(world, 'The board takes whole veg', place, 'warn');
    }
    return;
  }
  if (world.board.chops < TIMING.chopsNeeded) {
    chop(world);
    return;
  }
  if (hand !== null) {
    say(world, 'Hands full!', place, 'warn');
    return;
  }
  world.hand = { kind: 'ingredient', id: world.board.id, state: 'ready' };
  world.board = null;
  world.events.push({ type: 'grab', id: world.hand.id });
}

/** One knife stroke on whatever is on the board. */
export function chop(world) {
  const board = world.board;
  if (board === null || board.chops >= TIMING.chopsNeeded) return;
  board.chops += 1;
  world.knife = 1;
  world.events.push({ type: 'chop', done: board.chops >= TIMING.chopsNeeded });
}

function slotPlace(index) {
  const slot = BOWL_SLOTS[index];
  return { x: slot.cx, y: slot.cy - 40 };
}

function useSlot(world, index) {
  const bowl = world.slots[index];
  const hand = world.hand;
  const place = slotPlace(index);
  if (bowl === null) {
    if (hand && hand.kind === 'bowl') {
      world.slots[index] = { items: hand.items };
      world.hand = null;
    } else {
      say(world, 'Waiting on a clean bowl', place, 'info');
    }
    return;
  }
  if (hand === null) {
    if (bowl.items.length === 0) {
      say(world, 'Empty bowl', place, 'info');
      return;
    }
    world.hand = { kind: 'bowl', items: bowl.items };
    world.slots[index] = null;
    world.refill[index] = 0;
    world.events.push({ type: 'liftBowl', index });
    return;
  }
  if (hand.kind === 'bowl') {
    say(world, 'One bowl per spot', place, 'warn');
    return;
  }
  if (!bowlReady(hand)) {
    const why = hand.id === 'noodles' ? (hand.state === NOODLES_SOGGY ? 'Soggy! Bin them' : 'Boil them first') : 'Chop it first';
    say(world, why, place, 'bad');
    return;
  }
  if (bowl.items.includes(hand.id)) {
    say(world, `Already has ${INGREDIENTS[hand.id].name.toLowerCase()}`, place, 'warn');
    return;
  }
  bowl.items = [...bowl.items, hand.id];
  world.hand = null;
  world.events.push({ type: 'add', index, id: bowl.items[bowl.items.length - 1], ready: Boolean(ticketFor(world, bowl.items)) });
}

function usePass(world) {
  const place = centerOf(STATIONS.pass);
  const hand = world.hand;
  if (!hand || hand.kind !== 'bowl') {
    say(world, 'Bring a finished bowl', place, 'info');
    return;
  }
  const earned = serveBowl(world, hand.items);
  if (earned === null) {
    say(world, 'No ticket wants that', place, 'bad');
    return;
  }
  world.hand = null;
  queueCleanBowl(world);
}

function queueCleanBowl(world) {
  const empty = world.slots.findIndex((slot, index) => slot === null && world.refill[index] <= 0);
  if (empty !== -1) world.refill[empty] = TIMING.cleanBowl;
}

function useBin(world) {
  if (world.hand === null) return;
  const wasBowl = world.hand.kind === 'bowl';
  world.hand = null;
  world.events.push({ type: 'bin' });
  if (wasBowl) queueCleanBowl(world);
}

/** Use a station: { type: 'crate', id } | { type: 'pot', index } | 'cauldron' | 'board' | { type: 'slot', index } | 'pass' | 'bin'. */
export function use(world, target) {
  if (world.over) return;
  switch (target.type) {
    case 'crate':
      useCrate(world, target.index, target.id);
      break;
    case 'pot':
      usePot(world, target.index);
      break;
    case 'cauldron':
      useCauldron(world);
      break;
    case 'board':
      useBoard(world);
      break;
    case 'slot':
      useSlot(world, target.index);
      break;
    case 'pass':
      usePass(world);
      break;
    case 'bin':
      useBin(world);
      break;
    default:
      break;
  }
}

/** True when the bowl in this slot fills a ticket on the rail: it is ready to serve. */
export function slotReady(world, index) {
  const bowl = world.slots[index];
  return bowl !== null && bowl.items.length > 0 && Boolean(ticketFor(world, bowl.items));
}

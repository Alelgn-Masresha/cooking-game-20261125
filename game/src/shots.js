// The screenshot scenes behind ?shot=service|rush|end|title. Each plays a real shift forward from a seeded
// kitchen with a scripted chef who uses the stations exactly as a player does (kitchen.use), so every
// frame is a true state of the game and the same seed always gives the same picture.
import { BOWL_SLOTS, STATIONS, STEP, TIMING } from './config.js';
import { CRATE_ORDER, INGREDIENTS } from './recipes.js';
import { createKitchen, updateKitchen, use } from './kitchen.js';
import { absorbEvents, createEffects, updateEffects } from './effects.js';

function createChef(world, fx) {
  const flush = () => {
    absorbEvents(fx, world.events);
    world.events.length = 0;
  };
  const advance = (seconds) => {
    for (let t = 0; t < seconds && !world.over; t += STEP) {
      updateKitchen(world, STEP);
      flush();
      updateEffects(fx, world, STEP);
    }
  };
  /** Uses a station, then spends a moment walking to the next one. */
  const act = (target, walk = 0.35) => {
    use(world, target);
    flush();
    advance(walk);
  };
  const crate = (id) => ({ type: 'crate', id, index: CRATE_ORDER.indexOf(id) });
  const waitForBowl = (slot) => {
    for (let i = 0; i < 40 && world.slots[slot] === null; i += 1) advance(0.1);
  };

  /** Takes one ingredient through its prep and drops it into a bowl spot. */
  function prepareInto(id, slot, pot = 0) {
    if (id === 'broth') act({ type: 'cauldron' });
    else if (id === 'noodles') {
      act(crate('noodles'));
      act({ type: 'pot', index: pot });
      advance(TIMING.noodleCook - 0.3);
      act({ type: 'pot', index: pot });
    } else if (INGREDIENTS[id].prep === 'chop') {
      act(crate(id));
      act({ type: 'board' });
      for (let i = 0; i < TIMING.chopsNeeded; i += 1) act({ type: 'board' }, 0.16);
      act({ type: 'board' });
    } else act(crate(id));
    act({ type: 'slot', index: slot });
  }

  /** Cooks the oldest ticket's bowl in `slot` and carries it to the pass. */
  function serveOldest(slot = 0) {
    const order = world.orders[0];
    if (!order) return false;
    waitForBowl(slot);
    for (const id of ['noodles', 'broth', ...order.recipe.toppings]) prepareInto(id, slot);
    act({ type: 'slot', index: slot });
    act({ type: 'pass' }, 0.5);
    if (world.hand) act({ type: 'bin' }); // its ticket walked out while we cooked
    return true;
  }

  function workUntil(seconds) {
    while (world.time < seconds && !world.over) {
      if (!serveOldest(0)) advance(0.5);
    }
  }

  return { advance, act, crate, prepareInto, serveOldest, workUntil, waitForBowl };
}

const firstReady = (recipe) => recipe.toppings.find((id) => INGREDIENTS[id].prep === null) ?? 'egg';
const firstChop = (recipe) => recipe.toppings.find((id) => INGREDIENTS[id].prep === 'chop') ?? 'scallion';

/** Mid-service: a bowl ready to go, one mid-assembly, noodles boiling and done, veg half chopped, egg in hand. */
function service(chef, world) {
  chef.advance(0.6);
  chef.serveOldest(0);
  chef.serveOldest(0);
  chef.advance(Math.max(0, 50 - world.time));
  const [a, b] = world.orders;
  for (const id of ['noodles', 'broth', ...a.recipe.toppings]) chef.prepareInto(id, 0);
  chef.act(chef.crate('noodles'));
  chef.act({ type: 'pot', index: 1 });
  chef.prepareInto('noodles', 1, 0);
  chef.prepareInto('broth', 1);
  const held = firstReady(b.recipe);
  const chopped = b.recipe.toppings.find((id) => id !== held && INGREDIENTS[id].prep === 'chop');
  if (chopped) chef.prepareInto(chopped, 1);
  chef.act(chef.crate('noodles'));
  chef.act({ type: 'pot', index: 0 });
  chef.act(chef.crate(firstChop(b.recipe) === chopped ? 'mushroom' : firstChop(b.recipe)));
  chef.act({ type: 'board' });
  for (let i = 0; i < 3; i += 1) chef.act({ type: 'board' }, 0.16);
  chef.act(chef.crate(held), 0.6);
  return { screen: 'play', pointer: { x: BOWL_SLOTS[1].cx + 60, y: BOWL_SLOTS[1].cy - 30 } };
}

/** Late in the shift: the rush is on, the clock is red and a finished bowl is on its way to the pass. */
function rush(chef, world) {
  chef.workUntil(128);
  const [a, b, c] = world.orders;
  chef.waitForBowl(0);
  if (a) for (const id of ['noodles', 'broth', ...a.recipe.toppings]) chef.prepareInto(id, 0);
  if (b) {
    chef.prepareInto('noodles', 1, 1);
    chef.prepareInto('broth', 1);
    chef.prepareInto(b.recipe.toppings[0], 1);
  }
  if (c) chef.prepareInto('noodles', 2, 0);
  chef.act(chef.crate('noodles'));
  chef.act({ type: 'pot', index: 1 });
  chef.act(chef.crate('chili'));
  chef.act({ type: 'board' });
  for (let i = 0; i < TIMING.chopsNeeded; i += 1) chef.act({ type: 'board' }, 0.16);
  if (a) chef.act({ type: 'slot', index: 0 }, 0.5);
  const pass = STATIONS.pass;
  return { screen: 'play', pointer: { x: pass.x + 120, y: pass.y + 150 } };
}

/** The end-of-shift card after a full three minutes of service. */
function end(chef) {
  chef.workUntil(400);
  return { screen: 'over', pointer: null };
}

function title(chef) {
  chef.advance(1.2);
  return { screen: 'title', pointer: null };
}

const SCENES = { service, rush, end, title };

/** Plays scene `name` from `seed`; returns the world, its effects and how to draw the frame. */
export function stageShot(name, seed) {
  const world = createKitchen(seed);
  const fx = createEffects(seed);
  const chef = createChef(world, fx);
  const scene = SCENES[name] ?? SCENES.service;
  const view = scene(chef, world);
  return { world, fx, ...view };
}

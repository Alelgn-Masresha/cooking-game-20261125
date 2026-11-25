// A small seeded random generator (mulberry32), so a shift with the same seed plays out the same way.

export function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    pick: (list) => list[Math.floor(next() * list.length)],
    range: (min, max) => min + next() * (max - min),
  };
}

// Every number the kitchen runs on, and where each station sits on the 1280 x 800 play field.
// Rendering and input both read these rectangles, so what you see is exactly what you click.

export const VIEW = { width: 1280, height: 800 };
export const STEP = 1 / 60;

export const SHIFT_SECONDS = 180;
export const RUSH_FROM = 0.62; // share of the shift after which the rush banner shows

export const TIMING = {
  noodleCook: 5, // seconds in the pot until noodles are done
  noodleSoggy: 12, // seconds until they are overcooked
  chopsNeeded: 5, // knife strokes to chop one vegetable
  cleanBowl: 1.6, // seconds for the dish pit to send back a clean bowl
  firstOrder: 0.5,
  spawnStart: 15, // seconds between orders at the start of the shift ...
  spawnEnd: 6.5, // ... and at the end
  patienceStart: 70,
  patienceEnd: 44,
  maxTickets: 5,
};

export const SCORE = { missPenalty: 6, tipShare: 0.6, streakBonus: 2 };

/** Order rail: tickets hang left to right. */
export const RAIL = { x: 24, y: 70, ticketW: 172, ticketH: 150, gap: 12 };

export const STATIONS = {
  pass: { x: 958, y: 70, w: 300, h: 250 },
  pots: [
    { x: 40, y: 300, w: 170, h: 160 },
    { x: 222, y: 300, w: 170, h: 160 },
  ],
  cauldron: { x: 410, y: 300, w: 170, h: 160 },
  board: { x: 600, y: 330, w: 330, h: 130 },
  cards: { x: 958, y: 334, w: 300, h: 296 },
  bin: { x: 1140, y: 650, w: 118, h: 136 },
  holding: { x: 958, y: 650, w: 168, h: 136 },
};

/** Ingredient crates along the counter, one per crate ingredient, in key order 1-7. */
export const CRATE = { x: 30, y: 494, w: 120, h: 110, step: 130 };

/** Three bowl spots at the front of the counter. */
export const BOWL_SLOTS = [
  { cx: 180, cy: 712, rx: 120, ry: 56 },
  { cx: 470, cy: 712, rx: 120, ry: 56 },
  { cx: 760, cy: 712, rx: 120, ry: 56 },
];

export const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

export const COLORS = {
  ink: '#2b1d14',
  paper: '#fff6e3',
  wood: '#a8683a',
  woodDark: '#6e3f22',
  wall: '#2f4858',
  lantern: '#ff9f43',
  good: '#3fae5a',
  warn: '#f2a33a',
  bad: '#d94b3d',
  broth: '#d99a4e',
};

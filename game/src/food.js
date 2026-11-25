// Food art, drawn with canvas paths: every ingredient raw and prepared, and a bowl built from its contents.

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, fill, stroke, width = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
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

function drawNoodles(ctx, state, s) {
  const color = state === 'soggy' ? '#b59a6a' : state === 'cooked' ? '#f6d36b' : '#f3e2a4';
  const shade = state === 'soggy' ? '#8d7448' : state === 'cooked' ? '#d9a93c' : '#d8c27a';
  ctx.lineCap = 'round';
  if (state === 'raw') {
    // A dried, crinkled nest.
    ellipse(ctx, 0, 0, 30 * s, 20 * s, '#e9d590', shade, 2 * s);
    ctx.strokeStyle = shade;
    ctx.lineWidth = 2.2 * s;
    for (let row = -12; row <= 12; row += 6) {
      ctx.beginPath();
      for (let x = -24; x <= 24; x += 4) ctx.lineTo(x * s, (row + (x % 8 === 0 ? -2 : 2)) * s);
      ctx.stroke();
    }
    return;
  }
  ctx.strokeStyle = shade;
  ctx.lineWidth = 6 * s;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      for (let t = -26; t <= 26; t += 2) ctx.lineTo(t * s, (i * 5 + Math.sin(t / 4 + i) * 4) * s * (state === 'soggy' ? 0.6 : 1));
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.6 * s;
  }
}

function drawScallion(ctx, state, s) {
  if (state === 'raw') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3f9d47';
    ctx.lineWidth = 9 * s;
    ctx.beginPath();
    ctx.moveTo(-30 * s, 8 * s);
    ctx.lineTo(18 * s, -6 * s);
    ctx.stroke();
    ctx.strokeStyle = '#e9f2d8';
    ctx.beginPath();
    ctx.moveTo(18 * s, -6 * s);
    ctx.lineTo(32 * s, -10 * s);
    ctx.stroke();
    ctx.strokeStyle = '#6cc46f';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(-26 * s, 5 * s);
    ctx.lineTo(14 * s, -6 * s);
    ctx.stroke();
    return;
  }
  const rings = [[-12, -6], [0, -9], [11, -4], [-6, 4], [7, 6], [-16, 6], [16, 4], [1, 0]];
  for (const [x, y] of rings) {
    ellipse(ctx, x * s, y * s, 5.5 * s, 4.5 * s, '#5cbf5f', '#2f7d36', 1.6 * s);
    ellipse(ctx, x * s, y * s, 2 * s, 1.6 * s, '#d9f0c4');
  }
}

function drawMushroom(ctx, state, s) {
  if (state === 'raw') {
    ctx.fillStyle = '#efe0c6';
    ctx.fillRect(-7 * s, -2 * s, 14 * s, 22 * s);
    ctx.beginPath();
    ctx.ellipse(0, -2 * s, 26 * s, 16 * s, 0, Math.PI, TAU);
    ctx.fillStyle = '#8a5a35';
    ctx.fill();
    ellipse(ctx, -8 * s, -10 * s, 4 * s, 2.5 * s, '#a87550');
    ellipse(ctx, 8 * s, -8 * s, 3 * s, 2 * s, '#a87550');
    return;
  }
  for (const [x, y, flip] of [[-12, -4, 1], [6, -8, -1], [12, 6, 1], [-4, 8, -1]]) {
    ctx.save();
    ctx.translate(x * s, y * s);
    ctx.rotate(flip * 0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * s, 8 * s, 0, Math.PI, TAU);
    ctx.fillStyle = '#8a5a35';
    ctx.fill();
    ctx.fillStyle = '#f1e4cc';
    ctx.fillRect(-3 * s, 0, 6 * s, 8 * s);
    ctx.restore();
  }
}

function drawChili(ctx, state, s) {
  if (state === 'raw') {
    ctx.beginPath();
    ctx.moveTo(-28 * s, -4 * s);
    ctx.quadraticCurveTo(0, 18 * s, 26 * s, 6 * s);
    ctx.quadraticCurveTo(2 * s, 2 * s, -26 * s, -12 * s);
    ctx.closePath();
    ctx.fillStyle = '#d7322a';
    ctx.fill();
    ctx.strokeStyle = '#3d8b3d';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(-27 * s, -8 * s);
    ctx.lineTo(-34 * s, -16 * s);
    ctx.stroke();
    return;
  }
  for (const [x, y] of [[-12, -5], [3, -9], [13, 2], [-3, 6], [-15, 7]]) {
    ellipse(ctx, x * s, y * s, 5.5 * s, 5.5 * s, '#d7322a', '#8f1d17', 1.5 * s);
    ellipse(ctx, x * s, y * s, 2.4 * s, 2.4 * s, '#f6d27a');
  }
}

function drawEgg(ctx, s) {
  ellipse(ctx, 0, 0, 22 * s, 16 * s, '#fffdf6', '#d9cdb5', 1.5 * s);
  ellipse(ctx, 1 * s, 1 * s, 11 * s, 9 * s, '#f39a1e');
  ellipse(ctx, -2 * s, -1 * s, 5 * s, 3.5 * s, '#ffc85a');
}

function drawShrimp(ctx, s) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ef7d4f';
  ctx.lineWidth = 12 * s;
  ctx.beginPath();
  ctx.arc(0, 0, 13 * s, -Math.PI * 0.15, Math.PI * 1.15);
  ctx.stroke();
  ctx.strokeStyle = '#fbe1cf';
  ctx.lineWidth = 2 * s;
  for (let a = 0.1; a < 3; a += 0.55) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8 * s, Math.sin(a) * 8 * s);
    ctx.lineTo(Math.cos(a) * 18 * s, Math.sin(a) * 18 * s);
    ctx.stroke();
  }
  ctx.fillStyle = '#d14b2a';
  ctx.beginPath();
  ctx.moveTo(-14 * s, -3 * s);
  ctx.lineTo(-24 * s, -10 * s);
  ctx.lineTo(-20 * s, 2 * s);
  ctx.fill();
}

function drawTofu(ctx, s) {
  for (const [x, y] of [[-12, 2], [8, -4], [2, 10]]) {
    ctx.fillStyle = '#f4e7c3';
    ctx.fillRect((x - 9) * s, (y - 9) * s, 18 * s, 18 * s);
    ctx.fillStyle = '#e0cc99';
    ctx.fillRect((x - 9) * s, (y + 5) * s, 18 * s, 4 * s);
    ctx.strokeStyle = '#c9b27a';
    ctx.lineWidth = 1.2 * s;
    ctx.strokeRect((x - 9) * s, (y - 9) * s, 18 * s, 18 * s);
  }
}

function drawBrothLadle(ctx, s) {
  ctx.strokeStyle = '#7b8794';
  ctx.lineWidth = 5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(12 * s, -6 * s);
  ctx.lineTo(34 * s, -26 * s);
  ctx.stroke();
  ellipse(ctx, 0, 0, 20 * s, 13 * s, '#aeb8c2', '#6c7783', 2 * s);
  ellipse(ctx, 0, -2 * s, 16 * s, 8 * s, '#d99a4e');
  ellipse(ctx, -5 * s, -4 * s, 4 * s, 2 * s, '#f2c27f');
}

/** Draws one ingredient centred on (x, y); `state` is 'raw', 'ready', 'cooked' or 'soggy'. */
export function drawIngredient(ctx, id, state, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'noodles':
      drawNoodles(ctx, state, s);
      break;
    case 'scallion':
      drawScallion(ctx, state, s);
      break;
    case 'mushroom':
      drawMushroom(ctx, state, s);
      break;
    case 'chili':
      drawChili(ctx, state, s);
      break;
    case 'egg':
      drawEgg(ctx, s);
      break;
    case 'shrimp':
      drawShrimp(ctx, s);
      break;
    case 'tofu':
      drawTofu(ctx, s);
      break;
    case 'broth':
      drawBrothLadle(ctx, s);
      break;
    default:
      break;
  }
  ctx.restore();
}

/** Where each topping sits in a bowl, as a share of the bowl's radii. */
const TOPPING_SPOTS = {
  egg: [0.42, -0.1],
  scallion: [-0.05, -0.28],
  mushroom: [-0.45, -0.05],
  chili: [0.12, 0.25],
  shrimp: [-0.3, 0.28],
  tofu: [0.4, 0.3],
};

/** A ceramic bowl seen from the front-top, filled with `items` in the order they went in. */
export function drawBowl(ctx, cx, cy, rx, ry, items, glow = false) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = 'rgba(255, 214, 102, 0.95)';
    ctx.shadowBlur = 28;
  }
  // Body.
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(cx - rx * 0.55, cy + ry * 1.25);
  ctx.ellipse(cx, cy + ry * 1.25, rx * 0.55, ry * 0.3, 0, Math.PI, 0, true);
  ctx.closePath();
  const body = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
  body.addColorStop(0, '#173a5e');
  body.addColorStop(0.5, '#2f6ea3');
  body.addColorStop(1, '#173a5e');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowBlur = 0;
  // A painted wave band.
  ctx.strokeStyle = '#e9f1f7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let t = -0.85; t <= 0.85; t += 0.05) {
    const x = cx + t * rx * 0.92;
    ctx.lineTo(x, cy + ry * 0.55 + Math.sin(t * 18) * 4 - (1 - t * t) * 6);
  }
  ctx.stroke();
  // Rim and inside.
  ellipse(ctx, cx, cy, rx, ry, '#f4f1ea', '#173a5e', 4);
  const inner = { rx: rx * 0.86, ry: ry * 0.78 };
  const hasBroth = items.includes('broth');
  ellipse(ctx, cx, cy + 2, inner.rx, inner.ry, hasBroth ? '#d99a4e' : '#e4ddcf');
  if (hasBroth) ellipse(ctx, cx - rx * 0.25, cy - ry * 0.2, rx * 0.25, ry * 0.12, 'rgba(255, 226, 160, 0.55)');
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, inner.rx, inner.ry, 0, 0, TAU);
  ctx.clip();
  const scale = rx / 120;
  if (items.includes('noodles')) {
    drawIngredient(ctx, 'noodles', 'cooked', cx, cy + ry * 0.12, scale * 1.9);
  }
  for (const id of items) {
    const spot = TOPPING_SPOTS[id];
    if (!spot) continue;
    drawIngredient(ctx, id, 'ready', cx + spot[0] * rx, cy + spot[1] * ry * 1.6, scale * 1.15);
  }
  ctx.restore();
  ctx.restore();
}

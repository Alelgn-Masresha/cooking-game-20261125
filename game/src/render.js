// Draws the kitchen itself: the tiled back wall and lanterns, stove and pots, broth cauldron, chopping
// board, ingredient crates, the bowl spots on the counter, the pass, the bin and whatever you are holding.
import { BOWL_SLOTS, COLORS, FONT, STATIONS, TIMING, VIEW } from './config.js';
import { CRATE_ORDER, INGREDIENTS } from './recipes.js';
import { crateRect, noodleState, slotReady } from './kitchen.js';
import { drawBowl, drawIngredient } from './food.js';

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

function label(ctx, text, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawWall(ctx, time) {
  ctx.fillStyle = '#1d2b36';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Glazed tiles behind the stations.
  for (let y = 228; y < 480; y += 32) {
    for (let x = (y / 32) % 2 ? -16 : 0; x < 950; x += 32) {
      ctx.fillStyle = (x / 32 + y / 32) % 3 < 1 ? '#3c6476' : '#355a6b';
      ctx.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  // Paper lanterns along the top of the wall.
  for (const [x, hue] of [[120, '#ff8f3d'], [430, '#ff5f5f'], [740, '#ffb13d']]) {
    const sway = Math.sin(time * 1.3 + x) * 3;
    const glow = ctx.createRadialGradient(x + sway, 262, 4, x + sway, 262, 90);
    glow.addColorStop(0, 'rgba(255, 190, 110, 0.35)');
    glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 100, 170, 200, 190);
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 226);
    ctx.lineTo(x + sway, 244);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + sway, 264, 20, 22, 0, 0, TAU);
    ctx.fillStyle = hue;
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 30, 10, 0.5)';
    for (const dx of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.ellipse(x + sway, 264, Math.abs(dx) === 10 ? 12 : 1, 22, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#2b1d14';
    ctx.fillRect(x + sway - 8, 240, 16, 5);
    ctx.fillRect(x + sway - 8, 284, 16, 5);
  }
}

function drawFlames(ctx, x, y, time, strength) {
  for (let i = -2; i <= 2; i += 1) {
    const h = (14 + Math.sin(time * 14 + i * 2) * 4) * strength;
    ctx.beginPath();
    ctx.moveTo(x + i * 12 - 6, y);
    ctx.quadraticCurveTo(x + i * 12, y - h * 2, x + i * 12 + 6, y);
    ctx.fillStyle = i % 2 ? '#ffb84d' : '#3d8bff';
    ctx.fill();
  }
}

function progressRing(ctx, x, y, r, share, color) {
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, share));
  ctx.stroke();
}

function drawStove(ctx, world, time) {
  roundRect(ctx, 30, 400, 372, 76, 10, '#3a3f45', '#1d2023', 3);
  world.pots.forEach((pot, index) => {
    const rect = STATIONS.pots[index];
    const cx = rect.x + rect.w / 2;
    drawFlames(ctx, cx, 402, time, pot.cook === null ? 0.35 : 1);
    // Pot body and water.
    roundRect(ctx, cx - 62, 330, 124, 70, 14, '#8c99a6', '#525c66', 3);
    ctx.fillStyle = '#6f7b87';
    ctx.fillRect(cx - 80, 340, 18, 10);
    ctx.fillRect(cx + 62, 340, 18, 10);
    ctx.beginPath();
    ctx.ellipse(cx, 332, 62, 14, 0, 0, TAU);
    ctx.fillStyle = '#cfe4ee';
    ctx.fill();
    if (pot.cook === null) {
      label(ctx, 'EMPTY POT', cx, 372, 14, '#2a3138');
      return;
    }
    const state = noodleState(pot.cook);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, 332, 58, 12, 0, 0, TAU);
    ctx.clip();
    drawIngredient(ctx, 'noodles', state === 'raw' ? 'cooked' : state, cx, 334, 1.2);
    ctx.restore();
    // Bubbles while it boils.
    for (let i = 0; i < 5; i += 1) {
      const bx = cx - 40 + ((i * 23 + time * 30) % 80);
      ctx.beginPath();
      ctx.arc(bx, 330 + Math.sin(time * 9 + i) * 3, 3, 0, TAU);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }
    const done = state !== 'raw';
    const share = done ? (pot.cook - TIMING.noodleCook) / (TIMING.noodleSoggy - TIMING.noodleCook) : pot.cook / TIMING.noodleCook;
    const color = state === 'soggy' ? COLORS.bad : done ? COLORS.warn : COLORS.good;
    progressRing(ctx, cx, 298, 20, share, color);
    label(ctx, state === 'soggy' ? '!' : done ? '✓' : '', cx, 299, 22, color);
    roundRect(ctx, cx - 54, 362, 108, 26, 13, state === 'soggy' ? COLORS.bad : done ? COLORS.good : '#2a3138');
    label(ctx, state === 'soggy' ? 'SOGGY' : done ? 'READY!' : 'BOILING', cx, 375, 15, '#fff');
  });
}

function drawCauldron(ctx, time) {
  const rect = STATIONS.cauldron;
  const cx = rect.x + rect.w / 2;
  drawFlames(ctx, cx, 452, time, 0.6);
  ctx.beginPath();
  ctx.ellipse(cx, 400, 74, 52, 0, 0, Math.PI);
  ctx.fillStyle = '#2d2a28';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, 400, 74, 18, 0, 0, TAU);
  ctx.fillStyle = '#3d3936';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, 402, 64, 13, 0, 0, TAU);
  ctx.fillStyle = COLORS.broth;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - 18, 399, 16, 4, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255, 226, 160, 0.7)';
  ctx.fill();
  drawIngredient(ctx, 'broth', 'ready', cx + 30, 372, 0.9);
  roundRect(ctx, cx - 54, 318, 108, 26, 13, '#5a3a22');
  label(ctx, 'BROTH  [B]', cx, 331, 15, '#ffe3b8');
}

function drawBoard(ctx, world) {
  const rect = STATIONS.board;
  roundRect(ctx, rect.x, rect.y + 20, rect.w, rect.h - 20, 16, '#d9a86c', '#8a5a2b', 4);
  ctx.strokeStyle = 'rgba(138, 90, 43, 0.35)';
  ctx.lineWidth = 2;
  for (let y = rect.y + 40; y < rect.y + rect.h; y += 18) {
    ctx.beginPath();
    ctx.moveTo(rect.x + 20, y);
    ctx.bezierCurveTo(rect.x + 120, y - 6, rect.x + 220, y + 6, rect.x + rect.w - 20, y);
    ctx.stroke();
  }
  const cx = rect.x + 130;
  const cy = rect.y + 78;
  const board = world.board;
  if (board) {
    const done = board.chops >= TIMING.chopsNeeded;
    if (done) {
      drawIngredient(ctx, board.id, 'ready', cx, cy, 1.6);
    } else {
      // Half the veg is already cut, the rest still whole.
      drawIngredient(ctx, board.id, 'raw', cx - 10, cy, 1.5 - board.chops * 0.12);
      if (board.chops > 0) drawIngredient(ctx, board.id, 'ready', cx + 70, cy + 6, 0.6 + board.chops * 0.12);
    }
    const share = Math.min(1, board.chops / TIMING.chopsNeeded);
    roundRect(ctx, rect.x + 24, rect.y + rect.h - 22, rect.w - 48, 12, 6, 'rgba(0,0,0,0.35)');
    roundRect(ctx, rect.x + 24, rect.y + rect.h - 22, (rect.w - 48) * share, 12, 6, done ? COLORS.good : COLORS.warn);
    roundRect(ctx, rect.x + 70, rect.y - 4, 190, 28, 14, done ? COLORS.good : '#2a3138');
    label(ctx, done ? `${INGREDIENTS[board.id].name.toUpperCase()} CHOPPED` : `CHOP [SPACE] ${board.chops}/${TIMING.chopsNeeded}`, rect.x + 165, rect.y + 10, 14, '#fff');
  } else {
    roundRect(ctx, rect.x + 70, rect.y - 4, 190, 28, 14, '#2a3138');
    label(ctx, 'CHOPPING BOARD', rect.x + 165, rect.y + 10, 14, '#fff');
  }
  // The cleaver lifts and drops with each stroke.
  const lift = world.knife * 34;
  ctx.save();
  ctx.translate(rect.x + rect.w - 70, rect.y + 70 - lift);
  ctx.rotate(-0.35 + world.knife * 0.3);
  roundRect(ctx, -40, -26, 76, 44, 6, '#cfd8df', '#7b8794', 2);
  roundRect(ctx, 36, -10, 46, 14, 6, '#5b3a22');
  ctx.restore();
}

function drawCounter(ctx) {
  const top = ctx.createLinearGradient(0, 476, 0, 800);
  top.addColorStop(0, '#c58a52');
  top.addColorStop(1, '#8f5530');
  ctx.fillStyle = top;
  ctx.fillRect(0, 476, 950, 324);
  ctx.strokeStyle = 'rgba(70, 35, 15, 0.25)';
  ctx.lineWidth = 2;
  for (let y = 500; y < 800; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(300, y + 8, 600, y - 8, 950, y + 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#6e3f22';
  ctx.fillRect(0, 474, 950, 8);
}

function drawCrates(ctx, world, hover) {
  CRATE_ORDER.forEach((id, index) => {
    const rect = crateRect(index);
    const lit = hover && hover.type === 'crate' && hover.id === id;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10, lit ? '#f3c98e' : '#e2b47a', '#6e3f22', 3);
    ctx.fillStyle = 'rgba(110, 63, 34, 0.25)';
    ctx.fillRect(rect.x + 6, rect.y + rect.h - 30, rect.w - 12, 4);
    const state = INGREDIENTS[id].prep === 'boil' || INGREDIENTS[id].prep === 'chop' ? 'raw' : 'ready';
    drawIngredient(ctx, id, state, rect.x + rect.w / 2 - 14, rect.y + 44, 0.95);
    drawIngredient(ctx, id, state, rect.x + rect.w / 2 + 16, rect.y + 52, 0.95);
    roundRect(ctx, rect.x + 8, rect.y + rect.h - 24, rect.w - 16, 20, 6, '#fff6e3');
    label(ctx, INGREDIENTS[id].name, rect.x + rect.w / 2 + 8, rect.y + rect.h - 14, 14, COLORS.ink);
    roundRect(ctx, rect.x + 6, rect.y + 6, 22, 22, 5, COLORS.ink);
    label(ctx, INGREDIENTS[id].key, rect.x + 17, rect.y + 17, 14, '#fff');
  });
}

function drawBowlSlots(ctx, world, time) {
  BOWL_SLOTS.forEach((slot, index) => {
    ctx.beginPath();
    ctx.ellipse(slot.cx, slot.cy + 52, slot.rx * 0.75, 14, 0, 0, TAU);
    ctx.fillStyle = 'rgba(40, 18, 6, 0.35)';
    ctx.fill();
    const bowl = world.slots[index];
    label(ctx, ['Q', 'W', 'E'][index], slot.cx - slot.rx - 14, slot.cy + 30, 16, 'rgba(255,246,227,0.85)');
    if (bowl === null) {
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.ellipse(slot.cx, slot.cy, slot.rx, slot.ry, 0, 0, TAU);
      ctx.strokeStyle = 'rgba(255, 246, 227, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, world.refill[index] > 0 ? 'clean bowl coming...' : 'free spot', slot.cx, slot.cy, 16, 'rgba(255,246,227,0.85)');
      return;
    }
    const ready = slotReady(world, index);
    drawBowl(ctx, slot.cx, slot.cy, slot.rx, slot.ry, bowl.items, ready);
    if (ready) {
      const bob = Math.sin(time * 5) * 3;
      roundRect(ctx, slot.cx - 62, slot.cy - 98 + bob, 124, 30, 15, COLORS.good, '#fff', 2);
      label(ctx, 'READY ✓', slot.cx, slot.cy - 83 + bob, 17, '#fff');
    } else if (bowl.items.length > 0) {
      roundRect(ctx, slot.cx - 62, slot.cy - 96, 124, 26, 13, 'rgba(43, 29, 20, 0.85)');
      label(ctx, `${bowl.items.length} in bowl`, slot.cx, slot.cy - 83, 15, '#ffe3b8');
    }
  });
}

function drawPass(ctx, world, time) {
  const rect = STATIONS.pass;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14, '#4b2e1c', '#2b1d14', 4);
  // The hatch looks out onto the night market.
  roundRect(ctx, rect.x + 16, rect.y + 44, rect.w - 32, 124, 10, '#16243a');
  for (let i = 0; i < 9; i += 1) {
    const x = rect.x + 30 + i * 30;
    ctx.beginPath();
    ctx.arc(x, rect.y + 64 + (i % 2) * 8, 6, 0, TAU);
    ctx.fillStyle = ['#ff9f43', '#ff5f5f', '#ffd166'][i % 3];
    ctx.fill();
  }
  // Waiting customers' silhouettes.
  for (let i = 0; i < Math.min(5, world.orders.length); i += 1) {
    const x = rect.x + 50 + i * 52;
    const bob = Math.sin(time * 2 + i) * 2;
    ctx.fillStyle = '#0b1220';
    ctx.beginPath();
    ctx.arc(x, rect.y + 118 + bob, 15, 0, TAU);
    ctx.fill();
    ctx.fillRect(x - 20, rect.y + 132 + bob, 40, 40);
  }
  label(ctx, 'THE PASS', rect.x + rect.w / 2, rect.y + 24, 22, '#ffe3b8');
  roundRect(ctx, rect.x + 10, rect.y + 172, rect.w - 20, 22, 6, '#c58a52');
  // Service bell.
  ctx.beginPath();
  ctx.arc(rect.x + rect.w - 44, rect.y + 172, 18, Math.PI, TAU);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  label(ctx, 'click with a finished bowl to serve', rect.x + rect.w / 2, rect.y + 222, 14, '#ffe3b8', 'center', 'normal');
}

function drawBinAndHands(ctx, world, pointer) {
  const bin = STATIONS.bin;
  roundRect(ctx, bin.x + 14, bin.y + 30, bin.w - 28, bin.h - 34, 10, '#5e6b75', '#2f363c', 3);
  roundRect(ctx, bin.x + 6, bin.y + 18, bin.w - 12, 18, 6, '#7b8794', '#2f363c', 3);
  label(ctx, 'BIN [X]', bin.x + bin.w / 2, bin.y + 86, 16, '#fff');
  const box = STATIONS.holding;
  roundRect(ctx, box.x, box.y, box.w, box.h, 12, 'rgba(255, 246, 227, 0.12)', 'rgba(255, 246, 227, 0.5)', 2);
  label(ctx, 'IN YOUR HANDS', box.x + box.w / 2, box.y + 18, 14, '#ffe3b8');
  const hand = world.hand;
  if (!hand) {
    label(ctx, 'nothing', box.x + box.w / 2, box.y + 78, 16, 'rgba(255,246,227,0.6)', 'center', 'normal');
  } else if (hand.kind === 'bowl') {
    drawBowl(ctx, box.x + box.w / 2, box.y + 74, 62, 30, hand.items);
  } else {
    drawIngredient(ctx, hand.id, hand.state, box.x + box.w / 2, box.y + 76, 1.3);
    const word = hand.state === 'raw' ? (hand.id === 'noodles' ? 'raw - boil it' : 'whole - chop it') : hand.state;
    label(ctx, `${INGREDIENTS[hand.id].name} · ${word}`, box.x + box.w / 2, box.y + 120, 13, '#ffe3b8');
  }
  // The held item also rides on the cursor.
  if (hand && pointer) {
    ctx.globalAlpha = 0.9;
    if (hand.kind === 'bowl') drawBowl(ctx, pointer.x + 30, pointer.y + 24, 48, 22, hand.items);
    else drawIngredient(ctx, hand.id, hand.state, pointer.x + 28, pointer.y + 22, 0.9);
    ctx.globalAlpha = 1;
  }
}

/** Draws the whole kitchen for one frame. `hover` is the station under the pointer, if any. */
export function drawKitchen(ctx, world, view) {
  const time = world.time;
  drawWall(ctx, time);
  drawStove(ctx, world, time);
  drawCauldron(ctx, time);
  drawBoard(ctx, world);
  drawCounter(ctx);
  ctx.fillStyle = '#2b1d14';
  ctx.fillRect(950, 0, 330, 800);
  drawCrates(ctx, world, view.hover);
  drawBowlSlots(ctx, world, time);
  drawPass(ctx, world, time);
  drawBinAndHands(ctx, world, view.pointer);
}

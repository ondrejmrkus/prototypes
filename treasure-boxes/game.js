// Treasure Boxes - Curiosity Measurement Game
// Based on Blanco & Sloutsky (2020)
// No text, no framework, pure canvas

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ─── Constants ───────────────────────────────────────────────────────

const LEARNING_ROUNDS = 5;
const TEST_ROUNDS = 20;
const TOTAL_ROUNDS = LEARNING_ROUNDS + TEST_ROUNDS;

const CHESTS = [
  { id: 'A', color: '#FFD700', accent: '#B8860B', gems: () => 10, label: '⭐' },
  { id: 'B', color: '#C0C0C0', accent: '#808080', gems: () => 3, label: '🔹' },
  { id: 'C', color: '#CD7F32', accent: '#8B4513', gems: () => 1, label: '🔸' },
  { id: 'D', color: '#9B59B6', accent: '#6C3483', gems: () => Math.floor(Math.random() * 6), label: '✨' },
];

// ─── State ───────────────────────────────────────────────────────────

let W, H, dpr;
let chestRects = [];
let state = {
  screen: 'intro',    // intro | playing | reward | complete
  round: 0,
  totalGems: 0,
  phase: 'learning',
  selectedChest: null,
  rewardGems: 0,
  rewardTimer: 0,
  introTimer: 0,
  completeTimer: 0,
};

// Particles
let particles = [];
let gemPile = [];
let sparkles = [];

// ─── Resize ──────────────────────────────────────────────────────────

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layoutChests();
}

function layoutChests() {
  const margin = Math.min(W, H) * 0.06;
  const topArea = H * 0.12; // gem counter area
  const availW = W - margin * 2;
  const availH = H - topArea - margin * 2;

  // 2x2 grid
  const cols = 2, rows = 2;
  const gap = Math.min(W, H) * 0.04;
  const cw = (availW - gap) / cols;
  const ch = (availH - gap) / rows;
  const size = Math.min(cw, ch, 220);

  const gridW = size * cols + gap;
  const gridH = size * rows + gap;
  const startX = (W - gridW) / 2;
  const startY = topArea + (availH - gridH) / 2 + margin;

  chestRects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      chestRects.push({
        x: startX + c * (size + gap),
        y: startY + r * (size + gap),
        w: size,
        h: size,
        chest: CHESTS[idx],
        scale: 1,
        bounceT: 0,
      });
    }
  }
}

window.addEventListener('resize', resize);
resize();

// ─── Drawing Helpers ─────────────────────────────────────────────────

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawChest(rect, highlight) {
  const { x, y, w, h, chest, scale, bounceT } = rect;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  const s = scale + Math.sin(bounceT * 8) * 0.03;
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundRect(x + 4, y + 6, w, h, 16);
  ctx.fill();

  // Body
  ctx.fillStyle = chest.color;
  roundRect(x, y, w, h, 16);
  ctx.fill();

  // Lid (top 40%)
  const lidH = h * 0.4;
  ctx.fillStyle = chest.accent;
  roundRect(x, y, w, lidH, 16);
  ctx.fill();

  // Clasp
  const claspW = w * 0.15;
  const claspH = h * 0.12;
  ctx.fillStyle = '#FFEAA7';
  roundRect(cx - claspW / 2, y + lidH - claspH / 2, claspW, claspH, 4);
  ctx.fill();

  // Border on hover
  if (highlight) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    roundRect(x, y, w, h, 16);
    ctx.stroke();
  }

  // Mystery sparkles for chest D
  if (chest.id === 'D') {
    drawMysterySparkles(cx, cy, w, h);
  }

  ctx.restore();
}

function drawMysterySparkles(cx, cy, w, h) {
  const t = performance.now() / 1000;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + t * 0.8;
    const dist = Math.min(w, h) * 0.35 + Math.sin(t * 2 + i) * 8;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const size = 3 + Math.sin(t * 3 + i * 2) * 2;
    const alpha = 0.5 + Math.sin(t * 2 + i) * 0.3;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    drawStar(sx, sy, size);
  }
}

function drawStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.stroke();
}

function drawGemCounter() {
  const counterY = H * 0.02;
  const counterH = H * 0.08;
  const gemSize = Math.min(counterH * 0.5, 20);

  // Draw collected gems as a visual pile
  const maxVisible = 40;
  const count = Math.min(state.totalGems, maxVisible);
  const startX = W / 2 - (count * gemSize * 0.6) / 2;

  for (let i = 0; i < count; i++) {
    const gx = startX + i * gemSize * 0.6;
    const gy = counterY + counterH / 2 + Math.sin(i * 0.7) * 3;
    drawGem(gx, gy, gemSize);
  }

  // If more than maxVisible, show overflow indicator
  if (state.totalGems > maxVisible) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${gemSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('...', startX + count * gemSize * 0.6 + 4, counterY + counterH / 2 + gemSize / 3);
  }

  // Round indicator (subtle dots)
  drawRoundIndicator(counterY + counterH + 4);
}

function drawRoundIndicator(y) {
  const dotR = 4;
  const gap = 12;
  const total = TOTAL_ROUNDS;
  const totalW = total * gap;
  const startX = W / 2 - totalW / 2;

  for (let i = 0; i < total; i++) {
    const dx = startX + i * gap;
    ctx.beginPath();
    ctx.arc(dx, y, dotR, 0, Math.PI * 2);

    if (i < state.round) {
      ctx.fillStyle = i < LEARNING_ROUNDS ? '#5DADE2' : '#58D68D';
    } else if (i === state.round && state.screen === 'playing') {
      ctx.fillStyle = '#fff';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
    }
    ctx.fill();
  }
}

function drawGem(x, y, size) {
  ctx.fillStyle = '#5DADE2';
  ctx.beginPath();
  ctx.moveTo(x, y - size / 2);
  ctx.lineTo(x + size / 3, y - size / 6);
  ctx.lineTo(x + size / 3, y + size / 4);
  ctx.lineTo(x, y + size / 2);
  ctx.lineTo(x - size / 3, y + size / 4);
  ctx.lineTo(x - size / 3, y - size / 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(x, y - size / 2);
  ctx.lineTo(x + size / 3, y - size / 6);
  ctx.lineTo(x, y);
  ctx.lineTo(x - size / 3, y - size / 6);
  ctx.closePath();
  ctx.fill();
}

// ─── Particles ───────────────────────────────────────────────────────

function spawnRewardParticles(rect, count) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    const colors = ['#FFD700', '#5DADE2', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6'];
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 1,
      decay: 0.01 + Math.random() * 0.015,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      isGem: i < count / 2,
    });
  }
}

function spawnCelebration() {
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    particles.push({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      life: 1,
      decay: 0.005 + Math.random() * 0.01,
      size: 5 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      isGem: false,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // gravity
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    if (p.isGem) {
      drawGem(p.x, p.y, p.size);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Reward Display ──────────────────────────────────────────────────

function drawRewardOverlay() {
  const t = state.rewardTimer;
  const alpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;

  // Semi-transparent overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * alpha})`;
  ctx.fillRect(0, 0, W, H);

  // Big gem display in center
  const gemSize = Math.min(W, H) * 0.08;
  const count = state.rewardGems;
  const totalW = count * gemSize * 1.2;
  const startX = W / 2 - totalW / 2 + gemSize / 2;
  const cy = H / 2;

  // Scale animation
  const scale = t < 0.15 ? t / 0.15 * 1.2 : t < 0.25 ? 1.2 - (t - 0.15) / 0.1 * 0.2 : 1;

  ctx.save();
  ctx.translate(W / 2, cy);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -cy);

  for (let i = 0; i < count; i++) {
    const delay = i * 0.08;
    const gemAlpha = Math.max(0, Math.min(1, (t - delay) / 0.1));
    ctx.globalAlpha = gemAlpha * alpha;
    const gx = startX + i * gemSize * 1.2;
    drawGem(gx, cy, gemSize);
  }

  // Zero gems - show a subtle "poof" for mystery box
  if (count === 0 && state.selectedChest && state.selectedChest.id === 'D') {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(155, 89, 182, 0.5)';
    ctx.beginPath();
    ctx.arc(W / 2, cy, gemSize * (1 + t), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ─── Intro Screen ────────────────────────────────────────────────────

function drawIntro() {
  const t = state.introTimer;

  // Pulsing hand icon
  const pulse = 1 + Math.sin(t * 3) * 0.1;
  const handY = H * 0.7;

  ctx.save();
  ctx.translate(W / 2, handY);
  ctx.scale(pulse, pulse);
  ctx.font = `${Math.min(W, H) * 0.12}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👆', 0, 0);
  ctx.restore();

  // Draw chests slightly smaller with bounce-in
  const entryScale = Math.min(1, t / 1.5);
  for (const rect of chestRects) {
    rect.scale = entryScale;
    drawChest(rect, false);
  }
}

// ─── Complete Screen ─────────────────────────────────────────────────

function drawComplete() {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, W, H);

  const pulse = 1 + Math.sin(state.completeTimer * 2) * 0.05;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(pulse, pulse);
  ctx.font = `${Math.min(W, H) * 0.2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎉', 0, 0);
  ctx.restore();

  // Show gem pile
  drawGemCounter();
}

// ─── Input ───────────────────────────────────────────────────────────

let hoveredChest = null;

function getChestAt(px, py) {
  for (const rect of chestRects) {
    if (px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h) {
      return rect;
    }
  }
  return null;
}

function handleClick(px, py) {
  if (state.screen === 'intro') {
    state.screen = 'playing';
    return;
  }

  if (state.screen === 'complete') {
    return;
  }

  if (state.screen !== 'playing') return;

  const rect = getChestAt(px, py);
  if (!rect) return;

  // Trigger chest selection
  const chest = rect.chest;
  const gems = chest.gems();

  state.selectedChest = chest;
  state.rewardGems = gems;
  state.totalGems += gems;
  state.rewardTimer = 0;
  state.screen = 'reward';

  // Bounce the chest
  rect.bounceT = 0;
  setTimeout(() => { rect.bounceT = 0; }, 500);

  // Particles
  spawnRewardParticles(rect, gems * 4 + 5);

  // Log data
  const phase = state.round < LEARNING_ROUNDS ? 'learning' : 'testing';
  DataCollector.logClick(state.round, phase, chest.id, gems, TOTAL_ROUNDS);
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  handleClick(px, py);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const px = touch.clientX - rect.left;
  const py = touch.clientY - rect.top;
  handleClick(px, py);
}, { passive: false });

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  hoveredChest = getChestAt(px, py);
  canvas.style.cursor = hoveredChest ? 'pointer' : 'default';
});

// ─── Game Loop ───────────────────────────────────────────────────────

let lastTime = performance.now();

function update(dt) {
  if (state.screen === 'intro') {
    state.introTimer += dt;
  }

  if (state.screen === 'reward') {
    state.rewardTimer += dt;

    // Animate chest bounce
    for (const rect of chestRects) {
      if (rect.chest === state.selectedChest) {
        rect.bounceT += dt;
      }
    }

    // End reward after 1.5s
    if (state.rewardTimer >= 1.5) {
      state.round++;
      state.phase = state.round < LEARNING_ROUNDS ? 'learning' : 'testing';

      if (state.round >= TOTAL_ROUNDS) {
        state.screen = 'complete';
        state.completeTimer = 0;
        spawnCelebration();
      } else {
        state.screen = 'playing';
        state.selectedChest = null;
      }

      // Reset bounces
      for (const rect of chestRects) {
        rect.bounceT = 0;
        rect.scale = 1;
      }
    }
  }

  if (state.screen === 'complete') {
    state.completeTimer += dt;
    if (state.completeTimer > 2 && Math.random() < 0.05) {
      spawnCelebration();
    }
  }

  updateParticles();
}

function draw() {
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (state.phase === 'learning') {
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(1, '#16213e');
  } else {
    grad.addColorStop(0, '#1a2e1a');
    grad.addColorStop(1, '#162e16');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (state.screen === 'intro') {
    drawIntro();
    return;
  }

  // Draw chests
  for (const rect of chestRects) {
    const isHovered = hoveredChest === rect && state.screen === 'playing';
    drawChest(rect, isHovered);
  }

  // Gem counter
  drawGemCounter();

  // Particles
  drawParticles();

  // Reward overlay
  if (state.screen === 'reward') {
    drawRewardOverlay();
  }

  // Complete screen
  if (state.screen === 'complete') {
    drawComplete();
  }
}

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

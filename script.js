/* ============================================================
   "Esto es para ti" — un pequeño recorrido pintado al estilo
   de Van Gogh, paisaje por paisaje.
   ============================================================ */

const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const intro = document.getElementById('intro');
const gallery = document.getElementById('gallery');
const captionText = document.getElementById('captionText');
const progressDots = document.getElementById('progressDots');
const finale = document.getElementById('finale');
const audio = document.getElementById('bgAudio');

let W, H, DPR;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/* ---------- utilidades ---------- */

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function noise(x, y, t) {
  return (
    Math.sin(x * 0.012 + t) +
    Math.sin(y * 0.018 - t * 0.7) +
    Math.sin((x + y) * 0.009 + t * 1.3)
  ) / 3;
}

/* Dibuja una pincelada curva estilo óleo, o un disco (luna/estrellas) */
function strokePaint(s) {
  ctx.save();
  ctx.globalAlpha = s.alpha;
  if (s.glow) {
    ctx.shadowColor = s.color;
    ctx.shadowBlur = s.glow;
  }
  if (s.type === 'circle') {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- construcción de escenas (listas de pinceladas) ---------- */

function buildSky(strokes, w, h, topColor, botColor, bandTop, bandBottom, swirl) {
  const rows = 46;
  for (let i = 0; i < rows; i++) {
    const y = bandTop + (i / rows) * (bandBottom - bandTop);
    const t = i / rows;
    const mix = (c1, c2, f) => {
      const a = c1.match(/\d+/g).map(Number);
      const b = c2.match(/\d+/g).map(Number);
      return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
    };
    const color = mix(topColor, botColor, t);
    let x = -20;
    while (x < w + 20) {
      const len = rand(40, 110);
      const amp = swirl * rand(10, 30);
      const phase = y * 0.05 + x * 0.01;
      const cx = x + len / 2 + Math.sin(phase) * amp * 0.4;
      const cy = y + Math.cos(phase * 1.4) * amp;
      const x2 = x + len;
      const y2 = y + Math.sin(phase + 1.2) * amp * 0.6;
      strokes.push({
        x1: x, y1: y, cx, cy: cy, x2, y2,
        color, width: rand(6, 11), alpha: rand(0.55, 0.85)
      });
      x += len * rand(0.55, 0.8);
    }
  }
}

function buildStars(strokes, w, h, count, bandTop, bandBottom) {
  for (let i = 0; i < count; i++) {
    const x = rand(0, w);
    const y = rand(bandTop, bandBottom);
    const r = rand(9, 20);
    const core = pick(['#fff4cf', '#ffe9a6', '#fff8e1']);

    // halo suave (varios discos translúcidos)
    for (let ring = 3; ring >= 0; ring--) {
      strokes.push({
        type: 'circle', x, y, r: r * (1 + ring * 0.9),
        color: core, alpha: 0.16 - ring * 0.03, glow: 16
      });
    }
    // rayos arremolinados, al estilo Van Gogh
    const rays = 6;
    for (let rIdx = 0; rIdx < rays; rIdx++) {
      const ang = (rIdx / rays) * Math.PI * 2 + rand(-0.2, 0.2);
      const len = r * rand(1.6, 2.6);
      const bend = rand(-0.5, 0.5);
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      const cx = x + Math.cos(ang + bend) * len * 0.5;
      const cy = y + Math.sin(ang + bend) * len * 0.5;
      strokes.push({
        x1: x, y1: y, cx, cy, x2, y2,
        color: core, width: rand(1.5, 2.6), alpha: rand(0.4, 0.7), glow: 10
      });
    }
    // núcleo brillante
    strokes.push({ type: 'circle', x, y, r: r * 0.22, color: '#fffdf4', alpha: 1, glow: 20 });
  }
}

function buildMoon(strokes, x, y, r) {
  for (let ring = 6; ring >= 0; ring--) {
    strokes.push({
      type: 'circle', x, y, r: r + ring * 8,
      color: '#fff3c4', alpha: 0.1, glow: 40
    });
  }
  strokes.push({ type: 'circle', x, y, r, color: '#fffbe6', alpha: 1, glow: 30 });
  strokes.push({ type: 'circle', x, y, r: r * 0.72, color: '#fff7d6', alpha: 0.9, glow: 10 });
}

function buildHills(strokes, w, h, baseY, color, amp, rows) {
  for (let i = 0; i < rows; i++) {
    const y = baseY + i * 5;
    let x = -20;
    while (x < w + 20) {
      const len = rand(30, 70);
      const yOff = Math.sin(x * 0.01 + i) * amp;
      strokes.push({
        x1: x, y1: y + yOff, cx: x + len / 2, cy: y + yOff - rand(4, 14),
        x2: x + len, y2: y + yOff,
        color, width: rand(7, 13), alpha: rand(0.7, 0.95)
      });
      x += len * 0.7;
    }
  }
}

function buildCypress(strokes, x, baseY, height, width, color) {
  const n = 170;
  const bend = rand(0.15, 0.3) * width;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = baseY - t * height;
    // silueta de llama: ancha en la base, afilada arriba, con leve ondulación
    const profile = width * (1 - t * 0.92) * (0.82 + 0.18 * Math.sin(t * 13));
    const xBend = Math.sin(t * 5.5) * bend * (1 - t * 0.3);
    const x0 = x + xBend + rand(-profile, profile);
    const ang = -Math.PI / 2 + rand(-0.4, 0.4) + Math.sin(t * 18 + x0 * 0.03) * 0.25;
    const len = rand(16, 32) * (1 - t * 0.3 + 0.3);
    const x1 = x0, y1 = y;
    const x2 = x0 + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const cx = (x1 + x2) / 2 + Math.sin(t * 9) * 10;
    const cy = (y1 + y2) / 2;
    strokes.push({
      x1, y1, cx, cy, x2, y2,
      color: pick([color, '#0b2a1e', '#163a28', '#1d4a30']),
      width: rand(4, 7.5), alpha: rand(0.75, 1)
    });
  }
}

function buildWheat(strokes, w, baseY, h, color1, color2) {
  const rows = 70;
  for (let i = 0; i < rows; i++) {
    const y = baseY + (i / rows) * h;
    let x = -20;
    while (x < w + 20) {
      const len = rand(3, 7);
      const lean = rand(-10, 14);
      strokes.push({
        x1: x, y1: y, cx: x + lean / 2, cy: y - len * 3,
        x2: x + lean, y2: y - len * 6,
        color: Math.random() > 0.5 ? color1 : color2,
        width: rand(1.6, 3), alpha: rand(0.75, 1)
      });
      x += rand(4, 9);
    }
  }
}

function buildSunflowers(strokes, w, baseY, h, count) {
  for (let i = 0; i < count; i++) {
    const x = rand(0, w);
    const y = baseY + rand(0, h) + (x % 40);
    const r = rand(10, 20) * (0.6 + (y - baseY) / h);
    // stem
    strokes.push({
      x1: x, y1: y + r, cx: x + rand(-4, 4), cy: y + r + 20,
      x2: x + rand(-6, 6), y2: y + r + 40,
      color: '#3f5b24', width: 3, alpha: 0.9
    });
    // petals
    const petals = 10;
    for (let p = 0; p < petals; p++) {
      const ang = (p / petals) * Math.PI * 2;
      const px = x + Math.cos(ang) * r;
      const py = y + Math.sin(ang) * r;
      strokes.push({
        x1: x, y1: y, cx: x + Math.cos(ang) * r * 0.6, cy: y + Math.sin(ang) * r * 0.6,
        x2: px, y2: py,
        color: pick(['#f5c23b', '#e8a62e', '#f7d35c']),
        width: rand(3, 5.5), alpha: 0.95
      });
    }
    // center
    strokes.push({
      x1: x - r * 0.3, y1: y, cx: x, cy: y, x2: x + r * 0.3, y2: y,
      color: '#5a3a1e', width: r * 0.55, alpha: 1
    });
  }
}

function buildOliveCanopy(strokes, x, y, r, colorA, colorB) {
  const puffs = 36;
  for (let i = 0; i < puffs; i++) {
    const ang = rand(0, Math.PI * 2);
    const dist = rand(0, r);
    const px = x + Math.cos(ang) * dist;
    const py = y + Math.sin(ang) * dist * 0.6;
    strokes.push({
      x1: px - 8, y1: py, cx: px, cy: py - 6, x2: px + 8, y2: py,
      color: Math.random() > 0.5 ? colorA : colorB,
      width: rand(4, 8), alpha: rand(0.7, 0.95)
    });
  }
}

function buildWindows(strokes, points, color) {
  points.forEach(([x, y]) => {
    strokes.push({
      x1: x - 2, y1: y, cx: x, cy: y, x2: x + 2, y2: y,
      color, width: 4, alpha: 1, glow: 12
    });
  });
}

/* ---------- definición de las 4 escenas ---------- */

function sceneStarryNight() {
  const strokes = [];
  buildSky(strokes, W, H, 'rgb(10,20,55)', 'rgb(34,58,110)', 0, H * 0.72, 1);
  buildMoon(strokes, W * 0.84, H * 0.16, 30);
  buildStars(strokes, W, H, 14, H * 0.04, H * 0.55);
  buildHills(strokes, W, H, H * 0.68, '#1b2e55', 10, 6);
  buildHills(strokes, W, H, H * 0.78, '#111d38', 10, 8);
  const villageX = [];
  for (let i = 0; i < 18; i++) villageX.push([rand(W * 0.1, W * 0.75), rand(H * 0.76, H * 0.88)]);
  buildWindows(strokes, villageX, '#ffdd88');
  buildCypress(strokes, W * 0.14, H * 0.98, H * 0.62, 34, '#0e2a1c');
  buildHills(strokes, W, H, H * 0.9, '#0a1424', 8, 6);
  return { strokes, caption: 'La noche estrellada', sky: 'rgb(10,20,55)' };
}

function sceneWheatfieldCypress() {
  const strokes = [];
  buildSky(strokes, W, H, 'rgb(90,140,200)', 'rgb(210,225,235)', 0, H * 0.5, 1.3);
  buildStars(strokes, W, H, 4, H * 0.03, H * 0.2);
  buildCypress(strokes, W * 0.22, H * 0.92, H * 0.58, 30, '#132b16');
  buildWheat(strokes, W, H * 0.5, H * 0.46, '#e6b43a', '#caa02e');
  buildHills(strokes, W, H, H * 0.48, '#8aa34a', 8, 3);
  return { strokes, caption: 'Trigal con cipreses', sky: 'rgb(90,140,200)' };
}

function sceneOliveGrove() {
  const strokes = [];
  buildSky(strokes, W, H, 'rgb(255,186,110)', 'rgb(255,222,160)', 0, H * 0.46, 1.1);
  buildHills(strokes, W, H, H * 0.44, '#b7922f', 14, 5);
  buildHills(strokes, W, H, H * 0.58, '#8a9b4e', 12, 6);
  for (let i = 0; i < 9; i++) {
    const x = rand(0.05, 0.95) * W;
    const y = H * rand(0.58, 0.8);
    buildOliveCanopy(strokes, x, y, rand(30, 55), '#8fae5a', '#bcd17a');
    strokes.push({
      x1: x - 3, y1: y, cx: x, cy: y + 25, x2: x + 3, y2: y + 50,
      color: '#5c4323', width: 5, alpha: 0.9
    });
  }
  buildHills(strokes, W, H, H * 0.82, '#5e6b33', 10, 6);
  return { strokes, caption: 'Olivar bajo el sol', sky: 'rgb(255,186,110)' };
}

function sceneSunflowerNight() {
  const strokes = [];
  buildSky(strokes, W, H, 'rgb(13,15,48)', 'rgb(60,45,95)', 0, H * 0.55, 1);
  buildMoon(strokes, W * 0.18, H * 0.14, 26);
  buildStars(strokes, W, H, 16, H * 0.03, H * 0.5);
  buildHills(strokes, W, H, H * 0.55, '#2a2550', 10, 4);
  buildSunflowers(strokes, W, H * 0.55, H * 0.4, 26);
  return { strokes, caption: 'Girasoles bajo el cielo estrellado', sky: 'rgb(13,15,48)' };
}

const scenes = [sceneStarryNight, sceneWheatfieldCypress, sceneOliveGrove, sceneSunflowerNight];

/* ---------- motor de animación ---------- */

let sceneIndex = 0;
let strokeQueue = [];
let strokeCursor = 0;
let painting = false;

function setupDots() {
  progressDots.innerHTML = '';
  scenes.forEach(() => {
    const d = document.createElement('div');
    d.className = 'dot';
    progressDots.appendChild(d);
  });
}

function updateDots() {
  [...progressDots.children].forEach((d, i) => {
    d.classList.toggle('active', i === sceneIndex);
  });
}

function startScene(index) {
  sceneIndex = index;
  updateDots();
  captionText.classList.remove('show');

  const built = scenes[index]();
  ctx.fillStyle = built.sky;
  ctx.fillRect(0, 0, W, H);

  strokeQueue = built.strokes;
  strokeCursor = 0;
  painting = true;

  const dwell = 5200;
  const perFrame = Math.max(2, Math.ceil(strokeQueue.length / 260));
  const paintDuration = Math.ceil(strokeQueue.length / perFrame) * 16;
  const totalWait = paintDuration + dwell;

  setTimeout(() => {
    captionText.textContent = built.caption;
    captionText.classList.add('show');
  }, paintDuration + 400);

  clearTimeout(window.__sceneTimer);
  window.__sceneTimer = setTimeout(() => {
    if (index + 1 < scenes.length) {
      fadeToNextScene(index + 1);
    } else {
      showFinale();
    }
  }, totalWait);
}

function fadeToNextScene(nextIndex) {
  gallery.style.transition = 'filter 0.9s ease';
  gallery.style.filter = 'brightness(0)';
  setTimeout(() => {
    startScene(nextIndex);
    gallery.style.filter = 'brightness(1)';
  }, 950);
}

function showFinale() {
  gallery.style.transition = 'filter 1.4s ease';
  gallery.style.filter = 'brightness(0.35)';
  finale.classList.add('show');
}

let lastTime = 0;
function tick(ts) {
  requestAnimationFrame(tick);
  if (!painting) return;
  if (ts - lastTime < 16) return;
  lastTime = ts;

  const perFrame = Math.max(2, Math.ceil(strokeQueue.length / 260));
  for (let i = 0; i < perFrame && strokeCursor < strokeQueue.length; i++, strokeCursor++) {
    strokePaint(strokeQueue[strokeCursor]);
  }
  if (strokeCursor >= strokeQueue.length) painting = false;
}
requestAnimationFrame(tick);

/* ---------- inicio ---------- */

startBtn.addEventListener('click', () => {
  intro.classList.add('fade-out');
  audio.volume = 0;
  audio.play().catch(() => {});
  let v = 0;
  const fadeIn = setInterval(() => {
    v += 0.04;
    audio.volume = Math.min(v, 0.85);
    if (v >= 0.85) clearInterval(fadeIn);
  }, 160);

  setTimeout(() => {
    setupDots();
    resize();
    startScene(0);
  }, 900);
});

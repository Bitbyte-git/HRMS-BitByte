/**
 * AstroPlexus Engine
 * ------------------
 * Pure-logic animation engine for the Deep Space Plexus background.
 * No React dependencies — can be imported anywhere and driven by a
 * single `start()` / `stop()` / `updateTheme()` API.
 *
 * Modules:
 *  1. Theme resolver      – reads CSS vars / body class at runtime
 *  2. Plexus system       – floating node network with connections
 *  3. Comet system        – slow comet trails with fading tails
 *  4. Mouse tracker       – lightweight influence on nearby nodes
 *  5. Animation loop      – requestAnimationFrame driver
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number }

interface Node {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  /** original velocity before mouse influence */
  baseVel: Vec2;
}

interface Comet {
  pos: Vec2;
  vel: Vec2;
  history: Vec2[];
  historyMax: number;
  headRadius: number;
  reset: (width: number, height: number) => void;
  update: (width: number, height: number) => void;
  draw: (ctx: CanvasRenderingContext2D, accent: string) => void;
}

interface ThemeColors {
  background: string;
  accent: string;       // rgb(r, g, b) — no alpha, applied inline
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THEME RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

const DARK_COLORS: ThemeColors = {
  background: '#0a0e14',
  accent: '76, 201, 240',
};

const LIGHT_COLORS: ThemeColors = {
  background: '#f3f4f6',
  accent: '0, 95, 115',
};

function resolveTheme(): ThemeColors {
  return document.documentElement.classList.contains('dark')
    ? DARK_COLORS
    : LIGHT_COLORS;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randSign(): number {
  return Math.random() < 0.5 ? 1 : -1;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLEXUS SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const PLEXUS = {
  COUNT: 60,
  MAX_VEL: 0.3,
  NODE_RADIUS: 2.5,
  CONNECTION_DIST: 220,
  LINE_WIDTH: 1.2,
  /** How strongly the mouse pulls nearby nodes (0 = off, 1 = strong) */
  MOUSE_INFLUENCE_RADIUS: 140,
  MOUSE_INFLUENCE_STRENGTH: 0.018,
};

function createNode(width: number, height: number): Node {
  const vx = rand(0.05, PLEXUS.MAX_VEL) * randSign();
  const vy = rand(0.05, PLEXUS.MAX_VEL) * randSign();
  return {
    pos: { x: rand(0, width), y: rand(0, height) },
    vel: { x: vx, y: vy },
    baseVel: { x: vx, y: vy },
    radius: PLEXUS.NODE_RADIUS,
  };
}

function createPlexusNodes(width: number, height: number): Node[] {
  return Array.from({ length: PLEXUS.COUNT }, () => createNode(width, height));
}

/** Wrap node position around screen edges (seamless) */
function wrapNode(node: Node, width: number, height: number): void {
  const pad = 10;
  if (node.pos.x < -pad) node.pos.x = width + pad;
  else if (node.pos.x > width + pad) node.pos.x = -pad;
  if (node.pos.y < -pad) node.pos.y = height + pad;
  else if (node.pos.y > height + pad) node.pos.y = -pad;
}

/**
 * Apply subtle mouse influence: nodes near the cursor drift slightly
 * toward it, giving a gentle magnetic feel without chaos.
 */
function applyMouseInfluence(node: Node, mouse: Vec2 | null): void {
  if (!mouse) {
    // Ease back to base velocity
    node.vel.x += (node.baseVel.x - node.vel.x) * 0.04;
    node.vel.y += (node.baseVel.y - node.vel.y) * 0.04;
    return;
  }
  const d = dist(node.pos, mouse);
  if (d < PLEXUS.MOUSE_INFLUENCE_RADIUS && d > 1) {
    const factor = (1 - d / PLEXUS.MOUSE_INFLUENCE_RADIUS) * PLEXUS.MOUSE_INFLUENCE_STRENGTH;
    node.vel.x += (mouse.x - node.pos.x) * factor;
    node.vel.y += (mouse.y - node.pos.y) * factor;
    // Clamp so nodes never go rogue
    node.vel.x = clamp(node.vel.x, -PLEXUS.MAX_VEL * 2.5, PLEXUS.MAX_VEL * 2.5);
    node.vel.y = clamp(node.vel.y, -PLEXUS.MAX_VEL * 2.5, PLEXUS.MAX_VEL * 2.5);
  } else {
    // Ease back to base velocity when out of range
    node.vel.x += (node.baseVel.x - node.vel.x) * 0.02;
    node.vel.y += (node.baseVel.y - node.vel.y) * 0.02;
  }
}

function updateNode(node: Node, width: number, height: number, mouse: Vec2 | null): void {
  applyMouseInfluence(node, mouse);
  node.pos.x += node.vel.x;
  node.pos.y += node.vel.y;
  wrapNode(node, width, height);
}

function drawPlexus(
  ctx: CanvasRenderingContext2D,
  nodes: Node[],
  accent: string,
): void {
  // --- Connections ---
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist(nodes[i].pos, nodes[j].pos);
      if (d < PLEXUS.CONNECTION_DIST) {
        // Opacity: 0 at max distance, ~0.55 at distance 0
        const alpha = (1 - d / PLEXUS.CONNECTION_DIST) * 0.55;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${accent}, ${alpha})`;
        ctx.lineWidth = PLEXUS.LINE_WIDTH;
        ctx.moveTo(nodes[i].pos.x, nodes[i].pos.y);
        ctx.lineTo(nodes[j].pos.x, nodes[j].pos.y);
        ctx.stroke();
      }
    }
  }

  // --- Nodes ---
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.pos.x, node.pos.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accent}, 0.85)`;
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMET SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const COMET_CFG = {
  COUNT: 4,
  SPEED_MIN: 0.35,
  SPEED_MAX: 0.75,
  HEAD_RADIUS: 2,
  HISTORY_LEN: 100,
  /** tail segment radius at origin = headRadius * HEAD_SCALE_START */
  HEAD_SCALE_START: 0.5,
};

/**
 * Factory function — each comet is a self-contained object
 * with its own state, update(), and draw() methods.
 */
function createComet(width: number, height: number): Comet {
  const comet: Comet = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    history: [],
    historyMax: COMET_CFG.HISTORY_LEN,
    headRadius: COMET_CFG.HEAD_RADIUS,

    reset(w: number, h: number) {
      // Pick a random edge: 0=top, 1=right, 2=bottom, 3=left
      const edge = Math.floor(Math.random() * 4);
      const speed = rand(COMET_CFG.SPEED_MIN, COMET_CFG.SPEED_MAX);

      switch (edge) {
        case 0: // top
          this.pos = { x: rand(0, w), y: -20 };
          this.vel = { x: rand(-speed * 0.6, speed * 0.6), y: speed };
          break;
        case 1: // right
          this.pos = { x: w + 20, y: rand(0, h) };
          this.vel = { x: -speed, y: rand(-speed * 0.6, speed * 0.6) };
          break;
        case 2: // bottom
          this.pos = { x: rand(0, w), y: h + 20 };
          this.vel = { x: rand(-speed * 0.6, speed * 0.6), y: -speed };
          break;
        default: // left
          this.pos = { x: -20, y: rand(0, h) };
          this.vel = { x: speed, y: rand(-speed * 0.6, speed * 0.6) };
          break;
      }
      this.history = [];
    },

    update(w: number, h: number) {
      // Record position before moving (tail history)
      this.history.unshift({ x: this.pos.x, y: this.pos.y });
      if (this.history.length > this.historyMax) {
        this.history.pop();
      }
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;

      // Reset when sufficiently off-screen
      const margin = 80;
      if (
        this.pos.x < -margin || this.pos.x > w + margin ||
        this.pos.y < -margin || this.pos.y > h + margin
      ) {
        this.reset(w, h);
      }
    },

    draw(ctx: CanvasRenderingContext2D, accent: string) {
      if (this.history.length < 2) return;

      // --- Tail ---
      for (let i = 0; i < this.history.length - 1; i++) {
        const t = i / this.history.length; // 0 (head end) → 1 (tail end)
        const alpha = (1 - t) * 0.7;      // fades toward tail
        const radius = this.headRadius * COMET_CFG.HEAD_SCALE_START * (1 - t);

        ctx.beginPath();
        ctx.arc(this.history[i].x, this.history[i].y, Math.max(radius, 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent}, ${alpha})`;
        ctx.fill();
      }

      // --- Head ---
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.headRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accent}, 1)`;
      ctx.fill();

      // Soft glow on head
      const grd = ctx.createRadialGradient(
        this.pos.x, this.pos.y, 0,
        this.pos.x, this.pos.y, this.headRadius * 4,
      );
      grd.addColorStop(0, `rgba(${accent}, 0.35)`);
      grd.addColorStop(1, `rgba(${accent}, 0)`);
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.headRadius * 4, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    },
  };

  comet.reset(width, height);
  // Stagger initial positions so comets don't all enter at once
  for (let i = 0; i < Math.floor(Math.random() * 60); i++) {
    comet.update(width, height);
  }
  return comet;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.5. SOLAR SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

interface Planet {
  angle: number;
  speed: number;
  distanceFactor: number;
  radius: number;
  color: string;
}

const PLANET_CFG = [
  { d: 0.15, r: 3,  s: 0.005,  c: '#FF8C00' }, // Mercury-like
  { d: 0.25, r: 5,  s: 0.0035, c: '#EEDC82' }, // Venus-like
  { d: 0.38, r: 6,  s: 0.0025, c: '#4169E1' }, // Earth-like
  { d: 0.50, r: 4,  s: 0.002,  c: '#CD5C5C' }, // Mars-like
  { d: 0.70, r: 14, s: 0.0012, c: '#DEB887' }, // Jupiter-like
  { d: 0.90, r: 11, s: 0.0009, c: '#F4A460' }, // Saturn-like
  { d: 1.15, r: 8,  s: 0.0006, c: '#87CEEB' }, // Uranus-like
  { d: 1.40, r: 8,  s: 0.0005, c: '#4682B4' }, // Neptune-like
  { d: 1.65, r: 3,  s: 0.0003, c: '#D3D3D3' }, // Pluto-like
  { d: 1.90, r: 10, s: 0.0002, c: '#9370DB' }, // Planet X
];

function createPlanets(): Planet[] {
  return PLANET_CFG.map(cfg => ({
    angle: Math.random() * Math.PI * 2,
    speed: cfg.s,
    distanceFactor: cfg.d,
    radius: cfg.r,
    color: cfg.c,
  }));
}

function drawSolarSystem(ctx: CanvasRenderingContext2D, planets: Planet[], width: number, height: number, theme: ThemeColors) {
  const cx = width / 2;
  const cy = height / 2;
  // Use Math.min so the orbits are somewhat circular but scale with screen
  // Actually, Math.max ensures the solar system spans the whole screen even if wide/tall
  const baseDist = Math.max(width, height) / 2.5; 

  // Draw Sun
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD700';
  ctx.shadowBlur = 30;
  ctx.shadowColor = '#FFA500';
  ctx.fill();
  ctx.shadowBlur = 0;

  for (const p of planets) {
    p.angle += p.speed;
    const dist = p.distanceFactor * baseDist;

    // Draw Orbit
    ctx.beginPath();
    ctx.arc(cx, cy, dist, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${theme.accent}, 0.1)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw Planet
    const px = cx + Math.cos(p.angle) * dist;
    const py = cy + Math.sin(p.angle) * dist;

    ctx.beginPath();
    ctx.arc(px, py, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ANIMATION ENGINE — PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export interface AstroPlexusEngine {
  /** Start the animation loop */
  start: () => void;
  /** Stop the animation loop and clean up event listeners */
  stop: () => void;
  /** Force a theme colour refresh (call after toggling dark/light) */
  updateTheme: () => void;
}

export function createAstroPlexusEngine(canvas: HTMLCanvasElement): AstroPlexusEngine {
  const ctx = canvas.getContext('2d')!;

  let width = 0;
  let height = 0;
  let nodes: Node[] = [];
  let comets: Comet[] = [];
  let planets: Planet[] = [];
  let theme: ThemeColors = resolveTheme();
  let mouse: Vec2 | null = null;
  let rafId = 0;
  let running = false;

  // ── Sizing ────────────────────────────────────────────────────────────────

  function resize() {
    width  = window.innerWidth;
    height = window.innerHeight;
    // Use devicePixelRatio for sharp rendering on HiDPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Re-seed nodes proportionally on resize
    nodes  = createPlexusNodes(width, height);
    comets = Array.from({ length: COMET_CFG.COUNT }, () => createComet(width, height));
    planets = createPlanets();
  }

  // ── Mouse tracking ────────────────────────────────────────────────────────

  function onMouseMove(e: MouseEvent) {
    mouse = { x: e.clientX, y: e.clientY };
  }

  function onMouseLeave() {
    mouse = null;
  }

  // ── Main draw loop ────────────────────────────────────────────────────────

  function draw() {
    // Clear with solid background (no ghosting / trails)
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    // Draw Solar System in the deep background
    drawSolarSystem(ctx, planets, width, height, theme);

    // Update & draw plexus nodes
    for (const node of nodes) {
      updateNode(node, width, height, mouse);
    }
    drawPlexus(ctx, nodes, theme.accent);

    // Update & draw comets
    for (const comet of comets) {
      comet.update(width, height);
      comet.draw(ctx, theme.accent);
    }
  }

  function loop() {
    if (!running) return;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function start() {
    if (running) return;
    running = true;
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    loop();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseleave', onMouseLeave);
  }

  function updateTheme() {
    theme = resolveTheme();
  }

  return { start, stop, updateTheme };
}

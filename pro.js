import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
const tabs = document.querySelectorAll('.nav-tab');
const pages = document.querySelectorAll('.page');
let activeTab = 'learn';

function switchTab(name) {
  activeTab = name;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  pages.forEach(p => p.classList.toggle('active', p.id === `page-${name}`));

  if (name === 'simulate') {
    requestAnimationFrame(handleResize);
    updateStability();
  }
}

tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
document.getElementById('cta-simulate')?.addEventListener('click', () => switchTab('simulate'));
document.getElementById('cta-simulate-2')?.addEventListener('click', () => switchTab('simulate'));

/* ============================================================
   STATE
   ============================================================ */
const DT = 0.01;
const SCALE = 0.4;
const MAX_PTS = 5000;

let prey = 40, predator = 9;
let speed = 1.0;
let paused = true;
let is3D = false;
let mode = 'trajectory';
let history = [];
const CHART_LIMIT = 600;

const C_PREY = '#38bdf8';
const C_PRED = '#f87171';
const C_TRAJ = '#34d399';

// Peak detection state
let lastPreyDir = 0, preyPeaks = 0, lastPeakTime = 0, estimatedPeriod = 0;

/* ============================================================
   PRESETS
   ============================================================ */
const PRESETS = {
  balanced: { a: 1.0, b: 0.1, g: 1.0, d: 0.1 },
  fast: { a: 3.5, b: 0.25, g: 2.0, d: 0.05 },
  unstable: { a: 1.2, b: 0.05, g: 1.5, d: 0.02 },
  starvation: { a: 0.8, b: 0.5, g: 1.2, d: 0.01 },
};

/* ============================================================
   DOM
   ============================================================ */
const $ = id => document.getElementById(id);

const el = {
  alpha: $('p-alpha'), beta: $('p-beta'), gamma: $('p-gamma'), delta: $('p-delta'),
  vAlpha: $('v-alpha'), vBeta: $('v-beta'), vGamma: $('v-gamma'), vDelta: $('v-delta'),
  speed: $('p-speed'), vSpeed: $('v-speed'),
  initPrey: $('init-prey'), initPred: $('init-pred'),
  btnToggle: $('btn-toggle'), btnLabel: $('btn-label'), btnReset: $('btn-reset'),
  btnMode: $('btn-mode'), btnDim: $('btn-dim'),
  statPrey: $('stat-prey'), statPred: $('stat-pred'),
  barPrey: $('bar-prey'), barPred: $('bar-pred'),
  badgeTxt: $('badge-text'),
  chartTime: $('chart-time'),
  chipMaxPrey: $('chip-max-prey'),
  chipMaxPred: $('chip-max-pred'),
  chipCycles: $('chip-cycles'),
  chipPeriod: $('chip-period'),
  stExplanation: $('st-explanation'),
  presetSelector: $('preset-selector'),
  eqX: $('eq-x'),
  eqY: $('eq-y'),
};

/* ============================================================
   THREE.JS
   ============================================================ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010309);

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.set(0, 0, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$('canvas-container').appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(800, 600), 1.0, 0.3, 0.85));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Trajectory
let trajArr = [];
const trajGeo = new THREE.BufferGeometry();
const trajLine = new THREE.Line(trajGeo, new THREE.LineBasicMaterial({ color: C_TRAJ, transparent: true, opacity: 0.85 }));
scene.add(trajLine);

// Indicator
const indicator = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
scene.add(indicator);

// Particles
const preyGeo = new THREE.BufferGeometry();
const predGeo = new THREE.BufferGeometry();
const preyPts = new THREE.Points(preyGeo, new THREE.PointsMaterial({ color: C_PREY, size: 0.8, transparent: true, opacity: 0.9 }));
const predPts = new THREE.Points(predGeo, new THREE.PointsMaterial({ color: C_PRED, size: 1.0, transparent: true, opacity: 0.9 }));
scene.add(preyPts, predPts);

// Grid & Axes
const grid = new THREE.GridHelper(200, 20, 0x1a2a40, 0x0a1020);
grid.rotation.x = Math.PI / 2;

const axisMat = new THREE.LineBasicMaterial({ color: 0x556688, transparent: true, opacity: 0.8 });
const xAxisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-100, -16, 0), new THREE.Vector3(100, -16, 0)]);
const yAxisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-16, -100, 0), new THREE.Vector3(-16, 100, 0)]);
const xAxis = new THREE.Line(xAxisGeo, axisMat);
const yAxis = new THREE.Line(yAxisGeo, axisMat);

scene.add(grid, xAxis, yAxis);

// Equilibrium marker
const eqMarker = new THREE.Mesh(
  new THREE.RingGeometry(1.5, 2, 32),
  new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
);
scene.add(eqMarker);

/* ============================================================
   SIMULATION
   ============================================================ */
let simTime = 0;

function step() {
  if (paused) return;

  const a = +el.alpha.value, b = +el.beta.value, g = +el.gamma.value, d = +el.delta.value;
  const dt = DT * speed;
  simTime += dt;

  const prevPrey = prey;
  prey += (a * prey - b * prey * predator) * dt;
  predator += (d * prey * predator - g * predator) * dt;
  prey = Math.max(0.1, Math.min(prey, 1000));
  predator = Math.max(0.1, Math.min(predator, 1000));

  // Peak detection for period estimation
  const dir = prey > prevPrey ? 1 : -1;
  if (lastPreyDir === 1 && dir === -1) {
    // prey just peaked
    if (lastPeakTime > 0) {
      estimatedPeriod = simTime - lastPeakTime;
    }
    lastPeakTime = simTime;
    preyPeaks++;
  }
  lastPreyDir = dir;

  const x = (prey - 20) * SCALE * 2;
  const y = (predator - 20) * SCALE * 2;
  const z = is3D ? (trajArr.length * 0.2) - (CHART_LIMIT * 0.1) : 0;

  trajArr.push(new THREE.Vector3(x, y, z));
  if (trajArr.length > MAX_PTS) trajArr.shift();

  if (is3D) { for (let i = 0; i < trajArr.length; i++) trajArr[i].z = (i * 0.2) - (trajArr.length * 0.15); }
  else { for (let i = 0; i < trajArr.length; i++) trajArr[i].z = 0; }

  trajGeo.setFromPoints(trajArr);
  indicator.position.copy(trajArr[trajArr.length - 1]);

  // Equilibrium marker position
  const eqPrey = g / d, eqPred = a / b;
  const eqX = (eqPrey - 20) * SCALE * 2;
  const eqY = (eqPred - 20) * SCALE * 2;
  eqMarker.position.set(eqX, eqY, 0);

  if (mode === 'particles') {
    fillParticles(preyGeo, Math.floor(prey * 5), x, y, 15, 0.4);
    fillParticles(predGeo, Math.floor(predator * 5), x, y, 20, 0.6);
    preyPts.visible = predPts.visible = true;
    trajLine.visible = indicator.visible = false;
  } else {
    preyPts.visible = predPts.visible = false;
    trajLine.visible = indicator.visible = true;
  }

  el.statPrey.textContent = Math.round(prey);
  el.statPred.textContent = Math.round(predator);
  el.barPrey.style.width = Math.min(100, prey / 2) + '%';
  el.barPred.style.width = Math.min(100, predator / 2) + '%';

  history.push({ prey, predator, total: prey + predator });
  if (history.length > 2000) history.shift();

  updateStability();
}

function updateStability() {
  const div = prey > 900 || predator > 900;
  const dying = (prey < 2 && prey > 0.1) || (predator < 1.5 && predator > 0.1);
  const extinct = prey <= 0.2 || predator <= 0.2;

  let label = 'NEUTRALLY STABLE';
  let color = C_TRAJ; // #34d399
  let explanation = 'The system orbits the equilibrium point in a closed loop. Populations fluctuate but neither die out nor explode.';

  if (extinct) {
    label = 'EXTINCT';
    color = '#64748b'; // slate-500
    explanation = 'One or both populations have vanished. The ecosystem has collapsed and the cycle has ended.';
  } else if (div) {
    label = 'DIVERGING';
    color = C_PRED; // red
    explanation = 'One or both populations have grown beyond sustainable limits, leading to a system collapse.';
  } else if (dying) {
    label = 'EXTINCTION IMMINENT';
    color = '#f59e0b'; // amber-500
    explanation = 'Population levels are critically low. Local extinction is likely without immediate parameter changes.';
  }

  el.stExplanation.textContent = explanation;
  el.badgeTxt.textContent = label;
  el.badgeTxt.style.color = color;
  el.badgeTxt.style.borderColor = color;
}

function fillParticles(geo, n, cx, cy, r, spd) {
  const pos = new Float32Array(n * 3);
  const t = Date.now() * 0.001 * spd;
  for (let i = 0; i < n; i++) {
    const o = i * 13.5;
    const rr = (Math.sin(t + o) * 0.2 + 0.8) * r * (i / n);
    const phi = t * 2 + o;
    pos[i * 3] = cx + Math.cos(phi) * rr;
    pos[i * 3 + 1] = cy + Math.sin(phi) * rr;
    pos[i * 3 + 2] = Math.sin(t * 3 + o) * 5;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
}

/* ============================================================
   CHART
   ============================================================ */
function drawCharts() {
  const h = history.slice(-CHART_LIMIT);
  const len = h.length;
  if (len < 10) return;
  const dpr = Math.min(devicePixelRatio, 2);

  if (!el.chartTime) return;
  const ctx = el.chartTime.getContext('2d');
  const w = el.chartTime.width = el.chartTime.offsetWidth * dpr;
  const ht = el.chartTime.height = el.chartTime.offsetHeight * dpr;
  if (w === 0 || ht === 0) return;
  ctx.clearRect(0, 0, w, ht);

  let mx = 80;
  let maxPrey = 0, maxPred = 0;
  for (let i = 0; i < len; i++) {
    if (h[i].total > mx) mx = h[i].total;
    if (h[i].prey > maxPrey) maxPrey = h[i].prey;
    if (h[i].predator > maxPred) maxPred = h[i].predator;
  }
  mx *= 1.15;

  const mY = v => ht - (v / mx) * ht;
  const mX = i => (i / (CHART_LIMIT - 1)) * w;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const gy = (ht / 5) * i;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  // Draw bright X/Y axes
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, ht); // Y-axis
  ctx.moveTo(0, ht); ctx.lineTo(w, ht); // X-axis
  ctx.stroke();

  // Equilibrium line
  const a = +el.alpha.value, b = +el.beta.value, g = +el.gamma.value, d = +el.delta.value;
  const eqPrey = g / d, eqPred = a / b;
  ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.strokeStyle = 'rgba(251,191,36,0.25)'; ctx.lineWidth = 1 * dpr;
  ctx.beginPath(); ctx.moveTo(0, mY(eqPrey)); ctx.lineTo(w, mY(eqPrey)); ctx.stroke();
  ctx.strokeStyle = 'rgba(251,191,36,0.15)';
  ctx.beginPath(); ctx.moveTo(0, mY(eqPred)); ctx.lineTo(w, mY(eqPred)); ctx.stroke();
  ctx.setLineDash([]);

  // Lines
  const line = (p, c, lw) => {
    ctx.beginPath(); ctx.strokeStyle = c; ctx.lineWidth = lw * dpr;
    ctx.moveTo(mX(0), mY(h[0][p]));
    for (let i = 1; i < len; i++) ctx.lineTo(mX(i), mY(h[i][p]));
    ctx.stroke();
  };
  line('prey', C_PREY, 2);
  line('predator', C_PRED, 2);

  // Update insight chips
  el.chipMaxPrey.textContent = Math.round(maxPrey);
  el.chipMaxPred.textContent = Math.round(maxPred);
  el.chipCycles.textContent = Math.floor(preyPeaks / 2);
  el.chipPeriod.textContent = estimatedPeriod > 0 ? (estimatedPeriod).toFixed(1) + 't' : '—';
}

/* ============================================================
   UI SYNC
   ============================================================ */
function syncUI() {
  const a = +el.alpha.value, b = +el.beta.value, g = +el.gamma.value, d = +el.delta.value;
  el.vAlpha.textContent = a.toFixed(1);
  el.vBeta.textContent = b.toFixed(2);
  el.vGamma.textContent = g.toFixed(1);
  el.vDelta.textContent = d.toFixed(2);
  el.vSpeed.textContent = (+el.speed.value).toFixed(1) + 'x';
  speed = +el.speed.value;

  // Equilibrium
  const eqPrey = (g / d).toFixed(1);
  const eqPred = (a / b).toFixed(1);
  el.eqX.textContent = `x* = ${eqPrey}`;
  el.eqY.textContent = `y* = ${eqPred}`;
}

[el.alpha, el.beta, el.gamma, el.delta, el.speed].forEach(e => e.addEventListener('input', () => {
  syncUI();
  el.presetSelector.querySelectorAll('.preset-btn-sel').forEach(o => o.classList.toggle('active', o.dataset.val === 'custom'));
}));

/* ============================================================
   CONTROLS
   ============================================================ */
el.btnToggle.addEventListener('click', () => {
  paused = !paused;
  el.btnLabel.textContent = paused ? 'Start' : 'Pause';
  el.btnToggle.classList.toggle('btn-primary', paused);
});

el.btnReset.addEventListener('click', () => {
  prey = +el.initPrey.value || 40;
  predator = +el.initPred.value || 9;
  trajArr = []; history = [];
  simTime = 0; preyPeaks = 0; lastPeakTime = 0; estimatedPeriod = 0; lastPreyDir = 0;
  paused = true;
  el.btnLabel.textContent = 'Start';
  el.btnToggle.classList.add('btn-primary');
  el.chipPeriod.textContent = '—';
  el.chipMaxPrey.textContent = '—';
  el.chipMaxPred.textContent = '—';
  el.chipCycles.textContent = '0';
});

el.btnMode.addEventListener('click', () => {
  mode = mode === 'trajectory' ? 'particles' : 'trajectory';
  el.btnMode.textContent = mode === 'trajectory' ? '✦ Particles' : '⟋ Trajectory';
});

el.btnDim.addEventListener('click', () => {
  is3D = !is3D;
  el.btnDim.textContent = is3D ? '◇ 2D Orbit' : '◇ 3D Spiral';
  if (!is3D) { camera.position.set(0, 0, 80); controls.reset(); }
  else camera.position.set(30, 30, 60);
});

// Preset Selector Buttons
const presetBtns = el.presetSelector.querySelectorAll('.preset-btn-sel');
presetBtns.forEach(btn => btn.addEventListener('click', () => {
  const v = btn.dataset.val;
  presetBtns.forEach(b => b.classList.toggle('active', b === btn));

  if (v !== 'custom' && PRESETS[v]) {
    const p = PRESETS[v];
    el.alpha.value = p.a; el.beta.value = p.b; el.gamma.value = p.g; el.delta.value = p.d;
    syncUI();
    el.btnReset.click();
    updateStability();
  }
}));

/* ============================================================
   RESIZE
   ============================================================ */
function handleResize() {
  const c = $('canvas-container');
  if (!c) return;
  const w = c.clientWidth, h = c.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', handleResize);

/* ============================================================
   LOOP
   ============================================================ */
let lastDraw = 0;
function animate(t) {
  requestAnimationFrame(animate);
  if (activeTab !== 'simulate') return;

  controls.update();
  const steps = Math.max(1, Math.floor(speed));
  for (let i = 0; i < steps; i++) step();

  if (t - lastDraw > 33) { drawCharts(); lastDraw = t; }
  composer.render();
}

syncUI();
handleResize();
animate(0);
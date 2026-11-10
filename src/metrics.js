// Live metrics monitor. Loaded on demand. Reads the session recorder (telemetry.js), lets you scrub
// back and forth through the recording, and switch each speed technique off and on to see its effect.
import { rec, vitals, flags, CAP, count, idx, SECTION_NAME, onSample, mark, setMeasuring } from './telemetry.js';

const $ = (s, r = document) => r.querySelector(s);
const kb = (b) => (b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : Math.round(b / 1024) + ' KB');
const sec = (ms) => (ms == null ? '–' : ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(2) + ' s');
const clock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const SEC_HUE = [25, 60, 95, 130, 165, 200, 235, 270, 305, 340, 10];

// Web Vitals thresholds (web.dev): good / needs improvement / poor
const RATE = { fcp: [1800, 3000], lcp: [2500, 4000], cls: [0.1, 0.25], inp: [200, 500], ttfb: [800, 1800], load: [2500, 5000] };
const rate = (k, v) => (v == null ? 'na' : v <= RATE[k][0] ? 'good' : v <= RATE[k][1] ? 'ok' : 'poor');
const RATE_WORD = { good: 'Good', ok: 'Needs work', poor: 'Poor', na: 'Waiting' };

let el = null, ctx = null, cursor = null, play = 0, span = 120, unsub = null, lastWeight = 0;

export function openMetrics(context) {
  ctx = context;
  if (!el) build();
  el.hidden = false; document.documentElement.classList.add('mx-open'); setMeasuring(true);
  cursor = null; refreshAll(); weight();
  unsub ||= onSample(() => { if (!el.hidden) { if (cursor == null) draw(); power(); vitalsCard(); gpu(); if (performance.now() - lastWeight > 5000) weight(); } });
  $('.mx-close', el).focus();
  mark('Metrics opened');
}
export function closeMetrics() { if (!el) return; el.hidden = true; document.documentElement.classList.remove('mx-open'); stop(); setMeasuring(false); }

function build() {
  el = document.createElement('aside');
  el.className = 'mx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Live metrics');
  el.innerHTML = `
  <header class="mx-head">
    <div><p class="mx-title">Live metrics</p><p class="mx-sub">Recording since this page opened · one sample a second · kept only in this tab</p></div>
    <div class="mx-head-b"><button type="button" class="mx-btn" data-x="export">Export JSON</button><button type="button" class="mx-close" aria-label="Close metrics">×</button></div>
  </header>

  <section class="mx-card mx-power" id="mx-power" aria-live="off"></section>

  <section class="mx-card">
    <div class="mx-row"><h3>Timeline</h3>
      <div class="mx-seg" role="group" aria-label="Time window">${[[60, '1 min'], [120, '2 min'], [300, '5 min'], [CAP, 'All']].map(([v, l]) => `<button type="button" data-span="${v}" aria-pressed="${v === 120}">${l}</button>`).join('')}</div></div>
    <canvas class="mx-chart" id="mx-chart" height="230" aria-label="Frames per second, memory and main-thread work over time. Use the slider below to move through it."></canvas>
    <div class="mx-legend"><span class="lg gpu">GPU work</span><span class="lg base">If it drew all the time</span><span class="lg fps">Frames a second (panel open)</span><span class="lg heap">JS memory</span><span class="lg busy">Main thread blocked</span><span class="lg sec">Where on the page</span></div>
    <div class="mx-scrub">
      <button type="button" class="mx-ic" data-step="-10" aria-label="Back 10 seconds">«</button>
      <button type="button" class="mx-ic" data-step="-1" aria-label="Back 1 second">‹</button>
      <button type="button" class="mx-ic mx-play" data-x="play" aria-label="Replay from here">▶</button>
      <button type="button" class="mx-ic" data-step="1" aria-label="Forward 1 second">›</button>
      <button type="button" class="mx-ic" data-step="10" aria-label="Forward 10 seconds">»</button>
      <input type="range" id="mx-range" min="0" max="0" value="0" aria-label="Move through the recording">
      <button type="button" class="mx-live" data-x="live" aria-pressed="true">Live</button>
    </div>
    <div class="mx-read" id="mx-read"></div>
  </section>

  <section class="mx-card"><div class="mx-row"><h3>Loading and responsiveness</h3><span class="mx-note">Web Vitals, measured in this browser</span></div><div class="mx-vitals" id="mx-vitals"></div>
    <p class="mx-foot">LCP includes the intro loader, which holds the page for a moment on purpose. INP is the slowest tap or click so far.</p></section>

  <section class="mx-card"><div class="mx-row"><h3>Switch the speed work off and on</h3><span class="mx-note">Watch the timeline change</span></div><div class="mx-exp" id="mx-exp"></div></section>

  <section class="mx-card"><div class="mx-row"><h3>Filter engine benchmark</h3><span class="mx-note">Same answer, two data layouts</span></div>
    <p class="mx-p">Counting which rooms fit. The object way builds a full receipt per room, then counts. The packed way scans typed arrays (structure of arrays) and allocates nothing.</p>
    <div class="mx-bench-b"><button type="button" class="mx-btn" data-bench="0">Run with this building (70 rooms)</button><button type="button" class="mx-btn" data-bench="10000">Run with 10,000 rooms</button></div>
    <div class="mx-bench" id="mx-bench"></div></section>

  <section class="mx-card"><div class="mx-row"><h3>Download size and storage</h3><span class="mx-note" id="mx-wnote"></span></div><div id="mx-weight"></div></section>

  <section class="mx-card"><div class="mx-row"><h3>Memory and graphics</h3><span class="mx-note">Updates every second</span></div><div id="mx-gpu"></div></section>
  `;
  document.body.appendChild(el);

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('mx-close')) closeMetrics();
    else if (b.dataset.span) { span = +b.dataset.span; el.querySelectorAll('[data-span]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); }
    else if (b.dataset.step) { stop(); seek((cursor ?? count() - 1) + +b.dataset.step); }
    else if (b.dataset.x === 'live') { stop(); cursor = null; draw(); }
    else if (b.dataset.x === 'play') play ? stop() : start();
    else if (b.dataset.x === 'export') exportJSON();
    else if (b.dataset.bench != null) bench(+b.dataset.bench, b);
  });
  $('#mx-range', el).addEventListener('input', (e) => { stop(); seek(+e.target.value); });
  const cv = $('#mx-chart', el);
  const fromPointer = (e) => { const r = cv.getBoundingClientRect(); const { a, b } = win(); seek(Math.round(a + ((e.clientX - r.left) / r.width) * (b - a))); };
  cv.addEventListener('pointerdown', (e) => { stop(); cv.setPointerCapture(e.pointerId); fromPointer(e); });
  cv.addEventListener('pointermove', (e) => { if (cv.hasPointerCapture(e.pointerId)) fromPointer(e); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMetrics(); });
  new ResizeObserver(() => draw()).observe(cv);
  experiments();
}

/* ---------- timeline ---------- */
function win() { const n = count(); const end = cursor == null ? n - 1 : Math.max(cursor, Math.min(n - 1, cursor + Math.floor(span / 2))); const b = Math.max(0, end); return { a: Math.max(0, b - span + 1), b }; }
function seek(k) { const n = count(); if (!n) return; cursor = Math.max(0, Math.min(n - 1, k)); if (cursor === n - 1 && !play) cursor = null; draw(); }
function start() { if (cursor == null) cursor = Math.max(0, count() - span); play = setInterval(() => { if (cursor >= count() - 1) { stop(); cursor = null; draw(); return; } cursor++; draw(); }, 220); $('.mx-play', el).textContent = '❚❚'; mark('Replay'); }
function stop() { clearInterval(play); play = 0; if (el) $('.mx-play', el).textContent = '▶'; }

function draw() {
  if (!el || el.hidden) return;
  const cv = $('#mx-chart', el), dpr = Math.min(devicePixelRatio, 2);
  const W = cv.clientWidth, H = 230; if (!W) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = H * dpr; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const n = count(), range = $('#mx-range', el);
  range.max = Math.max(0, n - 1); range.value = cursor ?? n - 1;
  $('[data-x="live"]', el).setAttribute('aria-pressed', String(cursor == null));
  if (!n) { g.fillStyle = '#8b93a5'; g.font = '13px Poppins'; g.fillText('Collecting the first sample…', 12, 24); read(); return; }
  const { a, b } = win(), cnt = Math.max(1, b - a), x = (k) => ((k - a) / cnt) * (W - 8) + 4;
  const L0 = [8, 92], L1 = [98, 132], L2 = [138, 174], L3 = [180, 206], band = [212, 226]; // lanes: GPU work, fps, memory, busy, section
  let gmax = 1; for (let k = a; k <= b; k++) { const i = idx(k); gmax = Math.max(gmax, rec.alwaysOn[i], rec.gpu[i]); }
  let hmax = 1; for (let k = a; k <= b; k++) hmax = Math.max(hmax, rec.heap[idx(k)]); hmax = Math.ceil(hmax / 10) * 10;
  // grid + lane labels
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  [L0, L1, L2, L3].forEach(([t, bt]) => { g.beginPath(); g.moveTo(0, bt + 0.5); g.lineTo(W, bt + 0.5); g.stroke(); });
  g.setLineDash([3, 4]); const y60 = L1[1] - (60 / 75) * (L1[1] - L1[0]) + 0.5; g.beginPath(); g.moveTo(0, y60); g.lineTo(W, y60); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#6f788b'; g.font = '10px Poppins'; g.fillText('60 fps', 4, y60 - 3); g.fillText(`${Math.round(gmax)} million px/s`, 4, L0[0] + 30); g.fillText(hmax ? `${hmax} MB` : 'memory n/a', 4, L2[0] + 9); g.fillText('1 s blocked', 4, L3[0] + 9);
  // section band
  for (let k = a; k <= b; k++) { const s = rec.section[idx(k)]; g.fillStyle = `oklch(0.62 0.12 ${SEC_HUE[s]})`; g.fillRect(x(k) - 0.5, band[0], Math.max(1.5, (W - 8) / cnt + 0.5), band[1] - band[0]); }
  // busy bars
  g.fillStyle = 'rgba(251,95,100,.85)';
  for (let k = a; k <= b; k++) { const v = rec.busy[idx(k)]; if (v > 0) { const h = (v / 1000) * (L3[1] - L3[0]); g.fillRect(x(k) - 1.5, L3[1] - h, 3, h); } }
  // lines
  const line = (arr, lane, max, col) => { g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); for (let k = a; k <= b; k++) { const v = Math.min(max, arr[idx(k)]); const y = lane[1] - (v / max) * (lane[1] - lane[0]); k === a ? g.moveTo(x(k), y) : g.lineTo(x(k), y); } g.stroke(); };
  // GPU work: filled area, with the always-on baseline dashed above it. The gap is the saving.
  g.fillStyle = 'rgba(255,159,67,.28)'; g.beginPath(); g.moveTo(x(a), L0[1]);
  for (let k = a; k <= b; k++) g.lineTo(x(k), L0[1] - (rec.gpu[idx(k)] / gmax) * (L0[1] - L0[0]));
  g.lineTo(x(b), L0[1]); g.closePath(); g.fill();
  line(rec.gpu, L0, gmax, '#ff9f43');
  g.setLineDash([4, 4]); line(rec.alwaysOn, L0, gmax, 'rgba(255,255,255,.4)'); g.setLineDash([]);
  // fps only where it was measured (the panel was open)
  g.strokeStyle = '#5fd39a'; g.lineWidth = 1.8; g.beginPath(); let pen = false;
  for (let k = a; k <= b; k++) { const v = rec.fps[idx(k)]; if (Number.isNaN(v)) { pen = false; continue; } const y = L1[1] - (Math.min(75, v) / 75) * (L1[1] - L1[0]); pen ? g.lineTo(x(k), y) : g.moveTo(x(k), y); pen = true; }
  g.stroke();
  if (hmax > 1) line(rec.heap, L2, hmax, '#7cb7ff');
  // event markers
  g.font = '10px Poppins';
  const rowEnd = [-1e9, -1e9, -1e9, -1e9]; // place labels in the first row where they don't collide
  for (const ev of rec.events) {
    const k = ev.n - (rec.n - n); if (k < a || k > b) continue;
    const xx = x(k); g.strokeStyle = 'rgba(255,210,138,.5)'; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, band[0]); g.stroke(); g.setLineDash([]);
    const t = ev.label.length > 24 ? ev.label.slice(0, 23) + '…' : ev.label, w = g.measureText(t).width + 8;
    let lx = Math.min(xx + 3, W - w), row = rowEnd.findIndex((e) => lx > e);
    if (row < 0) { g.fillStyle = '#ffd28a'; g.beginPath(); g.arc(xx, 4, 2.5, 0, 7); g.fill(); continue; } // no room: a dot, details in the readout
    g.fillStyle = 'rgba(18,21,27,.85)'; g.fillRect(lx - 2, 3 + row * 13, w, 12);
    g.fillStyle = '#ffd28a'; g.fillText(t, lx + 2, 12 + row * 13); rowEnd[row] = lx + w;
  }
  // cursor
  const ck = cursor ?? n - 1;
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x(ck), 0); g.lineTo(x(ck), H); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x(ck), band[1] + 1, 4, 0, Math.PI * 2); g.fill();
  read();
}

function read() {
  const n = count(), out = $('#mx-read', el); if (!n) { out.innerHTML = ''; return; }
  const k = cursor ?? n - 1, i = idx(k), abs = rec.n - n + k;
  const near = rec.events.filter((e) => Math.abs(e.n - abs) <= 1).map((e) => e.label).join(', ');
  const fps = rec.fps[i];
  const cell = (l, v, cls = '') => `<div class="${cls}"><span>${l}</span><b>${v}</b></div>`;
  out.innerHTML = [
    cell(cursor == null ? 'Now' : 'At', `${clock(rec.time[i])} into the visit${cursor == null ? '' : ` · ${n - 1 - k}s ago`}`),
    cell('GPU work', `${rec.gpu[i].toFixed(1)} million px/s`, rec.gpu[i] < 30 ? 'good' : rec.gpu[i] < 150 ? 'ok' : 'poor'),
    cell('Always-on would be', `${rec.alwaysOn[i].toFixed(0)} million px/s`),
    cell('3D frames drawn', Math.round(rec.drawn[i]) + ' that second'),
    cell('Frames a second', Number.isNaN(fps) ? 'not measured (panel closed)' : Math.round(fps), Number.isNaN(fps) ? '' : fps >= 50 ? 'good' : fps >= 30 ? 'ok' : 'poor'),
    cell('JS memory', rec.heap[i] ? rec.heap[i].toFixed(1) + ' MB' : 'n/a in this browser'),
    cell('Main thread blocked', Math.round(rec.busy[i]) + ' ms of 1000', rec.busy[i] < 50 ? 'good' : rec.busy[i] < 250 ? 'ok' : 'poor'),
    cell('Page elements', rec.dom[i]),
    cell('Hero shader cost', rec.heroMs[i] ? rec.heroMs[i].toFixed(1) + ' ms a frame' : 'off screen or paused'),
    cell('Where on the page', SECTION_NAME[rec.section[i]]),
    near ? cell('What happened', near, 'ev') : '',
  ].join('');
}

/* ---------- power: is anything drawing right now? ---------- */
function power() {
  const n = count(); if (!n) return;
  let g = 0, base = 0; const W = Math.min(10, n);
  for (let k = n - W; k < n; k++) { g += rec.gpu[idx(k)]; base += rec.alwaysOn[idx(k)]; }
  g /= W; base /= W;
  const saving = base > 0 ? Math.max(0, g > 0 ? Math.min(99, Math.floor((1 - g / base) * 100)) : 100) : 100;
  const st = (name, o, lazy) => { const sc = o?.stats; if (!o) return `<li><b>${name}</b><span>${lazy}</span></li>`;
    const on = sc?.visible; const mode = name === 'Hero' ? (on ? sc.mode : 'off screen, asleep') : on ? 'on screen, draws only when something moves' : 'off screen, asleep';
    return `<li class="${on ? 'on' : ''}"><b>${name}</b><span>${mode}</span></li>`; };
  $('#mx-power', el).innerHTML = `
    <div class="pw-top"><div><p class="pw-k">GPU work, last 10 s</p><p class="pw-v">${g.toFixed(1)}<small> million pixels a second</small></p></div>
    <div class="pw-save"><b>${saving}%</b><span>less than a page that draws all the time (${base.toFixed(0)} million)</span></div></div>
    <ul class="pw-list">${st('Hero', ctx.hero(), 'not created')}</ul>
    <p class="mx-foot">Pixels drawn per second is the closest thing a web page can measure to GPU load, and so to heat and battery use. Zero means the graphics card is resting.</p>`;
}

/* ---------- vitals ---------- */
function vitalsCard() {
  const items = [['fcp', 'First paint (FCP)', sec(vitals.fcp)], ['lcp', 'Main content (LCP)', sec(vitals.lcp)], ['cls', 'Layout shift (CLS)', vitals.cls.toFixed(3)],
    ['inp', 'Slowest response (INP)', vitals.inp == null ? 'Tap something' : sec(vitals.inp)], ['ttfb', 'Server reply (TTFB)', sec(vitals.ttfb)], ['load', 'Page load event', sec(vitals.load)]];
  $('#mx-vitals', el).innerHTML = items.map(([k, l, v]) => { const r = rate(k, k === 'cls' ? vitals.cls : vitals[k]); return `<div class="vt ${r}"><span>${l}</span><b>${v}</b><i>${RATE_WORD[r]}</i></div>`; }).join('');
}

/* ---------- experiments ---------- */
function experiments() {
  const box = $('#mx-exp', el);
  const list = [
    { id: 'pace', short: 'Hero pacing', name: 'Hero rests when idle', what: 'Full rate only while you interact, 15 fps for 8 s after, then it stops drawing. 1.25x resolution. Off: every frame at full resolution.', get: () => ctx.hero()?.pacing ?? true, set: (v) => ctx.hero()?.setPacing(v), need: () => ctx.hero() },
    { id: 'cv', short: 'Off-screen skipping', name: 'Skip drawing off-screen sections', what: 'The browser skips layout and paint for sections far from view.', get: () => ctx.cv(), set: (v) => ctx.setCV(v), need: () => true },
    { id: 'glass', short: 'Frosted glass', name: 'Frosted-glass blur over 3D', what: 'Blurred panels over moving canvases must be re-blurred every frame. Off by default now: turn it on to see the cost.', get: () => ctx.glass(), set: (v) => ctx.setGlass(v), need: () => true, invert: true },
    { id: 'slow', short: 'Slow-phone mode', name: 'Pretend this is a slow phone', what: 'Adds 22 ms of work to every frame, so you can watch the hero switch to eco mode.', get: () => flags.slowDevice, set: (v) => (flags.slowDevice = v), need: () => true, invert: true },
  ];
  const render = () => {
    box.innerHTML = list.map((x) => {
      const ok = !!x.need();
      return `<div class="xp${x.invert ? ' warn' : ''}"><div><b>${x.name}</b><span>${x.what}</span></div>
        ${ok ? `<button type="button" role="switch" class="sw" data-xp="${x.id}" aria-checked="${!!x.get()}" aria-label="${x.name}"><i></i></button>`
             : `<button type="button" class="mx-btn sm" data-load="${x.id}">Load it</button>`}</div>`;
    }).join('');
  };
  render();
  box.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-xp]'), l = e.target.closest('[data-load]');
    if (l) { const x = list.find((y) => y.id === l.dataset.load); l.textContent = 'Loading…'; await x.load?.(); render(); return; }
    if (!s) return;
    const x = list.find((y) => y.id === s.dataset.xp), v = !x.get();
    x.set(v); mark(`${x.short}: ${v ? 'on' : 'off'}`); render(); draw();
  });
}

/* ---------- benchmark ---------- */
async function bench(size, btn) {
  const out = $('#mx-bench', el); btn.disabled = true; out.innerHTML = '<p class="mx-p">Running…</p>';
  await new Promise((r) => setTimeout(r, 30));
  const r = ctx.bench(size || 0);
  btn.disabled = false;
  const max = Math.max(r.objectUs, r.packedUs);
  const bar = (l, v, cls) => `<div class="bb ${cls}"><span>${l}</span><div><i style="width:${Math.max(2, (v / max) * 100)}%"></i></div><b>${v < 1000 ? v.toFixed(1) + ' µs' : (v / 1000).toFixed(2) + ' ms'}</b></div>`;
  out.innerHTML = bar('Objects, receipt per room', r.objectUs, 'obj') + bar('Packed typed arrays', r.packedUs, 'pk')
    + `<p class="mx-big"><b>${(r.objectUs / r.packedUs).toFixed(0)}× faster</b> counting ${r.rooms.toLocaleString()} rooms · ${r.fits.toLocaleString()} fit · both methods agree: ${r.agree ? 'yes' : 'no'} · average of ${r.iter} runs</p>`;
  mark(`Benchmark ${r.rooms.toLocaleString()} rooms`);
}

/* ---------- weight + storage ---------- */
async function weight() {
  lastWeight = performance.now();
  const nav = performance.getEntriesByType('navigation')[0], res = performance.getEntriesByType('resource');
  const type = (u) => /\.m?js(\?|$)/.test(u) ? 'JavaScript' : /\.css(\?|$)/.test(u) ? 'CSS' : /\.(woff2?|ttf|otf)(\?|$)/.test(u) ? 'Fonts' : /\.(mp4|webm)(\?|$)/.test(u) ? 'Video' : /\.(png|jpe?g|webp|avif|svg|gif)(\?|$)/.test(u) ? 'Images' : 'Other';
  const groups = {}; let lazy = [];
  const add = (name, t, transfer, decoded, late) => { const g = (groups[t] ||= { n: 0, tr: 0, de: 0 }); g.n++; g.tr += transfer; g.de += decoded; if (late) lazy.push({ name, decoded }); };
  if (nav) add('index.html', 'HTML', nav.transferSize || 0, nav.decodedBodySize || 0, false);
  const loadAt = vitals.load || Infinity;
  for (const r of res) { if (r.name.startsWith('data:')) continue; add(r.name.split('/').pop().split('?')[0], type(r.name), r.transferSize || 0, r.decodedBodySize || r.encodedBodySize || 0, r.startTime > loadAt); }
  const rows = Object.entries(groups).sort((a, b) => b[1].de - a[1].de);
  const tot = rows.reduce((s, [, g]) => s + g.de, 0), totTr = rows.reduce((s, [, g]) => s + g.tr, 0);
  const COL = { JavaScript: '#ffd28a', CSS: '#7cb7ff', Fonts: '#c8a2ff', Video: '#fb5f64', Images: '#5fd39a', HTML: '#e8e8e8', Other: '#8b93a5' };
  let est = null; try { est = await navigator.storage?.estimate?.(); } catch {}
  let ls = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch {}
  $('#mx-wnote', el).textContent = totTr ? `${kb(totTr)} over the network` : 'served from cache';
  $('#mx-weight', el).innerHTML = `
    <div class="stack" aria-hidden="true">${rows.map(([t, g]) => `<i style="flex:${g.de};background:${COL[t]}"></i>`).join('')}</div>
    <table class="mx-t"><thead><tr><th>Type</th><th>Files</th><th>Size</th><th>Sent</th></tr></thead><tbody>
    ${rows.map(([t, g]) => `<tr><td><i class="dot" style="background:${COL[t]}"></i>${t}</td><td>${g.n}</td><td>${kb(g.de)}</td><td>${g.tr ? kb(g.tr) : 'cache'}</td></tr>`).join('')}
    <tr class="tot"><td>Total</td><td>${rows.reduce((s, [, g]) => s + g.n, 0)}</td><td>${kb(tot)}</td><td>${totTr ? kb(totTr) : 'cache'}</td></tr></tbody></table>
    <p class="mx-p"><b>Loaded later, only when needed:</b> ${lazy.length ? lazy.map((x) => `${x.name.replace(/-[\w-]{8}\.js$/, '.js')} (${kb(x.decoded)})`).join(', ') : 'nothing yet. Scroll to the 3D building or walk-in and watch these appear.'}</p>
    <div class="mx-kv">
      <div><span>Browser storage used by this site</span><b>${est?.usage != null ? kb(est.usage) : 'n/a'}</b></div>
      <div><span>Storage this browser allows</span><b>${est?.quota != null ? kb(est.quota) : 'n/a'}</b></div>
      <div><span>Shortlist saved on device</span><b>${ls} bytes</b></div>
    </div>`;
}

/* ---------- memory + GPU ---------- */
function gpu() {
  const m = performance.memory;
  const r = (name, o, note) => {
    const i = o?.info;
    return `<tr><td>${name}</td>${i ? `<td>${i.memory.geometries}</td><td>${i.memory.textures}</td><td>${i.programs?.length ?? '–'}</td><td>${i.render.calls}</td>` : `<td colspan="4" class="muted">${note}</td>`}</tr>`;
  };
  $('#mx-gpu', el).innerHTML = `
    <div class="mx-kv">
      <div><span>JS memory in use</span><b>${m ? kb(m.usedJSHeapSize) : 'n/a in this browser'}</b></div>
      <div><span>JS memory reserved</span><b>${m ? kb(m.totalJSHeapSize) : 'n/a'}</b></div>
      <div><span>Page elements</span><b>${document.getElementsByTagName('*').length}</b></div>
    </div>
    <table class="mx-t"><thead><tr><th>3D scene</th><th>Meshes</th><th>Textures</th><th>Shaders</th><th>Draw calls</th></tr></thead><tbody>
      ${r('Hero wordmark', ctx.hero(), 'not created')}
    </tbody></table>
    <p class="mx-foot">Draw calls are for the last frame each scene drew. A scene off screen draws nothing.</p>`;
}

function refreshAll() { power(); draw(); vitalsCard(); gpu(); }

/* ---------- export ---------- */
async function exportJSON() {
  const n = count(), samples = [];
  for (let k = 0; k < n; k++) { const i = idx(k); samples.push({ t: Math.round(rec.time[i]), gpuMpxPerSec: +rec.gpu[i].toFixed(2), alwaysOnMpxPerSec: +rec.alwaysOn[i].toFixed(1), framesDrawn3D: rec.drawn[i], fps: Number.isNaN(rec.fps[i]) ? null : rec.fps[i], heapMB: +rec.heap[i].toFixed(2), blockedMs: Math.round(rec.busy[i]), elements: rec.dom[i], heroMs: +rec.heroMs[i].toFixed(2), roomDraws: rec.roomDraws[i], section: SECTION_NAME[rec.section[i]] }); }
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), userAgent: navigator.userAgent, vitals, events: rec.events, samples }, null, 2);
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = `uhomes-metrics-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch {}
  try { await navigator.clipboard.writeText(data); } catch {}
  mark('Exported');
}

// Session recorder. Starts at boot, costs almost nothing, and keeps one sample per second for 15 minutes
// in fixed typed arrays (a ring buffer): no objects are created while it records (Pim's data-oriented point).
// The metrics panel (metrics.js) is loaded only when someone opens it, and reads from here.

export const CAP = 900; // 15 minutes at 1 Hz
export const SECTIONS = ['top', 'where', 'brief', 'support', 'lobby', 'statement', 'building-sec', 'rooms', 'walk', 'ledger-sec', 'footer'];
export const SECTION_NAME = ['Hero', 'Cities', 'Brief', 'Front desk', 'Lobby', 'Statement', '3D building', 'Room cards', 'Walk-in', 'Receipt', 'Footer'];

export const rec = {
  t0: 0, n: 0, // samples written so far (index = n % CAP)
  time: new Float64Array(CAP), // ms since page start
  fps: new Float32Array(CAP), // NaN when not measured (only measured while the metrics panel is open)
  gpu: new Float32Array(CAP), // million pixels drawn per second, all 3D scenes: the best proxy for GPU heat
  alwaysOn: new Float32Array(CAP), // what the visible scenes would draw at 60 fps, full resolution
  drawn: new Float32Array(CAP), // 3D frames drawn that second
  heap: new Float32Array(CAP), // MB, 0 when the browser doesn't expose it
  busy: new Float32Array(CAP), // ms of long tasks in that second
  dom: new Uint16Array(CAP),
  heroMs: new Float32Array(CAP),
  roomDraws: new Float32Array(CAP),
  section: new Uint8Array(CAP),
  events: [], // { n, label } markers, written rarely
};
export const vitals = { ttfb: null, domReady: null, load: null, fcp: null, lcp: null, cls: 0, inp: null, longTotal: 0 };
export const flags = { slowDevice: false };

let frames = 0, busyNow = 0, ctx = null;
const sampleCtx = { hero: null, viewer: null };

export function mark(label) { rec.events.push({ n: rec.n, label }); if (rec.events.length > 200) rec.events.shift(); }
export const count = () => Math.min(rec.n, CAP);
export const idx = (k) => (rec.n - count() + k) % CAP; // k-th oldest sample still in the buffer

function sectionNow() {
  const y = innerHeight * 0.45;
  let best = 0, bestTop = -Infinity; // the section whose top is closest above the reading line
  for (let i = 0; i < SECTIONS.length; i++) {
    const el = SECTIONS[i] === 'footer' ? document.querySelector('footer') : document.getElementById(SECTIONS[i]);
    const t = el ? el.getBoundingClientRect().top : Infinity;
    if (t <= y && t > bestTop) { best = i; bestTop = t; }
  }
  return best;
}

export function startTelemetry(getCtx) {
  ctx = getCtx;
  startedFps = false;
  rec.t0 = performance.now();
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) { vitals.ttfb = nav.responseStart; vitals.domReady = nav.domContentLoadedEventEnd || null; }
  addEventListener('load', () => { const n = performance.getEntriesByType('navigation')[0]; vitals.load = n?.loadEventEnd || performance.now(); vitals.domReady = n?.domContentLoadedEventEnd || vitals.domReady; mark('Page loaded'); });
  const po = (type, fn, opts = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...opts }); } catch {} };
  po('paint', (e) => { if (e.name === 'first-contentful-paint') vitals.fcp = e.startTime; });
  po('largest-contentful-paint', (e) => (vitals.lcp = e.startTime));
  po('layout-shift', (e) => { if (!e.hadRecentInput) vitals.cls += e.value; });
  po('longtask', (e) => { busyNow += e.duration; vitals.longTotal += e.duration; });
  po('event', (e) => { if (e.interactionId) vitals.inp = Math.max(vitals.inp || 0, e.duration); }, { durationThreshold: 16 });

  let lastRoom = 0, lastF = 0, lastPx = 0;
  setInterval(() => {
    const i = rec.n % CAP, c = ctx?.() || sampleCtx;
    rec.time[i] = performance.now() - rec.t0;
    rec.fps[i] = measuring ? frames : NaN; frames = 0;
    // GPU work: frames and pixels the 3D scenes really drew this second, against an always-on baseline
    let f = 0, px = 0, base = 0;
    for (const sc of [c.hero?.stats, c.building?.stats, c.viewer?.stats]) {
      if (!sc) continue; f += sc.frames; px += sc.px;
      if (sc.visible) base += 60 * sc.fullPx;
    }
    rec.drawn[i] = Math.max(0, f - lastF); rec.gpu[i] = Math.max(0, px - lastPx) / 1e6; rec.alwaysOn[i] = base / 1e6;
    lastF = f; lastPx = px;
    rec.heap[i] = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
    rec.busy[i] = Math.min(1000, busyNow); busyNow = 0;
    rec.dom[i] = document.getElementsByTagName('*').length;
    rec.heroMs[i] = c.hero?.stats?.ms || 0;
    const rf = c.viewer?.frames || 0; rec.roomDraws[i] = Math.max(0, rf - lastRoom); lastRoom = rf;
    rec.section[i] = sectionNow();
    rec.n++;
    for (const f of listeners) f();
  }, 1000);
}
const listeners = new Set();
// Frame rate needs a requestAnimationFrame loop, which itself keeps the browser busy,
// so it only runs while someone is looking at the numbers.
let measuring = false, startedFps = false;
export function setMeasuring(on) {
  measuring = on; frames = 0;
  if (on && !startedFps) {
    startedFps = true;
    (function tick() {
      if (!measuring) { startedFps = false; return; }
      frames++;
      if (flags.slowDevice) { const t = performance.now(); while (performance.now() - t < 22) {} } // 'slow phone' experiment
      requestAnimationFrame(tick);
    })();
  }
}
export const onSample = (f) => { listeners.add(f); return () => listeners.delete(f); };

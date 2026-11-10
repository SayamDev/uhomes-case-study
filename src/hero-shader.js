// Hero: a giant "uhomes" wordmark that masks a living halftone noise gradient.
// - Noise gradient + halftone grain: Simmy Li (Figma) "noise gradient" journey
// - Wordmark as a screen-space mask that clips the texture beneath: Luke Bailey (Granola)
// - Colour stops defined in OKLCH, converted here: Vlad (Paper)
import * as THREE from 'three';
import { oklchToLinear } from './color.js';

const toSRGB = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const okToVec = ({ L, C, h }) => new THREE.Vector3(...oklchToLinear(L, C, h).map(toSRGB));

const frag = /* glsl */ `
precision highp float;
uniform float uTime, uReveal, uDot, uGrain, uScale, uOutside, uFlash, uDpr, uMouseOn;
uniform vec2 uRes, uMouse, uCell, uOrigin, uHover;
uniform vec3 uC0, uC1, uC2, uC3;
uniform sampler2D uMask, uLights;
uniform vec2 uGrid;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }
vec3 ramp(float t){
  t = clamp(t, 0.0, 1.0);
  if (t < 0.34) return mix(uC0, uC1, t/0.34);
  if (t < 0.68) return mix(uC1, uC2, (t-0.34)/0.34);
  return mix(uC2, uC3, (t-0.68)/0.32);
}
void main(){
  vec2 frag = vUv * uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(vUv.x*asp, vUv.y) * uScale;
  vec2 mv = vec2(vUv.x*asp, vUv.y) - vec2(uMouse.x*asp, uMouse.y);
  float md2 = dot(mv, mv);
  float pull = exp(-md2*10.0) * uMouseOn;

  vec2 q = vec2(fbm(p + uTime*0.55), fbm(p + vec2(5.2, 1.3) - uTime*0.45));
  vec2 r2 = vec2(fbm(p + 2.0*q + vec2(1.7, 9.2) + uTime*0.2), fbm(p + 2.0*q + vec2(8.3, 2.8)));
  float n = fbm(p + 1.6*r2 - mv*pull*1.4);
  vec3 col = ramp(n*1.25 - 0.08 + pull*0.18);

  // Halftone grain in screen space
  float cell = uDot * uDpr;
  vec2 g = mod(frag, cell) - cell*0.5;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float rad = cell*0.56*sqrt(clamp(lum*1.3, 0.0, 1.0));
  float dotm = smoothstep(rad + 0.9, rad - 0.9, length(g));
  vec3 ht = mix(col*0.62, col*1.1, dotm);
  col = mix(col, ht, uGrain);

  // Wordmark mask, revealed bottom-up with a noisy edge
  float mask = texture2D(uMask, vUv).r;
  float edge = uReveal*1.25 - 0.1 + (noise(vUv*vec2(9.0, 4.0) + uTime*2.0) - 0.5)*0.14;
  float rv = smoothstep(vUv.y - 0.05, vUv.y + 0.05, edge);

  vec3 bg = vec3(33.0, 39.0, 49.0) / 255.0;
  float flash = exp(-md2*6.0) * uFlash * uMouseOn;
  float outside = (uOutside + flash) * rv;
  vec3 o = mix(bg, col, outside * dotm);
  // --- The letters are a building: brick, floor bands and windows of student rooms ---
  vec2 g2 = vec2(frag.x - uOrigin.x, uOrigin.y - frag.y);
  vec2 id = floor(g2 / uCell);
  vec2 f = fract(g2 / uCell);
  vec2 cUv = (uOrigin + vec2((id.x + 0.5) * uCell.x, -(id.y + 0.5) * uCell.y)) / uRes;
  vec2 aUv = (uOrigin + vec2((id.x + 0.18) * uCell.x, -(id.y + 0.2) * uCell.y)) / uRes;
  vec2 bUv = (uOrigin + vec2((id.x + 0.82) * uCell.x, -(id.y + 0.78) * uCell.y)) / uRes;
  float inside = step(0.5, texture2D(uMask, cUv).r) * step(0.5, texture2D(uMask, aUv).r) * step(0.5, texture2D(uMask, bUv).r);
  float aa = 1.5 / uCell.x;
  float wx = smoothstep(0.24 - aa, 0.24, f.x) * (1.0 - smoothstep(0.76, 0.76 + aa, f.x));
  float wy = smoothstep(0.2 - aa, 0.2, f.y) * (1.0 - smoothstep(0.74, 0.74 + aa, f.y));
  float win = wx * wy * inside;
  float frame = inside * (smoothstep(0.19, 0.2, f.x) * (1.0 - smoothstep(0.8, 0.81, f.x)) * smoothstep(0.15, 0.16, f.y) * (1.0 - smoothstep(0.78, 0.79, f.y))) - win;
  float sill = inside * step(0.78, f.y) * step(f.y, 0.83) * step(0.17, f.x) * step(f.x, 0.83);

  // Lights: rooms switch on after the reveal and change slowly, like halls at night
  float rnd = hash(id + 3.1);
  float phase = floor(uTime * 0.6 + rnd * 9.0);
  // lights come from the page: a room is lit when it fits the budget on the slider
  vec2 lUv = (id + 0.5) / uGrid;
  float on = texture2D(uLights, lUv).r;
  on *= step(rnd, (uReveal - 0.45) * 2.2);
  vec2 cPx = uOrigin + vec2((id.x + 0.5) * uCell.x, -(id.y + 0.5) * uCell.y);
  // the hovered room is picked out; its neighbours wake up softly
  float picked = 0.0;
  vec3 lit = mix(vec3(1.0, 0.78, 0.47), vec3(1.0, 0.88, 0.66), hash(id + 9.0));
  float lightAmt = on;
  // a little room inside: lamp glow top-left, curtain on one side
  float lamp = exp(-dot(f - vec2(0.36, 0.34), f - vec2(0.36, 0.34)) * 40.0);
  // curtains drift open and closed
  float cov = 0.18 + 0.16 * sin(uTime * 2.2 + rnd * 6.28);
  float curtain = step(hash(id + 5.0), 0.55) * (step(1.0 - cov, f.x) + step(f.x, 0.24 + cov * 0.4));
  // someone walking past inside the room
  float occ = step(0.7, hash(id + 11.0)) * on;
  float walk = fract(uTime * (0.9 + rnd) + rnd * 3.0);
  float pxp = mix(0.3, 0.7, abs(walk * 2.0 - 1.0));
  float head = 1.0 - smoothstep(0.05, 0.065, length((f - vec2(pxp, 0.46)) * vec2(1.0, 0.8)));
  float body = (1.0 - smoothstep(0.085, 0.1, abs(f.x - pxp))) * smoothstep(0.52, 0.54, f.y);
  float person = clamp(head + body, 0.0, 1.0) * occ * (1.0 - picked);
  vec3 glassOff = vec3(0.13, 0.08, 0.1) + vec3(0.12, 0.14, 0.2) * (1.0 - f.y) * 0.6;
  vec3 room = lit * (0.7 + lamp * 0.6) * (1.0 - curtain * 0.32) * (1.0 - person * 0.55);
  vec3 winCol = mix(glassOff, room, lightAmt);

  // brick: the living gradient, darkened, with mortar courses
  float course = fract(g2.y / (uCell.y / 6.0));
  float mortar = smoothstep(0.82, 0.9, course) * 0.22;
  vec3 brick = col * (0.9 - mortar);
  float band = step(0.93, f.y) * inside;
  brick = mix(brick, vec3(0.95, 0.86, 0.8) * 0.85, band * 0.8);
  vec3 bld = brick;
  bld = mix(bld, vec3(0.12, 0.1, 0.12), clamp(frame, 0.0, 1.0));
  bld = mix(bld, vec3(0.93, 0.85, 0.78), sill * 0.9);
  bld = mix(bld, winCol, win);
  // window glow spilling onto the brick
  float glow = exp(-length((f - vec2(0.5, 0.47)) * vec2(1.6, 1.2)) * 3.2) * lightAmt * inside * (1.0 - win);
  bld += lit * glow * 0.28;

  vec3 fin = mix(o, bld, mask * rv);
  fin += (hash(frag + fract(uTime*7.0)*91.0) - 0.5) * 0.04; // film grain
  gl_FragColor = vec4(fin, 1.0);
}`;

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createHero(canvas, preset, { reducedMotion = false, getWordmarkBox } = {}) {
  // low-power: on dual-GPU laptops this keeps the work on the integrated GPU, which runs much cooler
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  // 1.25x is plenty under film grain: on a Retina screen that's 2.6x fewer pixels than full 2x.
  // Phones: the canvas is small, so draw it sharp (up to 2x); big screens stay at 1.25x under the grain.
  const small = () => (canvas.clientWidth || innerWidth) < 760;
  const capDpr = (battery) => Math.min(window.devicePixelRatio, small() ? (battery ? 1.5 : 2) : (battery ? 1 : 1.25));
  let maxDpr = capDpr(false);
  let dpr = maxDpr, pacing = true, onBattery = false;
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // shader already writes display values

  const maskCanvas = document.createElement('canvas');
  const maskTex = new THREE.CanvasTexture(maskCanvas);
  maskTex.minFilter = THREE.LinearFilter;

  const uniforms = {
    uTime: { value: 0 }, uReveal: { value: 0 }, uDpr: { value: dpr }, uMouseOn: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMask: { value: maskTex }, uCell: { value: new THREE.Vector2(30, 36) }, uLights: { value: null }, uGrid: { value: new THREE.Vector2(1, 1) }, uOrigin: { value: new THREE.Vector2(0, 0) },
    uDot: { value: preset.dot }, uGrain: { value: preset.grain }, uScale: { value: preset.scale },
    uOutside: { value: preset.outside }, uFlash: { value: preset.flashlight },
    uC0: { value: okToVec(preset.colors[0]) }, uC1: { value: okToVec(preset.colors[1]) },
    uC2: { value: okToVec(preset.colors[2]) }, uC3: { value: okToVec(preset.colors[3]) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, depthTest: false });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const cam = new THREE.Camera();

  let maskPx = null, grid = null, lightData, lightTex, cur, tgt, due, lastPred = null;
  function drawMask(w, h) {
    const nw = Math.round(w * dpr), nh = Math.round(h * dpr);
    // WebGL2 textures have fixed storage: if the size changes, the old texture must be released,
    // or the new mask is copied into the old-sized slot (this drew the wordmark twice on phones).
    if (nw !== maskCanvas.width || nh !== maskCanvas.height) maskTex.dispose();
    maskCanvas.width = nw; maskCanvas.height = nh;
    const g = maskCanvas.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    g.fillStyle = '#fff';
    const box = getWordmarkBox(); // {x, y, width, height} in CSS px, relative to the canvas
    const word = 'uhomes';
    g.textBaseline = 'alphabetic';
    let size = 100;
    g.font = `700 ${size}px Poppins`;
    const m = g.measureText(word);
    size = (box.width * dpr) / m.width * 100;
    g.font = `700 ${size}px Poppins`;
    const m2 = g.measureText(word);
    const asc = m2.actualBoundingBoxAscent, desc = m2.actualBoundingBoxDescent;
    const x = box.x * dpr - m2.actualBoundingBoxLeft;
    const y = box.y * dpr + (box.height * dpr - (asc + desc)) / 2 + asc;
    g.letterSpacing = '0px';
    g.fillText(word, x, y);
    maskTex.needsUpdate = true;
    // Floors: the tall 'h' gets about 9 storeys; GL y runs bottom-up.
    const cellH = Math.max(9 * dpr, asc / (small() ? 5 : (preset.floors || 9))); // phones: fewer, bigger windows read clearly
    uniforms.uCell.value.set(cellH * 0.82, cellH);
    uniforms.uOrigin.value.set(x + m2.actualBoundingBoxLeft, maskCanvas.height - (y - asc));
    maskPx = g.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    // one texel per window cell; JS animates the values
    const cols = Math.ceil((m2.width + m2.actualBoundingBoxLeft + cellH) / (cellH * 0.82)) + 1;
    const rows = Math.ceil((asc + desc) / cellH) + 1;
    grid = { cols, rows, cells: [], idx: null };
    for (let iy = 0; iy < rows; iy++) for (let ix = 0; ix < cols; ix++) {
      const cx = Math.round(uniforms.uOrigin.value.x + (ix + 0.5) * cellH * 0.82), cy = Math.round((y - asc) + (iy + 0.5) * cellH);
      if (cx >= 0 && cy >= 0 && cx < maskCanvas.width && cy < maskCanvas.height && maskPx[(cy * maskCanvas.width + cx) * 4] > 128) grid.cells.push({ ix, iy, i: iy * cols + ix });
    }
    grid.idx = Int32Array.from(grid.cells, (c) => c.i);
    lightData = new Uint8Array(cols * rows); cur = new Float32Array(cols * rows); tgt = new Float32Array(cols * rows); due = new Float64Array(cols * rows);
    lightTex?.dispose();
    lightTex = new THREE.DataTexture(lightData, cols, rows, THREE.RedFormat, THREE.UnsignedByteType);
    lightTex.flipY = false; lightTex.needsUpdate = true;
    uniforms.uLights.value = lightTex; uniforms.uGrid.value.set(cols, rows);
    if (lastPred) api.light(lastPred, false);
  }

  let w = 0, h = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    w = r.width; h = r.height;
    renderer.setPixelRatio(dpr); uniforms.uDpr.value = dpr;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * dpr, h * dpr);
    drawMask(w, h);
    wake();
  }

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.65, on: 0, ton: 0 };
  const host = canvas.parentElement;
  let lastPointer = 0;
  host.addEventListener('pointermove', (e) => {
    lastPointer = performance.now();
    const r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = 1 - (e.clientY - r.top) / r.height;
    mouse.ton = 1;
  });
  host.addEventListener('pointerleave', () => (mouse.ton = 0));

  let visible = true, last = performance.now(), t = 0, raf = 0;
  const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
  // The loop sleeps when there is nothing to draw, and these wake it.
  let lastActive = performance.now();
  function wake() { lastActive = performance.now(); if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  host.addEventListener('pointermove', wake, { passive: true });
  // On battery: fewer pixels and a slower idle rate.
  navigator.getBattery?.().then((b) => {
    const apply = () => { onBattery = !b.charging; maxDpr = capDpr(onBattery); if (pacing && dpr > maxDpr) { dpr = maxDpr; resize(); } };
    apply(); b.addEventListener('chargingchange', apply);
  }).catch(() => {});

  // Three speeds: full rate while you interact or lights switch; a slow ambient rate for a few seconds
  // after; then the image holds still and the loop stops. A still hero costs no GPU at all.
  let lastScale = performance.now(), lastDraw = 0, cost = 8, delta = 16.7, gapPrev = 0, lightsMoving = false;
  const stats = { mode: 'full', ms: 0, frames: 0, px: 0, scale: dpr, get visible() { return visible && !document.hidden; }, get fullPx() { return canvas.clientWidth * canvas.clientHeight * Math.min(devicePixelRatio, 2) ** 2; } };
  const AMBIENT_MS = 8000;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return; // asleep until something wakes it
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const busy = now - lastPointer < 1200 || lightsMoving || (mouse.on > 0.02 && Math.abs(mouse.on - mouse.ton) > 0.01);
    if (busy) lastActive = now;
    const idleFor = now - lastActive;
    if (pacing && !busy && idleFor > AMBIENT_MS) { stats.mode = `still (not drawing), ${Math.round(dpr * 100)}% resolution`; return; }
    raf = requestAnimationFrame(frame);
    if (!gapPrev) delta = delta * 0.9 + (dt * 1000) * 0.1; // real frame interval while running at full rate
    const struggling = cost > 14 || delta > 24;
    const ambientFps = onBattery ? 10 : 15;
    const gap = !pacing ? 0 : busy ? (struggling ? 1000 / 30 - 4 : 0) : 1000 / ambientFps - 4;
    gapPrev = gap;
    stats.mode = !pacing ? `pacing off, every frame, ${Math.round(dpr * 100)}% resolution`
      : (busy ? (struggling ? 'busy, 30 fps (slow device)' : 'busy, full rate') : `ambient, ${ambientFps} fps`) + `, ${Math.round(dpr * 100)}% resolution${onBattery ? ', on battery' : ''}`;
    if (now - lastDraw < gap) return;
    const dtDraw = Math.min(0.1, (now - (lastDraw || now - 16)) / 1000); lastDraw = now;
    if (!reducedMotion) t += dtDraw * preset.speed * 10;
    mouse.x = damp(mouse.x, mouse.tx, 6, dtDraw); mouse.y = damp(mouse.y, mouse.ty, 6, dtDraw);
    mouse.on = damp(mouse.on, mouse.ton, 3, dtDraw);
    uniforms.uTime.value = t * 0.1;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uMouseOn.value = mouse.on;
    if (grid) {
      const tnow = performance.now(); let dirty = false, pending = false;
      const cells = grid.idx; // flat Int32Array of cell indices (no per-frame objects)
      for (let j = 0; j < cells.length; j++) {
        const i = cells[j]; if (tnow < due[i]) { if (tgt[i] !== cur[i]) pending = true; continue; }
        const d = tgt[i] - cur[i];
        if (Math.abs(d) > 0.004) {
          cur[i] += d * (1 - Math.exp(-14 * dtDraw));
          const v = d > 0 && cur[i] < 0.8 && ((tnow / 45) | 0) % 2 ? cur[i] * 0.35 : cur[i]; // a switch flickers on its way up
          lightData[i] = Math.round(v * 255); dirty = true;
        } else if (lightData[i] !== Math.round(tgt[i] * 255)) { cur[i] = tgt[i]; lightData[i] = Math.round(tgt[i] * 255); dirty = true; }
      }
      if (dirty) lightTex.needsUpdate = true;
      lightsMoving = dirty || pending;
    }
    const c0 = performance.now();
    renderer.render(scene, cam);
    cost = cost * 0.92 + (performance.now() - c0) * 0.08; stats.ms = cost;
    stats.frames++; stats.px += canvas.width * canvas.height;
    // Dynamic resolution: if this device keeps struggling, draw fewer pixels (the grain hides it).
    if (pacing && struggling && dpr > (small() ? 1 : 0.5) && now - lastScale > 2500) { dpr = Math.max(small() ? 1 : 0.5, +(dpr * 0.7).toFixed(2)); lastScale = now; cost = 8; delta = 16.7; resize(); }
    stats.scale = dpr;
  }

  new ResizeObserver(resize).observe(canvas);
  const api = {
    stats,
    get info() { return renderer.info; },
    get pacing() { return pacing; },
    // Metrics switch: off = full rate and full resolution always (the 'before' state)
    setPacing(on) { pacing = on; const want = on ? maxDpr : Math.min(devicePixelRatio, 2); if (dpr !== want) { dpr = want; resize(); } cost = 8; delta = 16.7; wake(); },
    start() { resize(); wake(); },
    setReveal(v) { uniforms.uReveal.value = v; wake(); },
    setPreset(p) {
      Object.assign(preset, p); wake();
      ['dot', 'grain', 'scale'].forEach((k) => (uniforms['u' + k[0].toUpperCase() + k.slice(1)].value = preset[k]));
      uniforms.uOutside.value = preset.outside; uniforms.uFlash.value = preset.flashlight;
      preset.colors.forEach((c, i) => (uniforms['uC' + i].value = okToVec(c)));
    },
    redraw: resize,
    // pred(ix, iy) -> 0..1. Switches sweep left to right like a corridor of lights.
    light(pred, sweep = true) {
      lastPred = pred; wake();
      if (!grid) return 0;
      const now = performance.now();
      let n = 0;
      for (const c of grid.cells) {
        const t = pred(c.ix, c.iy) ? 1 : 0;
        if (t !== tgt[c.i]) due[c.i] = now + (sweep && !reducedMotion ? c.ix * 18 + Math.random() * 120 : 0);
        tgt[c.i] = t; n += t;
        if (!sweep || reducedMotion) { cur[c.i] = t; lightData[c.i] = t * 255; }
      }
      if (lightTex) lightTex.needsUpdate = true;
      return n;
    },
  };
  return api;
}

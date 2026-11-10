// Illustrative brick block modelled in code (three.js). Each window = one sample room.
import * as THREE from 'three';
import { SKY, sampleStops, oklchToLinear } from './color.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const FLOOR_H = 1.0;
const FLOORS = 8; // 0 = ground floor (lobby), 1..7 rooms
const FRONT = 6;
const SIDE = 4;
const W = FRONT * 1.0 + 0.5;
const D = SIDE * 1.0 + 0.5;
const H = FLOORS * FLOOR_H + 0.25;
const LOOP_SECONDS = 14; // deterministic, perfectly looping sway (Luke Bailey's loop-phase idea)

const LOOK = {
  idle: { c: '#ffe2b8', i: 0.55 },
  fit: { c: '#7dffb0', i: 1.25 },
  nearly: { c: '#d6f5df', i: 0.8 },
  check: { c: '#ffc46b', i: 1.15 },
  no: { c: '#9aa4b8', i: 0.08 },
  hot: { c: '#ffffff', i: 2.4 },
};

function brickTexture(repeatX, repeatY) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#c9b6a3'; // mortar
  g.fillRect(0, 0, 512, 256);
  const bw = 64, bh = 21, m = 3;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row * bh < 256; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 512 + bw; x += bw) {
      const l = 30 + rnd() * 10, h = 14 + rnd() * 8, s = 48 + rnd() * 14;
      g.fillStyle = `hsl(${h} ${s}% ${l}%)`;
      g.fillRect(x + off + m / 2, row * bh + m / 2, bw - m, bh - m);
      g.fillStyle = `rgba(255,240,220,${rnd() * 0.08})`;
      g.fillRect(x + off + m / 2, row * bh + m / 2, bw - m, 3);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  // Height map: bricks raised, mortar recessed, a little surface noise
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 256;
  const b = bc.getContext('2d');
  b.fillStyle = '#000'; b.fillRect(0, 0, 512, 256);
  for (let row = 0; row * bh < 256; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 512 + bw; x += bw) {
      b.fillStyle = `rgb(${200 + rnd() * 55 | 0},0,0)`.replace(/rgb\((\d+),0,0\)/, (m, v) => `rgb(${v},${v},${v})`);
      b.fillRect(x + off + m / 2 + 1, row * bh + m / 2 + 1, bw - m - 2, bh - m - 2);
    }
  }
  const img = b.getImageData(0, 0, 512, 256);
  for (let i = 0; i < img.data.length; i += 4) { const n = (rnd() - 0.5) * 40; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  b.putImageData(img, 0, 0);
  const bt = new THREE.CanvasTexture(bc);
  bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(repeatX, repeatY);
  t.userData.bump = bt;
  return t;
}

// Little rooms behind each window: wall, floor, bed, desk lamp, poster, curtains.
const INTERIORS = [];
function interiorTexture(k) {
  if (INTERIORS[k]) return INTERIORS[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const walls = [['#efe3d2', '#cdb9a2'], ['#dfe6e0', '#b9c6bb'], ['#e3e6ef', '#bcc2d2'], ['#f2dccf', '#d1b19e'], ['#ece7dc', '#c8bfae'], ['#e6dde8', '#c3b6c6']];
  const duvets = ['#2f4b7c', '#c9893a', '#b5523b', '#6e8f6a', '#4a3f5c', '#d9cfc1'];
  const [w1, w2] = walls[k % walls.length];
  const wall = g.createLinearGradient(0, 0, 0, 128); wall.addColorStop(0, w2); wall.addColorStop(0.35, w1); wall.addColorStop(1, w2);
  g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#8a6a4e'; g.fillRect(0, 104, 128, 24); // floor
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 104, 128, 3);
  const bedLeft = k % 2 === 0;
  const bx = bedLeft ? 6 : 58;
  g.fillStyle = '#5b4636'; g.fillRect(bx, 84, 64, 22);        // bed frame
  g.fillStyle = duvets[k % duvets.length]; g.fillRect(bx, 78, 64, 18); // duvet
  g.fillStyle = '#f4f1ea'; g.fillRect(bedLeft ? bx + 2 : bx + 44, 72, 18, 9); // pillow
  const dx = bedLeft ? 86 : 10;
  g.fillStyle = '#6d5644'; g.fillRect(dx, 80, 34, 5); g.fillRect(dx + 2, 85, 3, 20); g.fillRect(dx + 29, 85, 3, 20); // desk
  const lamp = g.createRadialGradient(dx + 24, 66, 1, dx + 24, 66, 26);
  lamp.addColorStop(0, 'rgba(255,236,190,.95)'); lamp.addColorStop(1, 'rgba(255,236,190,0)');
  g.fillStyle = lamp; g.fillRect(dx - 6, 40, 60, 50);
  g.fillStyle = '#333'; g.fillRect(dx + 23, 68, 2, 12); g.fillStyle = '#f7e7c6'; g.fillRect(dx + 18, 62, 12, 7);
  const px = 30 + (k * 17) % 50;
  g.fillStyle = ['#e05d4f', '#3c6e91', '#e8b23d', '#2d2d2d'][k % 4]; g.fillRect(px, 30, 20, 26); // poster
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(px + 3, 33, 14, 3);
  if (k % 3 !== 1) { // curtains
    const cc = ['#d8c8b0', '#9fb3c8', '#c9a3a0', '#a7b59a'][k % 4];
    [0, 1].forEach((side) => {
      const w = k % 3 === 0 ? 22 : 34; const x0 = side ? 128 - w : 0;
      const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
      for (let i = 0; i <= 4; i++) gr.addColorStop(i / 4, i % 2 ? cc : 'rgba(0,0,0,0)');
      g.fillStyle = cc; g.globalAlpha = 0.92; g.fillRect(x0, 0, w, 128); g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 3; i < w; i += 7) g.fillRect(x0 + i, 0, 2, 128);
    });
  }
  const ceil = g.createLinearGradient(0, 0, 0, 40); ceil.addColorStop(0, 'rgba(0,0,0,.35)'); ceil.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = ceil; g.fillRect(0, 0, 128, 40);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  INTERIORS[k] = t; return t;
}

export function createBuilding(canvas, { reducedMotion = false, scrub = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // MSAA is on, so 1.5x looks as sharp as 2x
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(12, 6.6, 21.5);
  camera.lookAt(0, 4.3, 0);

  const hemi = new THREE.HemisphereLight('#dfeaff', '#8a6a55', 1.1);
  scene.add(hemi);
  // Image-based lighting so glass reflects and materials read as real (Luke Bailey's material-debug lesson)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  const sun = new THREE.DirectionalLight('#ffe2c2', 2.4);
  sun.position.set(-7, 12, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  if (scrub) { scene.background = new THREE.Color(); scene.fog = new THREE.Fog(scene.background.clone(), 26, 70); }
  const day = { t: 0.55, tt: 0.55, night: 0, orbit: 0, torbit: 0, season: 0.75 };
  const lampMat = new THREE.MeshStandardMaterial({ color: '#2a2f38', emissive: new THREE.Color('#ffc477'), emissiveIntensity: 0 });
  const lamps = [];

  const rig = new THREE.Group();
  rig.rotation.y = -0.55;
  scene.add(rig);

  // Ground receives shadows only, so the page/sky shows through.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const pave = new THREE.Mesh(new THREE.CircleGeometry(7.4, 64), new THREE.MeshStandardMaterial({ color: '#dfe4ea', roughness: 0.95 }));
  pave.rotation.x = -Math.PI / 2; pave.position.y = 0.001; pave.receiveShadow = true;
  rig.add(pave);

  // Body
  const fT = brickTexture(W / 1.4, H / 0.9), sT = brickTexture(D / 1.4, H / 0.9);
  const frontMat = new THREE.MeshStandardMaterial({ map: fT, bumpMap: fT.userData.bump, bumpScale: 1.6, roughness: 0.92, envMapIntensity: 0.4 });
  const sideMat = new THREE.MeshStandardMaterial({ map: sT, bumpMap: sT.userData.bump, bumpScale: 1.6, roughness: 0.92, envMapIntensity: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [sideMat, sideMat, frontMat, frontMat, frontMat, frontMat]);
  body.position.y = H / 2;
  body.castShadow = body.receiveShadow = true;
  rig.add(body);

  const stone = new THREE.MeshStandardMaterial({ color: '#ece3d6', roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.6, metalness: 0.2 });
  for (let f = 1; f <= FLOORS; f++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.07, D + 0.08), stone);
    band.position.y = f * FLOOR_H + (f === FLOORS ? 0.2 : 0);
    band.castShadow = true;
    rig.add(band);
  }
  // Parapet + rooftop plant
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.14, 0.32, D + 0.14), stone);
  parapet.position.y = H + 0.12; parapet.castShadow = true; rig.add(parapet);
  const plant = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.6), new THREE.MeshStandardMaterial({ color: '#b9c1cc', roughness: 0.7 }));
  plant.position.set(-1, H + 0.55, -0.4); plant.castShadow = true; rig.add(plant);

  // Ground-floor glazing (lobby)
  const lobby = new THREE.MeshStandardMaterial({ color: '#1b1f26', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.9, roughness: 0.15 });
  const shop = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.9, 0.72), lobby);
  shop.position.set(0, 0.42, D / 2 + 0.012); rig.add(shop);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.6), dark);
  door.position.set(1.2, 0.86, D / 2 + 0.3); door.castShadow = true; rig.add(door);

  // Windows
  const windows = new Map(); // room id -> { glass, mat, cur, target, start }
  const glassGeo = new THREE.PlaneGeometry(0.56, 0.6);
  const frameGeo = new THREE.BoxGeometry(0.68, 0.72, 0.07);
  const sillGeo = new THREE.BoxGeometry(0.76, 0.05, 0.14);
  const pickables = [];

  const revealMat = new THREE.MeshStandardMaterial({ color: '#d9cdbd', roughness: 0.85 });
  const jambV = new THREE.BoxGeometry(0.07, 0.72, 0.16);
  const jambH = new THREE.BoxGeometry(0.66, 0.07, 0.16);
  const mullV = new THREE.BoxGeometry(0.024, 0.6, 0.02);
  const mullH = new THREE.BoxGeometry(0.56, 0.024, 0.02);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.2, depthWrite: false });
  let winCount = 0;
  function addWindow(room) {
    const g = new THREE.Group();
    const y = room.floor * FLOOR_H + 0.5;
    if (room.face === 'front') g.position.set((room.col - (FRONT - 1) / 2) * 1.0, y, D / 2);
    else { g.position.set(W / 2, y, ((SIDE - 1) / 2 - room.col) * 1.0); g.rotation.y = Math.PI / 2; }
    // deep reveal so the window sits back into the wall
    [[-0.315, 0], [0.315, 0]].forEach(([x]) => { const j = new THREE.Mesh(jambV, revealMat); j.position.set(x, 0, 0.08); j.castShadow = j.receiveShadow = true; g.add(j); });
    const head = new THREE.Mesh(jambH, revealMat); head.position.set(0, 0.325, 0.08); head.castShadow = true; g.add(head);
    const sill = new THREE.Mesh(sillGeo, stone); sill.position.set(0, -0.36, 0.13); sill.castShadow = sill.receiveShadow = true; g.add(sill);
    // the room inside, lit by its fit status
    const tex = interiorTexture((winCount++ * 7 + room.floor) % 6);
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: '#6a6a6a', roughness: 1, emissiveMap: tex, emissive: new THREE.Color(LOOK.idle.c), emissiveIntensity: LOOK.idle.i });
    const inside = new THREE.Mesh(glassGeo, mat);
    inside.position.z = 0.004; inside.receiveShadow = true;
    inside.userData.roomId = room.id;
    g.add(inside);
    const mv = new THREE.Mesh(mullV, dark); mv.position.set(0, 0, 0.03); g.add(mv);
    const mh = new THREE.Mesh(mullH, dark); mh.position.set(0, 0.14, 0.03); g.add(mh);
    const glass = new THREE.Mesh(glassGeo, glassMat); glass.position.z = 0.045; g.add(glass);
    rig.add(g);
    pickables.push(inside);
    windows.set(room.id, {
      group: g, mat,
      cur: { c: new THREE.Color(LOOK.idle.c), i: LOOK.idle.i },
      target: { c: new THREE.Color(LOOK.idle.c), i: LOOK.idle.i },
      start: 0, status: 'idle',
    });
  }

  // Trees (soft shadows across the façade, a nod to Simmy Li's shadow work)
  const leaf = new THREE.MeshStandardMaterial({ color: '#4c6f45', roughness: 0.95 });
  const leaf2 = new THREE.MeshStandardMaterial({ color: '#5d8152', roughness: 0.95 });
  const trunk = new THREE.MeshStandardMaterial({ color: '#6b4f3a' });
  [[-4.6, 3.4, 1.1], [4.9, 2.4, 0.9], [-3.4, 5.2, 0.8]].forEach(([x, z, s]) => {
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.4), trunk); tr.position.y = 0.7; tr.castShadow = true; t.add(tr);
    // layered canopy instead of one faceted blob
    [[0, 0, 0, 0.78], [0.42, -0.18, 0.12, 0.56], [-0.38, -0.12, -0.18, 0.6], [0.06, 0.38, 0.1, 0.5], [-0.1, -0.3, 0.4, 0.46]].forEach(([dx, dy, dz, r], i) => {
      const cr = new THREE.Mesh(new THREE.SphereGeometry(r * s, 20, 14), i % 2 ? leaf2 : leaf);
      cr.position.set(dx * s, 1.9 * s + 0.4 + dy * s, dz * s); cr.scale.y = 0.86; cr.castShadow = true; t.add(cr);
    });
    t.position.set(x, 0, z);
    rig.add(t);
  });

  [[-2.6, 3.2], [3.4, 3.4], [6.2, -1.5]].forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.9), new THREE.MeshStandardMaterial({ color: '#2a2f38' }));
    post.position.set(x, 0.95, z); post.castShadow = true; rig.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), lampMat);
    bulb.position.set(x, 1.95, z); rig.add(bulb);
    const pl = new THREE.PointLight('#ffb867', 0, 6, 1.6); pl.position.set(x, 1.8, z); rig.add(pl); lamps.push(pl);
  });

  function applyDay(t) {
    const sky = sampleStops(SKY, t);
    if (scene.background) { scene.background.setRGB(...oklchToLinear(sky.L, sky.C, sky.h)); scene.fog?.color.copy(scene.background); }
    const a = Math.min(1, t / 0.86) * Math.PI;           // sun rises then sets
    const elev = Math.max(0.06, Math.sin(a) * day.season); // lower winter sun, longer shadows
    sun.position.set(Math.cos(a) * -15, 1.5 + elev * 13, 7 + Math.sin(a) * 3);
    const night = Math.min(1, Math.max(0, (t - 0.74) / 0.2));
    day.night = night;
    sun.intensity = 2.6 * (1 - night * 0.92) * (0.45 + 0.55 * elev);
    sun.color.setRGB(...oklchToLinear(0.9 - (1 - elev) * 0.1, 0.03 + (1 - elev) * 0.1, 60));
    hemi.intensity = 1.15 - night * 0.85;
    hemi.color.setRGB(...oklchToLinear(sky.L * 0.95 + 0.05, sky.C * 0.6, sky.h));
    lobby.emissiveIntensity = 0.7 + night * 1.6;
    lampMat.emissiveIntensity = night * 3;
    lamps.forEach((l) => (l.intensity = night * 6));
    renderer.toneMappingExposure = 1.05 - night * 0.15;
  }

  let width = 0, height = 0;
  let redrawHook = () => {}; // set once the frame loop exists
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    width = r.width; height = r.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the whole building in frame on tall/narrow viewports.
    camera.fov = camera.aspect < 0.9 ? 36 : 31;
    camera.updateProjectionMatrix();
    redrawHook();
  }

  // Pointer parallax + picking
  const pointer = new THREE.Vector2(-9, -9);
  let pointerMoved = false;
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  const ray = new THREE.Raycaster();
  let hoverId = null;
  let onHover = () => {};
  let selectedId = null;

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    parallax.tx = pointer.x * 0.12; parallax.ty = pointer.y * 0.25;
    pointerMoved = true; invalidate();
  });
  canvas.addEventListener('pointerleave', () => { pointer.set(-9, -9); parallax.tx = parallax.ty = 0; pointerMoved = true; invalidate(); });

  function pick() {
    if (pointer.x < -2) { if (hoverId) { hoverId = null; onHover(null); } return; }
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    const id = hit ? hit.object.userData.roomId : null;
    if (id !== hoverId) {
      hoverId = id;
      let screen = null;
      if (hit) {
        const p = hit.point.clone().project(camera);
        screen = { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
      }
      onHover(id, screen);
      canvas.style.cursor = id ? 'pointer' : 'default';
    }
  }

  // Frame-rate independent damping (Jasper Vos's lerp → damp)
  const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

  const WHITE = new THREE.Color('#ffffff'), tmpC = new THREE.Color();
  // returns true while any window is still changing (so the frame loop knows whether to keep drawing)
  function stepWindows(now, dt) {
    let moving = false;
    windows.forEach((w, id) => {
      if (now < w.start) { moving = true; return; }
      const hot = id === selectedId || id === hoverId;
      const tc = hot ? tmpC.copy(w.target.c).lerp(WHITE, 0.35) : w.target.c;
      const boost = 1 + day.night * (w.status === 'no' ? 0.2 : 0.9);
      const ti = (hot ? Math.max(w.target.i, 1.2) * 1.35 : w.target.i) * boost;
      const k = 1 - Math.exp(-7 * dt);
      const before = w.cur.i, dc = Math.abs(w.cur.c.r - tc.r) + Math.abs(w.cur.c.g - tc.g) + Math.abs(w.cur.c.b - tc.b);
      w.cur.c.lerp(tc, k);
      w.cur.i = damp(w.cur.i, ti, 7, dt);
      if (dc > 0.003 || Math.abs(before - ti) > 0.003) moving = true;
      w.mat.emissive.copy(w.cur.c);
      w.mat.emissiveIntensity = w.cur.i;
    });
    return moving;
  }

  function setPhase(phase) {
    if (scrub) {
      const o = day.orbit;
      rig.rotation.y = -1.25 + o * 1.05 + parallax.x;
      const rad = 17.5 + o * 7.5;
      camera.position.set(rad * 0.48, 2.2 + o * 4.6 + parallax.y, rad * 0.88);
      camera.lookAt(0, 2.6 + o * 1.8, 0);
      return;
    }
    rig.rotation.y = -0.55 + Math.sin(phase * TAU) * 0.22 + parallax.x;
    camera.position.y = 6.4 + parallax.y;
    camera.lookAt(0, 4.3, 0);
  }

  // Render on demand: the building only draws while the camera, the light, a window or your pointer is
  // changing. Holding still on the 3D section costs nothing.
  let last = performance.now();
  let raf = 0, need = 2, onDemand = true;
  let running = true;
  const stats = { frames: 0, px: 0, get visible() { return running; }, get fullPx() { return canvas.clientWidth * canvas.clientHeight * Math.min(devicePixelRatio, 2) ** 2; } };
  function invalidate() { need = Math.max(need, 2); if (!raf && running) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  redrawHook = invalidate;
  const t0 = performance.now();
  const near = (a, b) => Math.abs(a - b) < 1e-4;
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.25, (now - last) / 1000); // real elapsed time, so it settles just as fast on a slow machine
    last = now;
    parallax.x = damp(parallax.x, parallax.tx, 4, dt);
    parallax.y = damp(parallax.y, parallax.ty, 4, dt);
    day.t = damp(day.t, day.tt, 5, dt); day.orbit = damp(day.orbit, day.torbit, 5, dt);
    const camMoving = !near(parallax.x, parallax.tx) || !near(parallax.y, parallax.ty) || !near(day.t, day.tt) || !near(day.orbit, day.torbit);
    if (scrub && camMoving) applyDay(day.t);
    const phase = reducedMotion ? 0 : (((now - t0) / 1000) % LOOP_SECONDS) / LOOP_SECONDS;
    setPhase(phase);
    if (pointerMoved || camMoving) { pick(); pointerMoved = false; }
    const winMoving = stepWindows(now, reducedMotion ? 1 : dt);
    const moving = camMoving || winMoving || !scrub || !onDemand;
    stats.why = !onDemand ? 'always (switch is off)' : camMoving ? 'camera moving' : winMoving ? 'windows changing' : need > 0 ? 'settling' : 'resting';
    if (moving) need = 2;
    if (need-- > 0) { renderer.render(scene, camera); stats.frames++; stats.px += canvas.width * canvas.height; }
    if (moving || need > 0) raf = requestAnimationFrame(frame); else stats.why = 'resting';
  }

  const api = {
    get info() { return renderer.info; },
    stats,
    get onDemand() { return onDemand; },
    setOnDemand(on) { onDemand = on; invalidate(); },
    get running() { return running; },
    addRooms(rooms) { rooms.forEach(addWindow); invalidate(); },
    // results: [{room, status}] — staggered wave from the ground up
    setStatuses(results, { wave = true } = {}) {
      const now = performance.now(); invalidate();
      results.forEach(({ room, status }) => {
        const w = windows.get(room.id);
        if (!w) return;
        const look = LOOK[status] || LOOK.idle;
        w.status = status;
        w.target.c.set(look.c); w.target.i = look.i;
        w.start = wave && !reducedMotion ? now + room.floor * 70 + (room.face === 'side' ? FRONT + room.col : room.col) * 28 : now;
      });
    },
    select(id) { selectedId = id; invalidate(); },
    setDay(t) { if (t !== day.tt) { day.tt = t; invalidate(); } },
    setOrbit(o) { if (o !== day.torbit) { day.torbit = o; invalidate(); } },
    setMonth(m) { day.season = { 12: 0.42, 1: 0.45, 3: 0.72, 9: 0.72, 6: 1.0 }[m] ?? 0.75; applyDay(day.t); invalidate(); },
    screenOf(id) {
      const w = windows.get(id); if (!w) return null;
      const p = new THREE.Vector3(); w.group.getWorldPosition(p); p.project(camera);
      return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
    },
    jump(t, o) { day.t = day.tt = t; day.orbit = day.torbit = o; applyDay(t); invalidate(); },
    onHover(fn) { onHover = fn; },
    start() { resize(); invalidate(); },
    pause(p) { running = !p; if (running) invalidate(); },
    resize,
    // Deterministic offline render for the FFmpeg export (Luke Bailey's pipeline).
    renderAt(phase, w, h, cycle = false) {
      running = false;
      if (cycle) { day.t = day.tt = phase; applyDay(phase); day.orbit = 0.55 + Math.sin(phase * TAU) * 0.25; }
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = w / h < 0.9 ? 36 : 31; camera.updateProjectionMatrix();
      windows.forEach((win) => { win.mat.emissive.copy(win.target.c); win.mat.emissiveIntensity = win.target.i; });
      parallax.x = parallax.y = 0;
      setPhase(phase);
      renderer.render(scene, camera);
      // Composite onto the same sky the page draws in CSS, in the same task (buffer still valid).
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const g = out.getContext('2d');
      const lin = g.createLinearGradient(0, 0, 0, h);
      lin.addColorStop(0, '#c9dcf2'); lin.addColorStop(0.52, '#e7eef8'); lin.addColorStop(1, '#f3ece6');
      g.fillStyle = lin; g.fillRect(0, 0, w, h);
      const rad = g.createRadialGradient(w * 0.8, 0, 0, w * 0.8, 0, w * 0.9);
      rad.addColorStop(0, 'rgba(255,233,216,1)'); rad.addColorStop(0.55, 'rgba(255,233,216,0)');
      g.fillStyle = rad; g.fillRect(0, 0, w, h);
      g.drawImage(canvas, 0, 0, w, h);
      return out.toDataURL('image/jpeg', 0.92);
    },
    // Close-up still of one room's window, for carousel cards.
    snapshot(roomId, { w = 640, h = 440, time = 0.5 } = {}) {
      const win = windows.get(roomId);
      if (!win) return null;
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const r2 = new THREE.WebGLRenderer({ canvas: off, antialias: true, alpha: true, preserveDrawingBuffer: true });
      r2.shadowMap.enabled = true; r2.shadowMap.type = THREE.PCFSoftShadowMap;
      r2.toneMapping = THREE.ACESFilmicToneMapping; r2.outputColorSpace = THREE.SRGBColorSpace;
      const cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
      const saved = { rot: rig.rotation.y, sun: sun.position.clone(), col: sun.color.clone(), hi: hemi.intensity };
      rig.rotation.y = -0.55;
      rig.updateMatrixWorld(true);
      const p = new THREE.Vector3(); win.group.getWorldPosition(p);
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(win.group.getWorldQuaternion(new THREE.Quaternion()));
      cam.position.copy(p).addScaledVector(n, 10.5).add(new THREE.Vector3(3.2, -2.6, 0));
      cam.lookAt(p.clone().add(new THREE.Vector3(-0.6, 0.6, 0)));
      // time of day: 0 morning … 1 night
      if (scrub) applyDay(time);
      else {
        const a = -0.6 + time * 1.4;
        sun.position.set(Math.sin(a) * 12, 4 + Math.cos(time * Math.PI) * 6 + 3, 9);
        sun.color.set(new THREE.Color('#fff1dc').lerp(new THREE.Color('#ff9a6a'), time));
        hemi.intensity = 1.2 - time * 0.6;
      }
      const keep = windows.get(roomId);
      const prev = { c: keep.mat.emissive.clone(), i: keep.mat.emissiveIntensity };
      windows.forEach((x) => { x.mat.emissive.copy(x.target.c); x.mat.emissiveIntensity = x.target.i * (0.6 + day.night * 0.8); });
      keep.mat.emissive.copy(keep.target.c).lerp(new THREE.Color('#fff'), 0.2); keep.mat.emissiveIntensity = Math.max(keep.target.i, 1.2) * 1.5;
      r2.render(scene, cam);
      const url = off.toDataURL('image/webp', 0.9);
      keep.mat.emissive.copy(prev.c); keep.mat.emissiveIntensity = prev.i;
      rig.rotation.y = saved.rot; sun.position.copy(saved.sun); sun.color.copy(saved.col); hemi.intensity = saved.hi;
      if (scrub) applyDay(day.t);
      r2.dispose(); r2.forceContextLoss();
      return url;
    },
  };

  new ResizeObserver(resize).observe(canvas);
  let onScreen = true;
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; api.pause(!onScreen || document.hidden); }).observe(canvas);
  document.addEventListener('visibilitychange', () => api.pause(document.hidden || !onScreen));
  return api;
}

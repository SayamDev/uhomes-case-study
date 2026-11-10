// Walk into the room: a real-scale (metres) illustrative model built from the floor-plan layout.
// The camera steps through the door on a deterministic timeline, then you can look around.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ensOf } from './data.js';


const H = 2.5;
const DUVET = { classic: '#3d5a86', premium: '#c58a3e', platinum: '#7a6a9c', twodio: '#5f8a66', studio: '#b5523b', pstudio: '#2f4b7c', lstudio: '#8a5a44', onebed: '#3f5e5a', share: '#6b5b8a' };

function planks() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = 'hsl(30 36% 54%)'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) {
    for (let y = 0; y < 640; y += 128) {
      const off = (i % 2) * 64;
      g.fillStyle = `hsl(${28 + Math.random() * 6} ${32 + Math.random() * 10}% ${50 + Math.random() * 10}%)`;
      g.fillRect(i * 64, y - off, 63, 127);
      g.fillStyle = 'rgba(60,30,10,.18)'; g.fillRect(i * 64 + 63, 0, 1, 512); g.fillRect(i * 64, y - off + 127, 64, 1);
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(80,45,20,.06)'; g.fillRect(i * 64 + Math.random() * 60, y - off, 1.5, 127); }
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function poster(seed) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 176;
  const g = c.getContext('2d');
  const cols = [['#f4efe6', '#e05d4f', '#212731'], ['#212731', '#ffd28a', '#fb5f64'], ['#e8f0ee', '#3c6e91', '#e8b23d']][seed % 3];
  g.fillStyle = cols[0]; g.fillRect(0, 0, 128, 176);
  g.fillStyle = cols[1]; g.beginPath(); g.arc(64, 74, 38, 0, Math.PI * 2); g.fill();
  g.fillStyle = cols[2]; g.fillRect(16, 130, 96, 8); g.fillRect(16, 146, 60, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function label(text, ink = '#ffd28a') {
  const c = document.createElement('canvas'); const g0 = c.getContext('2d'); g0.font = '700 40px Poppins, sans-serif';
  const tw = Math.ceil(g0.measureText(text).width) + 64; c.width = tw; c.height = 88;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(23,27,34,.88)'; g.beginPath(); g.roundRect(4, 8, tw - 8, 72, 36); g.fill();
  g.fillStyle = ink; g.font = '700 40px Poppins, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, tw / 2, 46);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  sp.scale.set(0.225 * tw / 88, 0.225, 1); sp.renderOrder = 10; return sp;
}

export function createRoomViewer(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // the room is static: bake shadows once per room, not every frame
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1f26');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = true;
  controls.minPolarAngle = 0.9; controls.maxPolarAngle = 1.9; controls.rotateSpeed = 0.5;
  controls.enabled = false;

  scene.add(new THREE.HemisphereLight('#fff4e6', '#5a4636', 0.55));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
  scene.add(sun); scene.add(sun.target);
  const lamp = new THREE.PointLight('#ffc98a', 3, 4, 1.5); scene.add(lamp); // no shadow cube map: six extra passes saved

  const floorTex = planks();
  const M = {
    wall: new THREE.MeshStandardMaterial({ color: '#efe8de', roughness: 0.95 }),
    ceil: new THREE.MeshStandardMaterial({ color: '#f6f2ec', roughness: 1 }),
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }),
    wood: new THREE.MeshStandardMaterial({ color: '#8a6648', roughness: 0.6 }),
    oak: new THREE.MeshStandardMaterial({ color: '#c7a37a', roughness: 0.55 }),
    white: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6 }),
    linen: new THREE.MeshStandardMaterial({ color: '#f3efe7', roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.4, metalness: 0.6 }),
    tile: new THREE.MeshStandardMaterial({ color: '#dfe7ea', roughness: 0.35 }),
    sky: new THREE.MeshBasicMaterial({ color: '#cfe1f4' }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.05, envMapIntensity: 1.5, depthWrite: false }),
    rug: new THREE.MeshStandardMaterial({ color: '#c9b8a2', roughness: 1 }),
    scale: new THREE.MeshBasicMaterial({ color: '#fb5f64', transparent: true, opacity: 0.35, depthWrite: false }),
  };
  const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };

  let room = null, dims = [3, 4], bedScale = null, ceilMesh = null, front = null, person = null, mode = 'walk';
  function build(type) {
    if (room) { scene.remove(room); room.traverse((o) => { o.geometry?.dispose(); if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } }); }
    room = new THREE.Group(); scene.add(room);
    const L = type.layout || type.id;
    const [W, D] = (dims = type.dims);
    floorTex.repeat.set(W / 1.6, D / 1.6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; room.add(floor);
    ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.ceil); ceilMesh.rotation.x = Math.PI / 2; ceilMesh.position.y = H; room.add(ceilMesh);
    const t = 0.12;
    // side walls
    box(t, H, D, M.wall, -W / 2 - t / 2, H / 2, 0, room); box(t, H, D, M.wall, W / 2 + t / 2, H / 2, 0, room);
    // back wall with a window (z = -D/2)
    const ww = Math.min(1.6, W * 0.5), wh = 1.4, sill = 0.85;
    box((W - ww) / 2, H, t, M.wall, -W / 2 + (W - ww) / 4, H / 2, -D / 2 - t / 2, room);
    box((W - ww) / 2, H, t, M.wall, W / 2 - (W - ww) / 4, H / 2, -D / 2 - t / 2, room);
    box(ww, sill, t, M.wall, 0, sill / 2, -D / 2 - t / 2, room);
    box(ww, H - sill - wh, t, M.wall, 0, H - (H - sill - wh) / 2, -D / 2 - t / 2, room);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(ww * 3, wh * 2.5), M.sky); sky.position.set(0, sill + wh / 2, -D / 2 - 1.2); room.add(sky);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), M.glass); gl.position.set(0, sill + wh / 2, -D / 2 - 0.02); room.add(gl);
    box(0.05, wh, 0.06, M.white, 0, sill + wh / 2, -D / 2 - 0.02, room);
    box(ww + 0.1, 0.05, 0.22, M.white, 0, sill, -D / 2 + 0.05, room);
    // front wall with the door gap (z = +D/2), door at the left
    const dw = 0.9, dx = -W / 2 + 0.25 + dw / 2;
    front = new THREE.Group(); room.add(front);
    box(0.25, H, t, M.wall, -W / 2 + 0.125, H / 2, D / 2 + t / 2, front);
    box(W - 0.25 - dw, H, t, M.wall, dx + dw / 2 + (W - 0.25 - dw) / 2, H / 2, D / 2 + t / 2, front);
    box(dw, H - 2.05, t, M.wall, dx, H - (H - 2.05) / 2, D / 2 + t / 2, front);
    box(0.05, 2.05, t + 0.02, M.white, dx - dw / 2, 1.025, D / 2 + t / 2, room); box(0.05, 2.05, t + 0.02, M.white, dx + dw / 2, 1.025, D / 2 + t / 2, room); box(dw, 0.05, t + 0.02, M.white, dx, 2.05, D / 2 + t / 2, room);

    const double = ['platinum', 'pstudio'].includes(L);
    const bw = double ? 1.35 : 0.9, bl = 1.9;
    const beds = [];
    const bed = (x, z, rot = 0) => {
      beds.push([x, z]);
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; room.add(g);
      box(bw + 0.06, 0.3, bl + 0.06, M.wood, 0, 0.15, 0, g);
      box(bw, 0.2, bl, M.linen, 0, 0.4, 0, g);
      box(bw - 0.02, 0.08, bl * 0.68, new THREE.MeshStandardMaterial({ color: DUVET[type.id] || '#3d5a86', roughness: 0.9 }), 0, 0.52, bl * 0.15, g);
      box(bw * 0.7, 0.12, 0.35, M.linen, 0, 0.56, -bl / 2 + 0.25, g);
      box(bw + 0.06, 0.9, 0.06, M.wood, 0, 0.45, -bl / 2 - 0.03, g);
    };
    const desk = (x, z, rot = 0) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; room.add(g);
      box(1.1, 0.04, 0.55, M.oak, 0, 0.74, 0, g);
      [[-0.52, -0.24], [0.52, -0.24], [-0.52, 0.24], [0.52, 0.24]].forEach(([a, b]) => box(0.03, 0.72, 0.03, M.metal, a, 0.36, b, g));
      box(0.42, 0.04, 0.42, M.metal, 0, 0.46, 0.55, g); box(0.42, 0.42, 0.04, M.metal, 0, 0.7, 0.75, g);
      box(0.3, 0.2, 0.22, M.white, 0.3, 0.86, -0.1, g); // books
      const shade = box(0.16, 0.12, 0.16, new THREE.MeshStandardMaterial({ color: '#f6e3bd', emissive: '#ffcf8a', emissiveIntensity: 1.2 }), -0.35, 1.05, -0.12, g);
      box(0.015, 0.3, 0.015, M.metal, -0.35, 0.9, -0.12, g);
      g.updateMatrixWorld(true); const p = new THREE.Vector3(); shade.getWorldPosition(p); lamp.position.copy(p).add(new THREE.Vector3(0, 0.05, 0));
    };
    const wardrobe = (x, z, rot = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; room.add(g); box(0.95, 2.0, 0.58, M.white, 0, 1.0, 0, g); box(0.01, 1.9, 0.02, M.wood, 0, 1.0, 0.3, g); };
    const [ew, ed] = ensOf(type);
    // En suite: four walls, no lid, real size, fittings inside, so from above you see how much room it takes
    const ensuite = (x, z, shared = false) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
      const wt = 0.06, eh = 2.3, door = 0.7;
      box(ew, eh, wt, M.tile, 0, eh / 2, -ed / 2, g); box(ew, eh, wt, M.tile, 0, eh / 2, ed / 2, g);
      box(wt, eh, ed, M.tile, ew / 2, eh / 2, 0, g);
      // door in the wall facing the room, near the corridor
      box(wt, eh, ed - door - 0.15, M.tile, -ew / 2, eh / 2, -ed / 2 + (ed - door - 0.15) / 2, g);
      box(wt, eh, 0.15, M.tile, -ew / 2, eh / 2, ed / 2 - 0.075, g);
      box(wt, eh - 2.05, door, M.tile, -ew / 2, 2.05 + (eh - 2.05) / 2, ed / 2 - 0.15 - door / 2, g);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(ew, ed), M.tile); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.004; g.add(fl);
      const tray = 0.8; box(tray, 0.06, tray, M.white, ew / 2 - tray / 2 - 0.04, 0.03, -ed / 2 + tray / 2 + 0.04, g);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, tray), M.glass); glass.position.set(ew / 2 - tray - 0.04, 1.0, -ed / 2 + tray / 2 + 0.04); g.add(glass);
      box(0.38, 0.4, 0.55, M.white, -ew / 2 + 0.3, 0.2, -ed / 2 + 0.36, g); box(0.38, 0.35, 0.16, M.white, -ew / 2 + 0.3, 0.55, -ed / 2 + 0.1, g); // toilet
      box(0.42, 0.14, 0.34, M.white, ew / 2 - 0.25, 0.85, ed / 2 - 0.3, g); // basin
      const lb = label(`${shared ? 'Shared bathroom' : 'En suite'} ${ew.toFixed(1)} × ${ed.toFixed(1)} m`, '#bfe3ff'); lb.position.set(0, eh + 0.25, 0); g.add(lb);
    };
    const kitchen = (x, z, len = 1.8) => { const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g); box(0.6, 0.9, len, M.white, 0, 0.45, 0, g); box(0.62, 0.04, len + 0.02, M.metal, 0, 0.92, 0, g); [[-0.3], [0.1]].forEach(([o]) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 24), M.metal); h.position.set(0, 0.95, o); g.add(h); }); box(0.5, 0.6, len, M.white, 0, 1.9, 0, g); };
    const sofa = (x, z, rot = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; room.add(g); const fab = new THREE.MeshStandardMaterial({ color: '#8c9aa8', roughness: 1 }); box(1.6, 0.42, 0.8, fab, 0, 0.21, 0, g); box(1.6, 0.45, 0.18, fab, 0, 0.62, -0.31, g); };
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(0.1, 0.005, 0.2); rug.receiveShadow = true; room.add(rug);
    const ps = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.58), new THREE.MeshStandardMaterial({ map: poster(type.id.length), roughness: 0.8 })); ps.position.set(W / 2 - 0.01, 1.6, -D / 2 + 1.2); ps.rotation.y = -Math.PI / 2; room.add(ps);

    // layouts mirror the floor plans: bed on the left wall, en suite at the window end on the right
    if (L === 'twodio') {
      bed(-W / 2 + bw / 2 + 0.1, -D / 2 + bl / 2 + 0.1); bed(W / 2 - bw / 2 - 0.1, -D / 2 + bl / 2 + 0.1);
      kitchen(0, 0.4, 1.4); ensuite(W / 2 - ew / 2 - 0.03, D / 2 - ed / 2 - 0.03, true); desk(-W / 2 + 0.65, D / 2 - 0.9, Math.PI / 2);
    } else {
      bed(-W / 2 + bw / 2 + 0.06, -D / 2 + bl / 2 + 0.1);
      const studio = type.kind === 'studio';
      if (studio) { ensuite(W / 2 - ew / 2 - 0.03, D / 2 - ed / 2 - 0.03); kitchen(W / 2 - 0.32, -D / 2 + 1.2, 1.6); desk(-W / 2 + 0.7, D / 2 - 1.6, Math.PI / 2); }
      else { ensuite(W / 2 - ew / 2 - 0.03, D / 2 - ed / 2 - 0.03); desk(W / 2 - 0.35, -D / 2 + 0.85, -Math.PI / 2); wardrobe(W / 2 - 0.35, Math.min(-D / 2 + 2.0, D / 2 - ed - 0.55), -Math.PI / 2); }
      if (['platinum', 'pstudio'].includes(L)) sofa(-W / 2 + 0.5, D / 2 - 1.1, Math.PI / 2);
    }
    // measurements on the floor: real width and depth
    const tape = new THREE.MeshBasicMaterial({ color: '#ffd28a' });
    const tw = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.01, 0.025), tape); tw.position.set(0, 0.012, D / 2 - 0.12); room.add(tw);
    const td = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, D - 0.1), tape); td.position.set(-W / 2 + 0.12, 0.012, 0); room.add(td);
    const lw = label(`${W.toFixed(1)} m wide`); lw.position.set(0.4, 0.2, D / 2 - 0.3); room.add(lw);
    const ld = label(`${D.toFixed(1)} m long`); ld.position.set(-W / 2 + 0.5, 0.2, -0.2); room.add(ld);
    // a 1.75 m person for scale (toggle, with the bed)
    person = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: '#9aa3b4', roughness: 0.8 });
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.62, 6, 12), skin); legs.position.y = 0.44; person.add(legs);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 6, 12), skin); torso.position.y = 1.18; person.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), skin); head.position.y = 1.64; person.add(head);
    person.traverse((o) => (o.castShadow = true));
    const lp = label('1.75 m person'); lp.position.y = 1.95; person.add(lp);
    const ox = (-W / 2 + bw + 0.15 + (W / 2 - (L === 'twodio' ? bw + 0.2 : 0.75))) / 2;
    person.position.set(ox, 0, -D / 2 + 1.3); person.visible = scaleOn; room.add(person);
    // single-bed footprint for scale (toggle)
    // scale: the real bed gets its size, so you can judge everything else against it
    bedScale = new THREE.Group();
    beds.forEach(([x, z]) => { const l = label(`${double ? 'Small double' : 'Single bed'} ${bw} × ${bl} m`, '#ffb3b5'); l.position.set(x, 0.95, z + 0.2); bedScale.add(l); });
    bedScale.visible = scaleOn; room.add(bedScale);
    sun.position.set(-1.5, 3.2, -D / 2 - 3.5); sun.target.position.set(0.5, 0, 0.8);
    renderer.shadowMap.needsUpdate = true; invalidate();
  }

  let scaleOn = false, w = 0, h = 0;
  function resize() { const r = canvas.getBoundingClientRect(); if (!r.width) return; w = r.width; h = r.height; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate(); }

  // Deterministic fly-in: from the corridor, through the door, to a standing view.
  let fly = null;
  function flyIn() {
    const [W, D] = dims;
    const dx = -W / 2 + 0.25 + 0.45;
    const from = new THREE.Vector3(dx, 1.62, D / 2 + 2.2), mid = new THREE.Vector3(dx, 1.6, D / 2 - 0.2), to = new THREE.Vector3(-W * 0.05, 1.6, D / 2 - 0.45);
    const lookA = new THREE.Vector3(dx, 1.5, 0), lookB = new THREE.Vector3(-W * 0.12, 1.05, -D / 2 + 0.3);
    controls.enabled = false;
    fly = { t0: performance.now(), dur: reducedMotion ? 1 : 2600, from, mid, to, lookA, lookB };
    invalidate();
  }
  // Stand still and look around: the orbit target sits 1 cm in front of your eyes, so dragging turns your head
  // instead of swinging you round the room. You can never end up outside the walls.
  function stand(pos, look) {
    const dir = look.clone().sub(pos).normalize();
    controls.target.copy(pos).addScaledVector(dir, 0.01);
    camera.position.copy(pos);
    controls.minDistance = controls.maxDistance = 0.01; controls.enableZoom = false;
    controls.minPolarAngle = 0.6; controls.maxPolarAngle = 2.2; controls.rotateSpeed = -0.35;
    controls.enabled = true; controls.update(); invalidate();
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const v = new THREE.Vector3(), L = new THREE.Vector3();
  // Render on demand: a still room costs nothing. Frames are drawn only while the camera moves.
  let visible = false, need = 2, frames = 0, onDemand = true, raf = 0, px = 0;
  // The loop itself sleeps: nothing runs at all until the camera, the room or the scale toggle changes.
  function invalidate() { need = 2; if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', invalidate);
  // Awake only while you drag, plus a moment for the damping to settle. (Listening to the controls'
  // own 'change' event kept it awake for ever: every update reports a tiny change, which woke it again.)
  let dragging = false, settleUntil = 0;
  controls.addEventListener('start', () => { dragging = true; invalidate(); });
  controls.addEventListener('end', () => { dragging = false; settleUntil = performance.now() + 1200; invalidate(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; invalidate(); }).observe(canvas);
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const active = !!fly || dragging || now < settleUntil || !onDemand;
    if (active && !fly) controls.update();
    if (!active && need <= 0) return; // asleep
    raf = requestAnimationFrame(frame);
    need--; frames++; px += canvas.width * canvas.height;
    if (fly) {
      const k = Math.min(1, (now - fly.t0) / fly.dur), e = ease(k);
      if (e < 0.55) v.lerpVectors(fly.from, fly.mid, e / 0.55); else v.lerpVectors(fly.mid, fly.to, (e - 0.55) / 0.45);
      L.lerpVectors(fly.lookA, fly.lookB, e);
      camera.position.copy(v); camera.lookAt(L);
      if (k >= 1) { stand(fly.to, fly.lookB); fly = null; }
    }
    renderer.render(scene, camera);
  }

  function overhead() {
    // Same camera for every room, so a bigger room really looks bigger.
    fly = null; mode = 'overhead';
    if (ceilMesh) ceilMesh.visible = false; if (front) front.visible = false;
    camera.fov = 40; camera.updateProjectionMatrix();
    camera.position.set(0, 11.5, 7.5); controls.target.set(0, 0, 0);
    controls.minDistance = controls.maxDistance = Math.hypot(11.5, 7.5); controls.enableZoom = false; controls.rotateSpeed = 0.5;
    controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.0; controls.enabled = true; controls.update(); invalidate();
  }
  function walkMode() {
    mode = 'walk';
    if (ceilMesh) ceilMesh.visible = true; if (front) front.visible = true;
    camera.fov = 70; camera.updateProjectionMatrix();
    controls.minPolarAngle = 0.9; controls.maxPolarAngle = 1.9;
    flyIn();
  }

  new ResizeObserver(resize).observe(canvas);
  return {
    setMode(m) { m === 'overhead' ? overhead() : walkMode(); },
    get mode() { return mode; },
    start() { resize(); invalidate(); },
    show(type, { flyIn: f = true } = {}) { build(type); if (mode === 'overhead') { overhead(); return; } if (f) flyIn(); else { const [W, D] = dims; stand(new THREE.Vector3(-W / 2 + 0.75, 1.6, D / 2 - 0.5), new THREE.Vector3(0.2, 1.0, -D / 2 + 0.6)); } },
    replay: () => (mode === 'overhead' ? overhead() : flyIn()),
    setBedScale(on) { scaleOn = on; if (bedScale) bedScale.visible = on; if (person) person.visible = on; renderer.shadowMap.needsUpdate = true; invalidate(); },
    get frames() { return frames; },
    stats: { get frames() { return frames; }, get px() { return px; }, get visible() { return visible && !document.hidden; }, get fullPx() { return canvas.clientWidth * canvas.clientHeight * Math.min(devicePixelRatio, 2) ** 2; } },
    get info() { return renderer.info; },
    get onDemand() { return onDemand; },
    setOnDemand(on) { onDemand = on; invalidate(); },
  };
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1080, H = 1920, FPS = 30;
const TIMING = await (await fetch('/timing.json')).json();
await document.fonts.load('bold 60px "Noto Sans Telugu"');
await document.fonts.load('60px "Noto Sans Telugu"');
await document.fonts.load('bold 60px "DejaVu Sans"');

// ---------------- helpers ----------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const smr = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const easeOutBack = (t) => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const pulse = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (w * w));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const T = (f) => f / FPS;

// ---------------- renderer ----------------
const glc = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.78;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b1c);
scene.fog = new THREE.FogExp2(0x070d22, 0.035);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environmentIntensity = 0.5;
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.38, 0.4, 0.97);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// lights
scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x1a1030, 0.45));
const key = new THREE.DirectionalLight(0xfff1e0, 1.7);
key.position.set(3, 7, 5); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
scene.add(key);
const rimL = new THREE.SpotLight(0x4aa8ff, 14, 20, 0.6, 0.6); rimL.position.set(-5, 4, -4); scene.add(rimL);
const rimR = new THREE.SpotLight(0xc060ff, 14, 20, 0.6, 0.6); rimR.position.set(5, 4, -4); scene.add(rimR);
const fill = new THREE.PointLight(0x88aaff, 2.5, 12); fill.position.set(0, 2.5, 4); scene.add(fill);
const stageLight = new THREE.PointLight(0xffffff, 0, 6); stageLight.position.set(0, 1.2, 0.3); scene.add(stageLight);

// ---------------- materials ----------------
const plastic = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
const glow = (c, i = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });
const matte = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const add = (p, g, m, x = 0, y = 0, z = 0, shadow = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; p.add(o); return o; };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData = { c, ctx }; return t;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function holoMat(tex, op = 1) { return new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, blending: THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }); }

// ---------------- lab ----------------
const floorTex = canvasTex(1024, 1024, (x, w, h) => {
  x.fillStyle = '#0b1430'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(80,170,255,0.18)'; x.lineWidth = 2;
  for (let i = 0; i <= 16; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(6, 6);
const floor = add(scene, new THREE.CircleGeometry(16, 96), new THREE.MeshPhysicalMaterial({ color: 0x8899bb, map: floorTex, roughness: 0.22, metalness: 0.35, clearcoat: 1 }), 0, 0, 0, false);
floor.rotation.x = -Math.PI / 2;
// back wall: curved panels with light strips
const wallTex = canvasTex(2048, 512, (x, w, h) => {
  x.fillStyle = '#0a1128'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 32; i++) {
    const X = i * 64; x.fillStyle = i % 2 ? '#0d1736' : '#0b142f'; x.fillRect(X, 0, 64, h);
    x.fillStyle = 'rgba(60,140,255,0.9)'; x.fillRect(X + 30, 40, 4, h - 80);
    if (i % 4 === 0) { x.fillStyle = 'rgba(170,90,255,0.9)'; x.fillRect(X + 8, h * 0.45, 48, 6); }
  }
});
wallTex.wrapS = THREE.RepeatWrapping; wallTex.repeat.set(2, 1);
const wall = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 7, 96, 1, true, Math.PI * 0.55, Math.PI * 0.9),
  new THREE.MeshStandardMaterial({ map: wallTex, emissiveMap: wallTex, emissive: 0xffffff, emissiveIntensity: 0.35, side: THREE.BackSide, roughness: 0.6 }));
wall.position.set(0, 3.5, -1); scene.add(wall);
// ceiling rings
for (let i = 0; i < 3; i++) { const r = add(scene, new THREE.TorusGeometry(2.2 + i * 1.6, 0.03, 8, 128), glow(i === 1 ? 0xb070ff : 0x55b0ff, 1.6), 0, 5.6 + i * 0.25, -1, false); r.rotation.x = Math.PI / 2; }
// center stage
const stage = new THREE.Group(); scene.add(stage); stage.position.set(0, 0, -0.6);
add(stage, new THREE.CylinderGeometry(1.1, 1.2, 0.08, 64), plastic(0x1a2550, { metalness: 0.6, roughness: 0.25 }), 0, 0.04, 0, false);
const stageRing = add(stage, new THREE.TorusGeometry(1.12, 0.022, 8, 96), glow(0x66ccff, 2), 0, 0.085, 0, false); stageRing.rotation.x = Math.PI / 2;
// pods
const PODX = [-2.1, -0.7, 0.7, 2.1], PODZ = -3.0;
const COLORS = [0x2f86ff, 0x8a4dff, 0xf2b632, 0xc2187a];
const pods = PODX.map((px, i) => {
  const g = new THREE.Group(); g.position.set(px, 0, PODZ); scene.add(g);
  add(g, new THREE.CylinderGeometry(0.55, 0.62, 0.12, 48), plastic(0x18213f, { metalness: 0.7 }), 0, 0.06, 0, false);
  const ring = add(g, new THREE.TorusGeometry(0.56, 0.02, 8, 64), glow(COLORS[i], 2.2), 0, 0.125, 0, false); ring.rotation.x = Math.PI / 2;
  const beam = add(g, new THREE.CylinderGeometry(0.5, 0.55, 2.4, 32, 1, true), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, 1.3, 0, false);
  return { g, ring, beam };
});
// side consoles
for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
  const g = new THREE.Group(); g.position.set(s * (3.6 + k * 0.9), 0, 0.5 - k * 1.8); g.rotation.y = -s * 0.9; scene.add(g);
  add(g, new RoundedBoxGeometry(0.9, 0.9, 0.5, 4, 0.06), plastic(0x1b2448, { metalness: 0.5 }), 0, 0.45, 0);
  const scr = canvasTex(256, 160, (x, w, h) => { x.fillStyle = '#04102a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = ['#3fa9ff', '#a070ff', '#ffc94a', '#ff5aa8'][i % 4]; x.fillRect(16, 14 + i * 17, 40 + ((i * 53) % 170), 8); } });
  const sc = add(g, new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false }), 0, 1.0, 0.1, false); sc.rotation.x = -0.4;
}
// particles
const PN = 500, pp = new Float32Array(PN * 3), pbase = [];
for (let i = 0; i < PN; i++) { pbase.push([(rnd() - 0.5) * 16, rnd() * 6, (rnd() - 0.5) * 12 - 1, rnd() * 6.28]); }
const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
const dotTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const particles = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.05, map: dotTex, color: 0x88ccff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(particles);

// ---------------- scientist ----------------
const SKIN = 0xb97a4f;
function makeScientist() {
  const g = new THREE.Group();
  const skin = plastic(SKIN, { clearcoat: 0.3, roughness: 0.55 }), coat = plastic(0xf4f6fa, { clearcoat: 0.2, roughness: 0.6 });
  const dark = plastic(0x1d2233, { roughness: 0.5 }), hair = plastic(0x15110f, { roughness: 0.45 });
  // legs + shoes
  for (const s of [-1, 1]) { add(g, new THREE.CapsuleGeometry(0.07, 0.3, 4, 12), dark, s * 0.1, 0.24, 0); const sh = add(g, new THREE.SphereGeometry(0.09, 16, 12), plastic(0x2a1a12), s * 0.1, 0.05, 0.04); sh.scale.set(1, 0.6, 1.5); }
  // coat (lathe)
  const prof = [[0.0, 0.42], [0.3, 0.42], [0.31, 0.6], [0.27, 0.95], [0.24, 1.02], [0.12, 1.06], [0, 1.06]].map(p => new THREE.Vector2(p[0], p[1]));
  add(g, new THREE.LatheGeometry(prof, 40), coat, 0, 0, 0);
  // shirt + tie front
  const shirt = add(g, new THREE.CircleGeometry(0.11, 3), plastic(0x6fa8ff), 0, 0.93, 0.255, false); shirt.rotation.z = -Math.PI / 2; shirt.scale.set(1.2, 1, 1);
  const tie = add(g, new THREE.BoxGeometry(0.04, 0.16, 0.01), plastic(0xd8342c), 0, 0.88, 0.262, false);
  // pocket + pens
  add(g, new THREE.BoxGeometry(0.1, 0.07, 0.01), plastic(0xe6e9f0), -0.13, 0.82, 0.255, false);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.08), plastic(0x2f86ff), -0.15, 0.86, 0.258, false);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.08), plastic(0xd8342c), -0.12, 0.86, 0.258, false);
  // head
  const head = new THREE.Group(); head.position.set(0, 1.33, 0); g.add(head);
  add(head, new THREE.CylinderGeometry(0.07, 0.08, 0.1), skin, 0, -0.27, 0);
  const skull = add(head, new THREE.SphereGeometry(0.3, 40, 30), skin, 0, 0, 0); skull.scale.set(1, 1.02, 0.95);
  for (const s of [-1, 1]) { const e = add(head, new THREE.SphereGeometry(0.06, 16, 12), skin, s * 0.29, -0.01, 0); e.scale.set(0.5, 1, 0.8); }
  const hcap = add(head, new THREE.SphereGeometry(0.315, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, 0, 0.02, -0.02); hcap.rotation.x = -0.25;
  for (let i = 0; i < 5; i++) add(head, new THREE.SphereGeometry(0.09, 14, 10), hair, -0.16 + i * 0.08, 0.24 + Math.sin(i * 1.7) * 0.02, 0.1 + (i % 2) * 0.03);
  const nose = add(head, new THREE.SphereGeometry(0.045, 16, 12), skin, 0, -0.04, 0.29); nose.scale.set(1, 0.9, 0.9);
  const must = add(head, new THREE.CapsuleGeometry(0.022, 0.1, 4, 8), hair, 0, -0.105, 0.272); must.rotation.z = Math.PI / 2;
  // eyes
  const eyes = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * 0.1, 0.04, 0.25); head.add(eg);
    const w = add(eg, new THREE.SphereGeometry(0.055, 20, 16), plastic(0xffffff), 0, 0, 0, false); w.scale.z = 0.6;
    const p = add(eg, new THREE.SphereGeometry(0.03, 16, 12), plastic(0x1a0f08, { clearcoat: 1 }), 0, 0, 0.03, false); p.scale.z = 0.5;
    add(eg, new THREE.SphereGeometry(0.009, 8, 6), glow(0xffffff, 1.2), 0.012, 0.012, 0.045, false);
    eyes.push(eg);
    const brow = add(head, new THREE.CapsuleGeometry(0.013, 0.07, 4, 8), hair, s * 0.1, 0.13, 0.27, false); brow.rotation.z = Math.PI / 2 + s * 0.12; eg.userData.brow = brow;
  }
  // glasses
  const gm = plastic(0x111111, { metalness: 0.6 });
  for (const s of [-1, 1]) { add(head, new THREE.TorusGeometry(0.085, 0.011, 8, 32), gm, s * 0.1, 0.04, 0.3, false); const lens = add(head, new THREE.CircleGeometry(0.083, 32), new THREE.MeshPhysicalMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1 }), s * 0.1, 0.04, 0.301, false); const tmp = add(head, new THREE.BoxGeometry(0.01, 0.01, 0.26), gm, s * 0.19, 0.05, 0.17, false); }
  add(head, new THREE.BoxGeometry(0.03, 0.01, 0.01), gm, 0, 0.05, 0.305, false);
  // mouth
  const mouth = add(head, new THREE.SphereGeometry(0.05, 20, 12), plastic(0x5a1414, { roughness: 0.6 }), 0, -0.16, 0.262, false); mouth.scale.set(1, 0.25, 0.4);
  // arms (pivot at shoulder)
  const arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.25, 0.98, 0); g.add(piv);
    const upper = add(piv, new THREE.CapsuleGeometry(0.065, 0.24, 4, 12), coat, 0, -0.17, 0);
    const elbow = new THREE.Group(); elbow.position.set(0, -0.32, 0); piv.add(elbow);
    add(elbow, new THREE.CapsuleGeometry(0.058, 0.18, 4, 12), coat, 0, -0.12, 0);
    add(elbow, new THREE.SphereGeometry(0.06, 16, 12), skin, 0, -0.27, 0);
    arms.push({ piv, elbow, s });
  }
  g.userData = { head, eyes, mouth, arms };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const sci = makeScientist(); scene.add(sci);

// ---------------- robots ----------------
function labelTex(text, col) {
  return canvasTex(512, 160, (x, w, h) => {
    x.fillStyle = '#0a0f22'; rrect(x, 4, 4, w - 8, h - 8, 40); x.fill();
    x.strokeStyle = col; x.lineWidth = 8; rrect(x, 8, 8, w - 16, h - 16, 36); x.stroke();
    x.fillStyle = '#ffffff'; x.font = 'bold 74px "DejaVu Sans"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 4);
  });
}
const NAMES = ['HAIKU 5.5', 'SONNET 5.5', 'OPUS 5.5', 'FABLE 5.2'];
const HEX = ['#3d93ff', '#9a5cff', '#ffc23d', '#e0329a'];
function makeRobot(i) {
  const col = COLORS[i], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const metal = i === 2 ? { metalness: 0.55, roughness: 0.3, color: 0xd99a1e } : {};
  const bm = plastic(col, metal), wm = plastic(0xeef1f8), dm = plastic(0x0b0e18, { roughness: 0.15 });
  // hover skirt + ring
  const sk = add(body, new THREE.CylinderGeometry(0.2, 0.3, 0.3, 32), bm, 0, 0.35, 0);
  const hr = add(body, new THREE.TorusGeometry(0.22, 0.03, 8, 40), glow(col, 2.5), 0, 0.17, 0, false); hr.rotation.x = Math.PI / 2;
  const jet = add(body, new THREE.ConeGeometry(0.18, 0.35, 24, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.0, 0, false); jet.rotation.x = Math.PI;
  // torso
  add(body, new RoundedBoxGeometry(0.72, 0.62, 0.52, 6, 0.17), bm, 0, 0.78, 0);
  const plate = add(body, new RoundedBoxGeometry(0.52, 0.34, 0.06, 4, 0.05), wm, 0, 0.8, 0.25);
  const lab = add(body, new THREE.PlaneGeometry(0.44, 0.1375), new THREE.MeshBasicMaterial({ map: labelTex(NAMES[i], HEX[i]), toneMapped: false }), 0, 0.72, 0.285, false);
  const core = add(body, new THREE.CircleGeometry(0.055, 32), glow(col, 3), 0, 0.88, 0.284, false);
  // head
  const head = new THREE.Group(); head.position.set(0, 1.36, 0); body.add(head);
  add(head, new THREE.CylinderGeometry(0.08, 0.1, 0.14, 16), dm, 0, -0.27, 0);
  add(head, new RoundedBoxGeometry(0.78, 0.56, 0.58, 6, 0.2), bm, 0, 0, 0);
  add(head, new RoundedBoxGeometry(0.64, 0.38, 0.06, 4, 0.1), new THREE.MeshStandardMaterial({ color: 0x05070d, roughness: 0.4, metalness: 0.0, envMapIntensity: 0.15 }), 0, -0.01, 0.27);
  const eyes = [-1, 1].map(s => { const e = add(head, new THREE.CapsuleGeometry(0.045, 0.06, 4, 12), glow(0xe8f6ff, 1.3), s * 0.14, 0.03, 0.305, false); return e; });
  const eyeGlow = [-1, 1].map(s => { const e = add(head, new THREE.CircleGeometry(0.09, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), s * 0.14, 0.03, 0.302, false); return e; });
  const mouth = add(head, new RoundedBoxGeometry(0.14, 0.03, 0.01, 2, 0.008), glow(0xe8f6ff, 2), 0, -0.11, 0.304, false);
  for (const s of [-1, 1]) { const e = add(head, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 24), wm, s * 0.41, 0, 0); e.rotation.z = Math.PI / 2; add(head, new THREE.CircleGeometry(0.05, 20), glow(col, 2.4), s * 0.445, 0, 0, false).rotation.y = s * Math.PI / 2; }
  const ant = new THREE.Group(); ant.position.set(0, 0.28, 0); head.add(ant);
  add(ant, new THREE.CylinderGeometry(0.012, 0.012, 0.2), dm, 0, 0.1, 0);
  const tip = add(ant, new THREE.SphereGeometry(0.045, 16, 12), glow(col, 3), 0, 0.22, 0, false);
  // signature parts
  if (i === 0) { for (const s of [-1, 1]) { const fin = add(head, new THREE.ConeGeometry(0.07, 0.3, 4), wm, s * 0.3, 0.2, -0.12); fin.rotation.set(-1.2, 0, s * 0.5); } }
  if (i === 1) { const band = add(head, new THREE.TorusGeometry(0.43, 0.03, 8, 40, Math.PI), wm, 0, 0.02, 0); }
  if (i === 2) { for (let k = -1; k <= 1; k++) { const c = add(head, new THREE.ConeGeometry(0.05, 0.16, 12), plastic(0xfff1c0, { metalness: 0.9, roughness: 0.2 }), k * 0.16, 0.34 - Math.abs(k) * 0.04, 0); } body.scale.setScalar(1.12); }
  let cape = null;
  if (i === 3) {
    const cg = new THREE.PlaneGeometry(0.7, 0.85, 10, 12);
    cape = add(body, cg, plastic(0x6e0f4a, { side: THREE.DoubleSide, roughness: 0.5, clearcoat: 0.3 }), 0, 0.68, -0.29);
    cape.userData.base = cg.attributes.position.array.slice();
    const mono = add(head, new THREE.TorusGeometry(0.075, 0.012, 8, 24), plastic(0xffd27a, { metalness: 0.9 }), 0.14, 0.03, 0.31, false);
  }
  // arms
  const arms = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.position.set(s * 0.42, 0.95, 0); body.add(piv);
    add(piv, new THREE.SphereGeometry(0.08, 16, 12), wm, 0, 0, 0);
    add(piv, new THREE.CapsuleGeometry(0.055, 0.26, 4, 12), bm, 0, -0.2, 0);
    add(piv, new THREE.SphereGeometry(0.075, 16, 12), wm, 0, -0.4, 0);
    return piv;
  });
  g.userData = { body, head, eyes, eyeGlow, mouth, arms, tip, core, hr, jet, cape, ant, col };
  return g;
}
const robots = [0, 1, 2, 3].map(i => { const r = makeRobot(i); scene.add(r); return r; });

// ---------------- holo panels ----------------
function panel(w, h, pw, ph, draw) { const t = canvasTex(pw, ph, draw); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMat(t)); m.renderOrder = 5; scene.add(m); m.userData.tex = t; return m; }
function holoFrame(x, w, h, col) {
  x.clearRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(10,22,58,0.86)'); g.addColorStop(1, 'rgba(6,12,34,0.86)');
  x.fillStyle = g; rrect(x, 6, 6, w - 12, h - 12, 28); x.fill();
  x.strokeStyle = col; x.lineWidth = 6; rrect(x, 6, 6, w - 12, h - 12, 28); x.stroke();
  x.globalAlpha = 0.05; x.fillStyle = '#ffffff'; for (let y = 0; y < h; y += 8) x.fillRect(0, y, w, 2); x.globalAlpha = 1;
}
function holoText(w, h, col, lines) {
  return (x) => { holoFrame(x, w, h, col); x.textAlign = 'center'; x.textBaseline = 'middle'; for (const L of lines) { x.fillStyle = L.c || '#ffffff'; x.font = L.f; x.fillText(L.t, w / 2, L.y); } };
}
// intro title
const pTitle = panel(1.0, 0.5, 1000, 500, (x) => {
  holoFrame(x, 1000, 500, '#7fb8ff');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#ffffff'; x.font = 'bold 150px "DejaVu Sans"'; x.fillText('Claude AI', 500, 200);
  x.font = 'bold 54px "DejaVu Sans"'; x.fillStyle = '#bcd6ff'; x.fillText('by Anthropic', 500, 320);
  HEX.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(320 + i * 120, 410, 26, 0, 7); x.fill(); });
});
const pFour = panel(1.5, 0.42, 1500, 420, (x) => {
  holoFrame(x, 1500, 420, '#ffffff');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 84px "DejaVu Sans"'; x.fillStyle = '#fff'; x.fillText('4 Models • 4 Super Powers', 750, 150);
  ['Haiku 5.5', 'Sonnet 5.5', 'Opus 5.5', 'Fable 5.2'].forEach((n, i) => { x.fillStyle = HEX[i]; x.font = 'bold 58px "DejaVu Sans"'; x.fillText(n, 210 + i * 360, 300); });
});
const pHaiku = panel(1.3, 0.34, 1300, 340, holoText(1300, 340, '#3d93ff', [{ t: 'HAIKU 5.5', f: 'bold 100px "DejaVu Sans"', y: 120, c: '#9fd0ff' }, { t: 'FAST • HIGH VOLUME • LOW COST', f: 'bold 62px "DejaVu Sans"', y: 250 }]));
const pSonnet = panel(1.3, 0.34, 1300, 340, holoText(1300, 340, '#9a5cff', [{ t: 'SONNET 5.5', f: 'bold 100px "DejaVu Sans"', y: 120, c: '#d4b8ff' }, { t: 'CODING • BALANCED INTELLIGENCE', f: 'bold 58px "DejaVu Sans"', y: 250 }]));
const pOpus = panel(1.4, 0.36, 1400, 360, holoText(1400, 360, '#ffc23d', [{ t: 'OPUS 5.5', f: 'bold 110px "DejaVu Sans"', y: 125, c: '#ffe39a' }, { t: 'COMPLEX REASONING • ADVANCED CODING', f: 'bold 56px "DejaVu Sans"', y: 265 }]));
const pFable = panel(1.4, 0.36, 1400, 360, holoText(1400, 360, '#e0329a', [{ t: 'FABLE 5.2', f: 'bold 110px "DejaVu Sans"', y: 125, c: '#ffb0dc' }, { t: 'DEEP RESEARCH • LONG-HORIZON WORK', f: 'bold 56px "DejaVu Sans"', y: 265 }]));
// sonnet code panel (typed progressively)
const CODE = [
  ['def', ' review_pull_request(diff):'], ['    ', 'issues = analyze(diff)'], ['    ', 'for bug in issues:'], ['        ', 'patch = fix(bug)'],
  ['        ', 'run_tests(patch)'], ['    ', 'return summary(issues)'], ['', ''], ['# ', 'tests: 42 passed ✓'],
];
const pCode = panel(1.15, 0.8, 1150, 800, () => { });
let codeKey = -1;
function drawCode(n) {
  const x = pCode.userData.tex.userData.ctx, w = 1150, h = 800; holoFrame(x, w, h, '#9a5cff');
  x.fillStyle = '#9a5cff'; x.fillRect(6, 6, w - 12, 70); x.fillStyle = '#fff'; x.font = 'bold 40px "DejaVu Sans Mono"'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('agent.py', 40, 42);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(w - 150 + i * 44, 42, 13, 0, 7); x.fill(); });
  let left = n; x.font = '44px "DejaVu Sans Mono"';
  CODE.forEach((L, li) => {
    const y = 130 + li * 80; x.fillStyle = '#6b7aa8'; x.fillText(String(li + 1).padStart(2, ' '), 26, y);
    const full = L[0] + L[1]; const k = Math.max(0, Math.min(full.length, left)); left -= full.length;
    const s = full.slice(0, k); const kw = s.slice(0, Math.min(k, L[0].length)); const rest = s.slice(L[0].length);
    x.fillStyle = L[0].startsWith('#') ? '#67e28a' : '#ff7ad9'; x.fillText(kw, 110, y);
    const kwW = x.measureText(L[0]).width;
    x.fillStyle = L[0].startsWith('#') ? '#67e28a' : '#e8ecff'; x.fillText(rest, 110 + kwW, y);
    if (k > 0 && k < full.length) { x.fillStyle = '#fff'; x.fillRect(110 + x.measureText(s).width + 4, y - 24, 22, 48); }
  });
  pCode.userData.tex.needsUpdate = true;
}
const CODELEN = CODE.reduce((a, L) => a + L[0].length + L[1].length, 0);
// balance icon panel
const pBal = panel(0.5, 0.42, 500, 420, (x) => {
  holoFrame(x, 500, 420, '#9a5cff'); x.strokeStyle = '#fff'; x.lineWidth = 10; x.lineCap = 'round';
  x.beginPath(); x.moveTo(250, 90); x.lineTo(250, 330); x.moveTo(170, 330); x.lineTo(330, 330); x.moveTo(90, 140); x.lineTo(410, 140); x.stroke();
  for (const cx of [110, 390]) { x.beginPath(); x.moveTo(cx, 140); x.lineTo(cx - 50, 230); x.moveTo(cx, 140); x.lineTo(cx + 50, 230); x.stroke(); x.beginPath(); x.arc(cx, 230, 52, 0, Math.PI); x.stroke(); }
  x.fillStyle = '#9fd0ff'; x.font = 'bold 40px "DejaVu Sans"'; x.textAlign = 'center'; x.fillText('⚡', 110, 270); x.fillStyle = '#ffd27a'; x.fillText('★', 390, 270);
});
// haiku task cards + speedometer
const ICONS = ['✉', '✓', '☰', '⚑', '✎', '☎'];
const cardTex = ICONS.map((ic, k) => canvasTex(200, 140, (x) => { x.fillStyle = 'rgba(30,90,200,0.55)'; rrect(x, 4, 4, 192, 132, 24); x.fill(); x.strokeStyle = '#7fc0ff'; x.lineWidth = 6; rrect(x, 4, 4, 192, 132, 24); x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 70px "DejaVu Sans"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic, 100, 72); }));
const cards = []; for (let k = 0; k < 36; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), holoMat(cardTex[k % 6])); scene.add(m); cards.push({ m, lane: (k * 7) % 6, ph: k / 36 }); }
const streaks = []; for (let k = 0; k < 40; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9 + rnd(), 0.012, 0.012), glow(k % 3 ? 0x5fb0ff : 0xffffff, 2)); scene.add(m); streaks.push({ m, y: 0.2 + rnd() * 1.8, z: -2.5 + rnd() * 3, ph: rnd() }); }
const gauge = new THREE.Group(); scene.add(gauge);
const gaugeTex = canvasTex(400, 400, (x) => { x.lineWidth = 26; for (let a = 0; a < 20; a++) { x.strokeStyle = `hsl(${210 - a * 10},90%,60%)`; x.beginPath(); x.arc(200, 220, 150, Math.PI * (0.8 + a * 0.07), Math.PI * (0.8 + (a + 0.8) * 0.07)); x.stroke(); } x.fillStyle = '#fff'; x.font = 'bold 52px "DejaVu Sans"'; x.textAlign = 'center'; x.fillText('SPEED', 200, 330); });
add(gauge, new THREE.PlaneGeometry(0.5, 0.5), holoMat(gaugeTex), 0, 0, 0, false);
const needle = new THREE.Group(); gauge.add(needle); needle.position.set(0, -0.025, 0.005);
add(needle, new THREE.BoxGeometry(0.012, 0.17, 0.005), glow(0xffffff, 2), 0, 0.085, 0, false);
// opus network + gears
const net = new THREE.Group(); scene.add(net);
const nodes = []; for (let k = 0; k < 22; k++) { const a = k * 2.399, r = 0.45 + (k % 5) * 0.12, y = 1.2 + ((k * 37) % 11) / 11 * 1.2; const m = add(net, new THREE.SphereGeometry(0.035, 12, 10), glow(0xffd76a, 1.4), Math.cos(a) * r, y, Math.sin(a) * r * 0.6 - 0.2, false); nodes.push(m); }
const edges = []; const lineMat = new THREE.LineBasicMaterial({ color: 0xffc850, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, toneMapped: false });
for (let k = 0; k < 34; k++) { const a = nodes[k % 22], b = nodes[(k * 5 + 3) % 22]; const geo = new THREE.BufferGeometry().setFromPoints([a.position, b.position]); const l = new THREE.Line(geo, lineMat.clone()); net.add(l); edges.push(l); }
function makeGear(r, teeth, col) { const g = new THREE.Group(); const m = plastic(col, { metalness: 0.6, roughness: 0.35 }); add(g, new THREE.CylinderGeometry(r, r, 0.05, 40), m).rotation.x = Math.PI / 2; for (let k = 0; k < teeth; k++) { const a = k / teeth * Math.PI * 2; const t = add(g, new THREE.BoxGeometry(r * 0.3, r * 0.25, 0.05), m, Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0); t.rotation.z = a; } add(g, new THREE.TorusGeometry(r * 0.35, r * 0.08, 8, 24), glow(0xffd76a, 1.1)); return g; }
const gears = [makeGear(0.32, 12, 0xd9a520), makeGear(0.2, 8, 0xc08a10), makeGear(0.24, 10, 0xe8b830)]; gears.forEach(g => scene.add(g));
// fable timeline + books
const tl = new THREE.Group(); scene.add(tl);
const TLN = 8, tlNodes = [], tlPts = [];
for (let k = 0; k < TLN; k++) { const a = -2.2 + k * 0.62; const p = new THREE.Vector3(Math.sin(a) * 1.0, 0.35 + k * 0.27, Math.cos(a) * 0.55 - 0.75); tlPts.push(p); }
const tlCurve = new THREE.CatmullRomCurve3(tlPts);
const tube = add(tl, new THREE.TubeGeometry(tlCurve, 120, 0.012, 8), new THREE.MeshBasicMaterial({ color: 0xff6ec4, transparent: true, opacity: 0.35, toneMapped: false }), 0, 0, 0, false);
const STEP = ['PLAN', 'SEARCH', 'READ', 'TEST', 'ANALYZE', 'BUILD', 'VERIFY', 'REPORT'];
tlPts.forEach((p, k) => { const n = add(tl, new THREE.OctahedronGeometry(0.05), glow(0xff6ec4, 2.5), p.x, p.y, p.z, false); const lt = canvasTex(256, 64, (x) => { x.fillStyle = '#fff'; x.font = 'bold 40px "DejaVu Sans"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(STEP[k], 128, 34); }); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), holoMat(lt)); l.position.set(p.x, p.y + 0.09, p.z); tl.add(l); tlNodes.push({ n, l }); });
const pulseDot = add(tl, new THREE.SphereGeometry(0.04, 16, 12), glow(0xffffff, 3), 0, 0, 0, false);
const books = []; const bookCols = [0xe0329a, 0x7a3cff, 0xffc23d, 0x3d93ff, 0x2ac3a2, 0xff7a45];
for (let k = 0; k < 6; k++) { const b = new THREE.Group(); add(b, new THREE.BoxGeometry(0.16, 0.22, 0.05), plastic(bookCols[k]), 0, 0, 0); add(b, new THREE.BoxGeometry(0.15, 0.2, 0.052), plastic(0xfff8e8), 0.006, 0, 0); scene.add(b); books.push(b); }

// comparison board
const pBoard = panel(2.6, 1.89, 2200, 1600, () => { });
let boardKey = '';
function drawBoard(st) {
  const x = pBoard.userData.tex.userData.ctx, w = 2200, h = 1600; x.clearRect(0, 0, w, h);
  x.fillStyle = 'rgba(10,20,50,0.78)'; rrect(x, 8, 8, w - 16, h - 16, 50); x.fill();
  x.strokeStyle = '#8fc4ff'; x.lineWidth = 8; rrect(x, 8, 8, w - 16, h - 16, 50); x.stroke();
  x.textBaseline = 'middle'; x.textAlign = 'center';
  x.fillStyle = '#fff'; x.font = 'bold 88px "DejaVu Sans"'; x.fillText('Claude Models Comparison', w / 2, 120);
  x.font = 'bold 44px "DejaVu Sans"'; x.fillStyle = '#9fb8e8'; x.fillText('Official specs • Claude API', w / 2, 210);
  const cx = [330, 900, 1290, 1800], top = 330;
  x.font = 'bold 50px "DejaVu Sans"'; x.fillStyle = '#cfe0ff';
  x.fillText('MODEL', cx[0], top);
  x.globalAlpha = st.ctx; x.fillText('CONTEXT', cx[1], top);
  x.globalAlpha = st.out; x.fillText('MAX OUTPUT', cx[2], top);
  x.globalAlpha = st.price; x.fillText('INPUT / OUTPUT', cx[3], top - 26); x.font = 'bold 36px "DejaVu Sans"'; x.fillText('$ per 1M tokens', cx[3], top + 30); x.globalAlpha = 1;
  const rows = [['Haiku 5.5', 'claude-haiku-5-5', '$0.10 / $0.50*'], ['Sonnet 5.5', 'claude-sonnet-5-5', '$2 / $10'], ['Opus 5.5', 'claude-opus-5-5', '$4 / $20'], ['Fable 5.2', 'claude-fable-5-2', '$8 / $40']];
  rows.forEach((r, i) => {
    const y = 520 + i * 230, hi = st.hi[i];
    x.fillStyle = HEX[i] + (hi > 0.05 ? '66' : '2a'); rrect(x, 60, y - 95, w - 120, 190, 36); x.fill();
    if (hi > 0.05) { x.globalAlpha = hi; x.strokeStyle = '#fff'; x.lineWidth = 8; rrect(x, 60, y - 95, w - 120, 190, 36); x.stroke(); x.globalAlpha = 1; }
    x.fillStyle = HEX[i]; x.beginPath(); x.arc(120, y, 26, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 70px "DejaVu Sans"'; x.fillText(r[0], cx[0] + 20, y - 24);
    x.font = '42px "DejaVu Sans Mono"'; x.fillStyle = '#c6d4f5'; x.fillText(r[1], cx[0] + 20, y + 46);
    x.font = 'bold 76px "DejaVu Sans"'; x.fillStyle = '#fff';
    x.globalAlpha = st.ctx; x.fillText('1M', cx[1], y);
    x.globalAlpha = st.out; x.fillText('128K', cx[2], y);
    x.globalAlpha = st.price; x.font = 'bold 70px "DejaVu Sans"'; x.fillStyle = hi > 0.05 ? '#ffffff' : '#e6eeff'; x.fillText(r[2], cx[3], y); x.globalAlpha = 1;
  });
  x.globalAlpha = st.x5; x.fillStyle = '#ffd27a'; x.font = 'bold 54px "DejaVu Sans"'; x.fillText('Output price = Input price × 5', w / 2, 1440); x.globalAlpha = 1;
  x.globalAlpha = st.price; x.fillStyle = '#9fb8e8'; x.font = 'bold 44px "DejaVu Sans"'; x.fillText('* Haiku 5.5: prompts ≤100K tokens ($0.50 / $2.50 above)', w / 2, 1530); x.globalAlpha = 1;
  pBoard.userData.tex.needsUpdate = true;
}
// CTA panel
const pCTA = panel(1.6, 0.62, 1600, 620, (x) => {
  holoFrame(x, 1600, 620, '#ffffff'); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#fff'; x.font = 'bold 84px "DejaVu Sans"'; x.fillText('Mee work ki correct', 800, 170); x.fillText('Claude ni choose cheskondi!', 800, 310);
  const labs = [['Haiku', 'Speed'], ['Sonnet', 'Balance'], ['Opus', 'Deep thinking'], ['Fable', 'Tough tasks']];
  labs.forEach((l, i) => { x.fillStyle = HEX[i]; x.font = 'bold 50px "DejaVu Sans"'; x.fillText(l[0], 230 + i * 380, 450); x.font = 'bold 40px "DejaVu Sans"'; x.fillStyle = '#e6eeff'; x.fillText(l[1], 230 + i * 380, 525); });
});

// ---------------- timeline ----------------
const LINES = TIMING.lines;
const LT = Object.fromEntries(LINES.map(l => [l.id, l]));
const F = (s) => Math.round(s * FPS);
// shot boundaries (frames)
const S = {
  A: 0, B: 100, C: F(LT.s1.t1) - 92, D: F(LT.s2.t0) - 6, E: F(LT.s3.t0) - 5, Fo: F(LT.s4.t0) - 5, G: F(LT.s5.t0) - 5, Hc: F(LT.s6.t0) - 5, I: F(LT.s7.t0) - 5, END: TIMING.N
};
const CUTS = [S.D, S.E, S.Fo, S.G, S.Hc, S.I];
function speakerAt(t) { for (const l of LINES) if (t >= l.t0 - 0.05 && t <= l.t1 + 0.05) return l.who; return null; }
function envAt(f) { const e = TIMING.env; const a = e[Math.max(0, f - 1)] || 0, b = e[f] || 0, c = e[f + 1] || 0; return clamp(0.25 * a + 0.5 * b + 0.25 * c, 0, 1.2); }

// camera keys per shot: [pos, target, fov]
const CAM = [
  [S.A, S.B, [0, 4.6, 11], [0, 1.6, -2], 46, [0.6, 1.5, 2.9], [0, 1.45, 0], 38, 'io'],
  [S.B, S.C, [0.6, 1.5, 2.9], [0, 1.45, 0], 38, [-0.55, 1.55, 2.6], [0, 1.55, 0], 36, 'lin'],
  [S.C, S.D, [-0.55, 1.55, 2.6], [0, 1.55, 0], 36, [0, 2.7, 7.6], [0, 1.4, -1.5], 46, 'io'],
  [S.D, S.D + 42, [2.6, 0.85, 0.9], [-2.1, 0.9, -2.8], 48, [0.9, 1.15, 2.7], [0, 1.0, -0.6], 44, 'out'],
  [S.D + 42, S.E, [0.9, 1.15, 2.7], [0, 1.05, -0.6], 44, [-0.9, 1.35, 3.0], [0, 1.15, -0.6], 46, 'lin'],
  [S.E, S.Fo, [-1.4, 1.7, 3.4], [0, 1.55, -0.6], 46, [1.3, 1.5, 3.6], [0, 1.55, -0.6], 46, 'io'],
  [S.Fo, S.G, [0.45, 0.22, 2.3], [0, 1.5, -0.6], 50, [-0.5, 0.32, 2.0], [0, 1.6, -0.6], 52, 'io'],
  [S.G, S.Hc, [1.7, 1.7, 2.6], [0.2, 1.3, -0.8], 46, [-1.3, 1.35, 2.6], [-0.1, 1.45, -0.7], 46, 'io'],
  [S.Hc, S.I, [0.15, 1.75, 4.7], [0, 1.75, -1.0], 50, [-0.1, 1.8, 4.3], [0, 1.8, -1.0], 50, 'lin'],
  [S.I, S.END, [0, 1.5, 2.7], [0, 1.4, 0], 40, [0.3, 1.85, 5.0], [0, 1.75, -0.6], 46, 'io2'],
];
function camAt(f) {
  let c = CAM[CAM.length - 1]; for (const k of CAM) if (f >= k[0] && f < k[1]) { c = k; break; }
  let u = (f - c[0]) / (c[1] - c[0]);
  u = c[8] === 'io' ? smr(u) : c[8] === 'out' ? easeOut(u) : c[8] === 'io2' ? smr(clamp((u - 0.25) / 0.75)) * 0.95 + u * 0.05 : u;
  const p = lerp3(c[2], c[5], u), t = lerp3(c[3], c[6], u), fov = lerp(c[4], c[7], u);
  const tt = T(f); p[0] += Math.sin(tt * 0.7) * 0.03; p[1] += Math.sin(tt * 0.9 + 1) * 0.02;
  // impact shake for cuts
  for (const cf of CUTS) { const d = f - cf; if (d >= 0 && d < 7) { const a = (1 - d / 7) * 0.025; p[0] += Math.sin(d * 9) * a; p[1] += Math.cos(d * 11) * a; } }
  return { p, t, fov };
}

// ---------------- per-frame state ----------------
const STAGE = [0, 0.18, -0.6];
function robotPose(i, f) {
  const t = T(f); let pos = [PODX[i], 0.2, PODZ], ry = 0, sc = 1, power = 1, hl = 0;
  const pon = S.C + 20 + i * 12; if (f < S.D) power = sm(pon, pon + 10, f);
  const seg = [S.D, S.E, S.Fo, S.G][i], segEnd = [S.E, S.Fo, S.G, S.Hc][i];
  if (f >= seg && f < segEnd) {
    if (i === 0 && f < seg + 36) { const u = easeOut((f - seg) / 36); pos = lerp3([PODX[0], 0.6, PODZ], STAGE, u); ry = lerp(1.2, 0, u); }
    else pos = STAGE.slice();
    hl = 1;
  }
  if (f >= S.Hc && f < S.I) { pos = [[-1.0, -0.34, 0.34, 1.0][i], 0.12, -0.3]; sc = 0.72; }
  if (f >= S.I) { pos = [[-1.25, -0.42, 0.42, 1.25][i], 0.2, -1.5]; sc = 0.82; }
  pos[1] += Math.sin(t * 2.2 + i * 1.3) * 0.04 * power;
  return { pos, ry, sc, power, hl };
}
function setArm(a, z, x = 0) { a.rotation.set(x, 0, z); }

function update(f) {
  const t = T(f), spk = speakerAt(t), env = envAt(f);
  // camera
  const c = camAt(f); camera.position.set(...c.p); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(...c.t);
  // scientist placement
  let sp = [0, 0, 0], sry = 0, svis = true;
  if (f >= S.D && f < S.Hc) { sp = [-1.85, 0, 0.9]; sry = 0.9; }
  if (f >= S.Hc && f < S.I) svis = false;
  if (f >= S.I) sp = [0, 0, 0.25];
  sci.visible = svis; sci.position.set(...sp); sci.rotation.y = sry;
  const U = sci.userData; const talking = spk === 'sci';
  sci.position.y += Math.abs(Math.sin(t * 2.4)) * 0.012;
  U.head.rotation.set(Math.sin(t * 1.3) * 0.04 + (talking ? env * 0.05 : 0), Math.sin(t * 0.8) * 0.1, Math.sin(t * 1.1) * 0.04);
  U.mouth.scale.set(1 + (talking ? env * 0.25 : 0), talking ? 0.25 + env * 0.9 : 0.22, 0.4);
  const blink = [1.2, 3.9, 6.1, 9.3, 12.4, 15.8, 19.1, 22.0, 26.4, 31.2, 37.5, 41.8, 45.9, 51.3, 54.6, 58.2].some(b => Math.abs(t - b) < 0.07);
  U.eyes.forEach(e => { e.scale.y = blink ? 0.1 : 1; e.userData.brow.position.y = 0.13 + (talking ? env * 0.015 : 0); });
  // arm gestures
  const [aL, aR] = U.arms; let lz = 0.12, rz = -0.12, lx = 0, rx = 0, le = 0, re = 0;
  if (f < S.B + 20) { const w = sm(10, 30, f) * (1 - sm(S.B, S.B + 20, f)); rz = lerp(-0.12, -2.5, w) + Math.sin(t * 12) * 0.3 * w; re = -0.6 * w; }
  else if (f < S.C) { const w = sm(S.B + 40, S.B + 60, f); lz = lerp(0.12, 0.9, w); rz = lerp(-0.12, -0.9, w); lx = rx = -0.6 * w; le = re = -0.5 * w; }
  else if (f < S.D) { const w = sm(S.C, S.C + 15, f); rz = lerp(-0.12, -1.4, w); rx = -0.9 * w; lz = 0.2; }
  else if (f < S.Hc) { rz = -0.5; rx = -0.6 + Math.sin(t * 2) * 0.1; re = -0.8; lz = 0.15; }
  else { const k = sm(S.I, S.I + 12, f); rz = lerp(-0.12, -0.7, k) + Math.sin(t * 3) * 0.08 * k; rx = -0.8 * k; re = -0.9 * k; lz = lerp(0.12, 0.7, k) - Math.sin(t * 3) * 0.08 * k; lx = -0.8 * k; le = -0.9 * k;
    const fin = sm(F(LT.s7.t1) - 70, F(LT.s7.t1) - 50, f); rz = lerp(rz, -2.7, fin); re = lerp(re, -0.2, fin); rx = lerp(rx, 0, fin); }
  setArm(aL.piv, lz, lx); setArm(aR.piv, rz, rx); aL.elbow.rotation.x = le; aR.elbow.rotation.x = re;
  // robots
  const whoIdx = { haiku: 0, sonnet: 1, opus: 2, fable: 3 }[spk];
  // compare highlight times
  const priceT = [LT.s6.t0 + (44.69 - 36.62) / (50.54 - 36.62) * (LT.s6.t1 - LT.s6.t0)];
  const s6u = (x) => LT.s6.t0 + (x - 36.62) / (50.54 - 36.62) * (LT.s6.t1 - LT.s6.t0);
  const PRICE = [s6u(44.69), s6u(45.45), s6u(46.12), s6u(46.9)];
  const s7u = (x) => LT.s7.t0 + (x - 50.74) / (59.57 - 50.74) * (LT.s7.t1 - LT.s7.t0);
  const CTAH = [s7u(50.74), s7u(52.15), s7u(53.49), s7u(55.4)];
  robots.forEach((r, i) => {
    const P = robotPose(i, f), R = r.userData;
    r.position.set(...P.pos); r.scale.setScalar(P.sc * 0.82);
    let ry = P.ry;
    if (f >= S.D && f < S.Hc && P.hl === 0) ry = Math.atan2(STAGE[0] - P.pos[0], STAGE[2] - P.pos[2]) * 0.5;
    r.rotation.y = ry + Math.sin(t * 0.9 + i) * 0.06;
    const talk = whoIdx === i;
    let bounce = 0;
    if (f >= S.Hc && f < S.I) bounce = pulse(t, PRICE[i] + 0.2, 0.25);
    if (f >= S.I) bounce = pulse(t, CTAH[i] + 0.2, 0.3);
    r.position.y += bounce * 0.18;
    R.body.rotation.z = Math.sin(t * 1.7 + i) * 0.03 + (i === 0 && f >= S.D && f < S.D + 36 ? -0.25 * (1 - (f - S.D) / 36) : 0);
    R.head.rotation.set(Math.sin(t * 1.5 + i) * 0.05 - (talk ? env * 0.06 : 0), Math.sin(t * 0.7 + i * 2) * 0.12, Math.sin(t + i) * 0.05);
    const bl = [2.1, 5.3, 8.8, 13.0, 17.2, 21.5, 25.1, 28.4, 33.0, 38.6, 44.0, 49.2, 53.0, 57.1].some(b => Math.abs(t - b - i * 0.4) < 0.06);
    const pw = P.power;
    R.eyes.forEach(e => { e.scale.y = (bl ? 0.15 : 1) * Math.max(0.05, pw) * (talk ? 1.1 : 1); e.material.color.setScalar(1.4 * pw); });
    R.eyeGlow.forEach(e => e.material.opacity = 0.3 * pw);
    R.mouth.scale.set(talk ? 1 + env * 0.6 : 0.8, talk ? 1 + env * 4.2 : 1, 1); R.mouth.material.color.setScalar(1.3 * pw);
    const glowK = (0.5 + 0.5 * pw) * (1 + bounce + (talk ? env * 0.4 : 0));
    R.tip.material.color.set(R.col).multiplyScalar(1.6 * glowK * pw + 0.2); R.core.material.color.set(R.col).multiplyScalar(1.6 * glowK * pw + 0.2);
    R.hr.material.color.set(R.col).multiplyScalar(1.5 * pw + 0.1); R.jet.material.opacity = 0.2 * pw;
    R.ant.rotation.z = Math.sin(t * 3 + i) * 0.1;
    // arms
    let al = 0.15, ar = -0.15, alx = 0, arx = 0;
    if (talk) { ar = -0.5 - env * 0.5; arx = -0.6; al = 0.3 + Math.sin(t * 4) * 0.1; }
    if (bounce > 0.2) { al = 2.4 * bounce; ar = -2.4 * bounce; }
    if (i === 1 && f >= S.E && f < S.Fo) { arx = -1.2 + Math.sin(t * 14) * 0.15; alx = -1.2 + Math.cos(t * 14) * 0.15; ar = -0.25; al = 0.25; }
    if (i === 2 && f >= S.Fo && f < S.G) { ar = -2.6; arx = -0.3; }
    R.arms[0].rotation.set(alx, 0, al * -1 * -1 + 0); R.arms[1].rotation.set(arx, 0, ar);
    R.arms[0].rotation.z = al;
    if (R.cape) { const pos = R.cape.geometry.attributes.position, b = R.cape.userData.base; for (let k = 0; k < pos.count; k++) { const yy = b[k * 3 + 1], xx = b[k * 3]; const d = (0.425 - yy); pos.array[k * 3 + 2] = b[k * 3 + 2] - d * 0.25 - Math.sin(xx * 6 + t * 4 + yy * 3) * 0.04 * d; } pos.needsUpdate = true; R.cape.geometry.computeVertexNormals(); }
    // pods
    const pod = pods[i]; pod.beam.material.opacity = (f < S.D ? 0.07 * pw : 0.02) * (1 + 0.3 * Math.sin(t * 5 + i)); pod.ring.material.color.set(COLORS[i]).multiplyScalar(0.3 + 1.2 * pw);
  });
  // stage light colour
  const segCol = f >= S.D && f < S.Hc ? COLORS[[S.D, S.E, S.Fo, S.G].filter(s => f >= s).length - 1] : 0x66ccff;
  stageRing.material.color.set(segCol).multiplyScalar(1.5); stageLight.color.set(segCol); stageLight.intensity = f >= S.D && f < S.Hc ? 1.5 : 0;
  // panels default hidden
  for (const p of [pTitle, pFour, pHaiku, pSonnet, pOpus, pFable, pCode, pBal, pBoard, pCTA]) p.visible = false;
  const showP = (p, a, b, pos, s = 1, face = true) => { if (f < a || f >= b) return; const k = easeOutBack((f - a) / 12) * (1 - sm(b - 6, b, f)); p.visible = k > 0.01; p.position.set(...pos); p.scale.set(s * k, s * Math.max(0.01, k), 1); p.material.opacity = clamp(k) * (0.95 + 0.05 * Math.sin(t * 20)); if (face) p.quaternion.copy(camera.quaternion); };
  showP(pTitle, S.B + 35, S.C + 10, [0, 2.12, 0.1], 0.82);
  showP(pFour, S.C + 30, S.D, [0, 3.0, -2.6], 1.9);
  showP(pHaiku, S.D + 40, S.E, [0, 2.15, -0.9], 1.0);
  showP(pSonnet, S.E + 4, S.E + 75, [0, 2.3, -1.0], 0.95);
  showP(pCode, S.E + 60, S.Fo, [0.02, 2.0, -1.15], 1.0);
  showP(pBal, S.E + 75, S.Fo, [-0.5, 1.15, -0.2], 0.7);
  showP(pOpus, S.Fo + 6, S.G, [0, 2.55, -1.0], 0.95);
  showP(pFable, S.G + 4, S.G + 90, [0, 2.45, -1.1], 1.0);
  showP(pBoard, S.Hc + 6, S.I, [0, 2.25, -1.0], 1.0, false);
  showP(pCTA, F(LT.s7.t1) - 85, S.END + 30, [0, 2.5, -0.2], 1.15);
  if (pCode.visible) { const n = Math.floor(clamp((f - S.E - 66) / 120) * CODELEN); if (n !== codeKey) { codeKey = n; drawCode(n); } }
  if (pBoard.visible) {
    const st = { ctx: sm(F(LT.s6.t0) - 3, F(LT.s6.t0) + 9, f), out: sm(F(s6u(39.23)) - 6, F(s6u(39.23)) + 6, f), price: sm(F(s6u(41.6)) - 6, F(s6u(41.6)) + 6, f), x5: sm(F(s6u(47.65)) - 6, F(s6u(47.65)) + 6, f), hi: PRICE.map((p, i) => Math.round(clamp(pulse(t, p + 0.35, 0.45) * 1.4) * 10) / 10) };
    const k = JSON.stringify(st); if (k !== boardKey) { boardKey = k; drawBoard(st); }
  }
  // haiku FX
  const hOn = f >= S.D && f < S.E;
  streaks.forEach((s, k) => { const on = hOn && f < S.D + 50; s.m.visible = on; if (on) { const u = ((t * 2.2 + s.ph) % 1); s.m.position.set(lerp(4, -4, u), s.y, s.z); } });
  cards.forEach((c, k) => { const on = hOn && f > S.D + 30; c.m.visible = on; if (!on) return; const u = ((t * 0.55 + c.ph) % 1); const y = 0.55 + c.lane * 0.22; const x = lerp(1.6, -1.6, u); const near = Math.abs(x) < 0.35; c.m.position.set(x, y + Math.sin(u * 12 + k) * 0.02, -0.25 - (c.lane % 2) * 0.35); c.m.quaternion.copy(camera.quaternion); const s = near ? 1.25 : 1; c.m.scale.set(s, s, 1); c.m.material.opacity = sm(0, 0.12, u) * (1 - sm(0.88, 1, u)); c.m.material.map = cardTex[x < 0 ? 1 : k % 6]; });
  gauge.visible = hOn && f > S.D + 45; gauge.position.set(0.42, 1.85, -0.3); gauge.quaternion.copy(camera.quaternion); needle.rotation.z = lerp(2.0, -2.1, easeOutBack(clamp((f - S.D - 50) / 30))) + Math.sin(t * 30) * 0.03;
  // opus FX
  const oOn = f >= S.Fo && f < S.G; net.visible = oOn; net.position.set(0, 0, -0.6); net.rotation.y = t * 0.25;
  nodes.forEach((n, k) => { const a = sm(S.Fo + k * 4, S.Fo + k * 4 + 8, f); n.scale.setScalar(a * (1 + 0.3 * Math.sin(t * 6 + k))); });
  edges.forEach((e, k) => { e.material.opacity = 0.75 * sm(S.Fo + 20 + k * 3, S.Fo + 30 + k * 3, f) * (0.6 + 0.4 * Math.sin(t * 8 + k)); });
  gears.forEach((g, k) => { g.visible = oOn; g.position.set([-0.85, -0.55, 0.85][k], [1.9, 2.35, 1.95][k], -1.4); g.rotation.z = (k % 2 ? -1 : 1) * t * (1.2 / (k + 1)) * 1.5; g.scale.setScalar(easeOutBack((f - S.Fo - 10 - k * 6) / 14)); });
  // fable FX
  const fOn = f >= S.G && f < S.Hc; tl.visible = fOn; tl.position.set(0, 0, -0.1);
  const prog = clamp((f - S.G - 15) / (S.Hc - S.G - 45));
  tlNodes.forEach((o, k) => { const on = prog * (TLN - 1) >= k - 0.01; o.n.scale.setScalar(on ? 1.4 + 0.3 * Math.sin(t * 6 + k) : 0.7); o.n.material.color.set(on ? 0xffffff : 0xff6ec4).multiplyScalar(on ? 2.6 : 1.2); o.l.material.opacity = on ? 1 : 0.25; o.l.quaternion.copy(camera.quaternion); });
  pulseDot.position.copy(tlCurve.getPoint(prog)); tube.material.opacity = 0.25 + 0.15 * Math.sin(t * 3);
  books.forEach((b, k) => { b.visible = fOn; const a = t * 0.9 + k * (Math.PI * 2 / 6); b.position.set(Math.cos(a) * 0.75, 1.0 + Math.sin(a * 2 + k) * 0.15 + 0.2, -0.6 + Math.sin(a) * 0.45); b.rotation.set(0.3, -a, 0.2 * Math.sin(t + k)); b.scale.setScalar(sm(S.G + k * 4, S.G + 12 + k * 4, f)); });
  // particles
  for (let k = 0; k < PN; k++) { const b = pbase[k]; pp[k * 3] = b[0] + Math.sin(t * 0.3 + b[3]) * 0.3; pp[k * 3 + 1] = (b[1] + t * 0.08) % 6; pp[k * 3 + 2] = b[2] + Math.cos(t * 0.25 + b[3]) * 0.3; }
  pgeo.attributes.position.needsUpdate = true;
  key.shadow.camera.updateProjectionMatrix();
}

// ---------------- 2D compositor ----------------
const out = document.getElementById('out'), ox = out.getContext('2d');
const SPK = { sci: ['Scientist', '#ffffff'], haiku: ['Haiku 5.5', HEX[0]], sonnet: ['Sonnet 5.5', HEX[1]], opus: ['Opus 5.5', HEX[2]], fable: ['Fable 5.2', HEX[3]] };
function wrap(ctx, text, maxW) { const words = text.split(' '); const lines = []; let cur = ''; for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; } if (cur) lines.push(cur); return lines; }
function composite(f) {
  const t = T(f);
  ox.drawImage(glc, 0, 0);
  // vignette
  const v = ox.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.5, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,10,0.55)'); ox.fillStyle = v; ox.fillRect(0, 0, W, H);
  // cut flash (light sweep)
  for (const cf of CUTS) {
    const d = f - cf;
    if (d >= -4 && d < 8) { const a = d < 0 ? (d + 4) / 4 : 1 - d / 8; ox.fillStyle = `rgba(255,255,255,${0.85 * clamp(a) ** 1.5})`; ox.fillRect(0, 0, W, H); }
  }
  if (f < 12) { ox.fillStyle = `rgba(0,0,0,${1 - f / 12})`; ox.fillRect(0, 0, W, H); }
  // subtitles
  const s = TIMING.subs.find(s => t >= s.t0 - 0.05 && t < s.t1 + 0.12);
  if (s) {
    const a = clamp(Math.min((t - s.t0 + 0.05) / 0.12, (s.t1 + 0.12 - t) / 0.12));
    ox.font = 'bold 54px "DejaVu Sans"'; const lines = wrap(ox, s.text, 900);
    const lh = 84, bh = lines.length * lh + 44, by = (f >= S.Hc && f < S.I ? 1690 : 1460) - bh / 2 + 40;
    ox.globalAlpha = a;
    ox.fillStyle = 'rgba(6,10,28,0.72)'; rrect(ox, 60, by, W - 120, bh, 34); ox.fill();
    const [nm, col] = SPK[s.who];
    ox.font = 'bold 36px "DejaVu Sans"'; const nw = ox.measureText(nm).width + 48;
    ox.fillStyle = col; rrect(ox, W / 2 - nw / 2, by - 30, nw, 58, 29); ox.fill();
    ox.fillStyle = s.who === 'sci' ? '#0a1030' : '#ffffff'; ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.fillText(nm, W / 2, by - 1);
    ox.font = 'bold 54px "DejaVu Sans"';
    lines.forEach((L, i) => { const y = by + 22 + lh / 2 + i * lh + 6; ox.lineWidth = 8; ox.strokeStyle = 'rgba(0,0,0,0.6)'; ox.strokeText(L, W / 2, y); ox.fillStyle = '#ffffff'; ox.fillText(L, W / 2, y); });
    ox.globalAlpha = 1;
  }
}

window.renderFrame = (f) => { update(f); composer.render(); composite(f); return out.toDataURL('image/jpeg', 0.93); };
window.SHOTS = S;
window.ready = true;

// 3D world. Pure presentation: game state lives in engine.js, this file only shows it.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { buildHero } from "./hero3d.js";

const C = {
  sea: 0x0f8b8d, seaDeep: 0x0a5c63, sand: 0xf4dfb0, paper: 0xfff8e8, sunset: 0xff6a3d,
  pineapple: 0xffc531, leaf: 0x2e7d4f, ink: 0x3a2317, wood: 0xb07a4a, woodDark: 0x7a4f2c,
  skin: 0xf1c29e, hair: 0x6b4226, straw: 0xe8cf8f,
};

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra });
}
function mesh(geo, material, { x = 0, y = 0, z = 0, cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ textures

function shirtTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#0f8b8d"; g.fillRect(0, 0, w, h);
    const leaf = (x, y, r, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "#2e7d4f";
      for (let i = -2; i <= 2; i++) {
        g.beginPath(); g.ellipse(i * 9, -r * 0.4, 6, r * 0.55, i * 0.35, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    };
    const flower = (x, y, r) => {
      g.fillStyle = "#ff6a3d";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.beginPath(); g.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = "#ffc531"; g.beginPath(); g.arc(x, y, r * 0.35, 0, Math.PI * 2); g.fill();
    };
    leaf(50, 90, 60, -0.5); leaf(190, 220, 55, 0.7); leaf(200, 70, 45, 2.4);
    flower(140, 60, 16); flower(60, 200, 14); flower(230, 150, 12);
    g.fillStyle = "#fff8e8";
    for (const [x, y] of [[100, 140], [20, 30], [170, 120], [120, 240]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  }, true);
}

function stripeTexture([a, b] = ["#ff6a3d", "#fff8e8"]) {
  return canvasTex(256, 64, (g, w, h) => {
    const n = 8;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * w) / n, 0, w / n, h); }
  }, true);
}

function woodTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      g.fillStyle = i % 2 ? "#b07a4a" : "#a56f41";
      g.fillRect(0, (i * h) / rows, w, h / rows);
      g.fillStyle = "rgba(58,35,23,.35)"; g.fillRect(0, ((i + 1) * h) / rows - 2, w, 2);
      g.strokeStyle = "rgba(58,35,23,.12)";
      for (let k = 0; k < 4; k++) {
        g.beginPath(); const y = (i + 0.2 + k * 0.2) * (h / rows);
        g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y); g.stroke();
      }
    }
  }, true);
}

function signTexture() {
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = "#fff8e8"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3a2317"; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    g.font = '400 128px "Shrikhand", Georgia, serif';
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#3a2317"; g.fillText("Pineapple Barista", w / 2 + 6, h / 2 + 10);
    g.fillStyle = "#ff6a3d"; g.fillText("Pineapple Barista", w / 2, h / 2 + 4);
  });
}

function skyTexture(stops = ["#5fb8c9", "#ffd7a1", "#ffb07a", "#ff8e5e"]) {
  return canvasTex(8, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    [0, 0.45, 0.75, 1].forEach((o, i) => gr.addColorStop(o, stops[i]));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

function cobbleTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#8f847a"; g.fillRect(0, 0, w, h);
    const r = mulberry(3);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < w; x += 32) {
      const c = 170 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${c},${c - 8},${c - 18})`;
      g.beginPath(); g.ellipse(x + 16, y + 16, 13, 12, 0, 0, 7); g.fill();
    }
  }, true);
}

function windowsTexture(base) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 30; y < h - 20; y += 56) for (let x = 18; x < w - 20; x += 50) {
      g.fillStyle = "#3a2317"; g.fillRect(x - 3, y - 3, 34, 42);
      g.fillStyle = "#cfe6ee"; g.fillRect(x, y, 28, 36);
      g.fillStyle = "#e0876a"; g.fillRect(x - 5, y + 36, 38, 6);
    }
  });
}

const THEMES = {
  1: { sky: ["#5fb8c9", "#ffd7a1", "#ffb07a", "#ff8e5e"], fog: 0xffc9a0, ground: 0xf4dfb0, awning: ["#ff6a3d", "#fff8e8"], palms: true, sea: true, sun: 0xffe2bf },
  2: { sky: ["#3fa9d6", "#9fd8ee", "#ffe3b0", "#ffc98a"], fog: 0xcfe8f0, ground: 0xf4dfb0, awning: ["#0f8b8d", "#fff8e8"], palms: true, sea: true, sun: 0xfff1dc },
  3: { sky: ["#7fb0d8", "#c9dff0", "#f3e2c8", "#e8c9a0"], fog: 0xe8dccb, ground: 0xb9ada0, awning: ["#2e7d4f", "#fff8e8"], palms: false, sea: false, sun: 0xfff1dc },
  4: { sky: ["#2e3a5c", "#7a5a8a", "#e0876a", "#f2b27a"], fog: 0x9a6f7a, ground: 0xe2c690, awning: ["#3a2317", "#ffc531"], palms: true, sea: true, sun: 0xffb98a },
};

function pineappleTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#ffc531"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c98f10"; g.lineWidth = 5;
    for (let i = -w; i < w * 2; i += 26) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
  }, true);
}

// ------------------------------------------------------------------ props

function palm(height = 5, lean = 0.5) {
  const g = new THREE.Group();
  const trunkMat = mat(0x9c6b3e);
  const segs = 7;
  let top = new THREE.Vector3();
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const r = 0.22 - t * 0.08;
    const seg = mesh(new THREE.CylinderGeometry(r * 0.92, r, height / segs + 0.05, 7), trunkMat);
    const x = Math.pow(t, 1.6) * lean * height * 0.35;
    seg.position.set(x, t * height + height / segs / 2, 0);
    seg.rotation.z = -lean * 0.35 * t;
    g.add(seg);
    top.set(x, (t + 1 / segs) * height, 0);
  }
  const leafMat = mat(C.leaf, { side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.PlaneGeometry(0.55, 2.4, 1, 8);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k) + 1.2; // 0..2.4 along leaf
      p.setZ(k, -0.18 * y * y);
      p.setX(k, p.getX(k) * (1 - y / 2.6));
    }
    geo.translate(0, 1.2, 0);
    geo.computeVertexNormals();
    const leaf = mesh(geo, leafMat);
    leaf.position.copy(top);
    leaf.rotation.set(-Math.PI / 2 + 0.5, (i / 8) * Math.PI * 2, 0, "YXZ");
    g.add(leaf);
  }
  const coco = mat(0x5a3b1e);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), coco, { x: top.x + Math.cos(a) * 0.2, y: top.y - 0.15, z: Math.sin(a) * 0.2 }));
  }
  return g;
}

function bigPineapple() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshStandardMaterial({ map: pineappleTexture(), roughness: 0.8 }));
  body.scale.set(1, 1.35, 1);
  body.position.y = 0.75;
  g.add(body);
  const leafMat = mat(C.leaf);
  for (let i = 0; i < 9; i++) {
    const cone = mesh(new THREE.ConeGeometry(0.1, 0.9 - (i % 3) * 0.15, 4), leafMat);
    const a = (i / 9) * Math.PI * 2;
    cone.position.set(Math.cos(a) * 0.1, 1.75, Math.sin(a) * 0.1);
    cone.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(cone);
  }
  return g;
}

// ------------------------------------------------------------------ people

const GUEST_LOOK = {
  tourist:     { shirt: 0xff9ec7, pants: 0xf2f2f2, hat: "sunhat", extra: "camera" },
  local:       { shirt: 0x5ec27a, pants: 0x2f6fb5, hat: null, extra: "tank" },
  student:     { shirt: 0x7b6cf0, pants: 0x3a3f58, hat: "cap", extra: "backpack" },
  office_rush: { shirt: 0x39414f, pants: 0x2a2f3a, hat: null, extra: "tie" },
  connoisseur: { shirt: 0x8a3b5a, pants: 0x3a2317, hat: "beret", extra: "scarf" },
};
const SKINS = [0xf1c29e, 0xe0a883, 0xc68a62, 0x9a6545, 0x7a4b31, 0xf6d3b8];
const HAIRS = [0x2b1d14, 0x6b4226, 0xd8b36a, 0x1a1a1a, 0x8c5a2b, 0xb8b0a8];

function makeGuest(type, critic, rnd) {
  const look = GUEST_LOOK[type] || GUEST_LOOK.local;
  const g = new THREE.Group();
  const skin = mat(SKINS[Math.floor(rnd() * SKINS.length)]);
  const hairM = mat(HAIRS[Math.floor(rnd() * HAIRS.length)]);
  const shirt = mat(look.shirt), pants = mat(look.pants);
  const scale = 0.92 + rnd() * 0.16;

  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.12, 0.85, 0);
    pivot.add(mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.82, 8), pants, { y: -0.41 }));
    g.add(pivot);
    legs.push(pivot);
  }
  g.add(mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.7, 12), shirt, { y: 1.2 }));
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.33, 1.5, 0);
    pivot.add(mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.62, 8), look.extra === "tank" ? skin : shirt, { y: -0.3 }));
    pivot.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), skin, { y: -0.64 }));
    pivot.rotation.z = s * 0.1;
    g.add(pivot);
    arms.push(pivot);
  }
  const head = new THREE.Group();
  head.position.y = 1.78;
  const skull = mesh(new THREE.SphereGeometry(0.19, 14, 10), skin);
  skull.scale.set(0.95, 1.1, 1);
  head.add(skull);
  head.add(mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairM, { y: 0.03 }));
  const eyes = mat(C.ink);
  for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(0.022, 6, 5), eyes, { x: s * 0.07, y: 0.02, z: 0.17, cast: false }));
  g.add(head);

  if (look.hat === "sunhat") {
    head.add(mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.02, 20), mat(0xfff1c9), { y: 0.14 }));
    head.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 14), mat(0xfff1c9), { y: 0.2 }));
    head.add(mesh(new THREE.BoxGeometry(0.22, 0.05, 0.03), eyes, { y: 0.02, z: 0.18, cast: false }));
  } else if (look.hat === "cap") {
    head.add(mesh(new THREE.SphereGeometry(0.205, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(0xff6a3d), { y: 0.04 }));
    head.add(mesh(new THREE.BoxGeometry(0.2, 0.02, 0.18), mat(0xff6a3d), { y: 0.1, z: -0.24 }));
  } else if (look.hat === "beret") {
    const b = mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.07, 16), mat(0x1c1c28), { y: 0.17, x: 0.03 });
    b.rotation.z = -0.2;
    head.add(b);
  }
  if (look.extra === "camera") g.add(mesh(new THREE.BoxGeometry(0.16, 0.1, 0.08), mat(0x222222), { y: 1.35, z: 0.27 }));
  if (look.extra === "backpack") g.add(mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), mat(0xffc531), { y: 1.22, z: -0.3 }));
  if (look.extra === "tie") g.add(mesh(new THREE.BoxGeometry(0.06, 0.4, 0.02), mat(0xd8452b), { y: 1.3, z: 0.27 }));
  if (look.extra === "scarf") g.add(mesh(new THREE.TorusGeometry(0.17, 0.05, 6, 14), mat(0xffc531), { y: 1.56 }).rotateX(Math.PI / 2));
  if (critic) {
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.26, 0.03), mat(C.paper), { x: 0.3, y: 1.1, z: 0.2 }));
  }
  g.scale.setScalar(scale);
  return { group: g, legs, arms, head };
}

// ------------------------------------------------------------------ cup

const LAYER = {
  shot: 0x4a2a17, milk: 0xf3e6cf, foam: 0xffffff, water: 0x8a5a36, syrup: 0xd9912b, ice: 0xdff6ff,
  chocolate: 0x5a2f1a, cold_brew: 0x3a2014, matcha: 0x8bbf5a, ice_cream: 0xfff1d6, pineapple: 0xffc531, pour_over: 0x6b3d22,
};

function makeCup(size) {
  const g = new THREE.Group();
  const h = size === "L" ? 0.34 : 0.27;
  const r = size === "L" ? 0.12 : 0.105;
  const cup = mesh(new THREE.CylinderGeometry(r, r * 0.78, h, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  cup.position.y = h / 2;
  g.add(cup);
  g.add(mesh(new THREE.CylinderGeometry(r * 1.02, r * 0.9, h * 0.35, 16, 1, true), mat(C.sunset, { side: THREE.DoubleSide }), { y: h * 0.45 }));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.01, 16), mat(C.paper), { y: 0.005 }));
  g.userData = { h, r, layers: new THREE.Group(), count: 0 };
  g.add(g.userData.layers);
  return g;
}

function setCupLayers(cupG, steps) {
  const { h, r, layers } = cupG.userData;
  if (cupG.userData.count === steps.length) return;
  cupG.userData.count = steps.length;
  layers.clear();
  const n = Math.max(steps.length, 1);
  const step = (h * 0.9) / Math.max(n, 3);
  steps.forEach((s, i) => {
    const y0 = i * step;
    const rr = r * 0.78 + (r - r * 0.78) * ((y0 + step / 2) / h) - 0.004;
    if (s === "ice") {
      for (let k = 0; k < 3; k++) {
        const cube = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: LAYER.ice, transparent: true, opacity: 0.8, roughness: 0.2 }), { cast: false });
        cube.position.set(Math.cos(k * 2.1) * rr * 0.5, y0 + step / 2, Math.sin(k * 2.1) * rr * 0.5);
        cube.rotation.set(k, k * 2, 0);
        layers.add(cube);
      }
    } else {
      layers.add(mesh(new THREE.CylinderGeometry(rr, rr, step * 0.98, 16), mat(LAYER[s] ?? 0x996633), { y: y0 + step / 2, cast: false }));
    }
  });
}

// ------------------------------------------------------------------ world

const QUEUE_SLOTS = [
  new THREE.Vector3(-1.35, 0, 1.6),
  new THREE.Vector3(-1.95, 0, 2.85),
  new THREE.Vector3(-2.55, 0, 4.1),
  new THREE.Vector3(-3.15, 0, 5.35),
  new THREE.Vector3(-3.75, 0, 6.6),
];
const ENTRY = new THREE.Vector3(-11, 0, 9);
const EXIT = new THREE.Vector3(10, 0, 7.5);
const STATION_X = {
  grind: -2.75, shot: -1.85, water: -1.2, chocolate: -1.0, pour_over: -2.4, cupM: 0, cupL: 0, trash: 0.4,
  syrup: 1.25, pineapple: 1.1, milk: 1.95, foam: 1.95, matcha: 2.2, cold_brew: 2.5, ice: 2.75, ice_cream: 2.9,
};
const STEP_FX = { water: 0x8a5a36, ice: 0xdff6ff, syrup: 0xd9912b, foam: 0xffffff, chocolate: 0x5a2f1a, cold_brew: 0x3a2014, ice_cream: 0xfff1d6, pineapple: 0xffc531, pour_over: 0x6b3d22, matcha: 0x8bbf5a };

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.clock = 0;
    this.guests = new Map();
    this.fx = {};            // station id -> active
    this.particles = [];
    this.mode = "title";
    this.stage = { top: 0, height: window.innerHeight };
    this.raycaster = new THREE.Raycaster();
    this.rnd = mulberry(7);
    this.heroTargetX = 0;
    this.happyT = 0;
    this.sadT = 0;
  }

  async init() {
    try { await document.fonts.ready; } catch { /* ignore */ }
    this.build();
    await this.tryLoadHeroModel();
    this.resize();
  }

  build() {
    const s = this.scene;
    s.background = skyTexture();
    s.fog = new THREE.Fog(0xffc9a0, 30, 80);

    s.add(new THREE.HemisphereLight(0xfff1dc, 0xe8c48c, 1.15));
    const sun = new THREE.DirectionalLight(0xffe2bf, 2.1);
    sun.position.set(7, 12, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
    sun.shadow.bias = -0.0008;
    s.add(sun);
    const rim = new THREE.DirectionalLight(0xff9a6a, 0.8);
    rim.position.set(-6, 5, -10);
    s.add(rim);

    // ground + sea
    this.sandMat = mat(C.sand, { flatShading: false });
    const sand = mesh(new THREE.PlaneGeometry(120, 60), this.sandMat, { cast: false, receive: true });
    sand.rotation.x = -Math.PI / 2;
    sand.position.z = 12;
    s.add(sand);
    this.sun = sun;
    const wet = this.wet = mesh(new THREE.PlaneGeometry(120, 3), mat(0xd9c28f, { flatShading: false }), { y: 0.005, z: -17.5, cast: false, receive: true });
    wet.rotation.x = -Math.PI / 2;
    s.add(wet);
    const seaGeo = new THREE.PlaneGeometry(160, 70, 60, 24);
    seaGeo.rotateX(-Math.PI / 2);
    this.seaBase = seaGeo.attributes.position.array.slice();
    this.sea = mesh(seaGeo, new THREE.MeshStandardMaterial({ color: C.sea, roughness: 0.35, metalness: 0.1, flatShading: true }), { y: -0.05, z: -54, cast: false, receive: false });
    s.add(this.sea);
    const sunDisc = this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: 0xfff1b8, fog: false }));
    sunDisc.position.set(18, 7, -80);
    s.add(sunDisc);
    const glow = this.glow = new THREE.Mesh(new THREE.CircleGeometry(6.5, 32), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.35, fog: false }));
    glow.position.set(18, 7, -80.1);
    s.add(glow);

    // palms
    this.palms = new THREE.Group();
    s.add(this.palms);
    for (const [x, z, h, lean, rot] of [[-7, -3, 6, 0.8, 0.4], [-9.5, 1, 5, 0.6, 1.2], [8, -4, 6.5, 0.7, 2.8], [10, 2, 4.6, 0.9, 3.4], [-4, -12, 5.5, 0.5, 0.2], [14, -10, 6, 0.6, 2]]) {
      const p = palm(h, lean);
      p.position.set(x, 0, z);
      p.rotation.y = rot;
      this.palms.add(p);
    }

    // shack
    const shack = new THREE.Group();
    const wood = woodTexture();
    const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 });
    const counter = mesh(new THREE.BoxGeometry(6.6, 1.1, 1.0), woodMat, { y: 0.55, z: 0.3, receive: true });
    shack.add(counter);
    shack.add(mesh(new THREE.BoxGeometry(6.9, 0.08, 1.15), mat(0xe9d3a6), { y: 1.14, z: 0.3, receive: true }));
    const sign = mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.8 }), { y: 0.6, z: 0.81, cast: false });
    shack.add(sign);
    const post = mat(C.woodDark);
    for (const [x, z] of [[-3.25, 0.7], [3.25, 0.7], [-3.25, -2.2], [3.25, -2.2]]) {
      shack.add(mesh(new THREE.BoxGeometry(0.2, 3.5, 0.2), post, { x, y: 1.75, z }));
    }
    shack.add(mesh(new THREE.BoxGeometry(6.8, 3.4, 0.15), woodMat, { y: 1.7, z: -2.25, receive: true }));
    const roof = mesh(new THREE.BoxGeometry(7.6, 0.18, 4.0), mat(0xd6b25e), { y: 3.6, z: -0.7 });
    roof.rotation.x = 0.12;
    shack.add(roof);
    const stripes = stripeTexture();
    stripes.repeat.set(3, 1);
    this.awningMat = new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.9 });
    const awning = mesh(new THREE.PlaneGeometry(7.6, 0.8), this.awningMat, { y: 3.2, z: 1.3 });
    awning.rotation.x = -0.35;
    shack.add(awning);
    this.scallops = [];
    for (let i = 0; i < 12; i++) {
      const sc = mesh(new THREE.CircleGeometry(0.32, 12, Math.PI, Math.PI), mat(i % 2 ? C.paper : C.sunset, { side: THREE.DoubleSide }), { x: -3.48 + i * 0.633, y: 2.83, z: 1.43, cast: false });
      sc.rotation.x = -0.35;
      shack.add(sc);
      this.scallops.push(sc);
    }
    const pa = bigPineapple();
    pa.position.set(0, 3.7, -0.8);
    shack.add(pa);
    this.pineappleTop = pa;
    // shelf with jars behind the hero
    shack.add(mesh(new THREE.BoxGeometry(5, 0.08, 0.35), post, { y: 2.2, z: -2.05 }));
    const jarColors = [0x4a2a17, 0xd9912b, 0x8bbf5a, 0xffc531, 0x6b3d22, 0xf3e6cf];
    for (let i = 0; i < 10; i++) {
      shack.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 10), mat(jarColors[i % jarColors.length]), { x: -2.2 + i * 0.49, y: 2.39, z: -2.05 }));
    }
    s.add(shack);

    // counter equipment
    const top = 1.18;
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9d1d6, roughness: 0.3, metalness: 0.8 });
    const machine = new THREE.Group();
    machine.add(mesh(new THREE.BoxGeometry(1.0, 0.62, 0.55), mat(C.sunset), { y: 0.31 }));
    machine.add(mesh(new THREE.BoxGeometry(1.04, 0.08, 0.58), metal, { y: 0.66 }));
    machine.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), metal, { y: 0.34, z: 0.32 }));
    machine.add(mesh(new THREE.BoxGeometry(0.34, 0.03, 0.08), mat(C.ink), { y: 0.26, z: 0.42 }));
    this.stream = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), mat(0x4a2a17), { y: 0.16, z: 0.32, cast: false });
    this.stream.visible = false;
    machine.add(this.stream);
    machine.position.set(STATION_X.shot, top, 0.2);
    s.add(machine);

    const grinder = new THREE.Group();
    grinder.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 12), mat(0x2f3440), { y: 0.25 }));
    grinder.add(mesh(new THREE.ConeGeometry(0.22, 0.34, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9eef5, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), { y: 0.68 }).rotateX(Math.PI));
    grinder.add(mesh(new THREE.ConeGeometry(0.17, 0.2, 12), mat(0x4a2a17), { y: 0.6 }).rotateX(Math.PI));
    grinder.position.set(STATION_X.grind, top, 0.25);
    s.add(grinder);
    this.grinder = grinder;

    const pitcher = new THREE.Group();
    pitcher.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.24, 12), metal, { y: 0.12 }));
    pitcher.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), metal, { y: 0.45, z: -0.02 }));
    pitcher.position.set(STATION_X.milk, top, 0.3);
    s.add(pitcher);
    this.pitcher = pitcher;

    const iceBin = mesh(new THREE.BoxGeometry(0.55, 0.28, 0.42), new THREE.MeshStandardMaterial({ color: 0xbfe6f2, roughness: 0.2, transparent: true, opacity: 0.85 }), { x: STATION_X.ice, y: top + 0.14, z: 0.3 });
    s.add(iceBin);
    for (let i = 0; i < 4; i++) {
      s.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), mat([0xd9912b, 0x8a3b1e, 0xf3e6cf, 0x5a2f1a][i]), { x: STATION_X.syrup - 0.2 + i * 0.13, y: top + 0.16, z: 0.1 }));
    }
    const kettle = mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 12), metal, { x: STATION_X.water, y: top + 0.15, z: 0.25 });
    s.add(kettle);
    this.kettle = kettle;

    // hero: the same toon model as in v1.0, now standing behind the real counter
    const heroRoot = buildHero({ pineapple: true });
    heroRoot.traverse((o) => { if (o.isMesh && !o.name.endsWith("_outline")) o.castShadow = true; });
    heroRoot.scale.setScalar(1.12);
    const holder = new THREE.Group();
    holder.position.set(0, 0, -0.75);
    holder.add(heroRoot);
    s.add(holder);
    this.hero = { group: holder, root: heroRoot, p: heroRoot.userData.parts, state: "idle", until: 0, lookX: 0 };

    this.cupAnchor = new THREE.Vector3(0.1, top, 0.55);
    this.cupObj = null;
    this.flying = [];
  }

  async tryLoadHeroModel() {
    try {
      const head = await fetch("assets/hero_photo.glb", { method: "HEAD" });
      if (!head.ok || !(head.headers.get("content-type") || "").match(/gltf|octet|binary/)) return;
      const gltf = await new GLTFLoader().loadAsync("assets/hero_photo.glb");
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const k = 2.1 / size.y;
      model.scale.setScalar(k);
      box.setFromObject(model);
      model.position.y -= box.min.y;
      const c = box.getCenter(new THREE.Vector3());
      model.position.x -= c.x;
      model.position.z -= c.z;
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.hero.group.remove(this.hero.root);
      const wrap = new THREE.Group();
      wrap.add(model);
      this.hero.group.add(wrap);
      this.hero.root = wrap;
      this.hero.p = null;
      this.hero.gltf = true;
    } catch { /* keep the procedural hero */ }
  }

  // ---------------------------------------------------------------- locations

  setLocation(loc) {
    if (this.loc === loc) return;
    this.loc = loc;
    const th = THEMES[loc] || THEMES[1];
    this.scene.background = skyTexture(th.sky);
    this.scene.fog.color.set(th.fog);
    this.sandMat.color.set(th.ground);
    this.sandMat.map = loc === 3 ? cobbleTexture() : null;
    if (this.sandMat.map) this.sandMat.map.repeat.set(40, 20);
    this.sandMat.needsUpdate = true;
    const tex = stripeTexture(th.awning);
    tex.repeat.set(3, 1);
    this.awningMat.map = tex;
    this.awningMat.needsUpdate = true;
    this.scallops.forEach((sc, i) => sc.material.color.set(i % 2 ? th.awning[1] : th.awning[0]));
    this.palms.visible = th.palms;
    this.sea.visible = this.wet.visible = th.sea;
    this.sunDisc.visible = this.glow.visible = th.sea;
    this.sun.color.set(th.sun);
    this.sunDisc.position.y = loc === 4 ? 3 : 7;
    this.glow.position.y = this.sunDisc.position.y;

    if (this.themeProps) this.scene.remove(this.themeProps);
    const g = this.themeProps = new THREE.Group();
    this.spin = null;
    this.scene.add(g);
    if (loc === 2) {
      const planks = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.9 });
      planks.map.repeat.set(6, 8);
      const deck = mesh(new THREE.PlaneGeometry(30, 16), planks, { y: 0.01, z: 3, cast: false, receive: true });
      deck.rotation.x = -Math.PI / 2;
      g.add(deck);
      const wheel = new THREE.Group();
      const steel = mat(0xfff8e8);
      wheel.add(mesh(new THREE.TorusGeometry(5, 0.12, 6, 40), steel));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const spoke = mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 5), steel, { x: Math.cos(a) * 2.5, y: Math.sin(a) * 2.5 });
        spoke.rotation.z = a - Math.PI / 2;
        wheel.add(spoke);
        const cab = mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), mat([0xff6a3d, 0xffc531, 0x0f8b8d][i % 3]), { x: Math.cos(a) * 5, y: Math.sin(a) * 5 });
        cab.userData.cab = true;
        wheel.add(cab);
      }
      wheel.position.set(-13, 6.5, -12);
      g.add(wheel);
      for (const s of [-1, 1]) {
        const leg = mesh(new THREE.CylinderGeometry(0.15, 0.2, 7, 6), steel, { x: -13 + s * 1.8, y: 3.2, z: -12 });
        leg.rotation.z = s * 0.25;
        g.add(leg);
      }
      this.spin = wheel;
    } else if (loc === 3) {
      const cols = ["#f3d9b1", "#e8b4a0", "#cfe0c3", "#f6e7a8", "#d9c7e8", "#f1c7a0"];
      let x = -16;
      let i = 0;
      while (x < 16) {
        const w = 3.2 + (i % 3) * 0.8, h = 5 + ((i * 7) % 4);
        const b = mesh(new THREE.BoxGeometry(w, h, 3), new THREE.MeshStandardMaterial({ map: windowsTexture(cols[i % cols.length]), roughness: 0.9 }), { x: x + w / 2, y: h / 2, z: -7.5 });
        g.add(b);
        g.add(mesh(new THREE.ConeGeometry(w * 0.72, 1.4, 4), mat(0xb5553c), { x: x + w / 2, y: h + 0.7, z: -7.5 }).rotateY(Math.PI / 4));
        x += w + 0.1; i++;
      }
      const fountain = new THREE.Group();
      fountain.add(mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.5, 16), mat(0xd6cfc4)));
      fountain.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x6fc3d0, roughness: 0.2 }), { y: 0.24 }));
      fountain.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 8), mat(0xd6cfc4), { y: 0.9 }));
      fountain.position.set(7.5, 0.25, 0.5);
      g.add(fountain);
    } else if (loc === 4) {
      const sack = mat(0xc9a36b);
      for (let i = 0; i < 7; i++) {
        const sk = mesh(new THREE.SphereGeometry(0.45, 8, 6), sack, { x: -4.4 - (i % 3) * 0.85, y: 0.35 + Math.floor(i / 3) * 0.55, z: 0.2 + (i % 2) * 0.4 });
        sk.scale.set(1, 0.7, 0.8);
        g.add(sk);
      }
      const copper = new THREE.MeshStandardMaterial({ color: 0xc27a45, roughness: 0.35, metalness: 0.7 });
      const drum = mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 16), copper, { x: 4.8, y: 1.3, z: -0.6 });
      drum.rotation.z = Math.PI / 2;
      g.add(drum);
      g.add(mesh(new THREE.BoxGeometry(1.8, 0.6, 1.4), mat(0x3a2317), { x: 4.8, y: 0.3, z: -0.6 }));
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), copper, { x: 5.2, y: 3.2, z: -0.9 }));
      this.spin = drum;
      const bulbs = new THREE.MeshBasicMaterial({ color: 0xfff1b8 });
      for (let i = 0; i < 16; i++) {
        const x = -3.6 + i * 0.48;
        g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), bulbs, { x, y: 2.75 - Math.sin((i / 15) * Math.PI) * 0.18, z: 1.5, cast: false }));
      }
      const warm = new THREE.PointLight(0xffc98a, 6, 9);
      warm.position.set(0, 2.6, 1.8);
      g.add(warm);
    }
  }

  // ---------------------------------------------------------------- layout

  setStage(top, height) {
    this.stage = { top, height };
    this.resize();
  }

  setMode(mode) { this.mode = mode; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const sh = this.mode === "shift" ? this.stage.height : h;
    const top = this.mode === "shift" ? this.stage.top : 0;
    this.camera.aspect = w / sh;
    this.camera.setViewOffset(w, sh, 0, -top, w, h);
    this.camera.updateProjectionMatrix();
  }

  cameraPose() {
    const aspect = this.camera.aspect;
    if (this.mode === "shift") {
      const far = aspect < 1.4 ? Math.pow(1.4 / aspect, 0.7) : 1;
      const pos = new THREE.Vector3(4.6, 4.9 + (far - 1) * 2.2, 12.5 + (far - 1) * 7.5);
      const look = new THREE.Vector3(-0.9, 1.3, aspect < 1 ? 2.8 : 2.2);
      return { pos, look };
    }
    const a = this.clock * 0.08;
    const r = aspect < 1 ? 14 : 10.5;
    return { pos: new THREE.Vector3(Math.sin(a) * r * 0.7, 3.6, 5 + Math.cos(a) * r * 0.55), look: new THREE.Vector3(0, aspect < 1 ? 2.4 : 1.9, -0.4) };
  }

  // ---------------------------------------------------------------- guests

  syncGuests(customers) {
    customers.forEach((c, i) => {
      let gu = this.guests.get(c.id);
      if (!gu) {
        const made = makeGuest(c.type, c.critic, this.rnd);
        made.group.position.copy(ENTRY).add(new THREE.Vector3(0, 0, (this.rnd() - 0.5) * 2));
        made.group.traverse((o) => { o.userData.custId = c.id; });
        this.scene.add(made.group);
        gu = { ...made, id: c.id, state: "walk", target: new THREE.Vector3(), phase: this.rnd() * 6, cup: null };
        this.guests.set(c.id, gu);
      }
      if (gu.state !== "leave") gu.target.copy(QUEUE_SLOTS[Math.min(i, QUEUE_SLOTS.length - 1)]);
    });
  }

  leave(id, withCup) {
    const gu = this.guests.get(id);
    if (!gu) return;
    gu.state = "leave";
    gu.target.copy(withCup ? EXIT : ENTRY);
    if (withCup) {
      const cup = makeCup("M");
      cup.scale.setScalar(0.8);
      cup.position.set(0, -0.72, 0.08);
      gu.arms[1].add(cup);
      gu.arms[1].rotation.x = -1.1;
    } else {
      gu.head.rotation.z = 0.25;
    }
  }

  clearGuests() {
    for (const gu of this.guests.values()) this.scene.remove(gu.group);
    this.guests.clear();
  }

  pick(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const objs = [];
    for (const gu of this.guests.values()) if (gu.state !== "leave") objs.push(gu.group);
    const hit = this.raycaster.intersectObjects(objs, true)[0];
    return hit ? hit.object.userData.custId ?? null : null;
  }

  screenPos(id) {
    const gu = this.guests.get(id);
    if (!gu) return null;
    const p = new THREE.Vector3(0, 2.35, 0).applyMatrix4(gu.group.matrixWorld).project(this.camera);
    return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight, visible: p.z < 1 };
  }

  // ---------------------------------------------------------------- bar

  syncCup(cup) {
    if (!cup) {
      if (this.cupObj) { this.scene.remove(this.cupObj); this.cupObj = null; }
      return;
    }
    if (!this.cupObj || this.cupObj.userData.size !== cup.size) {
      if (this.cupObj) this.scene.remove(this.cupObj);
      this.cupObj = makeCup(cup.size);
      this.cupObj.userData.size = cup.size;
      this.cupObj.position.copy(this.cupAnchor);
      this.scene.add(this.cupObj);
    }
    setCupLayers(this.cupObj, cup.steps);
  }

  serveTo(id) {
    const gu = this.guests.get(id);
    if (!this.cupObj || !gu) return;
    const cup = this.cupObj;
    this.cupObj = null;
    const to = gu.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    this.flying.push({ obj: cup, from: cup.position.clone(), to, t: 0 });
  }

  setStation(id, active) {
    this.fx[id] = active;
    if (active && STATION_X[id] !== undefined) this.heroTargetX = STATION_X[id];
  }

  pulse(id) {
    if (STATION_X[id] !== undefined) this.heroTargetX = STATION_X[id];
  }

  // idle | work | happy | sad (same contract as HeroView in hero3d.js)
  heroSet(state, ms = 0) {
    const h = this.hero;
    if (state === "work" && (h.state === "happy" || h.state === "sad") && performance.now() < h.until) return;
    h.state = state;
    h.until = ms ? performance.now() + ms : 0;
  }
  heroLook(x) { this.hero.lookX = Math.max(-1, Math.min(1, x)); }
  happy() { this.heroSet("happy", 1400); }
  sad() { this.heroSet("sad", 1400); }

  spawnParticle(pos, color, vy, life) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08));
    this.scene.add(m);
    this.particles.push({ m, vy, life, max: life });
  }

  // ---------------------------------------------------------------- frame

  update(dt) {
    this.clock += dt;
    const t = this.clock;

    // sea
    const p = this.sea.geometry.attributes.position;
    const base = this.seaBase;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      p.array[i * 3 + 1] = Math.sin(x * 0.35 + t * 1.2) * 0.12 + Math.cos(z * 0.5 + t * 0.9) * 0.1;
    }
    p.needsUpdate = true;
    this.sea.geometry.computeVertexNormals();

    this.pineappleTop.rotation.y = Math.sin(t * 0.6) * 0.15;
    if (this.spin) {
      if (this.loc === 2) { this.spin.rotation.z += dt * 0.12; this.spin.children.forEach((c) => { if (c.userData.cab) c.rotation.z = -this.spin.rotation.z; }); }
      else this.spin.rotation.x += dt * 1.5;
    }

    // hero
    const h = this.hero;
    if (h.until && performance.now() > h.until) { h.state = "idle"; h.until = 0; }
    const hx = THREE.MathUtils.clamp(this.heroTargetX * 0.55, -1.6, 1.6);
    h.group.position.x += (hx - h.group.position.x) * Math.min(1, dt * 4);
    this.animateHero(dt, t);

    // station fx
    this.grinder.position.x = STATION_X.grind + (this.fx.grind ? (Math.random() - 0.5) * 0.03 : 0);
    this.stream.visible = !!this.fx.shot;
    if (this.fx.milk && Math.random() < 0.6) {
      this.spawnParticle(this.pitcher.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 0xffffff, 0.9, 0.9);
    }
    for (const [id, color] of Object.entries(STEP_FX)) {
      if (this.fx[id] && Math.random() < 0.5) this.spawnParticle(this.cupAnchor.clone().add(new THREE.Vector3(0, 0.6, 0)), color, -1.3, 0.35);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      q.m.position.y += q.vy * dt;
      q.m.scale.setScalar(1 + (1 - q.life / q.max) * (q.vy > 0 ? 2 : 0));
      q.m.material.opacity = Math.max(0, q.life / q.max) * 0.85;
      if (q.life <= 0) { this.scene.remove(q.m); q.m.geometry.dispose(); q.m.material.dispose(); this.particles.splice(i, 1); }
    }

    // flying cups
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt * 2.5;
      const k = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, f.to, k);
      f.obj.position.y += Math.sin(k * Math.PI) * 0.8;
      f.obj.rotation.y += dt * 8;
      if (k >= 1) { this.scene.remove(f.obj); this.flying.splice(i, 1); }
    }

    // guests
    for (const gu of [...this.guests.values()]) {
      const pos = gu.group.position;
      const d = new THREE.Vector3().subVectors(gu.target, pos);
      d.y = 0;
      const dist = d.length();
      const speed = gu.state === "leave" ? 2.8 : 2.3;
      let moving = false;
      if (dist > 0.05) {
        moving = true;
        d.normalize();
        pos.addScaledVector(d, Math.min(dist, speed * dt));
        const ang = Math.atan2(d.x, d.z);
        gu.group.rotation.y += shortAngle(gu.group.rotation.y, ang) * Math.min(1, dt * 8);
      } else if (gu.state === "leave") {
        this.scene.remove(gu.group);
        this.guests.delete(gu.id);
        continue;
      } else {
        const toHero = Math.atan2(this.hero.group.position.x - pos.x, this.hero.group.position.z - pos.z);
        gu.group.rotation.y += shortAngle(gu.group.rotation.y, toHero) * Math.min(1, dt * 5);
      }
      gu.phase += dt * (moving ? 9 : 2);
      const swing = moving ? Math.sin(gu.phase) * 0.55 : 0;
      gu.legs[0].rotation.x = swing;
      gu.legs[1].rotation.x = -swing;
      if (!gu.arms[1].children.find((c) => c.userData && c.userData.h)) {
        gu.arms[0].rotation.x = -swing * 0.6;
        gu.arms[1].rotation.x = swing * 0.6;
      } else gu.arms[0].rotation.x = -swing * 0.6;
      gu.group.position.y = moving ? Math.abs(Math.sin(gu.phase)) * 0.05 : Math.sin(gu.phase) * 0.01;
    }

    // camera
    const pose = this.cameraPose();
    const k = Math.min(1, dt * 2.5);
    if (!this.camPos) { this.camPos = pose.pos.clone(); this.camLook = pose.look.clone(); }
    this.camPos.lerp(pose.pos, k);
    this.camLook.lerp(pose.look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  animateHero(dt, t) {
    const h = this.hero;
    const lookFromBar = THREE.MathUtils.clamp((this.heroTargetX - h.group.position.x) * 0.25, -0.6, 0.6);
    if (!h.p) {
      h.group.rotation.y = lookFromBar * 0.8 + h.lookX * 0.3;
      h.group.position.y = h.state === "happy" ? Math.abs(Math.sin(t * 9)) * 0.08 : Math.sin(t * 2.2) * 0.01;
      return;
    }
    const { head, arms, mouth, hat, pine } = h.p;
    const k = 1 - Math.pow(0.001, dt);
    const lerp = (a, b) => a + (b - a) * k;
    let armLz = -0.16, armRz = 0.16, foreLx = -0.2, foreRx = -0.2, armLx = 0, armRx = 0, headX = 0, jump = 0, mouthZ = Math.PI;
    let headY = h.lookX * 0.5 + lookFromBar;
    const title = this.mode !== "shift";
    if (title) { armLx = -0.5; foreLx = -0.9; }
    if (h.state === "work") {
      armLx = -0.55 + Math.sin(t * 11) * 0.12; armRx = -0.55 + Math.cos(t * 11) * 0.12;
      foreLx = -1.1; foreRx = -1.1; headX = 0.3; headY = lookFromBar;
    } else if (h.state === "happy") {
      jump = Math.abs(Math.sin(t * 9)) * 0.08; armRz = 2.6; armRx = 0; foreRx = -0.3; headX = -0.15;
      if (title) { armLz = -2.6; armLx = 0; foreLx = -0.2; }
    } else if (h.state === "sad") {
      headX = 0.35; armLz = -0.06; armRz = 0.06; mouthZ = 0;
    } else {
      headY += Math.sin(t * 0.7) * 0.12; headX = Math.sin(t * 1.1) * 0.03;
    }
    h.root.position.y = lerp(h.root.position.y, jump + Math.sin(t * 2.2) * 0.012);
    head.rotation.x = lerp(head.rotation.x, headX);
    head.rotation.y = lerp(head.rotation.y, headY);
    head.rotation.z = lerp(head.rotation.z, Math.sin(t * 0.9) * 0.04);
    arms.L.arm.rotation.z = lerp(arms.L.arm.rotation.z, armLz);
    arms.R.arm.rotation.z = lerp(arms.R.arm.rotation.z, armRz);
    arms.L.arm.rotation.x = lerp(arms.L.arm.rotation.x, armLx);
    arms.R.arm.rotation.x = lerp(arms.R.arm.rotation.x, armRx);
    arms.L.fore.rotation.x = lerp(arms.L.fore.rotation.x, foreLx);
    arms.R.fore.rotation.x = lerp(arms.R.fore.rotation.x, foreRx);
    mouth.rotation.z = mouthZ;
    mouth.scale.setScalar(h.state === "happy" ? 1.35 : 1);
    hat.rotation.z = 0.05 + Math.sin(t * 1.3) * 0.015;
    if (pine) {
      pine.visible = title;
      pine.rotation.set(-(arms.L.arm.rotation.x + arms.L.fore.rotation.x), t * 0.6, -arms.L.arm.rotation.z);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

function shortAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pineapple Barista hero: a stylized low-poly 3D character built from primitives.
// Based on the reference photo: straw fedora, long wavy brown hair, mustache and
// stubble, loud Hawaiian shirt, pineapple in hand. No cigar (age rating).
//
// buildHero() returns a plain THREE.Group with named parts, so the same model is
// used live in the game and exported to assets/hero.glb for Blender / Unity.

import * as THREE from "three";

const C = {
  skin: 0xf1c29e,
  skinShade: 0xe0a882,
  hair: 0x6b4226,
  hairDark: 0x4e2f1a,
  straw: 0xe9d197,
  band: 0x3a2317,
  shorts: 0xd8c29a,
  sandal: 0x7a4b2a,
  eye: 0x2b1a10,
  white: 0xfff8e8,
  pineapple: 0xffc531,
  leaf: 0x2e7d4f,
  outline: 0x2a1a10,
};

// ------------------------------------------------------------------ textures

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

export function shirtTexture() {
  const c = canvas(512, 512);
  const g = c.getContext("2d");
  g.fillStyle = "#0f8b8d";
  g.fillRect(0, 0, 512, 512);
  const rnd = mulberry(7);
  // palm fronds
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 512, y = rnd() * 512, a = rnd() * Math.PI * 2;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = i % 2 ? "#2e7d4f" : "#3f9a5f";
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.ellipse(0, 0, 46, 9, k * 0.45, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // hibiscus
  for (let i = 0; i < 12; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 9 + rnd() * 6;
    g.fillStyle = i % 3 ? "#ff6a3d" : "#ff8f5a";
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#ffc531";
    g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.fill();
  }
  // tiny sunsets
  for (let i = 0; i < 6; i++) {
    const x = rnd() * 512, y = rnd() * 512;
    g.fillStyle = "#ffc531";
    g.beginPath(); g.arc(x, y, 14, Math.PI, 0); g.fill();
    g.fillStyle = "#fff8e8";
    g.fillRect(x - 18, y + 2, 36, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.5, 1.5);
  return t;
}

function strawTexture() {
  const c = canvas(256, 256);
  const g = c.getContext("2d");
  g.fillStyle = "#e9d197"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(160,120,50,.45)"; g.lineWidth = 3;
  for (let i = -256; i < 512; i += 14) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

function pineappleTexture() {
  const c = canvas(256, 256);
  const g = c.getContext("2d");
  g.fillStyle = "#ffc531"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#c98f10"; g.lineWidth = 5;
  for (let i = -256; i < 512; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke();
  }
  g.fillStyle = "#8a5a10";
  for (let y = 16; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
    g.beginPath(); g.arc(x + ((y / 32) % 2) * 16, y, 3, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ materials

function makeMaterialFactory(toon) {
  let gradient = null;
  if (toon) {
    const data = new Uint8Array([90, 170, 255]);
    gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return (opts) => {
    if (toon) return new THREE.MeshToonMaterial({ gradientMap: gradient, ...opts });
    return new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...opts });
  };
}

// ------------------------------------------------------------------ model

export function buildHero({ toon = true, outline = true, pineapple = true } = {}) {
  const M = makeMaterialFactory(toon);
  const shirt = M({ map: shirtTexture() });
  const skin = M({ color: C.skin });
  const hair = M({ color: C.hair });
  const hairDark = M({ color: C.hairDark });
  const straw = M({ map: strawTexture(), side: THREE.DoubleSide });
  const band = M({ color: C.band });
  const shorts = M({ color: C.shorts });
  const sandal = M({ color: C.sandal });
  const eyeWhite = M({ color: C.white });
  const eyeDark = M({ color: C.eye });
  const cream = M({ color: C.white, side: THREE.DoubleSide });
  const stubble = M({ color: C.hair, transparent: true, opacity: 0.35 });

  const root = new THREE.Group();
  root.name = "PineappleBarista";
  const outlined = [];

  const mesh = (geo, mat, name, parent, pos, rot, scale, withOutline = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    parent.add(m);
    if (withOutline) outlined.push(m);
    return m;
  };

  // legs, shorts, sandals
  const legs = new THREE.Group(); legs.name = "Legs"; root.add(legs);
  for (const s of [-1, 1]) {
    mesh(new THREE.CapsuleGeometry(0.082, 0.5, 6, 12), skin, `Leg${s < 0 ? "L" : "R"}`, legs, [0.1 * s, 0.38, 0]);
    mesh(new THREE.BoxGeometry(0.13, 0.04, 0.26), sandal, `Sandal${s < 0 ? "L" : "R"}`, legs, [0.1 * s, 0.02, 0.04]);
  }
  mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.14, 20), shorts, "ShortsHip", legs, [0, 0.9, 0], null, [1, 1, 0.8]);
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.26, 14), shorts, `ShortsLeg${s < 0 ? "L" : "R"}`, legs, [0.11 * s, 0.73, 0], [0, 0, 0.05 * s]);
  }

  // torso
  const torso = new THREE.Group(); torso.name = "Torso"; torso.position.set(0, 0.95, 0); root.add(torso);
  mesh(new THREE.CapsuleGeometry(0.235, 0.36, 8, 20), shirt, "Shirt", torso, [0, 0.26, 0], null, [1.08, 1, 0.78]);
  // collar: two flat points on the chest
  const collarShape = new THREE.Shape();
  collarShape.moveTo(0, 0); collarShape.lineTo(0.11, 0.02); collarShape.lineTo(0.03, -0.13); collarShape.closePath();
  for (const s of [-1, 1]) {
    const g = new THREE.ShapeGeometry(collarShape);
    const c = mesh(g, cream, `Collar${s < 0 ? "L" : "R"}`, torso, [0.02 * s, 0.53, 0.172], [-0.25, s < 0 ? Math.PI : 0, 0], null, false);
    c.scale.x = 1;
  }
  mesh(new THREE.ConeGeometry(0.05, 0.12, 3), skin, "NeckV", torso, [0, 0.5, 0.165], [Math.PI, 0, 0], [1, 1, 0.3], false);
  // shirt buttons
  for (let i = 0; i < 3; i++) {
    mesh(new THREE.SphereGeometry(0.012, 8, 6), cream, `Button${i}`, torso, [0, 0.38 - i * 0.11, 0.186], null, null, false);
  }

  // arms (pivot at shoulder)
  const arms = {};
  for (const s of [-1, 1]) {
    const side = s < 0 ? "L" : "R";
    const arm = new THREE.Group(); arm.name = `Arm${side}`;
    arm.position.set(0.27 * s, 1.43, 0);
    root.add(arm);
    mesh(new THREE.CylinderGeometry(0.085, 0.078, 0.2, 14), shirt, `Sleeve${side}`, arm, [0, -0.09, 0]);
    const fore = new THREE.Group(); fore.name = `Forearm${side}`; fore.position.set(0, -0.2, 0); arm.add(fore);
    mesh(new THREE.CapsuleGeometry(0.05, 0.2, 6, 10), skin, `ForearmMesh${side}`, fore, [0, -0.12, 0]);
    mesh(new THREE.SphereGeometry(0.06, 12, 10), skin, `Hand${side}`, fore, [0, -0.27, 0.01]);
    arms[side] = { arm, fore };
  }

  // neck + head
  mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.12, 12), skin, "Neck", root, [0, 1.53, 0]);
  const head = new THREE.Group(); head.name = "Head"; head.position.set(0, 1.57, 0); head.scale.setScalar(1.2); root.add(head);
  mesh(new THREE.SphereGeometry(0.16, 28, 20), skin, "Skull", head, [0, 0.12, 0], null, [0.94, 1.1, 1]);
  mesh(new THREE.SphereGeometry(0.163, 24, 12, 0, Math.PI, 1.85, 0.95), stubble, "Stubble", head, [0, 0.12, 0.004], null, [0.94, 1.1, 1], false);
  for (const s of [-1, 1]) {
    const side = s < 0 ? "L" : "R";
    mesh(new THREE.SphereGeometry(0.04, 10, 8), skin, `Ear${side}`, head, [0.152 * s, 0.12, 0], null, [0.45, 1, 0.8]);
    mesh(new THREE.SphereGeometry(0.027, 12, 10), eyeWhite, `Eye${side}`, head, [0.055 * s, 0.15, 0.138], null, [1, 1, 0.55], false);
    mesh(new THREE.SphereGeometry(0.016, 10, 8), eyeDark, `Pupil${side}`, head, [0.055 * s, 0.148, 0.152], null, null, false);
    mesh(new THREE.BoxGeometry(0.065, 0.013, 0.02), hairDark, `Brow${side}`, head, [0.056 * s, 0.195, 0.145], [0, 0, -0.18 * s], null, false);
  }
  // left earring (the photo has one)
  mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 16), M({ color: 0x3a3a3a }), "Earring", head, [-0.158, 0.085, 0.01], [0, Math.PI / 2, 0], null, false);
  mesh(new THREE.SphereGeometry(0.026, 12, 10), M({ color: C.skinShade }), "Nose", head, [0, 0.105, 0.162], null, [0.8, 1, 1.15], false);
  // mustache with drooping ends
  const must = new THREE.Group(); must.name = "Mustache"; must.position.set(0, 0.068, 0.158); head.add(must);
  mesh(new THREE.CapsuleGeometry(0.011, 0.06, 4, 8), hair, "MustacheMid", must, [0, 0, 0], [0, 0, Math.PI / 2], null, false);
  for (const s of [-1, 1]) {
    mesh(new THREE.CapsuleGeometry(0.009, 0.03, 4, 8), hair, `MustacheEnd${s}`, must, [0.042 * s, -0.012, -0.004], [0, 0, 0.6 * s], null, false);
  }
  // mouth: a torus arc; rotation.z flips it for sad face
  const mouth = mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 16, Math.PI), eyeDark, "Mouth", head, [0, 0.04, 0.15], [0, 0, Math.PI], null, false);
  mesh(new THREE.SphereGeometry(0.02, 10, 8), hair, "Soulpatch", head, [0, 0.005, 0.148], null, [1, 0.6, 0.6], false);

  // hair: back shell, long fall to the shoulders, side locks, fringe
  mesh(new THREE.SphereGeometry(0.172, 24, 18, Math.PI, Math.PI, 0, Math.PI * 0.8), hair, "HairBack", head, [0, 0.13, -0.005], null, [1, 1.12, 1.05]);
  mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 14), hair, "HairFall", head, [0, -0.04, -0.075], null, [1.45, 1, 0.55]);
  for (const s of [-1, 1]) {
    mesh(new THREE.CapsuleGeometry(0.045, 0.2, 6, 10), hair, `HairLock${s < 0 ? "L" : "R"}`, head, [0.145 * s, 0.03, 0.02], [0.1, 0, 0.14 * s]);
  }
  mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 10), hair, "Fringe", head, [0, 0.245, 0.1], [0, 0, Math.PI / 2], [1, 1, 0.6], false);

  // hat: fedora with upturned brim
  const hat = new THREE.Group(); hat.name = "Hat"; hat.position.set(0, 0.25, -0.01); hat.rotation.set(-0.12, 0, 0.05); head.add(hat);
  const brimPts = [new THREE.Vector2(0.0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.29, 0.012), new THREE.Vector2(0.34, 0.045)];
  mesh(new THREE.LatheGeometry(brimPts, 48), straw, "HatBrim", hat);
  const crownPts = [new THREE.Vector2(0.185, 0), new THREE.Vector2(0.18, 0.06), new THREE.Vector2(0.165, 0.13), new THREE.Vector2(0.11, 0.16), new THREE.Vector2(0.06, 0.145), new THREE.Vector2(0.0, 0.15)];
  mesh(new THREE.LatheGeometry(crownPts, 40), straw, "HatCrown", hat);
  mesh(new THREE.CylinderGeometry(0.184, 0.187, 0.04, 40, 1, true), band, "HatBand", hat, [0, 0.025, 0], null, null, false);

  // pineapple prop in the left hand
  let pine = null;
  if (pineapple) {
    pine = new THREE.Group(); pine.name = "Pineapple";
    pine.position.set(0, -0.36, 0.06);
    arms.L.fore.add(pine);
    mesh(new THREE.SphereGeometry(0.085, 20, 16), M({ map: pineappleTexture() }), "PineappleBody", pine, [0, 0, 0], null, [1, 1.35, 1]);
    const leafMat = M({ color: C.leaf });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      mesh(new THREE.ConeGeometry(0.03, 0.16 + (i % 2) * 0.06, 5), leafMat, `PineLeaf${i}`, pine,
        [Math.cos(a) * 0.025, 0.17, Math.sin(a) * 0.025], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], null, false);
    }
  }

  if (outline) {
    const ol = new THREE.MeshBasicMaterial({ color: C.outline, side: THREE.BackSide });
    for (const m of outlined) {
      const o = new THREE.Mesh(m.geometry, ol);
      o.name = m.name + "_outline";
      o.scale.setScalar(1.06);
      o.renderOrder = -1;
      m.add(o);
    }
  }

  root.userData.parts = { head, hat, mouth, torso, arms, pine, must };
  return root;
}

// ------------------------------------------------------------------ live view

export class HeroView {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = "hero-canvas";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "The barista: straw hat, long hair, Hawaiian shirt");

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xfff4dd, 0x8a6a4a, 1.6));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
    sun.position.set(1.5, 3, 2.5);
    this.scene.add(sun);

    this.hero = buildHero();
    this.p = this.hero.userData.parts;
    this.scene.add(this.hero);

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    this.mode = "full";
    this.state = "idle";
    this.stateUntil = 0;
    this.lookX = 0;
    this.t = 0;
    this.last = performance.now();
    this.running = false;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.loop = this.loop.bind(this);
  }

  mount(el, mode) {
    this.mode = mode;
    el.innerHTML = "";
    el.appendChild(this.canvas);
    this.el = el;
    this.resize();
    this.p.pine.visible = mode === "full";
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this.loop); }
  }

  resize() {
    if (!this.el) return;
    const w = this.el.clientWidth || 150;
    const h = this.el.clientHeight || w * 1.3;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.mode === "full") {
      this.camera.fov = 30;
      this.camera.position.set(0.4, 1.2, 4.5);
      this.camera.lookAt(0, 1.07, 0);
    } else {
      this.camera.fov = 26;
      this.camera.position.set(0.3, 1.7, 2.9);
      this.camera.lookAt(0, 1.56, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  // idle | work | happy | sad
  set(state, ms = 0) {
    if (state === "work" && (this.state === "happy" || this.state === "sad") && performance.now() < this.stateUntil) return;
    this.state = state;
    this.stateUntil = ms ? performance.now() + ms : 0;
  }

  look(x) { this.lookX = Math.max(-1, Math.min(1, x)); }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!document.hidden && this.el && this.el.offsetParent !== null) {
      if (this.stateUntil && now > this.stateUntil) { this.state = "idle"; this.stateUntil = 0; }
      this.t += this.reduced ? dt * 0.2 : dt;
      this.animate(dt);
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(this.loop);
  }

  animate(dt) {
    const { head, arms, mouth, hat, pine } = this.p;
    const t = this.t;
    const k = 1 - Math.pow(0.001, dt); // smoothing
    const lerp = (a, b) => a + (b - a) * k;
    let armLz = -0.16, armRz = 0.16, foreLx = -0.2, foreRx = -0.2, armLx = 0, armRx = 0, headX = 0, jump = 0, mouthZ = Math.PI;
    let headY = this.lookX * 0.5;

    const breathe = Math.sin(t * 2.2) * 0.012;
    if (this.mode === "full") { armLx = -0.5; foreLx = -0.9; }

    if (this.state === "work") {
      armLx = -0.55 + Math.sin(t * 11) * 0.12;
      armRx = -0.55 + Math.cos(t * 11) * 0.12;
      foreLx = -1.1; foreRx = -1.1;
      headX = 0.25; headY *= 0.3;
    } else if (this.state === "happy") {
      jump = Math.abs(Math.sin(t * 9)) * 0.06;
      armRz = 2.6; armRx = 0; foreRx = -0.3;
      if (this.mode === "full") { armLz = -2.6; armLx = 0; foreLx = -0.2; }
      headX = -0.15;
    } else if (this.state === "sad") {
      headX = 0.35; armLz = -0.06; armRz = 0.06; mouthZ = 0;
    } else {
      headY += Math.sin(t * 0.7) * 0.12;
      headX = Math.sin(t * 1.1) * 0.03;
    }

    this.hero.position.y = lerp(this.hero.position.y, jump + breathe);
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
    mouth.scale.setScalar(this.state === "happy" ? 1.35 : 1);
    hat.rotation.z = 0.05 + Math.sin(t * 1.3) * 0.015;
    if (pine) {
      // keep the pineapple upright whatever the arm is doing
      pine.rotation.set(-(arms.L.arm.rotation.x + arms.L.fore.rotation.x), t * 0.6, -arms.L.arm.rotation.z);
    }
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

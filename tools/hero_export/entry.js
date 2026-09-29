// Bundled into tools/hero_export/bundle.js and run in headless Chromium by export.py.
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildHero } from "../../src/hero3d.js";

export function exportGLB() {
  const hero = buildHero({ toon: false, outline: false, pineapple: true });
  const scene = new THREE.Scene();
  scene.add(hero);
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(scene, (buf) => {
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      resolve(btoa(bin));
    }, reject, { binary: true });
  });
}

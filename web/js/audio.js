// Synthesized sound effects, no audio files to load.
let ctx = null;
let master = null;
let enabled = true;
let noiseBuf = null;
const loops = new Map();

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = "sine", gain = 0.5, delay = 0, slide = 0 } = {}) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  setEnabled(v) {
    enabled = v;
    if (!v) for (const k of [...loops.keys()]) sfx.stopLoop(k);
  },
  unlock() { ensure(); },
  click() { tone(660, 0.06, { type: "triangle", gain: 0.25 }); },
  pour() { tone(420, 0.25, { type: "sine", gain: 0.2, slide: 1.6 }); },
  bell() { tone(1320, 0.35, { type: "sine", gain: 0.18 }); tone(1760, 0.3, { type: "sine", gain: 0.12, delay: 0.08 }); },
  coin() { tone(988, 0.09, { type: "square", gain: 0.12 }); tone(1319, 0.2, { type: "square", gain: 0.12, delay: 0.08 }); },
  perfect() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: "triangle", gain: 0.2, delay: i * 0.07 })); },
  bad() { tone(220, 0.3, { type: "sawtooth", gain: 0.12, slide: 0.6 }); },
  leave() { tone(330, 0.22, { type: "triangle", gain: 0.15, slide: 0.7 }); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: "triangle", gain: 0.2, delay: i * 0.12 })); },
  // grinder buzz / steam hiss while a station is held
  startLoop(key, kind) {
    const c = ensure();
    if (!c || loops.has(key)) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    if (kind === "grind") { f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 2; g.gain.value = 0.25; }
    else { f.type = "highpass"; f.frequency.value = 2500; g.gain.value = 0.12; }
    src.connect(f).connect(g).connect(master);
    src.start();
    loops.set(key, { src, g });
  },
  stopLoop(key) {
    const l = loops.get(key);
    if (!l) return;
    loops.delete(key);
    try { l.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08); l.src.stop(ctx.currentTime + 0.1); } catch { /* already stopped */ }
  },
};

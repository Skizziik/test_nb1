import {
  SAVE_KEY, newSave, migrateSave, eff, Shift, requiredFor, orderPrice, menuFor,
  shopList, buy, nextLocation, canRelocate, relocate, nextHint, stepsNeeded, clamp,
} from "./engine.js";
import { sfx } from "./audio.js";

// ------------------------------------------------------------------ text

const DRINK_NAMES = {
  espresso: "Espresso", americano: "Americano", iced_coffee: "Iced coffee",
  cappuccino: "Cappuccino", latte: "Latte", flat_white: "Flat white", mocha: "Mocha",
  cold_brew: "Cold brew", matcha_latte: "Matcha latte", affogato: "Affogato",
  pina_colada_latte: "Pina colada latte", pour_over: "Pour over",
};
const STEP_ICON = {
  shot: "☕", water: "💧", ice: "🧊", milk: "🥛", foam: "☁️", syrup: "🍯",
  chocolate: "🍫", cold_brew: "🫙", matcha: "🍵", ice_cream: "🍨", pineapple: "🍍", pour_over: "⏳",
};
const STEP_NAME = {
  shot: "Espresso shot", water: "Hot water", ice: "Ice", milk: "Steamed milk", foam: "Foam", syrup: "Vanilla syrup",
  chocolate: "Chocolate", cold_brew: "Cold brew", matcha: "Matcha", ice_cream: "Ice cream", pineapple: "Pineapple", pour_over: "Pour over",
};
const LOC_INTRO = {
  2: "Wooden planks, a Ferris wheel and way more foot traffic. New on the menu: flat white, mocha, extra shots. Connoisseurs start showing up.",
  3: "Stone streets, office crowds and people who judge your crema. New: matcha, affogato and the signature pina colada latte.",
  4: "",
};
const GUEST = {
  tourist: { label: "Tourist", face: "😎" },
  local: { label: "Local", face: "😊" },
  student: { label: "Student", face: "🤓" },
  office_rush: { label: "Office", face: "🙂" },
  connoisseur: { label: "Connoisseur", face: "🧐" },
};
const EVENT_NAME = { rain: "Rainy day", heatwave: "Heatwave", festival: "Festival", critic: "Critic in town" };
const EVENT_INTRO = {
  rain: "Rain today. Fewer guests, and nobody wants iced drinks.",
  heatwave: "Heatwave. More guests, lots of iced coffee.",
  festival: "Festival on the beach. Big crowd, short patience.",
  critic: "A food critic is in town today. Their review counts four times.",
};
const UPGRADE_TEXT = {
  tip_jar: ["Tip jar", "Guests tip 25% more."],
  grinder: ["Grinder", "Grinds faster and makes better coffee."],
  espresso_machine: ["Espresso machine", "Pulls shots faster and makes better coffee."],
  milk_steamer: ["Milk steamer", "Milk heats up faster."],
  ice_machine: ["Ice machine", "Ice drops in faster."],
  cold_brew_tower: ["Cold brew tower", "Adds cold brew to the menu."],
  decor: ["Decor", "Brings more guests, and they wait longer."],
  menu_board: ["Menu board", "Guests accept higher prices."],
  pos_tablet: ["Order tablet", "Shows the full recipe above every order."],
  loyalty_cards: ["Loyalty cards", "Guests leave a bit happier."],
  helper_barista: ["Helper barista", "A second pair of hands for simple drinks."],
};

// ------------------------------------------------------------------ hero

function heroSVG() {
  return `
<svg viewBox="0 0 120 150" role="img" aria-label="The barista: straw hat, long hair, Hawaiian shirt">
  <defs>
    <pattern id="shirt" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="#0f8b8d"/>
      <path d="M3 13c4-6 10-7 14-5-5 0-9 3-11 7z" fill="#2e7d4f"/>
      <circle cx="18" cy="5" r="2.6" fill="#ff6a3d"/><circle cx="21" cy="7.5" r="2.4" fill="#ff6a3d"/>
      <circle cx="18.5" cy="6.5" r="1.3" fill="#ffc531"/>
      <circle cx="6" cy="20" r="1" fill="#fff8e8"/>
    </pattern>
  </defs>
  <path d="M34 60 C30 90 32 104 36 112 L46 108 L44 62 Z" fill="#6b4226"/>
  <path d="M86 60 C90 90 88 104 84 112 L74 108 L76 62 Z" fill="#6b4226"/>
  <path d="M22 150 C22 118 34 104 60 104 C86 104 98 118 98 150 Z" fill="url(#shirt)" stroke="#3a2317" stroke-width="3"/>
  <path d="M48 104 L60 122 L72 104 L66 102 L60 110 L54 102 Z" fill="#fff8e8" stroke="#3a2317" stroke-width="2"/>
  <rect x="52" y="90" width="16" height="16" rx="4" fill="#e9b48e"/>
  <ellipse cx="60" cy="68" rx="24" ry="28" fill="#f1c29e" stroke="#3a2317" stroke-width="3"/>
  <path d="M38 62 C38 44 48 40 60 40 C72 40 82 44 82 62 C76 54 70 52 60 52 C50 52 44 54 38 62 Z" fill="#6b4226"/>
  <ellipse cx="51" cy="68" rx="3" ry="3.4" fill="#3a2317"/>
  <ellipse cx="69" cy="68" rx="3" ry="3.4" fill="#3a2317"/>
  <path d="M46 61 l9 -2 M65 59 l9 2" stroke="#6b4226" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M50 82 C54 78 66 78 70 82 C66 81 54 81 50 82 Z" fill="#6b4226"/>
  <path d="M52 86 C56 90 64 90 68 86" stroke="#3a2317" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M40 80 C44 92 52 96 60 96 C68 96 76 92 80 80 C76 90 68 93 60 93 C52 93 44 90 40 80 Z" fill="#6b4226" opacity=".45"/>
  <ellipse cx="60" cy="44" rx="44" ry="10" fill="#e8cf8f" stroke="#3a2317" stroke-width="3"/>
  <path d="M38 44 C38 22 48 16 60 16 C72 16 82 22 82 44 Z" fill="#f1dca0" stroke="#3a2317" stroke-width="3"/>
  <path d="M39 38 C52 41 68 41 81 38 L81.5 43 C68 46 52 46 38.5 43 Z" fill="#3a2317"/>
  <path d="M46 26 l3 10 M56 22 l2 12 M66 22 l-1 12 M75 26 l-3 10" stroke="#c9ae6c" stroke-width="1.5"/>
</svg>`;
}

// ------------------------------------------------------------------ state

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SPEED = clamp(parseFloat(params.get("speed") || "1"), 0.25, 10);

let bal = null;
let save = null;
let shift = null;
let running = false;
let lastFrame = 0;
let world = null;
const guestEls = new Map();
const mg = {}; // minigame state per station id

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage may be unavailable */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.version === 1 ? migrateSave(bal, s) : null;
  } catch { return null; }
}

function show(id) {
  for (const el of document.querySelectorAll(".screen")) el.hidden = el.id !== id;
}

function money(x) { return Math.abs(Math.round(x)).toLocaleString("en-US"); }
function signed(x) { return (Math.round(x) < 0 ? "-" : "") + money(x); }

let toastTimer = 0;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function pop(anchor, text, bad = false) {
  if (world) return popFixed(anchor, text, bad);
  const host = $("screen-shift");
  const a = anchor.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "pop" + (bad ? " bad" : "");
  el.textContent = text;
  el.style.left = `${a.left - h.left + a.width / 2}px`;
  el.style.top = `${a.top - h.top}px`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function heroHappy() {
  const el = document.querySelector("#screen-shift [data-hero] svg");
  if (!el) return;
  el.classList.remove("hero-happy");
  void el.getBoundingClientRect();
  el.classList.add("hero-happy");
}

function popFixed(anchor, text, bad) {
  const a = anchor.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "pop" + (bad ? " bad" : "");
  el.textContent = text;
  el.style.left = `${a.left + a.width / 2}px`;
  el.style.top = `${a.top}px`;
  $("overlay").appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ------------------------------------------------------------------ stations

function zoneQuality(x, [a, b]) {
  if (x >= a && x <= b) return 1;
  const d = x < a ? a - x : x - b;
  return clamp(1 - d / 0.35, 0.2, 1);
}

function stationDefs() {
  const m = bal.web.minigames;
  const coffeeGrind = eff(bal, save, "grinder", "time_mult_coffee", 1);
  const coffeeShot = eff(bal, save, "espresso_machine", "time_mult_coffee", 1);
  const milkMult = eff(bal, save, "milk_steamer", "time_mult_milk", 1);
  const iceMult = eff(bal, save, "ice_machine", "time_mult_iced", 1);
  const all = [
    { id: "cupM", kind: "tap", ico: "🥤", lbl: "Cup M", sub: "regular", act: () => shift.takeCup("M") },
    { id: "cupL", kind: "tap", ico: "🥤", lbl: "Cup L", sub: "large", act: () => shift.takeCup("L") },
    { id: "grind", kind: "hold", sound: "grind", ico: "🫘", lbl: "Grinder", sub: "hold, let go in green",
      dur: m.grind_s * coffeeGrind, zone: m.grind_zone,
      canStart: () => shift.grounds === null || "The portafilter is already loaded.",
      done: (x) => (x < 0.15 ? { ok: false, msg: "Hold the grinder a bit longer." } : shift.loadGrounds(zoneQuality(x, m.grind_zone))) },
    { id: "shot", kind: "toggle", sound: "steam", ico: "☕", lbl: "Espresso", sub: "tap start, tap stop",
      dur: m.extract_s * coffeeShot, zone: m.extract_zone,
      canStart: () => shift.grounds !== null || "Grind coffee first.",
      done: (x) => shift.pullShot(x >= 1 ? 0.2 : zoneQuality(x, m.extract_zone)) },
    { id: "milk", step: "milk", kind: "hold", sound: "steam", ico: "🥛", lbl: "Steam milk", sub: "hold, let go in green",
      dur: m.steam_s * milkMult, zone: m.steam_zone,
      done: (x) => (x < 0.15 ? { ok: false, msg: "Hold the steamer a bit longer." } : shift.addStep("milk", x >= 1 ? 0.2 : zoneQuality(x, m.steam_zone))) },
    { id: "foam", step: "foam", kind: "timed", ico: "☁️", lbl: "Foam", sub: "on top of milk", dur: 0.6,
      canStart: () => (shift.cup && shift.cup.steps.includes("milk")) || "Steam milk before adding foam.",
      done: () => shift.addStep("foam") },
    { id: "water", step: "water", kind: "timed", ico: "💧", lbl: "Hot water", sub: "for americano", dur: 0.8, done: () => shift.addStep("water") },
    { id: "ice", step: "ice", kind: "timed", ico: "🧊", lbl: "Ice", sub: "for iced drinks", dur: 1.2 * iceMult, done: () => shift.addStep("ice") },
    { id: "syrup", step: "syrup", kind: "timed", ico: "🍯", lbl: "Syrup", sub: "vanilla", dur: 0.5, done: () => shift.addStep("syrup") },
    { id: "chocolate", step: "chocolate", kind: "timed", ico: "🍫", lbl: "Chocolate", sub: "for mocha", dur: 0.6, done: () => shift.addStep("chocolate") },
    { id: "cold_brew", step: "cold_brew", kind: "timed", ico: "🫙", lbl: "Cold brew", sub: "from the tower", dur: 0.8, done: () => shift.addStep("cold_brew") },
    { id: "matcha", step: "matcha", kind: "hold", sound: "grind", ico: "🍵", lbl: "Matcha", sub: "hold to whisk",
      dur: m.whisk_s, zone: m.whisk_zone,
      done: (x) => (x < 0.15 ? { ok: false, msg: "Whisk a bit longer." } : shift.addStep("matcha", x >= 1 ? 0.3 : zoneQuality(x, m.whisk_zone))) },
    { id: "ice_cream", step: "ice_cream", kind: "timed", ico: "🍨", lbl: "Ice cream", sub: "one scoop", dur: 0.8, done: () => shift.addStep("ice_cream") },
    { id: "pineapple", step: "pineapple", kind: "timed", ico: "🍍", lbl: "Pineapple", sub: "house syrup", dur: 0.6, done: () => shift.addStep("pineapple") },
    { id: "pour_over", step: "pour_over", kind: "toggle", ico: "⏳", lbl: "Pour over", sub: "tap start, tap stop",
      dur: m.pour_s, zone: m.pour_zone,
      done: (x) => shift.addStep("pour_over", x >= 1 ? 0.3 : zoneQuality(x, m.pour_zone)) },
    { id: "trash", kind: "tap", ico: "🗑️", lbl: "Trash", sub: "start over", act: () => shift.trash(), cls: "trash" },
  ];
  const need = stepsNeeded(bal, save);
  return all.filter((s) => !s.step || need.has(s.step));
}

let stations = [];

function buildStations() {
  const host = $("stations");
  host.innerHTML = "";
  stations = stationDefs();
  host.classList.toggle("many", stations.length > 12);
  for (const s of stations) {
    const b = document.createElement("button");
    b.className = "station" + (s.cls ? " " + s.cls : "");
    b.dataset.id = s.id;
    b.innerHTML = `<span class="ico">${s.ico}</span><span class="lbl">${s.lbl}</span><span class="sub">${s.sub}</span>`;
    if (s.kind !== "tap") {
      const z = s.zone ? `<span class="zone" style="left:${s.zone[0] * 100}%;width:${(s.zone[1] - s.zone[0]) * 100}%"></span>` : "";
      b.insertAdjacentHTML("beforeend", `<span class="gauge">${z}<span class="fill"></span></span>`);
    }
    mg[s.id] = { active: false, x: 0 };
    wireStation(b, s);
    host.appendChild(b);
  }
}

function result(r) {
  if (r && r.ok === false && r.msg) toast(r.msg);
  renderCup();
}

function startMg(s) {
  const st = mg[s.id];
  if (st.active || !running) return;
  const ok = s.canStart ? s.canStart() : true;
  if (ok !== true) { toast(ok); return; }
  st.active = true;
  st.x = 0;
  st.cup = shift.cup;
  if (s.sound) sfx.startLoop(s.id, s.sound); else sfx.click();
  hero?.set("work");
  world?.setStation(s.id, true);
}
function endMg(s) {
  const st = mg[s.id];
  if (!st.active) return;
  st.active = false;
  const x = st.x;
  st.x = 0;
  sfx.stopLoop(s.id);
  world?.setStation(s.id, false);
  // the drink this action was started for was served or trashed meanwhile
  if (st.cup && shift.cup !== st.cup) { st.cup = null; return; }
  st.cup = null;
  const r = s.done(x);
  if (r && r.ok !== false) { if (s.kind === "timed") sfx.pour(); else sfx.click(); }
  result(r);
  if (!Object.values(mg).some((v) => v.active)) hero?.set("idle");
}

function wireStation(b, s) {
  if (s.kind === "tap") {
    b.addEventListener("click", () => {
      if (!running) return;
      world?.pulse(s.id);
      const r = s.act();
      if (r && r.ok !== false) sfx.click();
      result(r);
    });
    return;
  }
  if (s.kind === "timed" || s.kind === "toggle") {
    b.addEventListener("click", () => {
      const st = mg[s.id];
      if (s.kind === "toggle" && st.active) endMg(s);
      else startMg(s);
    });
    return;
  }
  // hold
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); startMg(s); });
  b.addEventListener("pointerup", () => endMg(s));
  b.addEventListener("pointercancel", () => endMg(s));
  b.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startMg(s); } });
  b.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); endMg(s); } });
  b.addEventListener("click", (e) => e.preventDefault());
}

function tickStations(dt) {
  for (const s of stations) {
    if (s.kind === "tap") continue;
    const st = mg[s.id];
    const el = document.querySelector(`.station[data-id="${s.id}"]`);
    if (st.active) {
      st.x += dt / s.dur;
      if (st.x >= 1) {
        st.x = 1;
        if (s.id === "shot") toast("Over-extracted. Stop the shot in the green zone.");
        if (s.id === "milk") toast("Milk scorched. Let go in the green zone.");
        if (s.id === "grind") toast("Too fine. Let go in the green zone.");
        endMg(s);
      }
    }
    el.querySelector(".fill").style.width = `${Math.min(1, st.x) * 100}%`;
    el.classList.toggle("busy", st.active);
    if (s.id === "shot") el.classList.toggle("ready", !st.active && shift.grounds !== null);
    if (s.id === "grind") el.classList.toggle("ready", shift.grounds !== null);
  }
}

// ------------------------------------------------------------------ cup + guests

function renderCup() {
  const slot = $("cup-slot");
  const hint = $("hint");
  const cup = shift.cup;
  if (!cup) {
    slot.innerHTML = shift.grounds !== null ? `<div class="chips"><span class="chip">Portafilter loaded</span></div>` : "";
    hint.textContent = shift.customers.length ? "Pick a cup to start." : "Waiting for guests.";
    return;
  }
  const chips = cup.steps.map((s) => `<span class="chip">${STEP_ICON[s]} ${STEP_NAME[s] || s}</span>`).join("");
  slot.innerHTML = `<div class="cup size-${cup.size}">🥤<span class="cup-size">${cup.size}</span></div><div class="chips">${chips}</div>`;
  hint.textContent = cup.steps.length ? "Tap a guest to serve." : "Add something to the cup.";
}

function orderHTML(c) {
  const mods = [];
  if (c.mods.includes("size_L")) mods.push("Large");
  if (c.mods.includes("syrup")) mods.push("+ syrup");
  const req = requiredFor(bal, c);
  const steps = save.upgrades.pos_tablet ? `<span class="steps">${req.steps.map((s) => STEP_ICON[s]).join("")}</span>` : "";
  return `<b>${DRINK_NAMES[c.drinkId]}</b>${mods.length ? `<span class="mods">${mods.join(", ")}</span>` : ""}${steps}`;
}

function addGuest(c) {
  const b = document.createElement("button");
  b.className = "guest" + (c.critic ? " critic" : "");
  b.setAttribute("aria-label", `${GUEST[c.type].label} wants ${DRINK_NAMES[c.drinkId]}. Serve.`);
  b.innerHTML = `<div class="order">${orderHTML(c)}</div><div class="face"><span>${GUEST[c.type].face}</span></div><span class="guest-type">${c.critic ? "Critic" : GUEST[c.type].label}</span><span class="helper-badge">Helper on it</span>`;
  b.addEventListener("click", () => serveGuest(c.id, b));
  b.classList.add("bubble");
  b.style.opacity = "0";
  $("overlay").appendChild(b);
  guestEls.set(c.id, b);
}

function removeGuest(id) {
  const el = guestEls.get(id);
  if (!el) return;
  guestEls.delete(id);
  el.classList.add("leaving");
  setTimeout(() => el.remove(), 300);
}

function serveGuest(id, el) {
  if (!running) return;
  const r = shift.serve(id);
  if (!r.ok) { toast(r.msg); return; }
  world?.serveTo(id);
  setTimeout(() => world?.leave(id, true), 380);
  if (r.correct) {
    pop(el, `+${money(r.price + r.tip)} 🪙`);
    if (r.quality >= 0.9) { sfx.perfect(); hero?.set("happy", 1400); heroHappy(); }
    else sfx.coin();
  } else {
    sfx.bad();
    hero?.set("sad", 1400);
    pop(el, "Wrong order", true);
    toast("That wasn't their order. They paid, but no tip and a bad review.");
  }
  renderCup();
}

function tickGuests() {
  world?.syncGuests(shift.customers);
  for (const c of shift.customers) {
    const el = guestEls.get(c.id);
    if (!el) continue;
    const sp = world?.screenPos(c.id);
    if (sp && sp.visible) {
      const half = (el.offsetWidth || 100) / 2 + 4;
      const x = clamp(sp.x, half, window.innerWidth - half);
      const y = clamp(sp.y, (el.offsetHeight || 80) + 56, window.innerHeight);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      if (el.style.opacity === "0") el.style.opacity = "1";
    }
    el.classList.toggle("helper-on", shift.helperOn(c));
    const p = shift.patienceLeft(c);
    const face = el.querySelector(".face");
    face.style.setProperty("--p", p.toFixed(3));
    face.style.setProperty("--ring", p > 0.5 ? "var(--good)" : p > 0.25 ? "var(--pineapple)" : "var(--bad)");
    face.firstElementChild.textContent = p > 0.5 ? GUEST[c.type].face : p > 0.25 ? "😐" : "😠";
  }
}

function drainLog() {
  for (const e of shift.log.splice(0)) {
    if (e.type === "arrive") { addGuest(e.cust); sfx.bell(); }
    else if (e.type === "leave") {
      if (e.reason === "full") toast("A guest saw the long line and walked away.");
      else {
        const el = guestEls.get(e.cust.id);
        if (el) pop(el, "Left", true);
        hero?.set("sad", 1200);
        world?.leave(e.cust.id, false);
      }
      sfx.leave();
      removeGuest(e.cust.id);
    } else if (e.type === "served") {
      if (e.byHelper) {
        world?.leave(e.cust.id, true);
        const el = guestEls.get(e.cust.id);
        if (el) pop(el, e.correct ? `+${money(e.price + e.tip)} 🪙` : "Helper slipped", !e.correct);
        if (e.correct) sfx.coin(); else sfx.bad();
      }
      removeGuest(e.cust.id);
    }
  }
}

function tickHud() {
  const f = Math.min(1, shift.t / shift.duration);
  $("clock-fill").style.width = `${f * 100}%`;
  $("clock-label").textContent =
    shift.phase === "rush" ? "Morning rush" : shift.phase === "day" ? "Afternoon" : "Closed: serve the last guests";
  $("hud-coins").textContent = signed(save.coins + shift.res.revenue + shift.res.tips);
  $("hud-stars").textContent = save.rep.toFixed(1);
}

// ------------------------------------------------------------------ coach

function hintsOn() {
  return save.settings.hints;
}

let lastHintKey = "";
function tickCoach() {
  let key = "";
  const focus = shift.customers.find((c) => !shift.helperOn(c));
  if (hintsOn() && focus) {
    const h = nextHint(shift, focus);
    key = h.guest ? `g${h.guest}` : `s${h.station}`;
  }
  if (focus && hero) {
    const el = guestEls.get(focus.id);
    if (el) {
      const r = el.getBoundingClientRect();
      const half = window.innerWidth / 2;
      hero.look(((r.left + r.width / 2) - half) / half * -0.8);
    }
  }
  if (key === lastHintKey) return;
  lastHintKey = key;
  for (const el of document.querySelectorAll(".hint-glow")) el.classList.remove("hint-glow");
  if (!key) return;
  if (key[0] === "g") guestEls.get(Number(key.slice(1)))?.classList.add("hint-glow");
  else document.querySelector(`.station[data-id="${key.slice(1)}"]`)?.classList.add("hint-glow");
}

function syncToggles() {
  $("btn-hints").setAttribute("aria-pressed", String(save.settings.hints));
  $("btn-hints").classList.toggle("off", !save.settings.hints);
  $("btn-sound").setAttribute("aria-pressed", String(save.settings.sound));
  $("btn-sound").textContent = save.settings.sound ? "🔊" : "🔇";
  sfx.setEnabled(save.settings.sound);
}

// ------------------------------------------------------------------ 3D world

let hero = null;

async function initWorld() {
  const { World } = await import("./world.bundle.js");
  world = new World($("world"));
  await world.init();
  world.setLocation(save.loc);
  hero = { set: (st, ms) => world.heroSet(st, ms), look: (x) => world.heroLook(x) };
}

function mountHero() { /* the hero lives in the 3D world now */ }

function applyTheme() {
  document.body.dataset.loc = String(save.loc);
  world?.setLocation(save.loc);
}

function layoutStage() {
  const r = $("stage").getBoundingClientRect();
  world.setStage(r.top, r.height);
}

function toWorldMode(mode) {
  if (!world) return;
  world.setMode(mode);
  if (mode === "shift") layoutStage(); else world.resize();
}

function clearGuests() {
  for (const el of guestEls.values()) el.remove();
  guestEls.clear();
  world?.clearGuests();
  world?.syncCup(null);
}

// ------------------------------------------------------------------ loop

function frame(ts) {
  const real = Math.min(0.1, (ts - lastFrame) / 1000 || 0);
  lastFrame = ts;
  if (shift && running) {
    const dt = real * SPEED;
    shift.update(dt);
    drainLog();
    tickStations(dt);
    tickGuests();
    tickHud();
    tickCoach();
    world.syncCup(shift.cup);
    if (!shift.cup) renderCup();
    if (shift.done) endShift();
  } else if (shift) {
    tickGuests();
  }
  world.update(real);
  world.render();
  requestAnimationFrame(frame);
}

function startShift() {
  sfx.unlock();
  applyTheme();
  shift = new Shift(bal, save);
  lastHintKey = "";
  clearGuests();
  buildStations();
  $("hud-day").textContent = `Day ${save.day}`;
  $("hud-day").title = bal.locations[String(save.loc)].name;
  $("clock-rush").style.width = `${bal.shift.rush_window[1] * 100}%`;
  const ev = shift.event.name;
  $("hud-event").hidden = !ev;
  if (ev) $("hud-event").textContent = EVENT_NAME[ev];
  show("screen-shift");
  toWorldMode("shift");
  syncToggles();
  renderCup();
  tickHud();
  if (ev) toast(EVENT_INTRO[ev]);
  running = true;
}

function endShift() {
  running = false;
  for (const k of Object.keys(mg)) sfx.stopLoop(k);
  const wrong = shift.res.wrong || 0;
  const s = shift.finish();
  if (save.day === bal.web.hint_days + 1 && save.settings.hints && !save.settings.hintsTouched) save.settings.hints = false;
  sfx.fanfare();
  shift = null;
  persist();
  clearGuests();
  toWorldMode("title");
  $("sum-title").textContent = `Day ${s.day} closed`;
  $("sum-sub").textContent = s.event ? EVENT_NAME[s.event] : bal.locations[String(save.loc)].name;
  const lines = [
    ["Guests served", s.served],
    ["Guests who left", s.walkouts],
    ["Wrong orders", wrong],
    ["Perfect drinks", s.perfect],
    ["Sales", money(s.revenue)],
    ["Tips", money(s.tips)],
    ["Ingredients", s.ingredients >= 0.5 ? `-${money(s.ingredients)}` : "0"],
    ["Rent", `-${money(s.rent)}`],
  ];
  if (s.wage) lines.push(["Helper wage", `-${money(s.wage)}`]);
  $("sum-lines").innerHTML = lines.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  $("sum-profit").textContent = `${Math.round(s.profit) >= 0 ? "+" : "-"}${money(s.profit)} 🪙`;
  const d = s.repAfter - s.repBefore;
  const cls = d >= 0 ? "up" : "down";
  $("sum-rep").innerHTML = `Rating ${s.repAfter.toFixed(2)} ⭐ <span class="${cls}">${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(2)}</span>`;
  show("screen-summary");
}

// ------------------------------------------------------------------ shop

function renderShop() {
  $("shop-coins").textContent = signed(save.coins);
  $("shop-stars").textContent = save.rep.toFixed(1);
  const list = $("shop-list");
  list.innerHTML = "";
  const items = shopList(bal, save).filter((x) => x.status !== "locked" || x.tier === 0);
  const order = { ok: 0, poor: 1, locked: 2, maxed: 3 };
  items.sort((a, b) => order[a.status] - order[b.status] || (a.cost ?? 0) - (b.cost ?? 0));
  for (const it of items) {
    const [name, desc] = UPGRADE_TEXT[it.id] || [it.id, ""];
    const li = document.createElement("li");
    li.className = "shop-item";
    const tier = it.maxTier > 1 ? `<span class="tier">level ${it.tier} of ${it.maxTier}</span>` : "";
    let btn;
    if (it.status === "maxed") btn = `<button class="btn" disabled>Owned</button>`;
    else if (it.status === "locked") btn = `<button class="btn" disabled>Later</button>`;
    else btn = `<button class="btn" ${it.status === "poor" ? "disabled" : ""}>Buy for ${money(it.cost)}</button>`;
    const note = it.status === "locked" ? ` Opens at ${bal.locations[String(it.needLoc)].name}.` : "";
    li.innerHTML = `<h3>${name}${tier}</h3><p>${desc}${note}</p>${btn}`;
    const b = li.querySelector("button");
    if (it.status === "ok") {
      b.addEventListener("click", () => {
        if (buy(bal, save, it.id)) { persist(); renderShop(); }
      });
    }
    list.appendChild(li);
  }
  const nx = nextLocation(bal, save);
  const box = $("next-loc");
  if (nx) {
    const starsOk = save.rep >= nx.min_stars;
    const coinsOk = save.coins >= nx.move_cost;
    const reqs = `<span class="${starsOk ? "up" : "down"}">${nx.min_stars} ⭐</span> and <span class="${coinsOk ? "up" : "down"}">${money(nx.move_cost)} 🪙</span>`;
    box.innerHTML = canRelocate(bal, save)
      ? `<p><b>${nx.name}</b> is ready for you. Rent there is ${nx.rent_per_day} a day, guests pay more.</p><button class="btn" id="btn-move">Move for ${money(nx.move_cost)}</button>`
      : `<p>Next spot: <b>${nx.name}</b>. You need ${reqs}. Upgrades move with you.</p>`;
    $("btn-move")?.addEventListener("click", () => {
      if (!relocate(bal, save)) return;
      persist();
      applyTheme();
      sfx.fanfare();
      const L = bal.locations[String(save.loc)];
      if (save.loc === 4) {
        $("finale-text").textContent = `Day ${save.day}. You started with a beach shack and ${bal.shift.start_coins} coins, and now the roastery has your name on it. ${money(save.stats.served)} drinks served so far. The line never ends, so keep brewing.`;
        save.seenFinale = true;
        persist();
        $("finale").showModal();
      } else {
        $("moved-title").textContent = L.name;
        $("moved-text").textContent = LOC_INTRO[save.loc];
        $("moved").showModal();
      }
      renderShop();
    });
  } else {
    box.innerHTML = `<p><b>Pineapple Roastery</b> is yours. Served so far: ${money(save.stats.served)}. Best day: ${money(save.stats.bestDay)} 🪙.</p>`;
  }
  $("shop-head-title").textContent = `${bal.locations[String(save.loc)].name} upgrades`;
  $("btn-next-day").textContent = `Open day ${save.day}`;
}

// ------------------------------------------------------------------ recipes / pause

function renderRecipes() {
  const list = $("recipe-list");
  list.innerHTML = menuFor(bal, save).map(([id, d]) =>
    `<li><span>${DRINK_NAMES[id]} <small>${money(orderPrice(bal, save, { drinkId: id, mods: [] }))} 🪙</small></span><span class="r-steps" aria-label="${d.recipe.map((s) => STEP_NAME[s] || s).join(", ")}">${d.recipe.map((s) => STEP_ICON[s]).join(" ")}</span></li>`
  ).join("") + `<li><span>Large</span><span class="r-steps">Cup L</span></li><li><span>+ syrup</span><span class="r-steps">🍯</span></li>`;
}

function pause() {
  if (!shift || !running) return;
  running = false;
  $("paused").showModal();
}

// ------------------------------------------------------------------ title

function renderTitle() {
  const has = save && save.day > 1;
  $("btn-continue").hidden = !has;
  $("btn-reset").hidden = !has;
  if (has) $("btn-continue").textContent = `Continue day ${save.day}`;
  $("btn-new").textContent = has ? "Open today's shift" : "Open the shack";
  $("btn-new").hidden = has;
  $("title-loc").hidden = !has;
  if (has) $("title-loc").textContent = `${bal.locations[String(save.loc)].name}, ${save.rep.toFixed(1)} ⭐, ${signed(save.coins)} 🪙`;
  applyTheme();
  show("screen-title");
  toWorldMode("title");
}

async function loadBalance() {
  for (const url of ["data/balance.json", "../data/balance.json"]) {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      if (r.ok) return await r.json();
    } catch { /* try next */ }
  }
  throw new Error("balance.json not found");
}

async function boot() {
  try {
    bal = await loadBalance();
  } catch {
    $("loading-msg").textContent = "Could not load data/balance.json. Serve the site over http, not file://.";
    return;
  }
  save = loadSave() || newSave(bal);
  try {
    await initWorld();
  } catch (e) {
    console.error(e);
    $("loading-msg").textContent = "This browser could not start 3D (WebGL). Try Chrome, Safari or Firefox with hardware acceleration on.";
    return;
  }
  $("loading").remove();
  window.addEventListener("resize", () => (world.mode === "shift" ? layoutStage() : world.resize()));
  $("world").addEventListener("click", (e) => {
    if (!shift || !running) return;
    const id = world.pick(e.clientX, e.clientY);
    if (id !== null) serveGuest(id, guestEls.get(id));
  });
  lastFrame = performance.now();
  requestAnimationFrame(frame);
  syncToggles();
  $("btn-hints").addEventListener("click", () => {
    save.settings.hints = !save.settings.hints;
    save.settings.hintsTouched = true;
    persist(); syncToggles(); lastHintKey = "x";
  });
  $("btn-sound").addEventListener("click", () => {
    save.settings.sound = !save.settings.sound;
    persist(); syncToggles();
  });

  $("btn-new").addEventListener("click", startShift);
  $("btn-continue").addEventListener("click", startShift);
  $("btn-reset").addEventListener("click", () => {
    if (!confirm("Start over from day 1? Your coins and upgrades will be reset.")) return;
    save = newSave(bal);
    persist();
    renderTitle();
  });
  $("btn-to-shop").addEventListener("click", () => { renderShop(); show("screen-shop"); });
  $("btn-next-day").addEventListener("click", startShift);
  $("btn-recipes").addEventListener("click", () => {
    renderRecipes();
    running = false;
    $("recipes").showModal();
  });
  $("recipes").addEventListener("close", () => { if (shift) { running = true; lastFrame = performance.now(); } });
  $("btn-pause").addEventListener("click", pause);
  $("paused").addEventListener("close", () => {
    if ($("paused").returnValue === "quit") {
      shift = null;
      running = false;
      for (const k of Object.keys(mg)) sfx.stopLoop(k);
      clearGuests();
      renderTitle();
      return;
    }
    running = true;
    lastFrame = performance.now();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  renderTitle();
}

boot();

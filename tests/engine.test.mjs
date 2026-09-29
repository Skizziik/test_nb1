// Smoke test: a scripted bot plays 45 days through the real game engine,
// driven only by the in-game coach (nextHint). It relocates when it can and
// buys upgrades, so every location, recipe and the helper barista get exercised.
// Run: node tests/engine.test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { newSave, migrateSave, Shift, shopList, buy, relocate, canRelocate, nextHint, stepsNeeded } from "../web/js/engine.js";

const bal = JSON.parse(readFileSync(new URL("../data/balance.json", import.meta.url)));
let seed = 42;
const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

function press(s, station) {
  switch (station) {
    case "cupM": return s.takeCup("M");
    case "cupL": return s.takeCup("L");
    case "trash": return s.trash();
    case "grind": return s.loadGrounds(0.9);
    case "shot": return s.pullShot(0.9);
    default: return s.addStep(station, 0.9);
  }
}

const save = newSave(bal);
const reached = {};
let helperServed = 0;
for (let day = 1; day <= 45; day++) {
  const s = new Shift(bal, save, rng);
  let busyUntil = 0;
  let guard = 0;
  while (!s.done) {
    s.update(0.1);
    for (const e of s.log.splice(0)) if (e.type === "served" && e.byHelper) helperServed++;
    if (s.t < busyUntil) continue;
    const c = s.customers.find((x) => !s.helperOn(x));
    if (!c) continue;
    for (let i = 0; i < 12; i++) {
      const h = nextHint(s, c);
      if (h.guest) {
        const r = s.serve(c.id);
        assert.ok(r.ok && r.correct, `coach-driven drink must be correct: ${c.drinkId}`);
        break;
      }
      assert.ok(stepsNeeded(bal, save).has(h.station) || ["cupM", "cupL", "trash", "grind", "shot"].includes(h.station),
        `station ${h.station} must be available at location ${save.loc}`);
      assert.ok(press(s, h.station).ok, `press ${h.station}`);
    }
    busyUntil = s.t + bal.drinks[c.drinkId].time_s * 1.05;
    assert.ok(++guard < 100000, "shift must end");
  }
  const sum = s.finish();
  if (canRelocate(bal, save)) { relocate(bal, save); reached[save.loc] = day; }
  for (const it of shopList(bal, save)) if (it.status === "ok" && it.cost < save.coins * 0.35) buy(bal, save, it.id);
  if (day % 5 === 0) console.log(`day ${sum.day}: loc ${save.loc}, served ${sum.served}, left ${sum.walkouts}, profit ${sum.profit.toFixed(0)}, stars ${sum.repAfter.toFixed(2)}, coins ${save.coins.toFixed(0)}`);
}
console.log("reached locations on days:", reached, "helper served:", helperServed);
assert.ok(reached[2], "bot should reach location 2");

// wrong order is punished
const s = new Shift(bal, newSave(bal), rng);
while (!s.customers.length) s.update(0.5);
s.takeCup("M"); s.addStep("water");
const bad = s.serve(s.customers[0].id);
assert.equal(bad.correct, false); assert.equal(bad.tip, 0);

// old saves migrate
const old = { version: 1, day: 3, coins: 10, rep: 3, loc: 1, upgrades: {}, stats: { served: 1 } };
const m = migrateSave(bal, old);
assert.equal(m.settings.sound, true); assert.equal(m.day, 3); assert.equal(m.stats.walkouts, 0);
console.log("engine tests passed");

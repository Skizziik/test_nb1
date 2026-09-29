// Smoke test: a scripted bot plays 10 shifts through the real game engine.
// Run: node tests/engine.test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { newSave, Shift, requiredFor, shopList, buy } from "../web/js/engine.js";

const bal = JSON.parse(readFileSync(new URL("../data/balance.json", import.meta.url)));
let seed = 42;
const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const save = newSave(bal);
for (let day = 0; day < 10; day++) {
  const s = new Shift(bal, save, rng);
  let busyUntil = 0;
  while (!s.done) {
    s.update(0.1);
    if (s.t < busyUntil || s.customers.length === 0) continue;
    const c = s.customers[0];
    const req = requiredFor(bal, c);
    assert.ok(s.takeCup(req.size).ok);
    for (const step of req.steps) {
      if (step === "shot") { s.loadGrounds(0.9); assert.ok(s.pullShot(0.9).ok); }
      else assert.ok(s.addStep(step, 0.9).ok, step);
    }
    const r = s.serve(c.id);
    assert.ok(r.ok && r.correct, "bot drink should be correct");
    busyUntil = s.t + bal.drinks[c.drinkId].time_s * 1.1;
    assert.ok(s.t < 2000, "shift must end");
  }
  const sum = s.finish();
  for (const it of shopList(bal, save)) if (it.status === "ok" && it.cost < save.coins * 0.4) buy(bal, save, it.id);
  console.log(`day ${sum.day}: served ${sum.served}, left ${sum.walkouts}, profit ${sum.profit.toFixed(0)}, stars ${sum.repAfter.toFixed(2)}, coins ${save.coins.toFixed(0)}, event ${sum.event}`);
}
// wrong order must be punished
const s = new Shift(bal, newSave(bal), rng);
while (!s.customers.length) s.update(0.5);
s.takeCup("M"); s.addStep("water");
const bad = s.serve(s.customers[0].id);
assert.equal(bad.correct, false); assert.equal(bad.tip, 0);
console.log("engine tests passed");

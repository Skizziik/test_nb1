// Pure game logic. No DOM access here, so it can be tested in Node.
// All numbers come from data/balance.json (same file the economy simulator uses).

export const SAVE_KEY = "pineapple-barista-save-v1";

export function newSave(bal) {
  return {
    version: 1,
    day: 1,
    coins: bal.shift.start_coins,
    rep: bal.shift.start_reputation,
    loc: bal.mvp.location,
    upgrades: {},
    stats: { served: 0, walkouts: 0, earned: 0, bestDay: 0 },
  };
}

export function eff(bal, save, id, key, def) {
  const tier = save.upgrades[id] || 0;
  if (!tier) return def;
  const arr = bal.upgrades[id].effect[key];
  return arr ? arr[tier - 1] : def;
}

export function clamp(x, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, x));
}

function weightedPick(rng, entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

function expo(rng, rate) {
  return -Math.log(1 - rng()) / rate;
}

export function menuFor(bal, save) {
  return Object.entries(bal.drinks).filter(([, d]) => {
    if (d.unlock_loc > save.loc) return false;
    if (d.requires_upgrade && !(save.upgrades[d.requires_upgrade] > 0)) return false;
    return true;
  });
}

export function requiredFor(bal, order) {
  const steps = [...bal.drinks[order.drinkId].recipe];
  let size = "M";
  for (const m of order.mods) {
    const mod = bal.modifiers[m];
    if (mod.adds_step) steps.push(mod.adds_step);
    if (mod.sets_size) size = mod.sets_size;
  }
  return { steps, size };
}

export function orderPrice(bal, save, order) {
  const L = bal.locations[String(save.loc)];
  const d = bal.drinks[order.drinkId];
  const base = d.price + order.mods.reduce((s, m) => s + bal.modifiers[m].price_add, 0);
  return base * eff(bal, save, "menu_board", "price_mult", 1) * (L.price_mult || 1);
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

// ------------------------------------------------------------------ one shift

export class Shift {
  constructor(bal, save, rng = Math.random) {
    this.bal = bal;
    this.save = save;
    this.rng = rng;
    this.t = 0;
    this.duration = bal.shift.duration_s;
    this.customers = [];
    this.nextId = 1;
    this.cup = null;          // { size, steps: [], q: [] }
    this.grounds = null;      // quality of loaded portafilter, or null
    this.done = false;
    this.log = [];            // events for the UI: {type, ...}
    this.res = { revenue: 0, tips: 0, ingredients: 0, served: 0, walkouts: 0, sats: [], weights: [], perfect: 0 };

    this.event = this.rollEvent();
    const L = bal.locations[String(save.loc)];
    const rp = bal.reputation;
    this.mix = Object.entries(L.mix).filter(([k, w]) => w > 0 && bal.mvp.customer_types.includes(k));
    this.baseRate = (L.arrivals_per_min / 60)
      * (rp.arrival_mult_base + rp.arrival_mult_per_star * save.rep)
      * this.event.arrival_mult
      * eff(bal, save, "decor", "arrival_mult", 1);
    this.patienceMult = eff(bal, save, "decor", "patience_mult", 1) * this.event.patience_mult;
    this.criticAt = this.event.critic ? this.duration * (0.3 + 0.4 * rng()) : Infinity;
    this.nextArrival = 1.5; // first guest shows up almost immediately
  }

  rollEvent() {
    const ev = { name: null, arrival_mult: 1, iced_pref_mult: 1, patience_mult: 1, critic: false };
    for (const [name, e] of Object.entries(this.bal.events)) {
      if (this.rng() < e.chance) {
        ev.name = name;
        if (name === "critic") ev.critic = true;
        else {
          ev.arrival_mult = e.arrival_mult ?? 1;
          ev.iced_pref_mult = e.iced_pref_mult ?? 1;
          ev.patience_mult = e.patience_mult ?? 1;
        }
        break;
      }
    }
    return ev;
  }

  rateAt(t) {
    const sh = this.bal.shift;
    const f = t / this.duration;
    const rush = f >= sh.rush_window[0] && f <= sh.rush_window[1];
    return this.baseRate * (rush ? sh.rush_multiplier : 1);
  }

  get phase() {
    if (this.t >= this.duration) return "closing";
    const f = this.t / this.duration;
    return f <= this.bal.shift.rush_window[1] ? "rush" : "day";
  }

  spawn() {
    const bal = this.bal;
    const type = weightedPick(this.rng, this.mix);
    const c = bal.customers[type];
    const menu = menuFor(bal, this.save);
    const drinkId = weightedPick(this.rng, menu.map(([id, d]) => {
      let w = 1 + 2 * d.tags.filter((t) => c.likes.includes(t)).length;
      w *= Math.pow(d.price, c.spend_bias - 1);
      if (d.tags.includes("iced")) w *= this.event.iced_pref_mult;
      return [id, w];
    }));
    const d = bal.drinks[drinkId];
    const mods = bal.mvp.modifiers.filter((m) => {
      const mod = bal.modifiers[m];
      if (mod.only_tag && !d.tags.includes(mod.only_tag)) return false;
      return this.rng() < mod.chance;
    });
    const critic = this.t >= this.criticAt;
    if (critic) this.criticAt = Infinity;
    const cust = {
      id: this.nextId++, type, drinkId, mods, critic,
      arrive: this.t,
      patience: c.patience_s * this.patienceMult,
    };
    if (this.customers.length >= bal.mvp.queue_cap) {
      this.walkout(cust, "full");
      return;
    }
    this.customers.push(cust);
    this.log.push({ type: "arrive", cust });
  }

  walkout(cust, reason) {
    const w = cust.critic ? this.bal.events.critic.rep_weight : 1;
    this.res.walkouts += 1;
    this.res.sats.push(this.bal.reputation.walkout_satisfaction);
    this.res.weights.push(w);
    this.log.push({ type: "leave", cust, reason });
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    while (this.t < this.duration && this.t >= this.nextArrival) {
      this.spawn();
      this.nextArrival += expo(this.rng, this.rateAt(this.nextArrival));
    }
    for (const c of [...this.customers]) {
      if (this.t - c.arrive > c.patience) {
        this.customers.splice(this.customers.indexOf(c), 1);
        this.walkout(c, "patience");
      }
    }
    if (this.t >= this.duration && this.customers.length === 0) this.done = true;
  }

  patienceLeft(c) {
    return clamp(1 - (this.t - c.arrive) / c.patience);
  }

  // ---------------------------------------------------------------- cup ops

  takeCup(size) {
    if (this.cup) return { ok: false, msg: "You already have a cup. Serve it or trash it." };
    this.cup = { size, steps: [], q: [] };
    return { ok: true };
  }

  ensureCup() {
    if (!this.cup) this.cup = { size: "M", steps: [], q: [] };
  }

  loadGrounds(quality) {
    if (this.grounds !== null) return { ok: false, msg: "The portafilter is already loaded." };
    this.grounds = clamp(quality);
    return { ok: true };
  }

  pullShot(quality) {
    if (this.grounds === null) return { ok: false, msg: "Grind coffee first." };
    this.ensureCup();
    this.cup.steps.push("shot");
    this.cup.q.push(clamp((quality + this.grounds) / 2));
    this.grounds = null;
    return { ok: true };
  }

  addStep(step, quality = 1) {
    this.ensureCup();
    if (step === "foam" && !this.cup.steps.includes("milk")) {
      return { ok: false, msg: "Steam milk before adding foam." };
    }
    this.cup.steps.push(step);
    this.cup.q.push(clamp(quality));
    return { ok: true };
  }

  trash() {
    this.cup = null;
    return { ok: true };
  }

  serve(customerId) {
    const bal = this.bal;
    const cust = this.customers.find((c) => c.id === customerId);
    if (!cust) return { ok: false, msg: "That guest already left." };
    if (!this.cup || this.cup.steps.length === 0) return { ok: false, msg: "Make a drink first." };

    const req = requiredFor(bal, cust);
    const correct = this.cup.size === req.size && sameMultiset(this.cup.steps, req.steps);
    const ct = bal.customers[cust.type];
    const rp = bal.reputation;
    const qAdd = eff(bal, this.save, "grinder", "quality_add", 0) + eff(bal, this.save, "espresso_machine", "quality_add", 0);
    const avgQ = this.cup.q.reduce((s, x) => s + x, 0) / this.cup.q.length;
    const quality = correct ? clamp(avgQ + qAdd) : rp.wrong_order_quality;
    const wait = this.t - cust.arrive;
    const waitScore = Math.max(0, 1 - rp.wait_penalty * wait / cust.patience);
    const sat = clamp(ct.quality_weight * quality + (1 - ct.quality_weight) * waitScore
      + eff(bal, this.save, "loyalty_cards", "satisfaction_add", 0));

    const price = orderPrice(bal, this.save, cust);
    const tip = correct ? price * ct.tip_rate * eff(bal, this.save, "tip_jar", "tip_mult", 1) * sat * sat : 0;
    this.res.revenue += price;
    this.res.tips += tip;
    this.res.ingredients += bal.drinks[cust.drinkId].cost;
    this.res.served += 1;
    if (correct && quality >= 0.9) this.res.perfect += 1;
    this.res.sats.push(sat);
    this.res.weights.push(cust.critic ? bal.events.critic.rep_weight : 1);

    this.customers.splice(this.customers.indexOf(cust), 1);
    this.cup = null;
    const result = { ok: true, correct, quality, sat, price, tip, cust };
    this.log.push({ type: "served", ...result });
    return result;
  }

  // ---------------------------------------------------------------- end of day

  finish() {
    const bal = this.bal;
    const save = this.save;
    const L = bal.locations[String(save.loc)];
    const r = this.res;
    const rp = bal.reputation;
    const rent = L.rent_per_day;
    const wage = save.upgrades.helper_barista ? bal.upgrades.helper_barista.wage_per_day : 0;
    const profit = r.revenue + r.tips - r.ingredients - rent - wage;
    const repBefore = save.rep;
    if (r.sats.length) {
      const totalW = r.weights.reduce((s, w) => s + w, 0);
      const mean = r.sats.reduce((s, x, i) => s + x * r.weights[i], 0) / totalW;
      const floor = rp.day_score_floor ?? 0;
      const dayScore = floor + (rp.max - floor) * mean;
      save.rep = clamp((1 - rp.daily_blend) * save.rep + rp.daily_blend * dayScore, rp.min, rp.max);
    }
    save.coins += profit;
    save.stats.served += r.served;
    save.stats.walkouts += r.walkouts;
    save.stats.earned += Math.max(0, profit);
    save.stats.bestDay = Math.max(save.stats.bestDay, profit);
    const summary = {
      day: save.day, event: this.event.name,
      revenue: r.revenue, tips: r.tips, ingredients: r.ingredients, rent, wage, profit,
      served: r.served, walkouts: r.walkouts, perfect: r.perfect,
      repBefore, repAfter: save.rep,
    };
    save.day += 1;
    return summary;
  }
}

// ------------------------------------------------------------------ shop

export function shopList(bal, save) {
  return Object.entries(bal.upgrades).map(([id, u]) => {
    const tier = save.upgrades[id] || 0;
    const maxTier = u.costs.length;
    const out = { id, tier, maxTier, cost: null, status: "ok" };
    if (tier >= maxTier) { out.status = "maxed"; return out; }
    out.cost = u.costs[tier];
    const needLoc = Math.max(u.min_loc || 1, u.tier_min_loc ? u.tier_min_loc[tier] : 1);
    if (needLoc > save.loc) { out.status = "locked"; out.needLoc = needLoc; return out; }
    if (save.coins < out.cost) out.status = "poor";
    return out;
  });
}

export function buy(bal, save, id) {
  const item = shopList(bal, save).find((x) => x.id === id);
  if (!item || item.status !== "ok") return false;
  save.coins -= item.cost;
  save.upgrades[id] = item.tier + 1;
  return true;
}

export function nextLocation(bal, save) {
  const n = bal.locations[String(save.loc + 1)];
  return n ? { ...n, index: save.loc + 1 } : null;
}

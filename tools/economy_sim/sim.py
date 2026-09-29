"""
Coffee game economy simulator.

Runs many bot "players" (different skill levels x purchase strategies x random seeds)
through N in-game days using the numbers in data/balance.json, then reports pacing:
days to reach each location, income curves, walkout rates, reputation.

Usage:
    python tools/economy_sim/sim.py                 # default run, prints report
    python tools/economy_sim/sim.py --days 60 --seeds 40 --plots docs/balance

The simulator is deliberately simple. It validates the math of the economy
(pacing, dominant strategies, dead zones), not whether the game is fun.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BALANCE_PATH = ROOT / "data" / "balance.json"


# --------------------------------------------------------------------------- bots

SKILLS = {
    # speed: multiplier on make time (higher = slower), acc: chance to make the order right
    "casual":  {"speed": 1.40, "acc": 0.86, "quality": 0.74},
    "average": {"speed": 1.18, "acc": 0.93, "quality": 0.82},
    "pro":     {"speed": 1.00, "acc": 0.98, "quality": 0.90},
}

STRATEGIES = ["saver", "cheapest", "speed", "decor", "balanced", "random"]

SPEED_PRIORITY = ["espresso_machine", "grinder", "milk_steamer", "ice_machine",
                  "helper_barista", "pos_tablet", "cold_brew_tower"]
DECOR_PRIORITY = ["decor", "menu_board", "loyalty_cards", "tip_jar"]


@dataclass
class PlayerState:
    coins: float
    rep: float
    loc: int = 1
    upgrades: dict = field(default_factory=lambda: defaultdict(int))  # id -> tier bought (0 = none)
    day: int = 0


# --------------------------------------------------------------------------- helpers

def eff(bal, state, upg_id, key, default):
    """Effect value of the currently owned tier of an upgrade."""
    tier = state.upgrades.get(upg_id, 0)
    if tier == 0:
        return default
    return bal["upgrades"][upg_id]["effect"][key][tier - 1]


def menu(bal, state):
    items = []
    for did, d in bal["drinks"].items():
        if d["unlock_loc"] > state.loc:
            continue
        req = d.get("requires_upgrade")
        if req and state.upgrades.get(req, 0) == 0:
            continue
        items.append((did, d))
    return items


def pick_drink(rng, bal, state, ctype, iced_pref):
    c = bal["customers"][ctype]
    items = menu(bal, state)
    weights = []
    for did, d in items:
        w = 1.0 + 2.0 * len(set(d["tags"]) & set(c["likes"]))
        w *= d["price"] ** (c["spend_bias"] - 1.0)
        if "iced" in d["tags"]:
            w *= iced_pref
        weights.append(w)
    did, d = rng.choices(items, weights=weights, k=1)[0]
    mods = []
    for mid, m in bal["modifiers"].items():
        if "only_tag" in m and m["only_tag"] not in d["tags"]:
            continue
        if rng.random() < m["chance"]:
            mods.append(mid)
    return did, d, mods


def make_time(bal, state, d, mods, skill_speed):
    t = d["time_s"] + sum(bal["modifiers"][m]["time_add_s"] for m in mods)
    if "coffee" in d["tags"]:
        t *= eff(bal, state, "grinder", "time_mult_coffee", 1.0)
        t *= eff(bal, state, "espresso_machine", "time_mult_coffee", 1.0)
    if "milk" in d["tags"]:
        t *= eff(bal, state, "milk_steamer", "time_mult_milk", 1.0)
    if "iced" in d["tags"]:
        t *= eff(bal, state, "ice_machine", "time_mult_iced", 1.0)
    return t * skill_speed + bal["shift"]["serve_overhead_s"]


# --------------------------------------------------------------------------- one shift

def run_shift(rng, bal, state, skill):
    sh = bal["shift"]
    rp = bal["reputation"]
    L = bal["locations"][str(state.loc)]

    # daily event
    ev = {"arrival_mult": 1.0, "iced_pref_mult": 1.0, "patience_mult": 1.0, "critic": False, "name": None}
    for name, e in bal["events"].items():
        if rng.random() < e["chance"]:
            ev["name"] = name
            if name == "critic":
                ev["critic"] = True
            else:
                ev["arrival_mult"] = e.get("arrival_mult", 1.0)
                ev["iced_pref_mult"] = e.get("iced_pref_mult", 1.0)
                ev["patience_mult"] = e.get("patience_mult", 1.0)
            break

    rep_mult = rp["arrival_mult_base"] + rp["arrival_mult_per_star"] * state.rep
    base_rate = L["arrivals_per_min"] / 60.0 * rep_mult * ev["arrival_mult"]
    base_rate *= eff(bal, state, "decor", "arrival_mult", 1.0)

    # generate arrivals (non-homogeneous Poisson via thinning)
    arrivals = []
    t = 0.0
    peak = base_rate * sh["rush_multiplier"]
    while True:
        t += rng.expovariate(peak)
        if t > sh["duration_s"]:
            break
        frac = t / sh["duration_s"]
        in_rush = sh["rush_window"][0] <= frac <= sh["rush_window"][1]
        r = base_rate * (sh["rush_multiplier"] if in_rush else 1.0)
        if rng.random() < r / peak:
            arrivals.append(t)

    ctypes = list(L["mix"].keys())
    cweights = list(L["mix"].values())
    patience_mult = eff(bal, state, "decor", "patience_mult", 1.0) * ev["patience_mult"]
    price_mult = eff(bal, state, "menu_board", "price_mult", 1.0) * L.get("price_mult", 1.0)
    tip_mult = eff(bal, state, "tip_jar", "tip_mult", 1.0)
    mistake_mult = eff(bal, state, "pos_tablet", "mistake_mult", 1.0)
    q_add = eff(bal, state, "grinder", "quality_add", 0.0) + eff(bal, state, "espresso_machine", "quality_add", 0.0)
    sat_add = eff(bal, state, "loyalty_cards", "satisfaction_add", 0.0)
    has_helper = state.upgrades.get("helper_barista", 0) > 0
    helper_mult = bal["upgrades"]["helper_barista"]["helper_time_mult"]

    customers = []
    for i, at in enumerate(arrivals):
        ct = rng.choices(ctypes, weights=cweights, k=1)[0]
        did, d, mods = pick_drink(rng, bal, state, ct, ev["iced_pref_mult"])
        customers.append({"arrive": at, "type": ct, "drink": d, "mods": mods,
                          "patience": bal["customers"][ct]["patience_s"] * patience_mult,
                          "critic": ev["critic"] and i == len(arrivals) // 2})

    servers = [{"free": 0.0, "helper": False}]
    if has_helper:
        servers.append({"free": 0.0, "helper": True})

    waiting = list(customers)  # sorted by arrival
    revenue = tips = ingredients = 0.0
    sats, weights = [], []
    walkouts = served = 0

    while waiting:
        srv = min(servers, key=lambda s: s["free"])
        now = max(srv["free"], waiting[0]["arrive"])
        # drop customers who gave up before now
        still = []
        for c in waiting:
            if c["arrive"] <= now and now - c["arrive"] > c["patience"]:
                walkouts += 1
                sats.append(rp["walkout_satisfaction"])
                weights.append(bal["events"]["critic"]["rep_weight"] if c["critic"] else 1.0)
            else:
                still.append(c)
        waiting = still
        if not waiting:
            break
        now = max(srv["free"], waiting[0]["arrive"])
        # choose customer
        pick = None
        if srv["helper"]:
            for c in waiting[:4]:
                if c["arrive"] <= now and "simple" in c["drink"]["tags"]:
                    pick = c
                    break
            if pick is None:
                # helper idles a bit and re-checks
                srv["free"] = now + 2.0
                if all(s["helper"] for s in servers):
                    break
                continue
        else:
            pick = waiting[0]
        waiting.remove(pick)

        spd = skill["speed"] * (helper_mult if srv["helper"] else 1.0)
        dur = make_time(bal, state, pick["drink"], pick["mods"], spd)
        wait = now - pick["arrive"]
        srv["free"] = now + dur

        d = pick["drink"]
        price = (d["price"] + sum(bal["modifiers"][m]["price_add"] for m in pick["mods"])) * price_mult
        cost = d["cost"]
        p_mistake = (1 - skill["acc"]) * mistake_mult * (1 + 0.3 * len(pick["mods"]))
        if srv["helper"]:
            p_mistake = 0.04
        c = bal["customers"][pick["type"]]
        if rng.random() < p_mistake:
            quality = rp["wrong_order_quality"]
            correct = False
        else:
            quality = min(1.0, max(0.0, rng.gauss(skill["quality"] + q_add, 0.05)))
            correct = True
        wait_score = max(0.0, 1.0 - rp["wait_penalty"] * wait / pick["patience"])
        sat = c["quality_weight"] * quality + (1 - c["quality_weight"]) * wait_score + sat_add
        sat = min(1.0, max(0.0, sat))
        revenue += price
        ingredients += cost
        if correct:
            tips += price * c["tip_rate"] * tip_mult * sat ** 2
        served += 1
        sats.append(sat)
        weights.append(bal["events"]["critic"]["rep_weight"] if pick["critic"] else 1.0)

    rent = L["rent_per_day"]
    wage = bal["upgrades"]["helper_barista"]["wage_per_day"] if has_helper else 0
    profit = revenue + tips - ingredients - rent - wage

    if sats:
        mean_sat = sum(s * w for s, w in zip(sats, weights)) / sum(weights)
        floor = rp.get("day_score_floor", 0.0)
        day_score = floor + (rp["max"] - floor) * mean_sat
        b = rp["daily_blend"]
        state.rep = min(rp["max"], max(rp["min"], (1 - b) * state.rep + b * day_score))
    state.coins += profit
    total = served + walkouts
    return {"profit": profit, "revenue": revenue, "tips": tips, "served": served,
            "walkouts": walkouts, "walkout_rate": walkouts / total if total else 0.0,
            "event": ev["name"]}


# --------------------------------------------------------------------------- shopping

def available_upgrades(bal, state):
    out = []
    for uid, u in bal["upgrades"].items():
        tier = state.upgrades.get(uid, 0)
        if tier >= len(u["costs"]):
            continue
        if u.get("min_loc", 1) > state.loc:
            continue
        tml = u.get("tier_min_loc")
        if tml and tml[tier] > state.loc:
            continue
        out.append((uid, u["costs"][tier]))
    return out


def shop(rng, bal, state, strategy):
    L = bal["locations"]
    reserve = L[str(state.loc)]["rent_per_day"] * 2

    def try_relocate():
        nxt = str(state.loc + 1)
        if nxt in L and state.rep >= L[nxt]["min_stars"] and state.coins >= L[nxt]["move_cost"] + reserve:
            state.coins -= L[nxt]["move_cost"]
            state.loc += 1
            return True
        return False

    try_relocate()
    if strategy == "saver":
        return

    # every bot except "saver" still keeps part of its wallet toward the next move,
    # the way a real player would once the next location is visible in the UI
    nxt = L.get(str(state.loc + 1))
    save_share = 0.6
    for _ in range(20):
        save = min(state.coins, nxt["move_cost"]) * save_share if nxt else 0.0
        budget = state.coins - reserve - save
        opts = [(u, c) for u, c in available_upgrades(bal, state) if c <= budget]
        if not opts:
            break
        if strategy == "cheapest":
            choice = min(opts, key=lambda x: x[1])
        elif strategy == "random":
            choice = rng.choice(opts)
        elif strategy in ("speed", "decor"):
            prio = SPEED_PRIORITY if strategy == "speed" else DECOR_PRIORITY
            ranked = sorted(opts, key=lambda x: (prio.index(x[0]) if x[0] in prio else 99, x[1]))
            choice = ranked[0]
        elif strategy == "balanced":
            # buy only if it costs at most 35% of current wallet, cheapest first
            cheap = [o for o in opts if o[1] <= 0.35 * budget + 1e-9 or o[1] <= 60]
            if not cheap:
                break
            choice = min(cheap, key=lambda x: x[1])
        else:
            break
        uid, cost = choice
        state.coins -= cost
        state.upgrades[uid] = state.upgrades.get(uid, 0) + 1
    try_relocate()


# --------------------------------------------------------------------------- runner

def simulate(bal, skill_name, strategy, seed, days):
    rng = random.Random(seed)
    st = PlayerState(coins=bal["shift"]["start_coins"], rep=bal["shift"]["start_reputation"])
    st.upgrades = {}
    log = []
    reached = {1: 0}
    for day in range(1, days + 1):
        st.day = day
        r = run_shift(rng, bal, st, SKILLS[skill_name])
        shop(rng, bal, st, strategy)
        if st.loc not in reached:
            reached[st.loc] = day
        r.update({"day": day, "coins": st.coins, "rep": st.rep, "loc": st.loc})
        log.append(r)
    return log, reached


def pct(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    k = (len(xs) - 1) * p
    f, c = math.floor(k), math.ceil(k)
    return xs[f] if f == c else xs[f] + (xs[c] - xs[f]) * (k - f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=60)
    ap.add_argument("--seeds", type=int, default=40)
    ap.add_argument("--plots", type=str, default=None)
    ap.add_argument("--json", type=str, default=None)
    args = ap.parse_args()

    bal = json.loads(BALANCE_PATH.read_text())
    results = {}
    for sk in SKILLS:
        for stg in STRATEGIES:
            runs = [simulate(bal, sk, stg, seed, args.days) for seed in range(args.seeds)]
            results[(sk, stg)] = runs

    total_bots = len(results) * args.seeds
    print(f"Simulated {total_bots} bot players x {args.days} days\n")
    header = f"{'skill':8} {'strategy':9} | {'L2 day':>7} {'L3 day':>7} {'L4 day':>7} | {'%L4':>4} | {'stars d30':>9} {'walk%':>6} {'profit/d d10':>12} {'d40':>7}"
    print(header)
    print("-" * len(header))
    summary = {}
    for (sk, stg), runs in results.items():
        row = {}
        for L in (2, 3, 4):
            ds = [r[1][L] for r in runs if L in r[1]]
            row[f"L{L}_median_day"] = pct(ds, 0.5) if ds else None
            row[f"L{L}_reached_share"] = len(ds) / len(runs)
        row["stars_d30"] = statistics.mean(r[0][29]["rep"] for r in runs)
        row["walkout_rate"] = statistics.mean(d["walkout_rate"] for r in runs for d in r[0])
        row["profit_d10"] = statistics.mean(r[0][9]["profit"] for r in runs)
        row["profit_d40"] = statistics.mean(r[0][39]["profit"] for r in runs) if args.days >= 40 else None
        summary[f"{sk}/{stg}"] = row

        def f(v):
            return "   -" if v is None else f"{v:7.1f}"
        print(f"{sk:8} {stg:9} | {f(row['L2_median_day'])} {f(row['L3_median_day'])} {f(row['L4_median_day'])} | "
              f"{row['L4_reached_share']*100:3.0f}% | {row['stars_d30']:9.2f} {row['walkout_rate']*100:5.1f}% "
              f"{row['profit_d10']:12.0f} {row['profit_d40'] if row['profit_d40'] is not None else 0:7.0f}")

    if args.json:
        Path(args.json).write_text(json.dumps(summary, indent=2))

    if args.plots:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        out = Path(args.plots)
        out.mkdir(parents=True, exist_ok=True)

        fig, ax = plt.subplots(figsize=(9, 5))
        for sk in SKILLS:
            runs = results[(sk, "balanced")]
            curve = [statistics.median(r[0][d]["coins"] for r in runs) for d in range(args.days)]
            ax.plot(range(1, args.days + 1), curve, label=f"{sk} / balanced")
        ax.set_xlabel("day"); ax.set_ylabel("coins in wallet (median)")
        ax.set_title("Wallet over time (drops = relocations and big purchases)")
        ax.legend(); ax.grid(alpha=0.3)
        fig.tight_layout(); fig.savefig(out / "wallet_by_skill.png", dpi=120); plt.close(fig)

        fig, ax = plt.subplots(figsize=(9, 5))
        for stg in STRATEGIES:
            runs = results[("average", stg)]
            curve = [statistics.mean(r[0][d]["profit"] for r in runs) for d in range(args.days)]
            ax.plot(range(1, args.days + 1), curve, label=stg)
        ax.set_xlabel("day"); ax.set_ylabel("profit per day (mean)")
        ax.set_title("Daily profit by purchase strategy (average skill)")
        ax.legend(); ax.grid(alpha=0.3)
        fig.tight_layout(); fig.savefig(out / "profit_by_strategy.png", dpi=120); plt.close(fig)

        fig, ax = plt.subplots(figsize=(9, 5))
        for sk in SKILLS:
            runs = results[(sk, "balanced")]
            curve = [statistics.mean(r[0][d]["loc"] for r in runs) for d in range(args.days)]
            ax.plot(range(1, args.days + 1), curve, label=sk)
        ax.set_xlabel("day"); ax.set_ylabel("location (mean)")
        ax.set_title("Progression through locations (balanced strategy)")
        ax.legend(); ax.grid(alpha=0.3)
        fig.tight_layout(); fig.savefig(out / "progression.png", dpi=120); plt.close(fig)
        print(f"\nPlots written to {out}")


if __name__ == "__main__":
    main()

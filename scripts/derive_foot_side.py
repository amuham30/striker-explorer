#!/usr/bin/env python3
"""Enrich strikers.json with strong_foot + side (L/R), tiered by source:
  Tier 1 (W10f): SofaScore player meta (data/sofascore_players.json, built by
    src/fetch_player_meta.py + fetch_missed_profiles.py) — authoritative
    preferredFoot + official positional tags (L*/R* -> side).
  Tier 2 (W10b): Understat raw shot caches (data/raw/understat_shots_{id}.json)
    — foot from left/right shot share (>=60% dominant, else 'Both'); side from
    median lateral Y (<0.40 R, >0.60 L, >=8 shots required).
SofaScore wins where both exist (official data vs inference).
Idempotent. Usage: python3 scripts/derive_foot_side.py
"""
import json, os, statistics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # webapp/
RAW = os.path.join(os.path.dirname(ROOT), "data", "raw")
DATA = os.path.join(ROOT, "data", "strikers.json")
SOFA = os.path.join(os.path.dirname(ROOT), "data", "sofascore_players.json")

d = json.load(open(DATA))
players = d["players"]

sofa = {}
if os.path.exists(SOFA):
    sofa = json.load(open(SOFA)).get("resolved", {})

def side_from_positions(tags):
    for t in tags or []:
        if len(t) > 1 and t[0] in ("L", "R") and t[1:] in ("B", "W", "M", "A", "S"):
            return "L" if t[0] == "L" else "R"
    return None

n_foot = n_side = n_sofa = 0
for p in players:
    # ---- Tier 1: SofaScore ----
    m = sofa.get(p["player_name"])
    if m:
        pf = m.get("preferred_foot")
        if pf in ("Left", "Right"):
            p["strong_foot"] = pf
            n_foot += 1
            n_sofa += 1
        s = side_from_positions(m.get("sofa_positions"))
        if s:
            p["side"] = s
            n_side += 1
            n_sofa += 1

    # ---- Tier 2: shot-share foot ----
    pid = str(p.get("id") or "")
    if not p.get("strong_foot"):
        lf, rf = p.get("left_foot_share") or 0, p.get("right_foot_share") or 0
        if lf + rf > 0:
            if rf >= 0.6 and rf > lf:
                p["strong_foot"] = "Right"
            elif lf >= 0.6 and lf > rf:
                p["strong_foot"] = "Left"
            else:
                p["strong_foot"] = "Both"
            n_foot += 1

    # ---- Tier 2: shot-median side ----
    if not p.get("side") and pid:
        cache = os.path.join(RAW, "understat_shots_%s.json" % pid)
        if os.path.exists(cache):
            try:
                shots = json.load(open(cache)).get("shots", [])
            except Exception:
                continue
            ys = [float(s["Y"]) for s in shots if s.get("Y")]
            if len(ys) >= 8:
                med = statistics.median(ys)
                # Understat Y runs right->left from the attacking team's view.
                # Bands 0.45/0.55 validated: Salah/TAA/Frimpong ~0.37-0.42 -> R,
                # Martinelli 0.58 -> L, central players 0.46-0.54.
                p["side"] = "R" if med < 0.45 else ("L" if med > 0.55 else None)
                if p["side"]:
                    n_side += 1

json.dump(d, open(DATA, "w"), ensure_ascii=False)
print("foot set: %d/%d (%d sofa)  side set: %d/%d (%d sofa)"
      % (n_foot, len(players), n_sofa, n_side, len(players), n_sofa))

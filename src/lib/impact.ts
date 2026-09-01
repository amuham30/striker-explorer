// ─── W14: Impact Score — position-specific stat sets + group pools ───
// Replaces the W10c weights-only version. Each stat is percentile-ranked
// within the player's POSITION GROUP pool (ATT/MID/DEF), then averaged with
// per-position weights. ST/CF/W keep finishing-heavy sets; mids blend
// creation + ball-winning; CBs/FBs are scored on defensive work + minutes;
// GKs on shot-stopping. (Old comment: finishing for ST, creation for CAM/CM,
// availability for CB/GK.)
import { percentileInPool } from "./positions";
import { deriveFifaPosition } from "./positions.fifa";
import type { Striker } from "./types";

type StatKey =
  | "npg_per90"
  | "npxg_per90"
  | "g_plus_a_per90"
  | "xa_per90"
  | "npxg_per_shot"
  | "key_passes_per90"
  | "shots_per90"
  | "minutes"
  | "tackles_per90"
  | "interceptions_per90"
  | "clearances_per90"
  | "blocks_per90"
  | "recoveries_per90"
  | "dribbled_past_per90"
  | "duel_won_pct"
  | "aerial_won_pct"
  | "pass_acc_pct"
  | "saves_per90"
  | "save_pct"
  | "clean_sheet_pct";

type Group = "ATT" | "MID" | "DEF" | "GK";

const GROUP: Record<string, Group> = {
  ST: "ATT", LW: "ATT", RW: "ATT", W: "ATT",
  CAM: "MID", CM: "MID", CDM: "MID",
  CB: "DEF", LB: "DEF", RB: "DEF",
  GK: "GK",
};

// Weights per primary position (each column set sums to 1)
const WEIGHTS: Record<string, Partial<Record<StatKey, number>> | null> = {
  // Attackers: unchanged from W10c (finishing-heavy). W16: CF merged into ST
  // — creative forwards now scored on the ST (finishing-heavy) set.
  ST: { npg_per90: 0.3, npxg_per90: 0.2, g_plus_a_per90: 0.15, npxg_per_shot: 0.15, shots_per90: 0.1, xa_per90: 0.05, key_passes_per90: 0.05 },
  LW: null, RW: null, W: null, // filled below (creation-leaning forward profile)
  // Mids: creation-led, now with real ball-winning/possession axes
  CAM: { xa_per90: 0.22, key_passes_per90: 0.27, g_plus_a_per90: 0.18, npg_per90: 0.08, npxg_per90: 0.04, shots_per90: 0.04, npxg_per_shot: 0.04, pass_acc_pct: 0.08, duel_won_pct: 0.05 },
  CM: { xa_per90: 0.18, key_passes_per90: 0.2, g_plus_a_per90: 0.15, minutes: 0.12, pass_acc_pct: 0.12, duel_won_pct: 0.08, tackles_per90: 0.05, interceptions_per90: 0.05, npxg_per90: 0.05 },
  CDM: { key_passes_per90: 0.18, xa_per90: 0.12, minutes: 0.2, tackles_per90: 0.12, interceptions_per90: 0.1, duel_won_pct: 0.1, pass_acc_pct: 0.1, recoveries_per90: 0.08 },
  // Defenders: defensive work + availability (no more goals-only fallback)
  CB: { minutes: 0.3, tackles_per90: 0.12, interceptions_per90: 0.12, clearances_per90: 0.12, duel_won_pct: 0.12, aerial_won_pct: 0.1, blocks_per90: 0.05, recoveries_per90: 0.07 },
  LB: null, RB: null, // filled below (fullbacks: availability + wide output + duels)
  // GKs: actual shot-stopping
  GK: { saves_per90: 0.3, save_pct: 0.3, clean_sheet_pct: 0.2, minutes: 0.2 },
};
WEIGHTS.LW = WEIGHTS.RW = { npg_per90: 0.18, npxg_per90: 0.15, g_plus_a_per90: 0.2, xa_per90: 0.18, key_passes_per90: 0.15, npxg_per_shot: 0.1, shots_per90: 0.05 };
WEIGHTS.W = WEIGHTS.LW;
WEIGHTS.LB = WEIGHTS.RB = { minutes: 0.25, tackles_per90: 0.1, interceptions_per90: 0.1, duel_won_pct: 0.1, pass_acc_pct: 0.1, xa_per90: 0.08, key_passes_per90: 0.07, recoveries_per90: 0.08, aerial_won_pct: 0.04, g_plus_a_per90: 0.08 };

export type Impact = {
  score: number | null; // 0–100
  valueFit: number | null; // impact − market-value percentile (positive = outperforming price)
};

export function computeImpact(
  player: Striker,
  players: Striker[]
): Impact {
  const primary = deriveFifaPosition(player);
  const weights = WEIGHTS[primary];
  if (!weights) return { score: null, valueFit: null };

  // W14: percentile pool = the player's position GROUP (CB vs CBs, ST vs
  // strikers…), not the whole outfield pool. Falls back to the whole
  // non-GK pool if the group is too thin to be meaningful.
  const group = GROUP[primary] ?? "MID";
  const groupPlayers = players.filter(
    (p) => GROUP[deriveFifaPosition(p)] === group
  );
  const pool =
    groupPlayers.length >= 30
      ? groupPlayers
      : players.filter((p) => !p.position.split(" ").includes("GK"));

  let total = 0;
  let weightSum = 0;
  for (const [stat, w] of Object.entries(weights) as [StatKey, number][]) {
    const values = pool
      .map((p) => p[stat] as number | null | undefined)
      .filter((v): v is number => v != null);
    const pct = percentileInPool(player[stat] as number | null | undefined, values);
    if (pct == null) continue; // missing stat → renormalize over present ones
    total += pct * w;
    weightSum += w;
  }
  const score = weightSum > 0 ? Math.round(total / weightSum) : null;

  // Value fit: impact percentile minus market-value percentile (valued players only)
  let valueFit: number | null = null;
  if (score != null && player.market_value_eur_m != null) {
    const valued = players
      .map((p) => p.market_value_eur_m)
      .filter((v): v is number => v != null);
    const valuePct = percentileInPool(player.market_value_eur_m, valued);
    if (valuePct != null) valueFit = Math.round(score - valuePct);
  }
  return { score, valueFit };
}

export function impactTone(score: number | null): string {
  if (score == null) return "text-ink-faint";
  if (score >= 85) return "text-good";
  if (score >= 65) return "text-info";
  if (score >= 40) return "text-gold";
  return "text-ink-dim";
}

// ─── W15: bulk scoring for tables (browse) ───
// Builds each stat's percentile pool ONCE per group instead of per player.
export function computeImpactBulk(
  players: Striker[]
): Map<number, Impact> {
  // group players by derived group (fallback: whole non-GK pool)
  const groupOf = new Map<string, Striker[]>();
  for (const p of players) {
    const g = GROUP[deriveFifaPosition(p)] ?? "MID";
    const arr = groupOf.get(g) ?? [];
    arr.push(p);
    groupOf.set(g, arr);
  }
  const bigPool = players.filter((p) => !p.position.split(" ").includes("GK"));
  const ALL_KEYS = Array.from(
    new Set(
      Object.values(WEIGHTS)
        .flatMap((w) => (w ? (Object.keys(w) as StatKey[]) : []))
    )
  );
  const poolsByGroup = new Map<string, Map<StatKey, number[]>>();
  for (const [g, arr] of groupOf) {
    const pool = arr.length >= 30 ? arr : bigPool;
    const m = new Map<StatKey, number[]>();
    for (const k of ALL_KEYS) m.set(k, []);
    for (const p of pool) {
      for (const k of m.keys()) {
        const v = p[k] as number | null | undefined;
        if (v != null) m.get(k)!.push(v);
      }
    }
    poolsByGroup.set(g, m);
  }

  const valuedValues = players
    .map((q) => q.market_value_eur_m)
    .filter((v): v is number => v != null);
  const out = new Map<number, Impact>();
  for (const p of players) {
    const weights = WEIGHTS[deriveFifaPosition(p)];
    if (!weights) {
      out.set(p.id, { score: null, valueFit: null });
      continue;
    }
    const primary = deriveFifaPosition(p);
    const group = GROUP[primary] ?? "MID";
    const pools = poolsByGroup.get(group);
    let total = 0;
    let weightSum = 0;
    for (const [stat, w] of Object.entries(weights) as [StatKey, number][]) {
      const values = pools?.get(stat) ?? [];
      const pct = percentileInPool(p[stat] as number | null | undefined, values);
      if (pct == null) continue;
      total += pct * w;
      weightSum += w;
    }
    const score = weightSum > 0 ? Math.round(total / weightSum) : null;
    let valueFit: number | null = null;
    if (score != null && p.market_value_eur_m != null) {
      const valuePct = percentileInPool(p.market_value_eur_m, valuedValues);
      if (valuePct != null) valueFit = Math.round(score - valuePct);
    }
    out.set(p.id, { score, valueFit });
  }
  return out;
}
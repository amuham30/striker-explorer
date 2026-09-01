import { readFileSync } from "fs";
import path from "path";

export type HistorySeasonStats = {
  games: number;
  minutes: number;
  goals: number;
  xG: number;
  assists: number;
  xA: number;
  shots: number;
  key_passes: number;
  npg: number;
  npxg: number;
  yellow_cards: number;
  red_cards: number;
  league: string;
};

export type HistoryPlayer = {
  name: string;
  team: string;
  seasons: Record<string, HistorySeasonStats>;
};

type HistoryPayload = {
  seasons: string[];
  players: Record<string, HistoryPlayer>;
};

let cached: HistoryPayload | null = null;

export function loadHistory(): HistoryPayload {
  if (!cached) {
    try {
      cached = JSON.parse(
        readFileSync(path.join(process.cwd(), "data", "history.json"), "utf-8")
      ) as HistoryPayload;
    } catch {
      cached = { seasons: [], players: {} };
    }
  }
  return cached ?? { seasons: [], players: {} };
}

export function historyFor(id: number | string): HistoryPlayer | null {
  const h = loadHistory();
  return h.players[String(id)] ?? null;
}

let cachedPct: Record<
  string,
  Record<string, { all: Record<string, number>; pos?: Record<string, number> }>
> | null = null;

/**
 * Per-season percentile maps (0-100) for one player, keyed by season label
 * ("2017-2018") with baseline maps: { all: {field: pct}, pos: {field: pct} }
 * ("all" = full outfield pool, "pos" = the player's position-group pool).
 * Returns {} when no history file exists.
 */
export function seasonPercentilesFor(
  id: number | string
): Record<string, { all: Record<string, number>; pos?: Record<string, number> }> {
  if (!cachedPct) {
    try {
      cachedPct = JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data", "history_percentiles.json"),
          "utf-8"
        )
      );
    } catch {
      cachedPct = {};
    }
  }
  // File shape: { "<season>": { "<player_id>": { all: {...}, pos: {...} } } }
  // — flip it to { "<season>": {all, pos} } for this player.
  const key = String(id);
  const out: Record<string, { all: Record<string, number>; pos?: Record<string, number> }> = {};
  for (const [season, players] of Object.entries(cachedPct ?? {})) {
    const m = (players as Record<string, { all: Record<string, number>; pos?: Record<string, number> }>)[key];
    if (m) out[season] = m;
  }
  return out;
}

export type AgeCurvePoint = { g_plus_a_per90: number; n: number };
export type AgeCurve = {
  curve: Record<string, AgeCurvePoint>;
  note: string;
};

let cachedCurve: AgeCurve | null = null;

export function loadAgeCurve(): AgeCurve {
  if (!cachedCurve) {
    try {
      cachedCurve = JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data", "age_curve.json"),
          "utf-8"
        )
      ) as AgeCurve;
    } catch {
      cachedCurve = { curve: {}, note: "" };
    }
  }
  return cachedCurve ?? { curve: {}, note: "" };
}

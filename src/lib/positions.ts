// Phase W10 — position groups.
// Understat position strings are space-separated letter codes, e.g. "F M S".
// S = striker slot, F = forward, M = midfielder, D = defender, GK = goalkeeper.
// Multi-position players belong to every group they list.

export const POSITION_GROUPS = ["S", "F", "M", "D", "GK"] as const;
export type PositionGroup = (typeof POSITION_GROUPS)[number];

export const GROUP_LABELS: Record<PositionGroup, string> = {
  S: "Strikers",
  F: "Forwards",
  M: "Midfielders",
  D: "Defenders",
  GK: "Goalkeepers",
};

/** True if the player's position string lists the given group. */
export function inGroup(position: string, group: PositionGroup): boolean {
  return position.split(" ").includes(group);
}

/** Percentile of `value` within `pool` (0–100, rounded). */
export function percentileInPool(
  value: number | null | undefined,
  pool: number[]
): number | null {
  if (value == null || pool.length === 0) return null;
  const below = pool.filter((v) => v <= value).length;
  return Math.round((below / pool.length) * 100);
}
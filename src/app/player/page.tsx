import Link from "next/link";
import { readFileSync } from "fs";
import path from "path";
import { PlayerDetail } from "@/components/player-detail";
import { inGroup, percentileInPool, type PositionGroup } from "@/lib/positions";
import { ArrowLeft } from "lucide-react";
import { computeImpact, computeImpactBulk } from "@/lib/impact";
import { historyFor, loadAgeCurve, seasonPercentilesFor } from "@/lib/history";
import type { StrikersPayload, Striker } from "@/lib/types";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Fields the percentile bars show — recomputed vs the position group here
const PCT_FIELDS = [
  "npg_per90",
  "npxg_per90",
  "g_plus_a_per90",
  "xa_per90",
  "npxg_per_shot",
  "key_passes_per90",
  "minutes",
] as const;

type PctField = (typeof PCT_FIELDS)[number];

export default async function PlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; s?: string; id?: string }>;
}) {
  const params = await searchParams;
  const seasonParam = params.s && /^\d{4}$/.test(params.s)
    ? `${Number(params.s) - 1}-${params.s}`
    : undefined;
  const raw = readFileSync(
    path.join(process.cwd(), "data", "strikers.json"),
    "utf-8"
  );
  const payload: StrikersPayload = JSON.parse(raw);
  // W14: namesakes (41 duplicated names in the pool) are disambiguated by id
  // when the link carries it; name-only links keep working (first match).
  const idParam = params.id && /^\d+$/.test(params.id) ? Number(params.id) : undefined;
  const player: Striker | undefined = idParam != null
    ? payload.players.find((p) => p.id === idParam)
    : payload.players.find((p) => norm(p.player_name) === norm(decodeURIComponent(params.p ?? "")));

  // W15: season-aware spec sheet — per-season stats + Impact for the switcher
  let seasonStatsAll: Record<
    string,
    Record<string, string | number | undefined>
  > = {};
  const seasonImpactAll: Record<string, number | null> = {};
  if (player) {
    try {
      const hist = JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data", "history_compare.json"),
          "utf-8"
        )
      ) as {
        byPlayer: Record<
          string,
          { seasons: Record<string, Record<string, string | number | undefined>> }
        >;
      };
      seasonStatsAll = hist.byPlayer[String(player.id)]?.seasons ?? {};
      const browseRows = JSON.parse(
        readFileSync(
          path.join(process.cwd(), "data", "history_browse.json"),
          "utf-8"
        )
      ) as Record<string, Striker[]>;
      for (const s of Object.keys(seasonStatsAll)) {
        const rows = browseRows[s];
        if (rows) {
          seasonImpactAll[s] =
            computeImpactBulk(rows).get(player.id)?.score ?? null;
        }
      }
    } catch {
      seasonStatsAll = {};
    }
  }

  // Phase W10: percentiles vs the player's primary position group
  let positionPct: Partial<Record<PctField, number>> | undefined;
  if (player) {
    const primary = player.position.split(" ")[0] as PositionGroup;
    const pool = payload.players.filter((p) => inGroup(p.position, primary));
    const out: Partial<Record<PctField, number>> = {};
    for (const f of PCT_FIELDS) {
      out[f] = percentileInPool(
        player[f],
        pool.map((p) => (p[f] ?? null) as number | null).filter(
          (v): v is number => v != null
        )
      ) as number | undefined;
    }
    positionPct = out;
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-10 md:py-12">
      <nav className="mb-6 text-sm animate-rise">
        <Link href="/" className="inline-flex items-center gap-1 text-ink-dim underline-offset-4 transition-colors duration-150 hover:text-gold hover:underline">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to Browse
        </Link>
        <span className="mx-2 text-line-strong">|</span>
        <Link href="/compare" className="text-ink-dim underline-offset-4 transition-colors duration-150 hover:text-gold hover:underline">
          Compare
        </Link>
      </nav>
      {player ? (
        <PlayerDetail
          player={player}
          positionPct={positionPct}
          impact={computeImpact(player, payload.players)}
          history={historyFor(player.id)}
          seasonPct={seasonPercentilesFor(player.id)}
          initialSeason={seasonParam}
          seasonStatsAll={seasonStatsAll}
          seasonImpactAll={seasonImpactAll}
          ageDelta={(() => {
            const curve = loadAgeCurve().curve;
            const at = player.age != null ? curve[String(player.age)] : undefined;
            if (!at || player.g_plus_a_per90 == null) return null;
            return {
              delta: player.g_plus_a_per90 - at.g_plus_a_per90,
              age: player.age as number,
              pool: at.g_plus_a_per90,
              n: at.n,
            };
          })()}
          ageCurveRows={(() => {
            const curve = loadAgeCurve().curve;
            return Object.entries(curve)
              .map(([age, v]) => ({ age: Number(age), ga: v.g_plus_a_per90 }))
              .sort((a, b) => a.age - b.age);
          })()}
          ageCareerRows={(() => {
            const histP = historyFor(player.id);
            if (!histP || player.age == null) return [];
            const rows: { age: number; ga: number }[] = [];
            for (const [label, s] of Object.entries(histP.seasons)) {
              const endYear = Number(label.slice(5, 9));
              const ga = (s as unknown as Record<string, number | undefined>).g_plus_a_per90;
              if (!endYear || s.minutes == null || s.minutes < 450) continue;
              if (ga == null) continue;
              const ageAt = player.age - (2025 - endYear);
              if (ageAt >= 15 && ageAt <= 45) rows.push({ age: ageAt, ga });
            }
            return rows.sort((a, b) => a.age - b.age);
          })()}
        />
      ) : (
        <p className="text-ink-dim">
          Player not found. Go back to Browse and pick one.
        </p>
      )}
    </main>
  );
}

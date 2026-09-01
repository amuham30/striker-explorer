"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { animate } from "animejs";
import { deriveFifaPositions, FIFA_LABELS } from "@/lib/positions.fifa";
import { impactTone } from "@/lib/impact";
import { MetricInfo } from "@/components/metric-info";
import { AgeCurveChart } from "@/components/age-curve-chart";
import { TeamBadge } from "@/components/team-badge";
import type { HistoryPlayer, HistorySeasonStats } from "@/lib/history";
import { ArrowUp, Minus, Star, RectangleVertical } from "lucide-react";

import type { Striker, UnderstatShot } from "@/lib/types";

const PERCENTILE_BARS: {
  key:
    | "pct_npg_per90"
    | "pct_npxg_per90"
    | "pct_g_plus_a_per90"
    | "pct_xa_per90"
    | "pct_npxg_per_shot"
    | "pct_key_passes_per90"
    | "pct_minutes";
  label: string;
  arrow: "up" | "desc";
}[] = [
  { key: "pct_npg_per90", label: "Non-penalty goals /90", arrow: "up" },
  { key: "pct_npxg_per90", label: "npxG /90 (chance quality)", arrow: "up" },
  { key: "pct_g_plus_a_per90", label: "Goals + assists /90", arrow: "up" },
  { key: "pct_xa_per90", label: "xA /90 (creation)", arrow: "up" },
  { key: "pct_npxg_per_shot", label: "Shot quality (npxG/shot)", arrow: "up" },
  { key: "pct_key_passes_per90", label: "Key passes /90", arrow: "up" },
  { key: "pct_minutes", label: "Minutes played", arrow: "desc" },
];

function barColor(pct: number) {
  if (pct >= 75) return "#34d399";
  if (pct >= 50) return "#93c5fd";
  if (pct >= 25) return "#fbbf24";
  return "#f87171";
}

function PercentileBar({
  pct,
  label,
}: {
  pct: number;
  label: React.ReactNode;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef(0);
  useEffect(() => {
    if (!barRef.current) return;
    const from = Math.max(prevRef.current, 2);
    prevRef.current = pct;
    animate(barRef.current, {
      width: [`${from}%`, `${Math.max(pct, 2)}%`],
      duration: 800,
      easing: "easeOutExpo",
    });
  }, [pct]);
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
      <div className="text-[13px] text-ink-dim">{label}</div>
      <div
        className="text-xs font-semibold tabular-nums"
        style={{ color: barColor(pct) }}
      >
        {pct.toFixed(0)}th pct
      </div>
      <div className="col-span-2 h-2 w-full overflow-hidden rounded-full bg-line-strong">
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: barColor(pct) }}
        />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-mute">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-gold">{value}</div>
    </div>
  );
}

function ValueRow({
  label,
  value,
  highlight,
}: {
  label: ReactNode;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-0">
      <span className="text-[13px] text-ink-dim">{label}</span>
      <span
        className={`font-medium tabular-nums ${highlight ? "text-good" : "text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}

function ShareBar({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-[12px]">
        <span className="text-ink-dim">{label}</span>
        <span className="tabular-nums text-ink-mute">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line-strong">
        <div
          className="h-full rounded-full bg-info"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function ShotMap({ playerId }: { playerId: number }) {
  const [shots, setShots] = useState<UnderstatShot[] | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`/shots/${playerId}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: UnderstatShot[]) => {
        if (alive) setShots(d);
      })
      .catch(() => {
        if (alive) setMissing(true);
      });
    return () => {
      alive = false;
    };
  }, [playerId]);

  if (missing)
    return (
      <p className="text-sm text-ink-mute">
        Shot location data not scraped for this player yet (scraper covers
        900+ minute players and is still running).
      </p>
    );
  if (!shots)
    return <p className="text-sm text-ink-mute">Loading shot map…</p>;
  if (shots.length === 0)
    return <p className="text-sm text-ink-mute">No shots recorded this season.</p>;

  const goals = shots.filter((s) => s.result === "Goal").length;
  // pitch: 105m x 68m, attacking left->right toward the box at x=105;
  // Understat X: 1 = goal line, Y: 0..1 across width
  const px = (x: number) => x * 105;
  const py = (y: number) => y * 68;
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-ink-mute">
        <span>
          <span className="text-good">●</span> goal ({goals})
        </span>
        <span>
          <span className="text-ink-faint">●</span> no goal ({shots.length - goals})
        </span>
        <span className="ml-auto">circle size = xG</span>
      </div>
      <svg viewBox="-2 -2 109 72" className="w-full rounded-lg border border-line bg-canvas">
        {/* pitch markings */}
        <rect x="0" y="0" width="105" height="68" fill="none" stroke="#3f3f46" strokeWidth="0.4" />
        <line x1="105" y1="0" x2="105" y2="68" stroke="#3f3f46" strokeWidth="0.6" />
        <rect x="88.5" y="13.84" width="16.5" height="40.32" fill="none" stroke="#3f3f46" strokeWidth="0.4" />
        <rect x="99.5" y="24.84" width="5.5" height="18.32" fill="none" stroke="#3f3f46" strokeWidth="0.4" />
        <circle cx="94" cy="34" r="0.4" fill="#3f3f46" />
        {shots.map((s, i) => {
          const xg = parseFloat(s.xG);
          const goal = s.result === "Goal";
          return (
            <circle
              key={i}
              cx={px(parseFloat(s.X))}
              cy={py(parseFloat(s.Y))}
              r={0.8 + xg * 6}
              fill={goal ? "#34d399" : "#71717a"}
              fillOpacity={goal ? 0.85 : 0.45}
              stroke={goal ? "#065f46" : "#3f3f46"}
              strokeWidth="0.3"
            />
          );
        })}
      </svg>
    </div>
  );
}

function fmt(n: number | undefined): string {
  return n == null ? "—" : Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}

function CareerSection({
  player,
  history,
  season,
  onSeason,
}: {
  player: Striker;
  history?: HistoryPlayer | null;
  season: string;
  onSeason: (s: string) => void;
}) {
  const seasons = history
    ? Object.keys(history.seasons).sort().reverse()
    : [];
  const sel = season;
  const setSel = onSeason;
  if (!history || seasons.length === 0) return null;
  const isCurrent = sel === "current";
  const s: HistorySeasonStats | null = isCurrent
    ? {
        games: 0,
        minutes: player.minutes ?? 0,
        goals: player.goals ?? 0,
        xG: player.xG ?? 0,
        assists: player.assists ?? 0,
        xA: player.xA ?? 0,
        shots: player.shots ?? 0,
        key_passes: player.key_passes ?? 0,
        npg: player.npg ?? player.goals ?? 0,
        npxg: player.npxG ?? player.xG ?? 0,
        yellow_cards: player.yellow_cards ?? 0,
        red_cards: player.red_cards ?? 0,
        league: (player.team || "").split(",").slice(-1)[0].trim(),
      }
    : history.seasons[sel] ?? null;
  if (!s) return null;
  const p90 = (v: number) =>
    s.minutes > 0 ? ((v / s.minutes) * 90).toFixed(2) : "—";
  const histTeam = (s as HistorySeasonStats & { team?: string }).team;
  const team: string = isCurrent
    ? player.team.split(",")[0]
    : histTeam ?? history.team ?? "—";
  const tiles: { label: string; value: string }[] = [
    { label: "Club", value: team },
    { label: "Goals", value: `${fmt(s.goals)} (${fmt(s.npg)} np)` },
    { label: "Assists", value: fmt(s.assists) },
    { label: "xG", value: `${fmt(s.xG)} (${fmt(s.npxg)} np)` },
    { label: "xA", value: fmt(s.xA) },
    { label: "Shots", value: fmt(s.shots) },
    { label: "Key passes", value: fmt(s.key_passes) },
    { label: "Minutes", value: fmt(s.minutes) },
    { label: "G /90", value: p90(s.goals) },
    { label: "G+A /90", value: p90(s.goals + s.assists) },
    { label: "xG+xA /90", value: p90(s.xG + s.xA) },
  ];
  const chip =
    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors duration-150";
  return (
    <div className="panel p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
          Career by season
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSel("current")}
            className={`${chip} ${
              isCurrent
                ? "border-gold bg-gold/10 text-gold"
                : "border-line bg-panel-2 text-ink-dim hover:text-ink"
            }`}
          >
            2025/26
          </button>
          {seasons.map((label) => (
            <button
              key={label}
              onClick={() => setSel(label)}
              className={`${chip} ${
                sel === label
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-line bg-panel-2 text-ink-dim hover:text-ink"
              }`}
            >
              {label.replace("-", "/")}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-line bg-panel-2 px-3 py-2.5"
          >
            <div className="text-[10px] uppercase tracking-wider text-ink-mute">
              {t.label}
            </div>
            <div className="mt-0.5 truncate font-display text-base font-semibold text-ink">
              {t.value}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-mute">
        Historical seasons from Understat (top-5 leagues, 2014/15+). League
        play only. Percentile bars above always reflect the current season.
      </p>
    </div>
  );
}

export function PlayerDetail({
  player,
  positionPct,
  impact,
  history,
  seasonPct,
  initialSeason,
  ageDelta,
  ageCurveRows = [],
  ageCareerRows = [],
  seasonStatsAll = {},
  seasonImpactAll = {},
}: {
  player: Striker;
  positionPct?: Partial<Record<string, number | null | undefined>>;
  impact: { score: number | null; valueFit: number | null };
  history?: HistoryPlayer | null;
  seasonPct?: Record<
    string,
    { all: Record<string, number>; pos?: Record<string, number> }
  >;
  initialSeason?: string;
  ageDelta?: { delta: number; age: number; pool: number; n: number } | null;
  ageCurveRows?: { age: number; ga: number }[];
  ageCareerRows?: { age: number; ga: number }[];
  seasonStatsAll?: Record<
    string,
    Record<string, string | number | undefined>
  >;
  seasonImpactAll?: Record<string, number | null>;
}) {
  const [vsPosition, setVsPosition] = useState(false);
  const histSeasons = history ? Object.keys(history.seasons).sort().reverse() : [];
  const [season, setSeason] = useState<string>(
    initialSeason && histSeasons.includes(initialSeason) ? initialSeason : "current"
  );

  // W15: when a historical season is selected, the spec sheet shows THAT
  // season's numbers (team, counting stats, per-90s, Impact vs that pool).
  const histStats =
    season !== "current" ? seasonStatsAll?.[season] : undefined;
  const histImpact =
    season !== "current" ? seasonImpactAll?.[season] : undefined;
  const activeImpact = histStats
    ? histImpact ?? null
    : impact.score;
  const num = (v: string | number | undefined): number | null =>
    v == null || v === "" ? null : Number(v);

  const statTiles: { label: string; value: string; trend?: boolean }[] = histStats
    ? [
        { label: "Minutes", value: (num(histStats.minutes) ?? 0).toLocaleString() },
        { label: "Goals", value: String(histStats.goals ?? "—"), trend: true },
        { label: "Assists", value: String(histStats.assists ?? "—"), trend: true },
        { label: "xG", value: num(histStats.xG)?.toFixed(1) ?? "—" },
        { label: "Shots", value: String(histStats.shots ?? "—") },
        { label: "Key passes", value: String(histStats.key_passes ?? "—"), trend: true },
        { label: "npG/90", value: num(histStats.npg_per90)?.toFixed(2) ?? "—" },
      ]
    : [
        { label: "Minutes", value: player.minutes.toLocaleString() },
        { label: "Goals", value: String(player.goals), trend: true },
        { label: "Assists", value: String(player.assists), trend: true },
        { label: "xG", value: player.xG?.toFixed(1) ?? "—" },
        { label: "Shots", value: String(player.shots) },
        { label: "Key passes", value: String(player.key_passes), trend: true },
        {
          label: "Value (€M)",
          value: player.market_value_eur_m?.toFixed(1) ?? "—",
        },
      ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* ── Header: spec-sheet card (Phase W10c) ── */}
      <div className="panel overflow-hidden bg-gradient-to-br from-panel-2 to-panel">
        <div className="border-b border-line p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            {/* Left: identity + spec rows */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <TeamBadge team={histStats ? String(histStats.team ?? player.team) : player.team} size={44} />
                <h1 className="font-display text-3xl font-semibold uppercase tracking-wide text-ink">
                  {player.player_name}
                  {player.big_club && (
                    <Star size={16} aria-hidden="true" className="ml-2 inline fill-amber-400 text-amber-400" />
                  )}
                </h1>
              </div>

              {/* Spec rows: label column + value column */}
              <dl className="mt-5 grid max-w-md grid-cols-[110px_1fr] gap-x-4 gap-y-2.5 text-sm">
                <dt className="text-[11px] uppercase tracking-wide text-ink-mute">Club</dt>
                <dd className="text-ink">
                  {histStats ? String(histStats.team ?? player.team) : player.team}
                  <span className="text-ink-mute">
                    {" · "}
                    {histStats ? String(histStats.league ?? player.league) : player.league}
                  </span>
                  {season !== "current" && (
                    <span className="ml-2 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                      {season.replace("-", "/")}
                    </span>
                  )}
                </dd>

                <dt className="text-[11px] uppercase tracking-wide text-ink-mute">Position</dt>
                <dd>
                  {(() => {
                    const positions = deriveFifaPositions(player);
                    const [primary, ...secondary] = positions;
                    return (
                      <div>
                        <span
                          title={`Preferred position: ${FIFA_LABELS[primary]}`}
                          className="inline-block rounded-full border border-gold/50 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold"
                        >
                          {primary}
                        </span>
                        {secondary.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] uppercase tracking-wide text-ink-mute">
                              Secondary
                            </span>
                            {secondary.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                title={`Secondary position: ${FIFA_LABELS[s]}`}
                                className="rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[11px] text-ink-mute"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </dd>

                <dt className="text-[11px] uppercase tracking-wide text-ink-mute">Foot</dt>
                <dd className="text-ink-dim">
                  {player.strong_foot
                    ? player.strong_foot === "Both"
                      ? "Both-footed"
                      : `${player.strong_foot}-footed`
                    : "—"}
                  <span className="text-ink-mute"> (inferred)</span>
                </dd>

                <dt className="text-[11px] uppercase tracking-wide text-ink-mute">Age</dt>
                <dd className="tabular-nums text-ink-dim">
                  {player.age ?? "—"}
                  <span className="text-ink-mute">
                    {" "}
                    · {player.minutes.toLocaleString()} mins
                  </span>
                </dd>
              </dl>
            </div>

            {/* Right: Impact hero */}
            <div className="text-right">
              <div
                className={`text-5xl font-bold tabular-nums ${impactTone(activeImpact)}`}
              >
                {activeImpact ?? "—"}
              </div>
              <div className="mt-1 flex items-center justify-end text-[11px] uppercase tracking-wide text-ink-mute">
                {histStats ? `Impact · ${season.replace("-", "/")}` : "Impact score"}
                <MetricInfo id="impact" />
              </div>
              {!histStats && impact.valueFit != null && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-line-strong bg-panel-2 px-2.5 py-1 text-xs">
                  <span className={impact.valueFit >= 0 ? "text-good" : "text-bad"}>
                    {impact.valueFit >= 0 ? "+" : ""}
                    {impact.valueFit} value fit
                  </span>
                  <MetricInfo id="value_fit" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-7">
          {statTiles.map((t) => (
            <StatTile
              key={t.label}
              label={
                <>
                  {t.label}
                  {t.trend && <ArrowUp size={10} aria-hidden="true" className="ml-0.5 inline text-good" />}
                </>
              }
              value={t.value}
            />
          ))}
        </div>
      </div>

      {/* ── Percentile bars ── */}
      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
              Performance percentiles{" "}
              {season !== "current" && (
                <span className="text-sm font-normal normal-case tracking-normal text-gold">
                  · {season.replace("-", "/")} vs that season&apos;s pool
                </span>
              )}
            </h3>
            <MetricInfo id="percentile" />
          </div>
          {/* Phase W10: baseline toggle — vs all / vs position group */}
          {positionPct && (
            <div
              role="tablist"
              aria-label="Percentile baseline"
              className="flex w-fit items-center gap-1 rounded-xl border border-line bg-panel-2 p-1 text-xs"
            >
              {(
                [
                  ["vs all", false],
                  ["vs position", true],
                ] as const
              ).map(([label, val]) => (
                <button
                  key={label}
                  role="tab"
                  aria-selected={vsPosition === val}
                  onClick={() => setVsPosition(val)}
                  className={`rounded-lg px-2.5 py-1 transition-colors duration-150 ${
                    vsPosition === val
                      ? "bg-gold/15 font-medium text-gold"
                      : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {PERCENTILE_BARS.map(({ key, label, arrow }) => {
          const field = key.replace(/^pct_/, "");
          const pct =
            season !== "current"
              ? vsPosition
                ? (seasonPct?.[season]?.pos?.[field] ??
                  seasonPct?.[season]?.all?.[field] ??
                  null)
                : (seasonPct?.[season]?.all?.[field] ?? null)
              : vsPosition
                ? (positionPct?.[field] ?? null)
                : (player[key] as number | null | undefined);
          const poolNote =
            season !== "current" && pct == null
              ? " — not enough data that season"
              : vsPosition && pct == null
                ? " — not enough position data"
                : "";
          return pct != null ? (
            <PercentileBar
              key={key}
              pct={pct}
              label={
                <>
                  {label}
                  {arrow === "up"
                    ? <ArrowUp size={11} aria-hidden="true" className="ml-0.5 inline text-good" />
                    : <Minus size={11} aria-hidden="true" className="ml-0.5 inline text-ink-mute" />}
                  {poolNote}
                  <MetricInfo
                    id={
                      key === "pct_minutes"
                        ? "minutes"
                        : key.replace("pct_", "")
                    }
                  />
                </>
              }
            />
          ) : null;
        })}
      </div>

      {/* ── Career by season (Phase W11) ── */}
      <CareerSection
        player={player}
        history={history}
        season={season}
        onSeason={setSeason}
      />

      {/* ── Shot map (Phase W7) ── */}
      <div className="panel p-5">
        <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-wide text-ink">
          Shot map — 2025/26 league play
        </h3>
        <ShotMap playerId={player.id} />
      </div>

      {/* ── Shot profile (Phase W7) ── */}
      {player.n_shots_scraped ? (
        <div className="panel p-5">
          <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Shot profile{" "}
            <span className="text-sm font-normal normal-case tracking-normal text-ink-mute">
              ({player.n_shots_scraped} shots · {player.shot_xg_sum ?? "—"} xG)
            </span>
          </h3>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <ShareBar label="Shots inside the box" value={player.box_share} />
            <ShareBar label="Close range (xG-rich)" value={player.close_range_share} />
            <ShareBar label="Open play (non-penalty shots)" value={player.open_play_share} />
            <ShareBar label="From counters" value={player.counter_share} />
            <ShareBar label="From corners" value={player.corner_share} />
            <ShareBar label="Set pieces" value={player.set_piece_share} />
            <ShareBar label="Penalties" value={player.penalty_share} />
            <ShareBar label="Non-penalty shots that were goals" value={player.goals_npg_share} />
            <ShareBar label="Right foot" value={player.right_foot_share} />
            <ShareBar label="Left foot" value={player.left_foot_share} />
            <ShareBar label="Header" value={player.head_share} />
          </div>
        </div>
      ) : null}

      {/* ── Value rows ── */}
      <div className="panel px-5 py-2">
        <ValueRow
          label="Performance score"
          value={player.performance_score?.toFixed(2) ?? "—"}
        />
        <ValueRow
          label="Value ratio (score per €M)"
          value={player.value_ratio?.toFixed(2) ?? "—"}
          highlight={(player.value_ratio ?? 0) >= 1}
        />
        <ValueRow
          label={
            <>
              Discipline (
              <RectangleVertical size={10} aria-hidden="true" className="inline fill-amber-400 text-amber-400" />
              {" / "}
              <RectangleVertical size={10} aria-hidden="true" className="inline fill-red-500 text-red-500" />
              )
            </>
          }
          value={`${player.yellow_cards ?? "—"} / ${player.red_cards ?? "—"}`}
          highlight={(player.red_cards ?? 0) === 0}
        />
        <ValueRow
          label="xGChain / xGBuildup"
          value={`${player.xGChain ?? "—"} / ${player.xGBuildup ?? "—"}`}
        />
        {ageDelta && (
          <ValueRow
            label={
              <>
                Age-curve delta (age {ageDelta.age})
                <MetricInfo id="age_curve" />
              </>
            }
            value={`${ageDelta.delta >= 0 ? "+" : ""}${ageDelta.delta.toFixed(2)} G+A/90 vs age-${ageDelta.age} pool (${ageDelta.pool.toFixed(2)}, n=${ageDelta.n})`}
            highlight={ageDelta.delta > 0}
          />
        )}
      </div>

      {/* W16c: age-curve chart (bklit line) — pool average vs player's age */}
      {ageCurveRows.length > 0 && player.age != null && (
        <div className="panel p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-mute">
            Age curve — pool avg G+A/90 by age (2014/15–2024/25, 450+ min)
            <MetricInfo id="age_curve" />
          </div>
          <AgeCurveChart
            rows={ageCurveRows}
            career={ageCareerRows}
            playerAge={player.age}
            playerGa={player.g_plus_a_per90}
            delta={ageDelta?.delta ?? null}
          />
        </div>
      )}

      {/* ── Caveats footer ── */}
      <div className="rounded-xl border-t border-line p-5 text-xs leading-relaxed text-ink-mute">
        <p>
          Notes: Impact Score = position-weighted average of per-stat
          percentiles vs. the outfield pool (tap the ? next to it for the
          exact method) · Market values approximate · Minutes threshold: none
          (app pool is all top-5-league players).
        </p>
      </div>
    </div>
  );
}


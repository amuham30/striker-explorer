"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { animate } from "animejs";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Striker } from "@/lib/types";
import { computeImpact } from "@/lib/impact";

// Phase W9: configurable radar axes — pick 3–6 to form the polygon
const AXIS_CATALOG = [
  { key: "npg_per90", label: "Goals/90" },
  { key: "npxg_per90", label: "npxG/90" },
  { key: "xa_per90", label: "xA/90" },
  { key: "g_plus_a_per90", label: "G+A/90" },
  { key: "npxg_per_shot", label: "Shot quality" },
  { key: "key_passes_per90", label: "Key passes/90" },
  { key: "shots_per90", label: "Shot volume" },
] as const;

type AxisKey = (typeof AXIS_CATALOG)[number]["key"];
const MIN_AXES = 3;
const MAX_AXES = 6;
const DEFAULT_AXES: AxisKey[] = [
  "npg_per90",
  "npxg_per90",
  "xa_per90",
  "g_plus_a_per90",
  "npxg_per_shot",
];

const MAX_PLAYERS = 4;
const RADAR_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#e879f9"];

// ── W11: player × season slots ──
type SlotSeason = string; // "current" | "2017-2018" | ...
type HistSeasonStats = Record<string, number | undefined>;
type HistPlayer = { name: string; seasons: Record<string, HistSeasonStats> };
type HistPayload = {
  seasons: string[];
  byPlayer: Record<string, HistPlayer>;
  axisCaps: Record<string, Record<string, number | null>>;
};
type Slot = { p: Striker; season: SlotSeason };

function seasonShort(s: SlotSeason): string {
  return s === "current" ? "25/26" : s.replace("-", "/").replace("20", "");
}

function CountUp({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const obj = { v: 0 };
    const anim = animate(obj, {
      v: value,
      duration: 900,
      easing: "easeOutExpo",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = obj.v.toFixed(decimals);
      },
    });
    return () => {
      anim.pause();
    };
  }, [value, decimals]);
  return <span ref={ref}>0</span>;
}

const slotKey = (s: Slot) => `${s.p.id}:${s.season}`;

function slotLabel(slot: Slot): string {
    return slot.season === "current"
      ? slot.p.player_name
      : `${slot.p.player_name} ’${seasonShort(slot.season)}`;
  }


type TipPayload = { dataKey?: string | number; payload?: unknown };

function RadarTipView({
  active,
  payload,
  rawByAxis,
  selected,
}: {
  active?: boolean;
  payload?: TipPayload[];
  rawByAxis: Record<string, Record<string, number>>;
  selected: Slot[];
}) {
  if (!active || !payload?.length) return null;
  const axis = (payload[0].payload as { axis: string })?.axis;
  return (
    <div className="rounded-lg border border-line-strong bg-panel-2 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-ink">{axis}</p>
      {payload.map((e) => {
        const sl = selected.find((x) => slotKey(x) === String(e.dataKey));
        if (!sl) return null;
        const i = selected.indexOf(sl);
        return (
          <p key={String(e.dataKey)} className="flex items-center gap-1.5 text-ink-dim">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }}
            />
            {slotLabel(sl)}:{" "}
            <span className="font-medium tabular-nums text-white">
              {(rawByAxis[axis]?.[String(e.dataKey)] ?? 0).toFixed(2)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function CompareView({
  players,
}: {
  players: Striker[];
}) {
  const [selected, setSelected] = useState<Slot[]>([]);
  const [query, setQuery] = useState("");
  const [axes, setAxes] = useState<AxisKey[]>(DEFAULT_AXES);
  const [showImpactSpoke, setShowImpactSpoke] = useState(false);
  const [hist, setHist] = useState<HistPayload | null>(null);

  // Lazily pull the (slim) career payload when the compare page is used
  useEffect(() => {
    let alive = true;
    fetch("/api/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setHist(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const activeAxes = useMemo(
    () => AXIS_CATALOG.filter((ax) => axes.includes(ax.key)),
    [axes]
  );

  function toggleAxis(key: AxisKey) {
    setAxes((prev) => {
      if (prev.includes(key)) {
        // keep at least MIN_AXES spokes so the polygon stays readable
        if (prev.length <= MIN_AXES) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_AXES) return prev;
      // preserve catalog order so the polygon doesn't jump around
      return AXIS_CATALOG.filter((ax) => prev.includes(ax.key) || ax.key === key).map(
        (ax) => ax.key
      );
    });
  }

  // only players with a market value are comparable (value-based metrics need it)
  const valued: Striker[] = useMemo(
    () => players.filter((p) => p.market_value_eur_m != null),
    [players]
  );

  // pool normalization per radar axis — ROBUST: use the 99th percentile of the
  // eligible pool instead of the raw max, so one small-sample freak (e.g. a
  // 5.0 goals/90 over 45 minutes) can't crush everyone else to the center.
  const axisMax = useMemo(() => {
    const m: Record<string, number> = {};
    for (const ax of activeAxes) {
      const vals = valued
        .map((p) => (p[ax.key] as number | null) ?? null)
        .filter((v): v is number => v != null)
        .sort((a, b) => a - b);
      const idx = Math.min(vals.length - 1, Math.floor(vals.length * 0.99));
      m[ax.key] = Math.max(vals[idx] ?? 0, 0.0001);
    }
    return m;
  }, [valued, activeAxes]);

  // Impact spoke: the W10c Impact Score (already 0–100) — current season only
  const impactBySlot = useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const s of selected) {
      m[slotKey(s)] =
        s.season === "current" ? computeImpact(s.p, players).score : null;
    }
    return m;
  }, [selected, players]);

  const suggestions = useMemo(() => {
    // accent-insensitive match (e.g. "julian alvarez" finds "Julián Álvarez")
    const strip = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const q = strip(query);
    if (!q) return [];
    return valued
      .filter(
        (p) => strip(p.player_name).includes(q) && !selected.some((s) => s.p === p)
      )
      .slice(0, 6);
  }, [query, valued, selected]);

  function addPlayer(p: Striker) {
    if (selected.length < MAX_PLAYERS)
      setSelected([...selected, { p, season: "current" }]);
    setQuery("");
    // W16c: bring the radar into view so the enter animation is visible
    setTimeout(() => {
      document
        .getElementById("radar-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function removePlayer(p: Striker) {
    setSelected(selected.filter((s) => s.p !== p));
  }

  function setSlotSeason(p: Striker, season: SlotSeason) {
    setSelected(selected.map((s) => (s.p === p ? { ...s, season } : s)));
  }

  // Per-slot stat values: current season straight off the Striker row,
  // historical from the (lazy) career payload with per-90s precomputed.
  function slotVals(slot: Slot): Record<string, number | null | undefined> {
    if (slot.season === "current" || !hist) return slot.p as never;
    return (
      hist.byPlayer[String(slot.p.id)]?.seasons[slot.season] ?? {}
    );
  }

  function slotLabel(slot: Slot): string {
    return slot.season === "current"
      ? slot.p.player_name
      : `${slot.p.player_name} ’${seasonShort(slot.season)}`;
  }

  const radarData = useMemo(() => {
    const rows: Array<Record<string, string | number>> = activeAxes.map(
      (ax) => ({
        axis: ax.label,
        ...Object.fromEntries(
          selected.map((s) => {
            const v = slotVals(s)[ax.key];
            // normalize vs THAT slot's season pool cap (99th pct)
            const cap =
              s.season === "current"
                ? axisMax[ax.key]
                : (hist?.axisCaps?.[s.season]?.[ax.key] ?? null);
            const num = cap ? Math.min(100, ((v as number) / cap) * 100) : 0;
            return [slotKey(s), v != null && cap ? num : 0];
          })
        ),
      }));
    if (showImpactSpoke) {
      rows.push({
        axis: "Impact",
        ...Object.fromEntries(
          selected.map((s) => [slotKey(s), impactBySlot[slotKey(s)] ?? 0])
        ),
      });
    }
    return rows;
  }, [selected, activeAxes, axisMax, showImpactSpoke, impactBySlot, hist]);


  // Raw per-90 values per axis & slot — shown in the radar tooltip
  const rawByAxis = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const ax of activeAxes) {
      m[ax.label] = Object.fromEntries(
        selected.map((sl) => {
          const v = slotVals(sl)[ax.key];
          return [slotKey(sl), typeof v === "number" ? v : 0];
        })
      );
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAxes, selected, hist]);

    return (
    <div className="space-y-6">
      {/* Player picker */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search strikers to compare (up to ${MAX_PLAYERS})…`}
            className="field-input min-w-[260px] flex-1"
          />
          {selected.map((s) => (
            <span
              key={slotKey(s)}
              className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-panel-2 py-1 pl-3 pr-1 text-xs text-ink-dim"
            >
              {slotLabel(s)}
              <button
                onClick={() => removePlayer(s.p)}
                className="rounded-full px-1.5 transition-colors duration-150 hover:text-ink"
                aria-label={`Remove ${s.p.player_name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        {query && suggestions.length > 0 && (
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-canvas">
            {suggestions.map((p) => (
              <li key={p.player_name}>
                <button
                  onClick={() => addPlayer(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-panel-2"
                >
                  <span>{p.player_name}</span>
                  <span className="text-ink-faint">
                    {p.team} · age {p.age ?? "?"} · €{p.market_value_eur_m ?? "?"}m
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-mute">
          Selected: {selected.length}/{MAX_PLAYERS}. Radar axes are normalized
          0–100 vs. the pool&apos;s 99th percentile per metric.
        </p>
        {/* Phase W9: axis picker + optional Impact spoke */}
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
            Radar axes — pick {MIN_AXES}–{MAX_AXES} ({axes.length} selected)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AXIS_CATALOG.map((ax) => {
              const on = axes.includes(ax.key);
              return (
                <button
                  key={ax.key}
                  onClick={() => toggleAxis(ax.key)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                    on
                      ? "border-gold/60 bg-gold/15 text-gold"
                      : "border-line-strong bg-panel-2 text-ink-dim hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {ax.label}
                </button>
              );
            })}
            <button
              onClick={() => setShowImpactSpoke((v) => !v)}
              aria-pressed={showImpactSpoke}
              className={`rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                showImpactSpoke
                  ? "border-garnet/70 bg-garnet/20 text-white"
                  : "border-line-strong bg-panel-2 text-ink-dim hover:text-ink"
              }`}
            >
              Impact spoke {showImpactSpoke ? "on" : "off"}
            </button>
          </div>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-ink-dim">
          Search above and add strikers to compare their per-90 profiles.
        </div>
      ) : (
        <>

          {/* Radar — recharts: polygons MORPH smoothly when players/axes
              change instead of replaying a mount animation */}
          <div id="radar-panel" className="panel p-4 scroll-mt-20">
            <h3 className="mb-2 text-sm font-medium text-ink-dim">
              Per-90 profile — normalized vs. the pool&apos;s 99th percentile
              (outlier-robust, capped at 100)
            </h3>
            <div className="mx-auto h-[440px] w-full max-w-[560px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="#3a3a42" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "#a0a0ab", fontSize: 11 }}
                  />
                  {selected.map((s, i) => (
                    <Radar
                      key={slotKey(s)}
                      dataKey={slotKey(s)}
                      name={slotLabel(s)}
                      stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fillOpacity={0.18}
                      strokeWidth={2}
                      dot={{
                        r: 3,
                        strokeWidth: 1,
                        stroke: "#0b0b0e",
                        fill: RADAR_COLORS[i % RADAR_COLORS.length],
                      }}
                      isAnimationActive
                      animationDuration={700}
                      animationEasing="ease-out"
                    />
                  ))}
                  <Tooltip
                    content={
                      <RadarTipView rawByAxis={rawByAxis} selected={selected} />
                    }
                    cursor={false}
                  />
                </RechartsRadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-dim">
              {selected.map((s, i) => (
                <span key={slotKey(s)} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }}
                  />
                  {slotLabel(s)}
                </span>
              ))}
            </div>
          </div>

                    {/* Glass cards on dark bases */}
          <div
            className={`grid gap-4 ${
              selected.length <= 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
            }`}
          >
            {selected.map((s, i) => {
              const v = slotVals(s);
              const isCur = s.season === "current";
              return (
              <div
                key={slotKey(s)}
                className="panel panel-hover animate-rise p-5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }}
                  />
                  <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">{s.p.player_name}</h3>
                </div>
                <p className="mb-3 text-xs text-ink-mute">
                  {isCur ? `${s.p.team} · ${s.p.league} · age ${s.p.age}` : `Season ${s.season.replace("-", "/")}`}
                </p>
                {/* W11: season picker per slot */}
                {hist && hist.byPlayer[String(s.p.id)] && (
                  <select
                    value={s.season}
                    onChange={(e) => setSlotSeason(s.p, e.target.value)}
                    aria-label={`Season for ${s.p.player_name}`}
                    className="mb-3 w-full rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-xs text-ink-dim"
                  >
                    <option value="current">2025/26 (current)</option>
                    {Object.keys(hist.byPlayer[String(s.p.id)].seasons)
                      .sort()
                      .reverse()
                      .map((label) => (
                        <option key={label} value={label}>
                          {label.replace("-", "/")}
                        </option>
                      ))}
                  </select>
                )}
                <dl className="space-y-1.5 text-sm">
                  <Row label={<>Minutes <Minus size={10} aria-hidden="true" className="inline text-ink-mute" /></>} value={(v.minutes ?? 0).toLocaleString()} />
                  <Row label={<>Goals <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={v.goals ?? 0} decimals={0} />} />
                  <Row label={<>Assists <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={v.assists ?? 0} decimals={0} />} />
                  {isCur ? (
                    <>
                      <Row label={<>Score <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={s.p.performance_score ?? 0} decimals={2} />} />
                      <Row label={<>Value €M <ArrowDown size={10} aria-hidden="true" className="inline text-bad" /></>} value={<CountUp value={s.p.market_value_eur_m ?? 0} decimals={1} />} />
                      <Row label={<>VFM <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={s.p.value_for_money ?? 0} decimals={1} />} />
                      <Row
                        label={<>Impact (0–100) <Minus size={10} aria-hidden="true" className="inline text-ink-mute" /></>}
                        value={
                          <span className="text-gold">
                            {impactBySlot[slotKey(s)] ?? "—"}
                          </span>
                        }
                      />
                    </>
                  ) : (
                    <>
                      <Row label={<>xG <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={v.xG ?? 0} decimals={1} />} />
                      <Row label={<>xA <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={v.xA ?? 0} decimals={1} />} />
                      <Row label={<>G+A /90 <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={v.g_plus_a_per90 ?? 0} decimals={2} />} />
                      <Row label={<>xG+xA /90 <ArrowUp size={10} aria-hidden="true" className="inline text-good" /></>} value={<CountUp value={((v.xG ?? 0) + (v.xA ?? 0)) / Math.max((v.minutes ?? 0) / 90, 1e-9)} decimals={2} />} />
                    </>
                  )}
                </dl>
              </div>
              );
            })}
          </div>

          {/* Radar block moved above the cards (W16c) */}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-dim">{label}</dt>
      <dd className="font-medium tabular-nums text-white">{value}</dd>
    </div>
  );
}


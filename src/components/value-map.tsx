"use client";

// ─── W4: Value map — market value (x) vs Impact (y), bubble = minutes ───
// The original scatter vision: bargain quadrant is upper-left (cheap + high
// Impact), superstar quadrant upper-right. Built on recharts (already in the
// app) — bklit's scatter is time-series-only, a poor fit for a numeric x-axis.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MetricInfo } from "@/components/metric-info";
import { deriveFifaPosition, type FifaCode } from "@/lib/positions.fifa";
import type { Impact } from "@/lib/impact";
import type { Striker } from "@/lib/types";

// Design-system tokens (globals.css @theme): garnet/blau/gold + neutral
const GROUP_COLOR: Record<string, string> = {
  ATT: "#edbb00", // gold
  MID: "#4d82d9", // blau
  DEF: "#c81e63", // garnet
  GK: "#8a8a93",  // neutral
};
const GROUP_LABEL: Record<string, string> = {
  ATT: "Attack", MID: "Midfield", DEF: "Defence", GK: "Goalkeeper",
};

function groupOf(p: Striker): string {
  const f: FifaCode = deriveFifaPosition(p);
  if (f === "GK") return "GK";
  if (f === "CB" || f === "LB" || f === "RB") return "DEF";
  if (f === "CDM" || f === "CM" || f === "CAM") return "MID";
  return "ATT";
}

type Point = {
  p: Striker;
  value: number;
  impact: number;
  minutes: number;
  z: number;
  group: string;
};

export function ValueMap({
  players,
  impactMap,
}: {
  players: Array<Striker>;
  impactMap: Map<number, Impact>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const { points, medValue, medImpact } = useMemo(() => {
    const pts: Point[] = [];
    const values: number[] = [];
    const impacts: number[] = [];
    for (const p of players) {
      if (p.market_value_eur_m == null || p.minutes < 450) continue;
      const sc = impactMap.get(p.id)?.score;
      if (sc == null) continue;
      pts.push({
        p,
        value: p.market_value_eur_m,
        impact: sc,
        minutes: p.minutes,
        z: Math.max(p.minutes, 200),
        group: groupOf(p),
      });
      values.push(p.market_value_eur_m);
      impacts.push(sc);
    }
    const median = (arr: number[]) => {
      if (!arr.length) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    return { points: pts, medValue: median(values), medImpact: median(impacts) };
  }, [players, impactMap]);

  const series = useMemo(() => {
    const byGroup = new Map<string, Point[]>();
    for (const d of points) {
      if (hidden.has(d.group)) continue;
      const arr = byGroup.get(d.group) ?? [];
      arr.push(d);
      byGroup.set(d.group, arr);
    }
    return Array.from(byGroup.entries()).map(([g, arr]) => ({
      group: g,
      color: GROUP_COLOR[g] ?? "#8a8a93",
      data: arr,
    }));
  }, [points, hidden]);

  function toggleGroup(g: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  return (
    <div className="panel overflow-hidden p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition-colors duration-150 ${
          open ? "bg-panel-2 text-ink" : "bg-gold/15 text-gold"
        } hover:text-gold`}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
          {open ? "Hide value map" : "Show value map"}
          <MetricInfo id="value_fit" as="span" />
        </span>
        {open
          ? <ChevronUp size={14} aria-hidden="true" />
          : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {open && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {Object.entries(GROUP_LABEL).map(([g, label]) => (
              <button
                key={g}
                onClick={() => toggleGroup(g)}
                onMouseEnter={() => setHoveredGroup(g)}
                onMouseLeave={() => setHoveredGroup(null)}
                aria-pressed={!hidden.has(g)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] transition-colors duration-150 ${
                  hidden.has(g)
                    ? "border-line text-ink-faint"
                    : hoveredGroup === g
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-line-strong text-ink"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: hidden.has(g) ? "transparent" : GROUP_COLOR[g],
                    border: `1px solid ${GROUP_COLOR[g]}`,
                  }}
                />
                {label}
              </button>
            ))}
            <span className="text-[11px] text-ink-faint">
              bubble size = minutes · quadrants split at pool medians
            </span>
          </div>

          <div className="mt-3 h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#2a2a30" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="value"
                  scale="log"
                  domain={[0.5, 300]}
                  allowDataOverflow
                  ticks={[1, 5, 10, 25, 50, 100, 250]}
                  tickFormatter={(v: number) => `€${v}M`}
                  tick={{ fill: "#8a8a93", fontSize: 11 }}
                  name="Value"
                />
                <YAxis
                  type="number"
                  dataKey="impact"
                  domain={[0, 100]}
                  tick={{ fill: "#8a8a93", fontSize: 11 }}
                  width={36}
                  name="Impact"
                />
                <ZAxis type="number" dataKey="z" range={[30, 260]} />
                <ReferenceLine x={medValue} stroke="#8a8a93" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={medImpact} stroke="#8a8a93" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as Point;
                    return (
                      <div className="rounded-xl border border-line-strong bg-panel-2 p-3 text-xs shadow-2xl">
                        <div className="font-medium text-ink">{d.p.player_name}</div>
                        <div className="text-[11px] text-ink-mute">
                          {d.p.team.split(",")[0].trim()} · {d.minutes.toLocaleString()} min
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums text-ink-dim">
                          <span>Impact</span><span className="text-right font-semibold text-ink">{d.impact}</span>
                          <span>Value</span><span className="text-right">€{d.value.toFixed(1)}M</span>
                          <span>Score/€M</span>
                          <span className="text-right">
                            {d.p.value_ratio == null ? "—" : d.p.value_ratio.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                {series.map((s) => (
                  <Scatter
                    key={s.group}
                    name={GROUP_LABEL[s.group] ?? s.group}
                    data={s.data}
                    dataKey="impact"
                    fill={s.color}
                    fillOpacity={hoveredGroup && hoveredGroup !== s.group ? 0.15 : 0.75}
                    stroke={s.color}
                    strokeOpacity={0.9}
                    onClick={(data: unknown) => {
                      const d = data as { payload?: Point } | undefined;
                      const player = d?.payload?.p;
                      if (player) {
                        router.push(
                          `/player?p=${encodeURIComponent(player.player_name)}&id=${player.id}`
                        );
                      }
                    }}
                    className="cursor-pointer"
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-ink-faint">
            <span>Upper-left: <span className="text-good">bargains</span> — high Impact, low cost</span>
            <span>Upper-right: superstars — high Impact, high cost</span>
            <span>Click a bubble to open the player page</span>
          </div>
        </>
      )}
    </div>
  );
}
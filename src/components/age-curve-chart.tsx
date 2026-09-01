"use client";

// W16c: age-curve as a bklit line chart — pool-average G+A/90 by age with the
// player's own marker overlaid (previously: a single "+/- delta" number tile).
import { LineChart, Line } from "@/components/charts/line-chart";

export type AgeCurveRow = { age: number; ga: number };

export function AgeCurveChart({
  rows,
  career = [],
  playerAge,
  playerGa,
  delta,
}: {
  rows: AgeCurveRow[];
  /** Player's own career G+A/90 by season-age (may be empty for W12 players) */
  career?: AgeCurveRow[];
  playerAge?: number | null;
  playerGa?: number | null;
  delta?: number | null;
}) {
  // Age → date axis (bklit LineChart is time-series): age n → day n of 2024
  const ageToDate = (age: number) => new Date(2024, 0, Math.min(age, 28));
  const data = rows
    .map((r) => ({
      date: ageToDate(r.age),
      pool: r.ga,
      you: career.find((c) => c.age === r.age)?.ga ?? null,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Linear age domain for ticks + player marker (overlay, % of plot width)
  const ages = rows.map((r) => r.age);
  const aMin = Math.min(...ages);
  const aMax = Math.max(...ages);
  const pct = (age: number) => ((age - aMin) / (aMax - aMin)) * 100;
  const tickAges = [aMin, 20, 24, 28, 32, 36, aMax].filter(
    (a, i, arr) => a >= aMin && a <= aMax && arr.indexOf(a) === i,
  );
  const showMarker = playerAge != null && playerAge >= aMin && playerAge <= aMax;

  return (
    <div>
      <div className="relative h-[240px] w-full">
        <LineChart data={data} xDataKey="date" aspectRatio="5 / 2">
          <Line dataKey="pool" stroke="#edbb00" strokeWidth={2.5} />
          {career.length > 0 && (
            <Line dataKey="you" stroke="#4d82d9" strokeWidth={2.5} />
          )}
        </LineChart>
        {showMarker && (
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: `${pct(playerAge)}%` }}
          >
            <div className="absolute inset-y-0 w-px bg-ink/25" />
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-gold"
              style={{ width: 10, height: 10 }}
            />
            <div className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink-faint px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink">
              YOU · {playerAge}
            </div>
          </div>
        )}
      </div>
      {/* Age axis (bklit XAxis is date-only, so ages are labeled manually) */}
      <div className="relative mt-1 h-4 w-full text-[10px] text-ink-mute">
        {tickAges.map((a) => (
          <span
            key={a}
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(a)}%` }}
          >
            {a}
          </span>
        ))}
        <span className="absolute right-0 top-3.5">age</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-mute">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: "#edbb00" }} />
          Pool average
        </span>
        {career.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: "#4d82d9" }} />
            Player by season-age
          </span>
        )}
        {playerAge != null && playerGa != null && (
          <span>
            <span className="font-semibold text-ink">{playerGa.toFixed(2)} G+A/90</span>{" "}
            at age {playerAge} —{" "}
            <span className={`font-semibold ${(delta ?? 0) >= 0 ? "text-good" : "text-bad"}`}>
              {delta == null ? "" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`}
            </span>{" "}
            vs age pool
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-mute">
        How to read: the curve is the average G+A/90 across all top-10-league players at
        each age (output typically peaks around 24–27). The gold dot marks where this
        player sits today — above the curve at his age means he&apos;s outperforming peers
        of the same age. The blue line (when shown) traces his own career season by
        season against that curve, so you can see if he&apos;s rising toward the peak or
        declining past it.
      </p>
    </div>
  );
}
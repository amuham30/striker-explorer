"use client";

// W16c: Barça Fit explorer — client-side filtering (search, max age, min
// minutes). Current Barça players are excluded server-side.
import { useMemo, useState } from "react";

export type FitRow = {
  id: number;
  name: string;
  team: string;
  age: number | null;
  minutes: number;
  value: number | null;
  impact: number | null;
  fit: number;
};

export function BarcaFitExplorer({ players }: { players: FitRow[] }) {
  const [query, setQuery] = useState("");
  const [maxAge, setMaxAge] = useState(40);
  const [minMinutes, setMinMinutes] = useState(450);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter(
      (p) =>
        (q === "" || p.name.toLowerCase().includes(q)) &&
        (p.age == null || p.age <= maxAge) &&
        p.minutes >= minMinutes
    );
  }, [players, query, maxAge, minMinutes]);

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <>
      {/* Top 3 highlight cards */}
      <div className="stagger mb-8 grid gap-4 md:grid-cols-3">
        {top3.map((p, i) => (
          <a
            key={p.id}
            href={`/player?p=${encodeURIComponent(p.name)}&id=${p.id}`}
            className={`panel panel-hover block p-5 ${
              i === 0 ? "border-gold/40 bg-gradient-to-b from-gold/10 to-transparent" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                #{i + 1} Barça Fit
              </span>
              <span className="rounded-full bg-garnet px-3 py-1 text-sm font-bold text-white">
                {p.fit}
              </span>
            </div>
            <div className="mt-3 text-xl font-bold text-ink">{p.name}</div>
            <div className="mt-1 text-sm text-ink-dim">
              {p.team} · age {p.age ?? "—"} · €{p.value ?? "—"}M
            </div>
            <div className="mt-2 text-sm text-blau">Impact: {p.impact ?? "—"}</div>
          </a>
        ))}
      </div>

      {/* Filters (like browse: labeled) */}
      <div className="panel mb-4 flex flex-wrap items-end gap-4 p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-ink-mute">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Player name…"
            className="field-input min-w-0"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-dim">
          <span className="text-[10px] uppercase tracking-wider text-ink-mute">Max age</span>
          <span className="flex items-center gap-2">
            <input type="range" min={17} max={40} value={maxAge} className="accent-gold"
              onChange={(e) => setMaxAge(Number(e.target.value))} />
            <input type="number" min={17} max={40} value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="field-input w-16 tabular-nums" />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-dim">
          <span className="text-[10px] uppercase tracking-wider text-ink-mute">Min minutes</span>
          <span className="flex items-center gap-2">
            <input type="range" min={0} max={3000} step={50} value={minMinutes} className="accent-gold"
              onChange={(e) => setMinMinutes(Number(e.target.value))} />
            <input type="number" min={0} max={3000} step={50} value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="field-input w-20 tabular-nums" />
          </span>
        </label>
        <span className="pb-2 text-xs text-ink-faint">
          {filtered.length} eligible non-Barça players
        </span>
      </div>

      {/* Ranked table — fits the page, never scrolls horizontally */}
      <div className="panel overflow-hidden">
        <table className="w-full min-w-0 table-auto text-sm">
          <thead className="bg-panel-2 text-left text-xs uppercase tracking-wider text-ink-mute">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Club</th>
              <th className="px-3 py-3 text-center">Age</th>
              <th className="px-3 py-3 text-center">Mins</th>
              <th className="px-3 py-3 text-center">€M</th>
              <th className="px-3 py-3 text-center">Impact</th>
              <th className="px-3 py-3 text-center">Fit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rest.map((p, i) => (
              <tr key={p.id} className="transition-colors duration-150 hover:bg-panel-2">
                <td className="px-4 py-2.5 tabular-nums text-ink-faint">{i + 4}</td>
                <td className="px-4 py-2.5 font-medium text-ink">
                  <a
                    href={`/player?p=${encodeURIComponent(p.name)}&id=${p.id}`}
                    className="transition-colors duration-150 hover:text-gold"
                  >
                    {p.name}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-ink-dim">{p.team}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-ink-dim">{p.age ?? "—"}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-ink-dim">
                  {p.minutes.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums text-ink-dim">
                  {p.value ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums text-ink-dim">
                  {p.impact ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="rounded-full bg-garnet/80 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                    {p.fit}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
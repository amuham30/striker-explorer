import { BALLONDOR_SEASONS } from "@/lib/ballondor";
import { PageHeader } from "@/components/site-nav";
import { readFileSync } from "fs";
import path from "path";
import type { StrikersPayload } from "@/lib/types";
import { Medal } from "lucide-react";

export default function BallonDorPage() {
  const raw = readFileSync(
    path.join(process.cwd(), "data", "strikers.json"),
    "utf-8"
  );
  const payload: StrikersPayload = JSON.parse(raw);
  const inPool = new Set(payload.players.map((p) => p.player_name));

  // W14: resolve each entry to the RIGHT row by (name, club) — namesakes like
  // the two Vitinhas must not share a name-only link.
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tokens = (s: string) =>
    new Set(norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3));
  const clubTokens = (club: string) => {
    const t = tokens(club);
    for (const drop of ["fc", "cf", "ac", "sc", "club", "the"])
      if (t.size > 1) t.delete(drop);
    return t;
  };
  const entryId = (e: { player_name: string; club: string }): number | null => {
    const rows = payload.players.filter((p) => norm(p.player_name) === norm(e.player_name));
    if (rows.length === 0) return null;
    if (rows.length === 1) return rows[0].id;
    const ct = clubTokens(e.club);
    let best: { id: number; n: number } | null = null;
    for (const r of rows) {
      for (const part of r.team.split(",")) {
        const overlap = [...clubTokens(part)].filter((t) => ct.has(t)).length;
        if (!best || overlap > best.n) best = { id: r.id, n: overlap };
      }
    }
    return best && best.n > 0 ? best.id : null;
  };
  const idOf = new Map<string, number | null>();
  for (const s of BALLONDOR_SEASONS)
    for (const e of s.top5)
      idOf.set(`${e.year}-${e.rank}`, entryId(e));

  const seasons = [...BALLONDOR_SEASONS].sort((a, b) => b.year - a.year);
  const medal = (rank: number) =>
    rank === 1 ? "text-gold" : rank === 2 ? "text-zinc-300" : rank === 3 ? "text-amber-600" : "text-ink-mute";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        kicker="History · 2010–2025"
        title="Ballon d'Or — Top 5 by Season"
        lead="Every season from 2010 to 2025 (2020 not awarded). Players still in the dataset link to their profile; others are shown for history only."
      />

      {/* Timeline treatment: gold spine with hanging season cards */}
      <div className="relative mx-auto max-w-5xl pl-6 md:pl-10">
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-1.5 top-2 w-px bg-gradient-to-b from-gold/60 via-line-strong to-transparent md:left-3.5"
        />
        <div className="space-y-4">
          {seasons.map((s) => (
            <section key={s.year} className="relative animate-rise">
              <div className="panel p-4">
                <h2 className="relative mb-2 flex items-baseline justify-between">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[38.5px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_8px_rgba(237,187,0,0.7)] md:-left-[46.5px]"
                  />
                  <span className="font-display text-lg font-semibold uppercase tracking-wide text-gold">
                    {s.year}
                  </span>
                  <span className="text-xs font-normal text-ink-faint">
                    {s.note ?? "men's award"}
                  </span>
                </h2>
                <ol className="space-y-1 text-sm">
                  {s.top5.map((e) => {
                    const pid = idOf.get(`${e.year}-${e.rank}`) ?? null;
                    const linked = inPool.has(e.player_name) && pid != null;
                    return (
                      <li key={`${e.year}-${e.rank}`} className="flex items-center gap-2">
                        <span className={`inline-flex w-7 shrink-0 items-center justify-end ${medal(e.rank)}`}>
                          {e.rank <= 3 ? (
                            <Medal size={16} aria-hidden="true" />
                          ) : (
                            <span className="tabular-nums">{e.rank}.</span>
                          )}
                        </span>
                        {linked ? (
                          <a
                            href={`/player?p=${encodeURIComponent(e.player_name)}&id=${pid}&s=${e.year}`}
                            className="font-medium text-ink underline-offset-4 transition-colors duration-150 hover:text-good hover:underline"
                          >
                            {e.player_name}
                          </a>
                        ) : (
                          <span className="text-ink-dim">{e.player_name}</span>
                        )}
                        <span className="ml-auto text-xs text-ink-faint">{e.club}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-5xl text-xs leading-relaxed text-ink-mute">
        Source: Wikipedia Ballon d&apos;Or year pages. The FIFA joint era
        (2010–2015) officially published only the top 3; rankings from 2016
        onward include the full top 5. 2020 was not awarded.
      </p>
    </main>
  );
}

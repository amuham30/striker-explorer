import { readFileSync } from "fs";
import path from "path";
import { PageHeader } from "@/components/site-nav";
import { BarcaFitExplorer, type FitRow } from "@/components/barca-fit-explorer";
import { computeImpactBulk } from "@/lib/impact";
import type { StrikersPayload } from "@/lib/types";

export const metadata = {
  title: "Barça Fit — Striker Explorer",
};

export default function BarcaPage() {
  const raw = readFileSync(
    path.join(process.cwd(), "data", "strikers.json"),
    "utf-8"
  );
  const payload: StrikersPayload = JSON.parse(raw);
  const impactMap = computeImpactBulk(payload.players);
  // W16c: exclude current Barça players — the fit page is for transfer targets
  const ranked: FitRow[] = payload.players
    .filter(
      (p) =>
        p.barca_fit_score !== null &&
        p.barca_fit_score !== undefined &&
        !/barcelona/i.test(p.team)
    )
    .sort((a, b) => (b.barca_fit_score ?? 0) - (a.barca_fit_score ?? 0))
    .map((p) => ({
      id: p.id,
      name: p.player_name,
      team: p.team,
      age: p.age ?? null,
      minutes: p.minutes,
      value: p.market_value_eur_m ?? null,
      impact: impactMap.get(p.id)?.score ?? null,
      fit: p.barca_fit_score as number,
    }));

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        kicker="Squad planning · Blaugrana lens"
        title="Barça Fit"
        lead="Forwards from Europe's top 5 leagues scored for how well they fit FC Barcelona's playstyle: box dominance (25%), clinical finishing (20%), link-up & creation (20%), shot volume (15%), shot quality (10%), availability (10%) — minus a small squad-planning penalty above age 27. League data only."
      />

      <BarcaFitExplorer players={ranked} />

      <footer className="mt-12 max-w-3xl text-xs leading-relaxed text-ink-faint">
        Caveats: scores are percentile-based within the eligible forward pool
        (450+ minutes) using league-only Understat data — Champions League and
        cup performances are not included. The age penalty is a heuristic, not
        a scouting judgment. Market values are current-date Transfermarkt
        estimates. Impact is the 0–100 position-weighted composite (see the ? icon
        on any player page for the exact method).
      </footer>
    </main>
  );
}


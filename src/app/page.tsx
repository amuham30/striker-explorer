import { readFileSync } from "fs";
import path from "path";
import { BrowseTable } from "@/components/browse-table";
import { PageHeader } from "@/components/site-nav";
import type { StrikersPayload } from "@/lib/types";

export default function Home() {
  const raw = readFileSync(
    path.join(process.cwd(), "data", "strikers.json"),
    "utf-8"
  );
  const payload: StrikersPayload = JSON.parse(raw);
  // W15: historical seasons for the browse season filter (Understat top-5,
  // 2014/15..2024/25, Striker-shaped rows — see src/build_history_browse.py)
  let seasonsData: Record<string, StrikersPayload["players"]> = {};
  try {
    seasonsData = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "data", "history_browse.json"),
        "utf-8"
      )
    );
  } catch {
    seasonsData = {};
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl overflow-x-clip px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        kicker="2025/26 · Top 10 Leagues"
        title="Striker Explorer"
        lead={
          <>
            Every player in Europe&apos;s top 5 leagues, rated by the{" "}
            <span className="text-gold">Impact Score</span> — a 0–100
            position-weighted composite (tap any ? for the exact math).
            Caveats: current-date market values · minutes sample sizes vary
            (450+).
          </>
        }
      />
      <BrowseTable players={payload.players} seasonsData={seasonsData} />
      <footer className="mt-12 text-xs text-ink-faint">
        Data: Understat (2025/26) + Transfermarkt market values. Built with
        Next.js, Motion, Anime.js &amp; Kokonut UI.
      </footer>
    </main>
  );
}


import { readFileSync } from "fs";
import path from "path";
import { CompareView } from "@/components/compare-view";
import { PageHeader } from "@/components/site-nav";
import type { StrikersPayload } from "@/lib/types";

export default function ComparePage() {
  const raw = readFileSync(
    path.join(process.cwd(), "data", "strikers.json"),
    "utf-8"
  );
  const payload: StrikersPayload = JSON.parse(raw);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        kicker="Head-to-head"
        title="Compare Strikers"
        lead="Pick up to 4 players and see their per-90 profiles against each other, normalized 0–100 vs. the pool's 99th percentile (outlier-robust)."
      />
      <CompareView players={payload.players} />
    </main>
  );
}

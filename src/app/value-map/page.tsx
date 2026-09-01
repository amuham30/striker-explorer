import { readFileSync } from "fs";
import path from "path";
import { PageHeader } from "@/components/site-nav";
import { ValueMap } from "@/components/value-map";
import { computeImpactBulk } from "@/lib/impact";
import type { StrikersPayload } from "@/lib/types";

export const metadata = {
  title: "Value Map — Striker Explorer",
};

export default function ValueMapPage() {
  const raw = readFileSync(
    path.join(process.cwd(), "data", "strikers.json"),
    "utf-8"
  );
  const payload: StrikersPayload = JSON.parse(raw);
  const impactMap = computeImpactBulk(payload.players);

  return (
    <main className="mx-auto min-h-screen max-w-7xl overflow-x-clip px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        kicker="W4 · Market lens"
        title="Value Map"
        lead="Every valued player (450+ minutes) plotted by market value vs Impact. Upper-left = bargains, upper-right = superstars. Follows the filters you know from Browse via position-group toggles."
      />
      <ValueMap players={payload.players} impactMap={impactMap} />
    </main>
  );
}
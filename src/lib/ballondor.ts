import ballondorRaw from "@/data/ballondor.json";

export type BallonDorEntry = {
  year: number;
  rank: number;
  player_name: string;
  club: string;
};

export type BallonDorSeason = {
  year: number;
  note?: string;
  top5: BallonDorEntry[];
};

export const BALLONDOR_SEASONS: BallonDorSeason[] = ballondorRaw.seasons;
export const BALLONDOR_ENTRIES: BallonDorEntry[] = ballondorRaw.entries;

function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const byPlayer = new Map<string, BallonDorEntry[]>();
for (const e of BALLONDOR_ENTRIES) {
  const k = nameKey(e.player_name);
  if (!byPlayer.has(k)) byPlayer.set(k, []);
  byPlayer.get(k)!.push(e);
}

export function ballondorFor(name: string, club?: string): BallonDorEntry[] {
  const list = byPlayer.get(nameKey(name)) ?? [];
  if (list.length <= 1 || !club) return list;
  // Namesakes (e.g. the two Vitinhas): only entries whose award club matches
  // one of the player's clubs.
  const tokens = (s: string) =>
    new Set(
      nameKey(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !["fc", "cf", "ac", "sc", "club"].includes(t))
    );
  const pt = new Set([...(club.split(",").flatMap((c) => [...tokens(c)]))]);
  const matched = list.filter((e) => {
    const et = tokens(e.club);
    for (const t of et) if (pt.has(t)) return true;
    return false;
  });
  return matched.length > 0 ? matched : [];
}

export function bestBallonDor(name: string): BallonDorEntry | null {
  const list = ballondorFor(name);
  if (list.length === 0) return null;
  return list.reduce((a, b) => (a.year > b.year ? a : b));
}
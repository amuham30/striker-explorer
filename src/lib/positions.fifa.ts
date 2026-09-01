// ─── FIFA/EA FC-style positions (rule-based + shot-geometry side inference) ───
// Code derives from Understat slot codes + statistical fingerprint; L/R side
// comes from `side` (median lateral shot position, precomputed by
// scripts/derive_foot_side.py from the raw shot caches).
// "W" (wide, side unknown) stays a valid derivation result but is NOT a
// filter chip — unknown-side players match no chip except "All positions".
export type FifaCode =
  | "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "RW" | "ST" | "W";
export const FIFA_CODES: readonly Exclude<FifaCode, "W">[] = [
  "GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST",
] as const;

export const FIFA_LABELS: Record<FifaCode, string> = {
  GK: "Goalkeeper",
  CB: "Centre-back",
  LB: "Left-back",
  RB: "Right-back",
  CDM: "Defensive mid",
  CM: "Central mid",
  CAM: "Attacking mid",
  LW: "Left wing",
  RW: "Right wing",
  W: "Wide fwd (side n/a)",
  ST: "Striker",
};

export type SideInput = {
  position: string;
  xa_per90?: number | null;
  key_passes_per90?: number | null;
  shots_per90?: number | null;
  g_plus_a_per90?: number | null;
  side?: string | null;
};

// Thresholds calibrated to pool percentiles:
//   xa_per90 ~0.15 = 75th pct, key_passes/90 ~1.5 = 78th pct,
//   shots/90 < 0.6 ~ 40th pct. Mids need BOTH xa+KP to be "creative"
//   (Rodri kp 1.56 / xa 0.14 must stay CDM); forwards need an even
//   stronger bar (Haaland xa 0.17/0.76 is gravity, not playmaking).
export function deriveFifaPosition(p: SideInput): FifaCode {
  const codes = p.position.split(" ");
  if (codes.includes("GK")) return "GK";
  const hasD = codes.includes("D");
  const hasM = codes.includes("M");
  const hasF = codes.includes("F");
  const hasS = codes.includes("S");
  const xa = p.xa_per90 ?? 0;
  const kp = p.key_passes_per90 ?? 0;
  const sp = p.shots_per90 ?? 0;
  const side = p.side === "L" || p.side === "R" ? p.side : null;
  const creative = xa >= 0.2 && kp >= 1.5; // BOTH required — pure volume passers
  // (Rodri: kp 1.56 but xa 0.14) shouldn't read as creators

  if (hasD) {
    if (side) return side === "L" ? "LB" : "RB"; // wide shot footprint = fullback/wingback
    if (!hasM && !hasF && !hasS) return "CB";
    return creative ? "CM" : "CDM";
  }
  if (hasM && !hasF) {
    // M, M+S, M+D: split by creative/defensive/box signal
    if (creative) return "CAM";
    if (sp < 0.6 && xa < 0.08) return "CDM";
    if (hasS && sp >= 1.2) return "ST"; // box-oriented second striker
    return "CM";
  }
  if (hasS) {
    // A wide shot footprint wins over the creativity check — side only gets
    // set when shots genuinely cluster wide, so inverted/creative wingers
    // (Saka, Salah) land here instead of ST. Central creators have no side.
    // W16: CF merged into ST — creative central forwards (Kane) are STs too.
    if (side) return side === "L" ? "LW" : "RW";
    return "ST"; // S or F+S
  }
  if (hasF) {
    if (side) return side === "L" ? "LW" : "RW";
    return "W";
  }
  if (side) return side === "L" ? "LW" : "RW";
  return "W";
}

// ─── Multi-position: ordered [preferred, ...secondary] codes ───
// Same data-driven signals as above; a player gets every code his slot
// codes + fingerprint genuinely support. Examples:
//   Saka  (F M S, side R, creative) -> [RW, CM]
//   Kane  (S, creative)             -> [ST] (W16: CF merged into ST)
//   Trent (D M S, side R)           -> [RB, CDM]
//   Haaland (S, pure)               -> [ST]
export function deriveFifaPositions(p: SideInput): FifaCode[] {
  const codes = p.position.split(" ");
  if (codes.includes("GK")) return ["GK"];
  const hasD = codes.includes("D");
  const hasM = codes.includes("M");
  const hasF = codes.includes("F");
  const hasS = codes.includes("S");
  const xa = p.xa_per90 ?? 0;
  const kp = p.key_passes_per90 ?? 0;
  const sp = p.shots_per90 ?? 0;
  const side = p.side === "L" || p.side === "R" ? p.side : null;
  const wide: FifaCode | null = side === "L" ? "LW" : side === "R" ? "RW" : null;
  const creative = xa >= 0.2 && kp >= 1.5;
  // Box-oriented second striker needs volume AND actual output — a
  // volume-shooting midfielder with 1 goal/2000min (PSG Vitinha) stays CM.
  const boxOriented = hasS && sp >= 1.2 && (p.g_plus_a_per90 ?? 0) >= 0.35;

  const out: FifaCode[] = [];
  const push = (...cs: FifaCode[]) => {
    for (const c of cs) if (!out.includes(c)) out.push(c);
  };

  if (hasD) {
    if (side) {
      push(side === "L" ? "LB" : "RB"); // fullback/wingback first
      if (hasM) push(creative ? "CM" : "CDM");
      else push("CB");
      return out;
    }
    if (!hasM && !hasF && !hasS) return ["CB"];
    push(creative ? "CM" : "CDM", "CB"); // hybrid defenders cover both
    return out;
  }
  if (hasM && !hasF) {
    if (creative) push("CAM", "CM");
    else if (sp < 0.6 && xa < 0.08) push("CDM", "CM");
    else if (boxOriented) push("ST", "CM"); // box-oriented second striker
    else push("CM");
    return out;
  }
  if (hasS || hasF) {
    if (wide) push(wide);
    // W16: CF merged into ST — creative central forwards are STs now.
    if (hasS) push("ST");
    if (hasM && creative) push("CAM");
    if (!out.length) push("W");
    return out;
  }
  push(wide ?? "W");
  return out;
}
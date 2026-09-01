"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import ShimmerText from "@/components/kokonutui/shimmer-text";
import { deriveFifaPosition, FIFA_CODES, FIFA_LABELS, type FifaCode } from "@/lib/positions.fifa";
import { TeamBadge } from "@/components/team-badge";
import { computeImpactBulk, impactTone } from "@/lib/impact";
import {
  ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Check,
} from "lucide-react";

import type { Striker } from "@/lib/types";

type SortKey =
  | "player_name"
  | "league"
  | "team"
  | "age"
  | "minutes"
  | "goals"
  | "assists"
  | "performance_score"
  | "value_for_money"
  | "value_ratio"
  | "impact";

const SORT_OPTIONS: { key: SortKey; label: string; asc: boolean }[] = [
  { key: "impact", label: "Impact", asc: false },
  { key: "player_name", label: "Name", asc: true },
  { key: "age", label: "Age (young first)", asc: true },
  { key: "minutes", label: "Mins", asc: false },
  { key: "goals", label: "Goals", asc: false },
  { key: "assists", label: "Assists", asc: false },
  { key: "value_for_money", label: "Value per €M", asc: false },
  { key: "value_ratio", label: "Score per €M", asc: false },
  { key: "performance_score", label: "Score", asc: false },
];

const COLUMNS: {
  key: SortKey;
  label: string;
  numeric: boolean;
  decimals?: number;
  info?: string;
  trend?: "up" | "down" | "desc";
}[] = [
  { key: "player_name", label: "Player", numeric: false },
  { key: "league", label: "League", numeric: false },
  { key: "team", label: "Team", numeric: false },
  { key: "age", label: "Age", numeric: true },
  { key: "minutes", label: "Mins", numeric: true },
  { key: "goals", label: "Goals", numeric: true },
  { key: "assists", label: "Assists", numeric: true },
  { key: "value_for_money", label: "Value/€M", numeric: true, decimals: 1 },
  { key: "value_ratio", label: "Score/€M", numeric: true, decimals: 2 },
  { key: "performance_score", label: "Score", numeric: true, decimals: 2 },
  { key: "impact", label: "Impact", numeric: true },
];

/** Responsive column tiers — smaller viewports drop lower-priority columns
    so the table NEVER overflows horizontally (no scrolling, ever). */
const COL_HIDE: Record<string, string> = {
  team: "hidden lg:table-cell",
  age: "hidden lg:table-cell",
  goals: "hidden md:table-cell",
  assists: "hidden xl:table-cell",
  minutes: "hidden xl:table-cell",
  league: "hidden xl:table-cell",
  value_for_money: "hidden lg:table-cell",
  value_ratio: "hidden 2xl:table-cell",
  performance_score: "hidden 2xl:table-cell",
};

/** Fixed-layout column widths (Player takes the remainder). */
const COL_W: Record<string, string> = {
  league: "w-[5%]",
  team: "w-[18%]",
  age: "w-[5%]",
  minutes: "w-[6%]",
  goals: "w-[6%]",
  assists: "w-[6%]",
  value_for_money: "w-[7%]",
  value_ratio: "w-[8%]",
  performance_score: "w-[7%]",
  impact: "w-[7%]",
};

/** Fan-standard short names so every team fits on one line — never clipped. */
const SHORT_TEAM: Record<string, string> = {
  "Royale Union Saint-Gilloise": "Union SG",
  "Wolverhampton Wanderers": "Wolves",
  "RasenBallsport Leipzig": "RB Leipzig",
  "New England Revolution": "New England",
  "RC Sporting Charleroi": "Charleroi",
  "West Bromwich Albion": "West Brom",
  "Sporting Kansas City": "Sporting KC",
  "San Jose Earthquakes": "San Jose",
  "Vancouver Whitecaps": "Vancouver",
  "Oud-Heverlee Leuven": "OH Leuven",
  "Red Bull Bragantino": "Bragantino",
  "Borussia M.Gladbach": "Gladbach",
  "Paris Saint Germain": "PSG",
  "Queens Park Rangers": "QPR",
  "Seattle Sounders FC": "Seattle",
  "Eintracht Frankfurt": "Frankfurt",
  "Colorado Rapids": "Colorado",
  "Orlando City SC": "Orlando City",
  "Bayern Munich": "Bayern",
  "FC Heidenheim": "Heidenheim",
  "Los Angeles FC": "LAFC",
  "Inter Miami CF": "Inter Miami",
  "Rayo Vallecano": "Rayo",
  "Houston Dynamo": "Houston",
  "Atletico Madrid": "Atl. Madrid",
  "Sporting Braga": "Braga",
  "Club Brugge KV": "Club Brugge",
  "Wolverhampton": "Wolves",
  "Philadelphia Union": "Philadelphia",
  "CF Estrela Amadora": "Estrela",
  "New York Red Bulls": "NY Red Bulls",
  "Parma Calcio 1913": "Parma",
  "Preston North End": "Preston",
  "Nottingham Forest": "Nottm Forest",
  "Sint-Truidense VV": "Sint-Truiden",
  "Charlton Athletic": "Charlton",
  "Manchester United": "Man United",
  "Manchester City": "Man City",
  "Borussia Dortmund": "Dortmund",
  "Sheffield United": "Sheffield Utd",
  "RAAL La Louvière": "La Louvière",
  "Minnesota United": "Minnesota",
  "Blackburn Rovers": "Blackburn",
  "Royal Antwerp FC": "Antwerp",
  "SV Zulte Waregem": "Zulte Waregem",
  "Atlético Mineiro": "Atl. Mineiro",
  "New York City FC": "NYCFC",
  "Portland Timbers": "Portland",
  "Bayer Leverkusen": "Leverkusen",
  "Bolton Wanderers": "Bolton",
  "Newcastle United": "Newcastle",
  "Real Betis": "Betis",
  "Brighton & Hove Albion": "Brighton",
  "West Ham United": "West Ham",
  "Tottenham Hotspur": "Tottenham",
  "Aston Villa": "Aston Villa",
  "Leeds United": "Leeds",
  "Sunderland AFC": "Sunderland",
  "Watford FC": "Watford",
  "Norwich City": "Norwich",
  "Cardiff City": "Cardiff",
  "Coventry City": "Coventry",
  "Stoke City": "Stoke",
  "Swansea City": "Swansea",
  "Hull City": "Hull",
  "Middlesbrough FC": "Middlesbrough",
  "Huddersfield Town": "Huddersfield",
  "Birmingham City": "Birmingham",
  "Wigan Athletic": "Wigan",
  "Milton Keynes Dons": "MK Dons",
};

function shortTeam(team: string): string {
  const club = team.split(",")[0].trim();
  return SHORT_TEAM[club] ?? club;
}

const LEAGUE_LOGOS: Record<string, number> = {
  "Premier League": 17,
  "La Liga": 8,
  "Serie A": 23,
  "Bundesliga": 35,
  "Ligue 1": 34,
  "Brasileirao Serie A": 325,
  "Liga Portugal": 238,
  "Belgian Pro League": 32,
  "EFL Championship": 18,
  "MLS": 242,
};

/** League logo (SofaScore unique-tournament image) with text fallback. */
function LeagueBadge({ league, size = 18 }: { league: string; size?: number }) {
  const id = LEAGUE_LOGOS[league];
  const [err, setErr] = useState(false);
  if (!id || err) {
    return (
      <span
        aria-hidden
        title={league}
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-panel-2 text-[8px] font-semibold uppercase text-ink-dim"
      >
        {league.slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://img.sofascore.com/api/v1/unique-tournament/${id}/image`}
      alt={`${league} logo`}
      title={league}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      className="shrink-0 rounded bg-white object-contain p-px"
    />
  );
}

const LEAGUES = ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "Brasileirao Serie A", "Liga Portugal", "Belgian Pro League", "EFL Championship", "MLS"];

/* ── SoFIFA-style dual-range slider ─────────────────────────
   Two overlaid native range inputs + animated fill. The min/max
   number boxes are editable; committing a value animates the fill. */
function RangeSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  format = (v: number) => String(v),
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (v: number) => string;
}) {
  const [lo, hi] = value;
  const span = max - min || 1;
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;
  const [loText, setLoText] = useState(format(lo));
  const [hiText, setHiText] = useState(format(hi));
  useEffect(() => setLoText(format(lo)), [lo]);
  useEffect(() => setHiText(format(hi)), [hi]);

  function commitText(which: "lo" | "hi") {
    const raw = which === "lo" ? loText : hiText;
    const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(n)) {
      setLoText(format(lo));
      setHiText(format(hi));
      return;
    }
    if (which === "lo") onChange([Math.min(Math.max(n, min), hi), hi]);
    else onChange([lo, Math.max(Math.min(n, max), lo)]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-ink-mute">{label}</span>
      <div className="flex items-center justify-between gap-1">
        <input
          type="text"
          inputMode="decimal"
          className="range-num"
          value={loText}
          aria-label={`${label} minimum`}
          onChange={(e) => setLoText(e.target.value)}
          onBlur={() => commitText("lo")}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <span className="text-ink-faint">–</span>
        <input
          type="text"
          inputMode="decimal"
          className="range-num text-right"
          value={hiText}
          aria-label={`${label} maximum`}
          onChange={(e) => setHiText(e.target.value)}
          onBlur={() => commitText("hi")}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <div className="range-wrap">
        <div className="range-track" />
        <div className="range-fill" style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`${label} range minimum`}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          style={{ zIndex: loPct > 92 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`${label} range maximum`}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}
/* ── SoFIFA-style position dropdown (multi-select) ────────────── */
function PositionDropdown({
  counts,
  selected,
  total,
  onToggle,
  onClear,
}: {
  counts: Record<string, number>;
  selected: Set<FifaCode>;
  total: number;
  onToggle: (f: FifaCode) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = selected.size === 0 ? "All positions" : Array.from(selected).join(", ");

  return (
    <div ref={ref} className="relative">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-mute">
        Position
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field-input flex w-full cursor-pointer items-center justify-between gap-2 text-left"
      >
        <span className={`truncate text-sm ${selected.size ? "font-medium text-gold" : "text-ink"}`}>
          {label}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`shrink-0 text-ink-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Positions"
          className="animate-rise absolute z-30 mt-1.5 w-full rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl shadow-black/60"
        >
          <button
            type="button"
            role="option"
            aria-selected={selected.size === 0}
            onClick={onClear}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-ink-dim transition-colors duration-150 hover:bg-panel-2 hover:text-ink aria-[selected=true]:bg-gold/10 aria-[selected=true]:text-gold"
          >
            <span>
              All positions <span className="tabular-nums opacity-70">{total}</span>
            </span>
            {selected.size === 0 && <Check size={13} aria-hidden="true" />}
          </button>
          <div className="my-1 h-px bg-line" />
          {FIFA_CODES.map((f) => (
            <button
              key={f}
              type="button"
              role="option"
              aria-selected={selected.has(f)}
              title={FIFA_LABELS[f]}
              onClick={() => onToggle(f)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-ink-dim transition-colors duration-150 hover:bg-panel-2 hover:text-ink aria-[selected=true]:bg-gold/10 aria-[selected=true]:text-gold"
            >
              <span>
                {f} <span className="tabular-nums opacity-70">{counts[f] ?? 0}</span>
              </span>
              {selected.has(f) && <Check size={13} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Generic custom dropdown (same style as Position): options may carry
    an icon node (league logo / club badge) and a count. */
function FancySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode; count?: number }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-mute">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field-input flex w-full cursor-pointer items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5 text-sm">
          {current?.icon}
          <span className={`truncate ${current?.value !== options[0].value ? "font-medium text-gold" : "text-ink"}`}>
            {current?.label ?? value}
          </span>
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`shrink-0 text-ink-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="animate-rise absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl shadow-black/60"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-dim transition-colors duration-150 hover:bg-panel-2 hover:text-ink aria-[selected=true]:bg-gold/10 aria-[selected=true]:text-gold"
            >
              <span className="flex min-w-0 items-center gap-2">
                {o.icon}
                <span className="truncate">{o.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {o.count != null && <span className="tabular-nums opacity-70">{o.count}</span>}
                {o.value === value && <Check size={13} aria-hidden="true" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrowseTable({ players,
  seasonsData = {},
}: {
  players: Array<Striker>;
  seasonsData?: Record<string, Array<Striker>>;
}) {
  const seasonLabels = Object.keys(seasonsData).sort().reverse();
  const [season, setSeason] = useState("current");
  // W15: season filter swaps the whole dataset (history rows are Striker-shaped)
  const effectivePlayers: Array<Striker> =
    season === "current" ? players : seasonsData[season] ?? [];
  // Impact scored once per dataset (group pools built once — see impact.ts)
  const impactMap = useMemo(
    () => computeImpactBulk(effectivePlayers),
    [effectivePlayers]
  );
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("All");
  const [club, setClub] = useState("All");
  // W16: multi-select position filter (empty set = All)
  const [posSel, setPosSel] = useState<Set<FifaCode>>(new Set());
  // SoFIFA-style dual ranges for age / value / minutes
  const bounds = useMemo(() => {
    let maxV = 0;
    let maxM = 0;
    for (const p of players) {
      if (p.market_value_eur_m != null) maxV = Math.max(maxV, p.market_value_eur_m);
      if (p.minutes != null) maxM = Math.max(maxM, p.minutes);
    }
    return {
      age: 45,
      value: Math.max(50, Math.ceil(maxV)),
      minutes: Math.max(500, Math.ceil(maxM / 500) * 500),
    };
  }, [players]);
  const [ageRange, setAgeRange] = useState<[number, number]>([16, 45]);
  const [valueRange, setValueRange] = useState<[number, number]>([0, bounds.value]);
  const [minRange, setMinRange] = useState<[number, number]>([0, bounds.minutes]);
  const [bigClubOnly, setBigClubOnly] = useState(false);
  const [valuedOnly, setValuedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("impact");
  const [sortAsc, setSortAsc] = useState(false);

  const tableRef = useRef<HTMLTableElement>(null);

  // Club options follow the selected league (league filter narrows clubs)
  const clubs = useMemo(() => {
    const set = new Set<string>();
    for (const p of effectivePlayers) {
      if (league !== "All" && p.league !== league) continue;
      for (const part of p.team.split(",")) {
        const c = part.trim();
        if (c) set.add(c);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [effectivePlayers, league]);

  // Reset club when it is not present in the league-filtered option list
  useEffect(() => {
    if (club !== "All" && !clubs.includes(club)) {
      setClub("All");
    }
  }, [clubs, club]);

  const fifaCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of effectivePlayers) {
      const f = deriveFifaPosition(p);
      c[f] = (c[f] ?? 0) + 1;
    }
    return c;
  }, [effectivePlayers]);

  const filtered = useMemo(() => {
    const q = search
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return effectivePlayers
      .filter(
        (p) =>
          (q === "" ||
            p.player_name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .includes(q)) &&
          (league === "All" || p.league === league) &&
          (club === "All" || p.team.split(",").some((t) => t.trim() === club)) &&
          (posSel.size === 0 || posSel.has(deriveFifaPosition(p))) &&
          (p.age == null || (p.age >= ageRange[0] && p.age <= ageRange[1])) &&
          (p.market_value_eur_m == null ||
            (p.market_value_eur_m >= valueRange[0] &&
              p.market_value_eur_m <= valueRange[1])) &&
          (p.minutes >= minRange[0] && p.minutes <= minRange[1]) &&
          (!bigClubOnly || p.big_club) &&
          (!valuedOnly || p.market_value_eur_m != null)
      )
      .sort((a, b) => {
        if (sortKey === "impact") {
          const va = impactMap.get(a.id)?.score ?? -1;
          const vb = impactMap.get(b.id)?.score ?? -1;
          return sortAsc ? va - vb : vb - va;
        }
        const va = a[sortKey];
        const vb = b[sortKey];
        if (typeof va === "string" && typeof vb === "string") {
          return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return sortAsc ? Number(va) - Number(vb) : Number(vb) - Number(va);
      });
  }, [effectivePlayers, impactMap, search, league, club, posSel, ageRange, valueRange, minRange, bigClubOnly, valuedOnly, sortKey, sortAsc]);

  const PAGE_SIZE = 200;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, pageCount - 1);
  const pagePlayers = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // reset to first page whenever filters/sort change
  useEffect(() => {
    setPage(0);
  }, [season, search, league, club, posSel, ageRange, valueRange, minRange, bigClubOnly, valuedOnly, sortKey, sortAsc]);

  // bring the (new) page of results into view on page change
  useEffect(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [safePage]);

  function togglePos(code: FifaCode) {
    setPosSel((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  // Anime.js staggered reveal on every filter/sort change
  useEffect(() => {
    const rows = tableRef.current?.querySelectorAll("tbody tr") ?? [];
    if (!rows.length) return;
    animate(rows, {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(8, { start: 0 }),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, [filtered]);

  function applySort(key: SortKey) {
    const opt = SORT_OPTIONS.find((o) => o.key === key);
    setSortKey(key);
    if (opt) setSortAsc(opt.asc);
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(
        typeof (effectivePlayers[0] as unknown as Record<string, unknown>)?.[key] === "string"
      ); // text: A→Z first
    }
  }

  return (
    <div className="space-y-4">
      {/* Search sits above both columns so filters & table start on the same level */}
      <div className="flex items-center justify-end">
        <label className="flex w-full max-w-sm flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-mute">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player…"
            className="field-input w-full min-w-0"
          />
        </label>
      </div>

      <div className="items-start gap-6 lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
      {/* Left filter sidebar (FC-26-style layout, static — never sticky) */}
      <aside className="panel space-y-5 self-start p-4">
        <PositionDropdown
          counts={fifaCounts}
          selected={posSel}
          total={players.length}
          onToggle={togglePos}
          onClear={() => setPosSel(new Set())}
        />

        <FancySelect
          label="Season"
          value={season}
          onChange={setSeason}
          options={[
            { value: "current", label: "2025/26 (current)" },
            ...seasonLabels.map((s) => ({
              value: s,
              label: `${s.slice(0, 4)}/${s.split("-")[1].slice(2)}`,
            })),
          ]}
        />

        <FancySelect
          label="League"
          value={league}
          onChange={setLeague}
          options={[
            { value: "All", label: "All leagues" },
            ...LEAGUES.map((l) => ({
              value: l,
              label: l,
              icon: <LeagueBadge league={l} size={18} />,
            })),
          ]}
        />

        <FancySelect
          label="Club"
          value={club}
          onChange={setClub}
          options={[
            { value: "All", label: "All clubs" },
            ...clubs.map((c) => ({
              value: c,
              label: c,
              icon: <TeamBadge team={c} size={18} className="text-[8px]" />,
            })),
          ]}
        />

        <FancySelect
          label="Sort by"
          value={sortKey}
          onChange={(v) => applySort(v as SortKey)}
          options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        />

        <RangeSlider
          label="Age"
          min={16}
          max={45}
          value={ageRange}
          onChange={setAgeRange}
        />
        <RangeSlider
          label="Value €M"
          min={0}
          max={bounds.value}
          step={0.5}
          value={valueRange}
          onChange={setValueRange}
          format={(v) => `€${v % 1 ? v.toFixed(1) : v}M`}
        />
        <RangeSlider
          label="Minutes"
          min={0}
          max={bounds.minutes}
          step={50}
          value={minRange}
          onChange={setMinRange}
          format={(v) => v.toLocaleString()}
        />

        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <label className="flex h-5 cursor-pointer items-center gap-2 text-sm text-ink-dim">
            <input type="checkbox" checked={bigClubOnly} className="accent-gold"
              onChange={(e) => setBigClubOnly(e.target.checked)} />
            Big club only
          </label>

          <label className="flex h-5 cursor-pointer items-center gap-2 text-sm text-ink-dim">
            <input type="checkbox" checked={valuedOnly} className="accent-gold"
              onChange={(e) => setValuedOnly(e.target.checked)} />
            Has market value only
          </label>
        </div>

        {season !== "current" && (
          <p className="w-full text-[11px] leading-snug text-ink-faint">
            {season.replace("-", "/")} season — Understat top-5 data only
            ({effectivePlayers.length} players with 90+ minutes). Age is
            back-dated from today, market values &amp; SofaScore stats are
            current-season only, and Impact is scored against that season&apos;s
            pool.
          </p>
        )}

      </aside>

      <div className="min-w-0 space-y-4">
              {filtered.length === 0 ? (
                <ShimmerText text="No strikers match those filters…" className="mt-8" />
              ) : (
                <div className="panel min-w-0 overflow-hidden">
                  <table ref={tableRef} className="w-full min-w-0 table-fixed text-sm">
                    <thead className="th-head text-left">
                      <tr>
                        {COLUMNS.map((c) => (
                          <th key={c.key} className={`px-2 py-2.5 align-bottom ${COL_W[c.key] ?? ""} ${COL_HIDE[c.key] ?? ""} ${c.numeric ? "text-center" : "text-left"}`}>
                              <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                              <button
                                onClick={() => toggleSort(c.key)}
                                className={`inline-flex items-center whitespace-nowrap transition-colors duration-150 hover:text-gold ${sortKey === c.key ? "text-gold underline underline-offset-4" : ""}`}
                              >
                                {c.label}
                                {sortKey === c.key &&
                                  (sortAsc ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />)}
                              </button>
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagePlayers.map((p) => (
                        <tr key={p.id}
                            className="border-t border-line transition-colors duration-150 hover:bg-panel-2">
                          {COLUMNS.map((c) => (
                            <td key={c.key}
                                className={`px-2 py-2 ${COL_HIDE[c.key] ?? ""} ${c.numeric ? "text-center tabular-nums" : "text-left"} ${c.key === "player_name" ? "truncate" : ""} ${c.key === "impact" ? "pr-4" : ""}`}>
                              {c.key === "impact"
                                ? (() => {
                                    const sc = impactMap.get(p.id)?.score;
                                    return sc == null ? (
                                      "—"
                                    ) : (
                                      <span className={`font-semibold ${impactTone(sc)}`}>
                                        {sc}
                                      </span>
                                    );
                                  })()
                                : c.key === "league"
                                ? <LeagueBadge league={p.league} size={20} />
                                : c.numeric
                                ? p[c.key] == null
                                  ? "—"
                                  : (p[c.key] as number).toFixed(c.decimals ?? 0)
                                : c.key === "player_name"
                                  ? <a
                                      href={`/player?p=${encodeURIComponent(p.player_name)}&id=${p.id}`}
                                      className="block whitespace-nowrap font-medium text-ink transition-colors duration-150 hover:text-gold"
                                    >
                                      {p.player_name}
                                    </a>
                                  : c.key === "team"
                                  ? <span className="flex items-center gap-1.5">
                                      <TeamBadge team={p.team.split(",")[0].trim()} size={18} className="text-[8px]" />
                                      <span className="block truncate" title={p.team}>{shortTeam(p.team)}</span>
                                    </span>
                                  : <span className="block truncate" title={String(p[c.key as keyof Striker])}>
                                      {String(p[c.key as keyof Striker])}
                                    </span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

      {/* Bottom-only pagination (SoFIFA-style: you only change page at the end) */}
        {pageCount > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm">
                  <button
                    onClick={() => setPage(0)}
                    disabled={safePage === 0}
                    className="btn-pag"
                    aria-label="First page"
                  >
                    <ChevronFirst size={14} aria-hidden="true" />
                    First
                  </button>
                  <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    className="btn-pag"
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                    Prev
                  </button>
                  <span className="text-ink-dim">
                    Page <span className="font-medium text-gold">{safePage + 1}</span> of{" "}
                    {pageCount} · players {(safePage * PAGE_SIZE).toLocaleString()}–
                    {Math.min((safePage + 1) * PAGE_SIZE, filtered.length).toLocaleString()}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                    disabled={safePage >= pageCount - 1}
                    className="btn-pag"
                  >
                    Next
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setPage(pageCount - 1)}
                    disabled={safePage >= pageCount - 1}
                    className="btn-pag"
                    aria-label="Last page"
                  >
                    Last
                    <ChevronLast size={14} aria-hidden="true" />
                  </button>
                </div>
              )}

        {/* Showing X of Y — bottom of the results column */}
        <p className="text-center text-xs text-ink-mute">
          showing <span className="tabular-nums text-ink">{filtered.length}</span> of{" "}
          <span className="tabular-nums text-ink">{players.length}</span> players
        </p>

      </div>
    </div>
  </div>
  );
}

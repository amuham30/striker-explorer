"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ─── Phase W10c: metric explainers ───
// Two layers per metric: `plain` (casual-fan one-liner) and `math` (the
// actual formula). Rendered via <MetricInfo /> question-mark popovers.
export type Explanation = { plain: string; math: string };

export const EXPLAIN: Record<string, Explanation> = {
  impact: {
    plain:
      "One overall number for how good the player's season has been, rated 0–100 and judged against what's normal for his position. Think of it like a FIFA card rating built from this season's real numbers instead of opinions.",
    math:
      "Each stat is turned into a percentile WITHIN THE PLAYER'S POSITION GROUP (strikers vs strikers, defenders vs defenders), then combined with position weights. The stat set depends on the role: ST/W are judged on finishing (non-penalty goals/90, npxG/90, G+A/90, npxG per shot, shots/90); CAM/CM on creation (xA/90, key passes/90, pass accuracy) plus ball-winning for deeper roles; CDM on tackles/90, interceptions/90, duels won %, recoveries and minutes; CB/FB on defensive volume (tackles, interceptions, clearances, blocks, aerials) + availability; GK on saves/90, save % and clean sheets. Example: a striker with percentiles 95/93/90/40/85/30/92/80 lands in the low 80s — elite scoring, ordinary passing. A missing stat is skipped and remaining weights rescaled, so nobody is punished for a data gap.",
  },
  value_fit: {
    plain:
      "Is he outperforming his price tag? Positive = producing like a more expensive player than he is; negative = his price expects more than he's delivered.",
    math:
      "Impact Score minus the percentile of his market value among valued players. Example: Olise — Impact ~80 (better than ~80% of players) but value in the 60th pct → +20, decent deal. Impact 50 at the 95th value percentile → −45, superstar money for average output. Impact 70 on a bottom-tier salary/value → +60, a bargain.",
  },
  performance_score: {
    plain:
      "The app's per-game rating — how much attacking output he produces per 90 minutes on the pitch. It answers 'how good is he when he plays?', not 'how good was his season in total?' — a super-sub can outrank an average full-time starter here.",
    math:
      "A weighted composite of per-90 stats (non-penalty goals/90, npxG/90, goal contributions/90, xA, shot quality, key passes/90), each normalized against the whole 5-league pool before combining. Example: striker A, 8 goals in 900 minutes, outscores striker B's 12 goals in 3,000 minutes per this metric — A produced faster per minute played. Under 450 minutes (~5 matches) the sample is too small to trust: one great game can wildly inflate a per-90 number.",
  },
  value_ratio: {
    plain:
      "Bang for the buck: how high his performance rating is relative to his transfer value. High = cheap and productive; low = expensive for what he's producing.",
    math:
      "performance_score percentile ÷ market-value percentile, among players with a Transfermarkt value. Examples: 90th-pct performer valued in the 30th pct → 90/30 ≈ 3.0, excellent value. Same performer valued in the 90th pct → 1.0, fairly priced. 20th-pct performer at the 80th value pct → 0.25, overpriced. Caution: a cheap bad player also scores high — always read it next to the Score column.",
  },
  age_curve: {
    plain:
      "Is he producing above or below what players his age typically produce? Positive = ahead of the age curve (peak or breakout); negative = output tapering with age.",
    math:
      "His G+A per 90 this season minus the pool average G+A per 90 for his age, where the curve is built from every top-5-league season 2014/15–2024/25 (players with 450+ minutes) bucketed by age. Example: a 24-year-old at 0.75 G+A/90 vs a pool average of 0.43 at 24 → +0.32, well ahead of the curve. Ages for historical seasons are approximated from current age minus calendar-year offset, so the curve is a solid baseline rather than exact birth-date precision.",
  },
  market_value: {
    plain: "The player's current transfer market value in millions of euros — what the market thinks he's worth right now.",
    math:
      "Scraped from Transfermarkt community valuations (as of the data pull date). Not a predicted fee — real fees also reflect contract length, age, and club circumstances. '—' means no reliable value is listed.",
  },
  npg_per90: {
    plain: "Goals per full match (90 minutes), not counting penalties. Penalties are removed because they mostly measure who the designated taker is, not who finishes open-play chances best.",
    math: "(goals − penalties) ÷ (minutes ÷ 90). Example: Lewandowski-style line of 14 goals, 5 penalties, in 1,630 minutes → (14−5) ÷ (1630/90) ≈ 0.50. Another player with 10 goals, none from the spot, in the same minutes → 10 ÷ 18.1 ≈ 0.55 — rates higher despite fewer total goals.",
  },
  npxg_per90: {
    plain: "The quality of chances he gets per match, in 'expected' goals. High xG means good looks; it measures the chances, not his finishing.",
    math: "npxG ÷ (minutes ÷ 90). Each shot gets a scoring probability from location/body part/situation — a 4-yard tap-in ≈ 0.6–0.7, a 25-yarder ≈ 0.03 — and npxG sums them. Example: ten long shots worth 0.03 each = 0.3 npxG; three tap-ins worth 0.6 each = 1.8. High npxG/90 with modest actual goals = great chances, under-finishing; the reverse = a clinical overperformer.",
  },
  g_plus_a_per90: {
    plain: "Total goal contributions — goals plus assists — per 90 minutes. The quickest read of 'how much does he directly produce?'",
    math: "(goals + assists) ÷ (minutes ÷ 90), league only. Example: 20 goals + 10 assists in 2,700 minutes → 30 ÷ 30 = 1.0 per 90, elite. The same 30 contributions spread over 4,500 minutes → 0.6, clearly less intense production.",
  },
  xa_per90: {
    plain: "Chances he creates for teammates, per match, in 'expected' assists. The playmaker's stat — it credits the pass quality even if the teammate misses.",
    math: "xA ÷ (minutes ÷ 90). Each key pass is valued by the likelihood the shot it produced becomes a goal: a through-ball to a striker 8 yards out ≈ 0.4 xA; a headed corner over the bar ≈ 0.05. Example: De Bruyne can have a quiet goal season yet rank elite here, because his creation volume and quality stay high.",
  },
  npxg_per_shot: {
    plain: "Shot quality: how dangerous his average shot is. Separates players who get to good locations from players who shoot from hope.",
    math: "npxG ÷ shots. Example: a poacher taking 2 shots/game worth 0.35 each → 0.35, elite (tap-ins, central box shots). A volume shooter taking 5 shots worth 0.04 each → 0.04, lots of shooting, little danger per shot. High volume + low quality = possession-waster; high volume + high quality = the ideal focal-point striker profile.",
  },
  key_passes_per90: {
    plain: "Passes that directly create a shooting chance, per match. If his pass is the last one before a teammate shoots, it counts.",
    math: "key passes ÷ (minutes ÷ 90), Opta/Understat definition. Example: 60 key passes in 2,000 minutes → 2.7 per 90, strong. Read with xA/90: many key passes but low xA = lots of low-danger crosses; fewer key passes but high xA = each creation is premium.",
  },
  shots_per90: {
    plain: "How often he shoots per 90 minutes — volume of threat. You can't score without shooting, but this says nothing about shot quality.",
    math: "shots ÷ (minutes ÷ 90). Example: 4.5/90 like a box-focused striker vs 1.0/90 for a deep playmaker. High volume with low npxG/shot is a liability (wasted possessions); high volume AND high npxG/shot is the true goal-hanger profile.",
  },
  minutes: {
    plain: "Total league minutes played. Everything 'per 90' needs enough of these to trust — small samples are easily distorted by one game.",
    math: "Raw minutes from Understat league play; reliability threshold 450+ (~5 full matches). Example: 2 goals in 90 minutes = an absurd 2.0 goals/90; the same rate held over 900+ minutes would be genuinely elite. Sort by this column to see who actually plays.",
  },
  percentile: {
    plain: "Where he ranks vs. a comparison pool: 90th percentile = only ~10% of that pool is higher. The fairest way to compare a 19-year-old in Ligue 1 with a Premier League superstar.",
    math: "share of the pool with a value ≤ the player's, ×100. Example: 0.40 npxG/90 might be the 92nd percentile among ALL players but only the 70th among strikers, because strikers as a group score more. Use 'vs position' for the tougher, more honest read of his role.",
  },
  goals: {
    plain: "Goals in league play this season — the raw total everybody understands. Includes penalties, so it can flatter designated takers.",
    math: "Raw count from Understat, penalties included. Example: 14 goals with 5 penalties is a weaker open-play output than 10 goals with none — check npg/90 for the penalty-free version.",
  },
  assists: {
    plain: "Assists in league play: the last pass before a teammate's goal. Rewards creators, though it depends on teammates actually finishing.",
    math: "Raw count, Opta/Understat definition. Example: a perfect through-ball the striker skies over the bar = no assist, but it does earn xA — which is why xA/90 is often the fairer creation measure over a season.",
  },
  age: {
    plain: "Player age. Peak attacking output is typically 24–28; younger players are still developing, older ones usually decline in pace-dependent output.",
    math: "Age as listed by Understat this season; '—' = unlisted. Useful next to value: a modest-scoring 21-year-old may be worth more than a higher-scoring 30-year-old because of the runway left to improve.",
  },
};

export function MetricInfo({
  id,
  as = "button",
}: {
  id: keyof typeof EXPLAIN | string;
  /** "span" renders a role=button span — valid inside another <button>. */
  as?: "button" | "span";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDown(e: PointerEvent) {
      if (
        btnRef.current &&
        e.target instanceof Node &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const W = 400; // w-96 + padding allowance
      const left = Math.min(
        Math.max(r.left + r.width / 2 - W / 2, 8),
        window.innerWidth - W - 8
      );
      const flipUp = r.top < 240; // near top of viewport → drop below instead
      setPos({
        top: flipUp ? r.bottom + 8 : r.top - 8,
        left,
      });
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  const ex = EXPLAIN[id];
  if (!ex) return null;
  return (
    <>
      {as === "button" ? (
        <button
          ref={btnRef}
          type="button"
          aria-label="What does this metric mean?"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-line-strong align-middle text-[10px] leading-none text-ink-mute transition-colors duration-150 hover:border-gold hover:text-gold"
        >
          ?
        </button>
      ) : (
        <span
          ref={btnRef as unknown as React.RefObject<HTMLSpanElement>}
          role="button"
          tabIndex={0}
          aria-label="What does this metric mean?"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              toggle();
            }
          }}
          className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-line-strong align-middle text-[10px] leading-none text-ink-mute transition-colors duration-150 hover:border-gold hover:text-gold"
        >
          ?
        </span>
      )}
      {open &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className={`fixed z-[9999] w-96 max-w-[92vw] rounded-xl border border-line-strong bg-panel-2 p-3 text-left shadow-2xl ${
              pos.top > 240 ? "-translate-y-full" : ""
            }`}
          >
            <span className="block text-[12px] leading-snug text-ink-dim">
              {ex.plain}
            </span>
            <span className="mt-2 block border-t border-line pt-2 text-[11px] leading-snug text-ink-mute">
              <span className="font-semibold uppercase tracking-wide text-ink-dim">
                The math:
              </span>{" "}
              {ex.math}
            </span>
          </span>,
          document.body
        )}
    </>
  );
}
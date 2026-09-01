export type Striker = {
  id: number;
  player_name: string;
  league: string;
  team: string;
  position: string;
  age: number | null;
  minutes: number;
  goals: number;
  assists: number;
  xG: number | null;
  xA: number | null;
  npg: number | null;
  npxG: number | null;
  shots: number;
  key_passes: number;
  yellow_cards: number | null;
  red_cards: number | null;
  xGChain: number | null;
  xGBuildup: number | null;
  big_club: boolean;
  goals_per90: number | null;
  npg_per90: number | null;
  npxg_per90: number | null;
  xa_per90: number | null;
  g_plus_a_per90: number | null;
  npg_minus_npxg_per90: number | null;
  npxg_per_shot: number | null;
  shots_per90: number | null;
  key_passes_per90: number | null;
  // W14 position-specific (SofaScore) metrics
  tackles_per90?: number | null;
  interceptions_per90?: number | null;
  clearances_per90?: number | null;
  blocks_per90?: number | null;
  recoveries_per90?: number | null;
  dribbled_past_per90?: number | null;
  duel_won_pct?: number | null;
  aerial_won_pct?: number | null;
  pass_acc_pct?: number | null;
  saves_per90?: number | null;
  save_pct?: number | null;
  clean_sheet_pct?: number | null;
  performance_score: number | null;
  market_value_eur_m: number | null;
  value_ratio: number | null;
  lewa_index: number | null;
  barca_fit_score: number | null;
  value_for_money: number | null;
  // Phase W7: shot-level features (current league season)
  n_shots_scraped?: number | null;
  shot_xg_sum?: number | null;
  box_share?: number | null;
  close_range_share?: number | null;
  open_play_share?: number | null;
  counter_share?: number | null;
  corner_share?: number | null;
  set_piece_share?: number | null;
  penalty_share?: number | null;
  left_foot_share?: number | null;
  right_foot_share?: number | null;
  head_share?: number | null;
  // Phase W10b: FIFA-style position refinement
  strong_foot?: string | null; // "Right" | "Left" | "Both" | null
  side?: string | null; // "L" | "R" | null (median lateral shot position)
  goals_npg_share?: number | null;
  pct_goals_per90?: number | null;
  pct_npg_per90?: number | null;
  pct_npxg_per90?: number | null;
  pct_xa_per90?: number | null;
  pct_g_plus_a_per90?: number | null;
  pct_npxg_per_shot?: number | null;
  pct_minutes?: number | null;
  pct_key_passes_per90?: number | null;
};

export type UnderstatShot = {
  X: string;
  Y: string;
  xG: string;
  result: string;
  situation: string;
  shotType: string;
  date: string;
  lastAction?: string;
  h_a?: string;
  minute?: string;
};

export type Benchmark = {
  player: string;
  season: string;
  score: number;
  value_eur_m: number;
};

export type StrikersPayload = {
  benchmark: Benchmark;
  players: Striker[];
};

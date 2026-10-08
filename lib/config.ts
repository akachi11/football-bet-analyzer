export const COMPETITION_MAP: Record<
  string,
  { name: string; fdCode: string; afId: number; country: string }
> = {
  PL: { name: "Premier League", fdCode: "PL", afId: 39, country: "England" },
  PD: { name: "La Liga", fdCode: "PD", afId: 140, country: "Spain" },
  BL1: { name: "Bundesliga", fdCode: "BL1", afId: 78, country: "Germany" },
  SA: { name: "Serie A", fdCode: "SA", afId: 135, country: "Italy" },
  FL1: { name: "Ligue 1", fdCode: "FL1", afId: 61, country: "France" },
  CL: { name: "Champions League", fdCode: "CL", afId: 2, country: "Europe" },
  ELC: { name: "Championship", fdCode: "ELC", afId: 40, country: "England" },
  DED: { name: "Eredivisie", fdCode: "DED", afId: 88, country: "Netherlands" },
  PPL: { name: "Primeira Liga", fdCode: "PPL", afId: 94, country: "Portugal" },
  BSA: { name: "Série A", fdCode: "BSA", afId: 71, country: "Brazil" },
  EC: {
    name: "European Championship",
    fdCode: "EC",
    afId: 4,
    country: "Europe",
  },
  WC: { name: "World Cup", fdCode: "WC", afId: 1, country: "World" },
};

export const CACHE_TTL = {
  MATCHES_TODAY: 5 * 60, // 5 min
  STANDINGS: 2 * 60 * 60, // 2 hr
  TOP_SCORERS: 6 * 60 * 60, // 6 hr
  HEAD_TO_HEAD: 24 * 60 * 60, // 24 hr
  TEAM_LAST_5: 3 * 60 * 60, // 3 hr
  INJURIES: 6 * 60 * 60, // 6 hr
  LINEUPS_CONFIRMED: 30 * 60, // 30 min
  LINEUPS_PREDICTED: 2 * 60 * 60, // 2 hr
  TEAM_ID_MAP: 30 * 24 * 60 * 60, // 30 days (IDs don't change)
  FIXTURE_ID_MAP: 24 * 60 * 60, // 24 hr
  AI_ANALYSIS: 60 * 60, // 1 hr
  PLAYER_NEWS: 6 * 60 * 60, // 6 hr
} as const;

export function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  // European seasons start in Aug, so Aug-Dec = current year, Jan-Jul = previous year
  return month >= 8 ? year : year - 1;
}

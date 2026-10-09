import { cache } from "./cache";
import { CACHE_TTL } from "./config";
import type {
  Match,
  StandingsEntry,
  HeadToHead,
  CompetitionScorer,
} from "./types";

const BASE_URL = "https://api.football-data.org/v4";

const inflightRequests = new Map<string, Promise<unknown>>();

async function fdFetch<T>(endpoint: string): Promise<T> {
  const inflight = inflightRequests.get(endpoint);
  if (inflight) return inflight as Promise<T>;

  const promise = (async () => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
      cache: "no-store",
    });

    if (res.status === 429) {
      throw new Error("Football-Data API 429: rate limited");
    }

    if (!res.ok) {
      throw new Error(
        `Football-Data API ${res.status}: ${res.statusText} [${endpoint}]`
      );
    }

    return res.json() as Promise<T>;
  })();

  inflightRequests.set(endpoint, promise);
  promise.finally(() => inflightRequests.delete(endpoint)).catch(() => {});
  return promise as Promise<T>;
}

// ===== Public API =====

export async function getTodayMatches(): Promise<Match[]> {
  const cacheKey = "fd:matches:today";
  const cached = cache.get<Match[]>(cacheKey);
  if (cached) return cached;

  const today = new Date().toISOString().split("T")[0];

  interface MatchesResponse {
    matches: Array<{
      id: number;
      competition: {
        id: number;
        name: string;
        code: string;
        emblem: string;
      };
      homeTeam: {
        id: number;
        name: string;
        shortName: string;
        crest: string;
      };
      awayTeam: {
        id: number;
        name: string;
        shortName: string;
        crest: string;
      };
      utcDate: string;
      status: string;
      matchday: number | null;
      score: {
        fullTime: { home: number | null; away: number | null };
        halfTime: { home: number | null; away: number | null };
      };
      referees: Array<{ name: string; nationality: string }>;
    }>;
  }

  const data = await fdFetch<MatchesResponse>(
    `/matches?date=${today}`
  );

  const matches: Match[] = data.matches.map((m) => ({
    id: m.id,
    competition: m.competition,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    utcDate: m.utcDate,
    status: m.status as Match["status"],
    matchday: m.matchday,
    score: m.score,
    referees: m.referees ?? [],
  }));

  cache.set(cacheKey, matches, CACHE_TTL.MATCHES_TODAY);
  return matches;
}

export async function getHeadToHead(matchId: number): Promise<HeadToHead> {
  const cacheKey = `fd:h2h:${matchId}`;
  const cached = cache.get<HeadToHead>(cacheKey);
  if (cached) return cached;

  interface H2HResponse {
    aggregates: {
      numberOfMatches: number;
      homeTeam: { id: number; wins: number; draws: number; losses: number };
      awayTeam: { id: number; wins: number; draws: number; losses: number };
    };
    matches: Array<{
      utcDate: string;
      homeTeam: { id: number; name: string };
      awayTeam: { id: number; name: string };
      score: {
        fullTime: { home: number; away: number };
      };
      competition: { name: string };
    }>;
  }

  const data = await fdFetch<H2HResponse>(
    `/matches/${matchId}/head2head?limit=10`
  );

  const h2hHomeId = data.aggregates.homeTeam.id;
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  for (const m of data.matches) {
    const homeGoals = m.score.fullTime.home;
    const awayGoals = m.score.fullTime.away;
    if (homeGoals == null || awayGoals == null) continue;

    const h2hHomeIsMatchHome = m.homeTeam.id === h2hHomeId;
    const h2hHomeScored = h2hHomeIsMatchHome ? homeGoals : awayGoals;
    const h2hAwayScored = h2hHomeIsMatchHome ? awayGoals : homeGoals;

    if (h2hHomeScored > h2hAwayScored) homeWins++;
    else if (h2hAwayScored > h2hHomeScored) awayWins++;
    else draws++;
  }

  const h2h: HeadToHead = {
    totalMatches: data.matches.length,
    homeTeamWins: homeWins,
    awayTeamWins: awayWins,
    draws,
    recentMeetings: data.matches.map((m) => ({
      date: m.utcDate,
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      scoreHome: m.score.fullTime.home,
      scoreAway: m.score.fullTime.away,
      competition: m.competition.name,
    })),
  };

  cache.set(cacheKey, h2h, CACHE_TTL.HEAD_TO_HEAD);
  return h2h;
}

export async function getStandings(
  competitionCode: string
): Promise<StandingsEntry[]> {
  const cacheKey = `fd:standings:${competitionCode}`;
  const cached = cache.get<StandingsEntry[]>(cacheKey);
  if (cached) return cached;

  interface StandingsResponse {
    standings: Array<{
      type: string;
      table: Array<{
        position: number;
        team: {
          id: number;
          name: string;
          shortName: string;
          crest: string;
        };
        playedGames: number;
        won: number;
        draw: number;
        lost: number;
        points: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        form: string | null;
      }>;
    }>;
  }

  const data = await fdFetch<StandingsResponse>(
    `/competitions/${competitionCode}/standings`
  );

  const total = data.standings.find((s) => s.type === "TOTAL");
  if (!total) {
    cache.set(cacheKey, [], CACHE_TTL.STANDINGS);
    return [];
  }

  const entries: StandingsEntry[] = total.table.map((row) => ({
    position: row.position,
    team: row.team,
    playedGames: row.playedGames,
    won: row.won,
    draw: row.draw,
    lost: row.lost,
    points: row.points,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    form: row.form,
  }));

  cache.set(cacheKey, entries, CACHE_TTL.STANDINGS);
  return entries;
}

export async function getTopScorers(
  competitionCode: string
): Promise<CompetitionScorer[]> {
  const cacheKey = `fd:scorers:${competitionCode}`;
  const cached = cache.get<CompetitionScorer[]>(cacheKey);
  if (cached) return cached;

  interface ScorersResponse {
    scorers: Array<{
      player: {
        id: number;
        name: string;
        nationality: string;
        position: string;
      };
      team: {
        id: number;
        name: string;
        shortName: string;
        crest: string;
      };
      goals: number;
      assists: number | null;
      penalties: number | null;
      playedMatches: number;
    }>;
  }

  const data = await fdFetch<ScorersResponse>(
    `/competitions/${competitionCode}/scorers?limit=100`
  );

  const scorers: CompetitionScorer[] = data.scorers.map((s) => ({
    player: s.player,
    team: s.team,
    goals: s.goals,
    assists: s.assists,
    penalties: s.penalties,
    playedMatches: s.playedMatches,
  }));

  cache.set(cacheKey, scorers, CACHE_TTL.TOP_SCORERS);
  return scorers;
}

export async function getTeamCompetitions(
  teamId: number
): Promise<string[]> {
  const cacheKey = `fd:team-comps:${teamId}`;
  const cached = cache.get<string[]>(cacheKey);
  if (cached) return cached;

  interface TeamResponse {
    runningCompetitions: Array<{ code: string; name: string }>;
  }

  const data = await fdFetch<TeamResponse>(`/teams/${teamId}`);
  const codes = data.runningCompetitions.map((c) => c.code);

  cache.set(cacheKey, codes, CACHE_TTL.STANDINGS);
  return codes;
}

export async function getAllCompScorers(
  teamId: number,
  skipCode?: string
): Promise<CompetitionScorer[]> {
  const cacheKey = `fd:allcomp-scorers:${teamId}`;
  const cached = cache.get<CompetitionScorer[]>(cacheKey);
  if (cached) return cached;

  const codes = await getTeamCompetitions(teamId);
  const filteredCodes = (skipCode ? codes.filter((c) => c !== skipCode) : codes)
    .slice(0, 2);

  const scorersByComp: CompetitionScorer[][] = [];
  for (const code of filteredCodes) {
    const s = await getTopScorers(code).catch(() => [] as CompetitionScorer[]);
    scorersByComp.push(s);
  }

  const playerMap = new Map<
    string,
    { player: CompetitionScorer["player"]; team: CompetitionScorer["team"]; goals: number; assists: number; appearances: number }
  >();

  for (const scorers of scorersByComp) {
    for (const s of scorers) {
      if (s.team.id !== teamId) continue;
      const key = s.player.name;
      const existing = playerMap.get(key);
      if (existing) {
        existing.goals += s.goals;
        existing.assists += (s.assists ?? 0);
        existing.appearances += s.playedMatches;
      } else {
        playerMap.set(key, {
          player: s.player,
          team: s.team,
          goals: s.goals,
          assists: s.assists ?? 0,
          appearances: s.playedMatches,
        });
      }
    }
  }

  const merged: CompetitionScorer[] = Array.from(playerMap.values())
    .sort((a, b) => b.goals - a.goals)
    .map((p) => ({
      player: p.player,
      team: p.team,
      goals: p.goals,
      assists: p.assists,
      penalties: null,
      playedMatches: p.appearances,
    }));

  if (merged.length > 0) {
    cache.set(cacheKey, merged, CACHE_TTL.TOP_SCORERS);
  }
  return merged;
}

export interface FDTeamMatch {
  id: number;
  competition: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  goalsHome: number;
  goalsAway: number;
  halfTimeHome: number;
  halfTimeAway: number;
  date: string;
}

export async function getTeamRecentMatches(
  teamId: number,
  limit = 5
): Promise<FDTeamMatch[]> {
  const cacheKey = `fd:team-matches:${teamId}:${limit}`;
  const cached = cache.get<FDTeamMatch[]>(cacheKey);
  if (cached) return cached;

  interface TeamMatchesResponse {
    matches: Array<{
      id: number;
      competition: { name: string };
      homeTeam: { id: number; name: string };
      awayTeam: { id: number; name: string };
      utcDate: string;
      score: {
        fullTime: { home: number | null; away: number | null };
        halfTime: { home: number | null; away: number | null };
      };
    }>;
  }

  const data = await fdFetch<TeamMatchesResponse>(
    `/teams/${teamId}/matches?status=FINISHED&limit=${limit}`
  );

  const matches: FDTeamMatch[] = data.matches.map((m) => ({
    id: m.id,
    competition: m.competition.name,
    homeTeamId: m.homeTeam.id,
    homeTeamName: m.homeTeam.name,
    awayTeamId: m.awayTeam.id,
    awayTeamName: m.awayTeam.name,
    goalsHome: m.score.fullTime.home ?? 0,
    goalsAway: m.score.fullTime.away ?? 0,
    halfTimeHome: m.score.halfTime.home ?? 0,
    halfTimeAway: m.score.halfTime.away ?? 0,
    date: m.utcDate.split("T")[0],
  }));

  cache.set(cacheKey, matches, CACHE_TTL.TEAM_LAST_5);
  return matches;
}

export async function getMatch(matchId: number): Promise<Match> {
  const cacheKey = `fd:match:${matchId}`;
  const cached = cache.get<Match>(cacheKey);
  if (cached) return cached;

  const data = await fdFetch<{
    id: number;
    competition: { id: number; name: string; code: string; emblem: string };
    homeTeam: { id: number; name: string; shortName: string; crest: string };
    awayTeam: { id: number; name: string; shortName: string; crest: string };
    utcDate: string;
    status: string;
    matchday: number | null;
    score: {
      fullTime: { home: number | null; away: number | null };
      halfTime: { home: number | null; away: number | null };
    };
    referees: Array<{ name: string; nationality: string }>;
  }>(`/matches/${matchId}`);

  const match: Match = {
    id: data.id,
    competition: data.competition,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    utcDate: data.utcDate,
    status: data.status as Match["status"],
    matchday: data.matchday,
    score: data.score,
    referees: data.referees ?? [],
  };

  cache.set(cacheKey, match, CACHE_TTL.MATCHES_TODAY);
  return match;
}

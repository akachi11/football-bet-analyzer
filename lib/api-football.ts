import { cache, RequestBudget } from "./cache";
import { CACHE_TTL } from "./config";
import type {
  FixtureDetail,
  FixtureEvent,
  FixtureTeamStats,
  PlayerMatchStats,
  Injury,
  Lineup,
  LineupPlayer,
} from "./types";

const BASE_URL = "https://v3.football.api-sports.io";
const budget = new RequestBudget(95); // 95 of 100, keep 5 buffer

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function afFetch<T = any>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const { allowed, remaining } = budget.check();
  if (!allowed) {
    throw new Error(
      `API-Football daily limit reached (${remaining} remaining). Try again tomorrow.`
    );
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
  });

  if (!res.ok) {
    throw new Error(`API-Football ${res.status}: ${res.statusText}`);
  }

  budget.consume();
  const json = await res.json();
  return json as T;
}

// ===== Team ID Mapping =====

export async function resolveTeamId(teamName: string): Promise<number | null> {
  const cacheKey = `af:teamid:${teamName.toLowerCase()}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  const simplified = teamName
    .replace(/^(FC|CF|AC|AS|SS|US|RC|SC|SL|CD|UD|CA|SE|CR)\s+/i, "")
    .replace(/\s+(FC|CF|AC|SC|BC)$/i, "")
    .trim();

  interface TeamsResponse {
    response: Array<{ team: { id: number; name: string; country: string } }>;
  }

  const data = await afFetch<TeamsResponse>("/teams", {
    search: simplified,
  });

  if (data.response.length === 0) {
    const retryData = await afFetch<TeamsResponse>("/teams", {
      search: teamName.split(" ")[0],
    });
    if (retryData.response.length === 0) return null;
    const id = retryData.response[0].team.id;
    cache.set(cacheKey, id, CACHE_TTL.TEAM_ID_MAP);
    return id;
  }

  const id = data.response[0].team.id;
  cache.set(cacheKey, id, CACHE_TTL.TEAM_ID_MAP);
  return id;
}

// ===== Last 5 Fixtures with Full Stats =====

export async function getTeamLast5(
  afTeamId: number
): Promise<FixtureDetail[]> {
  const cacheKey = `af:last5:${afTeamId}`;
  const cached = cache.get<FixtureDetail[]>(cacheKey);
  if (cached) return cached;

  interface FixtureResponse {
    response: Array<{
      fixture: { id: number; date: string };
      league: { name: string };
      teams: {
        home: { id: number; name: string; logo: string };
        away: { id: number; name: string; logo: string };
      };
      goals: { home: number; away: number };
      score: {
        halftime: { home: number; away: number };
      };
      events: Array<{
        time: { elapsed: number };
        type: string;
        detail: string;
        player: { name: string };
        assist: { name: string | null };
        team: { id: number };
      }> | null;
      statistics: Array<{
        team: { id: number };
        statistics: Array<{ type: string; value: string | number | null }>;
      }> | null;
      players: Array<{
        team: { id: number };
        players: Array<{
          player: { name: string; photo: string };
          statistics: Array<{
            games: {
              position: string;
              rating: string | null;
              minutes: number | null;
            };
            goals: { total: number | null; assists: number | null };
            shots: { total: number | null; on: number | null };
            passes: { total: number | null; accuracy: string | null };
            tackles: { total: number | null };
            duels: { won: number | null };
            dribbles: { success: number | null };
            fouls: {
              committed: number | null;
              drawn: number | null;
            };
            cards: { yellow: number | null; red: number | null };
          }>;
        }>;
      }> | null;
    }>;
  }

  const data = await afFetch<FixtureResponse>("/fixtures", {
    team: String(afTeamId),
    last: "5",
  });

  const fixtures: FixtureDetail[] = data.response.map((f) => {
    const isHome = f.teams.home.id === afTeamId;

    const teamStats = f.statistics?.find(
      (s) => s.team.id === afTeamId
    )?.statistics;

    const getStat = (type: string): string | number | null =>
      teamStats?.find((s) => s.type === type)?.value ?? null;

    const events: FixtureEvent[] = (f.events ?? []).map((e) => ({
      minute: e.time.elapsed,
      type: e.type as FixtureEvent["type"],
      detail: e.detail,
      player: e.player.name,
      assist: e.assist?.name ?? null,
      teamId: e.team.id,
    }));

    const statistics: FixtureTeamStats | null = teamStats
      ? {
          shotsOnGoal: Number(getStat("Shots on Goal")) || 0,
          shotsOffGoal: Number(getStat("Shots off Goal")) || 0,
          totalShots: Number(getStat("Total Shots")) || 0,
          possession: String(getStat("Ball Possession") ?? "0%"),
          fouls: Number(getStat("Fouls")) || 0,
          corners: Number(getStat("Corner Kicks")) || 0,
          yellowCards: Number(getStat("Yellow Cards")) || 0,
          redCards: Number(getStat("Red Cards")) || 0,
          passes: Number(getStat("Total passes")) || 0,
          passAccuracy: String(getStat("Passes accurate") ?? "0"),
        }
      : null;

    const teamPlayers = f.players?.find(
      (p) => p.team.id === afTeamId
    )?.players;

    const playerStats: PlayerMatchStats[] = (teamPlayers ?? []).map((p) => {
      const s = p.statistics[0];
      return {
        name: p.player.name,
        photo: p.player.photo,
        position: s?.games?.position ?? "Unknown",
        rating: s?.games?.rating ?? null,
        minutes: s?.games?.minutes ?? 0,
        goals: s?.goals?.total ?? 0,
        assists: s?.goals?.assists ?? 0,
        shotsTotal: s?.shots?.total ?? 0,
        shotsOn: s?.shots?.on ?? 0,
        passes: s?.passes?.total ?? 0,
        passAccuracy: s?.passes?.accuracy ?? null,
        tackles: s?.tackles?.total ?? 0,
        duelsWon: s?.duels?.won ?? 0,
        dribblesSuccess: s?.dribbles?.success ?? 0,
        foulsCommitted: s?.fouls?.committed ?? 0,
        foulsDrawn: s?.fouls?.drawn ?? 0,
        yellowCards: s?.cards?.yellow ?? 0,
        redCards: s?.cards?.red ?? 0,
      };
    });

    return {
      fixtureId: f.fixture.id,
      date: f.fixture.date,
      competition: f.league.name,
      homeTeam: f.teams.home,
      awayTeam: f.teams.away,
      goalsHome: f.goals.home,
      goalsAway: f.goals.away,
      halfTimeHome: f.score.halftime?.home ?? 0,
      halfTimeAway: f.score.halftime?.away ?? 0,
      events,
      statistics,
      playerStats,
    };
  });

  cache.set(cacheKey, fixtures, CACHE_TTL.TEAM_LAST_5);
  return fixtures;
}

// ===== Injuries & Suspensions =====

export async function getInjuries(afFixtureId: number): Promise<Injury[]> {
  const cacheKey = `af:injuries:fixture:${afFixtureId}`;
  const cached = cache.get<Injury[]>(cacheKey);
  if (cached) return cached;

  interface InjuriesResponse {
    response: Array<{
      player: {
        id: number;
        name: string;
        photo: string;
        type: string;
        reason: string;
      };
      team: { id: number; name: string };
    }>;
  }

  const data = await afFetch<InjuriesResponse>("/injuries", {
    fixture: String(afFixtureId),
  });

  const injuries: Injury[] = data.response.map((i) => ({
    player: { id: i.player.id, name: i.player.name, photo: i.player.photo },
    type: i.player.type,
    reason: i.player.reason,
    teamId: i.team.id,
  }));

  cache.set(cacheKey, injuries, CACHE_TTL.INJURIES);
  return injuries;
}

// ===== Lineups =====

function parseLineup(
  raw: {
    team: { id: number; name: string };
    formation: string;
    startXI: Array<{ player: { id: number; name: string; number: number; pos: string; grid: string | null } }>;
    substitutes: Array<{ player: { id: number; name: string; number: number; pos: string; grid: string | null } }>;
    coach: { name: string };
  }
): Lineup {
  return {
    teamId: raw.team.id,
    teamName: raw.team.name,
    formation: raw.formation,
    startXI: raw.startXI.map((p) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      position: p.player.pos ?? "Unknown",
      grid: p.player.grid,
    })),
    substitutes: raw.substitutes.map((p) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      position: p.player.pos ?? "Unknown",
      grid: p.player.grid,
    })),
    coach: raw.coach?.name ?? "Unknown",
  };
}

export async function getConfirmedLineups(
  afFixtureId: number
): Promise<{ home: Lineup; away: Lineup } | null> {
  const cacheKey = `af:lineups:${afFixtureId}`;
  const cached = cache.get<{ home: Lineup; away: Lineup } | null>(cacheKey);
  if (cached !== null) return cached;

  interface LineupsResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any[];
  }

  const data = await afFetch<LineupsResponse>("/fixtures/lineups", {
    fixture: String(afFixtureId),
  });

  if (!data.response || data.response.length < 2) {
    cache.set(cacheKey, null, CACHE_TTL.LINEUPS_CONFIRMED);
    return null;
  }

  const result = {
    home: parseLineup(data.response[0]),
    away: parseLineup(data.response[1]),
  };

  cache.set(cacheKey, result, CACHE_TTL.LINEUPS_CONFIRMED);
  return result;
}

export async function getPredictedLineups(
  afFixtureId: number
): Promise<{ home: Lineup; away: Lineup } | null> {
  const cacheKey = `af:predicted:${afFixtureId}`;
  const cached = cache.get<{ home: Lineup; away: Lineup } | null>(cacheKey);
  if (cached !== null) return cached;

  interface PredictionsResponse {
    response: Array<{
      lineups: {
        home: {
          formation: string;
          players: Array<{
            id: number;
            name: string;
            number: number;
            pos: string;
          }>;
        };
        away: {
          formation: string;
          players: Array<{
            id: number;
            name: string;
            number: number;
            pos: string;
          }>;
        };
      };
      teams: {
        home: { id: number; name: string };
        away: { id: number; name: string };
      };
    }>;
  }

  const data = await afFetch<PredictionsResponse>("/predictions", {
    fixture: String(afFixtureId),
  });

  if (!data.response || data.response.length === 0) {
    cache.set(cacheKey, null, CACHE_TTL.LINEUPS_PREDICTED);
    return null;
  }

  const pred = data.response[0];
  if (!pred.lineups) {
    cache.set(cacheKey, null, CACHE_TTL.LINEUPS_PREDICTED);
    return null;
  }

  const mapPlayers = (
    players: Array<{ id: number; name: string; number: number; pos: string }>
  ): LineupPlayer[] =>
    players.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.pos,
      grid: null,
    }));

  const result = {
    home: {
      teamId: pred.teams.home.id,
      teamName: pred.teams.home.name,
      formation: pred.lineups.home.formation,
      startXI: mapPlayers(pred.lineups.home.players),
      substitutes: [],
      coach: "",
    },
    away: {
      teamId: pred.teams.away.id,
      teamName: pred.teams.away.name,
      formation: pred.lineups.away.formation,
      startXI: mapPlayers(pred.lineups.away.players),
      substitutes: [],
      coach: "",
    },
  };

  cache.set(cacheKey, result, CACHE_TTL.LINEUPS_PREDICTED);
  return result;
}

// ===== Fixture ID Resolution =====

export async function resolveFixtureId(
  afTeamId: number,
  matchDate: string
): Promise<number | null> {
  const dateStr = matchDate.split("T")[0];
  const cacheKey = `af:fixtureid:${afTeamId}:${dateStr}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  interface FixtureResponse {
    response: Array<{ fixture: { id: number } }>;
  }

  const data = await afFetch<FixtureResponse>("/fixtures", {
    team: String(afTeamId),
    date: dateStr,
  });

  if (!data.response || data.response.length === 0) return null;

  const id = data.response[0].fixture.id;
  cache.set(cacheKey, id, CACHE_TTL.FIXTURE_ID_MAP);
  return id;
}

export function getBudgetStatus(): { remaining: number; allowed: boolean } {
  return budget.check();
}

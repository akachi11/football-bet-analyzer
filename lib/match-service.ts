import * as fd from "./football-data";
import type { FDTeamMatch } from "./football-data";
import * as af from "./api-football";
import { COMPETITION_MAP } from "./config";
import type {
  Match,
  MatchAnalysisData,
  TeamAnalysis,
  Last5Stats,
  BestFormPlayer,
  TopContributor,
  MatchLineups,
  FixtureDetail,
  CompetitionScorer,
  Injury,
} from "./types";

// ===== Home Page =====

export async function getTodayMatches(): Promise<Match[]> {
  return fd.getTodayMatches();
}

// ===== Match Analysis =====

export async function getMatchAnalysis(
  matchId: number
): Promise<MatchAnalysisData> {
  const match = await fd.getMatch(matchId);
  const compCode = match.competition.code;
  const compConfig = COMPETITION_MAP[compCode];

  const [
    headToHead,
    standings,
    scorers,
    homeFDMatches,
    awayFDMatches,
    homeAllCompScorers,
    awayAllCompScorers,
  ] = await Promise.all([
    fd.getHeadToHead(matchId),
    compConfig
      ? fd.getStandings(compCode).catch(() => [])
      : Promise.resolve([]),
    compConfig
      ? fd.getTopScorers(compCode).catch(() => [])
      : Promise.resolve([]),
    fd.getTeamRecentMatches(match.homeTeam.id, 5),
    fd.getTeamRecentMatches(match.awayTeam.id, 5),
    fd.getAllCompScorers(match.homeTeam.id).catch(() => []),
    fd.getAllCompScorers(match.awayTeam.id).catch(() => []),
  ]);

  const homeAfId = await af.resolveTeamId(match.homeTeam.name);
  const awayAfId = await af.resolveTeamId(match.awayTeam.name);

  let afFixtureId: number | null = null;
  if (homeAfId) {
    afFixtureId = await af.resolveFixtureId(homeAfId, match.utcDate);
  }

  let homeInjuries: Injury[] = [];
  let awayInjuries: Injury[] = [];

  if (afFixtureId) {
    const allInjuries = await af.getInjuries(afFixtureId);
    if (homeAfId) {
      homeInjuries = allInjuries.filter((i) => i.teamId === homeAfId);
    }
    if (awayAfId) {
      awayInjuries = allInjuries.filter((i) => i.teamId === awayAfId);
    }
  }

  let lineups: MatchLineups = {
    status: "unavailable",
    home: null,
    away: null,
  };

  if (afFixtureId) {
    const confirmed = await af.getConfirmedLineups(afFixtureId);
    if (confirmed) {
      lineups = { status: "confirmed", ...confirmed };
    } else {
      const predicted = await af.getPredictedLineups(afFixtureId);
      if (predicted) {
        lineups = { status: "predicted", ...predicted };
      }
    }
  }

  const homeStanding = standings.find(
    (s) => s.team.id === match.homeTeam.id
  );
  const awayStanding = standings.find(
    (s) => s.team.id === match.awayTeam.id
  );

  const homeTeam = buildTeamAnalysis(
    match.homeTeam,
    homeStanding ?? null,
    homeFDMatches,
    scorers,
    homeInjuries,
    homeAllCompScorers
  );

  const awayTeam = buildTeamAnalysis(
    match.awayTeam,
    awayStanding ?? null,
    awayFDMatches,
    scorers,
    awayInjuries,
    awayAllCompScorers
  );

  return { match, headToHead, homeTeam, awayTeam, lineups };
}

// ===== Internal Helpers =====

function buildTeamAnalysis(
  team: Match["homeTeam"],
  standing: TeamAnalysis["standings"],
  fdMatches: FDTeamMatch[],
  competitionScorers: CompetitionScorer[],
  injuries: Injury[],
  allCompScorers: CompetitionScorer[]
): TeamAnalysis {
  const last5 = computeLast5FromFD(fdMatches, team.id);

  const teamScorers = competitionScorers.filter(
    (s) => s.team.id === team.id
  );
  const topScorersComp = teamScorers
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3);
  const topAssistersComp = teamScorers
    .filter((s) => s.assists !== null)
    .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))
    .slice(0, 3);

  const allCompTopScorers: TopContributor[] = allCompScorers
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3)
    .map((s) => ({
      name: s.player.name,
      photo: "",
      goals: s.goals,
      assists: s.assists ?? 0,
      appearances: s.playedMatches,
      isFromCompetition: false,
    }));

  const allCompTopAssisters: TopContributor[] = [...allCompScorers]
    .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))
    .slice(0, 3)
    .map((s) => ({
      name: s.player.name,
      photo: "",
      goals: s.goals,
      assists: s.assists ?? 0,
      appearances: s.playedMatches,
      isFromCompetition: false,
    }));

  const suspensions = injuries.filter(
    (i) =>
      i.reason.toLowerCase().includes("suspend") ||
      i.reason.toLowerCase().includes("red card") ||
      i.reason.toLowerCase().includes("ban")
  );
  const actualInjuries = injuries.filter(
    (i) => !suspensions.includes(i)
  );

  return {
    info: team,
    standings: standing,
    last5,
    topScorers: {
      allCompetitions: allCompTopScorers,
      thisCompetition: topScorersComp,
    },
    topAssisters: {
      allCompetitions: allCompTopAssisters,
      thisCompetition: topAssistersComp,
    },
    bestFormPlayer: null,
    playerRatings: [],
    injuries: actualInjuries,
    suspensions,
  };
}

function computeLast5FromFD(
  fdMatches: FDTeamMatch[],
  teamId: number
): Last5Stats {
  if (fdMatches.length === 0) {
    return {
      form: "",
      goalsScored: 0,
      goalsConceded: 0,
      cleanSheets: 0,
      mostScoringHalf: "even",
      mostConcedingHalf: "even",
      yellowCards: 0,
      redCards: 0,
      fouls: 0,
      matches: [],
    };
  }

  let goalsScored = 0;
  let goalsConceded = 0;
  let cleanSheets = 0;
  let firstHalfScored = 0;
  let secondHalfScored = 0;
  let firstHalfConceded = 0;
  let secondHalfConceded = 0;
  const formChars: string[] = [];

  const fixtureDetails: FixtureDetail[] = [];

  for (const m of fdMatches) {
    const isHome = m.homeTeamId === teamId;
    const scored = isHome ? m.goalsHome : m.goalsAway;
    const conceded = isHome ? m.goalsAway : m.goalsHome;
    const htScored = isHome ? m.halfTimeHome : m.halfTimeAway;
    const htConceded = isHome ? m.halfTimeAway : m.halfTimeHome;

    goalsScored += scored;
    goalsConceded += conceded;
    if (conceded === 0) cleanSheets++;

    firstHalfScored += htScored;
    secondHalfScored += scored - htScored;
    firstHalfConceded += htConceded;
    secondHalfConceded += conceded - htConceded;

    if (scored > conceded) formChars.push("W");
    else if (scored === conceded) formChars.push("D");
    else formChars.push("L");

    fixtureDetails.push({
      fixtureId: m.id,
      date: m.date,
      competition: m.competition,
      homeTeam: {
        id: m.homeTeamId,
        name: m.homeTeamName,
        logo: "",
      },
      awayTeam: {
        id: m.awayTeamId,
        name: m.awayTeamName,
        logo: "",
      },
      goalsHome: m.goalsHome,
      goalsAway: m.goalsAway,
      halfTimeHome: m.halfTimeHome,
      halfTimeAway: m.halfTimeAway,
      events: [],
      statistics: null,
      playerStats: [],
    });
  }

  const mostScoringHalf: Last5Stats["mostScoringHalf"] =
    firstHalfScored > secondHalfScored
      ? "1st"
      : secondHalfScored > firstHalfScored
        ? "2nd"
        : "even";

  const mostConcedingHalf: Last5Stats["mostConcedingHalf"] =
    firstHalfConceded > secondHalfConceded
      ? "1st"
      : secondHalfConceded > firstHalfConceded
        ? "2nd"
        : "even";

  return {
    form: formChars.join(""),
    goalsScored,
    goalsConceded,
    cleanSheets,
    mostScoringHalf,
    mostConcedingHalf,
    yellowCards: 0,
    redCards: 0,
    fouls: 0,
    matches: fixtureDetails,
  };
}

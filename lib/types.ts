// ===== Common =====

export interface Competition {
  id: number;
  name: string;
  code: string;
  emblem: string;
  country?: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  crest: string;
}

// ===== Matches =====

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED"
  | "SUSPENDED";

export interface Score {
  home: number | null;
  away: number | null;
}

export interface Match {
  id: number;
  competition: Competition;
  homeTeam: Team;
  awayTeam: Team;
  utcDate: string;
  status: MatchStatus;
  matchday: number | null;
  score: {
    fullTime: Score;
    halfTime: Score;
  };
  referees: { name: string; nationality: string }[];
}

// ===== Standings =====

export interface StandingsEntry {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

// ===== Head to Head =====

export interface HeadToHead {
  totalMatches: number;
  homeTeamWins: number;
  awayTeamWins: number;
  draws: number;
  recentMeetings: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    scoreHome: number;
    scoreAway: number;
    competition: string;
  }[];
}

// ===== Top Scorers (Football-Data.org) =====

export interface CompetitionScorer {
  player: {
    id: number;
    name: string;
    nationality: string;
    position: string;
  };
  team: Team;
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number;
}

// ===== API-Football Types =====

export interface PlayerMatchStats {
  name: string;
  photo: string;
  position: string;
  rating: string | null;
  minutes: number;
  goals: number;
  assists: number;
  shotsTotal: number;
  shotsOn: number;
  passes: number;
  passAccuracy: string | null;
  tackles: number;
  duelsWon: number;
  dribblesSuccess: number;
  foulsCommitted: number;
  foulsDrawn: number;
  yellowCards: number;
  redCards: number;
}

export interface FixtureDetail {
  fixtureId: number;
  date: string;
  competition: string;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  goalsHome: number;
  goalsAway: number;
  halfTimeHome: number;
  halfTimeAway: number;
  events: FixtureEvent[];
  statistics: FixtureTeamStats | null;
  playerStats: PlayerMatchStats[];
}

export interface FixtureEvent {
  minute: number;
  type: "Goal" | "Card" | "subst" | "Var";
  detail: string;
  player: string;
  assist: string | null;
  teamId: number;
}

export interface FixtureTeamStats {
  shotsOnGoal: number;
  shotsOffGoal: number;
  totalShots: number;
  possession: string;
  fouls: number;
  corners: number;
  yellowCards: number;
  redCards: number;
  passes: number;
  passAccuracy: string;
}

export interface Injury {
  player: {
    id: number;
    name: string;
    photo: string;
  };
  type: string;
  reason: string;
  teamId?: number;
}

export interface LineupPlayer {
  id: number;
  name: string;
  number: number;
  position: string;
  grid: string | null;
}

export interface Lineup {
  teamId: number;
  teamName: string;
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach: string;
}

// ===== Derived Stats (computed from last 5 matches) =====

export interface Last5Stats {
  form: string;
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  mostScoringHalf: "1st" | "2nd" | "even";
  mostConcedingHalf: "1st" | "2nd" | "even";
  yellowCards: number;
  redCards: number;
  fouls: number;
  matches: FixtureDetail[];
}

export interface BestFormPlayer {
  name: string;
  photo: string;
  position: string;
  averageRating: number;
  goals: number;
  assists: number;
  appearances: number;
}

export interface TopContributor {
  name: string;
  photo: string;
  goals: number;
  assists: number;
  appearances: number;
  isFromCompetition: boolean;
}

// ===== Unified Match Analysis (what the frontend consumes) =====

export interface TeamAnalysis {
  info: Team;
  standings: StandingsEntry | null;
  last5: Last5Stats;
  topScorers: {
    allCompetitions: TopContributor[];
    thisCompetition: CompetitionScorer[];
  };
  topAssisters: {
    allCompetitions: TopContributor[];
    thisCompetition: CompetitionScorer[];
  };
  bestFormPlayer: BestFormPlayer | null;
  playerRatings: { name: string; rating: string; photo: string }[];
  injuries: Injury[];
  suspensions: Injury[];
}

export interface MatchLineups {
  status: "confirmed" | "predicted" | "unavailable";
  home: Lineup | null;
  away: Lineup | null;
}

export interface MatchAnalysisData {
  match: Match;
  headToHead: HeadToHead;
  homeTeam: TeamAnalysis;
  awayTeam: TeamAnalysis;
  lineups: MatchLineups;
}

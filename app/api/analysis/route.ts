import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cache } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/config";
import type { MatchAnalysisData } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function buildPrompt(data: MatchAnalysisData): string {
  const { match, headToHead, homeTeam, awayTeam, lineups } = data;
  const h = homeTeam;
  const a = awayTeam;

  const homeLineupStr =
    lineups.home
      ? `Formation: ${lineups.home.formation}\nStarting XI: ${lineups.home.startXI.map((p) => p.name).join(", ")}`
      : "Not available";
  const awayLineupStr =
    lineups.away
      ? `Formation: ${lineups.away.formation}\nStarting XI: ${lineups.away.startXI.map((p) => p.name).join(", ")}`
      : "Not available";

  const homeInjuries =
    h.injuries.length > 0
      ? h.injuries.map((i) => `${i.player.name} (${i.reason})`).join(", ")
      : "None";
  const awayInjuries =
    a.injuries.length > 0
      ? a.injuries.map((i) => `${i.player.name} (${i.reason})`).join(", ")
      : "None";
  const homeSuspensions =
    h.suspensions.length > 0
      ? h.suspensions.map((s) => `${s.player.name} (${s.reason})`).join(", ")
      : "None";
  const awaySuspensions =
    a.suspensions.length > 0
      ? a.suspensions.map((s) => `${s.player.name} (${s.reason})`).join(", ")
      : "None";

  const homeTopScorers = [
    ...h.topScorers.allCompetitions.map(
      (p) => `${p.name}: ${p.goals}G ${p.assists}A (all comps, ${p.appearances} apps)`
    ),
    ...h.topScorers.thisCompetition.map(
      (p) => `${p.player.name}: ${p.goals}G ${p.assists ?? 0}A (this comp)`
    ),
  ].join("\n    ");

  const awayTopScorers = [
    ...a.topScorers.allCompetitions.map(
      (p) => `${p.name}: ${p.goals}G ${p.assists}A (all comps, ${p.appearances} apps)`
    ),
    ...a.topScorers.thisCompetition.map(
      (p) => `${p.player.name}: ${p.goals}G ${p.assists ?? 0}A (this comp)`
    ),
  ].join("\n    ");

  const homeRatings = h.playerRatings
    .slice(0, 5)
    .map((p) => `${p.name}: ${p.rating}`)
    .join(", ");
  const awayRatings = a.playerRatings
    .slice(0, 5)
    .map((p) => `${p.name}: ${p.rating}`)
    .join(", ");

  const homeLastMatches = h.last5.matches
    .map((m) => {
      const isHome = m.homeTeam.id === (lineups.home?.teamId ?? 0) || m.homeTeam.name.includes(match.homeTeam.shortName);
      const scored = isHome ? m.goalsHome : m.goalsAway;
      const conceded = isHome ? m.goalsAway : m.goalsHome;
      const opponent = isHome ? m.awayTeam.name : m.homeTeam.name;
      return `vs ${opponent}: ${scored}-${conceded} (${m.competition})`;
    })
    .join("\n    ");

  const awayLastMatches = a.last5.matches
    .map((m) => {
      const isAway = m.awayTeam.id === (lineups.away?.teamId ?? 0) || m.awayTeam.name.includes(match.awayTeam.shortName);
      const scored = isAway ? m.goalsAway : m.goalsHome;
      const conceded = isAway ? m.goalsHome : m.goalsAway;
      const opponent = isAway ? m.homeTeam.name : m.awayTeam.name;
      return `vs ${opponent}: ${scored}-${conceded} (${m.competition})`;
    })
    .join("\n    ");

  return `You are an expert football analyst and betting advisor. Analyze this match and provide detailed betting predictions with specific player-level reasoning.

MATCH: ${match.homeTeam.name} vs ${match.awayTeam.name}
COMPETITION: ${match.competition.name} (Matchday ${match.matchday ?? "N/A"})
DATE: ${match.utcDate}

=== HEAD TO HEAD ===
Total meetings: ${headToHead.totalMatches}
${match.homeTeam.shortName} wins: ${headToHead.homeTeamWins} | Draws: ${headToHead.draws} | ${match.awayTeam.shortName} wins: ${headToHead.awayTeamWins}

=== ${match.homeTeam.name.toUpperCase()} ===
  League Position: ${h.standings ? `${h.standings.position}th (${h.standings.points}pts, ${h.standings.won}W ${h.standings.draw}D ${h.standings.lost}L, GD: ${h.standings.goalDifference > 0 ? "+" : ""}${h.standings.goalDifference})` : "N/A"}
  Form (last 5): ${h.last5.form}
  Last 5 Matches:
    ${homeLastMatches || "N/A"}
  Goals Scored (last 5): ${h.last5.goalsScored}
  Goals Conceded (last 5): ${h.last5.goalsConceded}
  Clean Sheets (last 5): ${h.last5.cleanSheets}
  Most Scoring Half: ${h.last5.mostScoringHalf}
  Most Conceding Half: ${h.last5.mostConcedingHalf}
  Yellow Cards (last 5): ${h.last5.yellowCards}
  Red Cards (last 5): ${h.last5.redCards}
  Fouls (last 5): ${h.last5.fouls}
  Top Scorers:
    ${homeTopScorers || "N/A"}
  Best Form Player: ${h.bestFormPlayer ? `${h.bestFormPlayer.name} (${h.bestFormPlayer.position}, avg rating: ${h.bestFormPlayer.averageRating}, ${h.bestFormPlayer.goals}G ${h.bestFormPlayer.assists}A in ${h.bestFormPlayer.appearances} games)` : "N/A"}
  Top Rated Players (avg last 5): ${homeRatings || "N/A"}
  Injuries: ${homeInjuries}
  Suspensions: ${homeSuspensions}
  Lineup (${lineups.status}): ${homeLineupStr}

=== ${match.awayTeam.name.toUpperCase()} ===
  League Position: ${a.standings ? `${a.standings.position}th (${a.standings.points}pts, ${a.standings.won}W ${a.standings.draw}D ${a.standings.lost}L, GD: ${a.standings.goalDifference > 0 ? "+" : ""}${a.standings.goalDifference})` : "N/A"}
  Form (last 5): ${a.last5.form}
  Last 5 Matches:
    ${awayLastMatches || "N/A"}
  Goals Scored (last 5): ${a.last5.goalsScored}
  Goals Conceded (last 5): ${a.last5.goalsConceded}
  Clean Sheets (last 5): ${a.last5.cleanSheets}
  Most Scoring Half: ${a.last5.mostScoringHalf}
  Most Conceding Half: ${a.last5.mostConcedingHalf}
  Yellow Cards (last 5): ${a.last5.yellowCards}
  Red Cards (last 5): ${a.last5.redCards}
  Fouls (last 5): ${a.last5.fouls}
  Top Scorers:
    ${awayTopScorers || "N/A"}
  Best Form Player: ${a.bestFormPlayer ? `${a.bestFormPlayer.name} (${a.bestFormPlayer.position}, avg rating: ${a.bestFormPlayer.averageRating}, ${a.bestFormPlayer.goals}G ${a.bestFormPlayer.assists}A in ${a.bestFormPlayer.appearances} games)` : "N/A"}
  Top Rated Players (avg last 5): ${awayRatings || "N/A"}
  Injuries: ${awayInjuries}
  Suspensions: ${awaySuspensions}
  Lineup (${lineups.status}): ${awayLineupStr}

=== INSTRUCTIONS ===
Provide your analysis as a JSON object with this exact structure:
{
  "summary": "A 2-3 sentence overview of the match context, form, and key factors",
  "predictions": [
    {
      "market": "Match Result",
      "prediction": "Home Win / Draw / Away Win",
      "confidence": "high/medium/low",
      "reasoning": "Detailed reasoning with SPECIFIC player names, stats, and tactical points. E.g., 'Raphinha has scored in 4 of his last 5, and with Lamine Yamal pulling defenders wide...' Be specific, cite the stats provided."
    },
    {
      "market": "Both Teams to Score (GG/NG)",
      "prediction": "Yes / No",
      "confidence": "high/medium/low",
      "reasoning": "..."
    },
    {
      "market": "Over/Under 2.5 Goals",
      "prediction": "Over 2.5 / Under 2.5",
      "confidence": "high/medium/low",
      "reasoning": "..."
    },
    {
      "market": "First Half Goals",
      "prediction": "Over/Under 0.5 or 1.5",
      "confidence": "high/medium/low",
      "reasoning": "..."
    }
  ],
  "playerNews": "Check if you know of any recent news about key first-team players on BOTH teams that could affect this match. This includes: personal issues, off-field incidents, transfer rumors causing distraction, national team fatigue, contract disputes, or any non-football factors. If you know of something, mention it. If nothing notable, say 'No significant off-field news detected for key players in either squad.' Be honest — only mention what you actually know."
}

Add more prediction markets if the data supports them (e.g., "Correct Score", "First Goalscorer", "Cards Over/Under", "Corner predictions", "Handicap"). Each prediction MUST have detailed, specific reasoning referencing actual player names and stats from the data above. Do not be generic.

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks.`;
}

function getMockAnalysisResponse(data: MatchAnalysisData) {
  const home = data.match.homeTeam.shortName;
  const away = data.match.awayTeam.shortName;
  return {
    summary: `${home} (2nd, 26pts) host ${away} (4th, 22pts) in a highly anticipated top-four clash. ${home} are in strong form with 4 wins in their last 5, scoring 12 goals, while ${away} have been inconsistent away from home, losing their last away fixture. With Saka in red-hot form (avg 8.12) and De Bruyne doubtful with a calf injury, ${home} hold the edge — but Haaland's 12-goal haul means ${away} are always a threat.`,
    predictions: [
      {
        market: "Match Result",
        prediction: "Home Win",
        confidence: "medium",
        reasoning: `${home} have won 14 of 32 H2H meetings and are unbeaten at home in their last 7. Saka (8G, 5A all comps) has been exceptional with an 8.12 avg rating, and Ødegaard is pulling the strings with 7 assists. ${away} lost their last away game and will be without Akanji (suspended) and possibly De Bruyne (calf). However, Haaland's 12 goals keep this from being a confident pick.`,
      },
      {
        market: "Both Teams to Score (GG/NG)",
        prediction: "Yes",
        confidence: "high",
        reasoning: `Both teams are prolific — ${home} scored 12 in their last 5 (2.4/game) and ${away} scored 10 (2.0/game). ${away} have only kept 1 clean sheet in 5, while ${home} conceded in 3 of their last 5. Haaland has scored in 4 of his last 5 matches — he rarely blanks. With both attacks firing and neither defence watertight, GG looks very likely.`,
      },
      {
        market: "Over/Under 2.5 Goals",
        prediction: "Over 2.5",
        confidence: "high",
        reasoning: `${home} average 2.4 goals scored per game (last 5) and ${away} average 2.0. Combined, that's 4.4 goals per game between these two sides. Their last 3 H2H meetings produced 3, 4, and 0 goals (avg 2.3). Factor in ${away}'s leaky defence (7 conceded in 5) and ${home}'s attacking depth with Saka, Havertz, and Martinelli all contributing, and Over 2.5 is well-supported.`,
      },
      {
        market: "First Half Goals",
        prediction: "Over 0.5",
        confidence: "high",
        reasoning: `${away}'s most scoring half is the 1st half — they tend to start fast under Guardiola. Meanwhile, ${home}'s most conceding half is also the 1st half, making them vulnerable early. In their last H2H, ${home} led 1-0 at half time. With Haaland and Foden pressing from the start and ${home} looking to stamp authority, expect at least one first-half goal.`,
      },
      {
        market: "Cards Over/Under",
        prediction: "Over 3.5 Cards",
        confidence: "medium",
        reasoning: `${home} picked up 8 yellows in their last 5 games, and ${away} racked up 11 yellows and a red. Combined, that's 20 cards in 10 games (2 per game per team). In a high-intensity derby with Michael Oliver officiating — a referee who averages 4.2 cards per game — expect this to be a feisty encounter with tactical fouls in midfield between Rice/Rodri.`,
      },
    ],
    playerNews: "Kevin De Bruyne is carrying a calf injury and is rated 50/50 for this fixture — if he misses out, City lose their primary creative outlet. Manuel Akanji is confirmed suspended after accumulating 5 yellow cards. Jurriën Timber misses out for Arsenal with a hamstring issue, meaning Calafiori is expected to deputise at left-back. No other significant off-field news detected for key players in either squad.",
  };
}

export async function POST(request: Request) {
  try {
    const { matchData } = (await request.json()) as {
      matchData: MatchAnalysisData;
    };

    if (!matchData?.match?.id) {
      return NextResponse.json(
        { error: "Invalid match data" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      const mock = getMockAnalysisResponse(matchData);
      return NextResponse.json(mock);
    }

    const cacheKey = `ai:analysis:${matchData.match.id}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const prompt = buildPrompt(matchData);
    const models = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.8-flash"];
    let lastError: unknown;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const cleaned = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        const analysis = JSON.parse(cleaned);

        cache.set(cacheKey, analysis, CACHE_TTL.AI_ANALYSIS);
        return NextResponse.json(analysis);
      } catch (err) {
        lastError = err;
        console.warn(`Analysis model ${modelName} failed, trying next...`);
      }
    }

    console.error("All analysis models failed:", lastError);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Analysis generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }
}

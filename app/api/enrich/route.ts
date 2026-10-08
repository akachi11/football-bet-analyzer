import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cache } from "@/lib/cache";
import type { MatchAnalysisData } from "@/lib/types";

const CACHE_TTL = 3 * 60 * 60; // 3 hours (in seconds)

function buildEnrichPrompt(data: MatchAnalysisData): string {
  const { match, homeTeam, awayTeam, lineups } = data;
  const needLineups = lineups.status === "unavailable";
  const needInjuries =
    homeTeam.injuries.length === 0 && homeTeam.suspensions.length === 0 &&
    awayTeam.injuries.length === 0 && awayTeam.suspensions.length === 0;

  const lineupsSection = needLineups
    ? `
  "lineups": {
    "home": {
      "formation": "4-3-3",
      "coach": "Coach Full Name",
      "startXI": [
        { "name": "Player Name", "number": 1, "position": "Goalkeeper" },
        { "name": "Player Name", "number": 2, "position": "Defender" }
      ],
      "substitutes": [
        { "name": "Player Name", "number": 13, "position": "Goalkeeper" }
      ]
    },
    "away": {
      "formation": "4-2-3-1",
      "coach": "Coach Full Name",
      "startXI": [
        { "name": "Player Name", "number": 1, "position": "Goalkeeper" }
      ],
      "substitutes": [
        { "name": "Player Name", "number": 12, "position": "Goalkeeper" }
      ]
    }
  },`
    : "";

  const injuriesSection = needInjuries
    ? `
  "injuries": {
    "home": [
      { "name": "Player Name", "reason": "Knee injury", "type": "injury" },
      { "name": "Player Name", "reason": "Suspended (yellow card accumulation)", "type": "suspension" }
    ],
    "away": [
      { "name": "Player Name", "reason": "Hamstring strain", "type": "injury" }
    ]
  },`
    : "";

  const lineupsRules = needLineups
    ? `
- lineups: Predict the most likely starting XI (exactly 11 players) and substitutes (7-9 bench players) for BOTH teams. Use the current squad and the coach's recent preferred formation. Include realistic squad numbers. Positions must be one of: Goalkeeper, Defender, Midfielder, Forward.`
    : "";

  const injuriesRules = needInjuries
    ? `
- injuries: List players currently injured or suspended for EACH team. Include the player's name, the reason (e.g. "ACL injury", "Hamstring strain", "Suspended - yellow card accumulation", "Suspended - red card"), and type ("injury" or "suspension"). Only include players you are confident are currently unavailable. If a team has no known absentees, use an empty array [].`
    : "";

  return `You are a football data analyst. Based on your knowledge of current football, provide player-level statistics for this match.

MATCH: ${match.homeTeam.name} vs ${match.awayTeam.name}
COMPETITION: ${match.competition.name}

HOME TEAM: ${match.homeTeam.name}
  Form (last 5): ${homeTeam.last5.form || "Unknown"}
  Position: ${homeTeam.standings?.position ?? "N/A"}
  Known scorers this competition: ${homeTeam.topScorers.thisCompetition.map((s) => `${s.player.name} (${s.goals}G)`).join(", ") || "None listed"}

AWAY TEAM: ${match.awayTeam.name}
  Form (last 5): ${awayTeam.last5.form || "Unknown"}
  Position: ${awayTeam.standings?.position ?? "N/A"}
  Known scorers this competition: ${awayTeam.topScorers.thisCompetition.map((s) => `${s.player.name} (${s.goals}G)`).join(", ") || "None listed"}

Return a JSON object with this structure:
{${lineupsSection}${injuriesSection}
  "home": {
    "bestFormPlayer": {
      "name": "Player Name",
      "position": "Forward/Midfielder/Defender/Goalkeeper",
      "averageRating": 7.5,
      "goals": 3,
      "assists": 2,
      "appearances": 5
    },
    "playerRatings": [
      { "name": "Player Name", "rating": "7.50" }
    ],
    "yellowCards": 8,
    "redCards": 0,
    "fouls": 55
  },
  "away": {
    "bestFormPlayer": {
      "name": "Player Name",
      "position": "Forward/Midfielder/Defender/Goalkeeper",
      "averageRating": 7.8,
      "goals": 5,
      "assists": 1,
      "appearances": 5
    },
    "playerRatings": [
      { "name": "Player Name", "rating": "7.80" }
    ],
    "yellowCards": 10,
    "redCards": 1,
    "fouls": 60
  }
}

Rules:
- playerRatings: List the top 8 players for each team by average rating over their recent 5 matches. Use realistic ratings (6.0-9.0 range).
- bestFormPlayer: The single player in best recent form for each team. Include their last-5-matches stats.
- yellowCards, redCards, fouls: Estimated totals across the last 5 matches for each team. Base on your knowledge of the team's disciplinary record.${lineupsRules}${injuriesRules}
- Be realistic and accurate. Use actual current squad players.
- Return ONLY the JSON object, no markdown formatting, no code blocks.`;
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

    const needLineups = matchData.lineups.status === "unavailable";
    const needInjuries =
      matchData.homeTeam.injuries.length === 0 && matchData.homeTeam.suspensions.length === 0 &&
      matchData.awayTeam.injuries.length === 0 && matchData.awayTeam.suspensions.length === 0;
    const cacheKey = `ai:enrich:${matchData.match.id}${needLineups ? ":lu" : ""}${needInjuries ? ":inj" : ""}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(getMockEnrichment(needLineups, needInjuries));
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = buildEnrichPrompt(matchData);

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

        const enrichment = JSON.parse(cleaned);

        cache.set(cacheKey, enrichment, CACHE_TTL);
        return NextResponse.json(enrichment);
      } catch (err) {
        lastError = err;
        console.warn(`Enrichment model ${modelName} failed, trying next...`);
      }
    }

    console.error("All enrichment models failed:", lastError);
    return NextResponse.json(
      { error: "Failed to generate enrichment" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Enrichment failed:", error);
    return NextResponse.json(
      { error: "Failed to generate enrichment" },
      { status: 500 }
    );
  }
}

function getMockEnrichment(includeLineups: boolean, includeInjuries: boolean) {
  return {
    ...(includeInjuries && {
      injuries: {
        home: [
          { name: "J. Timber", reason: "Hamstring injury", type: "injury" },
        ],
        away: [
          { name: "M. Akanji", reason: "Suspended - yellow card accumulation", type: "suspension" },
          { name: "K. De Bruyne", reason: "Calf injury (doubtful)", type: "injury" },
        ],
      },
    }),
    ...(includeLineups && {
      lineups: {
        home: {
          formation: "4-2-3-1",
          coach: "Mikel Arteta",
          startXI: [
            { name: "D. Raya", number: 22, position: "Goalkeeper" },
            { name: "B. White", number: 4, position: "Defender" },
            { name: "W. Saliba", number: 2, position: "Defender" },
            { name: "G. Magalhães", number: 6, position: "Defender" },
            { name: "R. Calafiori", number: 33, position: "Defender" },
            { name: "T. Partey", number: 5, position: "Midfielder" },
            { name: "D. Rice", number: 41, position: "Midfielder" },
            { name: "B. Saka", number: 7, position: "Forward" },
            { name: "M. Ødegaard", number: 8, position: "Midfielder" },
            { name: "G. Martinelli", number: 11, position: "Forward" },
            { name: "K. Havertz", number: 29, position: "Forward" },
          ],
          substitutes: [
            { name: "A. Ramsdale", number: 1, position: "Goalkeeper" },
            { name: "J. Timber", number: 12, position: "Defender" },
            { name: "O. Zinchenko", number: 35, position: "Defender" },
            { name: "J. Kiwior", number: 15, position: "Defender" },
            { name: "L. Trossard", number: 19, position: "Forward" },
            { name: "F. Vieira", number: 23, position: "Midfielder" },
            { name: "E. Nketiah", number: 14, position: "Forward" },
          ],
        },
        away: {
          formation: "4-3-3",
          coach: "Pep Guardiola",
          startXI: [
            { name: "Ederson", number: 31, position: "Goalkeeper" },
            { name: "K. Walker", number: 2, position: "Defender" },
            { name: "R. Dias", number: 3, position: "Defender" },
            { name: "J. Stones", number: 5, position: "Defender" },
            { name: "J. Gvardiol", number: 24, position: "Defender" },
            { name: "Rodri", number: 16, position: "Midfielder" },
            { name: "K. De Bruyne", number: 17, position: "Midfielder" },
            { name: "B. Silva", number: 20, position: "Midfielder" },
            { name: "P. Foden", number: 47, position: "Forward" },
            { name: "E. Haaland", number: 9, position: "Forward" },
            { name: "J. Savinho", number: 26, position: "Forward" },
          ],
          substitutes: [
            { name: "S. Ortega", number: 18, position: "Goalkeeper" },
            { name: "N. Aké", number: 6, position: "Defender" },
            { name: "M. Kovačić", number: 8, position: "Midfielder" },
            { name: "J. Grealish", number: 10, position: "Forward" },
            { name: "Ó. Bobb", number: 52, position: "Midfielder" },
            { name: "J. Alvarez", number: 19, position: "Forward" },
            { name: "R. Lewis", number: 82, position: "Defender" },
          ],
        },
      },
    }),
    home: {
      bestFormPlayer: {
        name: "B. Saka",
        position: "Forward",
        averageRating: 8.12,
        goals: 4,
        assists: 3,
        appearances: 5,
      },
      playerRatings: [
        { name: "B. Saka", rating: "8.12" },
        { name: "M. Ødegaard", rating: "7.89" },
        { name: "D. Rice", rating: "7.65" },
        { name: "W. Saliba", rating: "7.54" },
        { name: "K. Havertz", rating: "7.32" },
        { name: "G. Martinelli", rating: "7.10" },
        { name: "J. Timber", rating: "6.98" },
        { name: "B. White", rating: "6.91" },
      ],
      yellowCards: 8,
      redCards: 0,
      fouls: 52,
    },
    away: {
      bestFormPlayer: {
        name: "E. Haaland",
        position: "Forward",
        averageRating: 8.45,
        goals: 6,
        assists: 0,
        appearances: 5,
      },
      playerRatings: [
        { name: "E. Haaland", rating: "8.45" },
        { name: "R. Dias", rating: "7.72" },
        { name: "Rodri", rating: "7.68" },
        { name: "P. Foden", rating: "7.55" },
        { name: "J. Savinho", rating: "7.41" },
        { name: "K. De Bruyne", rating: "7.30" },
        { name: "K. Walker", rating: "6.85" },
        { name: "E. Ederson", rating: "6.78" },
      ],
      yellowCards: 11,
      redCards: 1,
      fouls: 61,
    },
  };
}

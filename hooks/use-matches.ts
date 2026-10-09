"use client";

import { useState, useEffect } from "react";
import type { Match, MatchAnalysisData } from "@/lib/types";

export function useTodayMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("/api/matches");
        if (!res.ok) throw new Error("Failed to fetch matches");
        const data = await res.json();
        setMatches(data.matches);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  return { matches, loading, error };
}

interface EnrichmentData {
  bestFormPlayer: {
    name: string;
    position: string;
    averageRating: number;
    goals: number;
    assists: number;
    appearances: number;
  } | null;
  playerRatings: { name: string; rating: string }[];
  yellowCards: number;
  redCards: number;
  fouls: number;
}

interface EnrichmentLineup {
  formation: string;
  coach: string;
  startXI: { name: string; number: number; position: string }[];
  substitutes: { name: string; number: number; position: string }[];
}

interface EnrichmentInjury {
  name: string;
  reason: string;
  type: "injury" | "suspension";
}

interface EnrichmentResponse {
  home: EnrichmentData;
  away: EnrichmentData;
  lineups?: {
    home: EnrichmentLineup;
    away: EnrichmentLineup;
  };
  injuries?: {
    home: EnrichmentInjury[];
    away: EnrichmentInjury[];
  };
}

function toLineup(
  el: EnrichmentLineup,
  team: { id: number; name: string }
) {
  return {
    teamId: team.id,
    teamName: team.name,
    formation: el.formation,
    coach: el.coach,
    startXI: el.startXI.map((p, i) => ({
      id: i + 1,
      name: p.name,
      number: p.number,
      position: p.position,
      grid: null,
    })),
    substitutes: el.substitutes.map((p, i) => ({
      id: 100 + i,
      name: p.name,
      number: p.number,
      position: p.position,
      grid: null,
    })),
  };
}

function applyEnrichment(
  data: MatchAnalysisData,
  enrichment: EnrichmentResponse
): MatchAnalysisData {
  const lineups =
    data.lineups.status === "unavailable" && enrichment.lineups
      ? {
          status: "predicted" as const,
          home: toLineup(enrichment.lineups.home, {
            id: data.match.homeTeam.id,
            name: data.match.homeTeam.name,
          }),
          away: toLineup(enrichment.lineups.away, {
            id: data.match.awayTeam.id,
            name: data.match.awayTeam.name,
          }),
        }
      : data.lineups;

  const toInjuryList = (items: EnrichmentInjury[], filter: "injury" | "suspension") =>
    items
      .filter((i) => i.type === filter)
      .map((i, idx) => ({
        player: { id: idx + 900, name: i.name, photo: "" },
        type: i.type,
        reason: i.reason,
      }));

  const homeInjuries = enrichment.injuries && data.homeTeam.injuries.length === 0
    ? toInjuryList(enrichment.injuries.home, "injury")
    : data.homeTeam.injuries;
  const homeSuspensions = enrichment.injuries && data.homeTeam.suspensions.length === 0
    ? toInjuryList(enrichment.injuries.home, "suspension")
    : data.homeTeam.suspensions;
  const awayInjuries = enrichment.injuries && data.awayTeam.injuries.length === 0
    ? toInjuryList(enrichment.injuries.away, "injury")
    : data.awayTeam.injuries;
  const awaySuspensions = enrichment.injuries && data.awayTeam.suspensions.length === 0
    ? toInjuryList(enrichment.injuries.away, "suspension")
    : data.awayTeam.suspensions;

  return {
    ...data,
    lineups,
    homeTeam: {
      ...data.homeTeam,
      injuries: homeInjuries,
      suspensions: homeSuspensions,
      bestFormPlayer: data.homeTeam.bestFormPlayer ?? (enrichment.home.bestFormPlayer
        ? { ...enrichment.home.bestFormPlayer, photo: "" }
        : null),
      playerRatings: data.homeTeam.playerRatings.length > 0
        ? data.homeTeam.playerRatings
        : enrichment.home.playerRatings.map((r) => ({ ...r, photo: "" })),
      last5: {
        ...data.homeTeam.last5,
        yellowCards: data.homeTeam.last5.yellowCards || enrichment.home.yellowCards,
        redCards: data.homeTeam.last5.redCards || enrichment.home.redCards,
        fouls: data.homeTeam.last5.fouls || enrichment.home.fouls,
      },
    },
    awayTeam: {
      ...data.awayTeam,
      injuries: awayInjuries,
      suspensions: awaySuspensions,
      bestFormPlayer: data.awayTeam.bestFormPlayer ?? (enrichment.away.bestFormPlayer
        ? { ...enrichment.away.bestFormPlayer, photo: "" }
        : null),
      playerRatings: data.awayTeam.playerRatings.length > 0
        ? data.awayTeam.playerRatings
        : enrichment.away.playerRatings.map((r) => ({ ...r, photo: "" })),
      last5: {
        ...data.awayTeam.last5,
        yellowCards: data.awayTeam.last5.yellowCards || enrichment.away.yellowCards,
        redCards: data.awayTeam.last5.redCards || enrichment.away.redCards,
        fouls: data.awayTeam.last5.fouls || enrichment.away.fouls,
      },
    },
  };
}

export function useMatchAnalysis(matchId: string) {
  const [data, setData] = useState<MatchAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
      const res = await fetch(url);
      if (res.status === 500 && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) throw new Error("cancelled");
        return fetchWithRetry(url, retries - 1);
      }
      return res;
    }

    async function fetchAnalysis() {
      try {
        const res = await fetchWithRetry(`/api/matches/${matchId}`);
        if (cancelled) return;
        if (res.status === 429) {
          setError("Daily API limit reached. Try again tomorrow.");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch match data");
        const json = await res.json();
        const analysis: MatchAnalysisData = json.analysis;
        setData(analysis);
        setBudget(json.budget?.remaining ?? null);

        const needsEnrichment =
          !analysis.homeTeam.bestFormPlayer ||
          analysis.homeTeam.playerRatings.length === 0 ||
          (analysis.homeTeam.last5.yellowCards === 0 &&
            analysis.homeTeam.last5.fouls === 0) ||
          analysis.lineups.status === "unavailable" ||
          (analysis.homeTeam.injuries.length === 0 &&
            analysis.homeTeam.suspensions.length === 0 &&
            analysis.awayTeam.injuries.length === 0 &&
            analysis.awayTeam.suspensions.length === 0);

        if (needsEnrichment) {
          setEnriching(true);
          try {
            const enrichRes = await fetch("/api/enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ matchData: analysis }),
            });
            if (enrichRes.ok) {
              const json = await enrichRes.json();
              if (!json.error) {
                const enrichment = json as EnrichmentResponse;
                setData((prev) =>
                  prev ? applyEnrichment(prev, enrichment) : prev
                );
              }
            }
          } catch {
            // Enrichment is optional — silently continue
          } finally {
            setEnriching(false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
    return () => { cancelled = true; };
  }, [matchId]);

  return { data, loading, error, budget, enriching };
}

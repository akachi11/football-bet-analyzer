"use client";

import type { MatchAnalysisData } from "./types";

const TTL = 10 * 60 * 1000;

interface BetPrediction {
  market: string;
  prediction: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

export interface AnalysisResult {
  summary: string;
  predictions: BetPrediction[];
  playerNews: string | null;
}

interface MatchEntry {
  data: MatchAnalysisData;
  budget: number | null;
  ts: number;
}

interface AnalysisEntry {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  ts: number;
}

const matchStore = new Map<string, MatchEntry>();
const analysisStore = new Map<string, AnalysisEntry>();
const inflight = new Map<string, Promise<void>>();
const subs = new Map<string, Set<() => void>>();

function expired(ts: number) {
  return Date.now() - ts > TTL;
}

function notify(id: string) {
  subs.get(id)?.forEach((cb) => cb());
}

export function subscribe(id: string, cb: () => void): () => void {
  if (!subs.has(id)) subs.set(id, new Set());
  subs.get(id)!.add(cb);
  return () => {
    subs.get(id)?.delete(cb);
  };
}

export function getCachedMatch(id: string): MatchEntry | null {
  const e = matchStore.get(id);
  if (!e || expired(e.ts)) return null;
  return e;
}

export function setCachedMatch(
  id: string,
  data: MatchAnalysisData,
  budget: number | null
) {
  matchStore.set(id, { data, budget, ts: Date.now() });
}

export function updateCachedMatchData(id: string, data: MatchAnalysisData) {
  const e = matchStore.get(id);
  if (e) {
    e.data = data;
    e.ts = Date.now();
  }
}

export function getAnalysisState(id: string): AnalysisEntry {
  const e = analysisStore.get(id);
  if (!e || expired(e.ts))
    return { result: null, loading: false, error: null, ts: 0 };
  return e;
}

export function isAnalysisLoading(id: string): boolean {
  return inflight.has(id);
}

export function generateAnalysis(
  id: string,
  data: MatchAnalysisData,
  force = false
) {
  if (!force && inflight.has(id)) return;

  const existing = analysisStore.get(id);
  if (!force && existing?.result && !expired(existing.ts)) return;

  analysisStore.set(id, {
    result: null,
    loading: true,
    error: null,
    ts: Date.now(),
  });
  notify(id);

  const promise = (async () => {
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchData: data }),
      });
      if (!res.ok) throw new Error("Failed to generate analysis");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      analysisStore.set(id, {
        result: json as AnalysisResult,
        loading: false,
        error: null,
        ts: Date.now(),
      });
    } catch (err) {
      analysisStore.set(id, {
        result: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
        ts: Date.now(),
      });
    } finally {
      inflight.delete(id);
      notify(id);
    }
  })();

  inflight.set(id, promise);
}

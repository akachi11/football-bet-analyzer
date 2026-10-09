"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import type { MatchAnalysisData } from "@/lib/types";
import {
  getAnalysisState,
  generateAnalysis,
  subscribe,
  type AnalysisResult,
} from "@/lib/match-cache";

interface AnalysisTabProps {
  matchId: string;
  data: MatchAnalysisData;
}

export function AnalysisTab({ matchId, data }: AnalysisTabProps) {
  const [, tick] = useState(0);

  useEffect(() => {
    return subscribe(matchId, () => tick((n) => n + 1));
  }, [matchId]);

  const state = getAnalysisState(matchId);
  const { result: analysis, loading, error } = state;

  const handleGenerate = () => generateAnalysis(matchId, data);
  const handleRegenerate = () => generateAnalysis(matchId, data, true);

  const confidenceColor = (c: string) => {
    switch (c) {
      case "high":
        return "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 ring-amber-500/20";
      case "low":
        return "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {!analysis && !loading && !error && (
        <div className="py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-emerald-400/50" />
          <p className="mt-4 text-sm text-zinc-400">
            Generate AI-powered betting analysis based on all collected stats
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            <Sparkles className="h-4 w-4" />
            Generate Analysis
          </motion.button>
          <p className="mt-2 text-[10px] text-zinc-600">
            Uses AI to analyze stats — costs 1 Gemini request
          </p>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm text-zinc-500">
            Analyzing match data and player stats...
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">
            You can switch tabs — this runs in the background
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={handleGenerate}
            className="mt-2 text-xs text-zinc-400 underline hover:text-zinc-300"
          >
            Try again
          </button>
        </div>
      )}

      {analysis && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Summary */}
          <section className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-5">
            <h3 className="mb-2 text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Match Summary
            </h3>
            <p className="text-sm leading-relaxed text-zinc-300">
              {analysis.summary}
            </p>
          </section>

          {/* Predictions */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Bet Predictions
            </h3>
            {analysis.predictions.map((pred, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-zinc-500">{pred.market}</span>
                    <div className="text-sm font-semibold text-zinc-100">
                      {pred.prediction}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ${confidenceColor(pred.confidence)}`}
                  >
                    {pred.confidence}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {pred.reasoning}
                </p>
              </motion.div>
            ))}
          </section>

          {/* Player News */}
          {analysis.playerNews && (
            <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Player News & Factors
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400 whitespace-pre-line">
                {analysis.playerNews}
              </p>
            </section>
          )}

          {/* Regenerate */}
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRegenerate}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate analysis
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

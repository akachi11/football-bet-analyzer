"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, MapPin, User } from "lucide-react";
import { useMatchAnalysis } from "@/hooks/use-matches";
import { MatchDetailSkeleton } from "@/components/skeleton";
import { OverviewTab } from "@/components/tabs/overview-tab";
import { StatsTab } from "@/components/tabs/stats-tab";
import { LineupsTab } from "@/components/tabs/lineups-tab";
import { AnalysisTab } from "@/components/tabs/analysis-tab";
import { cn, formatTime, formatDate } from "@/lib/utils";

const TABS = ["Overview", "Stats", "Lineups", "Analysis"] as const;
type Tab = (typeof TABS)[number];

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data, loading, error, budget } = useMatchAnalysis(
    params.id as string
  );
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <MatchDetailSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-sm text-red-400">{error ?? "Match not found"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Go back
        </button>
      </div>
    );
  }

  const { match } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Back + Budget */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </motion.button>
        {budget !== null && (
          <span className="text-[10px] text-zinc-600">
            {budget} API calls remaining today
          </span>
        )}
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-6"
      >
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Home */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center text-center"
          >
            <img
              src={match.homeTeam.crest}
              alt={match.homeTeam.shortName}
              className="h-16 w-16 object-contain sm:h-20 sm:w-20"
            />
            <span className="mt-2 text-sm font-semibold text-zinc-200">
              {match.homeTeam.shortName}
            </span>
          </motion.div>

          {/* VS / Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center"
          >
            {match.status === "FINISHED" ||
            match.status === "IN_PLAY" ||
            match.status === "PAUSED" ? (
              <div className="text-3xl font-bold tabular-nums text-zinc-100">
                {match.score.fullTime.home} - {match.score.fullTime.away}
              </div>
            ) : (
              <div className="text-2xl font-bold text-zinc-600">VS</div>
            )}
          </motion.div>

          {/* Away */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center text-center"
          >
            <img
              src={match.awayTeam.crest}
              alt={match.awayTeam.shortName}
              className="h-16 w-16 object-contain sm:h-20 sm:w-20"
            />
            <span className="mt-2 text-sm font-semibold text-zinc-200">
              {match.awayTeam.shortName}
            </span>
          </motion.div>
        </div>

        {/* Match Meta */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(match.utcDate)} &middot; {formatDate(match.utcDate)}
          </span>
          {match.competition && (
            <span className="flex items-center gap-1">
              <img
                src={match.competition.emblem}
                alt=""
                className="h-3 w-3 object-contain"
              />
              {match.competition.name}
              {match.matchday ? ` · MD ${match.matchday}` : ""}
            </span>
          )}
          {match.referees.length > 0 && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {match.referees[0].name}
            </span>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-white/[0.03] p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
              activeTab === tab
                ? "text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg bg-white/[0.08]"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "Overview" && (
          <OverviewTab key="overview" data={data} />
        )}
        {activeTab === "Stats" && <StatsTab key="stats" data={data} />}
        {activeTab === "Lineups" && (
          <LineupsTab key="lineups" data={data} />
        )}
        {activeTab === "Analysis" && (
          <AnalysisTab key="analysis" matchId={params.id as string} data={data} />
        )}
      </AnimatePresence>
    </div>
  );
}

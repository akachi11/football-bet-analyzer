"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Zap, Trophy, Frown } from "lucide-react";
import { useTodayMatches } from "@/hooks/use-matches";
import { MatchCard } from "@/components/match-card";
import { LeagueFilter } from "@/components/league-filter";
import { MatchCardSkeleton } from "@/components/skeleton";
import type { Match } from "@/lib/types";

export default function HomePage() {
  const { matches, loading, error } = useTodayMatches();
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(
    new Set()
  );

  const leagues = useMemo(() => {
    const seen = new Map<string, { code: string; name: string; emblem: string }>();
    for (const m of matches) {
      if (!seen.has(m.competition.code)) {
        seen.set(m.competition.code, {
          code: m.competition.code,
          name: m.competition.name,
          emblem: m.competition.emblem,
        });
      }
    }
    return Array.from(seen.values());
  }, [matches]);

  // Initialize: all leagues selected
  useMemo(() => {
    if (leagues.length > 0 && selectedLeagues.size === 0) {
      setSelectedLeagues(new Set(leagues.map((l) => l.code)));
    }
  }, [leagues, selectedLeagues.size]);

  const toggleLeague = (code: string) => {
    setSelectedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, { competition: Match["competition"]; matches: Match[] }>();
    for (const m of matches) {
      if (!selectedLeagues.has(m.competition.code)) continue;
      const existing = map.get(m.competition.code);
      if (existing) {
        existing.matches.push(m);
      } else {
        map.set(m.competition.code, {
          competition: m.competition,
          matches: [m],
        });
      }
    }
    return Array.from(map.values());
  }, [matches, selectedLeagues]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BetIQ</h1>
              <p className="text-xs text-zinc-500">AI-Powered Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-400">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>
      </motion.header>

      {/* League Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-6"
      >
        <LeagueFilter
          leagues={leagues}
          selected={selectedLeagues}
          onToggle={toggleLeague}
        />
      </motion.div>

      {/* Content */}
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center"
        >
          <p className="text-sm text-red-400">{error}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Check your API key in .env.local
          </p>
        </motion.div>
      )}

      {!loading && !error && grouped.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-20 text-center"
        >
          <Frown className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">
            No matches today across selected leagues
          </p>
        </motion.div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {grouped.map((group) => (
            <motion.section
              key={group.competition.code}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-3 flex items-center gap-2.5">
                {group.competition.emblem && (
                  <img
                    src={group.competition.emblem}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                )}
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-300">
                    {group.competition.name}
                  </h2>
                  <Trophy className="h-3 w-3 text-zinc-600" />
                  <span className="text-xs text-zinc-600">
                    {group.matches.length} match
                    {group.matches.length !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {group.matches.map((match, i) => (
                  <MatchCard key={match.id} match={match} index={i} />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}

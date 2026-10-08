"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, CircleDot } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import type { Match } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  index: number;
}

export function MatchCard({ match, index }: MatchCardProps) {
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const hasScore = isLive || isFinished;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
    >
      <Link href={`/match/${match.id}`}>
        <motion.div
          whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.04)" }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            "group relative rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all",
            "hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5",
            isLive && "border-emerald-500/30 bg-emerald-500/[0.03]"
          )}
        >
          {isLive && (
            <div className="absolute -top-px left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1 rounded-b-md bg-emerald-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                <CircleDot className="h-2.5 w-2.5 animate-pulse" />
                Live
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex flex-1 items-center gap-3">
              <img
                src={match.homeTeam.crest}
                alt={match.homeTeam.shortName}
                className="h-8 w-8 object-contain"
              />
              <span className="text-sm font-medium text-zinc-200 truncate">
                {match.homeTeam.shortName}
              </span>
            </div>

            {/* Score / Time */}
            <div className="flex-shrink-0 text-center">
              {hasScore ? (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      isLive ? "text-emerald-400" : "text-zinc-100"
                    )}
                  >
                    {match.score.fullTime.home}
                  </span>
                  <span className="text-xs text-zinc-600">-</span>
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      isLive ? "text-emerald-400" : "text-zinc-100"
                    )}
                  >
                    {match.score.fullTime.away}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm font-medium tabular-nums">
                    {formatTime(match.utcDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-1 items-center justify-end gap-3">
              <span className="text-sm font-medium text-zinc-200 truncate">
                {match.awayTeam.shortName}
              </span>
              <img
                src={match.awayTeam.crest}
                alt={match.awayTeam.shortName}
                className="h-8 w-8 object-contain"
              />
            </div>
          </div>

          {isFinished && (
            <div className="mt-2 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                FT
              </span>
            </div>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
}

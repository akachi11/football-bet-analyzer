"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldOff, UserX } from "lucide-react";
import type { MatchAnalysisData } from "@/lib/types";

interface LineupsTabProps {
  data: MatchAnalysisData;
}

export function LineupsTab({ data }: LineupsTabProps) {
  const { lineups, homeTeam, awayTeam, match } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Lineup Status */}
      <div className="flex items-center justify-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            lineups.status === "confirmed"
              ? "bg-emerald-500/10 text-emerald-400"
              : lineups.status === "predicted"
                ? "bg-amber-500/10 text-amber-400"
                : "bg-zinc-500/10 text-zinc-500"
          }`}
        >
          {lineups.status === "confirmed"
            ? "Confirmed Lineup"
            : lineups.status === "predicted"
              ? "Predicted Lineup"
              : "Lineups Unavailable"}
        </span>
        {lineups.status === "predicted" && (
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium text-violet-400">
            AI-estimated
          </span>
        )}
      </div>

      {/* Lineups */}
      {(lineups.home || lineups.away) && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { team: match.homeTeam, lineup: lineups.home },
            { team: match.awayTeam, lineup: lineups.away },
          ].map(({ team, lineup }) => (
            <section
              key={team.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <img
                  src={team.crest}
                  alt=""
                  className="h-6 w-6 object-contain"
                />
                <div>
                  <div className="text-sm font-medium text-zinc-200">
                    {team.shortName}
                  </div>
                  {lineup && (
                    <div className="text-[10px] text-zinc-500">
                      {lineup.formation} &middot; {lineup.coach}
                    </div>
                  )}
                </div>
              </div>

              {lineup ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-500/60">
                      Starting XI
                    </div>
                    {lineup.startXI.map((player, i) => (
                      <motion.div
                        key={player.id || i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between py-1 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-right text-zinc-600 font-mono text-[10px]">
                            {player.number || "-"}
                          </span>
                          <span className="text-zinc-300">{player.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600">
                          {player.position}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {lineup.substitutes.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        Substitutes
                      </div>
                      {lineup.substitutes.slice(0, 9).map((player, i) => (
                        <div
                          key={player.id || i}
                          className="flex items-center justify-between py-0.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-right text-zinc-700 font-mono text-[10px]">
                              {player.number || "-"}
                            </span>
                            <span className="text-zinc-500">{player.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-700">
                            {player.position}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-600">
                  Not available yet
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Injuries & Suspensions */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Injuries & Suspensions
          </h3>
          {(homeTeam.injuries.length > 0 || homeTeam.suspensions.length > 0 ||
            awayTeam.injuries.length > 0 || awayTeam.suspensions.length > 0) &&
            homeTeam.injuries.every((i) => !i.player.photo) && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium text-violet-400">
              AI-estimated
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { team: match.homeTeam, analysis: homeTeam },
            { team: match.awayTeam, analysis: awayTeam },
          ].map(({ team, analysis }) => (
            <div key={team.id}>
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={team.crest}
                  alt=""
                  className="h-4 w-4 object-contain"
                />
                <span className="text-xs font-medium text-zinc-500">
                  {team.shortName}
                </span>
              </div>

              {analysis.injuries.length === 0 &&
              analysis.suspensions.length === 0 ? (
                <div className="text-xs text-zinc-600 py-2">
                  No known issues
                </div>
              ) : (
                <div className="space-y-1">
                  {analysis.injuries.map((inj, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 rounded-md bg-red-500/5 px-2 py-1.5 text-xs"
                    >
                      <UserX className="h-3 w-3 flex-shrink-0 text-red-400" />
                      <div className="min-w-0">
                        <div className="text-zinc-300 truncate">
                          {inj.player.name}
                        </div>
                        <div className="text-[10px] text-red-400/70">
                          {inj.reason}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {analysis.suspensions.map((sus, i) => (
                    <motion.div
                      key={`s-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 rounded-md bg-amber-500/5 px-2 py-1.5 text-xs"
                    >
                      <ShieldOff className="h-3 w-3 flex-shrink-0 text-amber-400" />
                      <div className="min-w-0">
                        <div className="text-zinc-300 truncate">
                          {sus.player.name}
                        </div>
                        <div className="text-[10px] text-amber-400/70">
                          {sus.reason}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { StatBar } from "@/components/stat-bar";
import type { MatchAnalysisData } from "@/lib/types";

interface StatsTabProps {
  data: MatchAnalysisData;
}

export function StatsTab({ data }: StatsTabProps) {
  const { homeTeam, awayTeam, match } = data;
  const h = homeTeam.last5;
  const a = awayTeam.last5;
  const compName = match.competition.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Last 5 Comparison */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-5 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Last 5 Matches
        </h3>
        <div className="space-y-4">
          <StatBar label="Goals Scored" home={h.goalsScored} away={a.goalsScored} />
          <StatBar label="Goals Conceded" home={h.goalsConceded} away={a.goalsConceded} reverseColor />
          <StatBar label="Clean Sheets" home={h.cleanSheets} away={a.cleanSheets} />
          <StatBar label="Yellow Cards" home={h.yellowCards} away={a.yellowCards} reverseColor />
          <StatBar label="Red Cards" home={h.redCards} away={a.redCards} reverseColor />
          <StatBar label="Fouls" home={h.fouls} away={a.fouls} reverseColor />
        </div>
      </section>

      {/* Scoring / Conceding Half */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Scoring & Conceding Pattern
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { team: match.homeTeam, stats: h },
            { team: match.awayTeam, stats: a },
          ].map(({ team, stats }) => (
            <div key={team.id} className="rounded-lg bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-3">
                <img src={team.crest} alt="" className="h-5 w-5 object-contain" />
                <span className="text-xs font-medium text-zinc-400">{team.shortName}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Most scoring half</span>
                  <span className="font-semibold text-emerald-400">
                    {stats.mostScoringHalf === "even" ? "Even" : `${stats.mostScoringHalf} Half`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Most conceding half</span>
                  <span className="font-semibold text-red-400">
                    {stats.mostConcedingHalf === "even" ? "Even" : `${stats.mostConcedingHalf} Half`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Scorers & Assisters */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Top Scorers & Assisters
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { team: match.homeTeam, analysis: homeTeam },
            { team: match.awayTeam, analysis: awayTeam },
          ].map(({ team, analysis }) => (
            <div key={team.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <img src={team.crest} alt="" className="h-5 w-5 object-contain" />
                <span className="text-xs font-medium text-zinc-400">{team.shortName}</span>
              </div>

              {/* Scorers */}
              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  Scorers (All Comps)
                </div>
                {analysis.topScorers.allCompetitions.length > 0 ? (
                  analysis.topScorers.allCompetitions.map((p, i) => (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between py-1 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {p.photo ? (
                          <img src={p.photo} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] text-zinc-400">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-zinc-300 truncate max-w-[100px]">{p.name}</span>
                      </div>
                      <span className="font-semibold text-zinc-200">{p.goals}G</span>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-600">No data</div>
                )}
              </div>

              {/* Competition Scorers */}
              {analysis.topScorers.thisCompetition.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600">
                    Scorers ({compName}) &#x25CF;
                  </div>
                  {analysis.topScorers.thisCompetition.map((p, i) => (
                    <motion.div
                      key={p.player.name}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between py-1 text-xs"
                    >
                      <span className="text-zinc-300 truncate max-w-[120px]">{p.player.name}</span>
                      <span className="font-semibold text-zinc-200">{p.goals}G {p.assists ?? 0}A</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Assisters */}
              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  Assisters (All Comps)
                </div>
                {analysis.topAssisters.allCompetitions.length > 0 ? (
                  analysis.topAssisters.allCompetitions.map((p, i) => (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between py-1 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {p.photo ? (
                          <img src={p.photo} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] text-zinc-400">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-zinc-300 truncate max-w-[100px]">{p.name}</span>
                      </div>
                      <span className="font-semibold text-zinc-200">{p.assists}A</span>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-600">No data</div>
                )}
              </div>

              {/* Competition Assisters */}
              {analysis.topAssisters.thisCompetition.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600">
                    Assisters ({compName}) &#x25CF;
                  </div>
                  {analysis.topAssisters.thisCompetition.map((p, i) => (
                    <motion.div
                      key={p.player.name}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between py-1 text-xs"
                    >
                      <span className="text-zinc-300 truncate max-w-[120px]">{p.player.name}</span>
                      <span className="font-semibold text-zinc-200">{p.assists ?? 0}A {p.goals}G</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Best Form Player + Ratings */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Best Form Player (Last 5)
          </h3>
          {homeTeam.bestFormPlayer && !homeTeam.bestFormPlayer.photo && (
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
            <div key={team.id} className="rounded-lg bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-3">
                <img src={team.crest} alt="" className="h-5 w-5 object-contain" />
                <span className="text-xs font-medium text-zinc-400">{team.shortName}</span>
              </div>
              {analysis.bestFormPlayer ? (
                <div className="flex items-center gap-3">
                  {analysis.bestFormPlayer.photo ? (
                    <img
                      src={analysis.bestFormPlayer.photo}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/30 text-emerald-400 text-sm font-bold">
                      {analysis.bestFormPlayer.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-zinc-200">
                      {analysis.bestFormPlayer.name}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {analysis.bestFormPlayer.position}
                    </div>
                    <div className="mt-1 flex gap-2 text-[10px]">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400">
                        {analysis.bestFormPlayer.averageRating} avg
                      </span>
                      <span className="text-zinc-400">
                        {analysis.bestFormPlayer.goals}G {analysis.bestFormPlayer.assists}A
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-600">No data</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Player Ratings */}
      {(homeTeam.playerRatings.length > 0 || awayTeam.playerRatings.length > 0) && (
        <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Average Ratings (Last 5)
            </h3>
            {homeTeam.playerRatings.length > 0 && !homeTeam.playerRatings[0].photo && (
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium text-violet-400">
                AI-estimated
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { team: match.homeTeam, ratings: homeTeam.playerRatings },
              { team: match.awayTeam, ratings: awayTeam.playerRatings },
            ].map(({ team, ratings }) => (
              <div key={team.id}>
                <div className="flex items-center gap-2 mb-2">
                  <img src={team.crest} alt="" className="h-4 w-4 object-contain" />
                  <span className="text-xs font-medium text-zinc-500">{team.shortName}</span>
                </div>
                <div className="space-y-1">
                  {ratings.slice(0, 8).map((p, i) => (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        {p.photo ? (
                          <img src={p.photo} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[8px] text-zinc-400">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-zinc-400 truncate max-w-[90px]">{p.name}</span>
                      </div>
                      <span
                        className={`font-mono font-semibold ${
                          parseFloat(p.rating) >= 7.5
                            ? "text-emerald-400"
                            : parseFloat(p.rating) >= 6.5
                              ? "text-zinc-300"
                              : "text-red-400"
                        }`}
                      >
                        {p.rating}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { FormBadge } from "@/components/form-badge";
import type { MatchAnalysisData } from "@/lib/types";

interface OverviewTabProps {
  data: MatchAnalysisData;
}

export function OverviewTab({ data }: OverviewTabProps) {
  const { headToHead, homeTeam, awayTeam } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* H2H */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Head to Head
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {headToHead.homeTeamWins}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {data.match.homeTeam.shortName} wins
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-400">
              {headToHead.draws}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Draws</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {headToHead.awayTeamWins}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {data.match.awayTeam.shortName} wins
            </div>
          </div>
        </div>

        {headToHead.recentMeetings.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-zinc-600 font-medium">Recent meetings</div>
            {headToHead.recentMeetings.slice(0, 5).map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="text-zinc-500">
                  {new Date(m.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </span>
                <span className="text-zinc-300">
                  {m.homeTeam}{" "}
                  <span className="font-bold text-zinc-100">
                    {m.scoreHome} - {m.scoreAway}
                  </span>{" "}
                  {m.awayTeam}
                </span>
                <span className="text-zinc-600 truncate max-w-[80px]">
                  {m.competition}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Standings Comparison */}
      {(homeTeam.standings || awayTeam.standings) && (
        <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            League Standings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { team: data.match.homeTeam, standing: homeTeam.standings },
              { team: data.match.awayTeam, standing: awayTeam.standings },
            ].map(({ team, standing }) => (
              <div
                key={team.id}
                className="rounded-lg bg-white/[0.03] p-4 text-center"
              >
                <img
                  src={team.crest}
                  alt=""
                  className="mx-auto h-8 w-8 object-contain"
                />
                <div className="mt-2 text-xs font-medium text-zinc-400">
                  {team.shortName}
                </div>
                {standing ? (
                  <>
                    <div className="mt-2 text-3xl font-bold text-zinc-100">
                      {standing.position}
                      <span className="text-sm text-zinc-500">
                        {standing.position === 1
                          ? "st"
                          : standing.position === 2
                            ? "nd"
                            : standing.position === 3
                              ? "rd"
                              : "th"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {standing.points} pts &middot; {standing.won}W{" "}
                      {standing.draw}D {standing.lost}L
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      GD: {standing.goalDifference > 0 ? "+" : ""}
                      {standing.goalDifference}
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-xs text-zinc-600">N/A</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Form */}
      <section className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Recent Form
        </h3>
        <div className="space-y-4">
          {[
            { team: data.match.homeTeam, analysis: homeTeam },
            { team: data.match.awayTeam, analysis: awayTeam },
          ].map(({ team, analysis }) => (
            <div
              key={team.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <img
                  src={team.crest}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
                <span className="text-sm text-zinc-300">
                  {team.shortName}
                </span>
              </div>
              <FormBadge form={analysis.last5.form} />
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LeagueFilterProps {
  leagues: { code: string; name: string; emblem: string }[];
  selected: Set<string>;
  onToggle: (code: string) => void;
}

export function LeagueFilter({ leagues, selected, onToggle }: LeagueFilterProps) {
  if (leagues.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const allSelected = leagues.every((l) => selected.has(l.code));
          for (const l of leagues) onToggle(l.code);
          if (allSelected) return;
        }}
        className={cn(
          "flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
          leagues.every((l) => selected.has(l.code))
            ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
            : "bg-white/5 text-zinc-400 hover:bg-white/10"
        )}
      >
        All
      </motion.button>

      {leagues.map((league) => (
        <motion.button
          key={league.code}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggle(league.code)}
          className={cn(
            "flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            selected.has(league.code)
              ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-white/5 text-zinc-400 hover:bg-white/10"
          )}
        >
          {league.emblem && (
            <img
              src={league.emblem}
              alt=""
              className="h-4 w-4 object-contain"
            />
          )}
          <span className="whitespace-nowrap">{league.name}</span>
        </motion.button>
      ))}
    </div>
  );
}

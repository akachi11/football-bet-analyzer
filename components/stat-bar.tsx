"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface StatBarProps {
  label: string;
  home: number;
  away: number;
  unit?: string;
  reverseColor?: boolean;
}

export function StatBar({ label, home, away, unit = "", reverseColor = false }: StatBarProps) {
  const homeRef = useRef<HTMLSpanElement>(null);
  const awayRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (homeRef.current) {
      gsap.fromTo(
        homeRef.current,
        { textContent: "0" },
        {
          textContent: home,
          duration: 1,
          ease: "power2.out",
          snap: { textContent: 1 },
        }
      );
    }
    if (awayRef.current) {
      gsap.fromTo(
        awayRef.current,
        { textContent: "0" },
        {
          textContent: away,
          duration: 1,
          ease: "power2.out",
          snap: { textContent: 1 },
        }
      );
    }
  }, [visible, home, away]);

  const total = home + away || 1;
  const homePercent = (home / total) * 100;
  const awayPercent = (away / total) * 100;

  const homeWinning = reverseColor ? home < away : home > away;
  const awayWinning = reverseColor ? away < home : away > home;

  return (
    <div ref={containerRef} className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-semibold tabular-nums",
            homeWinning ? "text-emerald-400" : "text-zinc-300"
          )}
        >
          <span ref={homeRef}>0</span>
          {unit}
        </span>
        <span className="text-zinc-500 font-medium">{label}</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            awayWinning ? "text-emerald-400" : "text-zinc-300"
          )}
        >
          <span ref={awayRef}>0</span>
          {unit}
        </span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
        <motion.div
          initial={{ width: 0 }}
          animate={visible ? { width: `${homePercent}%` } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "rounded-full",
            homeWinning ? "bg-emerald-500" : "bg-zinc-700"
          )}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={visible ? { width: `${awayPercent}%` } : {}}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className={cn(
            "rounded-full",
            awayWinning ? "bg-emerald-500" : "bg-zinc-700"
          )}
        />
      </div>
    </div>
  );
}

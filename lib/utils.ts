import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getFormColor(result: string): string {
  switch (result) {
    case "W":
      return "bg-emerald-500";
    case "D":
      return "bg-amber-500";
    case "L":
      return "bg-red-500";
    default:
      return "bg-zinc-600";
  }
}

import type { Category, IncidentStatus, Priority } from "./schemas";

export const PRIORITY_TOKENS: Record<Priority, { bg: string; fg: string; dot: string; label: string }> = {
  critical: { bg: "oklch(93% 0.06 25)", fg: "oklch(38% 0.17 25)", dot: "oklch(52% 0.19 25)", label: "Critical" },
  high: { bg: "oklch(94% 0.05 35)", fg: "oklch(40% 0.15 35)", dot: "#ff5c35", label: "High" },
  medium: { bg: "oklch(95% 0.05 80)", fg: "oklch(42% 0.12 80)", dot: "oklch(72% 0.14 80)", label: "Medium" },
  low: { bg: "oklch(95% 0.01 220)", fg: "oklch(42% 0.02 220)", dot: "oklch(60% 0.02 220)", label: "Low" },
};

export const STATUS_TOKENS: Record<IncidentStatus, { bg: string; fg: string; label: string }> = {
  new: { bg: "oklch(94% 0.04 250)", fg: "oklch(40% 0.13 250)", label: "New" },
  in_review: { bg: "oklch(95% 0.05 90)", fg: "oklch(42% 0.12 90)", label: "In Review" },
  assigned: { bg: "oklch(94% 0.05 300)", fg: "oklch(42% 0.12 300)", label: "Assigned" },
  resolved: { bg: "oklch(94% 0.05 150)", fg: "oklch(38% 0.12 150)", label: "Resolved" },
  dismissed: { bg: "oklch(95% 0.01 250)", fg: "oklch(45% 0.02 250)", label: "Dismissed" },
};

const CATEGORY_HUES: Record<Category, number> = {
  pothole: 25,
  water: 220,
  tree: 140,
  dumping: 280,
  streetlight: 80,
  noise: 340,
  graffiti: 190,
  vehicle: 260,
  other: 250,
};

export function categoryTokens(category: Category): { bg: string; fg: string } {
  const hue = CATEGORY_HUES[category];
  return { bg: `oklch(92% 0.05 ${hue})`, fg: `oklch(32% 0.1 ${hue})` };
}

export type CallOutcome = "linked" | "none" | "escalated";

export const CALL_OUTCOME_COLORS: Record<CallOutcome, { bg: string; fg: string }> = {
  linked: { bg: STATUS_TOKENS.resolved.bg, fg: STATUS_TOKENS.resolved.fg },
  none: { bg: STATUS_TOKENS.dismissed.bg, fg: STATUS_TOKENS.dismissed.fg },
  escalated: { bg: PRIORITY_TOKENS.critical.bg, fg: PRIORITY_TOKENS.critical.fg },
};

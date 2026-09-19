import type { Category, IncidentRecord, Priority, StructuredReport, TranscriptMessage } from "./schemas";

export type ActivityEntry = { label: string; at: string };

export function buildActivityTimeline(incident: IncidentRecord, primaryCallReceivedAt: string | null): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  if (primaryCallReceivedAt) {
    entries.push({ label: "Report received via AI intake", at: primaryCallReceivedAt });
  }
  entries.push({
    label: `AI created incident, priority set to ${incident.priority}`,
    at: incident.createdAt,
  });
  if (incident.status === "in_review") {
    entries.push({ label: "Operator review in progress", at: incident.updatedAt });
  } else if (incident.status === "assigned") {
    entries.push({ label: "Incident approved and assigned", at: incident.updatedAt });
  } else if (incident.status === "resolved") {
    entries.push({ label: "Incident marked resolved", at: incident.updatedAt });
  } else if (incident.status === "dismissed") {
    entries.push({ label: "Incident dismissed", at: incident.updatedAt });
  }
  return entries;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  pothole: "Pothole",
  water: "Water Main / Leak",
  tree: "Downed Tree",
  dumping: "Illegal Dumping",
  streetlight: "Streetlight Outage",
  noise: "Noise Complaint",
  graffiti: "Graffiti",
  vehicle: "Abandoned Vehicle",
  other: "General Issue",
};

export function humanizeCategory(category: Category): string {
  return CATEGORY_LABELS[category];
}

export function displayId(id: string, prefix: "INC" | "CALL"): string {
  return `${prefix}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  const visible = digits.slice(-4);
  const masked = "•".repeat(digits.length - 4) + visible;
  const prefix = phone.trim().startsWith("+") ? "+" : "";
  return `${prefix}${masked}`;
}

export function deriveTitle(report: StructuredReport): string {
  const location = report.location.raw.trim();
  const suffix = location || report.subtype.replace(/-/g, " ");
  return `${humanizeCategory(report.category)} — ${suffix}`;
}

const CRITICAL_PATTERN =
  /\b(injur|fire\b|gas leak|live wire|exposed wire|explosion|trapped|unconscious|life-threatening)\w*/;
const HIGH_PATTERN =
  /\b(flood|water main|no power|power outage|blocking|blocked|hazard|dangerous|swerv|collapsed)\w*/;

export function derivePriority(report: StructuredReport): Priority {
  const text = `${report.summary} ${Object.values(report.observations).join(" ")}`.toLowerCase();
  if (CRITICAL_PATTERN.test(text)) return "critical";
  if (HIGH_PATTERN.test(text)) return "high";
  if (report.category === "noise" || report.category === "graffiti") return "low";
  return "medium";
}

function normalizeLocation(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function locationOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeLocation(a));
  const tokensB = new Set(normalizeLocation(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }
  return shared / Math.min(tokensA.size, tokensB.size);
}

const DUPLICATE_WINDOW_MS = 72 * 60 * 60 * 1000;

export function findDuplicateCandidate(
  report: StructuredReport,
  openIncidents: IncidentRecord[],
  now: Date = new Date(),
): IncidentRecord | null {
  const candidates = openIncidents.filter((incident) => {
    if (incident.category !== report.category) return false;
    const age = now.getTime() - new Date(incident.createdAt).getTime();
    return age >= 0 && age <= DUPLICATE_WINDOW_MS;
  });

  let best: { incident: IncidentRecord; score: number } | null = null;
  for (const incident of candidates) {
    const score = locationOverlap(report.location.raw, incident.location.raw);
    if (score >= 0.5 && (!best || score > best.score)) {
      best = { incident, score };
    }
  }
  return best?.incident ?? null;
}

const ESCALATION_PHRASE = /hang up and call 911/i;

export function isEscalatedCall(messages: TranscriptMessage[]): boolean {
  return messages.some((message) => message.role === "assistant" && ESCALATION_PHRASE.test(message.text));
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return "<1m";
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

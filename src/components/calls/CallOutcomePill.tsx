import { CALL_OUTCOME_COLORS, type CallOutcome } from "@/lib/design-tokens";

export default function CallOutcomePill({ outcome, label }: { outcome: CallOutcome; label: string }) {
  const tokens = CALL_OUTCOME_COLORS[outcome];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: tokens.bg, color: tokens.fg }}
    >
      {label}
    </span>
  );
}

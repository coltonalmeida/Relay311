import { STATUS_TOKENS } from "@/lib/design-tokens";
import type { IncidentStatus } from "@/lib/schemas";

export default function StatusPill({ status }: { status: IncidentStatus }) {
  const tokens = STATUS_TOKENS[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: tokens.bg, color: tokens.fg }}
    >
      {tokens.label}
    </span>
  );
}

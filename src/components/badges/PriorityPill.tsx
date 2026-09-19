import { PRIORITY_TOKENS } from "@/lib/design-tokens";
import type { Priority } from "@/lib/schemas";

export default function PriorityPill({ priority }: { priority: Priority }) {
  const tokens = PRIORITY_TOKENS[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: tokens.bg, color: tokens.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tokens.dot }} />
      {tokens.label}
    </span>
  );
}

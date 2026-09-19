import { categoryTokens } from "@/lib/design-tokens";
import { humanizeCategory } from "@/lib/incident-heuristics";
import type { Category } from "@/lib/schemas";

export default function CategoryChip({ category }: { category: Category }) {
  const tokens = categoryTokens(category);
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold"
      style={{ background: tokens.bg, color: tokens.fg }}
    >
      {humanizeCategory(category)}
    </span>
  );
}

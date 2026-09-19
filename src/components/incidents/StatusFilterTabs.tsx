"use client";

export type QueueFilter = "all" | "open" | "resolved";

const OPTIONS: { value: QueueFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

export default function StatusFilterTabs({
  value,
  onChange,
}: {
  value: QueueFilter;
  onChange: (value: QueueFilter) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-[#e7ede9] p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            value === option.value ? "bg-paper text-ink shadow-sm" : "text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

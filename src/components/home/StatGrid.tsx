export type Stat = { label: string; value: string; accent?: boolean };

export default function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl bg-paper p-4 card-shadow">
          <p className="text-[11px] font-semibold text-muted">{stat.label}</p>
          <p className={`mt-1 text-[26px] font-extrabold ${stat.accent ? "text-green-text" : "text-ink"}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

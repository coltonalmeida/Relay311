const BAR_COUNT = 16;

export default function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-[78px] items-center justify-center gap-1.5 rounded-lg bg-[#e7ede9] px-4">
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span
          key={index}
          className="w-1 rounded-full bg-signal/70"
          style={{
            height: active ? undefined : "6px",
            animation: active ? `r311-bar ${0.9 + (index % 5) * 0.08}s ease-in-out ${index * 0.05}s infinite` : undefined,
          }}
        />
      ))}
    </div>
  );
}

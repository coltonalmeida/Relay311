export default function TranscriptLine({
  role,
  text,
  partial,
}: {
  role: "assistant" | "user";
  text: string;
  partial?: boolean;
}) {
  const isAssistant = role === "assistant";
  return (
    <div className="grid grid-cols-[70px_1fr] gap-3 border-b border-hairline-soft py-3 last:border-b-0">
      <span
        className={`pt-0.5 font-mono text-[10px] font-bold uppercase ${isAssistant ? "text-signal" : "text-green-text"}`}
      >
        {isAssistant ? "Relay311" : "Caller"}
      </span>
      <p className="text-sm leading-relaxed text-ink">
        {text}
        {partial && (
          <span className="ml-1 inline-block animate-[r311-blink_1s_steps(1)_infinite] text-muted">▋</span>
        )}
      </p>
    </div>
  );
}

import type { TranscriptMessage } from "./schemas";

function joinTranscriptText(current: string, next: string): string {
  if (!current) return next;
  if (!next) return current;
  return `${current.trimEnd()} ${next.trimStart()}`;
}

/** Groups provider transcript fragments into complete speaker turns for display. */
export function groupTranscriptTurns(messages: TranscriptMessage[]): TranscriptMessage[] {
  return messages.reduce<TranscriptMessage[]>((turns, message) => {
    const previous = turns.at(-1);

    if (previous?.role === message.role) {
      turns[turns.length - 1] = {
        role: previous.role,
        text: joinTranscriptText(previous.text, message.text),
        partial: message.partial,
      };
    } else {
      turns.push({ ...message });
    }

    return turns;
  }, []);
}

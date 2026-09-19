import CallTimeline from "@/components/calls/CallTimeline";
import { getCalls } from "@/lib/db/calls";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const calls = await getCalls();
  return <CallTimeline calls={calls} />;
}

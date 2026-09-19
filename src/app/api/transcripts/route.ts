import { listTranscriptFiles, saveTranscriptFile, transcriptInputSchema } from "@/lib/transcripts";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ transcripts: await listTranscriptFiles() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = transcriptInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid transcript payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const saved = await saveTranscriptFile(parsed.data);
    return Response.json({ transcript: saved }, { status: 201 });
  } catch (error) {
    console.error("Unable to save Vapi transcript", error);
    return Response.json({ error: "Unable to save transcript file" }, { status: 500 });
  }
}

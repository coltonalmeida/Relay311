import { clearLiveCall, getLiveCall } from "@/lib/live-call-state";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ call: getLiveCall() });
}

export async function POST(request: Request) {
  const liveCall = getLiveCall();
  if (!liveCall) {
    return Response.json({ error: "There is no active call." }, { status: 409 });
  }

  let requestedCallId: string | null = null;
  try {
    const body = (await request.json()) as { callId?: unknown };
    requestedCallId = typeof body.callId === "string" ? body.callId : null;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (requestedCallId !== liveCall.callId) {
    return Response.json({ error: "The active call changed. Refresh and try again." }, { status: 409 });
  }

  const apiKey = process.env.VAPI_PRIVATE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Vapi is not configured on the server." }, { status: 503 });
  }

  try {
    const callResponse = await fetch(
      `https://api.vapi.ai/call/${encodeURIComponent(liveCall.callId)}`,
      { headers: { authorization: `Bearer ${apiKey}` }, cache: "no-store" },
    );
    if (!callResponse.ok) {
      throw new Error(`Unable to read call state (${callResponse.status})`);
    }

    const providerCall = (await callResponse.json()) as {
      status?: string;
      monitor?: { controlUrl?: string };
    };
    if (providerCall.status === "ended") {
      clearLiveCall(liveCall.callId);
      return Response.json({ ended: true, alreadyEnded: true });
    }

    const controlUrl = providerCall.monitor?.controlUrl;
    if (!controlUrl) {
      return Response.json(
        { error: "Live call control is unavailable for this call." },
        { status: 409 },
      );
    }

    const endResponse = await fetch(controlUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "end-call" }),
    });
    if (!endResponse.ok) {
      throw new Error(`Vapi rejected the hangup request (${endResponse.status})`);
    }

    clearLiveCall(liveCall.callId);
    return Response.json({ ended: true });
  } catch (error) {
    console.error("Unable to end Vapi call", error);
    return Response.json({ error: "Unable to end the call. Please try again." }, { status: 502 });
  }
}

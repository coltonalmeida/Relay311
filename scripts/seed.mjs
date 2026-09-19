// Seeds realistic, varied demo data (calls + incidents) into Supabase for local/demo use.
// Run with `npm run seed` (clears any previous seed data first, then inserts fresh) or
// `npm run seed:clear` to just remove it. Seed rows are tagged via an external_call_id
// prefix ("seed-"), so clearing never touches real Vapi-sourced calls/incidents.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env).");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const SEED_PREFIX = "seed-";
const OPENING =
  "Hello, you've reached Relay311, the AI municipal service intake line. If anyone is in immediate danger, hang up and call 911. What municipal issue are you reporting today?";
const CLOSING = "Thank you for calling Relay311. Your report has been recorded. Goodbye for now.";

const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const transcriptOf = (messages) =>
  messages.map((m) => `${m.role === "assistant" ? "Relay311" : "Caller"}: ${m.text}`).join("\n");

function line(role, text) {
  return { role, text };
}

// --- Nine incident-producing calls, one per category, spread across priorities/statuses. ---
const INCIDENTS = [
  {
    id: "pothole-bloor",
    category: "pothole",
    subtype: "roadway-pothole",
    title: "Pothole — Bloor Street West near Dufferin",
    location: { raw: "Bloor Street West near Dufferin Street" },
    summary: "A deep pothole in the curb lane on Bloor Street West is causing cars to swerve into oncoming traffic.",
    priority: "medium",
    status: "resolved",
    assignee: "R. Alvarez",
    confidence: 0.93,
    observations: { lane: "curb lane", depth: "deep", trafficImpact: true },
    callerPhone: "+14165550142",
    createdHoursAgo: 30,
    updatedHoursAgo: 6,
    durationSeconds: 58,
    messages: [
      line("assistant", OPENING),
      line("user", "There's a huge pothole on Bloor Street West, right near Dufferin. Cars keep swerving around it."),
      line("assistant", "Got it. Can you confirm the exact location — is that in the eastbound or westbound curb lane?"),
      line("user", "Westbound, curb lane, just past the intersection."),
      line("assistant", "Thanks. To confirm: a deep pothole in the westbound curb lane of Bloor Street West near Dufferin, causing cars to swerve. Is that accurate?"),
      line("user", "Yes, that's right."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "water-ossington",
    category: "water",
    subtype: "water-main-break",
    title: "Water Main / Leak — Ossington Avenue",
    location: { raw: "142 Ossington Avenue" },
    summary: "A water main break on Ossington Avenue is flooding the caller's basement and the sidewalk out front.",
    priority: "critical",
    status: "assigned",
    assignee: "M. Chen",
    confidence: 0.97,
    observations: { basementFlooding: true, sidewalkFlooded: true, waterRising: true },
    callerPhone: "+14165550118",
    createdHoursAgo: 5,
    updatedHoursAgo: 3,
    durationSeconds: 71,
    messages: [
      line("assistant", OPENING),
      line("user", "There's water coming up through the sidewalk outside my building and it's flooding into my basement."),
      line("assistant", "That sounds serious. What's the address, and is the water level still rising?"),
      line("user", "142 Ossington Avenue, and yes, it's getting worse by the minute."),
      line("assistant", "Understood. Is anyone in immediate danger, or is this property damage only?"),
      line("user", "No one's hurt, just a lot of water."),
      line("assistant", "To confirm: a water main break at 142 Ossington Avenue flooding the basement and sidewalk, water still rising. Is that accurate?"),
      line("user", "Yes."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "tree-danforth-1",
    category: "tree",
    subtype: "downed-tree",
    title: "Downed Tree — Danforth Avenue near Broadview",
    location: { raw: "Danforth Avenue near Broadview Avenue" },
    summary: "A large oak tree has fallen across both lanes of Danforth Avenue near Broadview, blocking traffic in both directions.",
    priority: "high",
    status: "new",
    assignee: null,
    confidence: 0.96,
    observations: { lanesBlocked: "both", treeSize: "large", powerLinesNearby: false },
    callerPhone: "+14165550187",
    createdHoursAgo: 2,
    updatedHoursAgo: 2,
    durationSeconds: 52,
    messages: [
      line("assistant", OPENING),
      line("user", "A huge tree just came down across Danforth, right near Broadview. It's blocking both lanes."),
      line("assistant", "Are there any power lines involved, or anyone injured?"),
      line("user", "No power lines that I can see, and no one's hurt, but traffic is completely stuck."),
      line("assistant", "To confirm: a large tree down blocking both lanes of Danforth Avenue near Broadview Avenue, no power lines involved. Is that accurate?"),
      line("user", "Yes, exactly."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "dumping-queen",
    category: "dumping",
    subtype: "illegal-dumping",
    title: "Illegal Dumping — laneway off Queen Street East",
    location: { raw: "laneway off Queen Street East near Logan Avenue" },
    summary: "Construction debris and drywall have been illegally dumped in a residential laneway off Queen Street East.",
    priority: "low",
    status: "new",
    assignee: null,
    confidence: 0.85,
    observations: { materialType: "construction debris", laneBlocked: false },
    callerPhone: "+14165550163",
    createdHoursAgo: 20,
    updatedHoursAgo: 20,
    durationSeconds: 44,
    messages: [
      line("assistant", OPENING),
      line("user", "Someone dumped a pile of drywall and construction junk in the laneway behind our houses."),
      line("assistant", "Where exactly is the laneway located?"),
      line("user", "Off Queen Street East, near Logan Avenue."),
      line("assistant", "To confirm: construction debris illegally dumped in the laneway off Queen Street East near Logan Avenue. Is that accurate?"),
      line("user", "Yep, that's it."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "streetlight-college",
    category: "streetlight",
    subtype: "streetlight-outage",
    title: "Streetlight Outage — College Street and Spadina Avenue",
    location: { raw: "College Street and Spadina Avenue" },
    summary: "The streetlight at the corner of College and Spadina has been out for over a week, leaving the crosswalk dark at night.",
    priority: "medium",
    status: "in_review",
    assignee: null,
    confidence: 0.9,
    observations: { durationDays: 7, crosswalkAffected: true },
    callerPhone: "+14165550129",
    createdHoursAgo: 14,
    updatedHoursAgo: 4,
    durationSeconds: 39,
    messages: [
      line("assistant", OPENING),
      line("user", "The streetlight at College and Spadina has been out for like a week now. It's really dark crossing there at night."),
      line("assistant", "Thanks for reporting that. To confirm: the streetlight at College Street and Spadina Avenue has been out for about a week. Is that accurate?"),
      line("user", "Yes, that's right."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "noise-king",
    category: "noise",
    subtype: "construction-noise",
    title: "Noise Complaint — King Street West",
    location: { raw: "King Street West near Bathurst Street" },
    summary: "Caller reports construction noise starting before permitted hours near King Street West.",
    priority: "low",
    status: "dismissed",
    assignee: "T. Nguyen",
    confidence: 0.78,
    observations: { startTime: "6:15am", permittedStart: "7:00am" },
    callerPhone: "+14165550154",
    createdHoursAgo: 40,
    updatedHoursAgo: 36,
    durationSeconds: 47,
    messages: [
      line("assistant", OPENING),
      line("user", "There's construction happening on King Street West near Bathurst and it started way before it's supposed to."),
      line("assistant", "What time did it start this morning?"),
      line("user", "Around 6:15. I thought they weren't allowed to start before 7."),
      line("assistant", "To confirm: construction noise starting around 6:15am on King Street West near Bathurst Street, ahead of the permitted 7am start. Is that accurate?"),
      line("user", "Yes."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "graffiti-kensington",
    category: "graffiti",
    subtype: "vandalism",
    title: "Graffiti — Kensington Market community mural",
    location: { raw: "Augusta Avenue, Kensington Market" },
    summary: "A community mural on Augusta Avenue in Kensington Market has been tagged with spray-paint graffiti overnight.",
    priority: "low",
    status: "new",
    assignee: null,
    confidence: 0.88,
    observations: { targetType: "community mural", overnight: true },
    callerPhone: "+14165550176",
    createdHoursAgo: 11,
    updatedHoursAgo: 11,
    durationSeconds: 41,
    messages: [
      line("assistant", OPENING),
      line("user", "Someone spray-painted over the community mural on Augusta Avenue in Kensington Market. It happened overnight."),
      line("assistant", "To confirm: graffiti covering the community mural on Augusta Avenue in Kensington Market, done overnight. Is that accurate?"),
      line("user", "Yes, that's it."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "vehicle-runnymede",
    category: "vehicle",
    subtype: "abandoned-vehicle",
    title: "Abandoned Vehicle — Runnymede Road",
    location: { raw: "Runnymede Road near Annette Street" },
    summary: "An apparently abandoned vehicle has been parked on Runnymede Road for over two weeks, partially blocking a driveway.",
    priority: "medium",
    status: "assigned",
    assignee: "T. Nguyen",
    confidence: 0.91,
    observations: { durationDays: 15, driveWayBlocked: true },
    callerPhone: "+14165550191",
    createdHoursAgo: 60,
    updatedHoursAgo: 18,
    durationSeconds: 55,
    messages: [
      line("assistant", OPENING),
      line("user", "There's a car that's been sitting on Runnymede Road near Annette for over two weeks. It's blocking part of my driveway."),
      line("assistant", "Does it have a visible license plate, and has it moved at all in that time?"),
      line("user", "Plate's still on it, but it hasn't moved once."),
      line("assistant", "To confirm: a vehicle apparently abandoned on Runnymede Road near Annette Street for about two weeks, partially blocking a driveway. Is that accurate?"),
      line("user", "Yes."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "other-sinkhole-yonge",
    category: "other",
    subtype: "sidewalk-sinkhole",
    title: "General Issue — sinkhole on Yonge Street",
    location: { raw: "Yonge Street near Eglinton Avenue" },
    summary: "A sinkhole is forming in the sidewalk on Yonge Street near Eglinton, creating a fall hazard for pedestrians.",
    priority: "critical",
    status: "new",
    assignee: null,
    confidence: 0.89,
    observations: { hazardType: "sidewalk collapse", pedestrianTraffic: "high" },
    callerPhone: "+14165550135",
    createdHoursAgo: 1,
    updatedHoursAgo: 1,
    durationSeconds: 49,
    messages: [
      line("assistant", OPENING),
      line("user", "The sidewalk is caving in on Yonge Street near Eglinton, there's a sinkhole forming and people keep almost stepping in it."),
      line("assistant", "That sounds hazardous. Is it currently barricaded or marked off in any way?"),
      line("user", "No, nothing, it's just open."),
      line("assistant", "To confirm: an unmarked sinkhole forming in the sidewalk on Yonge Street near Eglinton Avenue, a fall hazard for pedestrians. Is that accurate?"),
      line("user", "Yes, exactly."),
      line("assistant", CLOSING),
    ],
  },
];

// --- Duplicate callers reporting the same downed tree, to populate "linked calls". ---
const DUPLICATES = [
  {
    id: "tree-danforth-2",
    linkedTo: "tree-danforth-1",
    createdHoursAgo: 1.6,
    durationSeconds: 33,
    callerPhone: "+14165550202",
    summary: "A second caller also reports a large tree down blocking Danforth Avenue near Broadview.",
    messages: [
      line("assistant", OPENING),
      line("user", "There's a big tree blocking Danforth Avenue near Broadview, both lanes are stuck."),
      line("assistant", "Thanks, we already have a report of a downed tree at that location. To confirm the location: Danforth Avenue near Broadview Avenue?"),
      line("user", "Yes, that's the spot."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "tree-danforth-3",
    linkedTo: "tree-danforth-1",
    createdHoursAgo: 1.1,
    durationSeconds: 28,
    callerPhone: "+14165550219",
    summary: "A third caller reports the same downed tree on Danforth Avenue, noting traffic is backing up badly.",
    messages: [
      line("assistant", OPENING),
      line("user", "Traffic is backed up all the way past Chester because of a tree down on Danforth by Broadview."),
      line("assistant", "Thanks for the update — we have that report already. Anything new, like the tree touching any wires?"),
      line("user", "Doesn't look like it, just blocking the road."),
      line("assistant", CLOSING),
    ],
  },
];

// --- Informational calls: no incident created. ---
const INFO_CALLS = [
  {
    id: "info-hours-scarborough",
    createdHoursAgo: 8,
    durationSeconds: 26,
    callerPhone: "+14165550147",
    category: "other",
    subtype: "hours-inquiry",
    summary: "Caller asked for the Scarborough Civic Centre's weekend hours.",
    confidence: 0.8,
    observations: { topic: "facility hours" },
    messages: [
      line("assistant", OPENING),
      line("user", "Hi, what are the hours for the Scarborough Civic Centre this weekend?"),
      line("assistant", "I'm not able to look up live facility hours, but you can find current weekend hours on the City of Toronto's civic centre listings. Is there anything else municipal I can help report?"),
      line("user", "No, that's all, thanks."),
      line("assistant", CLOSING),
    ],
  },
  {
    id: "info-bulk-pickup",
    createdHoursAgo: 3.5,
    durationSeconds: 31,
    callerPhone: "+14165550158",
    category: "other",
    subtype: "collection-schedule",
    summary: "Caller asked how to schedule a bulk item pickup for next month.",
    confidence: 0.82,
    observations: { topic: "bulk item pickup" },
    messages: [
      line("assistant", OPENING),
      line("user", "How do I schedule a bulk item pickup for next month? I've got an old couch to get rid of."),
      line("assistant", "I can't schedule pickups directly, but that's handled through the City's waste collection scheduling service. Is there a specific issue you'd like me to log instead?"),
      line("user", "No, just wanted to know. Thanks."),
      line("assistant", CLOSING),
    ],
  },
];

// --- Escalated call: assistant hands off to 911, no incident is created. ---
const ESCALATED_CALL = {
  id: "escalated-gas-leak",
  createdHoursAgo: 16,
  durationSeconds: 22,
  callerPhone: "+14165550171",
  category: "other",
  subtype: "emergency-escalation",
  summary: "Caller reported the smell of gas inside their home; escalated to 911 per safety protocol.",
  confidence: 0.6,
  observations: { escalated: true },
  messages: [
    line("assistant", OPENING),
    line("user", "I smell gas really strongly inside my house, I don't know what to do."),
    line("assistant", "This may be an emergency. Please hang up and call 911 now. I cannot contact 911 for you."),
    line("user", "Okay, calling them now."),
  ],
};

function check(error) {
  if (error) throw new Error(error.message);
}

async function clearSeedData() {
  const existing = await supabase.from("calls").select("id").like("external_call_id", `${SEED_PREFIX}%`);
  check(existing.error);
  if (!existing.data.length) {
    console.log("No seed data to clear.");
    return;
  }
  const deleted = await supabase.from("calls").delete().like("external_call_id", `${SEED_PREFIX}%`);
  check(deleted.error);
  console.log(`Cleared ${existing.data.length} seed call(s) and their linked incidents.`);
}

async function insertIncidentCall(scenario) {
  const createdAt = hoursAgo(scenario.createdHoursAgo);
  const updatedAt = hoursAgo(scenario.updatedHoursAgo);

  const insertedCall = await supabase
    .from("calls")
    .insert({
      external_call_id: `${SEED_PREFIX}${scenario.id}`,
      transcript: transcriptOf(scenario.messages),
      messages: scenario.messages,
      caller_phone: scenario.callerPhone,
      started_at: createdAt,
      duration_seconds: scenario.durationSeconds,
      provider: "seed",
      provider_status: "ended",
      ended_reason: "assistant-said-end-call-phrase",
      received_at: createdAt,
      processing_status: "processing",
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select("id")
    .single();
  check(insertedCall.error);
  const callId = insertedCall.data.id;

  const report = {
    intent: "Report a municipal issue",
    category: scenario.category,
    subtype: scenario.subtype,
    summary: scenario.summary,
    actionable: true,
    confidence: scenario.confidence,
    location: scenario.location,
    observations: scenario.observations,
  };

  const insertedIncident = await supabase
    .from("incidents")
    .insert({
      call_id: callId,
      status: scenario.status,
      title: scenario.title,
      category: scenario.category,
      subtype: scenario.subtype,
      summary: scenario.summary,
      priority: scenario.priority,
      assignee: scenario.assignee,
      location: scenario.location,
      observations: scenario.observations,
      confidence: scenario.confidence,
      created_at: createdAt,
      updated_at: updatedAt,
    })
    .select("id")
    .single();
  check(insertedIncident.error);
  const incidentId = insertedIncident.data.id;

  const updatedCall = await supabase
    .from("calls")
    .update({ report, record_type: "incident", incident_id: incidentId, processing_status: "processed" })
    .eq("id", callId);
  check(updatedCall.error);

  return incidentId;
}

async function insertDuplicateCall(scenario, incidentIdByKey) {
  const incidentId = incidentIdByKey.get(scenario.linkedTo);
  if (!incidentId) throw new Error(`Unknown linkedTo key: ${scenario.linkedTo}`);
  const createdAt = hoursAgo(scenario.createdHoursAgo);

  const primary = INCIDENTS.find((i) => i.id === scenario.linkedTo);
  const report = {
    intent: "Report a municipal issue",
    category: primary.category,
    subtype: primary.subtype,
    summary: scenario.summary,
    actionable: true,
    confidence: 0.9,
    location: primary.location,
    observations: { duplicateOf: primary.id },
  };

  const inserted = await supabase.from("calls").insert({
    external_call_id: `${SEED_PREFIX}${scenario.id}`,
    transcript: transcriptOf(scenario.messages),
    messages: scenario.messages,
    caller_phone: scenario.callerPhone,
    started_at: createdAt,
    duration_seconds: scenario.durationSeconds,
    provider: "seed",
    provider_status: "ended",
    ended_reason: "assistant-said-end-call-phrase",
    received_at: createdAt,
    report,
    record_type: "incident",
    incident_id: incidentId,
    processing_status: "processed",
    created_at: createdAt,
    updated_at: createdAt,
  });
  check(inserted.error);
}

async function insertInfoCall(scenario) {
  const createdAt = hoursAgo(scenario.createdHoursAgo);
  const report = {
    intent: "Request general information",
    category: scenario.category,
    subtype: scenario.subtype,
    summary: scenario.summary,
    actionable: false,
    confidence: scenario.confidence,
    location: { raw: "" },
    observations: scenario.observations,
  };

  const inserted = await supabase.from("calls").insert({
    external_call_id: `${SEED_PREFIX}${scenario.id}`,
    transcript: transcriptOf(scenario.messages),
    messages: scenario.messages,
    caller_phone: scenario.callerPhone,
    started_at: createdAt,
    duration_seconds: scenario.durationSeconds,
    provider: "seed",
    provider_status: "ended",
    ended_reason: "assistant-said-end-call-phrase",
    received_at: createdAt,
    report,
    record_type: "information",
    processing_status: "processed",
    created_at: createdAt,
    updated_at: createdAt,
  });
  check(inserted.error);
}

async function seed() {
  await clearSeedData();

  const incidentIdByKey = new Map();
  for (const scenario of INCIDENTS) {
    const incidentId = await insertIncidentCall(scenario);
    incidentIdByKey.set(scenario.id, incidentId);
    console.log(`+ incident  ${scenario.category.padEnd(11)} ${scenario.title}`);
  }

  for (const scenario of DUPLICATES) {
    await insertDuplicateCall(scenario, incidentIdByKey);
    console.log(`+ duplicate call linked to "${scenario.linkedTo}"`);
  }

  for (const scenario of INFO_CALLS) {
    await insertInfoCall(scenario);
    console.log(`+ info call ${scenario.id}`);
  }

  await insertInfoCall(ESCALATED_CALL);
  console.log(`+ escalated call ${ESCALATED_CALL.id}`);

  const totalCalls = INCIDENTS.length + DUPLICATES.length + INFO_CALLS.length + 1;
  console.log(`\nSeeded ${INCIDENTS.length} incidents across ${new Set(INCIDENTS.map((i) => i.category)).size} categories and ${totalCalls} calls total.`);
}

const clearOnly = process.argv.includes("--clear");

try {
  if (clearOnly) {
    await clearSeedData();
  } else {
    await seed();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

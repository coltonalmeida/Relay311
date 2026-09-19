# Handoff: Relay311 Operator Dashboard — "Clarity Desk" concept (1b)

## Overview
Relay311 is an AI-powered 311 voice intake system (Vapi-based). This is the **operator dashboard**: the internal tool city operators use to review incoming calls, review AI-generated incident reports, and approve/merge/dismiss them. This package covers the chosen concept, "Clarity Desk" (option 1b) — a calm, top-nav, card-based layout.

## About the Design Files
The bundled file `Relay311 Concepts (reference).dc.html` is a **design reference built in HTML**, not production code. It contains two concept explorations; **only look at option `1b` ("Clarity Desk")** — ignore `1a` ("Command Console"), which was not selected. Open the file in a browser to see it live and click through screens (the nav/tabs, map pins, and incident list rows are functional in the mock).

Your task is to **recreate the 1b design in the target codebase's existing stack** — this project is `coltonalmeida/Relay311`, a Next.js app (App Router, TypeScript) that already uses Tailwind CSS (`@import "tailwindcss"` in `src/app/globals.css`) and has a `POST /api/vapi/webhook` route plus a transcript-storage layer (`src/lib/transcripts.ts`). Build the dashboard as new routes/components inside that app using Tailwind + React, not by copying the HTML file as-is.

## Fidelity
**High-fidelity.** Colors, type, spacing, and copy in the mock are final-intent — recreate them pixel-close. Layout numbers below (widths, paddings, radii) come directly from the mock's inline styles.

## Design Tokens

**Colors**
- Ink (text/dark surfaces): `#14231f`
- Cream (page background): `#f6f2e9`
- Paper (card background): `#fffdf8`
- Signal orange (brand/primary action, critical accents): `#ff5c35`
- Mint/green (positive/success accents): `#b8efc7`, text green `#397554`
- Hairline borders: `rgba(20,35,31,.10)` / `.06` on cards
- Card shadow: `0 1px 2px rgba(20,35,31,.06)` (resting), hero call card `0 8px 30px -10px rgba(20,35,31,.2)`
- Status/priority badges use **oklch** pairs of (light background, dark text) at a shared lightness/chroma per semantic hue — reuse this pattern for any new badge rather than inventing new colors:
  - Priority — Critical: bg `oklch(93% 0.06 25)` / fg `oklch(38% 0.17 25)` / dot `oklch(52% 0.19 25)`
  - Priority — High: bg `oklch(94% 0.05 35)` / fg `oklch(40% 0.15 35)` / dot `#ff5c35`
  - Priority — Medium: bg `oklch(95% 0.05 80)` / fg `oklch(42% 0.12 80)` / dot `oklch(72% 0.14 80)`
  - Priority — Low: bg `oklch(95% 0.01 220)` / fg `oklch(42% 0.02 220)` / dot `oklch(60% 0.02 220)`
  - Status — New: bg `oklch(94% 0.04 250)` / fg `oklch(40% 0.13 250)`
  - Status — In Review: bg `oklch(95% 0.05 90)` / fg `oklch(42% 0.12 90)`
  - Status — Assigned: bg `oklch(94% 0.05 300)` / fg `oklch(42% 0.12 300)`
  - Status — Resolved: bg `oklch(94% 0.05 150)` / fg `oklch(38% 0.12 150)`
  - Status — Dismissed: bg `oklch(95% 0.01 250)` / fg `oklch(45% 0.02 250)`
  - Category chips: bg `oklch(92% 0.05 H)` / fg `oklch(32% 0.1 H)` where H is a per-category hue (pothole 25, water 220, tree 140, dumping 280, streetlight 80, noise 340, graffiti 190, vehicle 260)
  - Call outcome — Linked: same as Status Resolved greens; No action: Status Dismissed grays; Escalated: Priority Critical reds

**Typography**
- Sans: `Inter` (400/500/600/700/800) — all UI text
- Mono: `JetBrains Mono` (400/500/700) — IDs, timestamps, labels like "LIVE CALL · 00:47", small uppercase kickers
- Headings: incident title ~24px/700, page greeting ~20px/700, both `letter-spacing:-.01em`
- Body copy: 13–15px/1.5–1.6
- Small caps kickers (e.g. "AI-GENERATED SUMMARY"): 10–11px/700, `letter-spacing:.06em–.08em`, uppercase

**Radii / shape**
- Cards: 14–16px
- Pills/badges: full pill (`border-radius:20px`) or 6–8px small badges
- Buttons: 8–10px

**Spacing**
- Page padding: 28px 32px inside the cream content area
- Card padding: 16–22px
- Grid gaps: 14–16px

## Screens

### 1. Home
**Purpose:** operator's landing view — situational awareness across the city.
**Layout:** top nav (see Navigation below) → cream content area, padded 28px/32px:
1. Greeting line ("Good morning — here's what's happening across the city") + date/calls-today subline.
2. 4-column stat grid (`grid-template-columns: repeat(4,1fr)`, gap 14px), each a white rounded-14 card: small label (11px/600 gray `#78827f`) + big number (26px/800 ink; "AI auto-resolved" number in green `#397554`). Metrics: Open incidents, Calls today, Avg response, AI auto-resolved.
3. **Map + incident list row** (this is the primary/dominant element per the latest revision), fixed height ~520px, flex row gap 16px:
   - Left card, flex 1.7: "City map — click a hotspot for details" header + open count. Body is a full-bleed placeholder map (diagonal-stripe pattern background — swap for a real map/tile layer) with a colored dot **hotspot per incident**, positioned by `left%/top%` (replace with real lat/lng → projected x/y). Each hotspot is clickable and navigates straight to that incident's Detail screen. Priority color legend row below the map (Critical/High/Medium/Low dot + label).
   - Right card, flex 1: "Incident list" — a scrollable list of compact incident rows (title + priority dot, location, incident ID + status pill). Each row is clickable and also opens Detail. This list and the map hotspots represent the **same data** and both drive navigation to Detail — keep them in sync (e.g. hovering/selecting one could highlight the other, though the mock only wires click-through).

### 2. Incidents (Queue)
**Purpose:** full triage list, filterable by status.
**Layout:** segmented control (All / Open / Resolved) top-left in a pill-shaped gray track (`#e7ede9`, radius 24, active segment white); search input top-right (240×34px). Below: vertical stack of incident **cards** (not a table), gap 10px, each: 34×34 rounded-10 category avatar (2-letter initials) + title/location/ID + priority pill + status pill + "N linked" pill + chevron. Entire card is clickable → Detail.

### 3. Incident Detail
**Purpose:** review one incident and act on it (Approve / Merge / Dismiss).
**Layout:** single column, `max-width:860px`, centered.
- "← Back to incidents" link (orange, 11.5px/600).
- Incident ID (mono, gray) → Title (24px/700) → priority/status/category badge row (pill badges, priority pill includes a colored dot).
- Action row: **Approve** (solid ink button), **Merge duplicates** (outline button), **Dismiss** (text-style destructive, red `#b5352a`).
- Sub-tabs (underline style, orange active indicator): **Summary / Details / Transcript & duplicates / Activity** — only one panel visible at a time.
  - *Summary*: AI-generated summary paragraph (15px/1.6) in a white card, kicker "AI-GENERATED SUMMARY" in green.
  - *Details*: 2-column grid of extracted fields (label 11px uppercase gray, value 14px/500 ink) — e.g. Category, Location, Reported hazard, First reported.
  - *Transcript & duplicates*: transcript lines (role label in mono uppercase, colored: caller green, assistant orange; message text below), plus a "Linked calls (auto-grouped duplicates)" card listing each linked call's ID/time/duration — this is where duplicate call records that got auto-grouped into this one incident are surfaced.
  - *Activity*: timeline list of system/operator events (green dot + text), e.g. "Report received via AI intake", "AI created incident, priority set to…", "Operator review in progress".

### 4. Calls & History
**Purpose:** every phone call is logged here — the full record, whether or not it became an incident.
**Layout:** `max-width:920px` centered. Vertical timeline (2px line down the left, colored dot per row = outcome color) of call cards: Call ID (mono) + time/duration top row, AI-summarized issue text, outcome pill (Linked to incident **[INC-ID]** / No action needed / Escalated to 911).

### 5. Live Call (Vapi demo)
**Purpose:** real-time monitoring of an in-progress AI intake call — the centerpiece Vapi demo.
**Layout:** single centered call card, `max-width:680px`, white, radius 20, elevated shadow.
- Header: pulsing red status dot + "Live call · 00:47" + masked caller number.
- Waveform: 16 thin animated bars (height keyframe `r311-bar`, staggered `animation-delay`), on a `#e7ede9` strip.
- Scrolling transcript (role-colored, same styling as Detail's transcript) with a "transcribing…" blinking indicator on the last (in-progress) line.
- Row of pill chips showing **live AI-extracted fields** (e.g. "Category: Downed Tree", "Location: …", "Hazard: …") — these should populate/update as the call progresses.
- Duplicate-check alert (amber card): "⚠ Possible duplicate of INC-2227 — will auto-link on call end."
- Footer buttons: **End Call** (solid orange), **Escalate to 911 line** (outline).

## Navigation (shared chrome, all screens)
Top bar, white, bottom hairline border, 64px tall: left = 28×28 ink logo mark ("R3" in mint mono) + "Relay311" wordmark, then 4 tab links (Home / Incidents / Calls / Live Call) as text with a 2px bottom-border indicator (orange when active, transparent otherwise, text ink when active / gray `#78827f` otherwise). Right side: green "● N live" indicator + operator avatar circle (initials).

## Interactions & Behavior
- Nav tabs, sub-tabs, and the status segmented control are simple state switches (active tab/segment determines which panel renders) — no page reload.
- Clicking a map hotspot OR an incident-list row OR a queue card all do the same thing: select that incident and switch to the Detail screen scoped to it.
- "← Back to incidents" returns to the Incidents (Queue) screen.
- Approve / Merge / Dismiss are the three operator actions on an incident (wire to real mutations — this mock only demos the visual affordance, no confirmation modal is designed yet).
- Live Call fields and transcript should be driven by the real Vapi webhook/transcript pipeline (`src/lib/transcripts.ts`, `POST /api/vapi/webhook`) — treat the mock's static content as the target shape, not literal copy.

## State Management (for the recreation)
- Active nav tab (`home | queue | detail | calls | live`)
- Active detail sub-tab (`summary | details | transcript | activity`)
- Selected incident id (drives Detail screen content)
- Queue status filter (`all | new | resolved` or your fuller status enum)
- Incident list: id, category, title, location, priority, status, linkedCallCount, updatedAt, assignee, map coordinates
- Call record list: id, time, duration, caller (masked), AI-issue-summary, outcome (`linked | none | escalated`), linkedIncidentId
- Live call: elapsed time, transcript messages (role + text, streaming), live-extracted fields, duplicate-match candidate

## Assets
No real imagery used — the map is a CSS diagonal-stripe placeholder (swap for a real map tile/vector layer); category "icons" are 2-letter monogram avatars (swap for real icons if desired). Fonts are Google Fonts `Inter` and `JetBrains Mono` (already linked via `<link>` in the reference file's `<head>`).

## Files
- `Relay311 Concepts (reference).dc.html` — the design reference. Contains both concepts (`1a` and `1b`); build from **1b only**.

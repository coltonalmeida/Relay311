# Relay311 Backend Test Guide

These commands assume the backend is running at `http://localhost:3000`.

Start it from the repository root:

```powershell
npm.cmd run dev
```

Open a second PowerShell window for the commands below.

## Gemini mode

Add your Gemini API key to the root `.env` and rerun `supabase/schema.sql` before
testing the real classifier:

```dotenv
GEMINI_API_KEY=your-real-key
TRANSCRIPT_PROCESSOR=gemini
GEMINI_MODEL=gemini-3.5-flash-lite
```

Restart the backend after changing `.env`. To test without making Gemini API
calls, set `TRANSCRIPT_PROCESSOR=mock` instead. In Gemini mode, summaries,
locations, categories, subtypes, observations, and confidence values will be
model-generated and may differ slightly between runs.

## 1. Submit an actionable pothole call

```powershell
$potholeBody = @{
  externalCallId = "manual-pothole-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  transcript = "There is a large dangerous pothole in the eastbound lane outside 123 Main Street. Cars are swerving to avoid it."
  startedAt = (Get-Date).ToUniversalTime().ToString("o")
  durationSeconds = 52
} | ConvertTo-Json

$potholeResult = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/calls" `
  -ContentType "application/json" `
  -Body $potholeBody

$potholeResult | ConvertTo-Json -Depth 10
```

Expected:

- `call.recordType` is `incident`
- `call.report.actionable` is `true`
- `call.report.category` is `roads`
- `incident.status` is `pending`

## 2. Submit an informational call

```powershell
$hoursBody = @{
  externalCallId = "manual-hours-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  transcript = "What time does city hall open on Saturday?"
} | ConvertTo-Json

$hoursResult = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/calls" `
  -ContentType "application/json" `
  -Body $hoursBody

$hoursResult | ConvertTo-Json -Depth 10
```

Expected:

- `call.recordType` is `information`
- `call.report.actionable` is `false`
- `incident` is `null`

## 3. Try additional mock calls

Water issue:

```powershell
$body = @{
  externalCallId = "manual-water-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  transcript = "A water main is leaking and flooding the intersection at King Street and Bay Street."
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/calls" -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 10
```

Streetlight outage:

```powershell
$body = @{
  externalCallId = "manual-light-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  transcript = "The streetlight outside 88 Queen Street is broken and the block is very dark."
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/calls" -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 10
```

Another informational question:

```powershell
$body = @{
  externalCallId = "manual-parking-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  transcript = "How much does downtown parking cost on Sundays?"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/calls" -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 10
```

## 4. List all calls and incidents

```powershell
$calls = Invoke-RestMethod "http://localhost:3000/api/calls"
$incidents = Invoke-RestMethod "http://localhost:3000/api/incidents"

$calls | ConvertTo-Json -Depth 10
$incidents | ConvertTo-Json -Depth 10
```

Quick table views:

```powershell
$calls | Select-Object externalCallId, recordType, processingStatus, createdAt | Format-Table
$incidents | Select-Object id, category, status, summary | Format-Table
```

## 5. Fetch one call or incident

These examples use the pothole result created in step 1.

```powershell
Invoke-RestMethod "http://localhost:3000/api/calls/$($potholeResult.call.id)" |
  ConvertTo-Json -Depth 10

Invoke-RestMethod "http://localhost:3000/api/incidents/$($potholeResult.incident.id)" |
  ConvertTo-Json -Depth 10
```

## 6. Approve an incident

```powershell
$approved = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/incidents/$($potholeResult.incident.id)/approve"

$approved | ConvertTo-Json -Depth 10
```

Expected: `status` is `approved`.

## 7. Dismiss a pending incident

This dismisses the first pending incident returned by the API.

```powershell
$pendingIncident = Invoke-RestMethod "http://localhost:3000/api/incidents" |
  Where-Object { $_.status -eq "pending" } |
  Select-Object -First 1

if ($pendingIncident) {
  Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:3000/api/incidents/$($pendingIncident.id)/dismiss" |
    ConvertTo-Json -Depth 10
} else {
  Write-Output "No pending incident was found. Submit another actionable call first."
}
```

Expected: `status` is `dismissed`.

## 8. Test validation errors

Missing transcript:

```powershell
$invalidBody = @{ externalCallId = "invalid-call" } | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/calls" -ContentType "application/json" -Body $invalidBody
} catch {
  $_.ErrorDetails.Message
}
```

Invalid call ID in a URL:

```powershell
try {
  Invoke-RestMethod "http://localhost:3000/api/calls/not-a-uuid"
} catch {
  $_.ErrorDetails.Message
}
```

Both should return HTTP 400 validation responses.

## 9. Test duplicate external call IDs

`externalCallId` is unique. The second request should fail instead of creating a duplicate call.

```powershell
$duplicateId = "manual-duplicate-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$duplicateBody = @{
  externalCallId = $duplicateId
  transcript = "There is a pothole on Main Street."
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/calls" -ContentType "application/json" -Body $duplicateBody

try {
  Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/calls" -ContentType "application/json" -Body $duplicateBody
} catch {
  $_.ErrorDetails.Message
}
```

## Automated checks

Run the backend type-check, tests, and build:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Run the frontend production build:

```powershell
cd client
npm.cmd run build
```

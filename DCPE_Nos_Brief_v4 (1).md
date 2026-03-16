# DCPE Control Panel — Developer Integration Brief
**v4.0** | Updated: 2026-03-11 | For: Nos | From: Stephen

---

## 🏆 Buidl Battle #2 — Stacks Ecosystem Hackathon
March 2–20, 2026 | DoraHacks | $20,000 total prize pool
DeOrganized Media hackathon submission. Split: 50/50 on all winnings.

### Bounties We Are Targeting
| Bounty | Prize | Notes |
|--------|-------|-------|
| USDCx Payments | $3,000 | x402 subscription flow — creators pay in USDCx to activate a channel |
| x402 Agent Commerce | $3,000 | AI agent pays DCPE via x402 to provision and run a channel autonomously |
| sBTC Integration | $3,000 | POSSIBLE — add sBTC as payment option. Build payment UI for multiple options. |
| Main Prize Pool | $6K/$3K/$2K | 1st / 2nd / 3rd place overall |

### 18-Day Sprint
| Days | Phase | Nos Deliverable |
|------|-------|----------------|
| 1–3 | Align & Setup | Review brief, set up Django endpoints, confirm ops.html loads |
| 4–7 | Payment Layer | Payment UI scaffolding — multi-option design (USDCx + optional sBTC) |
| 8–12 | Product Build | Full control panel functional — queue, advance, mode switching, stream control |
| 13–16 | Integration | Connect to live DCPE, test end-to-end with Stephen |
| 17–18 | Submit | Polish, demo recording, DoraHacks submission |

> ℹ️ DoraHacks team invite: Register on dorahacks.io now. Stephen will send the team invite link once the project is created on the platform.

---

## Overview

We are building a browser-based production control panel for the DCPE (DeOrganized Continuous Playout Engine), a Railway-hosted service that syncs video content from Google Drive, encodes it, and streams it live via RTMP to Restream.

The control panel lets the production team:
- Switch engine modes (PREP / PLAYOUT / REMOVE) — triggers Railway redeployment
- Start and stop the RTMP stream without redeploying
- Manage a dynamic run-order queue of playlists
- Advance through content during a live show

> ℹ️ **Architecture:** The browser never talks directly to DCPE or Railway. The browser calls Django, Django proxies to DCPE. The Railway API token and DCPE_API_KEY never reach the browser. Auth lives entirely in Django.

> ℹ️ **Single-tenant MVP:** This hackathon version controls one DCPE instance. Multi-tenant job isolation (per-creator services) is post-hackathon.

---

## How The Two Services Connect

| Service | Role |
|---------|------|
| deorganized-playout (DCPE) | Syncs Drive, encodes video, builds playlists, streams RTMP. Exposes HTTP API on port 8080. |
| Django backend (website) | Serves control panel UI. Proxies all API calls server-side. Holds Railway token and DCPE_API_KEY. Handles auth. |

```
Browser → POST /ops/set-playlist/ → Django view
Django  → POST http://dcpe-internal/api/set-playlist/ → DCPE service
DCPE    → rewrites playlist.ffconcat → playout.sh picks it up on next advance
DCPE    → returns JSON → Django returns JSON → Browser updates UI
```

For mode switching (PREP / PLAYOUT / REMOVE):
```
Browser → POST /ops/set-mode/ → Django view
Django  → Railway GraphQL API (with retry/backoff) → updates MODE + triggers redeploy
```

For stream start/stop (no redeploy — immediate):
```
Browser → POST /ops/stream-start/ → Django view
Django  → POST http://dcpe-internal/api/stream-start/ → DCPE service
DCPE    → writes /app/streaming_enabled flag → playout.sh launches ffmpeg within 10s
```

---

## What Nos Needs to Build (Django Side)

### 1. Environment Variables to Add

| Variable | Value / Notes |
|----------|--------------|
| DCPE_INTERNAL_URL | `http://deorganized-playout.railway.internal` — internal Railway URL of DCPE |
| DCPE_API_KEY | Shared secret — Stephen will provide. Sent as `Authorization: Bearer <key>` to DCPE. | 
DCPE_API_KEY D448Fiqbg4ub76eduEK1ecApI4MRyLZv 
| RAILWAY_API_TOKEN | Already required — used for PREP/PLAYOUT/REMOVE mode switching |
| RAILWAY_PROJECT_ID | `ed918291-77dc-4d8d-9435-9e441c99d9f0` |
| RAILWAY_SERVICE_ID | `18d06110-eecd-4de5-9ac3-5613c0e951e9` |
| RAILWAY_ENV_ID | `c73d3e24-f8f0-4d56-a9bc-7d8b3bf89e1a` |

### 2. Proxy Endpoints to Add

Add these to `api/views_ops.py`. All DCPE calls include the Authorization header:

```python
DCPE_HEADERS = lambda: {"Authorization": f"Bearer {os.environ.get('DCPE_API_KEY', '')}"}
```

#### Already implemented (existing)

**GET /ops/health/**
```python
resp = requests.get(f"{DCPE}/health", headers=DCPE_HEADERS(), timeout=5)
```

**GET /ops/playlists/**
Returns playlist list from DCPE. Response shape: `{ "playlists": [{id, name, folder, track_count}] }`
```python
resp = requests.get(f"{DCPE}/api/playlists/", headers=DCPE_HEADERS(), timeout=10)
```

**POST /ops/set-playlist/**
UI sends `{ playlist_id }`. Forward as-is to DCPE.
```python
body = json.loads(request.body)
resp = requests.post(f"{DCPE}/api/set-playlist/", json=body, headers=DCPE_HEADERS(), timeout=10)
```

**POST /ops/advance/**
Swaps playlist and restarts stream. Expect 2–5 second stream gap — this is normal.
```python
resp = requests.post(f"{DCPE}/api/advance/", headers=DCPE_HEADERS(), timeout=10)
```

**POST /ops/set-mode/** (Railway GraphQL)
Updates MODE variable in Railway and triggers redeploy. Implement with retry/backoff — Railway redeploys take 30–90 seconds. Return immediately and let the client poll `/ops/status/` for deploy state.

**POST /ops/remove/** (Railway GraphQL)
Query deployments → find active → call `deploymentRemove` mutation.

**GET /ops/status/** (extend existing)
Extend existing `ops_status` to also fetch DCPE status. Merge Railway deployment state with DCPE service state:
```python
dcpe_resp = requests.get(f"{DCPE}/api/status/", headers=DCPE_HEADERS(), timeout=5).json()
return JsonResponse({
    "mode": mode,                                          # from Railway
    "deployment": latest,                                  # from Railway
    "playlist_loaded": dcpe_resp.get("playlist_loaded"),
    "now_playing": dcpe_resp.get("now_playing"),
    "rtmp_connected": dcpe_resp.get("rtmp_connected"),
    "streaming_enabled": dcpe_resp.get("streaming_enabled"),  # NEW in v4
    "last_error": dcpe_resp.get("last_error"),
})
```

#### New in v4 — needs to be added

**POST /ops/stream-start/**
Opens the RTMP feed without redeploying. Operator must have Restream Studio open first.
```python
resp = requests.post(f"{DCPE}/api/stream-start/", headers=DCPE_HEADERS(), timeout=10)
return JsonResponse(resp.json())
# Returns: {"ok": true, "streaming": true}
```

**POST /ops/stream-stop/**
Kills the active ffmpeg feed immediately. Service stays deployed and waiting.
```python
resp = requests.post(f"{DCPE}/api/stream-stop/", headers=DCPE_HEADERS(), timeout=10)
return JsonResponse(resp.json())
# Returns: {"ok": true, "streaming": false}
```

### 3. URL Routes

```python
path('ops/health/',         views_ops.ops_health,         name='ops_health'),
path('ops/playlists/',      views_ops.ops_playlists,      name='ops_playlists'),
path('ops/set-playlist/',   views_ops.ops_set_playlist,   name='ops_set_playlist'),
path('ops/advance/',        views_ops.ops_advance,        name='ops_advance'),
path('ops/stream-start/',   views_ops.ops_stream_start,   name='ops_stream_start'),   # NEW
path('ops/stream-stop/',    views_ops.ops_stream_stop,    name='ops_stream_stop'),    # NEW
# Existing: ops/, ops/set-mode/, ops/remove/, ops/status/
```

### 4. The HTML Template

Drop `ops.html` (in the deorganized-docs/DCPE/ folder) into `api/templates/ops.html`. It already calls all Django URLs above with the correct payload shapes and includes the new Start Stream / Stop Stream buttons.

> ⚠️ **CSRF:** Ensure Django sets the `csrftoken` cookie on the `/ops/` view. The control panel reads it for all POST requests. Silent failures will occur if missing.

> ⚠️ The `DEMO_PLAYLISTS` array in ops.html is placeholder data shown while the API is not connected. Once `/ops/playlists/` is wired, real folders appear automatically.

> ⚠️ Queue order is browser-only for this MVP — it is lost on page refresh. Queue persistence moves to Django in a post-hackathon iteration.

---

## /api/status/ Response Schema

```json
{
  "status": "ok",
  "mode": "playout",
  "playlist_loaded": true,
  "now_playing": "pre_show",
  "rtmp_connected": true,
  "streaming_enabled": true,
  "last_prep_at": "2026-03-05T15:04:00Z",
  "last_error": null
}
```

Key fields for the ops UI:
- `streaming_enabled` — whether the stream-enable flag is present; ffmpeg launches when true
- `rtmp_connected` — whether ffmpeg process is currently running
- `now_playing` — active folder slug
- `playlist_loaded` — whether playlist.ffconcat exists and has content

---

## /api/playlists/ Response Schema

```json
{
  "playlists": [
    { "id": "pre_show",   "name": "Pre-Show",   "folder": "pre_show",   "track_count": 6 },
    { "id": "sip_shows",  "name": "SIP Shows",  "folder": "sip_shows",  "track_count": 3 }
  ]
}
```

---

## Operator Workflow (what the ops UI supports)

### Starting a stream
1. Operator opens Restream Studio in browser
2. Operator clicks **Start Stream** in ops UI → Django calls `POST /ops/stream-start/`
3. DCPE writes flag → playout.sh launches ffmpeg within 10s
4. Feed begins pushing to Restream Studio RTMP endpoint

### Stopping a stream
1. Operator clicks **Stop Stream** → Django calls `POST /ops/stream-stop/`
2. DCPE removes flag + kills ffmpeg immediately
3. playout.sh enters silent wait — service stays deployed, no retries

### Switching playlist mid-stream
1. Operator selects a folder from the library → Django calls `POST /ops/set-playlist/`
2. playlist.ffconcat is atomically rewritten
3. Operator clicks **Next** (advance) → Django calls `POST /ops/advance/`
4. ffmpeg is killed → playout.sh restarts with new playlist from top
5. Expect 2–5 second stream gap — normal behavior

### Recovery after unexpected stream drop
1. Reopen Restream Studio
2. Use set-playlist to select a folder close to where the stream left off
3. Call stream-start — ffmpeg launches from beginning of selected playlist
4. File ordering within folders is controlled by filename prefix (e.g. `01_`, `02_`)

### Changing mode (prep vs playout)
1. Ops UI calls `POST /ops/set-mode/` with `{"mode": "prep"}` or `{"mode": "playout"}`
2. Django calls Railway GraphQL to upsert the MODE variable and trigger redeploy
3. Deployment takes ~60s — ops UI should show DEPLOYING state during this time
4. In playout mode, the service waits for a stream-start signal before pushing RTMP

> ℹ️ **Important:** Switching to playout mode does NOT automatically start the stream. The operator must separately call stream-start after the deployment completes and Restream Studio is open.

---

## What Stephen Is Building (DCPE Side)

Context only — Nos does not build this.

### DCPE API Endpoints (v2.2)

| Endpoint | Method | What it does |
|----------|--------|-------------|
| /health | GET | Returns `{status, version, timestamp}` |
| /api/status/ | GET | Full service status including `streaming_enabled` |
| /api/playlists/ | GET | Folder list with real track counts from manifest |
| /api/tracks/ | GET | Raw .ts filenames with folder mapping — diagnostic |
| /api/set-playlist/ | POST | Accepts `{playlist_id}` — rewrites playlist.ffconcat |
| /api/advance/ | POST | Kills ffmpeg → restart loop picks up current playlist |
| /api/stream-start/ | POST | Writes /app/streaming_enabled flag — ffmpeg starts within 10s |
| /api/stream-stop/ | POST | Removes flag + kills ffmpeg — playout.sh waits silently |
| /api/feed-status/ | GET | Heartbeat-based stale feed detection |

### Playlist Source of Truth
Available playlists come from Drive subfolders listed in `RCLONE_FOLDERS` in Railway. Whatever folders exist = available playlists. No code changes needed when folders change — add a folder to Drive, update RCLONE_FOLDERS, run PREP, it appears in the control panel automatically.

### Advance Semantics
Advance = swap playlist file + kill ffmpeg. There is a 2–5 second stream gap while ffmpeg restarts and reconnects to Restream. This is expected in the current architecture. Cursor-based skip with no gap is planned for v3.

### Stream Start/Stop Semantics
Stream-start writes a flag file that playout.sh polls every 10s. No redeployment involved. Stream-stop removes the flag and kills ffmpeg — playout.sh waits silently for the next stream-start. Each stream-start is a fresh ffmpeg launch from the beginning of the active playlist. There is no resume-from-position.

### Why Studio RTMP Keys (not channel keys)
DCPE uses Restream Studio RTMP keys (`rtmp://live.restream.io/studio/...`). Multiple creators stream to separate Studio sessions on the same Restream account — using channel keys (`/live/`) would collide. The stream-enable flag is what prevents DCPE from hammering the Studio endpoint when no session is active.

---

## Railway GraphQL Reference

```
Endpoint: https://backboard.railway.app/graphql/v2
Header:   Authorization: Bearer <RAILWAY_API_TOKEN>
```

```graphql
# Upsert variable
mutation { variableCollectionUpsert(input: {
    projectId: "ed918291-77dc-4d8d-9435-9e441c99d9f0",
    serviceId: "18d06110-eecd-4de5-9ac3-5613c0e951e9",
    environmentId: "c73d3e24-f8f0-4d56-a9bc-7d8b3bf89e1a",
    variables: { MODE: "playout" }
}) }

# Trigger redeploy
mutation { serviceInstanceRedeploy(
    serviceId: "18d06110-eecd-4de5-9ac3-5613c0e951e9",
    environmentId: "c73d3e24-f8f0-4d56-a9bc-7d8b3bf89e1a") }

# Get deployments
query { deployments(input: {
    serviceId: "18d06110-eecd-4de5-9ac3-5613c0e951e9",
    environmentId: "c73d3e24-f8f0-4d56-a9bc-7d8b3bf89e1a"
}) { edges { node { id status } } } }

# Remove deployment
mutation { deploymentRemove(id: DEPLOYMENT_ID) }
```

> ℹ️ Implement retry/backoff on redeploy calls. Railway takes 30–90 seconds to deploy. Return immediately from the Django view and let the client poll `/ops/status/` for state.

---

## Quick Reference — Files Nos Touches

| File | Action | Notes |
|------|--------|-------|
| Railway Variables | Add DCPE_INTERNAL_URL, DCPE_API_KEY | In Railway dashboard for Django service |
| api/views_ops.py | Add 2 new proxy views | ops_stream_start, ops_stream_stop |
| api/views_ops.py | Update ops_status | Add `streaming_enabled` to merged response |
| Deorganized/urls.py | Add 2 new routes | stream-start, stream-stop |
| api/templates/ops.html | Drop in v4 file | Includes Start Stream / Stop Stream buttons |

---

## Testing Checklist

1. Visit `/ops/` — control panel loads, status fetches without errors in the activity log
2. Press **PREP** — Railway shows deployment triggered, MODE variable changes to prep
3. Playlist library populates — real folder names appear in the Library column
4. Add playlists to queue — items appear in Run Order with drag-to-reorder working
5. Press **PLAYOUT** — mode switches, service redeploys in playout mode
6. Open Restream Studio, then press **Start Stream** — feed begins within 10s, Stream readout shows LIVE
7. Press **▶▶ Next** — DCPE switches playlist, 2–5s stream gap, Now Playing bar updates
8. Press **Stop Stream** — ffmpeg killed, Stream readout shows OFF, service stays deployed
9. Press **REMOVE** — deployment stops, status shows REMOVED

> ✅ Questions? Send the activity log output from the ops.html UI or any error messages. The new stream-start/stop endpoints are purely additive — no existing code is removed or modified.

---

*DCPE v2.2 — Brief v4.0 — Last updated 2026-03-11 by PeaceLoveMusic*

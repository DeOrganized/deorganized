# DEBUG_LOG_1.md — DCPE (DeOrganized Continuous Playout Engine)
- Repo: DeOrganized/deorganized-playout
- Branch: feature/playlist-api
- Service: featureplaylist-api-production.up.railway.app
- Service ID: ed918291-77dc-4d8d-9435-9e441c99d9f0
- Maintained by: PeaceLoveMusic
- Collaborators: Nos (Django integration / frontend)
- Last updated: 2026-03-04 (session 10)

---

## Terminology
- **Feed** = RTMP output from Railway → Restream ingest
- **Stream** = live broadcast from Restream → public channels
- **Prep** = MODE=prep — sync + normalize + build playlist, then exit
- **Playout** = MODE=playout — ffmpeg concat → RTMP feed, no encoding
- **Manifest** = /app/norm/manifest.json — maps hash.ts → array of {folder_slug, folder_name, original_filename}

---

## System Architecture

### Infrastructure
```
Railway Service (single) — featureplaylist-api-production.up.railway.app
  Volume mounted at /app  (persistent data)
  Scripts at /service     (immutable, baked into Docker image)

/service          → entrypoint.sh, controller.sh, sync.sh, normalize.sh, build_playlist.sh, playout.sh, api_server.py
/app/inbox        → downloaded source files, organized into subfolders by folder_slug
/app/norm         → normalized .ts files + playlist.ffconcat + manifest.json (live — always complete set)
/app/norm_staging → in-progress encode during prep (swapped atomically on completion)
/app/norm_prev    → previous norm set (retained one generation for safety)
/app/logs         → playout logs
/app/meta         → per-file .fail markers for failed normalizations
```

### Modes
| Mode | Behavior |
|------|----------|
| MODE=prep | sync + normalize + build playlist + exit (RUN_ONCE=1) |
| MODE=playout | stream only — no encoding in startup path |

### Key Scripts
| File | Location | Purpose |
|------|----------|---------|
| entrypoint.sh | /service/ | Mode routing, env validation, startup |
| controller.sh | /service/ | Orchestrates sync → normalize → build_playlist → swap |
| sync.sh | /service/ | rclone copy from Google Drive into /app/inbox/<folder_slug>/ subfolders |
| normalize.sh | /service/ | FFmpeg re-encode to consistent .ts format, writes manifest.json |
| build_playlist.sh | /service/ | Builds per-folder playlists + default playlist.ffconcat from manifest |
| playout.sh | /service/ | FFmpeg concat → RTMP feed, infinite loop via -stream_loop -1 |
| api_server.py | /service/ | Flask HTTP API for external playlist control |

---

## Environment Variables
| Variable | Purpose |
|----------|---------|
| MODE | prep or playout |
| RUN_ONCE | 1 = prep runs once and exits (set automatically in prep mode) |
| RTMP_URL | Full Restream RTMP URL including stream key (key embedded — no RTMP_KEY needed) |
| RTMP_KEY | Intentionally empty — key embedded in RTMP_URL |
| RCLONE_REMOTE | rclone remote name (normalized to drive) |
| RCLONE_FOLDERS | Comma-separated Drive folder paths to sync |
| GOOGLE_SERVICE_ACCOUNT_JSON_B64 | Base64 service account for Drive auth |
| DCPE_API_KEY | Bearer token for API auth (not yet set — add before production) |
| PORT | Flask API port — set to 8080 by Nos for Django proxy alignment |
| TARGET_WIDTH/HEIGHT/FPS | Encoding params (default 1920x1080x30) |
| VIDEO_BITRATE | Output bitrate (default 4500k) |
| GOP_SIZE | Keyframe interval (default 60 = 2s at 30fps) |
| SYNC_INTERVAL_SECONDS | Loop interval for non-RUN_ONCE mode |
| FORCE_RENORMALIZE | Set to true to wipe and re-encode all files on next prep run — set to false after use |
| WATCHDOG_TIMEOUT | Seconds of heartbeat silence before watchdog kills ffmpeg (default 120) — watchdog currently disabled |

---

## Railway IDs
| Resource | ID |
|----------|----|
| Project | DeOrg Content Playout Engine |
| Service | ed918291-77dc-4d8d-9435-9e441c99d9f0 |
| Environment | production |
| Branch | feature/playlist-api |

---

## Confirmed Stable Behaviors (as of session 10)

- Normalize skip logic enabled — re-encodes only new/changed files, skips existing .ts by hash
- CBR encoding at 4500k — `-b:v`, `-minrate`, `-maxrate`, `-bufsize` all set to force constant bitrate regardless of source quality
- `-fflags +genpts+discardcorrupt` on both playout input and normalize slow transcode
- `-stream_loop -1` on ffmpeg in playout — loops playlist infinitely without exiting
- `-rtmp_buffer 3000` and `-rtmp_live live` flags on playout ffmpeg output
- ffmpeg runs in foreground in playout.sh — required for stable RTMP connection
- Watchdog DISABLED — faulty heartbeat arithmetic caused false kills and was root cause of feed drops and duplicate Restream sources
- Outer while true loop in playout.sh handles ffmpeg restarts on clean exit or error
- Atomic playlist writes via os.replace()
- Atomic prep staging — normalize → norm_staging, controller swaps to norm on full completion only
- Swap uses cp not mv — avoids Railway volume "Resource busy" on directory rename
- API server paused during swap, restarted after
- sync.sh syncs each RCLONE_FOLDERS entry into /app/inbox/<folder_slug>/ subfolders
- normalize.sh accumulates entries in manifest_entries.jsonl, writes manifest.json once at end — no race condition
- manifest.json uses array schema — one hash can belong to multiple folders
- build_playlist.sh builds per-folder .ffconcat files + combined default from manifest array schema
- Default playlist = pre_show + ad_reel_bumpers + intro — configurable in build_playlist.sh DEFAULT_FOLDERS
- advance kills ffmpeg directly (not playout.sh)
- Flask API server starts in both prep and playout modes
- RTMP feed pushes continuously as long as service runs — output channels controlled in Restream
- Multi-tenant model: one Railway service per creator, each with own volume and RTMP key
- RUN_ONCE=1 only affects controller.sh — does not affect playout mode
- sed in controller.sh uses || true — prevents prep abort if playlist.ffconcat missing during swap
- Non-monotonic DTS warnings at clip boundaries are expected — ffmpeg self-corrects, feed unaffected
- Always use channel RTMP key (/live/...) not Studio key (/studio/...) for automated playout (ISSUE-032)
- Trailing spaces after bash \ line continuations silently break argument passing — always check (ISSUE-031)

---

## Folder → Playlist Architecture

### Drive Structure
```
DeOrganized Playout/Feature Playlist API/
  Ad Reel Bumpers/    → folder_slug: ad_reel_bumpers
  Ambassadors/        → folder_slug: ambassadors
  GPSC Clips/         → folder_slug: gpsc_clips
  Hunna Clips/        → folder_slug: hunna_clips
  Intro/              → folder_slug: intro
  Partner Clips/      → folder_slug: partner_clips
  Pre-Show/           → folder_slug: pre_show
  SIP Shows/          → folder_slug: sip_shows
```

### Track Ordering
- Files play alphabetically by original filename within each folder
- Users control order by prefixing filenames with numbers (e.g. `01_`, `02_`)

### Default Playlist (as of session 8)
- pre_show (6 tracks) → ad_reel_bumpers (2 tracks) → intro (1 track) = 9 tracks total
- Defined in build_playlist.sh DEFAULT_FOLDERS variable

### manifest.json Schema (v2 — array per hash)
```json
{
  "hash.ts": [
    { "folder_slug": "pre_show", "folder_name": "Pre Show", "original_filename": "01 My Video.mp4" },
    { "folder_slug": "sip_shows", "folder_name": "Sip Shows", "original_filename": "01 My Video.mp4" }
  ]
}
```
- A file shared across multiple folders appears in each folder's playlist
- manifest_entries.jsonl is intermediate accumulation file — deleted after manifest.json written

### Per-Folder Playlist Files (in /app/norm/)
```
playlist.ffconcat              ← default/active playlist (used by ffmpeg)
playlist_pre_show.ffconcat
playlist_ad_reel_bumpers.ffconcat
playlist_sip_shows.ffconcat
... (one per folder)
```

---

## API Reference (v2.1 — Canonical)
Base URL: `https://featureplaylist-api-production.up.railway.app`
Auth: `Authorization: Bearer [DCPE_API_KEY]` (optional while key not set)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Service health check |
| GET | /api/status/ | Full service and feed status — includes now_playing from now_playing.txt |
| GET | /api/playlists/ | List available playlists with real track counts from manifest |
| GET | /api/tracks/ | List all .ts files with folder mapping (diagnostic) |
| POST | /api/set-playlist/ | Set active playlist by folder_slug, advances on next ffmpeg restart |
| POST | /api/advance/ | Kill ffmpeg → playout.sh restarts with current playlist.ffconcat |

### set-playlist body
```json
{ "playlist_id": "sip_shows" }
```

---

## Django Proxy Map
| Django Endpoint | Method | Calls DCPE |
|-----------------|--------|------------|
| /ops/health/ | GET | GET /health |
| /ops/status/ | GET | GET /api/status/ |
| /ops/playlists/ | GET | GET /api/playlists/ |
| /ops/set-playlist/ | POST | POST /api/set-playlist/ |
| /ops/advance/ | POST | POST /api/advance/ |
| /ops/set-mode/ | POST | Railway GraphQL (upsert MODE + redeploy) |
| /ops/remove/ | POST | Railway GraphQL (deploymentRemove) |

---

## Railway GraphQL Reference
Endpoint: `https://backboard.railway.app/graphql/v2`
Header: `Authorization: Bearer <RAILWAY_API_TOKEN>`
```graphql
mutation { variableCollectionUpsert(input: {
  projectId: PROJECT_ID, serviceId: SERVICE_ID,
  environmentId: ENV_ID, variables: { MODE: "playout" }
}) }

mutation { serviceInstanceRedeploy(serviceId: SERVICE_ID, environmentId: ENV_ID) }

query { deployments(input: { serviceId: SERVICE_ID, environmentId: ENV_ID }) {
  edges { node { id status } } } }

mutation { deploymentRemove(id: DEPLOYMENT_ID) }
```

---

## Multi-Creator Architecture

### Multi-Tenant Deployment Model
- Each creator gets their own Railway service instance with isolated volume
- Environment variables (RTMP target, Drive folders, stream key) are per-service
- To stop the RTMP feed: remove the Railway deployment
- To start the RTMP feed: deploy the service
- Creators never touch Google Drive or OAuth — all handled by DCPE service account

### Creator Onboarding Flow (x402-triggered)
1. Creator pays via x402 on deorganized.com
2. Django calls POST /api/create-folder/ with {folder: "creator_slug"}
3. DCPE runs rclone mkdir in DeOrganized's Drive
4. Creator uploads via deorganized.com UI → Django proxies to DCPE
5. Creator triggers prep + playout from control panel

### Platform File Constraints
- Max 30-minute video length per file — split longer content into sequential parts
- MP4 or MOV only — no GIFs or non-video files in source folders

---

## Hackathon Context (Buidl Battle #2)
Period: March 2–20, 2026 | DoraHacks | $20,000 total prize pool | Split 50/50 PeaceLoveMusic / Nos

| Bounty | Prize |
|--------|-------|
| USDCx Payments | $3,000 |
| x402 Agent Commerce | $3,000 |
| sBTC Integration | $3,000 |
| Main Prize Pool | $6K/$3K/$2K |

---

## Issue Log

### ISSUE-001 through ISSUE-028 — Fully archived in DEBUG_LOG_ARCHIVE.md

### ISSUE-029 — ffmpeg silent hang — feed drops with process still running
- **Date:** 2026-03-03 (session 8 late) | **Status:** ✅ RESOLVED (session 10)
- **Root cause:** Watchdog heartbeat arithmetic produced garbage values (1772641814s stale) due to empty/corrupt heartbeat file reads — caused false kills of healthy ffmpeg processes
- **Fix:** Disabled watchdog entirely. Outer while true loop in playout.sh handles restarts on clean exit or error. Feed now runs stably through full playlist loops.
- **Key learning:** Watchdog was also root cause of ISSUE-030 duplicate Restream sources — every false kill created a new RTMP handshake = new Encoder source in Restream Studio.
- Full detail in archive.

### ISSUE-030 — Restream duplicate RTMP Encoder sources
- **Date:** 2026-03-03 (session 8 late) | **Status:** ✅ RESOLVED (session 10)
- **Root cause:** Watchdog false kills created new RTMP connections on each restart — each new handshake = new persistent Encoder source in Restream Studio
- **Fix:** Disabling watchdog eliminated restarts, eliminating duplicate sources. Not a Restream bug.
- Full detail in archive.

### ISSUE-031 — Trailing spaces after backslashes in playout.sh break ffmpeg argument passing
- **Date:** 2026-03-04 (session 9) | **Status:** ✅ RESOLVED
- **Symptom:** `Error opening output file  .` — ffmpeg receives blank output path
- **Root cause:** Trailing spaces after `\` on two lines broke bash line continuation — `"$RTMP_TARGET"` never reached ffmpeg
- **Fix:** Removed trailing spaces. Also removed `-timeout 30000000` (HTTP flag, not valid for RTMP output).
- Full detail in archive.

### ISSUE-032 — Restream Studio RTMP endpoint incompatible with always-on playout
- **Date:** 2026-03-04 (session 9) | **Status:** ✅ DOCUMENTED — Architecture decision
- Studio key drops connection after ~11s unless Studio session is active.
- Always use channel key (`rtmp://live.restream.io/live/...`) for automated playout.
- Full detail in archive.

### ISSUE-033 — Low source bitrate causing Restream silent drops
- **Date:** 2026-03-04 (session 9/10) | **Status:** ✅ RESOLVED
- **Symptom:** Feed dropping after ~60s — Restream drops streams below minimum bitrate threshold
- **Root cause:** normalize.sh used `-crf 23` (quality-based encoding) — low-motion source files encoded at 285–910kbits/s, well below Restream's minimum
- **Fix:** Switched to CBR mode: `-b:v 4500k -minrate 4500k -maxrate 4500k -bufsize 9000k` — forces constant 4500k output regardless of source quality. Added `VIDEO_BITRATE` env var.
- **Note:** Some low-motion files (screen recordings, static content) still encode below 4500k peak — CBR padding fills the gap. FORCE_RENORMALIZE=true required after this change.
- Full detail in archive.

### ISSUE-034 — Watchdog false kills causing feed instability
- **Date:** 2026-03-04 (session 10) | **Status:** ✅ RESOLVED
- **Symptom:** Feed dropping at seemingly random intervals — sometimes after 7s, sometimes after several minutes
- **Root cause:** Watchdog heartbeat file returned empty/whitespace — arithmetic `$((NOW - LAST_BEAT))` produced massive stale value (1772641814s), always exceeding timeout, killing healthy ffmpeg
- **Fix:** Disabled watchdog entirely. Outer while true loop sufficient for restart recovery. Feed confirmed stable through multiple full playlist loops.
- **Key learning:** Do not reintroduce watchdog without validating heartbeat value is numeric before arithmetic. Use `[[ "$LAST_BEAT" =~ ^[0-9]+$ ]] || LAST_BEAT=0`

---

## Known Open Items / Hardening TODO

### Immediate
- [ ] Ping Nos — confirm Django proxy endpoints working against live API
- [ ] Set DCPE_API_KEY before going to production
- [ ] Update RTMP_URL to channel key if not already done

### Hardening
- [ ] Reintroduce watchdog with proper heartbeat validation (see ISSUE-034 fix pattern)
- [ ] Add encode delta reporting (files re-encoded vs already current)
- [ ] Add 3-5s debounce to advance button in ops.html
- [ ] Verify .gif removed from Ad Reel Bumpers in Drive
- [ ] Implement POST /api/create-folder/ endpoint in api_server.py
- [ ] Log playlist entry count on every prep run
- [ ] Swap Flask dev server for gunicorn in production
- [ ]  /api/feed-status/ endpoint — reads heartbeat file, returns seconds since last ffmpeg output — enables Django-side polling and alerts

### Post-Hackathon
- [ ] UI folder ordering — drag-and-drop setlist builder
- [ ] Queue persistence in Django
- [ ] Cursor-based advance with no feed gap (v3)
- [ ] Multi-tenant job isolation per creator
- [ ] MODE=continuous: prep updates library in background without redeploy
- [ ] Skip/advance as premium control panel feature (API endpoint already exists)
- [ ] CBR upscaling for low-quality source files as platform value-add

---

## Session Summaries

### Session 10 Summary (2026-03-04)
- Identified root cause of feed drops: normalize.sh used CRF encoding — low-bitrate source files produced sub-threshold output causing Restream silent drops (ISSUE-033)
- Fixed normalize.sh to use CBR: `-b:v -minrate -maxrate -bufsize` all at 4500k. VIDEO_BITRATE env var added.
- Fixed playout.sh: switched from libx264 re-encode to `-c copy` — prep handles encoding, playout streams only
- Added `-rtmp_buffer 3000` and `-rtmp_live live` to playout ffmpeg output flags
- Ran FORCE_RENORMALIZE=true prep — all 13 files re-encoded at CBR, atomic swap completed
- Identified and disabled faulty watchdog — heartbeat arithmetic produced garbage values causing false kills (ISSUE-034)
- Confirmed watchdog was also root cause of ISSUE-029 (silent hang) and ISSUE-030 (duplicate Restream sources)
- Feed now confirmed stable — running multiple full playlist loops without interruption
- Restream duplicate source issue self-resolved once watchdog disabled — was not a Restream bug

### Session 9 Summary (2026-03-04)
- Feed offline from session 8 late crash loop — Restream rate-limiting suspected
- Tested Restream Studio key to isolate rate limit vs networking — local ffmpeg test confirmed port 1935 accessible
- Identified Studio key incompatible with always-on playout (ISSUE-032)
- Root cause of blank output error found: trailing spaces after `\` in playout.sh (ISSUE-031)
- Fixed playout.sh, updated and archived debug log

### Session 8 Late Summary (2026-03-03)
Feed hung — ffmpeg alive but RTMP dead (ISSUE-029). Log size watchdog attempt caused new RTMP source on every kill. Reverted to foreground ffmpeg + sidecar heartbeat watchdog — hang recurred. Service removed after Restream Studio layout broken by duplicate Encoder sources (ISSUE-030). Both issues open at end of session.

### Session 8 Summary (2026-03-03)
Re-enabled normalize skip logic with manifest entry on skip path. Single manifest write at end of normalize — eliminated race condition (ISSUE-026). Manifest array schema for multi-folder membership (ISSUE-027). Added .mov/.MOV to normalize glob. Fixed sed || true (ISSUE-028). Confirmed pre_show 6 tracks, correct ordering, audio working. Feed stable, API live, Nos pinged.

### Session 7 Summary (2026-03-03)
Full pipeline refactor — sync, normalize, build_playlist, playout, api_server rewritten. Fixed apostrophe crash (ISSUE-024), added -stream_loop -1 (ISSUE-025). Folder-aware pipeline confirmed working.

### Session 6 Summary (2026-03-03)
Switched MODE=playout — feed confirmed pushing to Restream. Fixed build_playlist.sh to scan norm_staging/*.ts directly (ISSUE-021).

---

*Last updated: 2026-03-04 session 10 by PeaceLoveMusic*
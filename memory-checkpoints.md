# DeOrganized Technical Memory Checkpoints

This file tracks the evolution of the DeOrganized codebase, documenting implemented features, fixed bugs, and production progress.

## 🚀 Production Status
- **Environment:** Railway (Django + DCPE Playout Engine)
- **Frontend:** React + Vite
- **Auth:** Stacks Wallet + JWT (Django REST Framework)
- **Playout Engine:** DCPE v2.2 (Digital Content Processing Engine)

## March 2026 Sprint Progress
- [x] **Phase 1: DCPE v4.0 & Live Controls**
    - Implemented `stream-start` and `stream-stop` backend proxy views.
    - Updated `ops_status` to include `streaming_enabled` flag.
    - Added "Go Live" and "End Stream" buttons to `PlayoutControl.tsx`.
    - Gated live controls to production staff for safety.
- [x] **Phase 2: Show Episodes**
    - Implemented `ShowEpisode` model and serializers.
    - Created `EpisodeManager.tsx` for full CRUD management of show episodes.
    - Integrated "Episodes" tab into `ShowDetail.tsx` with conditional creator controls.
    - Updated frontend API library with episode management functions.
- [x] **Phase 3: Creator Dashboard v2 & Merch Shop**
    - [x] Backend: Fixed `merch` permission logic (swapped `obj`/`view` args) to resolve 500 errors.
    - [x] Backend: Registered `Merch` and `Order` models in Django admin.
    - [x] Frontend: Implemented inline **Post Editing** in `CommunityPosts.tsx`.
    - [x] Frontend: Improved mobile responsiveness and image rendering in Community tab.
    - [x] Frontend: Fixed tab button contrast for Dark/Light mode (`text-canvas`).
    - [x] API: Added `updatePost` helper and resolved 401 Unauthorized with `DCPE_API_KEY`.

## 🛠 Features Implemented

### User Authentication & Profile
- [x] Stacks Wallet Login/Register flow.
- [x] JWT integration (Access + Refresh tokens).
- [x] Creator Profiles with bio, website, and social links.
- [x] User-to-Creator follow system.

### Playout Engine (DCPE)
- [x] Playout Control Center UI.
- [x] RTMP Destination management (Multi-platform).
- [x] Broadcast Schedule manager.
- [x] DCPE Ops Proxy (Health, Status, Playlists, Set-Playlist, Advance).
- [x] Mode Switching (PREP / PLAYOUT / REMOVE) via Railway GQL.

### Content & Engagement
- [x] Shows and Events listing.
- [x] Likes and Comments system with nested replies.
- [x] Follower notifications.

## 🐛 Bug Fixes & Optimizations

### Playout Control Fixes (Mar 2026)
- **RTMP Fetching:** Fixed `fetchRTMPDestinations` to correctly handle DRF paginated responses (`count/results` shape).
- **Wizard Advancement:** Fixed `hasRTMP` check to allow the setup wizard to advance to Step 2.
- **White Page Bug:** Fixed accidental form submission in "Save Destination" button by adding `type="button"`.
- **API Reliability:** Increased DCPE proxy timeouts to 30s to handle Railway cold-starts.
- **Security:** Removed legacy hardcoded `GEMINI_API_KEY` from client bundle; stripped console logs in production.
- **Concurrency:** Gated `set-playlist` and `advance` to Staff only to prevent shared engine conflicts during demo.

## Phase 1 — Messages Tab & Inbox
**Status:** Complete
**Halfway checkpoint (what is done):**
- Audited backend `messaging` app: `Thread` and `Message` models identified.
- Verified `ThreadViewSet` with thread listing and message history actions.
- Confirmed URL registration: `/api/messages/threads/` is active.
**Remaining / Completed:**
- [x] Remap `Message` fields (`body`, `sent_at`) in serializer.
- [x] Add `unread_count` and `is_paygated` logic to `ThreadSerializer`.
- [x] Build frontend `MessagingInbox` component.
- [x] Add "Messages" tab to Creator Dashboard.
**Any flags or blockers:**
- None.

## Phase 2 — Pay-gate MerchHub
**Status:** Complete
**Halfway checkpoint (what is done):**
- Identified LivePlayout pay-gate pattern using `x402_required` decorator on the backend and `x402Fetch` on the frontend.
- Created `HasPaidSubscription` permission class in `users/permissions.py`.
- Applied subscription guard to `MerchTracker.tsx` with upgrade prompts for free-tier users.
**Remaining / Completed:**
- [x] Applied `x402_required` to `OrderViewSet.create` in `merch/views.py`.
- [x] Updated `createMerchOrder` in `lib/api.ts` to use `x402Fetch`.
- [x] Verified 402 challenge loop for merchandise purchases.
## Phase 3 — Episodes Tab & Management
**Status:** Complete
**Halfway checkpoint (what is done):**
- Implemented `episodes` action in `ShowViewSet` for public fetching.
- Added `fetchShowEpisodes` to `lib/api.ts`.
- Built tabbed navigation in `ShowDetail.tsx` (Episodes / Comments).
**Remaining / Completed:**
- [x] Integrated `PaywallModal` for premium episodes using x402 pattern.
- [x] Implemented responsive episode grid with duration and air date display.
- [x] Verified 402 payment flow for unlocking premium episodes.
**Any flags or blockers:**
## Phase 4 — Auto-create Episodes
**Status:** Complete
**Halfway checkpoint (what is done):**
- Implemented `get_next_occurrence()` in `Show` model.
- Created `create_recurring_episodes` management command.
**Remaining / Completed:**
- [x] Verified idempotency (prevents duplicate episodes for the same date).
- [x] Verified support for Daily, Weekly, Weekdays, and Weekends patterns.
- [x] Fixed JSX syntax error in `ShowDetail.tsx` caused by unclosed ternary.
**Any flags or blockers:**
- Management command is located in the backend directory: `C:\Users\Solumgolie\Documents\New Beginnings\python\deorganized\deorganized\shows\management\commands\`.
## Phase 5 — Edit and Delete Shows/Events
**Status:** Complete
**Halfway checkpoint (what is done):**
- Audited backend `ShowViewSet` and `EventViewSet`: verified support for DELETE, PUT, PATCH.
- Verified permissions (`IsCreatorOrReadOnly`) are active.
**Remaining / Completed:**
- [x] Added "Delete Show" button to `EditShowModal.tsx` with browser confirmation.
- [x] Added "Delete Event" button to `EditEventModal.tsx` with browser confirmation.
- [x] Integrated `deleteShow` and `deleteEvent` API calls.
**Any flags or blockers:**
- None.

## Phase 6 — Creator Merch Tab & x402 Purchase
**Status:** Complete
**Halfway checkpoint (what is done):**
- Audited backend `Merch` and `Order` models and views.
- Verified `OrderViewSet` handles x402 challenges via `x402_required`.
**Remaining / Completed:**
- [x] Added "Merch" tab to public `CreatorDetail.tsx`.
- [x] Implemented merch grid with image, price, and description.
- [x] Integrated "Buy Now" button with `createMerchOrder` and x402 payment flow.
- [x] Fixed `Creator` interface in `lib/api.ts` to include missing fields.
**Any flags or blockers:**
- Identified a bug where `senderAddress` was not passed to `x402Fetch`, causing "Invalid c32 address" for USDCx payments. Fixed in subsequent implementation.

## Phase 7 — Episode Pay-gate Dashboard
**Status:** Complete
- `ShowEpisode` model has `is_premium`, `price_stx`, `price_usdcx` fields.
- `EpisodeManager.tsx` has premium toggle + price inputs.
- **Bug fix:** Episode x402 gating now converts prices to micro-units (×1M) in `shows/views.py`.

## Phase 8 — x402 Amount Fix + PlayoutControl Plan Buttons
**Status:** Complete
- **Bug fix:** `OrderViewSet` and episode gating now multiply `DecimalField` prices by 1,000,000 before passing to `build_payment_required_header`. Wallet was showing ~0.00005 USDCx instead of 50 USDCx.
- **PlayoutControl upgrade:** Plan cards now show USDCx prices (Starter 20, Pro 35, Enterprise 75/mo) and have clickable "Select Plan" buttons that trigger x402 payment → `POST /api/subscription/upgrade/`.
- On successful upgrade, DCPE folder auto-creates via `CreatorPlaylist`.

## Phase 9 — "Send a DM" Button
**Status:** Complete
- Added DM button to `CreatorDetail.tsx` next to Follow.
- `findOrCreateThread()` checks for existing thread, creates if needed.
- On success, navigates to Messages tab.

## Phase 10 — Creator DM Pay-gate Preference
**Status:** Backend Complete
- Added `dm_paygate_enabled`, `dm_price_stx`, `dm_price_usdcx` to User model.
- Added `payout_stx_address` for tip/merch payouts.
- API: `updateDMPreferences` in `api.ts`.
- **Migration required:** `python manage.py makemigrations users && python manage.py migrate`.

## Phase 11 — Merch Orders in Dashboard
**Status:** Backend + API Complete
- `GET /api/orders/mine/` — creator's received orders.
- `PATCH /api/orders/{id}/update-status/` — status updates (pending → shipped → completed).
- API: `fetchCreatorOrders`, `updateOrderStatus` in `api.ts`.

## Phase 12 — Order Descriptions
**Status:** Complete
- `buyer_note` added to `Order` model and `OrderSerializer`.
- `perform_create` saves `buyer_note` and `shipping_address` from request.
- **Migration required:** `python manage.py makemigrations merch && python manage.py migrate`.

## Phase 13 — Creator Tips via x402
**Status:** Complete
- Created `TipViewSet` with `payment_info` (GET) and `send` (POST, x402-gated).
- Registered at `/api/tips/` in `api/routers.py`.
- Created `TipModal.tsx` — token selector (STX/USDCx), quick-pick amounts (1/5/10/25/50), custom input.
- Added Tip button to `CreatorDetail.tsx` next to DM button.
- API: `fetchTipPaymentInfo`, `sendTip` in `api.ts`.

## UI Polish Sprint — Dark Mode, Responsive, Payment Fixes
**Status:** Complete
- **EpisodeManager.tsx:** Added `text-ink` to all inputs. Changed submit button from `bg-ink` to `bg-gold`. Added Episode Link (URL) field. Fixed edit/delete hover backgrounds to opacity-based for dark mode.
- **CreatorDashboard.tsx:** Sidebar hidden on mobile; replaced with fixed horizontal scrollable tab bar (`no-scrollbar`). Active tabs changed to `bg-gold text-background`. Content padding reduced on mobile.
- **PlayoutControl.tsx:** Added STX/USDCx token selector on plan upgrade page. Reduced prices to **3.5 STX / 1 USDCx** per plan. All plan buttons use `bg-gold text-background`. Header stacks vertically on mobile. Plan grid: 1-col mobile → 2-col tablet → 4-col desktop.
- **Backend:** `PLAN_PRICES` in `users/views.py` updated to `{'stx': 3.5, 'usdcx': 1}` for all plans.
- **CSS:** Added `no-scrollbar` utility to `index.css`.

## DM Thread Fix + Merch Token Selector
**Status:** Complete
- **Bug fix:** `findOrCreateThread` in `api.ts` was sending `{ participant }` but backend `ThreadViewSet.create()` expects `{ recipient_id }`. Changed field name → DM now works.
- **Merch token selector:** Added STX/USDCx toggle buttons (same design as playout plan page) above the merch grid in `CreatorDetail.tsx`. Price display switches between `price_stx` and `price_usdcx`. `handleBuyMerch` passes selected `payment_currency` and `tokenType` to `createMerchOrder`.

## DM / Messaging Fixes + Profile Responsiveness
**Status:** Complete
- **DM 400 Fix #1:** `findOrCreateThread` in `api.ts` fixed (field: `participant` → `recipient_id`).
- **DM 400 Fix #2:** `MessageSerializer` in `messaging/serializers.py` — added `thread` to `read_only_fields` (was requiring it on input but view sets it via `save(thread=thread)`).
- **Message Send Fix:** `sendMessage` in `api.ts` changed from `x402Fetch` to regular `fetch` — the POST endpoint isn't x402-gated.
- **DM Navigation Fix:** DM button in `CreatorDetail.tsx` changed from `onNavigate('messages')` (no route → home) to `onNavigate('user-profile')` (profile page with Messages tab).
- **Profile Page Responsive:** `UserDashboard.tsx` — header stacks on mobile, tabs scroll horizontally with `no-scrollbar`, smaller text/icons on mobile, reduced container padding.

# Deorganized API Documentation

This document provides a comprehensive overview of the Deorganized API endpoints, including supported methods, parameters, and authorization requirements.

## Authentication

The Deorganized API uses JWT (JSON Web Token) for authentication.

**Header Requirement:**
`Authorization: Bearer <your_access_token>`

### Auth Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/token/` | POST | Obtain access and refresh tokens (Username/Password) | No |
| `/api/auth/token/refresh/` | POST | Refresh an expired access token | No |
| `/api/auth/token/verify/` | POST | Verify the validity of a token | No |
| `/api/auth/wallet/nonce/` | POST | Request a nonce for Stacks wallet signing | No |
| `/api/auth/wallet/verify/` | POST | Verify signature and authenticate via Stacks wallet | No |
| `/api/users/wallet-login-or-check/` | POST | Check if a wallet address is already registered | No |
| `/api/users/complete-setup/` | POST | Register a new user after wallet verification | No |

---

## Users & Social

Endpoints for user profiles, follows, and platform engagement.

### User Profiles
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/users/` | GET | List users (Searchable by `username`, `first_name`, `last_name`) | No |
| `/api/users/me/` | GET | Get the current authenticated user's profile | Yes |
| `/api/users/{id}/` | GET | Get a specific user's public profile | No |
| `/api/users/{id}/` | PATCH/PUT | Update user profile | Owner |
| `/api/users/by-username/{username}/` | GET | Get user profile by username | No |
| `/api/users/{id}/creator_profile/` | GET | Get detailed creator profile | No |
| `/api/users/{id}/stats/` | GET | Get usage stats for a creator | No |
| `/api/users/{id}/liked_shows/` | GET | Get list of shows liked by the user | No |
| `/api/users/{id}/following/` | GET | Get users being followed by this user | No |

### Social Interactions
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/likes/` | GET | List likes (Filter: `content_type`, `object_id`, `user`) | No |
| `/api/likes/toggle/` | POST | Toggle like on any content | Yes |
| `/api/comments/` | GET | List comments (Filter: `content_type`, `object_id`, `top_level`) | No |
| `/api/comments/` | POST | Create a comment or reply | Yes |
| `/api/follows/` | GET | List follows (Filter: `follower`, `following`) | Yes |
| `/api/follows/toggle/` | POST | Toggle following a user | Yes |
| `/api/notifications/` | GET | List user notifications | Yes |
| `/api/notifications/{id}/mark_read/` | POST | Mark notification as read | Yes |
| `/api/notifications/mark_all_read/` | POST | Mark all notifications as read | Yes |

### Creator Streaming Tools
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/rtmp-destinations/` | GET/POST | List/Create RTMP streaming destinations | Yes |
| `/api/rtmp-destinations/{id}/` | PATCH/DELETE| Update/Remove RTMP destination | Owner |
| `/api/broadcast-schedule/` | GET | Get user's broadcast schedule | Yes |
| `/api/broadcast-schedule/` | POST | Update broadcast schedule | Yes |
| `/api/subscription/` | GET | Get current user's subscription status | Yes |
| `/api/subscription/` | PATCH | Update subscription (e.g., plan upgrade) | Yes |

---

## Shows & Events

### Shows
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/shows/` | GET | List shows (Filters: `status`, `creator`, `tags`, `is_recurring`) | No |
| `/api/shows/` | POST | Create a new show | Creator |
| `/api/shows/{slug}/` | GET | Get show details (Supports Slug or ID) | No |
| `/api/shows/{slug}/` | PATCH/PUT | Update show details | Owner |
| `/api/shows/{slug}/` | DELETE | Delete show | Owner |
| `/api/shows/upcoming_shows/` | GET | List all upcoming published recurring shows | No |
| `/api/shows/my_shows/` | GET | Current user's shows (owned + co-hosted) | Yes |
| `/api/shows/{slug}/episodes/` | GET | List all episodes for a specific show | No |
| `/api/shows/{slug}/respond_to_reminder/` | POST | Confirm or cancel a show instance reminder | Owner |
| `/api/shows/{slug}/track_share/` | POST | Increment the share count for a show | No |

### Episodes
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/episodes/` | GET | List all episodes (Filter: `show`) | No |
| `/api/episodes/` | POST | Create an episode for a show | Show Owner |
| `/api/episodes/{id}/` | GET | Get episode details (HTTP 402 if premium) | No* |
| `/api/episodes/{id}/` | PATCH/PUT | Update episode | Owner |
| `/api/episodes/{id}/` | DELETE | Delete episode | Owner |

### Guest Requests
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/guest-requests/` | GET | List sent requests (or received via `?received=true`) | Yes |
| `/api/guest-requests/create_request/` | POST | Request to be a guest on a show | Creator |
| `/api/guest-requests/{id}/accept/` | POST | Accept a guest appearance request | Show Owner |
| `/api/guest-requests/{id}/decline/` | POST | Decline a guest appearance request | Show Owner |

### Tags
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/tags/` | GET | List tags (Searchable by `name`) | No |
| `/api/tags/{slug}/` | GET | Get tag details (Supports Slug or ID) | No |

### Events
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/events/` | GET | List events (Filters: `organizer`, `is_virtual`, `start_date`) | No |
| `/api/events/` | POST | Create event | Yes |
| `/api/events/{slug}/` | GET | Get event details (Supports Slug or ID) | No |
| `/api/events/{slug}/` | PATCH/PUT | Update event | Owner |
| `/api/events/{slug}/` | DELETE | Delete event | Owner |
| `/api/events/upcoming/`| GET | List upcoming events | No |
| `/api/events/past/` | GET | List past events | No |
| `/api/events/my_events/` | GET | Get events organized by current user | Yes |

---

## Feed & Articles

### Posts
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/posts/` | GET | List community posts (Filter: `author`) | No |
| `/api/posts/` | POST | Create a new post | Yes |
| `/api/posts/{id}/` | GET | Get post details (HTTP 402 if premium) | No* |
| `/api/posts/{id}/` | PATCH/PUT | Update post | Owner |
| `/api/posts/{id}/` | DELETE | Delete post | Owner |
| `/api/posts/feed/` | GET | Personalized feed of posts from followed creators | Yes |

### News
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/news/` | GET | List news articles (Filters: `category`, `tags`, `author`) | No |
| `/api/news/` | POST | Create news article | Yes |
| `/api/news/{slug}/` | GET | Get news article detail (Supports Slug or ID) | No |
| `/api/news/{slug}/` | PATCH/PUT | Update news article | Owner |
| `/api/news/{slug}/` | DELETE | Delete news article | Owner |
| `/api/news/{slug}/increment_view/` | POST | Increment article view count | No |
| `/api/news/my_articles/` | GET | Get articles authored by current user | Yes |

---

## Commerce & Messaging

### Merch & Orders
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/merch/` | GET | List active merch items | No |
| `/api/merch/` | POST | Create merch item | Creator + Paid Sub |
| `/api/merch/{slug}/` | GET | Get merch detail (Supports Slug or ID) | No |
| `/api/merch/{slug}/` | PATCH/PUT | Update merch | Owner + Paid Sub |
| `/api/merch/{slug}/` | DELETE | Delete merch | Owner + Paid Sub |
| `/api/merch/my_merch/` | GET | List current creator's merch management list | Creator |
| `/api/orders/` | GET | List orders (Sales for Creators, Purchases for Users) | Yes |
| `/api/orders/` | POST | Create order (HTTP 402 gated payment loop) | Yes |

### Messaging
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/messages/threads/` | GET | List conversation threads | Yes |
| `/api/messages/threads/` | POST | Start or retrieve a DM thread (Requires `recipient_id`) | Yes |
| `/api/messages/threads/{id}/messages/` | GET | List messages in thread (Gated if premium) | Yes |
| `/api/messages/threads/{id}/messages/` | POST | Send a message in a thread | Yes |

---

## Administration & OPS

### Feedback
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/feedback/` | POST | Submit user feedback | No |
| `/api/feedback/` | GET | List all feedback submissions | Staff |
| `/api/feedback/{id}/` | PATCH | Update feedback (e.g., mark as resolved) | Staff |

### Admin User Management
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/users/admin-stats/` | GET | Platform-wide overview stats | Admin |
| `/api/users/admin-users/` | GET | Paginated list of all users | Admin |
| `/api/users/{id}/toggle-verification/` | POST | Toggle a user's verified status | Admin |

### OPS (Digital Content Processing Engine)
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/ops/health/` | GET | DCPE health check | Yes |
| `/ops/status/` | GET | Combined DCPE stream and Railway status | Yes |
| `/ops/playlists/` | GET | List available playlists (Filtered by ownership) | Yes |
| `/ops/set-playlist/` | POST | Set active playout playlist | Staff/Owner |
| `/ops/advance/` | POST | Skip to next track in playlist | Staff |
| `/ops/stream-start/` | POST | Start RTMP stream | Staff |
| `/ops/stream-stop/` | POST | Stop RTMP stream | Staff |
| `/ops/set-mode/` | POST | Update Railway MODE and redeploy | Staff |
| `/ops/remove/` | POST | Remove current Railway deployment | Staff |
| `/ops/create-folder/` | POST | Create Google Drive folder for creator content | Paid Sub |
| `/ops/upload/` | POST | Upload files to DCPE/Drive | Paid Sub |

# Smiirl Backend — Project Context

## What this is
A Node.js/Express backend for a Smiirl clone — a physical split-flap display that shows live social media follower counts. Built to be sold to businesses in Lebanon.

## Tech stack
- Node.js with ES modules (type: module in package.json)
- Express.js
- PostgreSQL (pg library, connection pool in src/db.js)
- JWT authentication (jsonwebtoken)
- bcrypt for password hashing
- Vitest + Supertest for testing
- Docker for local Postgres (port 5433)
- Deployed on Railway

## Project structure
```
src/
├── app.js              ← Express app (no server.listen here)
├── index.js            ← Only starts the server + poller
├── db.js               ← Shared pg Pool, uses TEST_DATABASE_URL when NODE_ENV=test
├── middleware/
│   └── auth.js         ← requireAuth (JWT) + requireAdmin (is_admin flag)
├── routes/
│   ├── authRoutes.js   ← POST /api/auth/register, POST /api/auth/login
│   ├── count.js        ← GET /api/count/:deviceId (called by ESP32)
│   └── devices.js      ← pair, list, status, settings, admin
└── poller/
    ├── index.js        ← cron job, one setInterval per device
    └── providers/
        ├── mock.js     ← active provider (slowly growing fake count)
        ├── instagram.js ← stubbed, waiting for FB app approval
        └── tiktok.js   ← stubbed, waiting for TikTok app approval
db/
└── schema.sql          ← source of truth for DB schema, run on CI
src/tests/
├── setup.js            ← truncates all tables in beforeAll per file
├── unit/
│   ├── auth.test.js
│   └── providers.test.js
└── integration/
    ├── auth.test.js
    ├── count.test.js
    └── devices.test.js
```

## Database schema (5 tables)
- `users` — dashboard accounts (email, password_hash, is_admin)
- `devices` — physical counter units (owner_id FK, device_token, serial_number, platform, display_digits, poll_interval_seconds, paired_at)
- `social_accounts` — OAuth credentials (device_id UNIQUE FK, platform, platform_user_id, username, access_token, token_expires_at)
- `counts` — latest follower count only, upserted on every poll (device_id UNIQUE FK, value, fetched_at)
- `count_history` — time-series one row per poll tick for trend charts (device_id FK, value, recorded_at); indexed on (device_id, recorded_at DESC)

## Auth flow
- Dashboard users authenticate with JWT (Bearer token, 7d expiry)
- Physical devices authenticate with device_token in x-device-token header
- Admin routes protected by requireAuth + requireAdmin middleware
- is_admin defaults to false, set manually in DB for platform owner

## API routes
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | none | Create user account (validates email format + min 8-char password) |
| POST | /api/auth/login | none | Returns JWT |
| GET | /api/count/:deviceId | device token | ESP32 polls this — returns count, interval, display_digits |
| POST | /api/devices/pair | JWT | Pair device + social account; triggers poller immediately |
| GET | /api/devices | JWT | List user's devices |
| GET | /api/devices/:id/status | JWT | Single device live count |
| PUT | /api/devices/:id/settings | JWT | Update poll interval |
| DELETE | /api/devices/:id | JWT | Unpair and delete device |
| GET | /api/devices/:id/history | JWT | Time-series count history (?limit=N, max 500) |
| GET | /api/admin/devices | JWT + is_admin | All devices all users (includes owner email) |
| GET | /api/admin/users | JWT + is_admin | All users with device count |
| GET | /api/admin/stats | JWT + is_admin | Platform summary: user count, device count, followers tracked |
| DELETE | /api/admin/devices/:id | JWT + is_admin | Force-remove any device |

## Poller behavior
- Starts on server boot via startPoller() in index.js
- Fetches all paired devices (paired_at IS NOT NULL) from DB
- Schedules one setInterval per device using poll_interval_seconds
- Currently uses mock provider — simulates slow follower growth
- On each tick: fetches count → upserts into counts table AND appends a row to count_history
- Switch statement in poller/index.js controls which provider is used per platform
- triggerReconcile() is exported and called by POST /api/devices/pair so new devices start polling immediately (no 30 s wait)

## Environment variables
```
PORT=3000
DATABASE_URL=postgres://smiirl:smiirl_dev@localhost:5433/smiirl
TEST_DATABASE_URL=postgres://smiirl:smiirl_dev@localhost:5433/smiirl
JWT_SECRET=your_secret
```

## Testing
- Run with: NODE_ENV=test npm test
- ~45 tests across 5 files
- Each integration test file truncates all tables (including count_history) in its own beforeAll
- Tests run sequentially (fileParallelism: false in vitest.config.js)
- CI runs on every push via .github/workflows/test.yml
- GitHub Actions spins up Postgres 16, runs schema.sql, then runs tests

## What's pending / not built yet
- Instagram Graph API integration (waiting for Facebook app approval)
- TikTok API integration (waiting for TikTok app approval)
- OAuth token refresh flow (access tokens expire in 60 days; token_expires_at column exists but unused)
- Redis caching layer (optional, for high device count)
- pg-boss job queue (optional, replace setInterval for reliability)
- Email notifications (device offline alerts)
- Webhook support for real-time counts instead of polling

## Code conventions
- ES modules throughout (import/export, no require)
- async/await everywhere, try/catch in all route handlers
- Query function from db.js for all DB access (no raw pool usage)
- All routes return JSON
- Error responses always have shape { error: "message" }
- HTTP status codes: 400 bad input, 401 no auth, 403 wrong auth, 404 not found, 409 conflict, 500 server error

## Known issues to fix
- setInterval is not crash-safe — if server restarts mid-interval, poll is lost (pg-boss would fix this)
- No token refresh logic for Instagram/TikTok OAuth tokens (60 day expiry)
- count_history grows unbounded — no pruning / TTL yet (add a cron to DELETE rows older than N days)

## Senior developer notes
When adding new features:
1. Add route to src/routes/ — never put business logic directly in routes
2. Add corresponding test in src/tests/integration/
3. Update schema.sql if DB changes needed
4. Run NODE_ENV=test npm test before pushing
5. Railway auto-deploys on push to main
6. Always use process.env variables — never hardcode credentials

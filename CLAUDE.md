# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

JoinClub PEC: a club portal for Punjab Engineering College. Students browse clubs, apply to openings (recruitment drives), and follow events. Club admins manage their club, openings and applicants. A super admin manages the club admins. There is also an AI assistant ("PEC Buddy", an answer checker, and a mock interview). The code started as a job-portal clone ("ClubSpot"). The domain has since been renamed: `Company`→`Club`, `Job`→`Opening`, `recruiter`→`club_admin`.

Two separate npm projects: `backend/` (Express 4 + Mongoose, ESM) and `frontend/` (React 18 + Vite + Redux Toolkit + Tailwind + shadcn/ui). No root package.json.

## Commands

Backend (`cd backend`, copy `.env.example` to `.env`; only `SECRET_KEY`, `MONGO_URI` and `PORT` are needed to boot):
- `npm run dev`: nodemon on :8000
- `npm test`: node's built-in test runner (`node:test` + supertest), not vitest. It starts its own in-memory MongoDB and drops a throwaway `joinclub_test_<pid>` database, so no external database is needed. `TEST_MONGO_URI` points it at a real server instead (CI uses a service container).
- Run one test: `node --env-file-if-exists=.env --test --test-name-pattern="apply, duplicate" tests/api.test.js`
- `npm run seed`: idempotent seed (clubs, one admin per club, fake students, openings, applications, events). Options: `-- --reset` wipes collections first, `-- --reset-admin-passwords`. It writes plain-text logins to `output/club-admin-credentials.csv`, which is git-ignored. Never commit it.
- `npm run scrape`: scrapes pec.ac.in into `data/pec-clubs.json` (`-- --fresh` re-downloads; HTML is cached in `scripts/.cache/`). The seed reads only the JSON, never the live site.
- `node scripts/check-llm-wiring.js`: offline check of `ai/llm.js` against a fake Anthropic server.
- `npm run check:indexes`: runs `explain()` on the hot controller queries against an in-memory database and fails on any `COLLSCAN`. When you add a per-page-view query, add it to the list in `scripts/check-indexes.js`.

Frontend (`cd frontend`):
- `npm run dev` (:5173), `npm run build`, `npm run lint` (ESLint). There are no frontend tests.

## Architecture

### Backend request pipeline (`backend/app.js`)
- `index.js` loads dotenv, checks `SECRET_KEY`, and dynamically imports `app.js` so that modules which read env at load time see it. `app.js` exports the app without listening, so tests can import it.
- **CSRF guard:** every non-GET `/api` request must send `X-Requested-With: XMLHttpRequest`, or it gets a 403. The frontend axios instance (`frontend/src/lib/api.js`) and the test `agent()` helper both set it. Any new client code that makes state-changing calls (including raw `fetch` for SSE) must send it too.
- Routes are mounted under `/api/v1/{auth,users,clubs,openings,applications,events,stats,admin,ai}`. Events, stats, admin and AI routers all live in `routes/misc.route.js`.
- Handler conventions: wrap handlers with `asyncHandler` (imported as `h`), throw `new HttpError(status, msg)` for expected failures, and validate bodies with the `validate(zodSchema)` middleware. The schema is usually defined inline in the route file, and the middleware replaces `req.body` with the parsed value. `middlewares/errorHandler.js` turns everything into `{ success:false, message, code? }` and maps Mongo CastError, duplicate-key and ValidationError to 400s.
- Multipart routes send nested fields as JSON strings. Club routes use a `json()` zod preprocess, and `stringList` accepts `"a, b"` or an array.

### Auth (`middlewares/auth.js`)
- A JWT in an HttpOnly `token` cookie holds `{ userId, tv }`. **Role and club are read from the DB on every request, not from the token.** `tokenVersion` (`tv`) is bumped to sign out other sessions after a password or role change.
- `isAuthenticated` sets `req.id`, `req.role`, `req.clubId`, `req.emailVerified` and `req.mustChangePassword`. `optionalAuth` is for guest-accessible routes (club lists, AI chat). `requireRole(...)` gates by role. Club-admin ownership is checked in controllers (`assertOwnsClub` in `club.controller.js`).
- Seeded admins have `mustChangePassword`. Until they change it, only the routes in `ALLOWED_BEFORE_PASSWORD_CHANGE` work, and every other route returns 403 with `code: "MUST_CHANGE_PASSWORD"`. The frontend's axios interceptor catches that code (and 401s) through handlers registered in `App.jsx`.
- Password reset and change, plus email verification, use OTPs: `model/otp.model.js`, hashed codes, and a TTL index. When `SMTP_HOST` is empty, the OTP is printed to the server console. `REQUIRE_EMAIL_VERIFICATION` gates applying.

### AI layer (`backend/ai/`)
- `llm.js` is the only file that calls the Anthropic SDK. It exposes `streamText()` (streaming) and `generateJSON()` (structured output via a zod schema). Models come from `AI_MODEL` and `AI_SMALL_MODEL`.
- **Demo mode:** when `ANTHROPIC_API_KEY` is empty, `ai/demo.js` answers rule-based from the DB, so every AI screen still works. Tests always run in demo mode. When changing an AI feature, update both the real path and the demo path in `ai.controller.js`.
- Each mode (`modes/helpdesk.js`, `checker.js`, `interview.js`) is a config module: prompts, zod schemas, and context builders. The system prompt is static and cache-controlled. Changing data (today's date, relevant clubs, the user's own applications, from `context.js`) goes into the user turn, so the cached prefix stays valid. Keep it that way.
- `POST /ai/chat` streams SSE (`ai/sse.js`). Each `data:` line is JSON with a `type` field: `session`, `status`, `content_chunk`, `options`, `suggestions`, `report`, `done`, `error`. The model offers tappable choices by ending its reply with `[[options: A | B | C]]`. The server strips that into an `options` event, and the frontend `useChatStream` hides it while streaming. The interview's progress (question count, scores) is tracked server-side in `ChatSession.meta`, not by the model.
- Privacy rule: AI context may include public club data and the **current user's own** data only.

### Queries, search and caching
- **Follows:** `Club.followers` (ids) and `Club.followerCount` move together. Change them only through the conditional updates in `toggleFollow` (and the `$inc` in account deletion), never with a bare `$pull`/`$addToSet`. List endpoints never select `followers`; they get `isFollowing` from one `Club.find({ followers: userId })` (`followedClubIds`). `utils/migrations.js` backfills the counter at startup for clubs saved before it existed.
- **Search:** `utils/search.js` `searchIds()` merges `$text` matches with a word-prefix regex, because `$text` matches whole stemmed words and "robo" would not find "Robotics". Use it for any new search box. `$text` and `$or` can't share a query when the `$or` fields are unindexed, which is why it runs two queries and merges ids.
- **Lists:** paginated endpoints share one contract: `?page=&limit=` in, `{ <items>, total, page, pages }` out (`/openings`, `/openings/:id/applicants`, `/applications/mine`; the last two also return per-status `counts` that ignore the status filter). `?limit=` alone is accepted by `/clubs` and `/events`. The applicant CSV export is deliberately unpaged.
- **`utils/memo.js`:** a 60 s in-process cache for data that is the same for every visitor (`/stats`, `/clubs/categories`, the assistant's openings and events digests). It is disabled under `NODE_ENV=test` unless `MEMO_IN_TESTS=1`. Anything that writes openings or events must call `invalidateMemo("openings:")` / `invalidateMemo("events:")`. Never memoise anything that varies per user.
- `compression` is mounted in `app.js` and skips `text/event-stream`; a compressor would buffer the AI chat.
- `llm.js` keeps the per-request user/feature for usage logging in `AsyncLocalStorage` (`withUsageContext`), not a module variable, so concurrent model calls (an answer streaming while a score is computed) are attributed correctly.

### Data
- Club content = `data/pec-clubs.json` (scraped) merged with `data/club-profiles.js` (hand-written "sell the club" content keyed by slug) at seed time. Club admins can edit it afterwards via `PUT /clubs/mine`.
- `/clubs/mine*` routes are declared before `/clubs/:slug`, so `mine` isn't read as a slug. Keep that order when adding routes.

### Frontend
- Import alias: `@/` → `src/`. All pages render inside `components/layout/AppLayout.jsx` through a single `createBrowserRouter` in `App.jsx`. Admin, assistant and profile pages are lazy-loaded. Route protection uses `<RequireAuth roles={[...]}>` from `components/layout/guards.jsx`.
- API calls go through the shared `api` axios instance (`lib/api.js`, base `/api/v1`, with credentials). Show errors with `errorMessage(err)`. In dev, Vite proxies `/api` to `VITE_BACKEND_URL`, so there is no CORS. In production, `VITE_API_URL` points at a separate API origin, and the backend `CLIENT_URL` must list the frontend origin.
- Redux only holds the auth user (`redux/authSlice.js`). Page data is fetched with `useFetch(url)` or `usePaged(url, itemsKey)` from `hooks/useFetch.js`, both backed by one TanStack Query cache (`lib/queryClient.js`, 30 s stale time). The `api` interceptor drops the whole cache after any successful non-GET (except `/ai/` and `/auth/otp/`), so a mutation never leaves a stale list behind; new write paths that bypass `api` (raw `fetch`) must call `queryClient.invalidateQueries()` themselves.
- `cdnImg(url, cssWidth)` in `lib/utils.js` adds Cloudinary `f_auto,q_auto,w_` to image URLs; use it for logos, covers and avatars. Uploads are capped at 1600 px by the server (`utils/cloudinary.js`).
- The chat stream stays open briefly after the `done` event to deliver follow-up chips, so `useChatStream` tags each send with a run id and ignores events from older runs.

## Docs caveat

`docs/architecture/`, `docs/system-design-patterns/` and `docs/syntax-patterns/` describe the **old job-portal code** (`Company`/`Job`, `isAuthenticated.js`, `utils/constant.jsx`). They don't match the current code, so trust the code. `TODO.md` is the original roadmap. `docs/plans/` has the current plans (`2026-09-28-hardening-plan.md`, mostly done; `2026-09-29-gaps-plan.md`, open work).

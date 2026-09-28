# Hardening plan: bugs and improvements after the Club/Opening rewrite

> Status as of 2026-09-28. Based on a read-through of `backend/` and `frontend/src/` after the
> Company/Job → Club/Opening rewrite. Line numbers are approximate; the code is still changing.

## Where things stand

The backend has been rebuilt on the new domain (`Club`, `Opening`, `club_admin`/`super_admin`,
OTP, AI assistant). Routing, validation and error handling are in good shape: every route goes
through `h()` (the async wrapper), bodies are validated with strict zod schemas, and
`errorHandler` maps `CastError`, `ValidationError` and multer's `LIMIT_FILE_SIZE` to 400.

What is left falls into four groups, in the order they should be done:

| Phase | Theme | Why this order |
|---|---|---|
| 1 | Make the app work end to end | Nothing else can be tested until the frontend talks to the new API |
| 2 | Security and privacy | Must be done before real students use it |
| 3 | Correctness bugs | Wrong numbers and data, but no data exposure |
| 4 | Operational improvements and docs | Makes the project maintainable and deployable |

Each task lists the file, the fix, and how to check it is done.

---

## Phase 1: Make the app work end to end

### 1.1 Point the frontend at the new API — **blocker**
- **Problem:** `frontend/src/utils/constant.jsx` still targets `/api/v1/user`, `/job`,
  `/company`, `/application`. The backend now serves `/auth`, `/users`, `/clubs`, `/openings`,
  `/applications`, `/events`, `/stats`, `/admin`, `/ai`. Every page is broken.
- **Fix:** part of the planned frontend rewrite (TODO Phase 3). Replace the four constants with
  one `API = \`${API_URL}/api/v1\`` and per-resource paths.
- **Done when:** register → login → browse clubs → apply → see it under My Applications works
  in the browser against a seeded database.

### 1.2 `isOpen` is missing from list responses
- **Problem:** `.lean({ virtuals: true })` needs the `mongoose-lean-virtuals` plugin, which is
  not installed. `listOpenings` (`opening.controller.js`) and `getClub` openings
  (`club.controller.js`) return no `isOpen`; `getOpening` and `myOpenings` only work because
  they compute it by hand.
- **Fix (pick one):**
  - `npm i mongoose-lean-virtuals` and `openingSchema.plugin(mongooseLeanVirtuals)`; or
  - drop `{ virtuals: true }` and add one helper `withIsOpen(o)` used by all four handlers.
    Preferred: no new dependency, one source of truth.
- **Done when:** `GET /api/v1/openings` returns `isOpen` on every item.

### 1.3 AI fallback wipes half a streamed answer
- **Problem:** `ai/llm.js` yields `{ type: "reset" }` on every `fallback` content block. Per the
  API, a **mid-stream** fallback keeps the text already streamed and continues from it; only a
  fallback that arrives before any text is a clean restart. The UI discards the first half.
- **Fix:** track whether any `text_delta` has been yielded yet. Emit `reset` only if none has;
  otherwise ignore the marker (optionally emit a `status` event).
- **Done when:** a unit test feeding a fake event stream `[text, fallback, text]` yields both
  texts and no reset.

---

## Phase 2: Security and privacy

### 2.1 Private `adminNote` leaks to students
- **Problem:** `getOpening` returns the student's full `myApplication`, and `withdraw` returns
  the full `application`; both include `adminNote`. Only `myApplications` excludes it.
- **Fix:** mark the field `select: false` in `application.model.js` and add
  `.select("+adminNote")` in the admin-only queries (`loadApplicants`, `updateStatus`,
  `myDashboard.recent`, AI applicant summary). This fixes current and future leaks at once.
- **Done when:** no student-facing response contains `adminNote` (add a test for `getOpening`
  and `withdraw`).

### 2.2 CSV formula injection in applicant export
- **Problem:** `toCsv` in `utils/http.js` does not neutralize cells starting with `=`, `+`, `-`,
  `@`, tab or CR. A student can put `=HYPERLINK(...)` in a name or answer and it executes when
  the club admin opens the export in Excel.
- **Fix:** in `cell()`, if the string matches `/^[=+\-@\t\r]/`, prefix it with `'`.
- **Done when:** a test row with name `=1+1` exports as `'=1+1`.

### 2.3 CSRF exposure in production
- **Problem:** `middlewares/auth.js` sets `sameSite: "none"` in production and
  `express.urlencoded` is enabled, so any site can submit a form that applies, withdraws or
  changes status as the logged-in user.
- **Fix (preferred):** deploy frontend and API on the same site (for example a Vercel rewrite of
  `/api/*` to the backend) and keep `sameSite: "lax"` everywhere. **Otherwise:** drop
  `express.urlencoded` (multipart is handled by multer) and require
  `Content-Type: application/json` or a custom header (`X-Requested-With`) on state-changing
  routes, which a cross-site form cannot send.
- **Done when:** a plain HTML form POST from another origin to `/api/v1/applications/...` is
  rejected.

### 2.4 Sessions survive password changes and role changes
- **Problem:** the JWT carries `role` and `club`, and nothing re-checks them. A stolen cookie
  stays valid for up to 24 h after a password reset; a removed club admin keeps access.
- **Fix:** add `tokenVersion: Number` (default 0) to `User`; include it in the token; increment it
  on password reset/change and on any role or club change. In `isAuthenticated`, load
  `tokenVersion role club mustChangePassword` (one indexed `findById`, `.lean()`) and reject a
  mismatch with 401. Take `role`/`club` from the DB, not the token.
- **Done when:** after `password/change`, the old cookie gets 401.

### 2.5 `mustChangePassword` is not enforced on the server
- **Problem:** seeded club admins can use the whole API without ever changing the password;
  only the frontend is meant to redirect them.
- **Fix:** in `isAuthenticated` (using the lookup from 2.4), if `mustChangePassword` is true,
  allow only `GET /auth/me`, `POST /auth/logout` and `POST /auth/password/*`; return
  `403 { code: "MUST_CHANGE_PASSWORD" }` otherwise.
- **Done when:** a seeded admin gets 403 on `GET /clubs/mine` until they change the password.

### 2.6 OTP rate limit shared by all users on `change_password`
- **Problem:** `otpByEmail` keys on `req.body.email`. `change_password` requests send no email,
  so every user shares the key `otp:` — 3 requests per 15 min for the whole site.
- **Fix:** key on `req.id` when present: `` req.id ? `otp:user:${req.id}` : `otp:${email}` ``.
- **Done when:** two different logged-in users can each request a change-password code.

### 2.7 Account enumeration by response time
- **Problem:** `requestOtp` awaits `sendMail` only when the account exists. SMTP takes seconds,
  so response time reveals which emails are registered despite the identical message.
- **Fix:** don't await the send: `issueOtp(...).catch((e) => console.error("OTP mail failed", e))`.
  (Login has the same, smaller, timing gap; acceptable with the rate limiter.)
- **Done when:** response time for a known and an unknown email differ by < 100 ms locally.

### 2.8 Email ownership is never verified
- **Problem:** `STUDENT_EMAIL_DOMAIN` checks the domain, but `verify_email` has no flow and
  `emailVerified` is never set. Anyone can register with another student's `@pec.edu.in`.
- **Fix:** after register, send a `verify_email` OTP; add `POST /auth/email/verify`; require
  `emailVerified` in `apply` (403 with a clear message). Seeded accounts are marked verified.
- **Done when:** an unverified student cannot apply; verifying unlocks it.

---

## Phase 3: Correctness bugs

### 3.1 Dashboard chart is off by one day
- **Problem:** `myDashboard` groups with `$dateToString` in UTC but builds `since` from local
  midnight and keys with `toISOString()`. With the server in IST the 14 bars are shifted.
- **Fix:** pass `timezone: "Asia/Kolkata"` to `$dateToString`, and build the day keys with
  `toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })`.
- **Done when:** an application created at 00:30 IST counts on that IST day.

### 3.2 Dashboard crashes for an admin with no club
- **Problem:** `new mongoose.Types.ObjectId(String(req.clubId))` throws on `null` → 500.
- **Fix:** add the same `if (!req.clubId) throw new HttpError(404, ...)` guard as `getMyClub`.

### 3.3 CSV answers can land under the wrong question
- **Problem:** the export maps `opening.questions[i]` to `answers[i]`. If an admin edits the
  questions after students have applied, answers appear under the wrong headings.
- **Fix:** match by question text (`answers.find(a => a.question === q)`), and in
  `updateOpening` reject changes to `questions` once an application exists (same rule as
  delete).

### 3.4 Decide: can a student re-apply after withdrawing?
- **Problem:** the unique `{opening, applicant}` index blocks re-applying forever.
- **Decision needed.** If yes: in `apply`, if a `withdrawn` application exists and the opening
  is still open, reset it to `pending` with the new answers instead of creating one.

### 3.5 `memberCount` is self-reported and drives the "popular" sort
- **Problem:** club admins can set any value up to 5000 and top the ranking.
- **Fix (pick one):** make it super-admin-only, or sort "popular" by followers and accepted
  applications instead.

### 3.6 `dbName` always overrides the database in `MONGO_URI`
- **Problem:** the comment in `utils/db.js` says `MONGO_DB` is only a fallback; Mongoose's
  `dbName` actually always wins. Existing data in another database will look like it vanished.
- **Fix:** pass `dbName` only when `MONGO_DB` is set, and correct the comment.

### 3.7 Minor
- `toggleFollow` doesn't lowercase the slug; `getClub` does. Lowercase in both.

---

## Phase 4: Operational improvements and docs

### 4.1 `.env.example` is out of date
It lists only the original variables. The code also reads:
`MONGO_DB`, `NODE_ENV`, `STUDENT_EMAIL_DOMAIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `MAIL_FROM`, `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_SMALL_MODEL`, `AI_HOURLY_LIMIT`,
`AI_GUEST_HOURLY_LIMIT`, `ADMIN_EMAIL_DOMAIN`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
Add each with a comment saying whether it is required.

### 4.2 API tests
`vitest` + `supertest` + `mongodb-memory-server`, no test script today. Start with the areas
where the bugs above live:
1. auth: register, login, logout, expired cookie → 401
2. OTP: request, wrong code counts attempts, reset, change (2.4, 2.6)
3. apply / withdraw / duplicate apply / closed opening
4. ownership: admin A cannot read or change club B's openings, applicants or statuses
5. privacy: `adminNote` never in student responses (2.1)
6. CSV escaping (2.2)

### 4.3 Indexes
- `Application { club: 1, status: 1, createdAt: -1 }` for the dashboard and applicant lists.
- `Opening { status: 1, deadline: 1 }` for every "open openings" query.

### 4.4 Observability
- Request logging with `pino-http` (JSON in production, pretty in dev).
- `/api/health` should report the Mongo connection state (`mongoose.connection.readyState`),
  not just `ok`.

### 4.5 Scraper politeness
`scripts/scrape-pec.js` rate-limits and caches but does not check `robots.txt`, which the TODO
asks for. Fetch it once and skip disallowed paths.

### 4.6 Frontend lint
The existing code has 9 ESLint errors (unused imports, missing prop-types). Fix them during the
frontend rewrite and add `npm run lint` to CI.

### 4.7 Docs
The architecture, pattern and syntax docs still describe the pre-rewrite Company/Job code.
- Rewrite `architecture/03`, `04`, `05`, `06` for the new routes, models and auth.
- Rename ClubSpot → JoinClub in `docs/README.md`, the pattern READMEs, and `architecture/01`,
  `07`; remove the "Note on AIAAS reference" section.
- Fix the broken link `06-repository.md` → `06-repository-service.md`.
- Replace `frontend/README.md` (still the Vite template).
- Note that Mongo transactions need a replica set (Atlas is fine; a plain local `mongod` is not).

---

## Resolved since the first review (for reference)

- Routes rewired to the new controllers; server boots.
- `import "dotenv/config"` is first in `index.js`, so Cloudinary and AI settings load.
- Every route wrapped in `h()`; async errors reach `errorHandler`.
- Strict zod schemas on every write route (blocks mass assignment such as moving an opening to
  another club, and admins setting `withdrawn`); answer length capped at 4000.
- `errorHandler` maps `ValidationError` and `LIMIT_FILE_SIZE` to 400.
- `helmet`, 200 kb body limit, `/api/health`, `trust proxy` for rate limiting.

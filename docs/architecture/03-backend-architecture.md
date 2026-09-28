# 03 · Backend architecture

```
index.js        loads .env, connects to Mongo, starts app
app.js          middleware chain + routers (importable by tests)
routes/         one file per resource; zod `validate()` on every body; `h()` async wrapper
controllers/    request handlers; throw HttpError(status, message)
middlewares/    auth (isAuthenticated, optionalAuth, requireRole), rateLimits, multer, errorHandler
model/          Mongoose schemas
ai/             llm.js (Anthropic SDK), context.js, sse.js, demo.js, modes/{helpdesk,checker,interview}
utils/          db, http (HttpError, asyncHandler, toCsv), mailer, cloudinary, password, logger
scripts/        scrape-pec.js, seed.js, check-llm-wiring.js
tests/          node:test + supertest (own in-memory MongoDB, throwaway joinclub_test_<pid> DB per run)
```

Middleware order in `app.js`: request logger → helmet → CORS (`CLIENT_URL`) → JSON body (200 kb)
→ cookies → **CSRF guard** (non-GET needs `X-Requested-With: XMLHttpRequest`) → routers →
`/api` 404 → `errorHandler`.

`errorHandler` maps `CastError` → 400, duplicate key → 400, Mongoose `ValidationError` → 400,
multer errors → 400, and passes `err.code` (e.g. `MUST_CHANGE_PASSWORD`, `EMAIL_NOT_VERIFIED`).

Ownership: every club-admin write calls `assertOwnsClub(req, clubId)`; role and club come
from the database on each request, not from the token.

## AI (`ai/`)
- `llm.js` is the only file that talks to Claude: `streamText()` (streaming, adaptive
  thinking, `fallbacks: "default"` on Opus-tier models) and `generateJSON()` (structured
  output via zod). Defaults: `AI_MODEL=claude-opus-5`, `AI_SMALL_MODEL=claude-haiku-4-5`
  (follow-up chips, per-answer interview scores).
- The system prompt (and the club catalog, prompt-cached) never changes within a session; the
  changing facts (date, openings, the student's own applications) go in the user turn.
- Interview progress lives in `ChatSession.meta`; the server tells the model which step to take.
- No `ANTHROPIC_API_KEY` → `demo.js` answers from the database with simple rules.
- `node scripts/check-llm-wiring.js` checks request shapes against a local fake API.

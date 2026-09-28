# Performance plan: queries, payloads, AI latency and assets

> Status as of 2026-09-29. Companion to `2026-09-28-hardening-plan.md` and
> `2026-09-29-gaps-plan.md`. Nothing here is urgent at today's size (about 40 clubs, a few
> hundred applications). Phases 1 and 2 are the ones that get worse as students, followers
> and recruitment seasons pile up, so do them before launch.

## Summary

| Phase | Theme | Items | Size | Why this order |
|---|---|---|---|---|
| 1 | Database queries | 1.1 – 1.4 | ~1 day | Backend only, small diffs, the existing tests cover them |
| 2 | Payloads and pagination | 2.1 – 2.4 | 1 – 2 days | Changes the API shape, so the frontend changes in the same PR |
| 3 | AI latency and cost | 3.1 – 3.4 | ~1 day | Users feel it on every chat message |
| 4 | Uploads and images | 4.1 – 4.2 | ½ day | Independent; do it whenever |
| 5 | Frontend data layer and cleanup | 5.1 – 5.3 | ~1 day | Easier once the API shapes from Phase 2 are settled |

Not planned: reading the user from the database on every authenticated request
(`middlewares/auth.js`). It is deliberate, so role changes apply immediately, and it is a
lookup by `_id`. Revisit only if profiling shows it matters.

Decisions needed are collected in the last section.

---

## Phase 1: Database queries

### 1.1 Add the missing indexes
- **Gap:** several hot queries sort or filter on fields that have no index. Hardening plan 4.3
  added two; these are still missing.
- **Fix:** in the models:
  - `Opening { club: 1, status: 1, deadline: 1 }`: club page, `openCountsByClub`, dashboard
  - `Event { club: 1, date: 1 }`: club page, dashboard, admin events
  - `Application { applicant: 1, createdAt: -1 }`: My Applications, assistant `userDigest`.
    Then remove the single-field `applicant` index, which this one makes redundant.
  - `ChatSession { user: 1, updatedAt: -1 }`: history sidebar (replaces the single `user` index)
  - `ChatMessage { session: 1, createdAt: 1 }`: loading a chat (replaces the single `session` index)
  - `User { role: 1 }`: `siteStats` student count
  - `Club { followers: 1 }` (multikey): needed by 1.3
- Add `scripts/check-indexes.js`. It runs `.explain()` on each query above against seeded data
  and fails if any query plan contains a `COLLSCAN`.
- **Done when:** `node scripts/check-indexes.js` passes after `npm run seed`.

### 1.2 Club page: run every query in parallel
- **Gap:** `getClub` ([club.controller.js](../../backend/controllers/club.controller.js)) runs six
  queries in parallel, then three more one after another: the student's own applications, the
  applicant counts, and the open counts for related clubs. It also counts applications twice
  (total and accepted).
- **Fix:**
  - All three follow-up queries depend only on `club._id`, not on the first batch's results.
    Replace `$in: openings.map(...)` with `{ club: club._id, opening-is-open }` (or a
    `$lookup`) and move them into the first `Promise.all`.
  - Replace the two `countDocuments` calls with one `$group` by status.
- **Done when:** `getClub` makes one DB round trip after the club lookup. The club-page
  response is unchanged (add a test that snapshots its keys).

### 1.3 Stop loading follower arrays to count them
- **Gap:** `followers` is an array inside each club, and `CARD_FIELDS` selects it. Every club
  list, the Home page and the related-clubs section download every follower ID of every club,
  only to compute `followerCount` and `isFollowing`. `toggleFollow` also loads the whole
  array to check one ID.
- **Fix:**
  - Add `followerCount: { type: Number, default: 0, index: true }` to `Club`.
  - `toggleFollow` becomes two atomic, idempotent updates:
    - follow: `updateOne({ _id, followers: { $ne: uid } }, { $addToSet: { followers: uid }, $inc: { followerCount: 1 } })`
    - unfollow: `updateOne({ _id, followers: uid }, { $pull: { followers: uid }, $inc: { followerCount: -1 } })`
    - Read `modifiedCount` to learn the new state. No read before the write.
  - Remove `followers` from `CARD_FIELDS`. Compute `isFollowing` for a whole list with one query:
    `Club.find({ followers: req.id }).distinct("_id")` (uses the 1.1 multikey index).
  - The `popular` sort then uses `followerCount` directly and can move into the DB query.
  - Backfill once: `Club.updateMany({}, [{ $set: { followerCount: { $size: "$followers" } } }])`.
    Put it in the seed script, which runs this on every re-seed.
  - The frontend already reads `followerCount` and `isFollowing`, so no UI change is needed.
- **Done when:** club list responses contain no `followers` field. Following twice in a row
  leaves the count at +1 (add a test).
- See the decision on a separate `Follow` collection below.

### 1.4 Use the text indexes that already exist
- **Gap:** `club_text` and `opening_text` are defined, but nothing queries them.
  - `listClubs`, `listOpenings` and the assistant's `relevantClubs` search with
    case-insensitive regex across 3 – 7 fields. That scans the whole collection every time.
  - `relevantClubs` also ranks results by running `JSON.stringify` on each club.
- **Fix:**
  - **Openings and `relevantClubs`:** switch to `{ $text: { $search } }` with
    `{ score: { $meta: "textScore" } }` and sort by score. Delete the `JSON.stringify` ranking.
  - **Club search box:** `$text` matches whole words only, so typing "robo" would not find
    "Robotics". Run `$text` first. If the query is one short word, also run an anchored prefix
    regex (`^robo`, case-insensitive) on `name` and `shortName`, then merge the results. See the
    decision below.
- **Done when:** the `check-indexes.js` explain step shows `TEXT` stages for openings and
  assistant search. Searching "robo" on `/clubs` still finds Robotics. Existing tests pass.

---

## Phase 2: Payloads and pagination

### 2.1 A `limit` parameter, and a lighter Home page
- **Gap:** Home sends 5 requests and gets back every club (with follower arrays), up to 100
  openings (with applicant counts) and up to 60 events. It then displays 8, 6 and 4 of them.
- **Fix:**
  - Accept `?limit=` (capped at 50) on `/clubs`, `/openings` and `/events`.
  - Home requests `limit=8`, `6` and `4`.
  - Optional later: a single `GET /api/v1/home` that returns all five sections in one response.
- **Done when:** the Home page's total JSON is under ~30 KB with seeded data (measure in the
  browser Network tab before and after).

### 2.2 Paginate the lists that grow
- **Gap:**
  - `listOpenings` stops at 100 without telling anyone.
  - Applicant lists and My Applications return everything.
  - Clubs are bounded (PEC has about 50), so they do not need pages. 1.3 and 2.1 are enough.
- **Fix:** one contract for every paginated list:
  - Request: `?page=1&limit=20`.
  - Response: `{ <items>, total, page, hasMore }`.
  - Endpoints: `GET /openings`, `GET /openings/:id/applicants`, `GET /applications/mine`.
  - The CSV export stays unpaginated. It is the "give me everything" path.
  - Frontend: a "Load more" button (see decision) and a `usePaged(url)` hook next to `useFetch`.
- **Done when:** with 300 seeded applicants on one opening, the applicants page loads 20 at a
  time. The Openings page shows openings beyond the 100th.

### 2.3 Applicants page: one request, server-side search and counts
- **Gap:**
  - [Applicants.jsx](../../frontend/src/pages/admin/Applicants.jsx) fetches the filtered list and
    the full list, just to count statuses.
  - Every search keystroke (after the debounce) refetches everything with full profiles.
  - `loadApplicants` loads every applicant, then filters by the search text in JavaScript.
- **Fix:**
  - The applicants endpoint returns `counts` (one `$group` by status on
    `{ opening }`) alongside the page from 2.2.
  - **Search:** first find the matching user IDs among this opening's applicants
    (`User.find({ _id: { $in: applicantIds }, $or: [name/email/branch/skills regex] })`), then
    filter applications by `applicant: { $in }`. Or use a single `$lookup` pipeline.
  - The frontend drops the second `useFetch`.
- **Done when:** the page makes one request per filter change, and the counts stay correct
  while searching.

### 2.4 Cache the public numbers; compress responses
- **Gap:** `/stats` runs 5 counts and `/clubs/categories` runs an aggregate on every request,
  with no cache. There is no `compression` middleware.
- **Fix:**
  - Add a tiny `memo(key, ttlMs, fn)` helper in `utils/`. Cache `/stats` and
    `/clubs/categories` for 60 s. Send `Cache-Control: public, max-age=60` on those two only.
  - `/clubs` and `/openings` vary per user (`isFollowing`, `myStatus`), so they must not get
    public caching.
  - Add `compression`, with a filter that **skips `text/event-stream`**, so AI chat streaming
    is not buffered. Skip this if the chosen host already compresses responses; check after
    deploying.
- **Done when:** repeated `/stats` calls within 60 s hit the database once. JSON responses
  carry `Content-Encoding: gzip` (or `br`). The AI chat still streams word by word.

---

## Phase 3: AI latency and cost

Measure before and after with the usage logging from gaps plan 3.2. Record `usage` and the
time to the first chunk and to `done`.

### 3.1 Don't make the student wait for follow-up chips
- **Gap:** after streaming an answer, `runHelpdesk` waits for a second model call (the follow-up
  chips) before sending `done`. The input stays disabled until then.
- **Fix:**
  - Send `done` as soon as the answer is saved.
  - Then generate the suggestions, send a `suggestions` event, and update the saved
    `ChatMessage` with `updateOne`.
  - `useChatStream` must keep reading after `done` until the stream closes, and re-enable the
    input on `done`, not on close.
- **Done when:** the input re-enables right after the text finishes, and the chips appear a
  moment later. Update the demo-mode test to expect `suggestions` after `done`.

### 3.2 Score interview answers in parallel with the next question
- **Gap:** `runInterview` waits for the scoring call before it starts streaming the next
  question. The score is only needed for the final report.
- **Fix:**
  - Start the scoring promise first, stream the interviewer's reply, then `await` the score
    before pushing it into `meta.scores`.
  - On the last question, await the score before building the report.
  - Do the same in the demo path.
- **Done when:** the next question starts streaming without waiting for the score. Reports
  still contain every score.

### 3.3 Cache the shared parts of the helpdesk context
- **Gap:** every helpdesk message runs 4 – 5 queries. `openingsDigest` and `eventsDigest` are the
  same for every student.
- **Fix:**
  - Cache both for 60 s with the `memo` helper from 2.4.
  - Invalidate them from `createOpening`, `updateOpening`, `deleteOpening`, `createEvent` and
    `deleteEvent`, the same way `invalidateCatalog()` already works.
  - `userDigest` and `relevantClubs` stay per request.
- **Done when:** a second message within a minute runs only the per-user queries.

### 3.4 Prompt-cache the conversation, not just the catalog
- **Gap:** only the helpdesk system prompt has a cache breakpoint.
  - Multi-turn chats resend the whole history uncached.
  - The interview system prompt (constant for a session) has no breakpoint at all.
- **Fix:**
  - Put a `cache_control` breakpoint on the last message of `prior` (the history) in both
    modes.
  - Put one on `interviewSystem(meta)`.
  - Check that the cached prefixes meet the model's minimum cacheable length. Short interview
    prompts may not.
- **Done when:** the usage log shows `cache_read_input_tokens > 0` on the third turn of a
  helpdesk chat and the second turn of an interview.

---

## Phase 4: Uploads and images

### 4.1 Stream uploads; cap image size on upload
- **Gap:** `uploadFile` turns each file into a base64 data URI in memory, a third bigger than
  the file. Cloudinary stores the original full-size image.
- **Fix:**
  - Use `cloudinary.uploader.upload_stream` with the multer buffer.
  - For images, add an incoming transformation `{ width: 1600, height: 1600, crop: "limit" }`.
    PDFs are unchanged.
  - Delete `utils/datauri.js` and the `datauri` dependency once nothing uses them.
- **Done when:** uploading a 5 MB photo stores an image at most 1600 px wide. Avatar, resume,
  logo and cover uploads still work.

### 4.2 Serve images at the size they are shown
- **Gap:** logos (shown at 40 – 96 px) and avatars are delivered full size.
- **Fix:**
  - Add a frontend helper `cdnImg(url, width)`. For Cloudinary URLs only, it inserts
    `f_auto,q_auto,w_<width*2>` after `/upload/`. `pec.ac.in` and DiceBear URLs pass through
    unchanged.
  - Use it in `ClubCard`, the navbar avatar, the club page header and applicant rows.
  - Add `loading="lazy"` to images below the fold.
- **Done when:** club-card logos from Cloudinary download at under 15 KB each.

---

## Phase 5: Frontend data layer and cleanup

### 5.1 Shared request cache
- **Gap:** `useFetch` refetches on every page visit, and there is no deduplication. The
  Assistant page loads `/clubs?sort=name` in two components and `/ai/status` in two places.
- **Fix:**
  - Add TanStack Query.
  - Re-implement `useFetch` on top of `useQuery` (key = URL, `staleTime` 30 s), keeping the same
    return shape (`data, setData, loading, error, reload`), so no page changes at first.
    `setData` maps to `queryClient.setQueryData`.
  - Build `usePaged` from 2.2 on `useInfiniteQuery`.
- **Done when:** going Home → Clubs → Home makes no second `/stats` request, and the Assistant
  page makes one `/clubs` request.

### 5.2 Faster password hashing
- **Gap:** `bcryptjs` is pure JavaScript, so login, signup and every OTP hash tie up the
  server's single thread for about 50 – 100 ms each at cost 10.
- **Fix:**
  - Switch to `bcrypt` (native, with prebuilt binaries) or `@node-rs/bcrypt`. Existing `$2a$`
    and `$2b$` hashes stay valid.
  - Update the imports in the controllers, `seed.js` and `tests/api.test.js`.
- **Done when:** `npm test` passes, and existing seeded logins still work without re-seeding.

### 5.3 Small cleanups
- Remove the unused `react-icons` dependency.
- Run `npx update-browserslist-db@latest` (the build warns that its browser data is out of date).
- Record the production bundle sizes here after Phase 5, so later changes have a baseline.
  Current build: react 75 KB, ui 53 KB, app 56 KB, chat window 50 KB (lazy-loaded), all
  gzipped.

---

## Testing

- Every phase keeps `npm test` green. New tests to add:
  - follow and unfollow are idempotent and keep the count right (1.3)
  - search finds a club by word and by prefix (1.4)
  - pagination returns `total` and `hasMore`, and page 2 differs from page 1 (2.2)
  - applicant `counts` are correct under a search filter (2.3)
  - demo chat sends `suggestions` after `done` (3.1)
- `scripts/check-indexes.js` (1.1) guards against query-plan regressions.
- For before/after numbers, seed with `npm run seed -- --reset`, then compare response sizes
  and times in the browser Network tab for Home, `/clubs`, a club page and the applicants page.

## Decisions needed

1. **Followers (1.3):** keep the `followers` array inside `Club` with a counter (recommended
   for now; fine up to tens of thousands of followers per club), or move to a separate `Follow`
   collection (`{ user, club }`, unique)? The collection scales without limit and makes "clubs I
   follow" cheap, but it is a bigger change.
2. **Club search (1.4):** `$text` plus a name-prefix fallback (recommended), or keep regex for
   clubs only, since the collection stays around 50 documents?
3. **Pagination UI (2.2):** a "Load more" button (recommended; simplest with infinite queries)
   or numbered pages?
4. **TanStack Query (5.1):** OK to add a dependency? The alternative is a small in-memory cache
   inside `useFetch`. That is less code to add, but gives no infinite queries and no
   invalidation helpers.

# JoinClub PEC: Implementation TODO

> **Status, 29 Sep 2026:** everything below is implemented except the unticked items
> (voice answers, status-change emails, pagination, deployment, answer regenerate, a daily AI token budget). Some items were done differently
> from the plan: tests use `node:test` + supertest against a local MongoDB instead of vitest +
> mongodb-memory-server, and AI uses the Anthropic SDK instead of OpenRouter. Follow-up work is
> tracked in `docs/plans/`.

Stack stays as it is: **Express + MongoDB (Mongoose)** backend, **React + Vite + Tailwind + shadcn/Redux** frontend.
Work top to bottom. Each phase leaves the app runnable.

---

## Phase 0: Fix the foundation (do this first)

The code is a job-portal clone (`Company`, `Job`, `recruiter`). Several bugs will get in the way of everything below.

### 0.1 Bugs to fix
- [x] `middlewares/isAuthenticated.js`: the `catch` only logs, so a bad or expired token leaves the request hanging. Return `401`.
- [x] Every controller `catch` only does `console.log`, so the request never gets a response. Add a shared `asyncHandler` plus an error middleware in `index.js` that returns `500` JSON.
- [x] `job.controller.js` `postJob`: the `400`/`403` branches have no `return`, so it still creates the job and then crashes on a double send.
- [x] `job.controller.js` `getAllJobs`: searches `description`, but the field is spelled `discription`. Rename the field to `description` everywhere (models, controllers, frontend).
- [x] `user.controller.js` `UpdateProfile`: finds the user by the email in the request body, not by `req.id`, and never calls `save()`. Rewrite it.
- [x] `user.controller.js` `register`: `phoneNumber` is not in the schema, so it is silently dropped. Add it to `user.model.js`.
- [x] `company.controller.js` `updateCompany`: references an undefined `file`, so every call crashes.
- [x] `application.controller.js`: `getApplicants` and `updateStatus` don't check that the admin owns that club. Any logged-in user can accept or reject anyone. Add ownership checks.
- [x] `applyJob` returns `201` with `success:false` for recruiters. Use `403`.
- [x] `redux/store.js`: `companySlice` is imported from `./clubSlice`. Import it from `./companySlice`.
- [x] `Signup.jsx`: typo `formdata.append` should be `formData.append`, so the photo upload always throws.
- [x] `Login.jsx` / `Signup.jsx`: native radios are mixed with a stray Radix `RadioGroupItem`. Use one radio implementation.
- [x] `ClubDescription.jsx`: reads `job?.company?.name` from a prop that is never passed. Use `singleClub.company`. Remove the repeated "Club Detail 1" rows.
- [x] `utils/constant.jsx`: hard-coded `localhost:8000`. Move to `import.meta.env.VITE_API_URL`. Do the same for the CORS origin in the backend (`CLIENT_URL` env var).
- [x] Remove unused or junk dependencies: `expres`, `i`. Move `nodemon` to devDependencies.

### 0.2 Rename the domain to match clubs
Do this once, now, before the seed data and new UI depend on the old names.

| Old | New | Notes |
|---|---|---|
| `Company` model | `Club` | |
| `Job` model | `Opening` | a recruitment drive or open position in a club |
| `Application.job` | `Application.opening` | |
| role `recruiter` | role `club_admin` | also add `super_admin` for you |
| routes `/company`, `/job` | `/clubs`, `/openings` | |

- [x] **Club** fields: `name`, `slug`, `category` (`technical` / `cultural` / `sports` / `social` / `editorial` / `other`), `tagline`, `about`, `logo`, `banner`, `email`, `website`, `socials {instagram, linkedin}`, `foundedYear`, `facultyAdvisor`, `admins[]`, `sourceUrl` (the PEC page it was scraped from).
- [x] **Opening** fields: `title`, `description`, `requirements[]`, `positions`, `deadline`, `mode` (`recruitment` / `workshop` / `event`), `questions[]` (the club's application questions), `club`, `createdBy`, `status` (`open` / `closed`).
- [x] **Application** fields: add `answers[{question, answer}]` and an optional `aiFeedback` (used in Phase 4).
- [x] Remove `salary` and "Part Time" (job-portal leftovers).
- [x] Add route guards: `requireRole('club_admin')` and `requireClubAdmin(clubId)`.

---

## Phase 1: Real PEC data + dummy data + admin accounts

### 1.1 Scrape the PEC website
Pages to start from:
- https://pec.ac.in/cultural-clubs (Art & Photography, Music, Dramatics, SAASC, Projection & Design, Rotaract, CIM Cell, English/Hindi/Punjabi Editorial Boards, E-Cell, Student Counselling Cell)
- https://pec.ac.in/students/technical-societies (IEEE, ASME, and others)
- https://pec.ac.in/tnp/student-activities (NCC, sports, fests)
- Each club's own page, e.g. https://pec.ac.in/rotaract-club

Tasks:
- [x] `backend/scripts/scrape-pec.js` using `axios` + `cheerio`. Crawl the index pages, follow each club link, and extract name, description text, logo/image URL, contact email, faculty advisor if listed, and the page URL.
- [x] Be polite: 1 request per second, a clear `User-Agent`, check `robots.txt`, and cache the raw HTML in `scripts/.cache/` so re-runs don't hit the site again.
- [x] Write the result to `backend/data/pec-clubs.json` and **commit that JSON**. The seed script reads the JSON, never the live site, so seeding works offline and doesn't break when PEC changes its HTML.
- [x] Hand-review the JSON: fix categories and trim boilerplate text. Short descriptions are fine to hand-write where the page is thin.
- [x] Club logos: keep the PEC image URL if one exists, otherwise use a generated initials avatar (e.g. `https://api.dicebear.com/9.x/initials/svg?seed=<name>`).

### 1.2 Seed script with dummy data
- [x] `backend/scripts/seed.js` (`npm run seed`, plus `npm run seed -- --reset` to wipe first). Use `@faker-js/faker` with the `en_IN` locale and a fixed seed so every run gives the same data.
- [x] Creates:
  - all scraped clubs
  - 1 admin per club (see 1.3)
  - ~150 students with realistic PEC-style SIDs (e.g. `2202xxxx`), branches (CSE, ECE, EE, ME, CE, Aero, Production, Metallurgy, Data Science), years, bios and skills
  - 1 to 3 openings per club (mix of open, closed, and closing soon), each with 2 to 3 application questions
  - ~400 applications with mixed `pending` / `accepted` / `rejected` status and filled-in answers
  - a few upcoming events per club (if the Event model from Phase 3 exists by then)
- [x] The script must be idempotent: upsert by `slug` or email, never create duplicates.

### 1.3 Admin account per club + CSV
- [x] The seed creates one `club_admin` per club: email `<club-slug>.admin@joinclub.pec` (or the club's real email if you prefer), a **random 12-character password** from `crypto.randomBytes`, stored bcrypt-hashed.
- [x] Write `backend/output/club-admin-credentials.csv` with columns `club_name,club_slug,admin_name,email,password,login_url`.
- [x] Add `output/` to `.gitignore`. **Never commit this file**; it contains plain-text passwords. Share it with club heads privately.
- [x] Add a `mustChangePassword: true` flag on these accounts. On first login, redirect to a "set new password" screen (uses the OTP flow from Phase 2).
- [x] Create one `super_admin` account for you, with its password from `SUPER_ADMIN_PASSWORD` in `.env`.

---

## Phase 2: Email OTP (change or reset password)

Simple, no third-party auth provider.

### Backend
- [x] `npm i nodemailer express-rate-limit`. Send with Gmail SMTP using an **App Password** (or Brevo/Resend free tier). New env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
- [x] `utils/mailer.js`: one `sendMail({to, subject, html})` function plus a small HTML template for the OTP email.
- [x] `model/otp.model.js`: `{ email, purpose: 'reset_password' | 'change_password' | 'verify_email', codeHash, attempts, expiresAt }` with a TTL index on `expiresAt` so MongoDB deletes expired OTPs on its own.
- [x] 6-digit code from `crypto.randomInt`, **stored hashed** (bcrypt), valid for 10 minutes, at most 5 wrong attempts, and a new code replaces the old one.
- [x] Routes:
  - `POST /api/v1/auth/otp/request` `{email, purpose}`: always responds "if the account exists, we sent a code", so it doesn't reveal which emails are registered.
  - `POST /api/v1/auth/otp/verify` `{email, purpose, code}`: returns a short-lived (10 min) `resetToken` JWT.
  - `POST /api/v1/auth/password/reset` `{resetToken, newPassword}`: sets the password and clears `mustChangePassword`.
  - `POST /api/v1/auth/password/change` (logged in) `{code, newPassword}`: OTP sent to the user's own email.
- [x] Rate-limit OTP requests: 3 per 15 minutes per email and per IP.
- [x] In dev, when SMTP isn't configured, log the OTP to the console instead of sending it.

### Frontend
- [x] "Forgot password?" link on Login leading to a 3-step page: email, 6-box OTP input (auto-advance, paste support, resend button with a 60 s countdown), new password with confirmation and a strength hint.
- [x] Profile page, Security section: a "Change password" dialog using the same OTP component.
- [x] Forced "set new password" screen for `mustChangePassword` accounts.
- [x] Optional: verify email on signup, allowing only `@pec.edu.in` addresses for students.

---

## Phase 3: Design overhaul

### 3.1 Design system
- [x] Pick a palette from PEC's identity (deep navy as primary, a warm red/maroon accent, neutral grays). Define it as shadcn CSS variables in `index.css` (`--primary`, `--accent`, `--muted`, …) so every component follows it.
- [x] Dark mode: `next-themes` is already installed but unused. Add a theme toggle in the navbar.
- [x] Typography: one display font plus one body font from Google Fonts (e.g. *Plus Jakarta Sans* / *Inter*), with a consistent type scale.
- [x] Add the missing shadcn components: `select`, `tabs`, `textarea`, `dropdown-menu`, `skeleton`, `sheet` (mobile nav), `tooltip`, `progress`, `separator`, `input-otp`.
- [x] Layout: a shared `<AppLayout>` with Navbar + Footer + `<Outlet/>` instead of every page rendering `<Navbar/>` itself.

### 3.2 Pages
- [x] **Navbar**: sticky, blurred background, mobile hamburger (`Sheet`), the real user avatar instead of the shadcn placeholder image, role-aware links, theme toggle.
- [x] **Home**:
  - hero with a working search (routes to `/clubs?q=`), a tagline, and a campus photo or illustration
  - category chips (Technical, Cultural, Sports, …)
  - a live stats strip (number of clubs, open openings, students)
  - "Recruiting now" carousel of open openings with deadline badges
  - featured clubs grid
  - "How it works" in 3 steps
  - a proper footer (links, PEC address, socials)
- [x] **Clubs listing** (`/clubs`): the currently empty `Filtercard` becomes a real sidebar (category, recruiting only, sort). Add search, a responsive grid (1/2/3 columns), club cards with logo, category badge and "Recruiting" pill, skeleton loaders, and an empty state. Keep filters in the URL query string.
- [x] **Club detail** (`/clubs/:slug`): banner + logo header, About, Open openings (each with Apply), Past events, Team/admins, contact and socials, and a "Source: pec.ac.in" link.
- [x] **Opening detail + apply**: the club's questions as a form, a deadline countdown, and an "Already applied" state with the current status.
- [x] **My applications**: cards or table with colored status badges (pending, accepted, rejected), a filter by status, and withdraw.
- [x] **Profile**: avatar upload (Cloudinary is already configured), branch/year/SID, skills as chips, Security section (Phase 2).
- [x] **Auth pages**: centered card, split layout with an illustration on desktop, responsive (the current `w-1/2` breaks on phones), a role toggle as segmented buttons.
- [x] **Club admin dashboard** (`/admin`): the backend already supports applicants and status updates, but there is no UI for them.
  - overview cards (openings, total applicants, pending)
  - openings CRUD
  - applicants table with search and filters, answers in a side panel, accept/reject buttons
  - export applicants as CSV
  - edit club profile (logo, banner, about, socials)
- [x] **Super admin**: list of clubs and admins, reset an admin's password.
- [x] 404 page, `ProtectedRoute` / `RoleRoute` wrappers, toasts on every action, a loading state on every button.

### 3.3 Optional extras
- [x] **Event** model plus a campus events calendar page.
- [x] Bookmark or follow a club.
- [ ] Email notification to the student when their application status changes (reuses the Phase 2 mailer).

---

## Phase 4: AI features

### 4.1 What to take from AIAAS, and what to leave out
AIAAS's chat works well because of a few simple ideas. Most of its size (agents, tool registry, approvals, LangGraph checkpoints, steering, context curation, multi-provider fallback) is for problems this project doesn't have.

**Take:**
- **Streaming plain markdown over SSE.** Events: `status`, `content_chunk`, `options`, `done`, `error`. The UI shows text as it arrives.
- **A system prompt that never changes within a session, plus a separate "context" message** for things that change (club data, today's date, the user's applications). This keeps prompt caching effective and prompts easy to reason about.
- **Follow-up suggestions from a small separate call** after the answer, shown as clickable chips (like `suggest_follow_ups`).
- **Option cards** (a simplified `ask_user`): the bot can offer 2 to 6 choices the user taps instead of typing. This is the "give users options" part that works well in AIAAS.
- **Sessions and messages saved in the DB**, a history sidebar, and a "new chat" button.

**Leave out:** tool calling, agents, approval flows, graph/checkpoint runtime, memory systems, multiple providers with fallback.

### 4.2 Architecture (Express, kept simple)
```
backend/ai/
  llm.js            one client: streamChat(messages), completeJSON(messages, schema)
  modes/
    helpdesk.js     { systemPrompt, buildContext(user, query), options? }
    checker.js
    interview.js
  context.js        fetches the relevant clubs/openings from Mongo (text index), no vector DB
  suggest.js        follow-up chips (small, cheap model)
  sse.js            writeEvent(res, type, data)
backend/model/chatSession.model.js   { user, mode, title, meta, createdAt }
backend/model/chatMessage.model.js   { session, role, content, options[], createdAt }
backend/routes/ai.route.js
```
- [x] One provider behind an OpenAI-compatible API (OpenRouter works; you already use it in AIAAS). Env vars: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_SMALL_MODEL`. Switching model means changing env vars only.
- [x] Each **mode** is just a config object: a system prompt, a context builder, and optional structured output. Adding a 4th feature means adding one file.
- [x] History: send the last ~12 messages. No summarisation or curation needed at this size.
- [x] Retrieval: a Mongo `$text` index on club `name/about/tagline` and opening `title/description`. Put the top 5 matches in the context message. Good enough for ~40 clubs.
- [ ] Guardrails: `express-rate-limit` (e.g. 30 messages/hour per student, 5 for guests), `max_tokens` cap, a daily token budget per user stored in Mongo, and the helpdesk prompt stays on PEC/club topics. _(hourly per-user limit done; daily token budget not yet)_
- [x] Privacy: the context builder only reads public club data plus **the current user's own** applications, never other students'.

### 4.3 Feature A: "PEC Buddy" help chatbot
- [x] Floating chat button on every page, opening a side sheet; a full page at `/assistant`.
- [x] Answers "which clubs suit someone into robotics?", "when does the Music Club recruit?", "what's the status of my application?", "how do I apply?".
- [x] Links to clubs in answers (`[IEEE](/clubs/ieee)`), rendered as router links.
- [x] Starter option cards on an empty chat: "Find a club for me", "Upcoming deadlines", "My applications", "How does recruitment work?".
- [x] "Find a club for me" flow: 2 to 3 option-card questions (interests, time commitment, tech vs non-tech), then a ranked list with reasons.
- [x] Follow-up chips after every answer.
- [x] Guests can use it (rate-limited). Logged-in users get saved history.

### 4.4 Feature B: Response checker
Helps a student improve their answers to a club's application questions before submitting.
- [x] On the apply form: a "Check my answer" button next to each answer, plus a standalone page at `/assistant/checker`.
- [x] `completeJSON` returns `{ score: 1-10, verdict, strengths[], improvements[], suggestedRewrite }`, graded against a rubric (relevance to the club, specificity, clarity, length, enthusiasm) that includes the club's own description.
- [x] UI: a score ring, strengths and improvements lists, a diff-style "suggested rewrite" with "Use this" and "Keep mine" buttons.
- [x] Option: tone selector (Formal, Friendly, Concise) as option chips.
- [x] Admin side (optional): a one-line AI summary per applicant in the applicants table. Label it clearly as AI-generated; the admin still decides.

### 4.5 Feature C: Mock interview bot
- [x] `/assistant/interview`. Setup through option cards: **club** (from the DB), **role/opening**, **type** (HR / technical / mixed), **difficulty** (easy/medium/hard), **length** (5 / 8 / 10 questions).
- [x] The server tracks progress in `session.meta` (`{ club, type, difficulty, total, asked, scores[] }`). The model gets one instruction per turn: "ask question N" or "give brief feedback on the last answer, then ask question N+1". Don't rely on the model to count.
- [x] Per answer: short feedback plus a hidden 1 to 5 score (from a small JSON call).
- [x] At the end: a report card (overall score, per-question scores, top 3 strengths, top 3 things to work on, suggested resources), and "Try again" or "Change settings".
- [ ] Optional later: voice answers through the browser `SpeechRecognition` API (free, no backend changes).

### 4.6 Frontend chat components (shared by all three modes)
- [x] `useChatStream(mode)` hook: POSTs a message, reads the SSE stream with `fetch` + `ReadableStream`, and updates state on each event.
- [x] `<ChatWindow>`, `<MessageBubble>` (markdown via `react-markdown`), `<OptionCards>`, `<SuggestionChips>`, `<TypingIndicator>`, `<ChatHistorySidebar>`.
- [ ] Stop-generating button (aborts the fetch), copy button, "regenerate last answer". _(stop and copy done; regenerate not yet)_

---

## Phase 5: Polish and deploy
- [x] Input validation with `zod` on every route; `helmet`; cap the JSON body size.
- [x] Mongo indexes: `User.email`, `Club.slug`, text indexes, a unique `Application` index on `{opening, applicant}`.
- [ ] Pagination on the clubs, openings, and applicants lists.
- [x] A few API tests (`vitest` + `supertest` + `mongodb-memory-server`) for auth, OTP, apply, and status update.
- [x] Update the README: env vars, `npm run scrape`, `npm run seed`, where the admin CSV is written, and how to set up the AI key.
- [ ] Deploy: backend on Render/Railway, frontend on Vercel, MongoDB Atlas. Set the production CORS origin and `secure` cookies (`sameSite: 'none'` when frontend and backend are on different domains).

---

## Suggested order and rough size
| # | Work | Size |
|---|---|---|
| 1 | Phase 0 bug fixes + rename | 1 to 2 days |
| 2 | Scraper + seed + admin CSV | 1 day |
| 3 | OTP flows | 1 day |
| 4 | Design system + layout + Home/Clubs/Club detail | 2 to 3 days |
| 5 | Admin dashboard + remaining pages | 2 days |
| 6 | AI core (`llm.js`, SSE, chat UI) + PEC Buddy | 2 days |
| 7 | Response checker + interview bot | 2 days |
| 8 | Polish, tests, deploy | 1 to 2 days |

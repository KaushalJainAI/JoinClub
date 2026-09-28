# 06 · API contracts

Base `/api/v1`. JSON responses are `{ success, message?, ...data }`; errors are
`{ success: false, message, code? }`. Auth: 🔓 public · 👤 logged in · 🎓 student · 🛠 club admin · 👑 super admin.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/register` (multipart) | 🔓 | Create a student account (+ optional photo) |
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` | 🔓/👤 | Session |
| `POST /auth/otp/request` · `/auth/otp/verify` · `/auth/password/reset` | 🔓 | Forgot password |
| `POST /auth/password/change` · `POST /auth/email/verify` | 👤 | Change password, verify email |
| `PUT /users/profile` (multipart: `file`, `resume`) | 👤 | Update profile |
| `GET /clubs?q&category&recruiting&sort` | 🔓 | Club cards with openCount, followerCount |
| `GET /clubs/categories` | 🔓 | Counts per category |
| `GET /clubs/:slug` | 🔓 | Full club page, open/past openings, events, related clubs |
| `POST /clubs/:slug/follow` | 👤 | Toggle follow |
| `GET /clubs/mine` · `GET /clubs/mine/dashboard` · `PUT /clubs/mine` (multipart `logo`, `cover`) | 🛠 | Own club |
| `GET /openings?q&category&club&mode` · `GET /openings/:id` | 🔓 | Open positions (with `myStatus` when logged in) |
| `GET /openings/mine` · `POST /openings` · `PUT /openings/:id` · `DELETE /openings/:id` | 🛠 | Manage openings |
| `GET /openings/:id/applicants?status&q` · `GET /openings/:id/applicants.csv` | 🛠 | Review / export |
| `POST /applications/opening/:id {answers[]}` | 🎓 | Apply (re-apply after withdrawing) |
| `GET /applications/mine` · `POST /applications/:id/withdraw` | 🎓 | Track, withdraw |
| `PATCH /applications/:id/status {status?, adminNote?}` | 🛠 | Decide |
| `GET /events?club&category` · `POST /events` · `DELETE /events/:id` | 🔓/🛠 | Events |
| `GET /stats` | 🔓 | Home-page counts |
| `GET /admin/clubs` · `POST /admin/admins/:userId/reset-password` | 👑 | Admins |
| `GET /ai/status` | 🔓 | `{ enabled, model }` |
| `POST /ai/chat {mode, sessionId?, message, setup?, history?}` | 🔓 (interview 👤) | **SSE** stream |
| `GET/DELETE /ai/sessions[/:id]` | 👤 | Chat history |
| `POST /ai/check-answer {question, answer, clubSlug?, openingId?, tone?}` | 🔓 | Answer feedback |
| `POST /ai/applicant-summary/:applicationId` | 🛠 | AI summary for reviewers |

**SSE events** (`data: {"type": …}`): `session`, `status` (`thinking`/`scoring`/`report`),
`content_chunk`, `options`, `suggestions`, `report`, `done`, `error`.

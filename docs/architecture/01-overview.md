# 01 · System overview

JoinClub PEC is the club portal for Punjab Engineering College: students discover the
28 clubs and societies, apply to their openings, and track applications; each club's
admin manages its page, openings, applicants and events; a super admin manages the admins.

```
Browser (React SPA, Vite)
   │  /api/v1/*  (cookie auth, X-Requested-With on writes, SSE for chat)
   ▼
Express API ──► MongoDB (Mongoose)
   │  ├─► Cloudinary      photos, resumes, club logos/covers (optional)
   │  ├─► SMTP (nodemailer) OTP codes (optional; console in dev)
   │  └─► Anthropic API   AI assistant (optional; demo mode without a key)
   ▼
scripts/  scrape-pec.js → data/pec-clubs.json → seed.js → MongoDB + output/*.csv
```

| Part | Where | Notes |
|---|---|---|
| Frontend | `frontend/src` | React 18, React Router 6, Redux (session only), Tailwind + shadcn-style components |
| API | `backend/app.js`, `routes/`, `controllers/` | Express 4, zod validation, central `errorHandler` |
| Data | `backend/model/` | User, Club, Opening, Application, Event, Otp, ChatSession/ChatMessage |
| AI | `backend/ai/` | One Claude client (`llm.js`), three modes, SSE transport |
| Content | `backend/data/` | Scraped PEC data plus hand-written club profiles |

Roles: `student`, `club_admin` (one club), `super_admin`.

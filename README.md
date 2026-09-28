# JoinClub PEC

Every club and society at Punjab Engineering College in one place. Students discover clubs,
apply to openings and track their applications. Club admins run their page, openings,
applicants and events. An AI assistant helps students pick a club, polish their answers and
practise interviews.

- **28 real clubs** scraped from pec.ac.in, each with a page written to sell the club to students
- **Club admin dashboard:** applicants, shortlisting, CSV export, events, page editor
- **Email OTP** for forgot/change password and email verification
- **AI (Claude):** PEC Buddy help chat, answer checker, mock interviewer (free demo mode without a key)

Docs: [`docs/README.md`](docs/README.md)

## Quick start (local)

Needs Node 22.9+ and MongoDB. The easiest way to get MongoDB is Docker:

```bash
docker run -d --name joinclub-mongo -p 27017:27017 -v joinclub-mongo:/data/db mongo:7
```

**Backend**

```bash
cd backend
npm install
cp .env.example .env        # set SECRET_KEY; the defaults work for local dev
npm run seed                # clubs + dummy students/openings/applications + admin accounts
npm run dev                 # http://localhost:8000
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env        # VITE_BACKEND_URL must match the backend PORT
npm run dev                 # http://localhost:5173
```

## Logins after seeding

`npm run seed` writes **`backend/output/club-admin-credentials.csv`**. It has one admin per club,
the super admin and a demo student. The file holds plain-text passwords, is git-ignored, and
should be shared privately. Admins must choose their own password on first login.

| Who | Email | Password |
|---|---|---|
| Demo student | `student@demo.joinclub.test` | `Student@123` |
| Club admin (e.g. SAE) | `sae.admin@joinclub.pec` | in the CSV |
| Super admin | `admin@joinclub.pec` | in the CSV (or `SUPER_ADMIN_PASSWORD`) |

Seed options: `--reset` wipes the app's collections first, and `--reset-admin-passwords` issues new
admin passwords. The seed refuses to run against a non-local database.

## Club data

```bash
cd backend
npm run scrape              # pec.ac.in → data/pec-clubs.json (cached in scripts/.cache, 1 req/s, respects robots.txt)
```

`data/pec-clubs.json` is committed, so the seed never needs the live site.
`data/club-profiles.js` holds the selling copy for each club page: tagline, why join, signature
events, skills and who should apply. It's drawn from each club's pec.ac.in page. Club admins
can edit all of it from **Club page** in their dashboard. Testimonials, member counts and time
commitments in the seed are **placeholder demo data**.

## Email (OTP)

Without `SMTP_HOST`, codes are printed in the backend console, which is enough for local dev.
For real email, set `SMTP_HOST/PORT/USER/PASS` and `MAIL_FROM` (Gmail needs an App Password).

## AI assistant

Set `ANTHROPIC_API_KEY` in `backend/.env`. Defaults: `AI_MODEL=claude-opus-5` for answers, and
`AI_SMALL_MODEL=claude-haiku-4-5` for follow-up suggestions and per-answer interview scores.
Both can be changed in `.env`. Without a key, every AI screen still works in **demo mode**,
answering from the database with simple rules. Per-user hourly limits are
`AI_HOURLY_LIMIT` and `AI_GUEST_HOURLY_LIMIT`.

## Tests

```bash
cd backend
npm test                          # API tests on a throwaway in-memory MongoDB (no local database needed)
node scripts/check-llm-wiring.js  # checks Claude request shapes against a local fake API
cd ../frontend && npm run lint && npm run build
```

CI (`.github/workflows/ci.yml`) runs the backend tests against a MongoDB service container,
then the frontend lint and build, on every push and pull request.

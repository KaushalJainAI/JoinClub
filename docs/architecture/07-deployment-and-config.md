# 07 · Deployment and config

Every variable is documented in `backend/.env.example` and `frontend/.env.example`.

**Recommended layout:** serve the frontend and `/api` from the same site (for example a
Vercel rewrite of `/api/*` to the backend). Cookies can then stay `SameSite=Lax`; leave
`VITE_API_URL` unset. If the API is on another domain, set `VITE_API_URL`, `CLIENT_URL`,
and `NODE_ENV=production` (cookies become `SameSite=None; Secure`).

| Piece | Suggested host | Notes |
|---|---|---|
| MongoDB | Atlas (free tier is enough) | Put the database name in `MONGO_URI` |
| API | Render / Railway | `npm start`; health check `GET /api/health` (503 when the DB is down) |
| Frontend | Vercel / Netlify | `npm run build`, serve `dist/`, SPA fallback to `index.html` |
| Email | Gmail App Password, Brevo or Resend | Required in production for OTP |
| AI | Anthropic API key | Optional; demo mode otherwise |

Before going live:
1. Set a long random `SECRET_KEY`.
2. Run `npm run seed` only against a local database; it refuses remote URIs unless you pass `--allow-remote`.
   `npm run seed:clubs` (clubs, admins, super admin) is the only seed command safe for production.
3. Share `backend/output/club-admin-credentials.csv` privately, then delete it.
4. Set `STUDENT_EMAIL_DOMAIN=pec.edu.in` and keep `REQUIRE_EMAIL_VERIFICATION=true`.

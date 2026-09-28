# 05 · Auth flow

**Session:** an httpOnly `token` cookie holding `{ userId, tv }` (JWT, 1 day). `SameSite=Lax`
in development; `SameSite=None; Secure` in production. On every authenticated request the
user is loaded from MongoDB; if `tv` ≠ `user.tokenVersion` the cookie is rejected (401).
Changing or resetting a password bumps `tokenVersion`, signing out all other sessions.

**CSRF:** every non-GET request must send `X-Requested-With: XMLHttpRequest`. A cross-site
form can't set it, and CORS only allows `CLIENT_URL` to.

**Sign-up:** students register, get logged in, and receive a `verify_email` OTP. Applying
requires `emailVerified` (turn off with `REQUIRE_EMAIL_VERIFICATION=false`).
`STUDENT_EMAIL_DOMAIN` restricts sign-ups to one domain.

**Seeded admins:** `mustChangePassword: true`. Until they set a new password, every route
except `/auth/me`, `/auth/logout`, `/auth/otp/request` and `/auth/password/change` returns
`403 { code: "MUST_CHANGE_PASSWORD" }`; the frontend redirects them to `/set-password`.

**Email OTP:** 6 digits from `crypto.randomInt`, stored bcrypt-hashed, 10-minute TTL,
5 wrong attempts max, sent without awaiting (so timing doesn't reveal accounts), rate-limited
3 per 15 min per email/user and 10 per IP.

| Flow | Calls |
|---|---|
| Forgot password | `POST /auth/otp/request {email, purpose:"reset_password"}` → `POST /auth/otp/verify {email, code}` → `resetToken` (10 min, single use) → `POST /auth/password/reset {resetToken, newPassword}` |
| Change password | `POST /auth/otp/request {purpose:"change_password"}` → `POST /auth/password/change {code, newPassword}` (or `{currentPassword, newPassword}`) |
| Verify email | `POST /auth/otp/request {purpose:"verify_email"}` → `POST /auth/email/verify {code}` |

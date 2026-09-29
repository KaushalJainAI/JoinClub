# 04 · Database schema

| Model | Key fields | Indexes |
|---|---|---|
| **User** | fullname, email, password (bcrypt), role (`student`/`club_admin`/`super_admin`), club, active, mustChangePassword, emailVerified, tokenVersion, consentAi, consentAiAt, aiApplicantSummary, profile {bio, skills, interests, sid, branch, year, resume, profilePhoto} | email unique |
| **Club** | name, shortName, slug, category, tagline, pitch, summary, about[], whyJoin[{title,text}], activities[], signatureEvents[{name,text}], skills[], lookingFor, commitment, testimonials[], logo, cover, color, foundedYear, leadership[], socials, memberCount, followers[], admins[] (derived from User.club), sourceUrl, archivedAt | slug unique, text index |
| **Opening** | club, title, description, requirements[], positions, deadline, mode (`recruitment`/`workshop`/`event`), questions[], status (`open`/`closed`), createdBy | club; {status, deadline}; text |
| **Application** | opening, club, applicant, answers[{question, answer}], status (`pending`/`shortlisted`/`accepted`/`rejected`/`withdrawn`), history[{status, by, at}], applicantDeleted, adminNote (`select:false`) | {opening, applicant} unique; {club, status, createdAt} |
| **Event** | club, title, description, date, venue, type | club, date |
| **Otp** | email, purpose, codeHash, attempts, expiresAt | {email, purpose} unique; TTL on expiresAt |
| **ChatSession** / **ChatMessage** | user, mode, title, meta / session, role, content, options[], suggestions[] | user; session; TTL 180 days |
| **AiUsage** | user, feature, model, input/output/cache tokens, durationMs | user + createdAt; createdAt |
| **MailFailure** | to, subject, error, at | TTL 30 days |

Rules the code relies on:
- "Open" = `status: "open"` **and** `deadline > now` (`withIsOpen()` in `opening.model.js`).
- A date-only deadline from the admin form means 23:59:59 IST that day.
- `adminNote` is excluded by default; only admin queries `select("+adminNote")`.
- `history` is appended on apply, re-apply, withdraw and every status change. The student list strips `by`; the admin applicant list populates it with names.
- Deleting an account anonymises applications (fresh placeholder id, answers dropped) instead of removing them.
- Questions can't change once anyone has answered them (answers store the question text).
- The seed writes `createdAt` directly (raw inserts) so charts have history.
- Transactions aren't used; if you add them, MongoDB needs a replica set (Atlas has one, a plain local `mongod` doesn't).

# 04 · Database schema

| Model | Key fields | Indexes |
|---|---|---|
| **User** | fullname, email, password (bcrypt), role (`student`/`club_admin`/`super_admin`), club, mustChangePassword, emailVerified, tokenVersion, profile {bio, skills, interests, sid, branch, year, resume, profilePhoto} | email unique |
| **Club** | name, shortName, slug, category, tagline, pitch, summary, about[], whyJoin[{title,text}], activities[], signatureEvents[{name,text}], skills[], lookingFor, commitment, testimonials[], logo, cover, color, foundedYear, leadership[], socials, memberCount, followers[], admins[], sourceUrl | slug unique, text index |
| **Opening** | club, title, description, requirements[], positions, deadline, mode (`recruitment`/`workshop`/`event`), questions[], status (`open`/`closed`), createdBy | club; {status, deadline}; text |
| **Application** | opening, club, applicant, answers[{question, answer}], status (`pending`/`shortlisted`/`accepted`/`rejected`/`withdrawn`), adminNote (`select:false`) | {opening, applicant} unique; {club, status, createdAt} |
| **Event** | club, title, description, date, venue, type | club, date |
| **Otp** | email, purpose, codeHash, attempts, expiresAt | {email, purpose} unique; TTL on expiresAt |
| **ChatSession** / **ChatMessage** | user, mode, title, meta / session, role, content, options[], suggestions[] | user; session |

Rules the code relies on:
- "Open" = `status: "open"` **and** `deadline > now` (`withIsOpen()` in `opening.model.js`).
- A date-only deadline from the admin form means 23:59:59 IST that day.
- `adminNote` is excluded by default; only admin queries `select("+adminNote")`.
- Questions can't change once anyone has answered them (answers store the question text).
- The seed writes `createdAt` directly (raw inserts) so charts have history.
- Transactions aren't used; if you add them, MongoDB needs a replica set (Atlas has one, a plain local `mongod` doesn't).

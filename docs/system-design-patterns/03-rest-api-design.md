# 03 — REST API Design Pattern

## Intent
Model domain as resources with predictable URLs, verbs, status codes, and envelopes.

## Where used here
Resources: `user`, `company`, `job`, `application` under `/api/v1/*`. Envelope `{ success, message, data }`.

## Good (keep)
- Plural-ish resource roots, `GET /job/getAllJobs?keyword=`, `GET /job/get/:id`, nested `GET /application/:id/applicants`.

## Fix (required)
1. `GET /application/apply/:id` mutates state — change to `POST /application/:id/apply` (GETs are cached/prefetched).
2. Inconsistent naming: `/register` vs `/post` vs `/update/:id` — standardize to `POST /`, `GET /`, `GET /:id`, `PATCH /:id`.
3. Typo in key `succees` (`getApplicants`) and `msg` vs `message` — unify to `message`.
4. Public vs auth inconsistency (`getAllJobs` public, `get` admin-only) — document per-route in `06-api-contracts.md` and enforce with middleware, not tribal knowledge.

## Template for new endpoints
```
POST   /api/v1/<resource>          create → 201 + created doc
GET    /api/v1/<resource>?keyword= list (auth as needed, paginate) → 200
GET    /api/v1/<resource>/:id      detail + populates → 200 / 404
PATCH  /api/v1/<resource>/:id      update (owner/role) → 200 / 403 / 404
```

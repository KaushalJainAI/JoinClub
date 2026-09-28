# 01 — Layered / MVC Pattern

## Intent
Separate HTTP wiring (routes), business logic (controllers), and data shape (models) so each changes independently.

## Where used here
- `backend/routes/*.route.js` — thin: method + path + middleware + controller.
- `backend/controllers/*.controller.js` — logic + Mongoose + `res.json`.
- `backend/model/*.js` — Mongoose schemas only, no logic.

## Canonical example (this repo)
```js
// routes/job.route.js
router.route("/post").post(isAuthenticated, postJob);
// controllers/job.controller.js
export const postJob = async (req, res) => { /* validate, check role, Job.create, 201 */ };
// model/job.model.js
export const Job = mongoose.model('Job', jobSchema);
```

## Rules
- Routes: no business logic, no Mongoose.
- Controllers: no schema definitions; delegate persistence to models/services.
- Models: no `req`/`res`.

## Next step
Extract a `services/` layer (e.g. `application.service.js` for apply-with-idempotency + transaction) so controllers stay <50 lines and logic is unit-testable without HTTP.

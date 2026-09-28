# 05 — RBAC Pattern (Role-Based Access Control)

## Intent
Decide *who* (role) can do *what* (action) in one place, enforced on every request.

## Where used here (inline — fragile)
- `job.controller.js:postJob` — `if (role != 'recruiter') 403`.
- `company.controller.js:registerCompany` — `if (req.role !== 'recruiter') 403`.
- `application.controller.js:applyJob` — `if (role != 'student')` block.
- `isAuthenticated` supplies `req.role` from JWT.

## Canonical upgrade (do this)
```js
// middlewares/requireRole.js
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.role) ? next()
  : res.status(403).json({ success:false, message:'Forbidden for role ' + req.role });

// routes/job.route.js
router.route("/post").post(isAuthenticated, requireRole('recruiter'), postJob);
// routes/application.route.js
router.route("/:id/apply").post(isAuthenticated, requireRole('student'), applyJob);
```
Then delete inline role `if`s. Add frontend `RequireRole` route wrapper mirroring the same matrix (UX only — server is source of truth).

## Matrix
See `docs/architecture/05-auth-flow.md` — student vs recruiter table.

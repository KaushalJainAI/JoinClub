# 02 — Middleware Chain Pattern

## Intent
Compose cross-cutting concerns (auth, file parsing, validation, logging) as `(req,res,next)` links executed in order.

## Where used here
- `middlewares/isAuthenticated.js` — JWT cookie → `req.id`/`req.role` → `next()` or 401.
- `middlewares/multer.js` — `memoryStorage().single('file')` → `req.file`.
- Chains: `POST /company/update/:id → isAuthenticated → singleUpload → updateCompany`.

## Canonical example
```js
router.route("/update/:id").put(isAuthenticated, singleUpload, updateCompany);
```

## Rules
- One concern per middleware; always either `next()` or `return res...` (never both, never neither).
- Forward errors with `next(err)` to a central error handler — today controllers `console.log` and hang; add:
```js
app.use((err, req, res, next) => res.status(err.status || 500).json({ success:false, message: err.message }));
```

## To add
`requireRole('recruiter')`, `validate(schema)`, `asyncHandler(fn)` (catches async throws), rate-limit on `/login`+`/register`.

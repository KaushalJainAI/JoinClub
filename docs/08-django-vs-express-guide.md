# Django + Postgres vs Express + MongoDB — a guide from inside JoinClub

> For someone who builds with **Django (+ DRF) + React + Postgres** and is now working on this codebase.
> Every JoinClub snippet below is real code from `backend/` or `frontend/src/`. Every Django snippet is what
> the same thing would look like in a Django 5 / DRF project (the style matches `Desktop/AIAAS/backend`).

**The short version:** the React half is the same job with different plumbing. The backend is where the two
worlds really differ. Django ships most of a backend and makes you follow its layout. Express ships a router
and nothing else, so JoinClub built its own versions of the rest: validation, auth, error handling, CSRF.
Postgres checks your data's shape and relationships on every write. MongoDB checks almost nothing, so the
checks live in Mongoose and in the app code.

---

## 1. Concept map — "where is the Django thing?"

| Django / DRF / Postgres | JoinClub (Express / Mongoose / MongoDB) | Where |
|---|---|---|
| `manage.py runserver` | `npm run dev` (nodemon restarts on save) | `backend/package.json` |
| `settings.py` | `.env` + `process.env.X` read wherever it's needed | `backend/.env.example`, `index.js` |
| `wsgi.py` / `asgi.py` | `index.js` (connect DB, then `app.listen`) | `backend/index.js` |
| Project `urls.py` | `app.use("/api/v1/clubs", clubRoute)` | `backend/app.js` |
| App `urls.py` | `express.Router()` per resource | `backend/routes/*.route.js` |
| `views.py` / `ViewSet` | Controller functions `(req, res) => {}` | `backend/controllers/*.controller.js` |
| `models.py` | `new mongoose.Schema({...})` + `mongoose.model()` | `backend/model/*.model.js` |
| `makemigrations` / `migrate` | **Nothing.** Indexes are built from the schema (`syncIndexes()`) | — |
| DRF `Serializer` (input validation) | `zod` schema + `validate()` middleware | `middlewares/validate.js`, top of each route file |
| DRF `Serializer` (output shaping) | Hand-built objects, `.select()`, `.lean()`, `select: false` fields | controllers |
| `MIDDLEWARE = [...]` | `app.use(helmet(), cors(), express.json(), cookieParser())` | `backend/app.js` |
| `permission_classes` / `IsAuthenticated` | `isAuthenticated`, `requireRole("club_admin")` middleware | `middlewares/auth.js` |
| `request.user` | `req.id`, `req.role`, `req.clubId` (set by `attach()`) | `middlewares/auth.js` |
| `django.contrib.auth` + sessions | Hand-rolled: bcrypt + JWT in an httpOnly cookie + `tokenVersion` | `middlewares/auth.js`, `controllers/auth.controller.js` |
| `CsrfViewMiddleware` + `csrftoken` | A required `X-Requested-With` header on non-GET `/api` calls | `backend/app.js` |
| `raise Http404` / `ValidationError` / exception handler | `throw new HttpError(404, "...")` + `errorHandler` middleware | `utils/http.js`, `middlewares/errorHandler.js` |
| Django admin | Hand-built admin routes + React pages | `controllers/admin.controller.js` |
| `ImageField` + storages | Multer (parse upload) + Cloudinary (store) | `middlewares/multer.js`, `utils/cloudinary.js` |
| `send_mail` | nodemailer | `utils/mailer.js` |
| `StreamingHttpResponse` / Channels | Raw SSE with `res.write()` | `ai/sse.js` |
| Celery | **None.** Everything runs inside the request | — |
| `django-ratelimit` / DRF throttling | `express-rate-limit` | `middlewares/rateLimits.js` |
| `logging` | `pino` / `pino-http` | — |
| `pytest-django` + `APIClient` | `node:test` + `supertest` against a real local MongoDB | `backend/tests/api.test.js` |
| `loaddata` / fixtures / management command | `npm run seed` (a plain Node script) | `backend/scripts/seed.js` |
| `pip` + `requirements.txt` + venv | `npm` + `package.json` + `node_modules` (per folder, no venv needed) | — |

---

## 2. How a request flows

```
Django                                        JoinClub / Express
------                                        ------------------
MIDDLEWARE (Security, CSRF, Session, Auth)    app.use(helmet) → cors → express.json → cookieParser → CSRF check
        │                                             │
urls.py → path("clubs/<slug>/", view)         app.use("/api/v1/clubs", router) → router.get("/:slug", ...)
        │                                             │
permission_classes                            optionalAuth / isAuthenticated / requireRole  (middleware in the route)
        │                                             │
serializer.is_valid(raise_exception=True)     validate(zodSchema)                          (middleware in the route)
        │                                             │
view body → ORM → Postgres                    controller → Mongoose → MongoDB
        │                                             │
Response(serializer.data)                     res.json({ success: true, ... })
        │                                             │
exception handler                             errorHandler (last app.use)
```

The big difference: in Django the framework decides the order of the stages. In Express **you** write the
order, argument by argument, on every route:

```js
// backend/routes/application.route.js
router.patch(
  "/:id/status",
  isAuthenticated,                // permission_classes = [IsAuthenticated]
  requireRole("club_admin"),      // custom permission
  validate(z.object({ ... })),    // serializer.is_valid()
  h(application.updateStatus)     // the view
);
```

Forget `isAuthenticated` on one route and that route is public. Nothing warns you. DRF's
`DEFAULT_PERMISSION_CLASSES` gives you a safe default; Express has no such thing.

---

## 3. Syntax side by side

### 3.1 Models

**JoinClub** — `backend/model/application.model.js`

```js
export const APPLICATION_STATUSES = ["pending", "shortlisted", "accepted", "rejected", "withdrawn"];

const applicationSchema = new mongoose.Schema(
  {
    opening:   { type: mongoose.Schema.Types.ObjectId, ref: "Opening", required: true },
    club:      { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    answers:   [{ question: String, answer: String, _id: false }],
    status:    { type: String, enum: APPLICATION_STATUSES, default: "pending" },
    adminNote: { type: String, default: "", select: false },
  },
  { timestamps: true }
);
applicationSchema.index({ opening: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ club: 1, status: 1, createdAt: -1 });

export const Application = mongoose.model("Application", applicationSchema);
```

**Django equivalent**

```python
class Application(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"; SHORTLISTED = "shortlisted"; ACCEPTED = "accepted"
        REJECTED = "rejected"; WITHDRAWN = "withdrawn"

    opening   = models.ForeignKey("Opening", on_delete=models.CASCADE, related_name="applications")
    club      = models.ForeignKey("Club", on_delete=models.CASCADE, db_index=True)
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_index=True)
    answers   = models.JSONField(default=list)          # or a separate Answer table
    status    = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    admin_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["opening", "applicant"], name="one_application_per_opening")]
        indexes = [models.Index(fields=["club", "status", "-created_at"])]
```

| | Mongoose | Django |
|---|---|---|
| Foreign key | `ObjectId` + `ref: "Club"`. **Only a hint for `populate()`.** MongoDB does not check that the club exists. | `ForeignKey` is a real Postgres FK constraint. |
| On delete | Nothing happens. Delete a club and its applications stay, pointing at nothing. | You must choose `on_delete` (CASCADE / PROTECT / SET_NULL). |
| Enum | `enum: [...]`, checked by Mongoose on `.save()` / `.create()` only. | `choices`, checked by `full_clean()` / serializers. Add a `CheckConstraint` to enforce it in the DB. |
| Nested data | `answers: [{question, answer}]` lives **inside** the document. | `JSONField`, or (the usual Django way) a child table. |
| Hidden field | `select: false`, left out of queries unless you ask with `.select("+adminNote")`. | No model-level version. Leave it out of the serializer's `fields`. |
| Timestamps | `{ timestamps: true }` → `createdAt`, `updatedAt` | `auto_now_add`, `auto_now` |
| Primary key | `_id` (ObjectId, made by the client, time-ordered) | `id` (auto-increment int, or `UUIDField`) |
| Naming | camelCase fields (`adminNote`, `createdAt`) | snake_case (`admin_note`, `created_at`) |

> **Watch out:** Mongoose's `enum`, `required`, `min` checks do **not** run on `updateOne()` /
> `findOneAndUpdate()` unless you pass `{ runValidators: true }`. In Django, `QuerySet.update()` skips
> `full_clean()` too, but Postgres still enforces NOT NULL, FKs and CHECK constraints. MongoDB enforces
> nothing here.

### 3.2 Queries (ORM)

| What | Mongoose (JoinClub) | Django ORM |
|---|---|---|
| Get by id | `await Opening.findById(id)` | `Opening.objects.get(pk=id)` (raises `DoesNotExist`) |
| Get or null | `await Club.findOne({ slug })` → `null` | `Club.objects.filter(slug=slug).first()` |
| Filter | `Application.find({ applicant: req.id })` | `Application.objects.filter(applicant_id=request.user.id)` |
| Greater than | `{ deadline: { $gt: now } }` | `deadline__gt=now` |
| IN | `{ opening: { $in: ids } }` | `opening__in=ids` |
| OR | `{ $or: [{ status: "closed" }, { deadline: { $lte: now } }] }` | `Q(status="closed") \| Q(deadline__lte=now)` |
| Order | `.sort({ createdAt: -1 })` | `.order_by("-created_at")` |
| Pick columns | `.select("title deadline mode")` | `.only("title", "deadline", "mode")` / `.values(...)` |
| Plain dicts, no model objects | `.lean()` | `.values()` |
| Follow a FK | `.populate("club", "name slug logo")` | `.select_related("club")` |
| Create | `await Application.create({...})` | `Application.objects.create(...)` |
| Update one object | `app.status = "withdrawn"; await app.save()` | `app.status = "withdrawn"; app.save()` |
| Bulk update | `Club.updateOne({ _id }, { $addToSet: { followers: id } })` | `club.followers.add(user)` (M2M) |
| Delete many | `ChatMessage.deleteMany({ session: id })` | `ChatMessage.objects.filter(session=s).delete()` |
| Count | `Model.countDocuments({...})` | `.filter(...).count()` |
| Upsert | `Otp.findOneAndUpdate(filter, data, { upsert: true })` | `Otp.objects.update_or_create(...)` |

**Every Mongoose call needs `await`.** A Django query runs when you use it (iterate, `list()`, `.first()`).
A Mongoose query runs when you `await` it. Forget the `await` and you get a Promise, not data, with no error.

**`populate` is not a JOIN.** `.populate("club")` sends a second query (`Club.find({ _id: { $in: [...] } })`)
and joins the results in Node. It is closer to `prefetch_related` than `select_related`. That works fine,
but you can't filter or sort by a populated field the way you can with `filter(club__category="technical")`.

**Aggregation** — `backend/controllers/club.controller.js`

```js
const rows = await Opening.aggregate([
  { $match: { status: "open", deadline: { $gt: new Date() } } },
  { $group: { _id: "$club", count: { $sum: 1 }, nextDeadline: { $min: "$deadline" } } },
]);
```

```python
rows = (Opening.objects
        .filter(status="open", deadline__gt=timezone.now())
        .values("club")
        .annotate(count=Count("id"), next_deadline=Min("deadline")))
```

Same idea: a pipeline in Mongo, a chained QuerySet in Django. In Mongo each stage is a JSON object and runs
in order. In Django the ORM writes the SQL for you.

**Full-text search** — JoinClub declares a weighted `text` index on the schema
(`clubSchema.index({ name: "text", ... }, { weights: {...} })`) and queries with `{ $text: { $search: q } }`.
The Postgres version is `SearchVector("name", weight="A") + ...` with `SearchQuery` / `SearchRank` from
`django.contrib.postgres.search`, backed by a GIN index. Postgres gives you more control (stemming
config, ranking, `pg_trgm` for typos). Mongo's version takes one line.

### 3.3 Routing

```js
// backend/routes/club.route.js
router.get("/", optionalAuth, h(club.listClubs));
router.get("/categories", h(club.categoryCounts));
// Club admin routes come before /:slug so "mine" isn't read as a slug.
router.get("/mine", isAuthenticated, requireRole("club_admin"), h(club.getMyClub));
router.get("/:slug", optionalAuth, h(club.getClub));
router.post("/:slug/follow", isAuthenticated, h(club.toggleFollow));
```

```python
# clubs/urls.py
urlpatterns = [
    path("", views.ClubList.as_view()),
    path("categories/", views.category_counts),
    path("mine/", views.MyClub.as_view()),
    path("<slug:slug>/", views.ClubDetail.as_view()),
    path("<slug:slug>/follow/", views.toggle_follow),
]
```

- Both match top to bottom, so both have the "specific before `:slug`" rule.
- Django: one `path()` per URL, and the view handles each HTTP method (`get()`, `post()`). Express: one line
  per **method + URL**.
- `:slug` ↔ `<slug:slug>`. Express path params are always strings, with no converters like `<int:pk>`.
  A bad ObjectId shows up as a `CastError`, which `errorHandler` turns into a 400.
- Trailing slashes: Django wants them (`APPEND_SLASH`). Express treats `/mine` and `/mine/` as the same by default.

### 3.4 Views ↔ controllers

**JoinClub** — `backend/controllers/application.controller.js`

```js
export const withdraw = async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, applicant: req.id });
  if (!application) throw new HttpError(404, "Application not found.");
  if (!["pending", "shortlisted"].includes(application.status))
    throw new HttpError(400, "This application has already been decided.");
  application.status = "withdrawn";
  await application.save();
  res.json({ success: true, message: "Application withdrawn.", application });
};
```

**DRF equivalent**

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def withdraw(request, pk):
    application = get_object_or_404(Application, pk=pk, applicant=request.user)
    if application.status not in ("pending", "shortlisted"):
        raise ValidationError("This application has already been decided.")
    application.status = "withdrawn"
    application.save(update_fields=["status", "updated_at"])
    return Response({"success": True, "message": "Application withdrawn.",
                     "application": ApplicationSerializer(application).data})
```

Nearly line for line. Differences to know:

- **`h(...)` / `asyncHandler`** (`utils/http.js`). Express 4 does not catch errors thrown inside an `async`
  function, so without the wrapper the request just hangs. Django catches exceptions for you. Every async
  controller in JoinClub is wrapped with `h()` in its route file. Do the same for new ones.
- **The response is `res.json(...)`, not a return value.** Code after `res.json()` still runs, so always
  `return res.json(...)` if more code follows. Sending twice throws "Cannot set headers after they are sent".
- **No serializer on output.** `application` goes out as a whole document. Fields you don't want sent are
  left out with `.select()`, `select: false`, or by building the object (`toCard()` in `club.controller.js`).
- **Response envelope.** JoinClub always sends `{ success, message, ...data }`. DRF normally sends the
  data itself plus an HTTP status. This is a project convention, not an Express one.

### 3.5 Validation: zod ↔ DRF serializers

```js
// backend/routes/auth.route.js
const registerSchema = z.object({
  fullname: z.string().trim().min(2, "Enter your full name").max(80),
  email,                                                  // shared: z.string().trim().toLowerCase().email()
  password,                                               // shared: min 8, a letter, a number
  year: z.coerce.number().int().min(1).max(5).optional(),
});
router.post("/register", authLimiter, singleUpload, validate(registerSchema), h(auth.register));
```

```python
class RegisterSerializer(serializers.Serializer):
    fullname = serializers.CharField(min_length=2, max_length=80, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(validators=[validate_password])
    year = serializers.IntegerField(min_value=1, max_value=5, required=False)

    def validate_email(self, v): return v.lower()
```

| | zod | DRF Serializer |
|---|---|---|
| Coercing `"3"` → `3` | `z.coerce.number()` (needed for multipart forms) | Automatic for `IntegerField` |
| Transforming | `.trim().toLowerCase()` / `.transform(fn)` | `validate_<field>()` returns the new value |
| Cross-field checks | `.refine()` / `.superRefine()` | `validate(self, attrs)` |
| DB-aware checks ("email taken") | In the controller | `UniqueValidator` / in `validate_email` |
| Tied to the model | No, separate from the Mongoose schema | `ModelSerializer` reads the model |
| Output shaping | Not used for that here | Yes, the same class does both ways |
| Error shape | `validate()` returns the **first** error: `"email: Enter a valid email"` | All errors per field: `{"email": ["..."]}` |

So in JoinClub a field's rules are written **twice**: once in zod (the request) and once in Mongoose (the
stored document). `ModelSerializer` gets you out of that in Django.

### 3.6 Auth

**Django:** `django.contrib.auth` gives you the user model, password hashing (PBKDF2/argon2), sessions,
`login()`/`logout()`, password reset tokens, `request.user`, groups and permissions. With DRF + simplejwt or
dj-rest-auth (AIAAS uses the latter) you add token endpoints.

**JoinClub built all of it** — `backend/middlewares/auth.js`:

```js
export const signToken = (user) =>
  jwt.sign({ userId: user._id, tv: user.tokenVersion || 0 }, process.env.SECRET_KEY, { expiresIn: "1d" });

export const isAuthenticated = async (req, res, next) => {
  const user = await loadUser(req);           // verify JWT cookie, load user, compare tokenVersion
  if (!user) return next(new HttpError(401, "Please log in to continue."));
  attach(req, user);                           // req.id, req.role, req.clubId ... ≈ request.user
  next();
};

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.role) ? next() : next(new HttpError(403, "You don't have access to this."));
```

| | Django | JoinClub |
|---|---|---|
| Password hashing | Built in, upgrades old hashes on login | `bcryptjs`, by hand |
| Session store | DB-backed session, cookie holds an id | Stateless JWT in an httpOnly cookie |
| Log out everywhere | Delete the sessions | Bump `user.tokenVersion` (the `tv` claim no longer matches) |
| Current user | `request.user` (lazy object) | `req.id`, `req.role`, `req.clubId` (plain values) |
| Roles | Groups / permissions / `is_staff` | `role` string + `requireRole()` |
| Object-level checks | `has_object_permission()` | `assertOwnsClub(req, clubId)` called in the controller |
| CSRF | `csrftoken` cookie + `X-CSRFToken` header | Required `X-Requested-With` header. Cross-site forms can't set it and CORS blocks other sites from sending it |
| Password reset / email verify | Built in token generator + views | OTP model + `/otp/request` and `/otp/verify` routes |

On the frontend it looks almost the same as your Django setup: `withCredentials: true` so cookies go along,
plus the one extra header (`frontend/src/lib/api.js`):

```js
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },   // Django: "X-CSRFToken": getCookie("csrftoken")
});
```

### 3.7 Errors

```js
// utils/http.js
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

// middlewares/errorHandler.js  (≈ DRF's EXCEPTION_HANDLER)
if (err.name === "CastError") return res.status(400).json({ success: false, message: "Invalid id." });
if (err.code === 11000)       return res.status(400).json({ success: false, message: "That already exists." });
```

| Situation | Mongo / Mongoose | Postgres / Django |
|---|---|---|
| Unique violation | `err.code === 11000` | `IntegrityError` (SQLSTATE 23505) |
| Bad id in the URL | `CastError` | `<int:pk>` doesn't match → 404, or `ValueError` |
| Schema check failed | `ValidationError` (Mongoose) | `ValidationError` (Django/DRF) |
| Not found | `findById` returns `null`; you throw | `get()` raises `DoesNotExist`; `get_object_or_404` |

### 3.8 Settings and startup

Django gathers config into `settings.py`. JoinClub reads `process.env.X` in the file that uses it, after
`import "dotenv/config"` in `index.js`. That's why `index.js` loads `app.js` with a dynamic `await import()`
after dotenv runs: ES module imports are hoisted and would otherwise run before `.env` is loaded. Python
imports run in order, so Django never hits this.

Required variables are checked by hand (`if (!process.env.SECRET_KEY) process.exit(1)`), roughly like
`ImproperlyConfigured`.

### 3.9 Streaming (AI chat)

```js
// backend/ai/sse.js
res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", ... });
res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
```

Node is built for this: one process holds thousands of open streams on its event loop, and you just keep
calling `res.write()`. In Django you'd use `StreamingHttpResponse` with an async generator under ASGI
(uvicorn/daphne). Under WSGI each open stream ties up a worker for its whole life. For two-way traffic you'd
use Channels, as AIAAS does. **This is a real point in Node's favor.**

### 3.10 Tests

```js
// backend/tests/api.test.js
before(async () => {
  await connectDB(TEST_URI);
  await mongoose.connection.db.dropDatabase();
  await Promise.all([User, Club, Opening, Application, Otp].map((m) => m.syncIndexes()));
});
const res = await a.post("/api/v1/auth/login").send({ email, password });
assert.equal(res.status, 200, res.body.message);
```

```python
@pytest.mark.django_db
def test_login(client, user):
    res = client.post("/api/v1/auth/login/", {"email": user.email, "password": PASSWORD})
    assert res.status_code == 200
```

Django makes a test database, runs migrations, and wraps each test in a transaction that is rolled back.
JoinClub's suite drops and rebuilds the whole `joinclub_test` database once, and the tests share state after
that (`--test-concurrency=1`). It refuses to run against a non-local URI because it drops the database.

### 3.11 Things Django gives you that JoinClub doesn't have

- **Migrations.** Add a field to a Mongoose schema and old documents simply don't have it. Mongoose fills
  in `default` when it **reads** a document, but the database is not changed. Renaming a field or changing
  its type means writing a script under `backend/scripts/` yourself. Nothing records which scripts have run.
- **Admin site.** The super-admin UI is built by hand (`admin.controller.js` + React pages).
- **Background jobs.** No Celery / RQ. Emails and AI calls run inside the request. If you need one, the
  Node equivalents are BullMQ (Redis) or Agenda (runs on Mongo).
- **Transactions.** The code doesn't use them (`startSession` never appears). MongoDB has multi-document
  transactions, but only on a replica set. JoinClub instead makes each write a single document, or uses one
  atomic operator (`$addToSet`, `$pull`, `upsert`), or relies on a unique index. Django: `with transaction.atomic():`.

---

## 4. What's the same

- **React is React.** Components, hooks, react-router, axios, Redux Toolkit (`redux/authSlice.js`) work the
  same whether the API is DRF or Express. The only frontend changes are the base URL, the CSRF header name,
  and the response shape (`res.data.applications` because of the `{ success, ... }` envelope).
- **REST shape**: `/api/v1/<resource>/<id>/<action>`, JSON bodies, HTTP status codes, cookie auth.
- **Layers**: routes → middleware → controller → model, the same as urls → permissions → view → model.
- **Declared indexes**: `schema.index({ club: 1, status: 1, createdAt: -1 })` ↔ `Meta.indexes`.
- **Unique constraints stop races** in both. JoinClub's `{ opening, applicant } unique` is exactly a
  `UniqueConstraint`, and both make the second of two simultaneous "Apply" clicks fail in the DB.
- **Config in env vars, secrets out of git, rate limiting, helmet ≈ `SecurityMiddleware`.**

---

## 5. Tradeoffs in real situations

Each one is framed around something that could actually happen in JoinClub.

### "Add a `priority` field to applications"
- **Mongo:** add `priority: { type: Number, default: 0 }` to the schema, restart, done. Old documents don't
  have the field in the DB. Mongoose shows `0` when you load them through a model, but `.lean()` reads
  return `undefined`, and `find({ priority: 0 })` **won't match them**. You need a backfill script to be safe.
- **Postgres:** `makemigrations` + `migrate`. Every row gets the value. Slower to ship, but no split between
  "old" and "new" documents.
- **Verdict:** Mongo is faster on day one. Postgres is easier to trust on day 300.

### "A club is deleted"
- **Mongo:** its openings, applications and follower lists stay behind, holding a club id that points at
  nothing. `populate("club")` returns `null` and the React code has to handle that. Cleanup is up to you.
- **Postgres:** `on_delete=CASCADE` removes them, or `PROTECT` refuses the delete. You must choose one up front.
- **Verdict:** Postgres wins clearly for relational data, and JoinClub's data **is** relational
  (users ↔ clubs ↔ openings ↔ applications).

### "Club profile pages with lots of nested, optional content"
`Club` has `whyJoin[]`, `signatureEvents[]`, `testimonials[]`, `leadership[]` and `socials{}`, all shown
together and edited together. In Mongo that's one document, one read and one write. In Django it's either five
child tables with inline formsets, or `JSONField`s (which work well in Postgres with `jsonb`, but you lose
per-field validation and the admin UI).
- **Verdict:** this is where MongoDB genuinely fits: content read as a whole, rarely queried by its parts.

### "Admin dashboard: acceptance rate per club per category this semester"
- **Mongo:** an `aggregate()` pipeline with `$lookup` (a join) + `$group`. It works, but it's wordy and
  `$lookup` is slow compared with a SQL join.
- **Postgres:** a single `annotate()` over joins, or plain SQL. You can also point Metabase or Superset at it.
- **Verdict:** Postgres. Reporting over related data is what SQL was made for.

### "Two students click Apply at the same instant" / "follow button spam"
Both stacks handle this well if you use the right tool: a unique index for the first, `$addToSet` / M2M
`add()` for the second. JoinClub does both correctly. Where they differ is **multi-step** operations, like
"accept an application and decrement the opening's `positions`". Postgres: `transaction.atomic()` +
`select_for_update()`. Mongo: a replica set + session, or a single conditional update
(`findOneAndUpdate({ _id, positions: { $gt: 0 } }, { $inc: { positions: -1 } })`).

### "Streaming AI responses to 500 students during freshers' week"
- **Node:** handles it naturally. SSE on the event loop, no extra setup.
- **Django:** fine under ASGI with async views, but you have to set that up on purpose. A sync WSGI
  deployment with a few gunicorn workers would run out of workers.
- **Verdict:** Node.

### "Onboard a new developer / get security right"
- **Django:** auth, CSRF, admin, migrations and the ORM work the same in every Django project. A reviewer
  knows where to look.
- **Express:** every project is laid out differently. JoinClub's JWT + tokenVersion + CSRF-header scheme is
  sound, but someone had to design it and each new developer has to learn it. Security depends on every route
  listing the right middleware.
- **Verdict:** Django, unless the team is JavaScript-only.

### "One language across the stack"
Express lets frontend and backend share JavaScript, and could share zod schemas (the same `password` rule
for form and API) and constants (`APPLICATION_STATUSES`). With Django + React you write validation in
Python and again in JS, or generate types from an OpenAPI schema (`drf-spectacular`).

### "Hosting and cost"
Both are cheap. MongoDB Atlas has a free tier and nothing to migrate. Managed Postgres (Neon, Supabase,
RDS) is just as easy now. Node uses less memory per process. Django + gunicorn + Celery + Redis is more
moving parts but more capable.

### Scorecard for *this* project

| Concern | Winner here | Why |
|---|---|---|
| Speed of building the MVP | Express + Mongo | No migrations, flexible club profiles |
| Data integrity (users/clubs/applications) | Django + Postgres | Real FKs, cascades, transactions |
| Reporting / admin analytics | Django + Postgres | SQL joins + built-in admin |
| AI streaming chat | Express | Event loop + SSE, no extra setup |
| Auth & security out of the box | Django | Built in and battle-tested |
| Rich nested club content | Mongo | One document per profile |
| Shared code with the React frontend | Express | Same language |
| Background work (emails, scraping, AI grading) | Django | Celery is the standard answer; Express has none set up |

---

## 6. Gotchas for a Django developer in this repo

1. **Wrap every async controller in `h()`** or thrown errors hang the request (Express 4).
2. **`await` every Mongoose call.** A missing `await` gives you a Promise, not data, and no error.
3. **`.lean()` returns plain objects**, with no `.save()`, no virtuals and no defaults filled in. That's
   why `isOpen` in `opening.model.js` is a plain function, not a virtual.
4. **Compare ids as strings.** `doc.club === req.clubId` is `false` (ObjectId vs string). Use
   `String(doc.club) === req.clubId` or `doc.club.equals(id)`. In Django, `a.club_id == b.id` just works.
5. **Route order matters**: put `/mine` before `/:slug` (same as Django's `urls.py`, easier to miss here).
6. **`select: false` fields** (`adminNote`) are missing unless you ask with `.select("+adminNote")`.
7. **No migrations.** A new `index` or `unique` in a schema is only created when Mongoose's `autoIndex` runs
   or you call `syncIndexes()`. A new unique index fails to build if existing data already has duplicates.
8. **`updateOne` / `findOneAndUpdate` skip schema validators** unless you pass `runValidators: true`.
9. **ES modules**: `import`/`export`, include the `.js` extension in relative imports, no `__dirname`.
10. **`return res.json(...)`** when code follows it. There's no "the view returned, so we're done".
11. **Multipart bodies are all strings**, so `z.coerce.number()` and the `json()` preprocess in
    `club.route.js` exist. DRF parsers turn `"3"` into `3` for you.

---

## 7. Mental model to take away

> **Django** assumes you want the standard pieces and lets you swap them out.
> **Express** assumes you want nothing and lets you add pieces in.
>
> **Postgres** checks your data every time you write it.
> **MongoDB** stores what you give it, so the checks have to be in your code.

JoinClub is a well-built example of the Express/Mongo approach. The auth, CSRF, validation and error handling
here are what Django would have given you, rebuilt carefully by hand. When you read this code, the useful
question is usually "which Django feature is this file standing in for?" The concept map in §1 answers that.

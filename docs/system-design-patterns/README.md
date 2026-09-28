# System Design Patterns (JoinClub)

Reusable patterns observed in this codebase + patterns to adopt next.
Each file: intent → where used here → canonical example → when to use / avoid.

| # | Pattern | File | Status in JoinClub |
|---|---------|------|--------------------|
| 1 | Layered / MVC (routes → controllers → models) | `01-mvc-layered.md` | used |
| 2 | Middleware chain (auth, upload) | `02-middleware-chain.md` | used |
| 3 | REST resource design | `03-rest-api-design.md` | used, needs fixes |
| 4 | Centralized Redux state | `04-redux-state.md` | deliberately minimal (session only) |
| 5 | RBAC (role-based access) | `05-rbac.md` | used, extracted to `middlewares/auth.js` |
| 6 | Repository / data-access (to adopt) | `06-repository-service.md` | proposed |

Read in order. Code refs are `backend/*` and `frontend/src/*`.

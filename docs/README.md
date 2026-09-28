# JoinClub PEC · Documentation

Stack: React 18 + Vite + Tailwind (frontend) · Express 4 + Mongoose + zod (backend) ·
MongoDB · Anthropic Claude (AI assistant).

## Architecture (matches the current code)

| Doc | What it covers |
|---|---|
| [01 · Overview](architecture/01-overview.md) | Parts, roles, data flow |
| [02 · Frontend](architecture/02-frontend-architecture.md) | Folders, state, routing, theming |
| [03 · Backend](architecture/03-backend-architecture.md) | Middleware chain, ownership, AI module |
| [04 · Database](architecture/04-database-schema.md) | Models, indexes, invariants |
| [05 · Auth](architecture/05-auth-flow.md) | Cookies, CSRF, OTP, forced password change |
| [06 · API](architecture/06-api-contracts.md) | Every route, SSE events |
| [07 · Deployment](architecture/07-deployment-and-config.md) | Hosting, env, go-live checklist |

## Plans

- [Hardening plan](plans/2026-09-28-hardening-plan.md) (most items done; see its checklist)
- [Gaps plan](plans/2026-09-29-gaps-plan.md)
- [Performance plan](plans/2026-09-29-performance-plan.md)

## Patterns and guides

- [System design patterns](system-design-patterns/README.md)
- [Syntax patterns](syntax-patterns/README.md)
- [Django vs Express guide](08-django-vs-express-guide.md)

The pattern and syntax pages were written against the original Company/Job code. The ideas still
apply, but some examples use the old names (Company → Club, Job → Opening, recruiter → club_admin).

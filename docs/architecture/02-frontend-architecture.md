# 02 · Frontend architecture

```
src/
  App.jsx               routes, session bootstrap (/auth/me), global 401 / must-change-password handlers
  lib/api.js            axios instance: baseURL /api/v1, credentials, X-Requested-With header
  lib/auth.js           homeFor(role), safeNext, password rule, branch list
  lib/categories.js     category/status/mode labels, icons, colours
  lib/sentry.js         env-gated Sentry init (VITE_SENTRY_DSN) + error reporting helper
  redux/                authSlice only ({ user, ready })
  hooks/useFetch.js     GET + loading/error/reload; useDebounced
  hooks/useChatStream.js SSE client for /ai/chat (helpdesk + interview)
  components/ui/        button, input/textarea/select, dialog, tabs, dropdown, table…
  components/layout/    AppLayout, Navbar, Footer, guards (RequireAuth), OtpInput, ChangePassword, ErrorBoundary
  components/clubs/     ClubCard, OpeningCard, EventCard, ClubLogo, badges, EmptyState
  components/chat/      ChatWindow, ChatLauncher (floating), AnswerChecker, BuddyEmpty
  pages/                Home, Clubs, ClubPage, Openings, OpeningPage, Events, MyApplications,
                        Profile, Privacy, Assistant, auth/*, admin/* (Dashboard, Openings,
                        Applicants, ClubEditor, Events, SuperAdmin with clubs/people/AI-usage tabs)
```

- **State:** only the session lives in Redux. Page data is fetched per page with `useFetch`,
  so there's no stale global cache to invalidate.
- **Routing:** `RequireAuth roles={[…]}` waits for the first `/auth/me` (`ready`) before
  redirecting. Admin pages, Assistant and Profile are lazy-loaded.
- **Filters live in the URL** (`/clubs?category=technical&recruiting=true`), so views can be shared.
- **Theming:** CSS variables in `index.css` (light + `.dark`), toggled by `next-themes`.
  Brand surfaces use the fixed `navy` colours so they look the same in both themes.
- **Dev proxy:** Vite forwards `/api` to `VITE_BACKEND_URL`, so cookies and SSE work without CORS.

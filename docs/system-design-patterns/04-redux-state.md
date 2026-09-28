# 04 — Centralized (Redux) State Pattern

## Intent
Single store, slices per domain, unidirectional flow: component → dispatch → reducer → selector → render.

## Where used here
`frontend/src/redux/store.js` + `authSlice` (`{loading,user}`), `clubSlice` (`{allClubs,singleClub}`), `companySlice` (`{singleCompany}`).

```js
dispatch(setUser(user));            // after login
const { user } = useSelector(s => s.auth);
```

## Bug (fix now)
`store.js:4` — `import companySlice from "./clubSlice"` registers club reducer twice under `company` key. Fix:
```js
import companySlice from "./companySlice";
```

## Rules
- Server state (jobs, companies) → hooks fetch + slice cache; consider RTK Query to replace hand-rolled `useGetAllClubs`.
- Never import one slice file for two store keys; one file = one domain.
- Selectors colocated with slices; components never mutate `store.getState()` directly.

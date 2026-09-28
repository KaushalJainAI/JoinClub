# JoinClub PEC · frontend

React 18 + Vite + Tailwind. See the [root README](../README.md) for setup and
[`docs/architecture/02-frontend-architecture.md`](../docs/architecture/02-frontend-architecture.md)
for how it's organised.

```bash
npm install
cp .env.example .env   # VITE_BACKEND_URL = the backend's URL in dev
npm run dev            # http://localhost:5173 (proxies /api to the backend)
npm run lint
npm run build          # dist/
```

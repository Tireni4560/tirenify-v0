# RUN.md — how to run Safeyard locally (verified on Windows / PowerShell, Node 24)

Product: **Safeyard by Tirenify**. `src/config/brand.js` is the single source for the
product name, tagline and `APP_URL`.

## TL;DR — one command for local development

```powershell
npm install        # first time only
npm run dev        # front end (:5173) + API server (:3000) together
```

Then open **http://localhost:5173**. `npm run dev` starts BOTH the Vite dev server and
the Express API in one terminal; Vite proxies `/api` -> :3000, so the browser only ever
talks to http://localhost:5173. Press **Ctrl+C** to stop both.

## Why NOT `npx serve`

Serving the project root with `npx serve` shows a **BLANK PAGE**. The browser asks for
the raw source file `/src/main.jsx`, which a static server cannot transform (JSX/ESM),
so nothing mounts into `#root`. You must view the app through a dev server or a
production build. **Do not use `npx serve`.**

## Commands (all verified)

| Task | Command | URL / notes |
| --- | --- | --- |
| Local dev (front end + API) | `npm run dev` | http://localhost:5173 (single command, no global installs, no login) |
| Production build | `npm run build` | `vite build` -> `public/`, then `node scripts/gen-meta.mjs` writes per-route HTML + sitemap.xml + robots.txt + manifest.webmanifest |
| Serve the production build | `npm start` | http://localhost:3000 (Express serves `public/` + the API routes) |
| Unit tests | `npm test` | Vitest (33 tests) |

### Environment

- Copy `.env.example` to `.env`. The **breach check needs no secrets** — it works on the
  XposedOrNot free tier with nothing set.
- The **email-subscription** flow is optional; without `SUPABASE_*` / `RESEND_API_KEY`
  the server still starts and the breach check still works, and the subscribe UI shows a
  friendly "not available" message instead of crashing.
- `APP_URL` (server) and `VITE_APP_URL` (build-time client meta) both default to
  `https://check.tirenify.app`. Set them together to move the product later; nothing
  else hard-codes the domain.

## Verify the breach check

With `npm run dev` running:

```powershell
curl.exe -X POST http://localhost:5173/api/breach-check -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\"}"
```

Expect `ok:true` and a `result` with `found:true` and a list of breaches (each with
`date`, `records`, `dataTypes`, `passwordRisk`). A never-used address such as
`zz-plum42x@example.org` returns `found:false` and shows the "Good news" state.

The email only ever appears in the POST body to our own route — never in a URL, never in
the server logs, and the browser never calls `api.xposedornot.com` directly.

## Legacy-host redirect (domain readiness)

The server issues a **301** from `check.tirenify.app` to `APP_URL` **only when `APP_URL`
points at a different host**, preserving the full path and query string. It is inactive
while `APP_URL` is `check.tirenify.app` (the default), so nothing changes in production
today. Test it by starting the server with `APP_URL` set to another host and sending a
request with `Host: check.tirenify.app`.

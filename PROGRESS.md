# PROGRESS.md — Safeyard by Tirenify

> Resume file for any agent. Update this file **after every phase** with: done / not done / decisions / how to run and verify / deploy notes.
> PRODUCT_NAME = **Safeyard** (one word: capital S, lowercase "yard"). Page titles use "<Page> | Safeyard by Tirenify". Company = Tirenify. Tagline = "Know Before They Do". Breach module = "Breach Guard".
> HARD RULES: no git commit/push (user does that); ZERO network at runtime except `POST /api/breach-check` and the email-subscription flow; no accounts; no secrets in client code; all new files lowercase-hyphenated.

---

## THIS SESSION — breach-check repair + catch-up changes (DONE)

### Root cause of "The breach database is temporarily unavailable" (repaired)
- **`npm run dev` only started Vite.** `vite.config.js` proxies `/api` -> `http://localhost:3000`, but nothing started the Express server on :3000. So `POST /api/breach-check` hit a dead proxy target; the client returned `error:"server"` -> "The breach database is temporarily unavailable." **Vite alone does not serve `/api`** (confirmed; spec step 2c).
- **Fix:** new zero-dependency launcher `scripts/dev-server.mjs` runs BOTH `node server.js` (:3000) and `vite` (:5173) under one `npm run dev` (Ctrl+C stops both). Vite still proxies `/api` -> :3000, so the browser only ever uses http://localhost:5173. No global installs, no `vercel dev`, no login.
- **Also fixed:** `server.js` used to `process.exit(1)` when Supabase env was missing. Supabase/Resend are now **optional** — the server always starts; the breach check needs no env; the email-subscription flow degrades to a friendly "not available" message when unconfigured.

### Verified live through the app route (real calls)
- `POST http://localhost:5173/api/breach-check {email:"test@example.com"}` -> `ok:true, found:true, breaches:214, risk:{label:"Critical",score:100}`. Each breach has `date` (e.g. `2026`), `records`, `dataTypes`, `password_risk`. 17 distinct years.
- `POST ... {email:"zz-plum42x@example.org"}` (never used) -> `ok:true, found:false, breaches:0` -> renders the **"Good news: no breaches found"** state. A 200 with an empty `BreachesSummary.site` is treated as "no breaches", never an error.
- `{email:"not-an-email"}` -> HTTP 400 `error:"invalid_email"`.
- **Privacy verified:** server logs contain **0** occurrences of the email. Email only ever travels in the POST body. The browser never calls `api.xposedornot.com` directly (no CORS) — everything goes through our route.

### Distinct error codes (route + UI)
- Route returns: `invalid_email` (400), `rate_limited` (429, our per-IP limit or upstream 429), `upstream_unavailable` (502, upstream 5xx / network error), `timeout` (504, upstream >15s), `parse_error` (502, unreadable body).
- `src/lib/breach-api.js` maps each to a specific friendly title + message; `src/routes/breach-guard.jsx` renders them (rate-limit = warning tone, others = destructive tone).
- **Dev-only terminal diagnostics:** `server.js` prints `[breach-check] <errorType>` and the upstream HTTP status via `devLog()`, a no-op when `NODE_ENV=production`. It **never** logs the email or the response body (the retry helper no longer logs the URL, which contained the email).

### DATA RULE (Phase 1) — decision
- Verified live: the **free** `GET /v1/breach-analytics?email=...` returns full per-breach detail (215 objects for test@example.com): breach, details, domain, industry, xposed_date, xposed_records, xposed_data, password_risk, verified, references, plus BreachMetrics.risk[] and per-year counts. **No paid key required.**
- -> **Built the full detailed results view.** Attribution "Breach data by XposedOrNot" shown in the UI.

### Catch-up changes
- **Product name -> Safeyard.** Single source `src/config/brand.js`. Replaced every "Wren" use: `index.html` (brand tokens), `head.js`, `App.jsx`, `static-page.jsx`, `routes.js` descriptions, `index.jsx` copy, and internal `wren:` storage namespace + `clearAllWrenData`/`useWrenDataVersion` -> `safeyard:` / `clearAllSafeyardData`/`useSafeyardDataVersion`. Wordmark is plain text `PRODUCT_NAME` (no icon/mascot). Old "Wren" notes removed. `public/` regenerates clean (no "Wren" after `npm run build`).
- **Metadata not hard-coded.** `index.html` uses `__PRODUCT_FULL__`, `__TAGLINE__`, `__SITE_URL__`, `__OG_IMAGE__` tokens injected at dev/build by a small Vite plugin (`brandHtml()` in `vite.config.js`) reading `brand.js`. `scripts/gen-meta.mjs` now also emits `manifest.webmanifest` (name "Safeyard by Tirenify", short_name "Safeyard").
- **Domain readiness / APP_URL.** One setting: server `APP_URL` (env, default `https://check.tirenify.app`) + client `VITE_APP_URL` (build-time, same default) -> `SITE_URL`/`OG_IMAGE`/canonical/og/sitemap/robots/manifest/email links. A **301** from legacy host `check.tirenify.app` -> `APP_URL` is active ONLY when APP_URL points at a different host, preserving path + full query (verified: `Host: check.tirenify.app` + `/confirm?token=test123&x=1` -> `301` -> `https://safeyard.tirenify.app/confirm?token=test123&x=1`; non-legacy host does not redirect; inactive at the default host).
- **Local run + robustness.** `RUN.md` written with verified Windows commands (dev = one command; `npx serve` documented as blank-page and not to be used). Added a React **error boundary** (`src/components/error-boundary.jsx`, wired in `main.jsx`), a `<noscript>` message, and **friendly missing-env** handling. `.env.example` rewritten.
- **File names:** all new files lowercase-hyphenated (`scripts/dev-server.mjs`, `src/components/error-boundary.jsx`, `RUN.md`).

### Build / tests
- `npm run build` -> success (clean route-level code splitting; gen-meta writes 5 route snapshots + sitemap.xml + robots.txt + manifest.webmanifest). The `import.meta` optimizer note is benign (Vite injects it in the browser bundle; `brand.js` uses `import.meta.env?.VITE_APP_URL` with a safe fallback).
- `npx vitest run` -> **33/33 pass** (parse 11, risk 7, score 7, severity 8).
- No dev server or headless browser left running; temp logs deleted.
---

## PHASE 0 — RECON (DONE, from prior session)

### Live site (check.tirenify.app)
- **Framework/host**: Plain **Express 5** (`server.js`, CommonJS, `main: server.js`, `npm start`) deployed on **Vercel** (DNS CNAME -> `vercel-dns-017.com`). No `vercel.json`; deploys ship the repo as-is. Static assets served from `public/`; requests without a file extension (`/`, `/api/*`, unknown paths) fall through to Express.
- **Base decision**: keep `server.js` as entry, keep static output in `public/`, keep same domain/host config. Unknown-route fallthrough to Express serves the SPA shell with per-route meta — no hosting changes needed.
- **Email subscription (KEEP VERBATIM)**: `POST /api/email/subscribe` (alias `/api/subscribe`), `GET /api/email/confirm?token=`, `GET/POST /api/email/unsubscribe`, `GET /confirm-email`. Backing: **Supabase** (tables `users`, `subscriptions`, `email_logs`, `validation_attempts` — subscription data only, NOT auth) + **Resend** (sender `hello@tirenify.app`). Confirm links: `${FRONTEND_URL}/?token=...`.
- **Loading messages (KEEP VERBATIM)** in `src/lib/loading-messages.js`: `loadingMessagesGeneral` (15), `loadingMessagesCompletion` (5); sequence = 2 distinct general + 1 completion; rotate every 2500 ms; 2500 ms floor. Mirrors the live site exactly.
- **Analytics removed** (Google tag). **Fonts**: self-hosted Sora + Manrope woff2 in `static/fonts/`.

### XposedOrNot API — LIVE VERIFICATION
- Free tier, **no API key needed** for email endpoints. Docs: `https://xposedornot.com/api_doc`. Documented limits ~2/sec, 25/hour, 100/day per IP; `429` = throttled; 404 = no data.
- `GET /v1/check-email/{email}` -> breach names only.
- `GET /v1/breach-analytics?email={email}` -> **full details free**: BreachMetrics (get_details, industry, passwords_strength, risk[], xposed_data, yearwise_details), BreachesSummary.site (semicolon-joined names), ExposedBreaches.breaches_details[] (per-breach detail objects), ExposedPastes. `logo` is a remote URL — **NOT used** (letter avatars instead).
- Not-found address -> HTTP 200 with `BreachesSummary.site:""` and null details -> treated as **no breaches**.
- **DATA RULE decision**: details ARE free -> build the **full detailed view**. No paid-key option. Attribution "Breach data by XposedOrNot".

### tirenify-src (Lovable prototype, read-only reference)
- TanStack Start (SSR/nitro) + React 19 + Tailwind v4 + Radix/shadcn + lucide-react + react-query. **Not the deploy base** (SSR/nitro would replace the Express server + hosting). -> **Decision: static Vite SPA served by the existing Express server, porting the prototype UI look.**
- No secrets in tirenify-src. Repo-root `.env` has real keys but is gitignored; `.env.example` documents names only.

---

## BASE ARCHITECTURE
- **Frontend**: static Vite SPA (React 19). In-house router (`src/lib/router.jsx`). Output -> `public/` (committed). `npm run build` = `vite build && node scripts/gen-meta.mjs`.
- **Server**: `server.js` (Express 5, CommonJS) — subscription routes unchanged; `POST /api/breach-check` (validate, per-IP in-memory rate limit 8/60s, 10-min in-memory cache keyed by sha256(email), 15s timeout + 3 retries, distinct error codes, dev-only diagnostics, never logs email/response); serves `public/`; SPA fallback; APP_URL 301 redirect. Supabase/Resend optional.
- **Config**: `src/config/brand.js` (names/tagline/APP_URL single source); `src/config/routes.js` (data-only route table used by app + gen-meta).
- **Dev**: `npm run dev` = `scripts/dev-server.mjs` (Express :3000 + Vite :5173 together); Vite proxies `/api` + `/confirm-email` -> :3000.
- **Bundled libs**: react+react-dom (19.x, vendor-react chunk), lucide-react (inline SVG, tree-shaken). Dev-only: vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, vitest. Everything else in-house.

---

## HOW TO RUN / VERIFY
```bash
npm install
npm run dev        # http://localhost:5173 (front end + API together)
npm run build      # vite build -> public/ ; gen-meta -> per-route HTML + sitemap + robots + manifest
npm start          # node server.js on :3000 (serves public/ + API)
npm test           # vitest unit tests (33)
```
Verify breach check (with dev running):
```bash
curl.exe -X POST http://localhost:5173/api/breach-check -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\"}"
```
-> ok:true, result.found:true, 214 breaches with dates/records/data types/password risk. `zz-plum42x@example.org` -> found:false -> "Good news" state.

## Deploy notes (Vercel)
- Root directory: repo root. Build command: not required (output committed); if configured use `npm run build`. Output directory: `public`.
- Env vars on host: `APP_URL` (default `https://check.tirenify.app`), `VITE_APP_URL` (build-time, match APP_URL), optional `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `FRONTEND_URL`, `EXPOSED_ORKNOT_API_KEY`. Never commit `.env`.
- Do not change domain or hosting configuration.

### Env vars & every domain reference (change these only for a later host switch)
- `server.js`: `APP_URL` (default `https://check.tirenify.app`) -> FRONTEND_URL default, 301 redirect target, canonical/og/email links.
- `src/config/brand.js`: `VITE_APP_URL` (default `https://check.tirenify.app`) -> SITE_URL -> OG_IMAGE, used by head.js, routes.js, scripts/gen-meta.mjs (sitemap/robots/manifest).
- `.env.example`: `APP_URL`, `VITE_APP_URL`, `FRONTEND_URL`.
- No other file hard-codes the domain.

---

## PHASE STATUS
- Phase 0 (recon): **DONE**
- Phase 1 (breach results): **DONE** — repaired + verified live this session. Full detailed view (free API returns details; 214 breaches for test@example.com). Distinct error codes + dev-only diagnostics + no-email-logging verified. Catch-up changes (Safeyard rename, APP_URL 301, RUN.md, error boundary, noscript, missing-env messages, .env.example, manifest) applied.
- Phase 2 (shell/dashboard/account removal): shell + dashboard **built**; account removal n/a (no accounts on live site; Supabase = subscriptions only, kept).
- Phase 3 (password tools): not started
- Phase 4 (scams/safety/recovery/guides): not started
- Phase 5 (everyday tools): not started (optional)
- Phase 6 (files/images): not started (optional)
- Phase 7 (invoice): not started (optional)
- Phase 8 (hardening/offline/quality): not started (required for whatever exists). Deferred from Phase 1: zero-network headless-Chrome test + Lighthouse numbers.

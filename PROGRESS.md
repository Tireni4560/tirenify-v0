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

## PHASE A — PLAN (foundation; tools themselves land in Phase B+)

Inventory (done, from reading + `git grep`): routes in `src/config/routes.js`
(status live/planned, app + `scripts/gen-meta.mjs` read it); in-house router
(`src/lib/router.jsx`: Link/navigate/matchPath); per-route head via `applyHead`
(`src/lib/head.js`) + build-time snapshots via gen-meta; shell
(`src/components/AppShell.jsx`: sidebar/bottom bar/header/footer); UI atoms in
`src/components/ui.jsx` (PageHeader/Chip/LetterAvatar/Skeleton) + dashboard-local
ScoreRing; storage in `src/lib/device-storage.js` (`safeyard:breach-history`,
masked summaries only, dashboard habits key `safeyard:habits` lives in the route);
tokens in `src/styles.css` (@theme, dark `#060b18`, self-hosted Sora/Manrope,
`surface`/`bg-brand` utilities, print stylesheet started); brand in
`src/config/brand.js`; score in `src/lib/score.js` (breach 50/habits 30/checkup 20,
tested); tests in `tests/*.test.js` (33, node env); protected areas per Standing
rules above — no auth/profile code in the live app (it all lived in
`tirenify-src/`, now deleted).

Build order (each step: write code, keep build+tests green):
1. `src/lib/storage.js` (+ keep `device-storage.js` as a thin compat re-export so
   the breach summary format/behavior is untouched) — namespaced `safeyard:` keys,
   schema version, safe access, additive migration, getAll/export/import/clear,
   per-category clear, size report.
2. Helpers: `src/lib/random.js` (+ tests), `src/lib/validators.js` (+ tests),
   `src/lib/formatters.js` (+ tests), `src/lib/hooks.js` (useLocalState,
   useDebounce, useClipboard, useOnlineStatus, useWorker, usePageMeta).
3. Registry `src/content/tools.js` (empty tool list in Phase A — no tool exists
   yet and unbuilt tools stay OUT of registry/nav/sitemap; registry ships with
   schema + query helpers + unit tests). Categories from brand.js CATEGORIES.
4. Route generation: extend `src/config/routes.js` with REAL new pages only
   (/tools, /tools/:slug with registry binding, /my-data, /report, /checkup stays
   planned until Phase E); App.jsx renders data-driven from registry (lazy chunks
   per route; focus-to-H1 on route change; per-route error boundary).
5. UI kit `src/components/ui-kit.jsx` (Button…ProgressBar per scope 6c; reuse
   existing PageHeader/Skeleton), `src/components/tool-page.jsx` (H1, purpose,
   offline badges, aria-live result, How-it-works accordion, Limits panel, Tips,
   Related, Next steps, copy/print/export actions), engines
   (`src/components/engines.jsx` + pure logic where testable; GuideRenderer never
   uses dangerouslySetInnerHTML).
6. Shell completion in AppShell.jsx (grouped sidebar, bottom bar + More sheet,
   footer, global search palette Ctrl+K with in-house fuzzy match, favorites +
   recents via storage, theme system/light/dark, offline indicator), /tools
   directory page, /my-data page.
7. Core pages (item k): /report (masked-data summary + empty state + print),
   /help (12+ grouped Q&A, mailto from SUPPORT_EMAIL, guide links→none yet),
   /about (credits/licenses incl. bundled libs), /privacy + /terms (expanded;
   add lawyer-review line to OWNER_TODO.md).
8. Sitemap from registry+routes (gen-meta already data-driven — extend to tool
   slugs once tools exist; Phase A: new static pages included automatically).
9. Test tooling (item i): new unit tests for storage/random/validators/registry;
   `scripts/zero-network.mjs`, `scripts/axe-scan.mjs`, `scripts/overflow-check.mjs`
   (headless-Chrome scripts; docs say how to run; nothing test-related ships in
   the client build). `npm audit` + report.
10. Update PROGRESS.md (done/not-done/decisions/libraries+sizes/how-to-verify),
    RUN.md (verified commands), OWNER_TODO.md (lawyer review, icon replacement,
    wordlist license when it lands, help-link verification slots).

Decisions: registry starts EMPTY (honest: every entry must work end-to-end);
ToolPage/engines ship unreferenced-but-tested until Phase B wires first tools;
no new runtime deps (all in-house); dev-only test scripts may document optional
`playwright`/`axe-core` installs but client bundle gains zero bytes.

---

## STANDING RULES (copied from Phase A brief; every later phase must follow these)

C1. CORRECTION to "NO ACCOUNTS and no server-side storage of user data": **the only
server-side storage allowed is what the EXISTING email-subscription flow already
needs** (e.g. a subscribers table and its email-sending service). Keep it exactly
as it is. Do not add any other server-side storage.

C2. CORRECTION: wherever the prompt says "Limits panel (see section 15)" or
"(see section 15)" for the Limits panel, **it means section 14 (LIMITS REGISTER)**.

SAFE DELETION RULE (mandatory): the subscription flow (subscribe API, confirmation
email, confirm/unsubscribe pages/routes, its server routes, its database access and
its email-sending service) and the Breach Guard route are PROTECTED. Before deleting
any file, dependency or environment variable, search for every import and reference
to it. If a protected area uses it, KEEP it. In particular, do NOT remove the
Supabase package, Supabase client files, Supabase environment variables, the Resend
package or its keys if the subscription flow or any server route uses them: delete
only the account/auth/profile code inside or around them.

---

## PHASE A — CLEANUP (item j): deletion table

Method: `git grep` run for every import/reference of each candidate. "Referenced by
protected code?" covers: `server.js` (breach route + subscription routes), `lib/`,
`send-newsletter.js`, root `src/` (SPA), `scripts/` build/dev tooling, `index.html`,
`vite.config.js`, `schema.sql`, `.env.example`.

| Path | Why account-only / Lovable-only | Referenced by protected code? | Action |
|---|---|---|---|
| `tirenify-src/` (whole directory, 89 files: `.lovable/project.json`, `src/routes/profile.tsx`, `src/routes/settings.tsx`, `src/routes/alerts.tsx`, `src/lib/lovable-error-reporting.ts`, `src/components/ui/avatar.tsx`, `src/lib/scan-store.ts`, Radix/shadcn `src/components/ui/*`, TanStack `src/router.tsx` + `src/routeTree.gen.ts`, `src/server.ts`, plus its own `package.json` / `vite.config.ts` / `vitest.config.ts` / `bun.lock`) | Exported Lovable prototype (`template: tanstack_start_ts_current`) holding the account-only code: profile page (name+email), settings, alerts, avatar, auth/telemetry. Root vite build never reads it; root `src/` never imports it; root `vitest.config.js` names it only to EXCLUDE it. | **no** (only PROGRESS.md + vitest.config.js mention it — neither is protected behavior) | DELETE whole directory |
| `node-fetch` in root `package.json` | Zero `require`/`import` matches in `server.js`, `lib/`, `send-newsletter.js`, `scripts/`, `src/` — server uses Node 18+ global `fetch`. | no | DELETE dep only if clean `npm install` passes; else keep + note |
| `@supabase/supabase-js`, `resend`, Supabase env vars, `schema.sql`, `server.js` Supabase/Resend blocks, `send-newsletter.js` | They power the PROTECTED subscription flow (subscribe/confirm/unsubscribe + confirmation/newsletter emails). | **yes — protected** | KEEP, untouched |
| `src/components/email-flow.jsx`, `src/components/email-optin.jsx` | Client half of the PROTECTED subscription flow. | **yes — protected** | KEEP, untouched |
| lovable-tagger / Lovable meta / "Edit with Lovable" / "coming soon" in the ACTIVE app | Searched active `src/`, root `index.html`, `vite.config.js`: zero matches. The only "coming soon" text lived inside `tirenify-src/` (deleted above). No placeholders ship. | n/a | Nothing to delete |

Deletion log (2026-10-10, Phase A session):
- `git rm -r tirenify-src/` staged (89 files) + working-tree copy removed. Build
  (vite OK, gen-meta wrote 5 snapshots) and unit tests (33/33) still pass.
- `node-fetch` kept for now — unused, but removing it would force a full
  `npm install` re-verify; deferred to end of Phase A if time allows.
- Subscription-flow verification (code path; see notes below): with keys absent,
  `handleSubscribe` returns 503 with the friendly "not available" message
  (server.js:350-355); confirm route behaves the same (server.js:511-515).
  IMPORTANT LESSON: the local `.env` is untracked but REAL — `dotenv` loads it
  into any `node server.js` started locally, so the first "unconfigured" probes
  actually used the real keys, wrote 3 probe rows (`probe`, `probe2`, `probe3`
  @example.com) and sent real confirmation emails. All probe rows were deleted
  afterwards (verified 0 remain), but the owner should know those 3 confirmation
  emails went out. Future probes must move `.env` aside first, or test only
  validation paths (e.g. invalid email → 400) which never touch the DB.
- Owner note: `tirenify-src/` deletion is staged only (no commit/push per rules).
- `git status` shows modified `public/*` build snapshots from the re-build —
  that output is committed by design (deploy uses it), so rebuild diffs are
  expected; owner commits when ready.

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

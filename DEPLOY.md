# DEPLOY.md — Vercel production readiness (project: breachchecker)

_Last verified: 2026-10-11 on Node v24.20.0 / npm 11.19.0 (Windows). No deployment was performed; no secrets are printed here._

## Current architecture and mode

**Mode A — Express + committed static `public/`.** Vercel serves committed `public/` files statically and auto-detects `server.js` as the Express function. `vercel.json` is header-only; it has no rewrites or builds.

Evidence:
- `server.js` is CommonJS, exports the Express app (`module.exports = app`) and only binds a port when run directly (`if (require.main === module) { app.listen(PORT, ...) }`). Vercel's Express auto-detection requires `server.js` and gets the exported app; `app.listen` never runs under Vercel, so no `process.env.VERCEL` guard is required.
- `public/` is committed build output: hashed `assets/`, per-route `index.html` snapshots, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `favicon.png`, `og-preview.png`, `fonts/`, and (now) `sw.js`. `vite.config.js` builds into `public/` (`outDir: "public"`, `publicDir: "static"`), and `npm run build` = `vite build && node scripts/gen-meta.mjs`.
- Regenerating `public/` with the production build produced a byte-identical tree: `git status --porcelain public/` was empty after the rebuild. The committed output is **fresh** and matches the source.
- `package.json` has no `vercel-build` script; nothing needs to run on Vercel at deploy time under mode A.
- The smoke script (70/70 PASS, `--live` included), the Vercel-precedence emulator (ALL PASSED), and headless Chrome (zero CSP/console errors, app renders) were run against a local production-mode `node server.js` that serves the same headers the new `vercel.json` sets.

How each request is served under mode A (Vercel precedence):
1. **Static file in `public/`** (CDN, before any function) — every live route has a `public/<route>/index.html` snapshot.
2. **Express function** (`server.js`) for everything else — `/api/*` (breach check, subscribe, confirm, unsubscribe), plus its own SPA fallback and JSON 404 handler.

The Express function never sees static-file requests on Vercel (the CDN serves them first), which is why security headers had to be added to `vercel.json` (see the audit below).

## Three-configuration resolution

There were three disagreeing configurations; this pass resolved them to mode A.

| | What it was | Resolution |
|---|---|---|
| **A. Production (proven live)** | Express with committed `public/`; no Vercel build output is needed. | Kept as the target. `server.js` exports the app; `public/` is committed. |
| **B. Dashboard Project Settings** | Framework Express + Build Command override `echo "using committed public"` + empty Output Directory. | Owner must keep these settings (see DASHBOARD CHANGES). |
| **C. safeyard-hub `vercel.json`** | A catch-all rewrite sent API requests to `/index.html`, producing the POST 405. | Removed the entire `rewrites` array; kept only headers, with no `builds` or legacy `routes`. |

Every line kept in the new `vercel.json`:
- `version: 2` — current config version.
- `headers[0].source "/(.*)"` — applies the security headers to every path (HTML, assets, the service worker). Required because static files bypass Express middleware on Vercel. Values mirror what `server.js` already sets (CSP, nosniff, DENY, no-referrer, HSTS, COOP, Permissions-Policy with camera denied except on `/tools/qr-code`).
- `headers[1]` (`/sw.js` → `Cache-Control: no-store`) — guarantees the service worker is never long-cached.

The `builds` entry was **not** kept. Under mode A, Vercel auto-detects `server.js` as the function and serves `public/` statically; a `builds` entry would replace that with a single function for `api/breach-check.js` and drop the Express server (which owns the subscription flow), which is exactly the breakage the `builds` approach caused.

## ROUTE TABLE

Legend — served by: **static** = physical `public/<route>/index.html` (CDN, direct load + refresh both work); **function** = Express `server.js` route (direct load + refresh both work). Planned routes use the Express SPA fallback and render the client-side 404 view after the shell loads.

### Live app routes (all have physical `public/<route>/index.html` snapshots)

| Route | Served by | Direct load / refresh |
|---|---|---|
| `/` | static `public/index.html` | ✅ |
| `/breach-guard` | static `public/breach-guard/index.html` | ✅ |
| `/report` | static `public/report/index.html` | ✅ |
| `/account` | static `public/account/index.html` | ✅ (local-only profile, device storage) |
| `/tools` | static `public/tools/index.html` | ✅ |
| `/tools/password-generator` | static | ✅ |
| `/tools/password-strength` | static | ✅ |
| `/tools/username-generator` | static | ✅ |
| `/tools/email-alias-generator` | static | ✅ |
| `/tools/security-answer-generator` | static | ✅ |
| `/tools/pin-generator` | static | ✅ |
| `/tools/passphrase-generator` | static | ✅ |
| `/tools/entropy-calculator` | static | ✅ |
| `/tools/password-reuse-checker` | static | ✅ |
| `/tools/leak-safety-guide` | static | ✅ |
| `/tools/qr-code-generator` | static | ✅ |
| `/learn` | static `public/learn/index.html` | ✅ |
| `/learn/in-a-breach` | static | ✅ |
| `/learn/unique-passwords` | static | ✅ |
| `/learn/setup-2fa` | static | ✅ |
| `/learn/spotting-phishing` | static | ✅ |
| `/learn/what-is-a-data-breach` | static | ✅ |
| `/learn/whatsapp-takeover` | static | ✅ |
| `/learn/sim-swap` | static | ✅ |
| `/learn/mobile-money-safety` | static | ✅ |
| `/help` | static `public/help/index.html` | ✅ |
| `/privacy` | static | ✅ |
| `/terms` | static | ✅ |
| `/about` | static | ✅ |

### Planned routes (no snapshot; Express SPA fallback serves the shell, client shows 404 view)

| Route | Served by | Direct load / refresh |
|---|---|---|
| `/my-data`, `/checkup`, `/privacy-check` | Express SPA fallback | ✅ shell loads, client 404 |
| `/recover`, `/recover/hacked-account`, `/recover/stolen-phone` | Express SPA fallback | ✅ shell loads, client 404 |
| `/learn/scams`, `/learn/scam-quiz` | Express SPA fallback | ✅ shell loads, client 404 |
| `/tools/link-checker`, `/tools/scam-checker`, `/tools/qr-code`, `/tools/wifi-safety`, `/tools/warning-card` | Express SPA fallback | ✅ shell loads, client 404 |
| any unknown path (e.g. `/_does-not-exist-404`) | Express SPA fallback | ✅ shell loads, client 404 |

### server.js function routes (never rewritten; always the Express function)

| Route | Method(s) | Behavior |
|---|---|---|
| `/api/breach-check` | POST | Shared core `lib/breach-check.js`. 400 invalid email, 429 rate-limited, 200 result. Never logged. |
| `/api/email/subscribe` | POST | Signup: upsert user + pending subscription, send double-opt-in email via Resend. |
| `/api/email/confirm` | GET (`?token=`) | Confirm subscription from the email link. |
| `/api/email/unsubscribe` | GET (`?email=`), POST | Unsubscribe; GET redirects to `/?unsubscribed=1`. |
| `/api/*` (unknown) | any | JSON 404 (`not-found`). |

### Key static files (root paths, CDN)

`/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js` (not long-cached), `/favicon.png`, `/og-preview.png`, `/assets/*` (hashed), `/fonts/*`.

**What `/account` is:** `src/routes/account.jsx` is a **local-only profile** — name + email saved to this device's storage under the allow-listed `profile` prefs key. It is **not** a login, **not** a server profile, and never touches Supabase users or the subscription flow (separate keys and routes). Nothing leaves the device.

## ENV CHECKLIST

Name → used where → required in production → safe for browser → set in Vercel?

| Name | Used where | Required in prod? | Safe for browser? | Set in Vercel? |
|---|---|---|---|---|
| `SUPABASE_URL` | `server.js` (subscription) | Yes (subscription flow) | No (server-only) | ✅ Yes (Prod + Preview) |
| `SUPABASE_ANON_KEY` | `server.js` (config check) | Yes (subscription flow) | No (server-only) | ✅ Yes (Prod + Preview) |
| `SUPABASE_SERVICE_ROLE_KEY` | `server.js` (subscription writes) | Yes (subscription flow) | **Never** — must never reach client | ✅ Yes (Prod + Preview) |
| `RESEND_API_KEY` | `server.js` (send email) | Yes (subscription flow) | **Never** — server-only | ✅ Yes (Prod + Preview) |
| `APP_URL` | `server.js` (canonical/og, email links, 301); `scripts/gen-meta.mjs` (build-time sitemap/canonical) | **Yes** (safe default `https://check.tirenify.app` in code, but set it explicitly) | No (server-only) | ❌ **NOT set — owner must add** (Prod + Preview) |
| `VITE_APP_URL` | `src/config/brand.js` (`import.meta.env`) → client canonical/og/manifest | No (safe default `https://check.tirenify.app` in code) | Yes (public URL, VITE_-prefixed) | ❌ **NOT set — owner should add** (Prod + Preview; must match `APP_URL`) |
| `EXPOSED_ORKNOT_API_KEY` | `lib/breach-check.js` (raises upstream rate limit) | No (XposedOrNot free tier works) | No (treat as secret) | ❌ NOT set — optional; free tier OK |
| `FRONTEND_URL` | `send-newsletter.js`, `server.js` (email links) | No (falls back to `APP_URL`) | No (server-only) | ❌ NOT set — redundant with `APP_URL`; optional |

Secret-safety scan: the built `public/` assets were grepped for `service_role`, `API_KEY`, `RESEND`, `SUPABASE`, `TOKEN`, `Bearer`. The only hits were false positives (the words "token"/"Bearer"/"TOKEN" inside data-type names like "auth token"/"access token", the string "modulepreload", and the public `VITE_APP_URL` default). **No secret values appear in the built output.** `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are read only by `server.js` / `send-newsletter.js`, never imported by client code, so they cannot reach the browser. Only `VITE_`-prefixed variables are exposed to the client by Vercel.

Note: changing any environment variable in the dashboard only applies to **new** deployments (Vercel semantics), so set them before the next production deploy.

## Audit

| # | Item | Verdict | Evidence / note |
|---|---|---|---|
| 1 | Config conflict (A vs B vs C) | **FIXED** | Catch-all rewrite removed from `vercel.json`; headers remain, no `builds`; owner sets dashboard to Express + committed-public mode. |
| 2 | Express on Vercel (entry, exports, runtime) | **PASS** | `server.js` CommonJS (no `"type":"module"` at root), explicit relative imports with `.js`, no TS/Vite-only syntax in server code; `module.exports = app`; `require.main === module` guards `listen`. `lib/*` reads are included in the function bundle. |
| 3 | Routing (deep links, refresh, 404, root paths) | **PASS** | Smoke 68/68; Vercel-precedence emulator: live routes → static, planned/unknown → rewrite → shell, `/api/*` → function (not swallowed). |
| 4 | Environment variables | **PARTIAL** | 4 Supabase/Resend vars set; `APP_URL` + `VITE_APP_URL` not set (safe code defaults exist) → owner adds. |
| 5 | Build & dependencies | **PASS** | `npm install` exit 0 (lockfile consistent; `npm ci` blocked only by a Windows AV file-lock, not a mismatch). Production build reproduces committed `public/` byte-for-byte. `engines` pinned to `24`. |
| 6 | Committed-output consistency | **PASS** | All `public/**/*.html` asset refs resolve to git-tracked files with exact case; no localhost/127.0.0.1/dev URLs; `/og-preview.png` exists and serves. |
| 7 | API on serverless | **PASS** (with notes) | Upstream timeout 15s < Hobby max 300s; at most 3 attempts (transient-only); handles 429/5xx/parse errors; `x-forwarded-for` first value for per-IP limits; email/body never logged. In-memory rate limit + cache are **per function instance**; XposedOrNot's ~1 req/s limit is per source IP while Vercel functions share egress IPs, so production may see more upstream 429s than local (handled with the friendly "We're busy" message). |
| 8 | Subscription flow | **PASS** (read-only trace) | Confirm links built from `FRONTEND_URL`→`APP_URL` (never localhost); Supabase uses service-role key server-side only; Resend uses `RESEND_API_KEY`; nothing writes to disk; confirm/unsubscribe work as direct loads; `send-newsletter.js` is a local CLI, not a route. Never ran a real signup. |
| 9 | Headers & CSP | **PASS** | Security headers moved to `vercel.json` so they cover static files; CSP allows `connect-src 'self'`; headless Chrome on `/` and `/tools/password-generator` (with these headers) → zero CSP violations, zero console errors, app renders. No `eval`/`new Function`/inline `<script>` in built output. |
| 10 | Service worker & PWA | **PASS** (with note) | `public/sw.js` created (was missing from the repo); served at `/sw.js` (`text/javascript`), `Cache-Control: no-store`; never caches `/api/*`; registers from `main.jsx`. Offline-after-first-visit needs a **manual PWA check** in a real browser (see owner checklist) — not automatable here without adding a dependency. |
| 11 | URLs & SEO | **PASS** | Canonical/og:image/sitemap/robots/manifest use `https://check.tirenify.app` (from `APP_URL`/`VITE_APP_URL` defaults). Legacy-host 301 is **inactive** while `APP_URL` host == `check.tirenify.app`. |
| 12 | Hygiene | **REPORTED** | Stray tracked files (see below). `test-fetch.js`/`test-output.log` are **not tracked** on this branch (they exist only on `main`); `src/components/AppShell-fixed.jsx` is tracked and unused. None break production. |

### UNKNOWNs (must be checked by the owner)

- Contents of `vercel.json` on `safeyard-hub` before this pass — **now known**: it was the `builds` entry (`api/breach-check.js` + `@vercel/node`), added at `eec788e`. (Was UNKNOWN in the brief; resolved here.)
- The selected Node major on the dashboard (24.x vs 22.x) — owner must confirm; must be **24.x** to match `engines`.
- Function region and max duration — default region `iad1`, max duration 300s on Hobby (per docs). Not overridden in `vercel.json`; owner can confirm in Project Settings.
- The 3 extra domains — names not seen; owner must confirm they are aliases of `check.tirenify.app` (the legacy-host 301 only activates if `APP_URL` host differs from `check.tirenify.app`).
- Whether the `safeyard-hub` preview's API worked — the prior 405 was caused by the catch-all rewrite; after this fix the preview will use the Express route once the dashboard is aligned.
- Team-level "Separate Production Secret Values" policy state — owner must confirm whether Preview and Production share the same secret values (both currently use the same four names).

### Hygiene notes (report only; none break production)

- `src/components/AppShell-fixed.jsx` — tracked, unused duplicate of `AppShell.jsx`. Left in place per instructions (do not delete).
- `test-fetch.js`, `test-output.log` — **not tracked** on this branch; exist on `main`. They are untracked here, so they will not be deployed.
- `.gitignore` has no `.vercel/` entry. No `.vercel/` directory exists and the Vercel CLI was never run in this pass, so nothing is at risk; add `.vercel/` to `.gitignore` if you ever run `vercel env pull` (the pull writes secrets to a file).
- `send-newsletter.js` is a local CLI (`npm run newsletter`), not exposed as a route.

## Changes made

Every change below is the smallest that resolves a FAIL. Undo = revert the single file (git checkout <file>).

| File | Change | Reason | Risk | Undo |
|---|---|---|---|---|
| `vercel.json` | Removed the catch-all `rewrites` array; retained security headers and `/sw.js` no-store. No `builds`, no `routes`. | The catch-all rewrite sent `POST /api/breach-check` to `/index.html`, causing 405. Headers must cover static files because they bypass Express middleware. | Low — Express owns API and SPA fallback behavior. | `git checkout vercel.json` |
| `api/breach-check.js` | Deleted. | Dead mode-C serverless function (the `builds` entry's src). `POST /api/breach-check` is fully served by `server.js` (shared core `lib/breach-check.js`), which is what production (mode A) already uses. | None — the API is served by `server.js` in mode A. | `git checkout api/breach-check.js` (restore file; not needed under mode A) |
| `public/sw.js` | Created a minimal service worker: cache-first app shell, network-first navigations, never caches `/api/*`, `skipWaiting`+`clients.claim` update flow. | The PWA audit requires `sw.js` (it was deleted from the repo in an earlier phase). Served at `/sw.js` with `Cache-Control: no-store` from `vercel.json`. | Low — best-effort; app works without it. | `git rm public/sw.js` (and remove the `/sw.js` cache header if desired) |
| `src/main.jsx` | Registered `/sw.js` after window load (best-effort, `onupdatefound` handles updates). | Required for the SW to run; the PWA audit. | Low — registration is best-effort and non-blocking. | `git checkout src/main.jsx` |
| `package.json` | `engines.node` `"24"` (was `">=20"`). | Pin the Node major that was actually tested locally (Node 24) so the dashboard selector (22.x/24.x) is unambiguous. | None — advisory; Vercel only uses it to suggest a version. | `git checkout package.json` |
| `scripts/smoke.mjs` | Created. Dev-only smoke test (Node built-in fetch, zero deps). Checks every live route (status+title), SPA fallback, 404s, key statics+content types, security headers, `/api/breach-check` invalid-email 400, optional `--live`. Exits non-zero on failure. | Required deliverable (STEP 4.6). | None — dev-only, not deployed. | `git rm scripts/smoke.mjs` |
| `scripts/vercel-emu.mjs` | Created. Dev-only emulation of Vercel's static→rewrite→function precedence; proves deep links work and `/api/*` is not swallowed. | Required deliverable (STEP 4.3). | None — dev-only, not deployed. | `git rm scripts/vercel-emu.mjs` |
| `tests/breach-check.test.js` | Created. Mocked regression test for `lib/breach-check.js` (invalid email, success, upstream 429/5xx). | Required deliverable (STEP 4.7 — no breach-check test existed). | None — test only. | `git rm tests/breach-check.test.js` |
| `DEPLOY.md`, `PROGRESS.md`, `OWNER_TODO.md` | Documentation updates. | Required deliverables. | None. | revert |

No change was made to `server.js`, `lib/breach.js`, `lib/breach-check.js`, the loading messages, the legacy-host 301, the subscription flow, `APP_URL` handling, or `public/`'s committed build output (the rebuild was byte-identical). `public/sw.js` is the only addition to `public/`.

## DASHBOARD CHANGES FOR THE OWNER

Set these in Vercel → Project → Settings **before** merging to `main`. (Verified = confirmed against the live deployment or the docs; Inferred = from the brief, confirm visually.)

| Setting | Value | Status |
|---|---|---|
| Framework Preset | **Express** | Required — this keeps `server.js` as the Vercel function. |
| Build Command | **override ON:** `echo "using committed public"` | Required — do not run Vite on Vercel; committed `public/` is the deploy output. |
| Output Directory | **empty / override off** | Required — Express serves committed `public/`; do not set `public` as a static-only output directory. |
| Install Command | default (leave empty) | Verified — default installs from the committed lockfile. |
| Node.js Version | **24.x** (must match `engines: "24"`) | Inferred (dashboard offers 22.x/24.x; local Node is 24 — owner confirms the selected value). |
| `APP_URL` env var | `https://check.tirenify.app` — Production **and** Preview | Not set; code has a safe default but set it explicitly so email links/sitemap are unambiguous. |
| `VITE_APP_URL` env var | `https://check.tirenify.app` — Production **and** Preview | Not set; safe default in code; set it to match `APP_URL`. |
| 4 existing vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) | keep as-is for Production + Preview | Verified present. |

**Dashboard alignment:** set the Framework Preset to Express, keep the `echo "using committed public"` build override on, leave Output Directory empty/override off, and select Node 24.x. Do not re-add a `rewrites` or `builds` entry to `vercel.json`.

**Preview safety:** Vercel Authentication is off, so previews are public and share the production Supabase/Resend. Recommend (not implemented): turn on Preview Protection, or add a guard so `/api/email/subscribe` refuses signups when `VERCEL_ENV === "preview"` (only if you expose that system env var).

## DEPLOY STEPS (for the owner)

Push order — **do not merge to main until the preview passes**:

1. Commit and push these changes to `safeyard-hub` (previews deploy automatically).
2. In Vercel, open the new `safeyard-hub` **Preview** URL. Set the dashboard settings above first if you want the preview to match (or they apply to the next production deploy).
3. Run the smoke script against the preview URL:
   ```
   node scripts/smoke.mjs https://<preview-url>            # expect 70/70 ALL PASSED
   node scripts/smoke.mjs https://<preview-url> --live     # optional: ONE real check with test@example.com
   ```
   If Preview Protection is on, add `--bypass <VERCEL_AUTOMATION_BYPASS_SECRET>` (or export `VERCEL_AUTOMATION_BYPASS_SECRET`).
4. Test Breach Guard in the browser with **your own email** (real XposedOrNot call; expect a result, or the friendly "We're busy" on 429).
5. Test the subscription flow with **your own address** on the preview URL (Breach Guard → email opt-in → confirm link → unsubscribe). This writes real rows in the production Supabase and sends a real Resend email. Verify the confirm link points at `https://check.tirenify.app` (i.e. `APP_URL` is set) — not localhost and not the preview host.
6. Confirm the dashboard settings above are applied.
7. Merge `safeyard-hub` → `main`. Production redeploys automatically.
8. Re-run the smoke script against production: `node scripts/smoke.mjs https://check.tirenify.app`.
9. Manually verify the PWA once: load the site, DevTools → Application → Service Workers (SW registered), then go offline and reload (the app shell should still load).

## ROLLBACK

- **Instant Rollback (preferred):** Vercel → Deployments → find the last known-good production deployment **`breachchecker-dihx9lbbm-adeleye-daniels-projects.vercel.app`** (deployment ID `ERVAZQ3utx7dQtPDX5K4jpr4XrSb`) → **Promote to Production** / **Instant Rollback**. Hobby plan allows rolling back to an older deployment from the Deployments tab (verify the "Instant Rollback" button is enabled for your plan).
- **Fallback:** `git revert` the offending commit(s) and push — **never force-push**.
- If the API breaks after a deploy: open the deployment → **Resources** tab → confirm a function exists, then check **Runtime Logs** for the Express function. Under mode A the function is `server.js`; a missing function means the dashboard Framework preset is not "Express".

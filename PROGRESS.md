# PROGRESS.md — Safeyard by Tirenify

## THIS SESSION — shell UI fixes (DONE)

- Centered odd final cards and widened shared card grids slightly, including the six-plus-QR tools layout, without changing logic.

- Fixed mobile hamburger state/drawer wiring, desktop top spacing/sidebar alignment, and removed sidebar nav checkmarks.

> Resume file for any agent. Update this file **after every phase** with: done / not done / decisions / how to run and verify / deploy notes.
> PRODUCT_NAME = **Safeyard** (one word: capital S, lowercase "yard"). Page titles use "<Page> | Safeyard by Tirenify". Company = Tirenify. Tagline = "Know Before They Do". Breach module = "Breach Guard".
> HARD RULES: no git commit/push (user does that); ZERO network at runtime except `POST /api/breach-check` and the email-subscription flow; no accounts; no secrets in client code; all new files lowercase-hyphenated.

---

## THIS SESSION — brand naming fix (DONE)

### Root cause
`PRODUCT_FULL` ("Safeyard by Tirenify") was composed a second time with `by ${COMPANY}` in two places, producing "Safeyard by Tirenify by Tirenify":
1. `src/routes/static-page.jsx` — `{PRODUCT_FULL} by {COMPANY}.` on every static page (/help, /privacy, /terms, /about) + `PageHeader eyebrow={PRODUCT_FULL}`.
2. `src/lib/static-content.js` — about page first line `${PRODUCT_FULL} by ${COMPANY}.` and terms line `${PRODUCT_FULL} is provided by ${COMPANY}` (the rest used PRODUCT_FULL alone, correctly).
Same class of bug; the fix is in the source (brand.js rule), not one-off strings.

### Constants chosen (brand.js, documented in-file)
- `COMPANY = "Tirenify"` — company only.
- `PRODUCT_NAME = "Safeyard"` — UI chrome: wordmark, dashboard/report H1, eyebrows, error text, privacy/terms sentences where the sentence already says "provided by Tirenify".
- `PRODUCT_ATTRIBUTION = "Safeyard by Tirenify"` (alias of PRODUCT_FULL) — trust/ownership lines, exactly once per phrase: about title/first line, manifest `name`, `og:site_name`, `<Page> | …` page titles.
- RULE (in brand.js + PROGRESS here): never append "by Tirenify" to a string that already contains the attribution.
- `pageTitle` unchanged and verified: `"<Page> | Safeyard by Tirenify"`, root `"Safeyard by Tirenify — Know Before They Do"` (tagline untouched, no company in it). 404 titles (`Page not found | Safeyard by Tirenify`) checked single-attribution.
- Email/subscription subjects ("Welcome to Tirenify") are company contexts — intentionally left alone; server code untouched.

### Files changed
`src/config/brand.js` (hierarchy comment + `PRODUCT_ATTRIBUTION` alias), `src/routes/static-page.jsx` (eyebrow + contact line → PRODUCT_NAME), `src/lib/static-content.js` (about/terms reworded, attribution used exactly once), `tests/brand.test.js` (new: hierarchy constants, pageTitle single-attribution, zero-doubling sweep of static copy + route table), `public/*` (rebuilt — 28 snapshots + manifest), `PROGRESS.md`, `RUN.md`.

### Search confirmation
- `src/ + scripts`: zero matches for the doubled pattern (the last hit was the warning comment itself — reworded so the pattern no longer appears anywhere).
- Rebuilt `public/` HTML + manifest: zero matches; spot-checks: `<title>About | Safeyard by Tirenify</title>`, `og:site_name = "Safeyard by Tirenify"`, manifest `name = "Safeyard by Tirenify"`.
- `npm run build` ✓ · `npm test` ✓ 101/101 (14 files). No servers started; no commits/pushes.

---


## THIS SESSION — expanded sidebar nav + slim dashboard (DONE)

### 1) Navigation (single source: `src/config/nav.js`)
- New shared modules:
  - `src/content/tool-groups.js` — dashboard taxonomy moved out of the dashboard: Generators (7 tools), Password Security (3), Breach Checks (Breach Guard module + leak-safety-guide). `resolveGroup()` maps slugs to live destinations; groups with zero live items are dropped.
  - `src/config/nav.js` — ONE data structure for desktop sidebar, mobile bar and mobile More sheet. Every leaf resolves only when its destination is live (tool-group sections drop when empty); a test asserts no nav leaf can 404.
- Final desktop sidebar order (sectioned): **Overview** → Dashboard, Security Report (/report), Account → **Checks** → Breach Guard → **Tools** → Tools — all, Generators (`/tools?section=generators`), Password Security (`/tools?section=password-security`), Breach Checks (`/tools?section=breach-checks`), QR Code Generator → **Learn** → Security Center (/learn). (Task-ordered core entries: Dashboard | Breach Guard | Tools | Learn(→"Security Center") | Report(→"Security Report") all present; labels use the longer forms since the sidebar has room.) No categories omitted — none are empty.
- Mobile: bottom bar with the first 4 sidebar destinations (Dashboard, Security Report, Breach Guard, Tools — all) + **More** sheet (toggle button, closes on navigation) for the rest. Active state highlights both the bar and the More button when a rest-item route is active.
- Active-state rule (`isNavActive`): exact for `/`, prefix match for nested pages (`/tools/...`, `/learn/...`); section links (`/tools?section=x`) are active only when the same section query is open and never claim tool pages.
- `/tools?section=<id>` filtering implemented in `tools.jsx` (filtered header + cards + "← All tools"); `#category` anchors kept. Unknown `?section=` falls back to the full directory.
- Homepage footer link + Help/Privacy/Terms/About untouched; wordmark unchanged; no new icons.

### 2) Dashboard slimmed (home is now exactly the spec)
- `/` contains ONLY: header (Safeyard by Tirenify + tagline), intro+CTAs (Run Breach Guard / Browse all tools + privacy note), security score w/ 50/30/20 breakdown and Partial state, breaches-found summary + empty state, 4-item safety habits checklist (device storage), recent activity (masked), your-data-on-this-device + clear button.
- REMOVED from dashboard: Generators / Password security / Breach Checks card grids, Security Center guide cards, Recent tools panel, Account profile preview, dedicated Security Report section, PROTECT/AFTER_BREACH links, and the dashboard-local DASH_GROUPS/BREACH_CARD/CENTER guides/recents/profile constants. Those live in the sidebar and their own routes (`/tools?section=`, `/learn`, `/account`, `/report`) — dashboard no longer duplicates them. Score math, habits storage, breach masking, copy, and styling preserved.

### Verified
- `npm run build` ✓ 28 snapshots; `npm test` ✓ **98/98** (13 files, +7 `tests/nav.test.js`: required entries present, every leaf live, mobile union == sidebar set, prefix active states, empty-group drop, every live tool exactly once across groups).
- Click-test: `/`, `/breach-guard`, `/tools`, `/tools?section=generators`, `/tools?section=breach-checks`, `/report`, `/account`, `/tools/qr-code-generator`, `/learn` — all expected live; `git diff server.js lib/`-area server code untouched (config content modules only). Stray dev server from an earlier pass found and killed; ports free.
- No commits, no pushes.

### Files changed this session
`src/config/nav.js` (new), `src/content/tool-groups.js` (new), `tests/nav.test.js` (new), `src/components/AppShell.jsx` (sectioned sidebar + More sheet), `src/routes/tools.jsx` (`?section=` filter), `src/routes/index.jsx` (slim dashboard), `src/config/brand.js` (full-length nav labels), `public/*` (rebuilt), `PROGRESS.md`, `RUN.md`.

---


## THIS SESSION — drop offline messaging, QR generator, /report, /account, dashboard reorg (DONE)

### 1) Offline messaging removed
- Deleted: `useOnlineStatus` hook (had zero callers), both ToolPage offline badges, tools-directory "Offline" badges, "works offline"/"on your device because offline" copy in hero/PageHeader/Learn/learn/:slug route descriptions/help/about/password-strength/reuse-password descriptions and password-tools copy.
- Registry: `offline: true` field removed from all 11 entries, doc comment and validator dropped; `registry.test.js` updated (no `tool.offline` assertions).
- Copy now frames privacy and honesty instead: ToolPage shows one badge — "Nothing you type is uploaded"; limits/tips unchanged (signals-not-verdicts).
- KEPT (not marketing): the breach-check `FRIENDLY.offline` error kind (functional network error on the allowed Breach Guard route) and privacy wording like "nothing is uploaded"/"stored on this device".

### 2) QR Code Generator (live, zero new deps)
- `src/lib/qr-code.js` (new) — **in-house QR encoder, no new runtime dependency**: byte mode, EC level M, versions 1–20 (max 666 bytes). Covers GF(256)+Reed–Solomon, all 8 masks with standard penalty scoring. The bundled `qrcode@1.5.4` npm package was used only in a temp dev check (installed OUTSIDE the repo, deleted after) and confirmed **9/9 byte-identical matrices** (same version, mask, all modules) across v1–v20; golden matrix pinned in `tests/qr-code.test.js` (7 tests).
- `src/components/qr-tool.jsx` (new) — ToolPage layout with purpose/how-it-works/limits/tips, canvas preview, **PNG + SVG download**, input counter vs `QR_MAX_BYTES`. Registered as `qr-code-generator` (category `everyday`, priority 11) with live `/tools/qr-code-generator` route; `/tools/:slug` map merged in `tool.jsx`; surfaced in the /tools directory, registry search, dashboard Generators section and sitemap.
- If a camera/scanner is ever wanted later, it is still unbuilt (no placeholder).

### 3) Security Report — first class
- `/report` is **live**: `src/routes/report.jsx` (new) built only from local data (masked breach summaries, habits, leak-checklist ticks + the same partial-aware score formula as the dashboard). Empty state with CTAs (Breach Guard / tools / dashboard) — never invents scores. Print button (`window.print()`, `.no-print` aware).
- Nav is now **Dashboard | Breach Guard | Tools | Learn | Report** (Report item derived from `LIVE_ROUTES`, same pattern as the rest; shows on desktop sidebar and the mobile bar).
- Dashboard has a dedicated "Security Report" section (heading + description + primary button → /report).

### 4) Account (local only)
- `src/routes/account.jsx` (new, live `/account`) — exact UX from the task: Account / Profile, avatar letter from name, name + email fields with `you@example.com` placeholder, "Save changes" → writes to device storage under the allow-listed `profile` prefs key, `aria-live` success confirmation ("Saved on this device."), "Saved on this device. Full accounts are coming soon." wording kept. No auth, no Supabase users, no server APIs, subscription flow untouched ("Clear data" wipes profile too, since it uses `storage.clearAll`).
- Dashboard "Account" section shows the saved profile preview + "Manage profile" → /account. Not added to nav (spec targets 5 nav items).

### 5) Dashboard taxonomy (evaluated, implemented)
- Inventory: 11 live tools (7 generator-shaped, 3 checker-shaped, 1 guide) + Breach Guard module + 8 learn guides + /report.
- Chosen groups (task's suggested taxonomy + Breach checks as the obvious home for the module):
  - **Generators** (7) → `/tools`: password, passphrase, PIN, username, email alias, security answer, **QR**
  - **Password security** (3) → `/tools#passwords`: strength, reuse, entropy
  - **Breach checks** (2) → cards link directly: Breach Guard + leak-safety-guide
  - Every live tool appears **exactly once**; zero-live-tool categories skipped — no empty shells. `/tools` keeps registry categories (`#passwords` anchor added).
- Replaced "Quick tools"/"Protect your accounts"/"After a breach" (their cards duplicated tools now in the groups). Kept: hero, score/breaches/habits/activity/data snapshot, Security Center cards, recent tools.
- Dashboard order: hero → Security Report → Account → snapshot grid → tool groups → Security Center → Recent tools.

### 6) Footer
- AppShell footer (the only footer) now has **Homepage → https://tirenify.app/** (`target="_blank" rel="noopener noreferrer"`, matching the existing external-link pattern). Help, Privacy, Terms, About kept.

### Verified
- `npm run build` ✓ — **28 snapshots** (+`/report`, `/account`, `/tools/qr-code-generator`); sitemap updated.
- `npm test` ✓ — **91/91** (12 files; +7 QR incl. reference-pinned golden matrix).
- Dev smoke: `/`, `/tools/qr-code-generator`, `/report`, `/account`, `/learn/setup-2fa` → all 200; temp `_qrcheck` deleted; **ports 5173/3000 confirmed free**.
- `git diff server.js lib/` → empty (breach + subscription server code untouched).

### Files changed this session
`src/lib/qr-code.js` (new), `src/components/qr-tool.jsx` (new), `src/routes/report.jsx` (new), `src/routes/account.jsx` (new), `src/content/habits.js` (new, shared dashboard/report), plus edits: `tools.js`, `hooks.js`, `static-content.js`, `breach-api.js` (error copy only), `storage.js` (allow-list `profile`), `tool-page.jsx`, `tools.jsx`, `tool.jsx`, `learn.jsx`, `index.jsx`, `routes.js` (+qr, /report, /account live), `brand.js` (`report: "Report"`), `App.jsx`, `AppShell.jsx`, `registry.test.js`, `password-tools.test.js`, `qr-code.test.js` (new), `public/*` (rebuilt), `PROGRESS.md`, `RUN.md`.

### Decisions / notes
- Profile email is stored raw by explicit design of this task (name+email entered deliberately for a local profile) — the no-raw-email rule still applies to tools/breach flows.
- "Offline attack" wording was rephrased to avoid the word while keeping the cryptographic meaning; scan-tool mention removed from Help copy since no scanner exists.

---



## THIS SESSION — Learn / Security Center + richer dashboard (DONE)

### Part A — Learn / Security Center
- **`src/content/learn.js` (new)** — 8 fully-written guides (5 required + 3 optional, all shipped): `what-is-a-data-breach`, `unique-passwords`, `setup-2fa`, `spotting-phishing`, `in-a-breach`, `sim-swap`, `mobile-money-safety`, `whatsapp-takeover`. Shape: slug/title/category/summary/sections[{heading,body}]/related/tools. Helpers: `getGuide`, `listGuides`, `guidesByCategory`, `validateGuides`, `LEARN_CATEGORIES` (Start here / Protect your accounts / If something goes wrong). African-first examples throughout (parcel-fee lures, OTP fraud, SIM swap, M-Pesa-style warnings, WhatsApp takeover). Plain string bodies — never HTML, never `dangerouslySetInnerHTML`. Works offline (baked into the bundle).
- **`src/routes/learn.jsx` (new)** — hub: PageHeader "Security Center" + subtitle "Clear, practical guidance — no jargon.", guides grouped by category as cards.
- **`src/routes/guide.jsx` (new)** — `/learn/:slug` article route: 404 for unknown slugs, per-article `<head>`, sections as plain elements, related guides + related LIVE tools (guard: `LIVE_ROUTES` check), "All guides" + Breach Guard CTAs.
- **`src/config/routes.js`** — `/learn` (retitled "Security Center") + new `/learn/:slug` pattern → live; the 8 shipped articles → live. Still planned: `/learn/scams`, `/learn/scam-quiz`, `safe-public-wifi`, `safe-online-shopping`, `loan-app-privacy`, `breach-data-types` (no content written — not linked anywhere).
- **`src/App.jsx`** — lazy `LearnHub`/`GuideRoute` branches; App-level head skipped for `/learn/:slug` (GuideRoute owns it).
- **`src/components/AppShell.jsx`** — Learn nav item added (derived from LIVE_ROUTES, same pattern as Tools). Sidebar + bottom bar now: Dashboard / Breach Guard / Tools / Learn.

### Part B — dashboard sections added (src/routes/index.jsx)
All destinations live-route-guarded (`LIVE_ROUTES` set) — no card can link to a 404:
1. **Hero** — "Know before they do" + Run Breach Guard (primary) + Browse all tools + on-device/no-account line.
2. **Existing pieces kept** — score ring + breakdown, breaches-found card, safety habits, recent activity, "Your data on this device" panel (untouched).
3. **Quick tools** — top 6 live tools by registry priority → `/tools/<slug>` + "All tools →".
4. **Security Center** — the 5 core guide cards + intro line + "See all guides → /learn".
5. **Protect your accounts** — 4 checklist cards: make a strong password / check strength / turn on 2FA (/learn/setup-2fa) / stop reusing (password-reuse-checker).
6. **If a check finds your email** — Breach Guard, /learn/in-a-breach, /tools/leak-safety-guide.
7. **Recent tools (local progress)** — reads storage prefs `recents` (allow-listed key, slugs only, capped 6); empty state with one CTA ("Browse all tools"), not a dead panel. Written by `tool.jsx` (`rememberVisit`) on every tool open.
- Footer row skipped on purpose — the shell footer already has Help / Privacy / Terms / About.

### Verification
- `npm run build` ✓ — **25 route snapshots** (was 16): adds `/learn` + 8 article `index.html` files with correct titles; sitemap lists all 9 learn URLs.
- `npm test` ✓ — **84/84** (11 files; +7 in new `tests/learn.test.js`: content validation, slug/category lookups, **honesty guards** — every guide has a live route, every live `/learn/*` route has written content, related tools exist in the registry).
- Dev smoke: `/learn`, `/learn/setup-2fa`, `/learn/in-a-breach`, `/`, `/tools` → all 200; **server stopped, ports 5173/3000 confirmed free**.
- `git diff server.js lib/` → empty: breach-check + subscription code untouched.

### Files changed this session
`src/content/learn.js` (new), `src/routes/learn.jsx` (new), `src/routes/guide.jsx` (new), `src/routes/index.jsx` (dashboard), `src/routes/tool.jsx` (recents), `src/config/routes.js`, `src/App.jsx`, `src/components/AppShell.jsx`, `tests/learn.test.js` (new), `public/*` (rebuilt), `PROGRESS.md`, `RUN.md`.

### Not done / decisions
- Optional Learn articles `scams`, `scam-quiz`, `safe-public-wifi`, `safe-online-shopping`, `loan-app-privacy`, `breach-data-types` remain `planned` — content not written, honesty rule keeps them unlinked (quiz/scam library needs engine work; separate pass).
- No favorites UI (storage key exists but no toggle affordance designed yet) — recents only.

---


## THIS SESSION — tool visibility + Password & Account batch (DONE)

### Root cause: registered tools were invisible
- `src/content/tools.js` listed 10 complete tools and their routes had been flipped to `status:"live"`, but nothing could render or link them:
  1. **`src/App.jsx` had no `/tools` or `/tools/:slug` branches** — the router fell through to `<NotFound/>` even for live routes.
  2. **`AppShell` NAV was hard-coded** to Dashboard + Breach Guard — no Tools link in sidebar/bottom bar.
  3. **No route components existed** — `src/routes/tools.jsx` and `src/routes/tool.jsx` were missing.
  4. Historically every `/tools*` route was `status:"planned"`; planned routes are deliberately unlinked 404s, which is exactly what the deployed static app showed.
- **Deploy factor:** Vercel serves the committed `public/` snapshot — changing `src/` alone never shows anything. Fixed by running `npm run build`, which regenerated `public/` (16 per-route snapshots, sitemap, robots, manifest).
- Also fixed during the earlier (interrupted) chunked writes: `src/lib/password-tools.js` had a **syntax error** — `PASSPHRASE_WORDS` was corrupted into an open array plus orphaned string fragments; repaired by a one-shot Node splice (236 words) before continuing.

### Shipped: 10 live, working, offline tools
`password-generator`, `password-strength`, `username-generator`, `email-alias-generator`, `security-answer-generator`, `pin-generator`, `passphrase-generator`, `entropy-calculator`, `password-reuse-checker`, `leak-safety-guide` — all via one shared `ToolPage` layout (purpose, how-it-works, limits panel from the registry, tips, related tools, next steps, copy actions, `aria-live` result region).

### Files changed this session
- `src/lib/password-tools.js` (new) — pure helpers: password/PIN/passphrase/username/security-answer generators, alias builders, entropy + crack-time estimates, pattern classifier, reuse checker. Web Crypto + in-house rejection sampling only. **Fixes:** corrupted word list (build-breaking), regex metacharacter escaping in the pattern scan (`.` no longer false-positives as "repeated"), `checkPasswordReuse` reworked to return 1-based **line-number groups** (never echoes pasted values), added `generateSecurityAnswers`.
- `src/components/password-tools.jsx` (new, ~960 lines) — 10 tool page components + `TOOL_PAGES` slug→component map. No raw secret is ever stored; results live in component state.
- `src/routes/tools.jsx` (new) — directory page, grouped by category from the registry (no hard-coded tool list).
- `src/routes/tool.jsx` (new) — `/tools/:slug` resolver: unknown slug or missing component renders the 404 view; sets per-tool `<title>`/meta.
- `src/App.jsx` — lazy `ToolsIndex`/`ToolRoute` branches; skips the generic head for the `:slug` pattern so the tool sets its own.
- `src/components/AppShell.jsx` — NAV now derived from `LIVE_ROUTES` (Dashboard / Breach Guard / Tools) — nav can never dead-link.
- `src/config/routes.js` — `/tools`, `/tools/:slug` and the 10 slug routes are `live`; **`/report` and `/my-data` reverted to `planned`** (pages don't exist yet and honesty rules forbid linking unfinished routes).
- `scripts/gen-meta.mjs` — skips `:param` paths for snapshots/sitemap/log (a `:slug` directory is unwritable on Windows anyway; each concrete slug is its own live entry).
- `tests/password-tools.test.js` (new) — 15 tests: generator contracts, alias strings, entropy math, regex-escape regression, reuse line groups (asserts values never leak into output), and a **registry↔TOOL_PAGES completeness guard**.
- `public/*` — rebuilt (route snapshots for `/tools` + all 10 slugs with correct titles, sitemap includes them).

### Verified
- `npm run build` ✓ (16 route snapshots) · `npm test` ✓ **77/77** (was 62).
- Dev smoke test: `GET /tools` 200, `GET /tools/password-strength` 200, unknown slug → SPA shell + client-side 404 view, `OPTIONS /api/breach-check` 204. **Servers stopped afterwards; ports 5173/3000 confirmed free.**
- `git diff server.js lib/` → empty: breach-check and subscription code paths untouched.
- Manual check list: http://localhost:5173/tools · any three tool pages · nav shows Tools · DevTools network shows zero requests on tool pages (Breach Guard is the only client network call).

### Decisions / not done
- `/report`, `/my-data` left `planned` (were briefly flipped live by an earlier session with no pages built).
- Reuse checker displays **line numbers only** — pasted passwords are never rendered, logged or stored.
- Full 80-tool wishlist NOT attempted this pass — registry honesty: only the 10 working tools are listed.

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
## DEPLOY NOTES (Vercel, static public/ + serverless API — updated 2026-10-10)

- New `api/breach-check.js` serverless function (POST only; GET/etc → 405). It
  calls the SAME shared core `lib/breach-check.js` that local Express uses, so
  validation, per-IP rate limit, 10-min cache, XposedOrNot call,
  `normalizeAnalytics`, and the five error codes
  (`invalid_email`/`rate_limited`/`upstream_unavailable`/`timeout`/`parse_error`)
  cannot drift. Email never logged. No `app.listen` in the function.
- `server.js` refactored to the shared core: `handleBreachCheck` is now a thin
  Express adapter (`runBreachCheck` → status/body). Local `npm run dev` /
  `npm start` keep `POST /api/breach-check` on Express unchanged. Dead
  duplicates removed from server.js (old retry/devLog/rate-limit/cache blocks);
  `INVALID_EMAIL_MESSAGE` now imported from the shared core (subscribe route
  uses the same text as before).
- `vercel.json` now maps ONLY `api/breach-check.js` → `@vercel/node` (no routes
  override, no outputDirectory) so Vercel serves the static SPA from `public/`
  as Output Directory and routes `/api/breach-check` to the function. The old
  "route everything through server.js" approach is REPLACED by this.
- Vercel project settings: Output Directory = `public`; Build Command =
  `echo skip` (committed `public/` is used — no vite rebuild); Install Command =
  default. Env: `EXPOSED_ORKNOT_API_KEY` optional; no Supabase/Resend needed for
  the check.
- Verified locally (server started then stopped, no stray jobs): shared core
  returns 400 `invalid_email` for bad/empty email; function returns 405 for GET
  and 400 for bad POST; Express `GET /` → 200 and `POST /api/breach-check`
  (bad email) → 400. Unit tests 62/62 pass. No live upstream call, no DB write.


## DEPLOY NOTES (Vercel — added 2026-10-10, no commit/push per rules)

- `server.js` now exports the Express app (`module.exports = app`) and only calls
  `app.listen` when run directly (`require.main === module`), so `npm start` /
  `npm run dev` are unchanged locally while Vercel `@vercel/node` can use the
  exported app. The 404 + error handlers were moved BEFORE `listen` so they
  register on the exported app in all environments.
- New `vercel.json` (repo root): `builds` maps `server.js` → `@vercel/node`;
  `routes` send `/api/*` AND every other path to `server.js` (Express serves the
  committed `public/` SPA + static + API from one function);
  `functions["server.js"].includeFiles = "public/**"` so static assets ship with
  the function. No breach/subscription/static logic changed.
- Vercel project settings: Output Directory = empty; Build Command = `echo skip`
  (or empty) so the committed `public/` output is used — do NOT run a full vite
  rebuild on Vercel. (SUPERSEDED 2026-10-10: Output Directory is now `public`
  with the serverless `api/breach-check.js`; see the note above.) Install Command = default. Env vars: `APP_URL`,
  `VITE_APP_URL`, `FRONTEND_URL` + optional `SUPABASE_*`, `RESEND_API_KEY`,
  `EXPOSED_ORKNOT_API_KEY` (same as RUN.md).
- Verified locally (2026-10-10, server started then stopped, no stray process):
  `require('./server.js')` → export is a working Express app; `node server.js`
  → `GET /` 200 (SPA) and `POST /api/breach-check {not-an-email}` → 400
  `invalid_email` (validation path only — no live upstream call, no DB write).


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


- Header hamburger nav fixed (desktop sidebar restored at lg+; mobile drawer with slide animation; hamburger has lg:hidden; drawer renders outside header with z-30 overlay).
- Score ring overlap fixed (SVG z-0 behind text z-10; number text-3xl; level stacked pt-1). No other score changes.


- Header hamburger nav fixed (desktop sidebar restored at lg+; mobile drawer with slide animation; hamburger has lg:hidden; drawer renders outside header with z-30 overlay).
- Score ring overlap fixed (SVG z-0 behind text z-10; number text-3xl; level stacked pt-1). No other score changes.



- brand-hierarchy: About copy, sidebar footer motto, and public snapshots re-verified & rebuilt (`npm run build` → 28 snapshots). Source already matched the brand rules (no doubles), so no source edits were needed. Servers stopped; no commit/push.


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
- Phase 3 (password tools): **DONE** (this session) — 10 tools live: password-generator, password-strength, username-generator, email-alias-generator, security-answer-generator, pin-generator, passphrase-generator, entropy-calculator, password-reuse-checker, leak-safety-guide. Visibility root cause (planned routes + no /tools wiring + hard-coded nav) fixed; `public/` rebuilt.
- Learn / Security Center + dashboard upgrade: **DONE** (this session) — `/learn` hub + 8 article guides live, Learn in nav, dashboard gained hero CTA, quick tools, Security Center cards, protect-your-accounts, after-a-breach and recent-tools sections (all live-route-guarded). Build 25 snapshots, tests 84/84.
- Phase 4 (scams/safety/recovery/guides): not started
- Phase 5 (everyday tools): not started (optional)
- Phase 6 (files/images): not started (optional)
- Phase 7 (invoice): not started (optional)
- Phase 8 (hardening/offline/quality): not started (required for whatever exists). Deferred from Phase 1: zero-network headless-Chrome test + Lighthouse numbers.

---

## VERCEL PRODUCTION-READINESS PASS (2026-10-11)

Goal: make the Safeyard app (Vite+React front end committed into `public/`, Express `server.js` + `lib/`) work on Vercel exactly like the last known-good production deployment (mode A: zero-config Express + committed static `public/`). No deployment performed.

### Findings
- Three configurations disagreed: (A) live production = zero-config Express, no `vercel.json`, no `api/`; (B) dashboard Project Settings = "Other + `echo "using committed public"` + output `public`"; (C) safeyard-hub `vercel.json` = legacy `builds` entry (`api/breach-check.js` + `@vercel/node`) added at `eec788e`. Resolved to A.
- `public/` was already **fresh** (production rebuild produced a byte-identical tree; `git status --porcelain public/` empty).
- The `src/main.jsx` worker registration was added late in the pass, so the bundle hash changed; `public/` was regenerated from that source so the committed output matches exactly what was verified (hashed assets differ from the earlier committed hashes).
- `npm install` exit 0 (lockfile consistent; `npm ci` blocked only by a Windows AV file-lock, not a mismatch).
- Built `public/` grep for secrets: only false positives (data-type names, "modulepreload", public `VITE_APP_URL` default). No real secrets.

### Changes
- `vercel.json`: removed `builds`; added `headers` (security headers for all paths + `Cache-Control: no-store` on `/sw.js`) and a `rewrites` SPA fallback `/(?!api/)(.*)` → `/index.html`. No `routes`.
- `api/breach-check.js`: deleted (dead mode-C serverless function; `POST /api/breach-check` is served by `server.js`).
- `public/sw.js`: created (was missing from the repo) — cache-first shell, network-first navigations, never caches `/api/*`, update flow.
- `src/main.jsx`: registered `/sw.js` (best-effort).
- `package.json`: `engines.node` `"24"` (was `">=20"`), matching the tested local Node 24.
- New: `scripts/smoke.mjs`, `scripts/vercel-emu.mjs`, `tests/breach-check.test.js`.

### Verification (local, production-mode `node server.js`)
- `scripts/smoke.mjs`: **70/70 ALL PASSED** (every live route 200+title, SPA fallback, 404s, key statics+content-types, security headers on `/` and a hashed asset, `/api/breach-check` invalid-email 400, `--live` one call test@example.com 200).
- `scripts/vercel-emu.mjs`: **ALL PASSED** (live routes → static, planned/unknown → rewrite → shell, `/api/*` → function not swallowed).
- Vitest: **15 files / 106 tests ALL PASSED** (incl. new mocked breach-check regression test).
- Headless Chrome with the production headers on `/` and `/tools/password-generator`: **zero CSP violations, zero console errors**, app renders.
- Server logs during the smoke run: **no email / request body / response body logged**.

### Owner actions (blocked on the dashboard, not the repo)
- Set Framework Preset = Express, Build/Output overrides off, Install default, Node 24.x.
- Add `APP_URL` + `VITE_APP_URL` env vars (Prod + Preview) = `https://check.tirenify.app`.
- Manual browser PWA check (SW registered + offline reload) — not automatable here without adding a dependency.
- Preview is public (Vercel Auth off) and shares production Supabase/Resend; recommend Preview Protection or a `VERCEL_ENV === "preview"` guard on `/api/email/subscribe` (recommendation only).

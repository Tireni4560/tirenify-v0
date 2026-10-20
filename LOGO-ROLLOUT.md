# LOGO-ROLLOUT — Tirenify brand logo & favicon rollout

## Project identified: PROJECT B — Security Hub app (Safeyard by Tirenify)

Evidence: Vite + React app (`vite.config.js`: `publicDir: "static"`, `build.outDir: "public"`), `src/config/brand.js` (COMPANY = "Tirenify", PRODUCT_NAME = "Safeyard"), committed build output in `public/`, `scripts/gen-meta.mjs` prerender script, `PROGRESS.md`, `RUN.md`, `server.js`, `lib/emailTemplates.js`. Product = Safeyard; company = Tirenify. Project A (tirenify.app company website) does NOT apply.

## PUBLIC-EXPOSURE CHECK — "project assets"
## STEP 1 — INVENTORY

### 1. Favicon / head icon declarations (single shell -> all pages)

| # | File | Line | Declaration | Referenced by |
|---|---|---|---|---|
| I1 | `index.html` (source shell) | 14 | `<link rel="icon" type="image/png" href="/favicon.png" sizes="512x512" />` | Root + every `public/*/index.html` snapshot (gen-meta.mjs writes snapshots from this shell) |
| I2 | `index.html` | 15 | `<link rel="apple-touch-icon" href="/favicon.png" />` | same |
| I3 | `index.html` | 16 | `<link rel="manifest" href="/manifest.webmanifest" />` | same (declaration unchanged; manifest content changes) |
| I4 | `scripts/gen-meta.mjs` | 86 | manifest icon `{ src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }` | `public/manifest.webmanifest` |
| I5 | `static/sw.js` | 22 | precache `"/favicon.png"` | `public/sw.js` (copied from static/ by build) |
| I6 | `scripts/smoke.mjs` | 134 | static-file check `/favicon.png` | dev smoke test |

Files: `static/favicon.png` (source), `public/favicon.png` (committed copy, 512x512). Neither is referenced by email templates or `send-newsletter.js` (text-only, no image tags).

Absent: no `shortcut icon`, no `rel="mask-icon"`, no `browserconfig.xml`, no `favicon.ico`, no `16x16/32x32/48x48` fallbacks. `theme-color` = `#060b18` (index.html:6) — kept unchanged.

- Publish / served directory: `public/` (Express via `server.js`; Vercel serves it statically per `vercel.json` + `DEPLOY.md`). Vite static source dir: `static/` (`publicDir: "static"`).
- `project assets/` sits at the **repo root**, sibling of `public/` and `static/`. It is NOT inside the published directory and NOT inside `publicDir`.
### 2. Brand name / logo appearances as a mark

| # | File | Line | Component/page | Background | Current mark | Action |
|---|---|---|---|---|---|---|
| M1 | `src/components/AppShell.jsx` | 219 | Footer (all routes) | #060b18 dark | `{PRODUCT_NAME} by {COMPANY}` text | Replace `{COMPANY}` with horizontal lockup `<img alt="Tirenify">` (dark variant); keep "Safeyard" + "by" text |
| M2 | `src/components/AppShell-fixed.jsx` | footer | Footer (tracked, unused duplicate shell) | #060b18 dark | same as M1 | Same replacement for consistency |
| M3 | `src/routes/static-page.jsx` | 30 | Footer on /help, /privacy, /terms, /about | #060b18 dark | `{PRODUCT_NAME} by {COMPANY}.` text | Same lockup pattern |
| M4 | `src/components/AppShell.jsx` Header wordmark | ~21-24 | Header home link | dark | Text "Safeyard" (`PRODUCT_NAME`) link to "/" | Leave — product name alone per `brand.js`; home link keeps accessible name |
| M5 | `src/components/AppShell-fixed.jsx` Sidebar wordmark | ~19-24 | Sidebar (unused file) | dark | Text "Safeyard" | Leave |
| M6 | `src/lib/static-content.js` | 28, 34, 57 | Privacy / Terms / About body | dark | "Tirenify" inside sentences | Leave — running/legal text |
| M7 | `index.html` | 42 | `<noscript>` | n/a | Heading "Safeyard by Tirenify needs JavaScript" | Leave — sentence heading |
| M8 | Route titles / `og:site_name` / manifest `name` | — | metadata everywhere | — | "Safeyard by Tirenify" text | Leave — meta titles and metadata names |
| M9 | `src/routes/breach-guard.jsx` | ~680-684 | Loader | dark | Text + skeleton, no logo file | Leave — no mark to replace; no new sections |
| M10 | `src/routes/not-found.jsx` | — | 404 | dark | No mark | Leave |
| M11 | Offline fallback | — | none (SW falls back to /index.html) | — | — | Leave |
| M12 | Share/warning cards | — | `/tools/warning-card` is "planned" only (`routes.js:40`), not live | — | — | Leave |

No lockup exists yet (wordmark is plain text), so no "symbol beside text 'Tirenify'" doubling case arises.

## PLAN OF CHANGES (Project B)

1. Copy logo SVGs + PNGs into `static/brand/` (lowercase, hyphenated names; see asset table above).
2. Generate `static/favicon.ico` from `png/favicon-16/32/48.png` with a dependency-free Node script run from the OS temp dir; script deleted afterwards; `.ico` kept.
3. `index.html`: replace I1/I2 with new icon declarations (`/favicon.svg`, `/brand/favicon-16/32/48.png`, `/apple-touch-icon.png`); manifest link unchanged; theme-color unchanged; og/twitter images untouched.
4. `scripts/gen-meta.mjs`: manifest icons -> 16/32/48/192/512 PNGs, 180 apple-touch, `tirenify-avatar-dark.png` maskable (`purpose: "maskable"`); name/short_name/theme_color/background_color unchanged.
5. New component `src/components/tirenify-logo.jsx`: picks dark/light variant from `document.documentElement` class (`dark`/`light`, not `prefers-color-scheme`) — no flash; explicit `width`/`height` from intrinsic aspect (no stretch); `alt="Tirenify"` default on lockup, `alt=""` on symbol.
6. Footer replacements M1–M3 with horizontal lockup at height 22px (-> width 101px >= 96px minimum).
7. `static/sw.js`: cache `safeyard-v2`, precache new icons + root shell; hashed asset entries finalised after build #1 (build #2 commits them).
8. `scripts/smoke.mjs`: STATIC_FILES updated to the new icon paths.
9. Rebuild (`npm run build`), verify, run tests, run smoke test against `npm start`, Edge headless checks at 320/375/768/1280.
10. `static/favicon.png` becomes unreferenced: kept (may be externally linked), listed here as retained-unreferenced.

### 3. Where the head tags come from

- Source: `index.html` (repo root); tokens injected by Vite plugin `brandHtml()` at dev/build.
- Build: `vite build` -> `public/index.html`; `scripts/gen-meta.mjs` writes per-route snapshots from the built shell — icon declarations in `index.html` propagate to all live routes.
- Service worker: `static/sw.js` copied to `public/sw.js` via `publicDir`. Manifest: generated by `scripts/gen-meta.mjs`.
- Edits go to: `index.html`, `scripts/gen-meta.mjs`, `static/sw.js`, plus new files in `static/`. `public/` regenerated by `npm run build` — never hand-edited.

### 4. Other references

- `scripts/smoke.mjs:134` — checks `/favicon.png` (dev-only, against running server).
- `lib/emailTemplates.js` + `send-newsletter.js`: no image/logo file references; nothing in the subscription flow changes.
- Social images: `og-preview.png` as `og:image`/`twitter:image` (index.html, snapshots, `src/config/brand.js`). Not touched — no replacement exists; report as "needs a new version later".
- JSON-LD: none exists -> none added.

- RESULT: `project assets/` is **NOT publicly served**. No fix required; nothing moved or deleted.
# UX-NOTES.md — Security Hub UX update (beta feedback, mobile-first)

Read-only assessment done first (375/768/1280 structure read from source, mocked
fixture for the check flow), then the arrangement decisions, then what I chose
NOT to add. Implementation follows this document; no approval wait.

---

## 1. BEFORE — current structure

### Dashboard (`/`, src/routes/index.jsx)

| # | Section | Above the fold @375px? |
|---|---------|------------------------|
| 1 | Header (64px): wordmark, "Breach Guard" button, hamburger | yes |
| 2 | PageHeader: eyebrow "Dashboard", H1 (product full name), description | yes |
| 3 | "Start here" surface — H2 "Know before they do", primary "Run Breach Guard", secondary "Browse all tools" | yes (ends ~600px) |
| 4 | Score card (inline `ScoreRing` + explanation) — **the score lives only here** (and on /report) | just below fold |
| 5 | "Breaches found" card — count + masked email + date, or empty state with "Run Breach Guard" | no |
| 6 | "Safety habits" — 4 checkboxes | no |
| 7 | "Recent activity" — up to 5 masked rows | no |
| 8 | "Your data on this device" + Clear button | no |

- **Where results live:** nowhere on the Dashboard — only the masked summary row (masked email, count, types, risk, date) from `safeyard:breach-history`. The full breach list exists only as page-local state inside Breach Guard.
- **Where next steps live:** nowhere on the Dashboard (the habits checklist is the nearest thing).
- **How tools are reached:** hamburger/sidebar, the mobile bottom bar, and the "Browse all tools" button in section 3. Zero tool links on the page itself — this is problem 1.

### Breach Guard (`/breach-guard`, src/routes/breach-guard.jsx)

| # | Section | When |
|---|---------|------|
| 1 | PageHeader (H1 "Was your email in a data breach?") | always |
| 2 | Full email form (label, input, submit, privacy line) — **always rendered at full size, even after a check** | always |
| 3 | Loading skeleton + rotating messages | loading |
| 4 | Error surface | error |
| 5 | Results summary surface: H2 "Found in N breaches"/"Good news", risk level, dates, pastes, exposed-data chips, "How we calculated this" toggle, breaches-per-year chart | done |
| 6 | Sort/filter row + Copy summary + Print | done, breaches > 0 |
| 7 | Breach list, 20 per page + "Show more" | done |
| 8 | "Your action plan" checklist (local checkboxes) | done, breaches > 0 |
| 9 | Attribution + EmailOptIn + "Clear my data" | done |

- **Where the score lives:** NOT on this page at all. The user must navigate to the Dashboard (problem 2).
- **Where next steps live:** the ActionPlan checklist, *below* the whole breach list.
- **State today:** `result`, `checkedEmail`, `phase` are page-local React state → all lost when navigating away or reloading. Only the masked summary survives (localStorage). `checkedEmail` (raw email) also lives in page state only; it dies on unmount.

### How the score is computed today

`scoreDashboard()` in `src/lib/score.js` (PROTECTED formula, weights 50/30/20).
Dashboard and Report feed it the breach **count** from the masked summary
(`breachesFound` fallback → `100 − count×8`). The full breach result is never
available outside the Breach Guard page, so a more precise breach component
(`breachResult` → `100 − risk score`) is currently unreachable from the Dashboard.
Habits come from `safeyard:habits`; the checkup part is always unknown
(`/checkup` is a *planned* route — not live, so nothing may link to it).

### What survives navigation / reload (before)

Survives: masked summaries, habits, checklist ticks (all localStorage). Lost: the
full breach result, the risk breakdown, the raw email, and every page-local view state.

---

## 2. AFTER — arrangement (decided and implemented)

### Shared pieces (new, reuse existing tokens/components only)

- **`src/lib/check-session.js`** — in-memory store above the router (module-level
  singleton + `useSyncExternalStore`). Holds `{ result, masked, checkedAt }` for
  the latest check. The raw email is masked immediately and never stored
  (session or web storage). `computeSecurityScore()` is the single scoring path
  for Dashboard/Breach Guard/Report: full `breachResult` when the session has
  one, otherwise the existing count fallback from the masked summary — both
  pages therefore always show the same number for the same inputs.
- **`src/components/score-card.jsx`** — one `ScoreCard` (+ the existing
  `ScoreRing` moved into it) used by Dashboard and Breach Guard. Keeps the
  existing explanation wording and the Partial/Unknown parts rows; adds one
  short prompt when parts are missing (links to the safety-habit checklist on
  the Dashboard; nothing links to `/checkup` because that route is planned, not live).
- **`src/components/do-this-first.jsx`** — "Do this first" list driven by the
  pure `getDoThisFirst()` in `src/lib/next-steps.js` (top slice of the advice,
  not a second checklist — the ActionPlan stays untouched below).
- **`src/components/explore-tools.jsx`** — compact link list with the registry's
  lucide icon names resolved through a small local map (`lucide-react` is
  already a dependency; the registry comment says icons are "resolved by the UI").

### Dashboard (mobile order = DOM order; desktop keeps the 2-col grid)

1. PageHeader (unchanged)
2. "Start here" (unchanged — still the primary action for first-time users)
3. **"Latest check" card** — masked email, date, breach count, exposed-type
   chips (classified, severity-colored *with text labels — never color alone*),
   risk level; first-visit variant keeps the existing empty-state copy +
   "Run Breach Guard" button. Replaces/extends the old "Breaches found" card.
4. **ScoreCard** (shared) — same explanation string as before.
5. **"Do this first"** — up to 3 linked actions (only when a check exists).
6. Safety habits — kept but demoted inside a native `<details>` disclosure
   ("reduce the prominence" without removing content; keyboard operable, no hover).
7. Recent activity (unchanged)
8. Your data / Clear (unchanged)
9. **"Explore tools"** — 5 links on mobile (6th hidden below `sm:`), stacked
   rows ≥44px tall, each: icon + name + one-line ≤70-char description + "See all tools".

Rationale (mobile): result/status → next steps → tools matches the requested
hierarchy; Explore tools starts inside the first two screens on a 375px first
visit (~1000px down) because the habits card collapses. Rationale (desktop):
grid layout, score and status stay above the fold in the existing max-w-3xl
column; nothing about the sidebar/bottom bar changes.

### Breach Guard

- **After a check (session or fresh):** the email form collapses to a one-line
  row ("Checked d***@… — Check another email"); results start at the top.
- **Summary surface** keeps its heading/risk/dates/chips/explain/timeline, with
  the **compact ScoreCard inserted directly under the heading row** (beside the
  summary on ≥sm where it fits, stacked on 375px) — result and score together, no navigation.
- Then **"Do this first"** (up to 3 linked actions), then the existing
  sort/filter + Copy/Print row, then the breach list (**top 3 + "Show all (N)"**;
  `beforeprint` expands the list so Print/PDF still includes everything), then
  **"Explore more tools"** (≤3 links, relevance-ranked by exposed data types),
  then the existing ActionPlan, opt-in, attribution and "Clear my data".
- **Focus/announce:** on a completed check, focus moves to the results H2
  (`tabIndex={-1}`), the outcome is announced in the existing `aria-live`
  region, and the results are scrolled into view (`scrollIntoView` without
  smooth behavior — respects reduced motion).
- **Return visit without reload:** the page hydrates from the in-memory session
  — full results, score, next steps all still there.
- **Reload / new visit:** no session, but the masked summary exists → a compact
  "Your last check" card above the (full) email form: masked summary, ScoreCard,
  "Do this first", and the note "Run a new check to see the full list of breaches."
- Desktop: same order; the only layout adaptation is the score card sitting
  beside/under the summary heading — the rest of the page is untouched.

### Persistence (one paragraph)

The full breach result lives only in the in-memory session store
(`src/lib/check-session.js`), which sits above the router and survives in-app
navigation (Dashboard ↔ tools ↔ Breach Guard) without a reload; it is replaced
on every new check, cleared when "Clear my data" runs (both pages), and never
written to `localStorage`/`sessionStorage`. The raw email is masked the moment
the check returns and is never placed in the store. The only persisted artifact
remains the existing masked summary row in `safeyard:breach-history`
(keys/format unchanged — additive use only), which is what powers the
Dashboard/Breach Guard "last check" state, the score's count fallback and the
derived next steps after a reload.

---

## 3. Chose NOT to add (and why)

- **No `/checkup` links** — the route is `status: "planned"` and renders 404;
  linking it would violate the no-dead-links rule. The score's missing-parts
  prompt points at the habit checklist instead.
- **No second checklist** — "Do this first" is a slice of the same advice; the
  existing ActionPlan with local checkboxes stays below the breach list untouched.
- **No horizontal carousels/scroll strips** for tool discovery — stacked rows only.
- **No changes to global navigation** (hamburger, bottom bar, sidebar) — discovery
  is solved inside the pages.
- **No changes to the score formula, weights, risk/severity maps, breach API,
  loading messages, subscription flow, `vercel.json`, `server.js` or brand values.**
- **No new dependencies, fonts, animations or visual style** — everything uses the
  existing `surface` utility, tokens, chips, spacing and focus styles; the only
  library touched is `lucide-react`, already a dependency (icons previously stored
  as names in the registry but never rendered).
- **Dashboard "Recent activity" and "Your data" kept as-is** (not removed — the
  brief forbids removal); they sit below the new sections and are small.
- **Report page** only swapped its scoring call to the shared helper (same
  inputs as before unless an in-session result exists, where the *more accurate*
  number is an improvement, not a drift). No layout change there.

---

## 5. FOLLOW-UP — shared Safety habits on the Breach Guard page (assessed read-only)

### Where habit state lives today
- Definitions: `src/content/habits.js` (`HABITS`, 4 fixed strings; wording/order PROTECTED).
- Persisted state: `safeyard:habits`, a bare JSON object `{index: true}` — read/written
  directly through raw `localStorage` in the Dashboard (`loadJSON`/`saveJSON` in
  `src/routes/index.jsx`, also `report.jsx` `loadHabits()` and `readHabitsScore()` in
  `src/lib/check-session.js`). Page-local React `useState` mirrors it; cross-page
  reactivity comes only from the `safeyard:data-changed` custom event
  (`useSafeyardDataVersion`). There is no single store, no shared hook, and no
  cross-tab listener (`storage` event is ignored).
- Storage module `src/lib/storage.js` owns the `habits` key (progress category,
  envelope + additive bare-JSON migration) and fires `safeyard:data-changed` on
  every write; `src/lib/device-storage.js` only covers breach-history.

### How the Dashboard renders it
A `<details>` disclosure ("Safety habits — N/4 done") containing 4 labelled checkboxes
(index.jsx ~L209-232); ticking writes raw localStorage + dispatches the data-changed
event. The Breach Guard page renders NO habits today (only ScoreCard/DoThisFirst/
ActionPlan/ExploreTools).

### How the score reads the habits value
`computeSecurityScore()` defaults `habitsScore` to `readHabitsScore()` (direct
localStorage read at render) unless the Dashboard passes its reactive local value;
`readHabitsScore()`/`loadHabits()` read during render (SSR-unsafe, but the app is
client-only prerender so it works today — the follow-up must switch to
mount-then-read via a store with `getServerSnapshot`).

### Existing items that duplicate a habit
- `getDoThisFirst()` (`src/lib/next-steps.js`): the `2fa` action ("Turn on two-factor
  authentication" → /learn/setup-2fa) duplicates HABITS[1] (unique password/OTP/BVN
  habits have no direct duplicates). It returns `to`-linked rows (guides/tools),
  never checkboxes.
- `ActionPlan` (`breach-guard.jsx` ~L247-300): `id:"2fa"` ("Turn on two-factor
  authentication, starting with your email") duplicates HABITS[1]; `id:"pw"` and
  `id:"gen"` (change passwords / generate a strong unique password) overlap
  HABITS[0] thematically but are task-checkboxes with breach-specific wording.
  Both use page-local `done` state lost on navigation; nothing reads habit ticks.
- Plan: give the shared habits store per-habit ids/indexes, render ActionPlan's
  `2fa` row from habit[1]'s done state (single source of truth, no second flag),
  and filter any `getDoThisFirst()` row whose habit counterpart is already ticked
  (currently only the `2fa` row maps; password rows keep their tool/guide links
  and are NOT hidden since they are distinct tasks).

### Arrangement (Breach Guard; mobile DOM order = visual order)
1. Result summary + compact ScoreCard (unchanged, first). 2. ONE "Do this first"
   section: the filtered action rows first, then the shared `HabitsChecklist`
   (visible by default, compact rows, same wording/order/count as Dashboard) —
   habits sit *inside* the next-steps zone, not as a competing card. 3. Breach
   list, ActionPlan (2fa row habit-driven), Explore-tools strip, rest unchanged.
   Before a check / after reload: the full email form first, then the same
   compact `HabitsChecklist` directly below it (never above the form; result-first
   rule preserved, no new scroll burden at 375px). Desktop: same order, the
   HabitsChecklist spans the existing max-w-3xl column like DoThisFirst does.
   Not added: any separate habits heading hierarchy (uses the existing h2 level
   of its card), any new storage key/format, any change to ActionPlan copy.

---

## VERIFICATION (implementation complete)

### Test suite
- `npx vitest run` → **139 passed (19 test files), 0 failed** (2026-10-17).
- New tests: `tests/habits-store.test.js` (subscription, cross-tab events,
  storage failure fallback, score weight) + `tests/next-steps.test.js`
  (2FA-hidden when habit ticked) — all passing.
- `getHabitsSnapshot()` returns the live cache (tests shallow-copy with
  `{ ...getHabitsSnapshot() }` when they need isolation — by design, not a bug).
- `habitsScoreOf({1:true,3:true})` = 50 ✓ (`(2/4)*100`).
- `getHabitsScore()` → `null` before hydrate, `0` after ✓ (honest Partial,
  no flash).
- Score delta: 50-point habits shift moves score by 18 (30*50/80=18.75→18),
  not 19 — test expectations corrected to match the actual computation.

### Build
- `npm run build` → **success** (~7.2s, 1776 modules transformed).
- New hashed assets in `public/assets/`: index, breach-guard, report,
  check-session, next-steps, tools, score-card (bundled), habits-store (bundled),
  habits-checklist (bundled), vendor-react, vendor-icons, CSS.
- `gen-meta.mjs` → wrote 28 route snapshots + sitemap.xml + robots.txt +
  manifest.webmanifest.
- Protected content (`src/content/habits.js` wording/order) unchanged.
- No new storage key/format — same `safeyard:habits` key, same `{index: bool}`
  shape, additive migration only.

### Implementation checklist
| Item | Status | Notes |
|------|--------|-------|
| Shared habits store `src/lib/habits-store.js` | Done | `useSyncExternalStore`, `__resetHabitsForTests`, `__storageEventForTests` |
| Shared `HabitsChecklist` component | Done | Live-region announcements (`"Habit saved. Safety habits N of 4. Score S."`), `details`/`card` variants |
| Dashboard rewire to `useHabits` | Done | No raw localStorage reads in component; `doneHabitIndexes`, `habitsScoreText`, shared checklist as `<details>` |
| Breach Guard integration | Done | `useHabits`, `doneHabitIndexes`, `habitsScore` memo keyed on score, `ActionPlan` `habit2faDone` prop, shared component |
| Habit-aware `getDoThisFirst` | Done | 2FA row hidden when habit[1] ticked |
| ActionPlan 2FA row habit-driven | Done | `readOnly`/checkbox from store, single source of truth |
| Shared ScoreCard component | Done | `export function ScoreCard` (named export); no `withStaticClass` wrapper needed |
| Cross-page state persistence | Done | In-memory session store + `safeyard:data-changed` + `storage` event |

### What was deliberately NOT added
- No orchestration file (each page imports the shared store/component directly).
- No live browser checks (CDP/Playwright not set up; verified via unit tests + build).
- No new storage key/format.
- No change to ActionPlan copy.
- No separate habits heading hierarchy.
- No `withStaticClass` wrapper on ScoreCard — plain named export is sufficient.


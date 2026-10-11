# OWNER_TODO.md — Vercel production-readiness (breachchecker)

These are the steps only the owner can do (dashboard, browser, DNS). Nothing here was done by the agent — no deploy, no dashboard change, no DNS, no real signup, no email sent.

## 1. Vercel Project Settings (before merging to main)

In Vercel → Project `breachchecker` → Settings:

- [ ] **Framework Preset** → `Express` (currently "Other")
- [ ] **Build Command** → remove the override (currently `echo "using committed public"`)
- [ ] **Output Directory** → remove the override (currently `public`)
- [ ] **Install Command** → leave default (empty)
- [ ] **Node.js Version** → `24.x` (must match `engines: "24"` in package.json; dashboard offers 22.x/24.x — pick 24.x)

These make the next production deploy match the proven zero-config-Express mode (A). The "Production Overrides differ" warning clears after the next production deploy.

## 2. Environment variables (Project → Settings → Environment Variables)

Add for **Production AND Preview** (existing four are already set — keep them):

- [ ] `APP_URL` = `https://check.tirenify.app`
- [ ] `VITE_APP_URL` = `https://check.tirenify.app` (must match APP_URL; safe for browser — VITE_-prefixed)

Keep (already set, do not remove): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

Note: env changes only apply to **new** deployments — set them, then the next deploy picks them up.

## 3. Deploy + verify (push order)

- [ ] Push these changes to `safeyard-hub` → Vercel deploys a Preview (Vercel Auth is OFF, so the preview is public).
- [ ] Run `node scripts/smoke.mjs https://<preview-url>` → expect `70/70 ALL PASSED`.
  - If Preview Protection is on: `node scripts/smoke.mjs https://<preview-url> --bypass <VERCEL_AUTOMATION_BYPASS_SECRET>` (or export `VERCEL_AUTOMATION_BYPASS_SECRET`).
  - Optional one live call: add `--live` (uses only `test@example.com`).
- [ ] Test Breach Guard with **your own email** (real XposedOrNot call).
- [ ] Test the subscription flow with **your own address** (opt-in → confirm email → confirm link → unsubscribe). This writes to the production Supabase and sends a real email. Verify the confirm link points at `https://check.tirenify.app` (not localhost, not the preview host).
- [ ] Manually verify the PWA once: load the site, DevTools → Application → Service Workers (registered), then go offline and reload (app shell should still load).
- [ ] Merge `safeyard-hub` → `main` (production redeploys).
- [ ] Re-run `node scripts/smoke.mjs https://check.tirenify.app` against production.

## 4. Recommendations (not implemented — decide and implement if you want)

- [ ] Turn on **Preview Protection** (or add a `VERCEL_ENV === "preview"` guard to `/api/email/subscribe`) — previews are public and share the production Supabase/Resend.
- [ ] Confirm the 3 extra production domains are aliases of `check.tirenify.app` (the legacy-host 301 only activates if `APP_URL` host differs).
- [ ] Confirm the Node major selected on the dashboard (should be 24.x).
- [ ] Confirm the team's "Separate Production Secret Values" policy (whether Preview/Production share secret values).
- [ ] Add `.vercel/` to `.gitignore` if you ever run `vercel env pull` (it writes secrets to a file).

## 5. Rollback

- Preferred: Vercel → Deployments → find `breachchecker-dihx9lbbm-adeleye-daniels-projects.vercel.app` (ID `ERVAZQ3utx7dQtPDX5K4jpr4XrSb`) → **Promote to Production** / **Instant Rollback** (verify the button is enabled on Hobby).
- Fallback: `git revert` and push — never force-push.
- If the API breaks after a deploy: deployment → Resources tab (confirm a function exists) → Runtime Logs. Under mode A the function is `server.js`; a missing function means the Framework preset is not "Express".
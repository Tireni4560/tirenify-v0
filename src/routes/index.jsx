// Dashboard (home) — the slim overview. Order follows the beta-feedback
// hierarchy: start here (primary action) → latest check + score → "Do this
// first" → habits/activity/data → Explore tools LAST. The score comes from
// the shared computeSecurityScore()/ScoreCard so it always matches the Breach
// Guard page. The full breach result lives only in the in-memory session store
// (lib/check-session.js); device storage keeps the masked summary only.
import { useMemo } from "react";
import { Link } from "../lib/router.jsx";
import { PageHeader, Chip } from "../components/ui.jsx";
import { ScoreCard } from "../components/score-card.jsx";
import { DoThisFirst } from "../components/do-this-first.jsx";
import { ExploreTools } from "../components/explore-tools.jsx";
import { HabitsChecklist } from "../components/habits-checklist.jsx";
import { getBreachHistory, clearAllSafeyardData, useSafeyardDataVersion } from "../lib/device-storage.js";
import { useCheckSession, clearCheckSession, computeSecurityScore } from "../lib/check-session.js";
import { useHabits, doneHabitIndexes } from "../lib/habits-store.js";
import { getDoThisFirst } from "../lib/next-steps.js";
import { getResultStatus, countPastes } from "../lib/result-copy.js";
import { selectFeaturedTools } from "../content/tools.js";
import { classifyDataType } from "../lib/severity.js";
import { PRODUCT_NAME, PRODUCT_FULL, TAGLINE } from "../config/brand.js";

export default function Dashboard() {
  // ONE habits source of truth: same ticks, count and score as Breach Guard.
  const {
    habits,
    done: habitsDone,
    total: habitsTotal,
    toggle: toggleHabitStore,
    habitsScore,
  } = useHabits();
  const dataVersion = useSafeyardDataVersion();
  const session = useCheckSession();

  const history = useMemo(() => getBreachHistory(), [dataVersion]);
  const latest = history[0] || null;

  // ONE scoring path shared with Breach Guard (and Report) — same number everywhere.
  const score = useMemo(
    () => computeSecurityScore({ session, history, habitsScore }),
    [session, history, habitsScore],
  );

  // Latest-check facts: the in-session full result when present, otherwise the
  // masked summary row from device storage (after a reload / return visit).
  const latestCheck = useMemo(() => {
    if (session?.result) {
      const types = [...new Set(session.result.breaches.flatMap((b) => b.dataTypes || []))];
      return {
        masked: session.masked,
        count: session.result.breaches.length,
        types,
        pasteCount: countPastes(session.result),
        risk: null, // in-session risk reads via the score card; stored rows keep their label
        at: session.checkedAt,
        live: true,
      };
    }
    if (latest) {
      return {
        masked: latest.masked,
        count: latest.count,
        types: latest.types || [],
        pasteCount: latest.pasteCount,
        risk: latest.risk || null,
        at: latest.at,
        live: false,
      };
    }
    return null;
  }, [session, latest]);

  const doThisFirst = useMemo(
    () =>
      latestCheck
        ? getDoThisFirst({
            types: latestCheck.types,
            count: latestCheck.count,
            pasteCount: latestCheck.pasteCount,
            doneHabits: doneHabitIndexes(habits),
          })
        : [],
    [latestCheck, habits],
  );

  const featuredTools = useMemo(() => selectFeaturedTools({ limit: 6 }), []);

  // Same copy source as Breach Guard, so the dashboard and the results page
  // never contradict each other.
  const latestStatus = useMemo(
    // Use the full in-session result when we have it (so a paste-only check is
    // described honestly), otherwise the masked summary count + paste counter.
    () =>
      session?.result
        ? getResultStatus(session.result)
        : latestCheck
          ? getResultStatus({ count: latestCheck.count, pasteCount: latestCheck.pasteCount })
          : null,
    [session, latestCheck],
  );

  /** Live-region text for a habit tick: "... Safety habits N of 4. Score S." */
  const habitsScoreText = useMemo(
    () =>
      (nextDone) => {
        const s = computeSecurityScore({
          session,
          history,
          habitsScore: (nextDone / habitsTotal) * 100,
        });
        return `Score ${s.score}.`;
      },
    [session, history, habitsTotal],
  );

  function clearData() {
    if (window.confirm(`Clear all ${PRODUCT_NAME} data stored on this device?`)) {
      clearCheckSession();
      clearAllSafeyardData();
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={PRODUCT_FULL}
        description={`${TAGLINE}. Free digital safety tools — plus Breach Guard for checking if your email was exposed.`}
      />

      <section className="surface mx-auto max-w-3xl p-6" aria-label="Start here">
        <h2 className="text-lg font-semibold">Know what was exposed — and what to do next</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Breach Guard checks your email against a breach database and shows exactly which known
          breaches included it and what each one exposed. You get plain-language steps for what to
          change first — no account needed, and nothing you type is uploaded.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          It covers publicly known breaches only, so a clean check is good news — not proof that you
          were never exposed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/breach-guard"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Run Breach Guard
          </Link>
          <Link
            to="/tools"
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Browse all tools
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          No account needed — nothing you type is uploaded.
        </p>
      </section>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        {/* Latest check — status first */}
        <div className="surface p-6 sm:col-span-2" aria-label="Latest check">
          <h2 className="text-base font-semibold">Latest check</h2>
          {latestCheck ? (
            <div className="mt-2">
              <Chip
                className={
                  latestStatus?.tone === "hit"
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : latestStatus?.tone === "paste"
                      ? "bg-warning/15 text-warning border-warning/30"
                      : "bg-success/15 text-success border-success/30"
                }
              >
                {latestStatus?.chip}
              </Chip>
              {latestCheck.count > 0 ? (
                <p className="mt-2 font-display text-4xl font-bold">
                  {latestCheck.count}
                  <span className="ml-2 align-middle text-base font-semibold text-muted-foreground">
                    known breach{latestCheck.count === 1 ? "" : "es"}
                  </span>
                </p>
              ) : (
                <p className="mt-2 font-display text-2xl font-bold">
                  {latestStatus?.headline || "No breaches found for this email"}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {latestCheck.masked} · {new Date(latestCheck.at).toLocaleDateString()}
                {latestCheck.risk ? ` · Risk: ${latestCheck.risk}` : ""}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{latestStatus?.subhead}</p>
              {/* A clean result is never sold as proof of safety. */}
              {latestStatus?.tone !== "hit" && (
                <p className="mt-2 text-sm text-muted-foreground">{latestStatus?.qualifier}</p>
              )}
              {latestCheck.types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {latestCheck.types.slice(0, 8).map((raw) => {
                    const c = classifyDataType(raw);
                    return (
                      <Chip key={raw} className={c.chip} title={c.explain}>
                        {c.name}
                      </Chip>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {latestCheck.live
                  ? "Open Breach Guard for the full list of breaches and details."
                  : "Run a new check to see the full list of breaches."}
              </p>
              <Link
                to="/breach-guard"
                className="mt-3 inline-block rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Open Breach Guard
              </Link>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                No breach check yet — we show your last result here once you run one.
              </p>
              <Link
                to="/breach-guard"
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Run Breach Guard
              </Link>
            </div>
          )}
        </div>

        {/* Shared score card — same component and math as Breach Guard */}
        <ScoreCard score={score} />

        {/* Next steps — top slice of the advice, links to live routes only */}
        <DoThisFirst actions={doThisFirst} className="sm:col-span-2" />

        {/* Habits — shared checklist (same ONE component as Breach Guard); the
            disclosure keeps status first without hiding the rows behind navigation. */}
        <HabitsChecklist
          habits={habits}
          onToggle={toggleHabitStore}
          getScoreText={(nextDone) => habitsScoreText(nextDone)}
          variant="details"
          className="sm:col-span-2"
        />

        <div className="surface p-6">
          <h2 className="text-base font-semibold">Recent activity</h2>
          {history.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {history.slice(0, 5).map((r, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {r.masked} — {r.count} breach{r.count === 1 ? "" : "es"}
                    {Number(r.pasteCount) > 0
                      ? ` · ${r.pasteCount} public paste${r.pasteCount === 1 ? "" : "s"}`
                      : ""}
                  </span>
                  <span className="text-muted-foreground">{new Date(r.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing here yet. Breach checks you run appear in this list.
            </p>
          )}
        </div>

        <div className="surface p-6">
          <h2 className="text-base font-semibold">Your data on this device</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {PRODUCT_NAME} stores only masked summaries on this device. Nothing is uploaded and
            nothing is tied to you.
          </p>
          <button
            type="button"
            onClick={clearData}
            className="mt-3 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Clear data stored on this device
          </button>
        </div>

        {/* Tool discovery — LAST on the page; selector keeps only live routes */}
        <ExploreTools items={featuredTools} className="sm:col-span-2" />
      </div>
    </div>
  );
}

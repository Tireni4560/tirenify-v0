// Dashboard (home) — the slim overview only. Score, breaches, habits, recent
// activity and the clear-data panel all read device storage; math lives in
// lib/score.js. Categorized tool grids, Learn cards, the Account form and the
// full Security Report live in the sidebar nav and their own routes — NOT here.
import { useEffect, useMemo, useState } from "react";
import { Link } from "../lib/router.jsx";
import { PageHeader } from "../components/ui.jsx";
import { getBreachHistory, clearAllSafeyardData, useSafeyardDataVersion } from "../lib/device-storage.js";
import { scoreDashboard } from "../lib/score.js";
import { PRODUCT_NAME, PRODUCT_FULL, TAGLINE } from "../config/brand.js";
import { HABITS } from "../content/habits.js";

const HABITS_KEY = "safeyard:habits";

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("safeyard:data-changed"));
  } catch {
    /* ignore */
  }
}

function ScoreRing({ score, level }) {
  const tone =
    level === "Strong"
      ? "text-success"
      : level === "Fair"
        ? "text-primary"
        : level === "Weak"
          ? "text-warning"
          : "text-muted-foreground";
  const C = 2 * Math.PI * 40;
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center" role="img" aria-label={`Security score ${clamped} out of 100, ${level}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90 z-0" aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle, #e2e5ec)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * C} ${C}`}
          className={tone}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <p className="font-display text-3xl font-bold text-foreground">{clamped}</p>
        <p className={`text-xs font-semibold pt-1 ${tone}`}>{level}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [habits, setHabits] = useState(() => loadJSON(HABITS_KEY, {}));
  const dataVersion = useSafeyardDataVersion();

  const history = useMemo(() => getBreachHistory(), [dataVersion]);
  const latest = history[0] || null;

  const habitsScore = useMemo(
    () => (Object.values(habits).filter(Boolean).length / HABITS.length) * 100,
    [habits],
  );
  const score = useMemo(
    () =>
      scoreDashboard({
        breachesFound: latest ? latest.count : null,
        habitsScore,
        checkupScore: null,
      }),
    [latest, habitsScore],
  );
  const habitsDone = HABITS.filter((_, i) => habits[i]).length;

  useEffect(() => {
    setHabits(loadJSON(HABITS_KEY, {}));
  }, [dataVersion]);

  function toggleHabit(i) {
    setHabits((prev) => {
      const next = { ...prev, [i]: !prev[i] };
      saveJSON(HABITS_KEY, next);
      return next;
    });
  }

  function clearData() {
    if (window.confirm("Clear all Safeyard data stored on this device?")) {
      clearAllSafeyardData();
      setHabits({});
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={PRODUCT_FULL}
        description={`${TAGLINE}. Free digital safety tools — plus Breach Guard for checking if your email was exposed.`}
      />

      <section className="surface p-6" aria-label="Start here">
        <h2 className="text-lg font-semibold">Know before they do</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check whether your email appeared in known data breaches, then work through the steps
          below at your own pace — each one links to a tool or guide that works right now.
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="surface p-6 sm:col-span-2">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <ScoreRing score={score.score} level={score.level} />
            <div>
              <h2 className="text-base font-semibold">Your security score</h2>
              <p className="text-sm text-muted-foreground">
                We check what&apos;s actually true on this device, not from a cloud profile. 50% comes
                from your last breach check, 30% from the safety habits below and 20% from the
                security checkup. Anything missing shows as “Partial” — never a fake full score.
              </p>
            </div>
          </div>
        </div>

        <div className="surface p-6">
          <h2 className="text-base font-semibold">Breaches found</h2>
          {latest ? (
            <div className="mt-2">
              <p className="font-display text-4xl font-bold">{latest.count}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Last check: {latest.masked} · {new Date(latest.at).toLocaleDateString()}
              </p>
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

        <div className="surface p-6">
          <h2 className="text-base font-semibold">Safety habits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {habitsDone}/{HABITS.length} done — stored on this device only.
          </p>
          <ul className="mt-3 space-y-2">
            {HABITS.map((label, i) => (
              <li key={label}>
                <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={!!habits[i]}
                    onChange={() => toggleHabit(i)}
                    className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface p-6">
          <h2 className="text-base font-semibold">Recent activity</h2>
          {history.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {history.slice(0, 5).map((r, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {r.masked} — {r.count} breach{r.count === 1 ? "" : "es"}
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
      </div>
    </div>
  );
}

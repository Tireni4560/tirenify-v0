// Dashboard — no login. Reads only device-stored summaries. Score formula is
// transparent and explained inline (see lib/score.js). Replaces "Emails
// monitored" with checklist progress. All data stays on the device.
import { useEffect, useMemo, useState } from "react";
import { Link } from "../lib/router.jsx";
import { PageHeader } from "../components/ui.jsx";
import { getBreachHistory, clearAllSafeyardData, useSafeyardDataVersion } from "../lib/device-storage.js";
import { scoreDashboard } from "../lib/score.js";
import { PRODUCT_NAME, PRODUCT_FULL, TAGLINE } from "../config/brand.js";

const HABITS_KEY = "safeyard:habits";
const HABITS = [
  "I use a unique password on my most important accounts.",
  "I have two-factor authentication turned on for my email.",
  "I don't tap links in unexpected texts or messages.",
  "I never share an OTP, PIN or BVN with anyone.",
];

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
          : level === "At risk"
            ? "text-destructive"
            : "text-muted-foreground";
  return (
    <div className="flex items-center gap-4">
      <div
        className={`grid h-24 w-24 place-items-center rounded-full border-4 border-current ${tone}`}
        role="img"
        aria-label={`Security score ${score} out of 100, ${level}`}
      >
        <span className="font-display text-3xl font-bold">{score}</span>
      </div>
      <div>
        <p className={`text-lg font-semibold ${tone}`}>{level}</p>
        <p className="text-sm text-muted-foreground">Security score out of 100</p>
      </div>
    </div>
  );
}
export default function Dashboard() {
  const [, setVersion] = useState(0);
  const [habits, setHabits] = useState(() => loadJSON(HABITS_KEY, {}));

  useEffect(() => useSafeyardDataVersion(() => setVersion((v) => v + 1))(), []);

  const history = getBreachHistory();
  const latest = history[0] || null;

  const score = useMemo(
    () =>
      scoreDashboard({
        breachesFound: latest ? latest.count : null,
        habitsScore: (Object.values(habits).filter(Boolean).length / HABITS.length) * 100,
        checkupScore: null,
      }),
    [latest, habits],
  );

  const habitsDone = HABITS.filter((_, i) => habits[i]).length;

  function toggleHabit(i) {
    const next = { ...habits, [i]: !habits[i] };
    setHabits(next);
    saveJSON(HABITS_KEY, next);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={PRODUCT_FULL}
        description={`${TAGLINE}. Free digital safety tools that run on your device — plus Breach Guard for checking if your email was exposed.`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface p-6 sm:col-span-2">
          <ScoreRing score={score.score} level={score.level} />
          {!score.complete && (
            <p className="mt-3 text-sm text-muted-foreground">
              This is a partial score. Run a breach check and finish the checkup to complete it.
            </p>
          )}
          <ul className="mt-4 space-y-1 text-sm">
            {score.parts.map((p) => (
              <li key={p.label} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {p.label} <span className="opacity-60">({p.weight}%)</span>
                </span>
                <span className={p.known ? "tabular-nums" : "text-muted-foreground"}>
                  {p.known ? `${Math.round(p.value)}/100` : "Unknown"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface p-6">
          <p className="text-sm text-muted-foreground">Breaches found</p>
          <p className="mt-1 font-display text-3xl font-bold">{latest ? latest.count : "—"}</p>
          {latest ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Last check: {latest.masked} · {new Date(latest.at).toLocaleDateString()}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">You haven't run a check yet.</p>
          )}
          <Link
            to="/breach-guard"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Run Breach Guard
          </Link>
        </div>

        <div className="surface p-6">
          <p className="text-sm text-muted-foreground">Safety habits</p>
          <p className="mt-1 font-display text-3xl font-bold">
            {habitsDone}/{HABITS.length}
          </p>
          <ul className="mt-3 space-y-2">
            {HABITS.map((h, i) => (
              <li key={h} className="flex items-start gap-2 text-sm">
                <input
                  id={`habit-${i}`}
                  type="checkbox"
                  checked={!!habits[i]}
                  onChange={() => toggleHabit(i)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                />
                <label
                  htmlFor={`habit-${i}`}
                  className={habits[i] ? "text-muted-foreground line-through" : ""}
                >
                  {h}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {history.length > 1 && (
          <div className="surface p-6 sm:col-span-2">
            <p className="text-sm font-semibold">Recent activity</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {history.slice(0, 5).map((r, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {r.masked} — {r.count} breach{r.count === 1 ? "" : "es"}
                  </span>
                  <span>{new Date(r.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="surface p-6 sm:col-span-2">
          <p className="text-sm font-semibold">Your data on this device</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {PRODUCT_NAME} stores only masked summaries on this device. Nothing is uploaded and
            nothing is tied to you.
          </p>
          <button
            type="button"
            onClick={() => {
              clearAllSafeyardData();
              setHabits({});
            }}
            className="mt-3 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Clear data stored on this device
          </button>
        </div>
      </div>
    </div>
  );
}


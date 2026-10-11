// Security Report (/report) — a print-friendly summary built ONLY from what is
// already stored on this device: masked breach summaries, safety habits and
// checklist progress. Never fakes a score: with no data it shows an empty
// state with CTAs instead of inventing numbers. Nothing is uploaded.
import { Link } from "../lib/router.jsx";
import { PageHeader } from "../components/ui.jsx";
import { getBreachHistory } from "../lib/device-storage.js";
import { getItem } from "../lib/storage.js";
import { scoreDashboard } from "../lib/score.js";
import { HABITS } from "../content/habits.js";

function loadHabits() {
  try {
    const raw = localStorage.getItem("safeyard:habits");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function Report() {
  const history = getBreachHistory();
  const latest = history[0] || null;
  const habits = loadHabits();
  const habitsDone = HABITS.filter((_, i) => habits[i]).length;

  const checklistAll = getItem("checklists") || {};
  const leakChecks = checklistAll["leak-safety-guide"] || {};
  const leakDone = Object.values(leakChecks).filter(Boolean).length;

  const hasData = history.length > 0 || habitsDone > 0 || leakDone > 0;

  const score = scoreDashboard({
    breachesFound: latest ? latest.count : null,
    habitsScore: (Object.values(habits).filter(Boolean).length / HABITS.length) * 100,
    checkupScore: null,
  });

  if (!hasData) {
    return (
      <div>
        <PageHeader
          eyebrow="Report"
          title="Security Report"
          description="A print-friendly summary of your score, breach checks and habits — built only from data on this device."
        />
        <div className="surface mx-auto max-w-3xl p-8 text-center">
          <p className="text-base font-semibold">Nothing to report yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            This report is built from real checks you run on this device — we never invent scores.
            Start with a breach check, then tick a few habits on the dashboard, and your report
            fills itself in.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
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
              Browse tools
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Report"
        title="Security Report"
        description="Built only from checks and habits stored on this device — nothing is uploaded."
      >
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Print / save as PDF
        </button>
      </PageHeader>

      <div className="mx-auto max-w-3xl space-y-6">
        <section className="surface p-6" aria-label="Score">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Security score</p>
              <p className="font-display text-4xl font-bold">{score.score}</p>
              <p className="text-sm font-semibold">{score.level}</p>
            </div>
            {!score.complete && (
              <p className="max-w-xs text-right text-xs text-muted-foreground">
                Partial score — run a breach check to complete it.
              </p>
            )}
          </div>
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
        </section>

        <section className="surface p-6" aria-label="Breach checks">
          <h2 className="text-base font-semibold">Breach checks</h2>
          {history.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {history.slice(0, 10).map((r, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-input pb-2 last:border-0">
                  <span>
                    {r.masked} — {r.count} breach{r.count === 1 ? "" : "es"}
                  </span>
                  <span className="text-muted-foreground">{new Date(r.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No checks yet.{" "}
              <Link to="/breach-guard" className="text-primary hover:underline">
                Run Breach Guard
              </Link>{" "}
              to fill this in.
            </p>
          )}
        </section>

        <section className="surface p-6" aria-label="Safety habits">
          <h2 className="text-base font-semibold">
            Safety habits — {habitsDone}/{HABITS.length}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {HABITS.map((h, i) => (
              <li key={h} className="flex items-start gap-2">
                <span aria-hidden="true" className={habits[i] ? "text-success" : "text-muted-foreground"}>
                  {habits[i] ? "✓" : "○"}
                </span>
                <span className={habits[i] ? "" : "text-muted-foreground"}>{h}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-6" aria-label="Checklist progress">
          <h2 className="text-base font-semibold">Leak response checklist</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {leakDone > 0 ? `${leakDone} step${leakDone === 1 ? "" : "s"} completed.` : "Not started."}{" "}
            <Link to="/tools/leak-safety-guide" className="text-primary hover:underline">
              Open the checklist
            </Link>
          </p>
        </section>

        <section className="surface p-6" aria-label="Next steps">
          <h2 className="text-base font-semibold">Recommended next steps</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {!latest && <li>Run a breach check to see if your email is exposed.</li>}
            {habitsDone < HABITS.length && <li>Finish the safety habits on the dashboard.</li>}
            <li>Give every important account a unique password.</li>
            <li>Turn on two-factor authentication, starting with your email.</li>
          </ul>
        </section>

        <p className="text-xs text-muted-foreground no-print">
          Stored on this device only. Use “Clear data stored on this device” on the dashboard to
          remove it.
        </p>
      </div>
    </div>
  );
}

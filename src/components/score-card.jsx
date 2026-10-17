// Shared security-score card — ONE component used by the Dashboard and the
// Breach Guard page so the two can never show different numbers (both feed it
// from computeSecurityScore() in lib/check-session.js). The ring is the same
// ScoreRing the Dashboard always had; `compact` renders the variant that sits
// directly under the breach-result summary. The score FORMULA (lib/score.js)
// is untouched — this is presentation only.
import { Link } from "../lib/router.jsx";

export function ScoreRing({ score, level, size = "lg" }) {
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
  const box = size === "sm" ? "h-20 w-20" : "h-28 w-28";
  const num = size === "sm" ? "text-2xl" : "text-3xl";
  return (
    <div
      className={`relative grid ${box} shrink-0 place-items-center`}
      role="img"
      aria-label={`Security score ${clamped} out of 100, ${level}`}
    >
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
        <p className={`font-display ${num} font-bold text-foreground`}>{clamped}</p>
        <p className={`text-xs font-semibold pt-1 ${tone}`}>{level}</p>
      </div>
    </div>
  );
}

/** One-line parts summary: "Breach exposure 50/100 · Safety habits Unknown …". */
function PartsInline({ parts }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {parts.map((p) => (
        <li key={p.label}>
          {p.label}{" "}
          <span className={p.known ? "tabular-nums text-foreground" : ""}>
            {p.known ? `${Math.round(p.value)}/100` : "Unknown"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{score: {score:number, level:string, parts:Array, missing:string[]},
 *          compact?: boolean, habitsLink?: {to:string, label:string}|null}} props
 */
export function ScoreCard({ score, compact = false, habitsLink = null }) {
  const missingHabits = score.missing.includes("habits");
  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={score.score} level={score.level} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Security score</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              50% breach exposure, 30% safety habits, 20% checkup — missing parts show
              as “Partial”, never a fake full score.
            </p>
          </div>
        </div>
        <PartsInline parts={score.parts} />
        {missingHabits && (
          <p className="mt-2 text-xs text-muted-foreground">
            {habitsLink ? (
              <>
                Finish the safety habits to complete your score —{" "}
                <Link to={habitsLink.to} className="font-medium text-primary hover:underline">
                  {habitsLink.label}
                </Link>
              </>
            ) : (
              "Finish the safety habits below to complete your score."
            )}
          </p>
        )}
      </div>
    );
  }
  return (
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
      {missingHabits && (
        <p className="mt-3 text-xs text-muted-foreground">
          {habitsLink ? (
            <>
              Finish the safety habits to complete your score —{" "}
              <Link to={habitsLink.to} className="font-medium text-primary hover:underline">
                {habitsLink.label}
              </Link>
            </>
          ) : (
            "Finish the safety habits below to complete your score."
          )}
        </p>
      )}
    </div>
  );
}

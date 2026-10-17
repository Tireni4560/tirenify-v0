// Shared Safety-habits checklist — ONE component used by the Dashboard and
// the Breach Guard page so labels, order, counts and behavior cannot diverge.
// Definitions come from src/content/habits.js (wording/order protected);
// ticked state comes from the shared habits store (src/lib/habits-store.js).
// Rows are native checkboxes (state never conveyed by color alone), 44px+
// tap targets, keyboard operable, with a visually-hidden polite live region
// announcing each change ("Habit saved. Safety habits 2 of 4. Score 63.").
import { useState } from "react";
import { HABITS } from "../content/habits.js";
import { HABITS_TOTAL } from "../lib/habits-store.js";

function HabitRows({ habits, onToggle, onAnnounce }) {
  const handle = (i) => {
    onToggle(i);
    if (onAnnounce) onAnnounce(i);
  };
  return (
    <ul className="mt-3 space-y-2">
      {HABITS.map((label, i) => (
        <li key={label}>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={!!habits[i]}
              onChange={() => handle(i)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
            />
            <span>{label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{habits: object, onToggle: (i:number)=>void,
 *          getScoreText?: (nextDone:number)=>string,
 *          variant?: "card"|"details", className?: string}} props
 */
export function HabitsChecklist({ habits, onToggle, getScoreText, variant = "card", className = "" }) {
  const done = HABITS.filter((_, i) => habits[i]).length;
  const [announcement, setAnnouncement] = useState("");
  const announce = (i) => {
    const next = done + (habits[i] ? -1 : 1);
    const scoreBit = typeof getScoreText === "function" ? getScoreText(next) : "";
    setAnnouncement(`Habit saved. Safety habits ${next} of ${HABITS_TOTAL}.${scoreBit ? ` ${scoreBit}` : ""}`);
  };
  const rows = <HabitRows habits={habits} onToggle={onToggle} onAnnounce={announce} />;
  const status = (
    <p role="status" className="sr-only">
      {announcement}
    </p>
  );
  if (variant === "details") {
    return (
      <details className={`surface p-6 ${className}`}>
        <summary className="cursor-pointer text-base font-semibold">
          Safety habits — {done}/{HABITS_TOTAL} done
        </summary>
        <p className="mt-1 text-sm text-muted-foreground">Stored on this device only.</p>
        {rows}
        {status}
      </details>
    );
  }
  return (
    <section aria-label="Safety habits" className={`surface p-6 ${className}`}>
      <h2 className="text-base font-semibold">
        Safety habits — {done} of {HABITS_TOTAL}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Stored on this device only.</p>
      {rows}
      {status}
    </section>
  );
}

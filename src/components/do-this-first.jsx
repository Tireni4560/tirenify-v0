// "Do this first" — the top slice of the next-step advice, driven by the pure
// getDoThisFirst() in lib/next-steps.js. NOT a second checklist: the existing
// action-plan checklist with local checkboxes (breach-guard) stays untouched
// below the breach list. One link per row, 44px+ tap targets, no hover-only
// behavior. Used by the Dashboard and the Breach Guard page.
import { Link } from "../lib/router.jsx";

/**
 * @param {{actions: Array<{id:string,title:string,reason:string,to:string}>,
 *          className?: string, headingId?: string}} props
 */
export function DoThisFirst({ actions, className = "", headingId }) {
  if (!actions || actions.length === 0) return null;
  return (
    <section aria-label="Do this first" className={`surface p-6 ${className}`}>
      <h2 id={headingId} className="text-base font-semibold">
        Do this first
      </h2>
      <ul className="mt-3 space-y-1">
        {actions.map((a, i) => (
          <li key={a.id}>
            <Link
              to={a.to}
              className="flex min-h-[44px] items-start gap-3 rounded-lg px-2 -mx-2 py-2 hover:bg-secondary/50"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent font-display text-xs font-semibold text-accent-foreground"
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{a.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{a.reason}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

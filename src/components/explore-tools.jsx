// Tool-discovery link list — compact stacked rows (mobile) that become a
// two-column grid on desktop. Reads whatever the selectors in
// src/content/tools.js produced (never a hard-coded tool list, never a route
// that is not live). Icons resolve the registry's lucide NAME strings through
// a small local map — lucide-react is already a dependency and tree-shakes,
// so only the icons actually referenced ship. No hover-only affordance: each
// row is a full-width link with a 44px+ tap target.
import { Link } from "../lib/router.jsx";
import {
  KeyRound,
  ShieldCheck,
  UserRound,
  MailCheck,
  Shield,
  Key,
  Clapperboard,
  BarChart3,
  ListChecks,
  FileText,
  QrCode,
} from "lucide-react";

const ICONS = {
  KeyRound,
  ShieldCheck,
  UserRound,
  MailCheck,
  Shield,
  Key,
  Clapperboard,
  BarChart3,
  ListChecks,
  FileText,
  QrCode,
};

/** Registry icon NAME -> lucide component. Unknown names render nothing. */
export function ToolIcon({ name, className = "h-5 w-5" }) {
  const C = ICONS[name];
  if (!C) return null;
  return <C className={className} aria-hidden="true" />;
}

/**
 * @param {{items: Array<{to:string,name:string,description:string,icon:string,slug:string}>,
 *          heading: string, allToolsTo?: string, allToolsLabel?: string,
 *          limitMobile?: number, className?: string}} props
 */
export function ExploreTools({
  items,
  heading = "Explore tools",
  allToolsTo = "/tools",
  allToolsLabel = "See all tools",
  limitMobile = 5,
  className = "",
}) {
  if (!items || items.length === 0) return null;
  return (
    <section aria-label={heading} className={`surface p-6 ${className}`}>
      <h2 className="text-base font-semibold">{heading}</h2>
      <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
        {items.map((t, i) => (
          <li key={t.to} className={i >= limitMobile ? "hidden sm:list-item" : ""}>
            <Link
              to={t.to}
              className="flex min-h-[44px] items-start gap-3 rounded-lg px-2 -mx-2 py-2.5 hover:bg-secondary/50"
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <ToolIcon name={t.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to={allToolsTo}
        className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline"
      >
        {allToolsLabel} →
      </Link>
    </section>
  );
}

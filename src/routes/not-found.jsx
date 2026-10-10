// 404 view. Shown for unknown paths and for any planned (not-yet-built) route,
// so nothing is ever linked to a placeholder or "coming soon" page.
import { Link } from "../lib/router.jsx";

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <p className="font-display text-5xl font-bold">404</p>
      <h1 className="mt-2 text-2xl font-semibold">We couldn't find that page</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        The link may be mistyped or the page may have moved. Try the dashboard or run a breach check.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground">
          Go to dashboard
        </Link>
        <Link to="/breach-guard" className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary">
          Breach Guard
        </Link>
      </div>
    </div>
  );
}

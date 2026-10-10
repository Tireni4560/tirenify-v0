// Static page renderer for /help, /privacy, /terms, /about. Content comes from
// lib/static-content.js so legal wording lives in one reviewable place.
import { useRoute, Link } from "../lib/router.jsx";
import { PageHeader } from "../components/ui.jsx";
import { STATIC_CONTENT } from "../lib/static-content.js";
import { PRODUCT_FULL, COMPANY } from "../config/brand.js";

export default function StaticPage({ route }) {
  const { path } = useRoute();
  const content = STATIC_CONTENT[path] || { title: route?.title || "Page", body: [] };
  return (
    <div>
      <PageHeader eyebrow={PRODUCT_FULL} title={content.title} />
      <div className="space-y-4">
        {content.body.map((para, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {para.trim()}
          </p>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/breach-guard" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground">
          Run Breach Guard
        </Link>
        <Link to="/" className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary">
          Back to dashboard
        </Link>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        {PRODUCT_FULL} by {COMPANY}.
      </p>
    </div>
  );
}

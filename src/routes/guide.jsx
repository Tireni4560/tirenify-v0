// Article route: /learn/:slug resolves against src/content/learn.js. Unknown
// slugs render the 404 view — every shipped guide has its own live route-table
// entry (sitemap/snapshots), while this pattern handles client navigation.
// Sections render as plain elements (never innerHTML) and per-article <head>
// tags are set here since the pattern route can't know the title.
import { useEffect } from "react";
import { Link } from "../lib/router.jsx";
import NotFound from "./not-found.jsx";
import { getGuide } from "../content/learn.js";
import { getTool } from "../content/tools.js";
import { applyHead } from "../lib/head.js";
import { pageTitle, PRODUCT_FULL } from "../config/brand.js";
import { LIVE_ROUTES } from "../config/routes.js";

const LIVE = new Set(LIVE_ROUTES.map((r) => r.path));

export default function GuideRoute({ slug }) {
  const guide = getGuide(slug);

  useEffect(() => {
    if (guide) {
      applyHead({
        title: pageTitle(guide.title),
        description: guide.summary,
        path: `/learn/${slug}`,
      });
    } else {
      applyHead({ title: `Page not found | ${PRODUCT_FULL}`, description: "", path: `/learn/${slug}` });
    }
  }, [slug, guide]);

  if (!guide) return <NotFound />;

  const relatedGuides = (guide.related || []).map(getGuide).filter(Boolean);
  const relatedTools = (guide.tools || [])
    .map((s) => (LIVE.has(`/tools/${s}`) ? getTool(s) : null))
    .filter(Boolean);

  return (
    <article>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Learn</p>
      <h1 className="text-3xl font-semibold sm:text-4xl">{guide.title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{guide.summary}</p>
      <div className="mx-auto mt-6 max-w-3xl space-y-6">
        {guide.sections.map((s, i) => (
          <section key={i} className="surface p-6">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>

      {relatedTools.length > 0 && (
        <section aria-label="Related tools" className="mt-8">
          <h2 className="text-base font-semibold">Try the tools</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedTools.map((t) => (
              <Link
                key={t.slug}
                to={`/tools/${t.slug}`}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {relatedGuides.length > 0 && (
        <section aria-label="Related guides" className="mt-8">
          <h2 className="text-base font-semibold">Keep reading</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedGuides.map((g) => (
              <Link
                key={g.slug}
                to={`/learn/${g.slug}`}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                {g.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/learn"
          className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          ← All guides
        </Link>
        <Link
          to="/breach-guard"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Run Breach Guard
        </Link>
      </div>
    </article>
  );
}

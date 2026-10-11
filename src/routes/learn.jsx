// Security Center hub — groups guides from src/content/learn.js by category.
// Only guides in that content file appear (registry honesty: no placeholders).
import { Link } from "../lib/router.jsx";
import { PageHeader } from "../components/ui.jsx";
import { GUIDES, LEARN_CATEGORIES } from "../content/learn.js";

export default function LearnHub() {
  const groups = LEARN_CATEGORIES.map((c) => ({
    ...c,
    guides: GUIDES.filter((g) => g.category === c.key),
  })).filter((g) => g.guides.length > 0);

  return (
    <div>
      <PageHeader
        eyebrow="Learn"
        title="Security Center"
        description="Clear, practical guidance — no jargon. Read any guide with no account and nothing tracked."
      />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key} aria-label={g.label}>
            <h2 className="text-base font-semibold">{g.label}</h2>
            <div className="mx-auto mt-3 grid max-w-3xl gap-3 md:grid-cols-2">
              {g.guides.map((guide, index) => (
                <Link
                  key={guide.slug}
                  to={`/learn/${guide.slug}`}
                  className={`surface block w-full max-w-md justify-self-center p-5 transition-colors hover:bg-secondary/50 ${
                    g.guides.length % 2 === 1 && index === g.guides.length - 1 ? "md:col-span-2" : ""
                  }`}
                >
                  <h3 className="font-medium">{guide.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{guide.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-8">
        <Link to="/tools" className="text-sm font-medium text-primary hover:underline">
          Prefer hands-on? See all tools →
        </Link>
      </div>
    </div>
  );
}

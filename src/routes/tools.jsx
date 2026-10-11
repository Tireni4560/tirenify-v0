// Tools directory — lists every registry tool grouped by category. Reads only
// src/content/tools.js; a tool appears here exactly when it is in the registry
// (registry honesty: working tools only, no "coming soon" entries).
// Supports ?section=<group-id> (sidebar nav): filters to that dashboard tool
// group via src/content/tool-groups.js. #category anchors are also kept for
// legacy deep links.
import { useEffect } from "react";
import { Link, useRoute } from "../lib/router.jsx";
import { PageHeader } from "../components/ui.jsx";
import { TOOLS, TOOL_CATEGORIES, getTool } from "../content/tools.js";
import { CATEGORIES } from "../config/brand.js";
import { getGroup, resolveGroup } from "../content/tool-groups.js";

export default function ToolsIndex() {
  const { query } = useRoute();
  const sectionId = typeof query.section === "string" ? query.section : "";
  const sectionGroup = sectionId ? getGroup(sectionId) : null;
  const resolved = sectionGroup ? resolveGroup(sectionGroup) : null;

  const groups = TOOL_CATEGORIES.map((key) => ({
    key,
    label: CATEGORIES[key],
    tools: TOOLS.filter((t) => t.category === key).sort((a, b) => a.priority - b.priority),
  })).filter((g) => g.tools.length > 0);

  // Support /tools#category deep links from the dashboard sections.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) document.querySelector(hash)?.scrollIntoView();
  });

  if (sectionGroup && resolved) {
    const items = resolved.items;
    return (
      <div>
        <PageHeader
          eyebrow="Tools"
          title={resolved.label}
          description={`${resolved.blurb} No account needed — nothing you type is uploaded.`}
        />
        {items.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((t) => {
              const tool = t.slug === "__breach-guard__" ? t : getTool(t.slug);
              const to = t.slug === "__breach-guard__" ? "/breach-guard" : `/tools/${t.slug}`;
              return (
                <Link key={t.slug} to={to} className="surface block p-5 transition-colors hover:bg-secondary/50">
                  <h3 className="font-medium">{tool?.name || t.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{tool?.purpose || t.purpose}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No live tools in this section yet.</p>
        )}
        <div className="mt-8">
          <Link to="/tools" className="text-sm font-medium text-primary hover:underline">
            ← All tools
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Tools"
        title="Free digital safety tools"
        description="No account needed — nothing you type is uploaded. Pick a tool to get started."
      />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key} id={g.key} aria-label={g.label} className="scroll-mt-24">
            <h2 className="text-base font-semibold">{g.label}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.tools.map((t) => (
                <Link
                  key={t.slug}
                  to={`/tools/${t.slug}`}
                  className="surface block p-5 transition-colors hover:bg-secondary/50"
                >
                  <h3 className="font-medium">{t.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t.purpose}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

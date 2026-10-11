// ToolPage — the layout EVERY tool uses. H1 + one-sentence purpose,
// privacy badge, tool area, aria-live result region, How-it-works accordion,
// Limits panel (section-14 wording from the registry entry), Tips, Related
// tools, Next steps, and copy/print/export actions where relevant.
import { Link } from "../lib/router.jsx";
import { PageHeader } from "./ui.jsx";
import { Accordion, Badge, Button, Callout, CopyButton } from "./ui-kit.jsx";
import { getTool } from "../content/tools.js";

export function ToolBadges() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="info" icon="🔒">
        Nothing you type is uploaded
      </Badge>
    </div>
  );
}

export function LimitsPanel({ text }) {
  return (
    <Callout tone="warn" title="Limits of this check">
      <p>{text}</p>
      <p className="mt-1">
        No tool here can guarantee safety. When in doubt, verify through the official channel — type the
        address yourself or call the number on your card.
      </p>
    </Callout>
  );
}

/**
 * Full tool page shell. `tool` is a registry entry; children:
 *   form     — inputs (left column on desktop)
 *   result   — result region content (right column; aria-live polite)
 *   howItWorks — accordion body text/elements
 *   tips     — array of short strings
 *   actions  — {copyText, onPrint, onExport, exportLabel}
 */
export function ToolPage({
  tool,
  form,
  result,
  resultEmpty,
  howItWorks,
  tips = [],
  nextSteps = [],
  actions = {},
}) {
  const related = (tool?.related || []).map(getTool).filter(Boolean);
  return (
    <div>
      <PageHeader eyebrow="Tool" title={tool?.name || "Tool"} description={tool?.purpose} />
      <div className="mb-6">
        <ToolBadges />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Inputs" className="surface h-fit p-6">
          {form}
        </section>
        <section aria-label="Result" className="surface h-fit p-6">
          <div aria-live="polite">{result || resultEmpty || <p className="text-sm text-muted-foreground">Your result will appear here.</p>}</div>
          {(actions.copyText || actions.onPrint || actions.onExport) && result && (
            <div className="mt-4 flex flex-wrap gap-2 no-print">
              {actions.copyText && <CopyButton text={actions.copyText} />}
              {actions.onPrint && (
                <Button tone="secondary" onClick={actions.onPrint}>
                  Print
                </Button>
              )}
              {actions.onExport && (
                <Button tone="secondary" onClick={actions.onExport}>
                  {actions.exportLabel || "Export"}
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {howItWorks && (
        <div className="mt-6">
          <Accordion items={[{ id: "how", title: "How it works", body: howItWorks }]} />
        </div>
      )}

      {tool?.limits && (
        <div className="mt-6">
          <LimitsPanel text={tool.limits} />
        </div>
      )}

      {tips.length > 0 && (
        <section aria-label="Tips" className="mt-6">
          <h2 className="text-base font-semibold">Tips</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section aria-label="Related tools" className="mt-6">
          <h2 className="text-base font-semibold">Related tools</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link key={r.slug} to={`/tools/${r.slug}`} className="rounded-lg border border-input px-3 py-2 text-sm hover:bg-secondary">
                {r.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {nextSteps.length > 0 && (
        <section aria-label="Next steps" className="mt-6">
          <h2 className="text-base font-semibold">Next steps</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {nextSteps.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-primary-foreground">
                {n.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useLastScan, riskOf, recommendations } from "@/lib/scan-store";

export const Route = createFileRoute("/security-report")({
  head: () => ({
    meta: [
      { title: "Security Report — Tirenify" },
      { name: "description", content: "A detailed breakdown of your breach exposure with clear recommendations." },
      { property: "og:title", content: "Security Report — Tirenify" },
      { property: "og:description", content: "Your detailed exposure breakdown and fixes." },
    ],
  }),
  component: Report,
});

function Report() {
  const { scan, ready } = useLastScan();
  const risk = riskOf(scan);
  if (!ready) return null;
  if (!scan)
    return (
      <>
        <PageHeader eyebrow="Report" title="Security Report" />
        <div className="surface p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No report yet</h2>
          <p className="mt-1 text-muted-foreground">Run a Breach Guard check to generate your report.</p>
          <Link to="/breach-guard" className="mt-6 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Start a check</Link>
        </div>
      </>
    );

  const counts = new Map<string, number>();
  scan.breaches.forEach((b) => b.dataClasses.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1)));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = top[0]?.[1] ?? 1;

  return (
    <>
      <PageHeader eyebrow="Report" title="Security Report" description={`For ${scan.email} · ${new Date(scan.checkedAt).toLocaleDateString()}`}>
        <button onClick={() => window.print()} className="rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-secondary">Print / Save PDF</button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5"><p className="text-sm text-muted-foreground">Security score</p><p className="font-display text-3xl font-semibold">{risk.score}</p><p className="text-sm">{risk.level}</p></div>
        <div className="surface p-5"><p className="text-sm text-muted-foreground">Breaches</p><p className="font-display text-3xl font-semibold">{scan.breaches.length}</p></div>
        <div className="surface p-5"><p className="text-sm text-muted-foreground">Data types exposed</p><p className="font-display text-3xl font-semibold">{counts.size}</p></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface p-6">
          <h2 className="text-lg font-semibold">What was exposed</h2>
          {top.length ? (
            <ul className="mt-4 space-y-3">
              {top.map(([k, v]) => (
                <li key={k}>
                  <div className="flex justify-between text-sm"><span>{k}</span><span className="text-muted-foreground">{v}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-muted-foreground">Nothing exposed. Nice.</p>}
        </section>
        <section className="surface p-6">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <ol className="mt-4 space-y-4">
            {recommendations(scan).map((r, i) => (
              <li key={r.title} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{i + 1}</span>
                <div><p className="font-medium">{r.title} <span className="ml-1 text-xs text-muted-foreground">· {r.priority}</span></p><p className="text-sm text-muted-foreground">{r.body}</p></div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {scan.breaches.length > 0 && (
        <section className="surface mt-6 overflow-hidden">
          <h2 className="p-6 pb-2 text-lg font-semibold">Breach details</h2>
          <ul className="divide-y divide-border">
            {scan.breaches.map((b) => (
              <li key={b.name} className="p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{b.name} {b.domain && <span className="text-sm font-normal text-muted-foreground">· {b.domain}</span>}</p>
                  <p className="text-sm text-muted-foreground">{b.date}{b.industry && ` · ${b.industry}`}</p>
                </div>
                {b.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{b.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">{b.dataClasses.map((d) => <span key={d} className="rounded-md bg-secondary px-2 py-0.5 text-xs">{d}</span>)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

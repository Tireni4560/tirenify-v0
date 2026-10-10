import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight, BellRing, Fingerprint, KeyRound, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useLastScan, riskOf, recommendations } from "@/lib/scan-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Tirenify" },
      { name: "description", content: "Your digital security overview: exposure score, alerts and recommended actions." },
      { property: "og:title", content: "Dashboard — Tirenify" },
      { property: "og:description", content: "Your digital security overview on Tirenify." },
    ],
  }),
  component: Dashboard,
});

const toneText = { success: "text-success", warning: "text-warning", destructive: "text-destructive", muted: "text-muted-foreground" };

function Dashboard() {
  const { scan } = useLastScan();
  const risk = riskOf(scan);
  const recs = recommendations(scan).slice(0, 3);
  return (
    <>
      <PageHeader eyebrow="Overview" title="Your security, at a glance" description="See where you stand and what to do next." />

      <section className="surface bg-hero relative overflow-hidden p-6 sm:p-10">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Breach Guard
            </span>
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
              {scan ? (scan.breaches.length ? `${scan.breaches.length} breaches found for ${scan.email}` : `No known breaches for ${scan.email}`) : "Has your email been leaked?"}
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              {scan ? `Last checked ${new Date(scan.checkedAt).toLocaleString()}.` : "Run a free check against known data breaches in seconds."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/breach-guard" className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
                {scan ? "Check another email" : "Check my email"} <ArrowRight className="h-4 w-4" />
              </Link>
              {scan && <Link to="/security-report" className="rounded-lg border border-input px-5 py-2.5 text-sm font-semibold hover:bg-secondary">View report</Link>}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="grid h-36 w-36 place-items-center rounded-full border-4 border-border bg-background/50">
              <div className="text-center">
                <p className="font-display text-4xl font-semibold">{risk.score ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Security score</p>
              </div>
            </div>
            <p className={`mt-3 text-sm font-semibold ${toneText[risk.tone]}`}>{risk.level}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Breaches found" value={scan ? String(scan.breaches.length) : "—"} icon={AlertTriangle} />
        <Stat label="Exposed data types" value={scan ? String(new Set(scan.breaches.flatMap((b) => b.dataClasses)).size) : "—"} icon={KeyRound} />
        <Stat label="Emails monitored" value="Soon" icon={BellRing} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recommended actions</h3>
            <Link to="/security-report" className="text-sm text-primary hover:underline">See all</Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {recs.map((r) => (
              <li key={r.title} className="flex gap-4 py-4">
                <span className={`mt-0.5 h-fit rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${r.priority === "Critical" ? "bg-destructive/15 text-destructive" : r.priority === "High" ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground"}`}>{r.priority}</span>
                <div><p className="font-medium">{r.title}</p><p className="text-sm text-muted-foreground">{r.body}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface p-6">
          <h3 className="text-lg font-semibold">Recent activity</h3>
          <ul className="mt-4 space-y-4 text-sm">
            {scan ? (
              <li className="flex gap-3"><ShieldCheck className="h-4 w-4 text-primary" /><div><p>Breach check for {scan.email}</p><p className="text-muted-foreground">{new Date(scan.checkedAt).toLocaleString()}</p></div></li>
            ) : <li className="text-muted-foreground">No activity yet. Run your first breach check.</li>}
          </ul>
          <div className="mt-6 space-y-3 border-t border-border pt-6">
            <Upcoming icon={BellRing} title="Breach monitoring" to="/alerts" />
            <Upcoming icon={Fingerprint} title="Privacy footprint check" to="/privacy" />
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent"><Icon className="h-5 w-5 text-primary" /></span>
      <div><p className="font-display text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
    </div>
  );
}

function Upcoming({ icon: Icon, title, to }: { icon: any; title: string; to: "/alerts" | "/privacy" }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
      <Icon className="h-4 w-4 text-muted-foreground" /><span className="flex-1 text-sm">{title}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Coming soon</span>
    </Link>
  );
}

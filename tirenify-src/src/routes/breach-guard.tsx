import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, Search, Lock } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { checkEmail, type ScanResult } from "@/lib/breach.functions";
import { saveScan } from "@/lib/scan-store";

export const Route = createFileRoute("/breach-guard")({
  head: () => ({
    meta: [
      { title: "Breach Guard — Tirenify" },
      { name: "description", content: "Check if your email address has appeared in known data breaches." },
      { property: "og:title", content: "Breach Guard — Tirenify" },
      { property: "og:description", content: "Free email breach check by Tirenify." },
    ],
  }),
  component: BreachGuard,
});

function BreachGuard() {
  const run = useServerFn(checkEmail);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
    setLoading(true);
    try {
      const r = await run({ data: { email: email.trim() } });
      setResult(r);
      saveScan(r);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Core product" title="Breach Guard" description="Find out if your email has appeared in a known data breach — and what was exposed." />
      <form onSubmit={submit} className="surface bg-hero p-6 sm:p-10">
        <label htmlFor="email" className="text-sm font-medium">Email address</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={255}
              className="h-12 w-full rounded-lg border border-input bg-background/60 pl-11 pr-4 outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-semibold text-primary-foreground shadow-glow disabled:opacity-70">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {loading ? "Checking…" : "Check now"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> We never store your email on our servers. Results are saved only on this device.</p>
      </form>

      {result && (
        <section className="mt-6">
          {result.breaches.length === 0 ? (
            <div className="surface flex items-start gap-4 p-6">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-success/15"><ShieldCheck className="h-6 w-6 text-success" /></span>
              <div><h2 className="text-xl font-semibold">Good news — no known breaches</h2><p className="mt-1 text-muted-foreground">{result.email} wasn't found in the breaches we know about. Keep good habits to stay that way.</p></div>
            </div>
          ) : (
            <>
              <div className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-destructive/15"><ShieldAlert className="h-6 w-6 text-destructive" /></span>
                <div className="flex-1"><h2 className="text-xl font-semibold">Found in {result.breaches.length} breach{result.breaches.length > 1 ? "es" : ""}</h2><p className="text-muted-foreground">Don't panic — here's what was exposed and how to fix it.</p></div>
                <Link to="/security-report" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">View full report</Link>
              </div>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {result.breaches.slice(0, 6).map((b) => (
                  <li key={b.name} className="surface p-5">
                    <div className="flex items-baseline justify-between gap-2"><p className="font-semibold">{b.name}</p><p className="text-xs text-muted-foreground">{b.date}</p></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{b.dataClasses.slice(0, 5).map((d) => <span key={d} className="rounded-md bg-secondary px-2 py-0.5 text-xs">{d}</span>)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}

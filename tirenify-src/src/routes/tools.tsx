import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, KeyRound, Gauge, Link2, QrCode, Wifi } from "lucide-react";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Security Tools — Tirenify" },
      { name: "description", content: "Practical tools to strengthen your digital security." },
      { property: "og:title", content: "Security Tools — Tirenify" },
      { property: "og:description", content: "Password generator, strength checks and more." },
    ],
  }),
  component: Tools,
});

function generate(len: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*-_";
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

function strength(p: string) {
  let s = 0;
  if (p.length >= 12) s++;
  if (p.length >= 16) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];

function Tools() {
  const [len, setLen] = useState(18);
  const [pw, setPw] = useState("");
  const [test, setTest] = useState("");
  const s = strength(test);
  return (
    <>
      <PageHeader eyebrow="Toolkit" title="Security Tools" description="Simple tools that make a real difference." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-6">
          <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Password generator</h2></div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-input bg-background/60 p-3 font-mono text-sm">
            <span className="flex-1 break-all">{pw || "Click generate"}</span>
            {pw && <button onClick={() => navigator.clipboard.writeText(pw)} className="text-primary">Copy</button>}
          </div>
          <label className="mt-4 block text-sm text-muted-foreground">Length: {len}</label>
          <input type="range" min={8} max={40} value={len} onChange={(e) => setLen(+e.target.value)} className="w-full accent-primary" />
          <button onClick={() => setPw(generate(len))} className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Generate</button>
        </section>
        <section className="surface p-6">
          <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Password strength</h2></div>
          <input type="password" value={test} onChange={(e) => setTest(e.target.value)} placeholder="Type a password (never sent anywhere)"
            className="mt-4 h-11 w-full rounded-lg border border-input bg-background/60 px-4 outline-none focus:ring-2 focus:ring-ring" />
          <div className="mt-4 flex gap-1.5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < s ? "bg-brand" : "bg-secondary"}`} />)}</div>
          <p className="mt-2 text-sm text-muted-foreground">{test ? labels[s] : "Checked locally on your device."}</p>
        </section>
      </div>
      <h2 className="mb-4 mt-10 text-lg font-semibold">More tools</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/breach-guard" className="surface p-5 hover:border-primary/40"><ShieldCheck className="h-5 w-5 text-primary" /><p className="mt-3 font-medium">Breach Guard</p><p className="text-sm text-muted-foreground">Available</p></Link>
        {[{ i: Link2, t: "Link safety checker" }, { i: QrCode, t: "QR code scanner" }, { i: Wifi, t: "Wi-Fi safety check" }].map(({ i: I, t }) => (
          <div key={t} className="surface p-5 opacity-70"><I className="h-5 w-5 text-muted-foreground" /><p className="mt-3 font-medium">{t}</p><p className="text-sm text-muted-foreground">Coming soon</p></div>
        ))}
      </div>
    </>
  );
}

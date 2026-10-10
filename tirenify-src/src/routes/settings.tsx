import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Tirenify" },
      { name: "description", content: "Account, security, notification and app preferences." },
      { property: "og:title", content: "Settings — Tirenify" },
      { property: "og:description", content: "Manage your Tirenify preferences." },
    ],
  }),
  component: Settings,
});

const KEY = "tirenify:settings";
const groups = [
  { title: "Security", items: [
    { id: "saveHistory", label: "Save scan results on this device", desc: "Lets the dashboard and report show your latest check." },
    { id: "maskEmail", label: "Mask emails in reports", desc: "Hide part of your email when printing reports." },
  ] },
  { title: "Notifications", items: [
    { id: "breachAlerts", label: "New breach alerts", desc: "Available when monitoring launches." },
    { id: "tips", label: "Monthly security tips", desc: "Short, practical advice from the Security Center." },
  ] },
  { title: "Application", items: [
    { id: "reduceMotion", label: "Reduce motion", desc: "Minimise animations across the app." },
  ] },
];

function Settings() {
  const [s, setS] = useState<Record<string, boolean>>({ saveHistory: true, breachAlerts: true });
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v) setS(JSON.parse(v)); } catch {} }, []);
  const toggle = (id: string, v: boolean) => { const n = { ...s, [id]: v }; setS(n); localStorage.setItem(KEY, JSON.stringify(n)); toast.success("Preference saved"); };
  const clear = () => { localStorage.removeItem("tirenify:last-scan"); window.dispatchEvent(new Event("tirenify:scan")); toast.success("Scan history cleared"); };
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Control how Tirenify works for you." />
      <div className="max-w-3xl space-y-6">
        {groups.map((g) => (
          <section key={g.title} className="surface divide-y divide-border">
            <h2 className="p-5 text-base font-semibold">{g.title}</h2>
            {g.items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-6 p-5">
                <div><p className="font-medium">{i.label}</p><p className="text-sm text-muted-foreground">{i.desc}</p></div>
                <Switch checked={!!s[i.id]} onCheckedChange={(v) => toggle(i.id, v)} />
              </div>
            ))}
          </section>
        ))}
        <section className="surface flex items-center justify-between gap-6 p-5">
          <div><p className="font-medium">Clear scan history</p><p className="text-sm text-muted-foreground">Remove saved results from this device.</p></div>
          <button onClick={clear} className="rounded-lg border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">Clear</button>
        </section>
      </div>
    </>
  );
}

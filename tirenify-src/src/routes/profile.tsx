import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Tirenify" },
      { name: "description", content: "Your Tirenify profile and account details." },
      { property: "og:title", content: "Profile — Tirenify" },
      { property: "og:description", content: "Manage your Tirenify profile." },
    ],
  }),
  component: Profile,
});

const KEY = "tirenify:profile";

function Profile() {
  const [p, setP] = useState({ name: "", email: "" });
  useEffect(() => { try { setP(JSON.parse(localStorage.getItem(KEY) || "") ); } catch {} }, []);
  const initials = (p.name || "T").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <>
      <PageHeader eyebrow="Account" title="Profile" description="Saved on this device. Full accounts are coming soon." />
      <form className="surface max-w-2xl p-6" onSubmit={(e) => { e.preventDefault(); localStorage.setItem(KEY, JSON.stringify(p)); toast.success("Profile saved"); }}>
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand font-display text-xl font-semibold text-primary-foreground">{initials}</span>
          <div><p className="font-semibold">{p.name || "Your name"}</p><p className="text-sm text-muted-foreground">{p.email || "you@example.com"}</p></div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(["name", "email"] as const).map((k) => (
            <label key={k} className="text-sm">
              <span className="capitalize text-muted-foreground">{k === "name" ? "Full name" : "Email"}</span>
              <input type={k === "email" ? "email" : "text"} maxLength={120} value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background/60 px-4 outline-none focus:ring-2 focus:ring-ring" />
            </label>
          ))}
        </div>
        <button className="mt-6 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Save changes</button>
      </form>
    </>
  );
}

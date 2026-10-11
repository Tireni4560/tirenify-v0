// Account (/account) — a LOCAL profile only: name + email saved to this
// device's storage under the allow-listed "profile" prefs key. No auth, no
// server profile API, no Supabase users — full accounts are coming later.
// This never touches the subscription flow (separate keys and routes).
import { useState } from "react";
import { Link } from "../lib/router.jsx";
import { PageHeader } from "../components/ui.jsx";
import { getItem, setItem } from "../lib/storage.js";

export default function Account() {
  const saved = getItem("profile") || {};
  const [name, setName] = useState(saved.name || "");
  const [email, setEmail] = useState(saved.email || "");
  const [status, setStatus] = useState("");

  const initial = (name.trim()[0] || "S").toUpperCase();

  const save = (e) => {
    e.preventDefault();
    setItem("profile", { name: name.trim(), email: email.trim() });
    setStatus("Saved on this device.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Saved on this device. Full accounts are coming soon."
      />

      <form onSubmit={save} className="surface max-w-lg p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accent font-display text-xl font-bold text-accent-foreground"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{name.trim() || "Your name"}</p>
            <p className="truncate text-sm text-muted-foreground">{email.trim() || "you@example.com"}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="h-11 w-full rounded-lg border border-input bg-background/60 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-11 w-full rounded-lg border border-input bg-background/60 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Save changes
          </button>
          <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {status}
          </span>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Nothing here leaves this device — it is used only to personalise your dashboard. Use
          “Clear data stored on this device” on the dashboard to remove it. This profile is not a
          login and is not connected to any subscription.
        </p>
      </form>

      <div className="mt-6">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

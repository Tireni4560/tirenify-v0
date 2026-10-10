import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, ShieldCheck, FileText, BellRing, Fingerprint, Wrench,
  GraduationCap, User, Settings, LifeBuoy, Menu, X,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/breach-guard", label: "Breach Guard", icon: ShieldCheck, tag: "Core" },
  { to: "/security-report", label: "Security Report", icon: FileText },
  { to: "/alerts", label: "Alerts", icon: BellRing, soon: true },
  { to: "/privacy", label: "Privacy Check", icon: Fingerprint, soon: true },
  { to: "/tools", label: "Security Tools", icon: Wrench },
  { to: "/learn", label: "Security Center", icon: GraduationCap },
] as const;

const account = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/support", label: "Help & Support", icon: LifeBuoy },
] as const;

function NavItem({ item, onNavigate }: { item: any; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: true }}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
    >
      <Icon className="h-4 w-4 opacity-70 group-data-[status=active]:text-primary group-data-[status=active]:opacity-100" />
      <span className="flex-1">{item.label}</span>
      {item.tag && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">{item.tag}</span>}
      {item.soon && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Soon</span>}
    </Link>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand shadow-glow">
        <ShieldCheck className="h-4 w-4 text-primary-foreground" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Tirenify</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2"><Logo /></div>
      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Protect</p>
        {nav.map((i) => <NavItem key={i.to} item={i} onNavigate={close} />)}
      </nav>
      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Account</p>
        {account.map((i) => <NavItem key={i.to} item={i} onNavigate={close} />)}
      </nav>
      <div className="mt-auto surface bg-hero p-4">
        <p className="text-sm font-semibold">Monitoring is coming</p>
        <p className="mt-1 text-xs text-muted-foreground">Continuous breach alerts for your emails, launching soon.</p>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block lg:sticky lg:top-0 lg:h-screen">{sidebar}</aside>
      <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 lg:hidden">
        <Logo />
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-secondary"><Menu className="h-5 w-5" /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur" onClick={close} />
          <aside className="relative h-full w-72 overflow-y-auto border-r border-sidebar-border bg-sidebar">
            <button aria-label="Close menu" onClick={close} className="absolute right-3 top-4 rounded-lg p-2 hover:bg-secondary"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function ComingSoon({ icon: Icon, title, description, features }: { icon: any; title: string; description: string; features: string[] }) {
  return (
    <>
      <PageHeader eyebrow="Coming soon" title={title} description={description} />
      <div className="surface bg-hero p-8 sm:p-12">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent"><Icon className="h-6 w-6 text-primary" /></span>
        <h2 className="mt-6 text-2xl font-semibold">We're building this next.</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">Breach Guard is available today. This feature will join the Tirenify platform soon.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-4 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{f}
            </li>
          ))}
        </ul>
        <Link to="/breach-guard" className="mt-8 inline-flex items-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Run a breach check now</Link>
      </div>
    </>
  );
}

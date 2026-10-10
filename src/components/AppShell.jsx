// App shell: sidebar on desktop, bottom bar on mobile. Header wordmark is a
// plain-text PRODUCT_NAME from brand.js (no icon or mascot).
// Nav is data-driven from routes.js so new modules can be added later without
// touching this file. All navigation is client-side (router.jsx).
import { useEffect, useState } from "react";
import { Link, useRoute } from "../lib/router.jsx";
import { PRODUCT_NAME, TAGLINE, COMPANY } from "../config/brand.js";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/breach-guard", label: "Breach Guard" },
];

const FOOTER_LINKS = [
  { to: "/help", label: "Help" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/about", label: "About" },
];

function Wordmark({ className = "" }) {
  return (
    <Link to="/" className={`font-display text-xl font-bold tracking-tight ${className}`}>
      {PRODUCT_NAME}
    </Link>
  );
}

function Sidebar() {
  const { path } = useRoute();
  const isActive = (to) => (to === "/" ? path === "/" : path.startsWith(to));
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center px-6">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${
              isActive(item.to)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-muted-foreground">
          {TAGLINE}
          <br />
          by {COMPANY}
        </p>
      </div>
    </aside>
  );
}

function MobileBar() {
  const { path } = useRoute();
  const isActive = (to) => (to === "/" ? path === "/" : path.startsWith(to));
  return (
    <nav
      className="sticky bottom-0 z-20 flex border-t border-sidebar-border bg-sidebar lg:hidden no-print"
      aria-label="Main"
    >
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`flex-1 px-2 py-3 text-center text-xs font-medium ${
            isActive(item.to) ? "text-primary" : "text-sidebar-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden no-print">
      <Wordmark />
      <Link to="/breach-guard" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground">
        Check
      </Link>
    </header>
  );
}

/** Renders the routed page and applies per-route <head> tags. */
export function AppShell({ children }) {
  const { path } = useRoute();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10" data-path={path}>
          {children}
        </main>
        <footer className="border-t border-sidebar-border px-4 py-6 sm:px-6 no-print">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {PRODUCT_NAME} by {COMPANY} — {TAGLINE}
            </p>
            <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
              {FOOTER_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="text-xs text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
        <MobileBar />
      </div>
    </div>
  );
}

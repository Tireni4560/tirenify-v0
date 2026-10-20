// App shell: sidebar on desktop and a drawer on mobile. Header
// wordmark is a plain-text PRODUCT_NAME from brand.js (no icon or mascot).
// Nav is data-driven from src/config/nav.js (single source) so items appear
// only when their destinations are live — no dead links, no placeholders.
// All navigation is client-side (router.jsx).
import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "../lib/router.jsx";
import { PRODUCT_NAME, TAGLINE } from "../config/brand.js";
import TirenifyLogo from "./tirenify-logo.jsx";
import { buildSidebarNav, isNavActive } from "../config/nav.js";

const FOOTER_LINKS = [
  { to: "/help", label: "Help" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/about", label: "About" },
  { href: "https://tirenify.app/", label: "Homepage", external: true },
];

function Wordmark({ className = "" }) {
  return (
    <Link to="/" className={`font-display text-xl font-bold tracking-tight ${className}`}>
      {PRODUCT_NAME}
    </Link>
  );
}

function NavItemLink({ item, path, onClose }) {
  const active = isNavActive(item, path);
  return (
    <Link
      to={item.to}
      onClick={onClose}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60"
      }`}
    >
      {item.label}
    </Link>
  );
}

const NAV_SECTIONS = buildSidebarNav();

function Sidebar() {
  const { path } = useRoute();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-6">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItemLink key={item.to} item={item} path={path} onClose={() => {}} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-muted-foreground">{TAGLINE}</p>
      </div>
    </aside>
  );
}

function MobileDrawer({ menuOpen, onClose, path }) {
  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        id="nav-drawer"
        className={`fixed right-0 top-0 z-30 flex max-h-screen w-full max-w-md flex-col border-l border-sidebar-border bg-sidebar shadow-glow no-print transform transition-transform duration-200 ease-out lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
          <p className="font-display text-lg font-bold">Menu</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-secondary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      isNavActive(item, path)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{TAGLINE}</p>
        </div>
      </div>
    </>
  );
}

/** Renders the top navigation header with the product wordmark and menu toggle. */
function Header({ menuOpen, onToggle }) {
  const { path } = useRoute();
  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4 no-print lg:ml-64">
      <div className="flex flex-1 items-center justify-between gap-3">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link
            to="/breach-guard"
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground no-print"
          >
            Breach Guard
          </Link>
          <button
            type="button"
            onClick={onToggle}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="nav-drawer"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

/** Renders the routed page and applies per-route <head> tags. */
export function AppShell({ children }) {
  const { path } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButtonRef = useRef(null);

  // Close menu when the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  // Body scroll lock while the menu is open.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [menuOpen]);

  // Focus the close button when the menu opens.
  useEffect(() => {
    if (menuOpen) {
      closeButtonRef.current?.focus();
    }
  }, [menuOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header menuOpen={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />
      <Sidebar />
      <MobileDrawer menuOpen={menuOpen} onClose={() => setMenuOpen(false)} path={path} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:mx-0 lg:ml-64 lg:w-auto lg:max-w-none lg:px-10 lg:py-8" data-path={path}>
        {children}
      </main>
      <footer className="border-t border-sidebar-border px-4 py-6 sm:px-6 no-print lg:ml-64">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {PRODUCT_NAME} <span className="text-xs">by</span>{" "}
            <TirenifyLogo variant="horizontal" height={22} className="inline shrink-0" alt="Tirenify" />{" "}
            — {TAGLINE}
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
            {FOOTER_LINKS.map((l) =>
              l.external ? (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {l.label}
                </a>
              ) : (
                <Link key={l.to} to={l.to} className="text-xs text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}

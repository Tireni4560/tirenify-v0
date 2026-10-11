// App shell: sidebar on desktop, bottom bar + More sheet on mobile. Header
// wordmark is a plain-text PRODUCT_NAME from brand.js (no icon or mascot).
// Nav is data-driven from src/config/nav.js (single source) so items appear
// only when their destinations are live — no dead links, no placeholders.
// All navigation is client-side (router.jsx).
import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "../lib/router.jsx";
import { PRODUCT_NAME, TAGLINE, COMPANY } from "../config/brand.js";
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
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11l3 3L21 4" />
      </svg>
      {item.label}
    </Link>
  );
}

const NAV_SECTIONS = buildSidebarNav();

function Sidebar() {
  const { path } = useRoute();
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border bg-sidebar">
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
            ref={onClose}
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
  const { path } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  // Body scroll lock while the menu is open.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      return () => {

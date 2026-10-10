// Single source of truth for product / module / company names.
// Nothing else in the app may hard-code these strings.
// Spec: PRODUCT_NAME = Safeyard (one word: capital S, lowercase "yard").
// Page titles use "<Page> | Safeyard by Tirenify". Company = Tirenify.
// Tagline = "Know Before They Do". Breach module = "Breach Guard".
//
// To change the product name later, change it HERE only — every component,
// metadata file and page title reads from this file.

export const PRODUCT_NAME = "Safeyard";
export const PRODUCT_FULL = "Safeyard by Tirenify";
export const COMPANY = "Tirenify";
export const TAGLINE = "Know Before They Do";

/** Route/module display names (extend here when new modules ship). */
export const MODULES = {
  dashboard: "Dashboard",
  breachGuard: "Breach Guard",
  report: "Security Report",
  tools: "Tools",
  learn: "Learn",
  checkup: "Checkup",
  privacyCheck: "Privacy Check",
  recover: "Recover",
  help: "Help",
  privacy: "Privacy",
  terms: "Terms",
  about: "About",
};

export const CATEGORIES = {
  passwords: "Passwords and accounts",
  scams: "Scams and links",
  privacy: "Privacy and files",
  everyday: "Everyday",
  money: "Money and documents",
};

// The product may move to another address later (e.g. safeyard.tirenify.app).
// NEVER hard-code the domain: every absolute URL below comes from this ONE
// setting. Default is the current host. Override at build time with the
// VITE_APP_URL environment variable (see .env.example). The server uses the
// same APP_URL (its own env) for canonical/og/email links and the 301 redirect.
const APP_URL = (import.meta.env?.VITE_APP_URL || "https://check.tirenify.app").replace(/\/$/, "");

export const SITE_URL = APP_URL;
export const OG_IMAGE = `${APP_URL}/og-preview.png`;
export const SUPPORT_EMAIL = "support@tirenify.app";

/** Date the legal/help copy was last reviewed. Update when that copy changes. */
export const LAST_UPDATED = "2026-10-08";

/** Data-source attribution (required by XposedOrNot). */
export const DATA_SOURCE = {
  name: "XposedOrNot",
  url: "https://xposedornot.com",
  attribution: "Breach data by XposedOrNot",
};

/** Page title builder: "<Page> | Safeyard by Tirenify". */
export function pageTitle(page) {
  return page ? `${page} | ${PRODUCT_FULL}` : `${PRODUCT_FULL} — ${TAGLINE}`;
}

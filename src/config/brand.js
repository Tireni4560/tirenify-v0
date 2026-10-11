// Single source of truth for product / module / company names.
// Nothing else in the app may hard-code these strings.
//
// BRAND HIERARCHY (mandatory):
//   - COMPANY = "Tirenify" .................. the company (parent brand)
//   - PRODUCT_NAME = "Safeyard" ............. the product (first in the portfolio)
//   - PRODUCT_ATTRIBUTION = "Safeyard by Tirenify" .. full product name, trust/
//     ownership lines ONLY (footer tagline, about page, og:site_name, manifest)
// RULE: never append "by Tirenify" (or by ${COMPANY}) to a string that already
// contains PRODUCT_ATTRIBUTION — that is what produced the old doubled brand
// line. UI chrome (headers, eyebrows, error text) uses PRODUCT_NAME
// ("Safeyard") alone; full lines use PRODUCT_ATTRIBUTION exactly once.
// Spec: PRODUCT_NAME = Safeyard (one word: capital S, lowercase "yard").
// Page titles use "<Page> | Safeyard by Tirenify". Company = Tirenify.
// Tagline = "Know Before They Do". Breach module = "Breach Guard".
//
// To change the product name later, change it HERE only — every component,
// metadata file and page title reads from this file.

export const PRODUCT_NAME = "Safeyard";
export const PRODUCT_FULL = "Safeyard by Tirenify";
/** Full product name with company attribution — use for trust/ownership lines,
 * exactly once per phrase. Alias of PRODUCT_FULL (kept both names so existing
 * imports keep working). */
export const PRODUCT_ATTRIBUTION = PRODUCT_FULL;
export const COMPANY = "Tirenify";
export const TAGLINE = "Know Before They Do";

/** Route/module display names (extend here when new modules ship). */
export const MODULES = {
  dashboard: "Dashboard",
  breachGuard: "Breach Guard",
  report: "Report",
  securityReport: "Security Report",
  tools: "Tools",
  learn: "Learn",
  securityCenter: "Security Center",
  account: "Account",
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

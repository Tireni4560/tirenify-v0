// TOOL GROUPS — dashboard-grade taxonomy shared by the tools directory and the
// sidebar nav. Every live tool belongs to exactly one group. Groups with zero
// live destinations are skipped wherever they are rendered (no empty shells).
// A group resolves each slug to a live destination: registry tools
// ("/tools/<slug>") or the "__breach-guard__" module ("/breach-guard").
import { LIVE_ROUTES } from "../config/routes.js";
import { getTool } from "./tools.js";

const LIVE = new Set(LIVE_ROUTES.map((r) => r.path));

export const BREACH_GUARD_CARD = {
  slug: "__breach-guard__",
  name: "Breach Guard",
  purpose: "Check if your email appeared in known data breaches.",
};

export const TOOL_GROUPS = [
  {
    id: "generators",
    label: "Generators",
    blurb: "Create strong, random secrets — passwords, passphrases, PINs, usernames, aliases and QR codes.",
    slugs: [
      "password-generator",
      "passphrase-generator",
      "pin-generator",
      "username-generator",
      "email-alias-generator",
      "security-answer-generator",
      "qr-code-generator",
    ],
  },
  {
    id: "password-security",
    label: "Password Security",
    blurb: "Check what you already have — strength, reuse and entropy, in signals not verdicts.",
    slugs: ["password-strength", "password-reuse-checker", "entropy-calculator"],
  },
  {
    id: "breach-checks",
    label: "Breach Checks",
    blurb: "See if your email was exposed — and exactly what to do next.",
    slugs: ["__breach-guard__", "leak-safety-guide"],
  },
];

/** Resolve a group's slugs to live destinations. Entries with zero live
 * destinations are omitted by callers (rendered as nothing). */
export function resolveGroup(group) {
  const items = [];
  for (const slug of group.slugs) {
    if (slug === "__breach-guard__") {
      if (LIVE.has("/breach-guard")) items.push({ ...BREACH_GUARD_CARD, to: "/breach-guard" });
    } else if (LIVE.has(`/tools/${slug}`)) {
      const tool = getTool(slug);
      if (tool) items.push({ ...tool, to: `/tools/${slug}` });
    }
  }
  return { ...group, items };
}

/** Groups that currently have at least one live destination. */
export function liveGroups() {
  return TOOL_GROUPS.map(resolveGroup).filter((g) => g.items.length > 0);
}

/** Find a group by id (for /tools?section=<id>), or null. */
export function getGroup(id) {
  return TOOL_GROUPS.find((g) => g.id === id) || null;
}

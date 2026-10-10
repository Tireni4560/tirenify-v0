// TOOL REGISTRY — one entry per tool. The directory, search, sitemap,
// related-tools and dashboard all read from here; nothing else hard-codes a
// tool list. HONESTY RULE: an entry exists ONLY when its tool works end to
// end. Phase A ships the schema + query helpers with an EMPTY list — the first
// tools land in Phase B and register themselves here.
//
// Entry shape:
//   slug       "password-generator" (lowercase-hyphenated; route /tools/<slug>)
//   name       "Password Generator"
//   purpose    one sentence, plain English
//   category   key of CATEGORIES in config/brand.js
//   keywords   search terms (synonyms, local words)
//   icon       lucide icon NAME (string; resolved by the UI, never a component)
//   priority   dashboard "quick tools" order (lower first)
//   offline    always true — every tool must work offline
//   related    slugs of related tools/guides (must all exist)
//   limits     short Limits-panel text (from the section-14 register)
import { CATEGORIES } from "../config/brand.js";

export const TOOL_CATEGORIES = Object.keys(CATEGORIES);

export const TOOLS = [
  {
    slug: "password-generator",
    name: "Password Generator",
    purpose: "Make strong, random passwords in your browser — nothing is sent anywhere.",
    category: "passwords",
    keywords: ["password", "generator", "random", "security", "create password", "passphrase"],
    icon: "KeyRound",
    priority: 1,
    offline: true,
    related: ["password-strength", "entropy-calculator", "passphrase-generator"],
    limits: "Only uses your browser's secure random number generator. We never see or store the passwords you type or generate.",
  },
  {
    slug: "password-strength",
    name: "Password Strength Checker",
    purpose: "Get signals about how hard a password is to guess — length, character classes and repeated patterns. No verdict, no upload.",
    category: "passwords",
    keywords: ["strength", "check", "guess", "entropy", "password check", "how strong"],
    icon: "ShieldCheck",
    priority: 2,
    offline: true,
    related: ["password-generator", "entropy-calculator", "password-reuse-checker"],
    limits: "This is an estimate, not a guarantee. It flags repeated strings, common patterns and missing character classes so you can improve the password yourself.",
  },
  {
    slug: "username-generator",
    name: "Username Generator",
    purpose: "Invent random, memorable usernames for accounts, and keep your real name out of them.",
    category: "passwords",
    keywords: ["username", "nickname", "handle", "alias", "online identity", "account name"],
    icon: "UserRound",
    priority: 3,
    offline: true,
    related: ["email-alias-generator"],
    limits: "Usernames are a suggestion only. Some sites reserve names quickly, and changing them later can be hard.",
  },
  {
    slug: "email-alias-generator",
    name: "Email Alias Generator",
    purpose: "Make plus-addressed and dot-variant email addresses to track where your address leaks.",
    category: "passwords",
    keywords: ["email", "alias", "plus addressing", "mask", "privacy", "track", "disposable"],
    icon: "MailCheck",
    priority: 4,
    offline: true,
    related: ["username-generator", "password-strength"],
    limits: "Aliases only change how your address is written. They do not stop a site from seeing that you used it, and they never create a real mailbox.",
  },
  {
    slug: "security-answer-generator",
    name: "Security Answer Generator",
    purpose: "Make up fake, memorable answers for security questions so real details cannot unlock your accounts.",
    category: "passwords",
    keywords: ["security question", "answer", "memorable", "identity", "recovery"],
    icon: "Shield",
    priority: 5,
    offline: true,
    related: ["password-strength", "password-generator"],
    limits: "Pick answers you can remember but would never tell anyone. Store them in a password manager, not in your browser's saved passwords.",
  },
  {
    slug: "pin-generator",
    name: "PIN Generator",
    purpose: "Make PINs that avoid repeats, sequences, years and other easy guesses.",
    category: "passwords",
    keywords: ["pin", "password", "number", "4 digit", "random", "lock screen"],
    icon: "Key",
    priority: 6,
    offline: true,
    related: ["password-strength", "password-generator"],
    limits: "PINs are only as good as their randomness. This uses your browser's secure random generator and avoids common bad patterns.",
  },
  {
    slug: "passphrase-generator",
    name: "Passphrase Generator",
    purpose: "Generate long, memorable passphrases for things that need a long secret — a master password or a phone backup.",
    category: "passwords",
    keywords: ["passphrase", "diceware", "master password", "memorable", "long password"],
    icon: "Clapperboard",
    priority: 7,
    offline: true,
    related: ["password-generator", "password-strength"],
    limits: "Longer is stronger. Pick a separator you can type on the devices you use, and store the result in a password manager.",
  },
  {
    slug: "entropy-calculator",
    name: "Password Entropy Calculator",
    purpose: "See the approximate entropy of a password and how long it would take to guess at a few speeds. Signals only.",
    category: "passwords",
    keywords: ["entropy", "bits", "guess", "strength", "estimate"],
    icon: "BarChart3",
    priority: 8,
    offline: true,
    related: ["password-strength", "password-generator"],
    limits: "A back-of-the-envelope estimate, not a score. Real hashes and attack speeds vary widely, so treat the numbers as rough.",
  },
  {
    slug: "password-reuse-checker",
    name: "Password Reuse Checker",
    purpose: "Paste a few passwords here and see which ones repeat — all on your device, nothing leaves the browser.",
    category: "passwords",
    keywords: ["reuse", "repeat", "checker", "paste", "better password"],
    icon: "ListChecks",
    priority: 9,
    offline: true,
    related: ["password-strength", "password-generator", "leak-safety-guide"],
    limits: "Comparing only on this device, so it can only flag identical lines you paste. It does not check against any database.",
  },
  {
    slug: "leak-safety-guide",
    name: "What to Do After a Data Leak",
    purpose: "A calm, ordered checklist of the first steps to take when a breach check shows your email was exposed.",
    category: "passwords",
    keywords: ["breach", "leak", "hacked", "what now", "recovery", "steps"],
    icon: "FileText",
    priority: 10,
    offline: true,
    related: ["password-strength", "password-reuse-checker", "security-answer-generator"],
    limits: "A guide, not a diagnosis. Follow the steps in order, and change passwords only on sites you can reach safely.",
  },
];

/** Find a tool by slug, or null. */
export function getTool(slug) {
  return TOOLS.find((t) => t.slug === slug) || null;
}

/** Tools in a category, in priority order. */
export function toolsByCategory(category, tools = TOOLS) {
  return tools.filter((t) => t.category === category).sort((a, b) => a.priority - b.priority);
}

/** Validate the registry itself: unique slugs, known categories, live related. */
export function validateRegistry(tools = TOOLS) {
  const errors = [];
  const seen = new Set();
  const slugs = new Set(tools.map((t) => t.slug));
  const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  for (const t of tools) {
    if (!t.slug || !slugRe.test(t.slug)) errors.push(`Bad slug: ${JSON.stringify(t.slug)}`);
    if (seen.has(t.slug)) errors.push(`Duplicate slug: ${t.slug}`);
    seen.add(t.slug);
    if (!t.name) errors.push(`Missing name: ${t.slug}`);
    if (!t.purpose) errors.push(`Missing purpose: ${t.slug}`);
    if (!TOOL_CATEGORIES.includes(t.category)) errors.push(`Unknown category for ${t.slug}: ${t.category}`);
    if (t.offline !== true) errors.push(`Tool must be offline: ${t.slug}`);
    if (!t.limits) errors.push(`Missing limits text: ${t.slug}`);
    for (const r of t.related || []) {
      if (!slugs.has(r) && !String(r).startsWith("/")) errors.push(`Unknown related "${r}" on ${t.slug}`);
    }
  }
  return errors;
}

// In-house fuzzy search over name/purpose/keywords/category. No network, no
// dependency. Scores: name prefix > name word > purpose/keyword hits; stable.
export function searchTools(query, tools = TOOLS) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored = [];
  for (const t of tools) {
    const name = t.name.toLowerCase();
    const hay = `${t.name} ${t.purpose} ${(t.keywords || []).join(" ")} ${CATEGORIES[t.category] || ""}`.toLowerCase();
    let score = 0;
    if (name === q) score += 100;
    else if (name.startsWith(q)) score += 60;
    for (const w of words) {
      if (name.includes(w)) score += 20;
      else if (hay.includes(w)) score += 8;
    }
    if (score > 0) scored.push({ tool: t, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.tool);
}

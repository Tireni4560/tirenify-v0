// Normalizer for XposedOrNot /v1/breach-analytics responses.
// CommonJS because server.js is CommonJS (root package has no "type":"module").
// Every field is treated as possibly missing — the API omits fields freely.
//
// Normalized shape:
// {
//   found: boolean,
//   breaches: [{ name, domain, industry, date, records, dataTypes: [],
//                passwordRisk, details, verified, references, added }],
//   pastes:   [{ title, source, date, count }],   // shaped defensively
//   years:    { <year>: count },                  // from breach dates
//   risk:     { label, score },                   // from API if present, else null
//   dataTypeCounts: { "<data type>": <# breaches exposing it> },  // API metric
//   passwordStrength: { plaintext, easyToCrack, strongHash, unknown } | null,
//   pasteCount: number | null,                    // API paste counter, when present
//   source:   "XposedOrNot",
//   checkedAt: ISO string
// }

function splitList(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function asIntOrNull(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parse one breaches_details entry. Returns null if it has no usable name. */
function parseBreach(entry) {
  if (!entry || typeof entry !== "object") return null;
  const name =
    typeof entry.breach === "string" && entry.breach.trim()
      ? entry.breach.trim()
      : typeof entry.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : null;
  if (!name) return null;

  // Keep the date exactly as the API gave it (a year stays a year).
  const rawDate =
    typeof entry.xposed_date === "string" && entry.xposed_date.trim()
      ? entry.xposed_date.trim()
      : typeof entry.breached_date === "string"
        ? entry.breached_date.trim()
        : null;

  return {
    name,
    domain: typeof entry.domain === "string" ? entry.domain.trim() : "",
    industry: typeof entry.industry === "string" ? entry.industry.trim() : "",
    date: rawDate,
    records: asIntOrNull(entry.xposed_records),
    dataTypes: splitList(entry.xposed_data),
    passwordRisk:
      typeof entry.password_risk === "string" ? entry.password_risk.toLowerCase().trim() : "unknown",
    details: typeof entry.details === "string" ? entry.details.trim() : "",
    verified: String(entry.verified || "").toLowerCase() === "yes",
    // references may hold several URLs; keep only http(s) links
    references: splitList(entry.references).filter((r) => /^https?:\/\//i.test(r)),
    added: typeof entry.added === "string" ? entry.added : null,
  };
}

/** Extract year (as string) from a date like "2012" or "Tue, 01 Apr 2014 ...". */
function yearOf(date) {
  if (!date) return null;
  const m = /(\d{4})/.exec(date);
  return m ? m[1] : null;
}

/**
 * Flatten the BreachMetrics.xposed_data tree into
 * { "<data type>": <number of breaches that exposed it> }.
 * Leaves are named "data_<Type>"; the prefix is stripped. Anything that is
 * not a usable leaf with a numeric count is ignored, so a malformed tree can
 * never produce a misleading number.
 */
function parseDataTypeCounts(tree) {
  const counts = {};
  if (!Array.isArray(tree)) return counts;
  const visit = (nodes) => {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const children = Array.isArray(node.children) ? node.children : null;
      if (children && children.length) {
        visit(children);
        continue;
      }
      const value = asIntOrNull(node.value);
      if (value === null) continue;
      const rawName = typeof node.name === "string" ? node.name.trim() : "";
      const name = rawName.replace(/^data_/, "").trim();
      if (!name) continue;
      counts[name] = (counts[name] || 0) + value;
    }
  };
  visit(tree);
  return counts;
}

/**
 * Normalize BreachMetrics.passwords_strength, which the API returns either as
 * a single object or as a one-item array:
 *   { PlainText: 11, EasyToCrack: 15, StrongHash: 15, Unknown: 22 }
 * The numbers count breaches in each storage category — they say nothing
 * about the user's own password. Returns null when the API omits it.
 */
function parsePasswordStrength(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== "object") return null;
  const pick = (keys) => {
    for (const k of keys) {
      const n = asIntOrNull(raw[k]);
      if (n !== null) return n;
    }
    return null;
  };
  const out = {
    plaintext: pick(["PlainText", "plaintext", "Plaintext"]),
    easyToCrack: pick(["EasyToCrack", "easyToCrack", "easy_to_crack"]),
    strongHash: pick(["StrongHash", "strongHash", "strong_hash"]),
    unknown: pick(["Unknown", "unknown"]),
  };
  if (Object.values(out).every((n) => n === null)) return null;
  return out;
}

/**
 * Normalize a raw /v1/breach-analytics JSON body.
 * @param {object} data parsed API response
 * @param {{checkedAt?: string}} [opts]
 */
function normalizeAnalytics(data, opts = {}) {
  const out = {
    found: false,
    breaches: [],
    pastes: [],
    years: {},
    risk: null,
    dataTypeCounts: {},
    passwordStrength: null,
    pasteCount: null,
    source: "XposedOrNot",
    checkedAt: opts.checkedAt || new Date().toISOString(),
  };
  if (!data || typeof data !== "object") return out;

  // 1) Per-breach details (authoritative when present)
  const details =
    (Array.isArray(data.ExposedBreaches?.breaches_details) &&
      data.ExposedBreaches.breaches_details) ||
    (Array.isArray(data.BreachMetrics?.get_details) && data.BreachMetrics.get_details) ||
    [];

  const seen = new Set();
  for (const raw of details) {
    const b = parseBreach(raw);
    if (!b || seen.has(b.name.toLowerCase())) continue;
    seen.add(b.name.toLowerCase());
    out.breaches.push(b);
  }

  // 2) Names-only fallback (API sometimes returns just BreachesSummary.site)
  const site = data.BreachesSummary?.site;
  if (typeof site === "string" && site.trim()) {
    for (const name of splitList(site)) {
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.breaches.push({
        name,
        domain: "",
        industry: "",
        date: null,
        records: null,
        dataTypes: [],
        passwordRisk: "unknown",
        details: "",
        verified: false,
        references: [],
        added: null,
      });
    }
  }

  // 3) Pastes (defensive: accept array under a few plausible keys)
  const pasteLists = [
    data.ExposedPastes?.exposed_pastes,
    Array.isArray(data.ExposedPastes) ? data.ExposedPastes : null,
    data.PasteMetrics,
  ];
  for (const list of pasteLists) {
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (!p || typeof p !== "object") continue;
      out.pastes.push({
        title: typeof p.paste_title === "string" ? p.paste_title : typeof p.title === "string" ? p.title : "",
        source: typeof p.source === "string" ? p.source : "",
        date: typeof p.date === "string" ? p.date : null,
        count: asIntOrNull(p.exposed_count) ?? asIntOrNull(p.count),
      });
    }
  }
  // Dedupe pastes by title+source
  const pasteSeen = new Set();
  out.pastes = out.pastes.filter((p) => {
    const k = `${p.title}|${p.source}`;
    if (pasteSeen.has(k)) return false;
    pasteSeen.add(k);
    return true;
  });

  // 4) Risk label from the API when provided
  const risk = Array.isArray(data.BreachMetrics?.risk) ? data.BreachMetrics.risk[0] : null;
  if (risk && typeof risk === "object") {
    out.risk = {
      label: typeof risk.risk_label === "string" ? risk.risk_label : null,
      score: asIntOrNull(risk.risk_score),
    };
  }

  // 4b) How each exposed data type appears across the breaches.
  // BreachMetrics.xposed_data is a tree: [ { name, children: [ { name,
  // children: [ { name: "data_Passwords", value: 44 } ] } ] } ]. The leaves
  // carry the count of breaches that exposed that data type. Only leaves with
  // a usable count are kept, and the count is the number of breaches — never
  // a number of records or people.
  out.dataTypeCounts = parseDataTypeCounts(data.BreachMetrics?.xposed_data);

  // 4c) How the exposed passwords were stored. The API reports a breakdown
  // of the breach set, not of the user's own password.
  out.passwordStrength = parsePasswordStrength(data.BreachMetrics?.passwords_strength);

  // 4d) Paste counter from the API (number of exposed paste entries).
  const pasteCnt = asIntOrNull(data.PastesSummary?.cnt);
  out.pasteCount = pasteCnt;

  // 5) Breaches-per-year counts
  for (const b of out.breaches) {
    const y = yearOf(b.date);
    if (y) out.years[y] = (out.years[y] || 0) + 1;
  }

  // A paste exposure counts as "found" even when the API returned no paste
  // DETAILS but did report a paste counter.
  out.found = out.breaches.length > 0 || out.pastes.length > 0 || (out.pasteCount ?? 0) > 0;
  return out;
}

module.exports = {
  normalizeAnalytics,
  parseBreach,
  splitList,
  yearOf,
  parseDataTypeCounts,
  parsePasswordStrength,
};

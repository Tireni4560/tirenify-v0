// Result copy — ONE source of truth for the words we show a visitor after a
// breach check. Pure functions only: no React, no I/O, so every claim can be
// unit-tested (tests/result-copy.test.js).
//
// Two rules govern everything in this file:
//   1. A clean check is NEVER described as proof of safety. It only means the
//      email was not found in the breaches this database knows about.
//   2. Every fact we show must come from the API response. We never infer that
//      a phone number, a password or a bank account was exposed unless the
//      breach record explicitly lists that data type.
//
// "Hit" and "no-hit" are two different states, not good/bad news: a hit needs
// calm, ordered remediation; a no-hit needs honest caveats and next steps.

/** Severity-aware, human labels for the API's password-storage breakdown. */
const PASSWORD_STORAGE = [
  { key: "plaintext", label: "Stored as plain text", severity: "critical" },
  { key: "easyToCrack", label: "Weakly protected", severity: "high" },
  { key: "strongHash", label: "Strongly hashed", severity: "low" },
  { key: "unknown", label: "Storage method unknown", severity: "unknown" },
];

/**
 * First and latest breach dates as the API gave them (a year stays a year).
 * @param {Array<{date?: string|null}>} breaches
 * @returns {{first: string|null, latest: string|null}}
 */
export function firstAndLatest(breaches) {
  const dated = (breaches || [])
    .filter((b) => b && b.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!dated.length) return { first: null, latest: null };
  return { first: dated[0].date, latest: dated[dated.length - 1].date };
}
/**
 * How many breaches a result represents.
 * Accepts the full normalized result, the masked device-storage summary
 * ({ count }) or a bare number.
 * @param {object|number|null} result
 * @returns {number}
 */
export function countBreaches(result) {
  if (typeof result === "number") return Number.isFinite(result) ? result : 0;
  if (!result || typeof result !== "object") return 0;
  if (Array.isArray(result.breaches)) return result.breaches.length;
  const n = Number(result.count);
  return Number.isFinite(n) ? n : 0;
}

/**
 * How many exposed paste entries a result represents (API-confirmed only).
 * @param {object|null} result
 * @returns {number}
 */
export function countPastes(result) {
  if (!result || typeof result !== "object") return 0;
  // The API counter is authoritative when it is a real number. `null`,
  // `undefined` and non-numeric values mean "the API did not report a counter"
  // — NOT "zero pastes" — so we fall back to the paste list the API returned.
  const raw = result.pasteCount;
  if (raw !== null && raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return Array.isArray(result.pastes) ? result.pastes.length : 0;
}

/**
 * The headline + supporting line for a check result.
 *
 * @param {object|null} result normalized result from lib/breach.js
 * @returns {{
 *   tone: "hit"|"paste"|"clear",
 *   chip: string,          // short status label for the chip
 *   headline: string,      // the one line a visitor reads first
 *   subhead: string,       // the honest qualifier underneath it
 *   qualifier: string,     // the "what this does not mean" line
 * }}
 */
export function getResultStatus(result) {
  // Accepts the full normalized result, the masked device-storage summary
  // ({ count }) or a bare number, so the homepage and Breach Guard always say
  // the same thing for the same check.
  const count = countBreaches(result);
  const pastes = countPastes(result);

  if (count > 0) {
    return {
      tone: "hit",
      chip: "Exposed",
      headline: `Found in ${count} breach${count === 1 ? "" : "es"}`,
      subhead:
        "Your email appears in the records of these known breaches. The details below show exactly what each one exposed.",
      qualifier:
        "This only covers breaches that are publicly known. It is not a complete picture of where your data may have been copied.",
    };
  }

  // Pastes are a separate exposure from breaches: the email was not found in a
  // breach, but it was posted on a public paste site. Say exactly that.
  if (pastes > 0) {
    return {
      tone: "paste",
      chip: "Found in pastes",
      headline: `Found in ${pastes} public paste${pastes === 1 ? "" : "s"}`,
      subhead:
        "This email was not found in a known breach, but it was found posted on public paste sites. Paste sites are shared openly and are often indexed by search engines.",
      qualifier:
        "A paste is not a breach, but the text is public. Remove the paste if you can, and change any password that appeared in it — the site may still keep a copy.",
    };
  }

  return {
    tone: "clear",
    chip: "No known breaches",
    headline: "No breaches found for this email",
    subhead:
      "This email was not found in the breaches we can see. That is a good sign — but it is not proof that it was never exposed.",
    qualifier:
      "This is not proof that you were never exposed. Many breaches are never reported or never made public, and data can be shared on sites that never appear in a breach database. Keep unique passwords and two-factor authentication on, and re-check every few months.",
  };
}

/**
 * API-confirmed facts about a hit, as label/value rows for the result card.
 * Every row is derived from a field the API actually returned.
 *
 * @param {object} result normalized result from lib/breach.js
 * @returns {Array<{label:string, value:string, hint?:string}>}
 */
export function getResultFacts(result) {
  if (!result) return [];
  const rows = [];

  const breaches = result.breaches || [];
  if (breaches.length > 0) {
    const { first, latest } = firstAndLatest(breaches);
    if (first && latest && first !== latest) {
      rows.push({ label: "Exposure window", value: `${first} to ${latest}` });
    } else if (latest) {
      rows.push({ label: "Breach date", value: String(latest) });
    }
  }

  // The API's own exposure breakdown: how many of these breaches exposed each
  // data type. Only shown when the API actually returned the counts.
  const apiCounts =
    result.dataTypeCounts && typeof result.dataTypeCounts === "object" ? result.dataTypeCounts : {};
  const apiTotal = Object.values(apiCounts).reduce((s, n) => s + (Number(n) || 0), 0);
  if (apiTotal > 0) {
    const top = Object.entries(apiCounts)
      .filter(([, n]) => Number(n) > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, n]) => `${name} (${n})`)
      .join(", ");
    rows.push({
      label: "Most common exposure",
      value: top,
      hint: "How many of these breaches included each type of data.",
    });
  }

  // How the exposed passwords were stored, when the API told us.
  const storage = getPasswordStorageFacts(result.passwordStrength);
  if (storage.length > 0) {
    const risky = storage.filter((s) => s.severity === "critical" || s.severity === "high");
    rows.push({
      label: "How passwords were stored",
      value: storage.map((s) => `${s.label}: ${s.count}`).join(" · "),
      hint: risky.length
        ? "Some of these breaches stored passwords in a form that is easy to crack."
        : "How the breached sites stored the passwords they exposed.",
    });
  }

  // Exposed pastes — the API reports these separately from breaches.
  const pasteCount = countPastes(result);
  if (pasteCount > 0) {
    rows.push({
      label: "Public paste sites",
      value: `${pasteCount} paste${pasteCount === 1 ? "" : "s"}`,
      hint: "Text you or your email address was posted to on public paste sites.",
    });
  }

  return rows;
}



/**
 * The API's password-storage breakdown as display rows.
 * @param {{plaintext?:number|null, easyToCrack?:number|null,
 *          strongHash?:number|null, unknown?:number|null}|null} strength
 * @returns {Array<{key:string, label:string, count:number, severity:string}>}
 */
export function getPasswordStorageFacts(strength) {
  if (!strength || typeof strength !== "object") return [];
  return PASSWORD_STORAGE.map((meta) => {
    const count = Number(strength[meta.key]);
    return { ...meta, count: Number.isFinite(count) ? count : 0 };
  }).filter((s) => s.count > 0);
}

/**
 * The "what this means" line for the most sensitive thing that was exposed.
 * Uses the severity map's own explanations so the wording matches the chips.
 *
 * @param {Array<{severity:string, name:string, explain:string}>} classified
 * @returns {{name:string, explain:string}|null}
 */
export function getTopExposure(classified) {
  if (!classified || !classified.length) return null;
  const rank = { critical: 3, high: 2, medium: 1, low: 0, unknown: 0 };
  const top = [...classified].sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0))[0];
  return top ? { name: top.name, explain: top.explain } : null;
}


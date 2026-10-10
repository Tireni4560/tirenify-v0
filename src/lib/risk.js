// Overall risk level calculation — unit-tested in tests/risk.test.js.
// Deliberately transparent: the UI shows the same breakdown we compute here.
import { classifyDataType, SEVERITY_RANK } from "./severity.js";

const LEVELS = [
  { min: 80, level: "Critical" },
  { min: 55, level: "High" },
  { min: 30, level: "Medium" },
  { min: 1, level: "Low" },
  { min: 0, level: "None known" },
];

// Points awarded per breach for the most sensitive data type it exposed.
const SEVERITY_POINTS = { critical: 25, high: 12, medium: 4, low: 1, unknown: 2 };

// Extra points per breach for how its passwords were stored.
const PASSWORD_RISK_POINTS = {
  plaintext: 15,
  easytocrack: 12,
  hardtocrack: 4,
  stronghash: 3,
  unknown: 0,
};

/** Worst (highest-rank) severity among a breach's data types, or null. */
function worstSeverityOf(breach) {
  let worst = null;
  for (const raw of breach.dataTypes || []) {
    const { severity } = classifyDataType(raw);
    if (worst === null || SEVERITY_RANK[severity] > SEVERITY_RANK[worst]) worst = severity;
  }
  return worst;
}

/**
 * Score a normalized breach result on a 0..100 "risk" scale (higher = worse).
 * Each breach contributes points for the most sensitive data type it exposed
 * plus points for how its passwords were protected; the total is capped at 100.
 * The returned `factors` sum (before the cap) to the raw total, so the UI's
 * "how we calculated this" breakdown is exact.
 * @param {{breaches: Array, pastes: Array}} result normalized shape from lib/breach.js
 * @returns {{score:number, level:string, factors:Array<{label:string, points:number}>, apiLabel:string|null}}
 */
export function scoreBreachResult(result) {
  const breaches = result?.breaches || [];

  let dataPoints = 0;
  let passwordPoints = 0;
  let anyPlaintext = false;
  let anyWeakHash = false;

  for (const b of breaches) {
    const sev = worstSeverityOf(b) || "unknown";
    dataPoints += SEVERITY_POINTS[sev] ?? SEVERITY_POINTS.unknown;
    const pr = b.passwordRisk || "unknown";
    passwordPoints += PASSWORD_RISK_POINTS[pr] ?? 0;
    if (pr === "plaintext") anyPlaintext = true;
    if (pr === "easytocrack") anyWeakHash = true;
  }

  const factors = [];
  if (dataPoints > 0) {
    factors.push({
      label: `Sensitive data exposed across ${breaches.length} breach${breaches.length === 1 ? "" : "es"}`,
      points: dataPoints,
    });
  }
  if (passwordPoints > 0) {
    const label = anyPlaintext
      ? "Passwords exposed in plain text"
      : anyWeakHash
        ? "Passwords exposed in weakly protected form"
        : "Passwords exposed in strong hashes";
    factors.push({ label, points: passwordPoints });
  }
  if ((result?.pastes || []).length > 0) {
    factors.push({
      label: `Appears in ${result.pastes.length} paste${result.pastes.length === 1 ? "" : "s"}`,
      points: result.pastes.length * 6,
    });
  }

  const raw = factors.reduce((s, f) => s + f.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  const level = LEVELS.find((l) => score >= l.min).level;
  const api = result?.risk && result.risk.label ? result.risk : null;
  return { score, level, factors, apiLabel: api ? api.label : null };
}

/** Highest severity present across all exposed data types. */
export function maxSeverity(result) {
  let max = null;
  for (const b of result?.breaches || []) {
    for (const raw of b.dataTypes || []) {
      const { severity } = classifyDataType(raw);
      if (max === null || SEVERITY_RANK[severity] > SEVERITY_RANK[max]) max = severity;
    }
  }
  return max;
}

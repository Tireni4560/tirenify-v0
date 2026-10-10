// Dashboard security score — transparent and unit-tested in tests/score.test.js.
// Combines three device-only inputs. No data ever leaves the browser.
//
//   breach exposure  50 pts  (from the last breach check stored on-device)
//   habits checklist 30 pts  (self-reported, stored on-device)
//   checkup quiz     20 pts  (from the checkup, stored on-device)
//
// When an input is missing, its weight is excluded and the score is scaled to
// the weight that IS available, so a partial picture still reads 0..100. The
// UI labels the result "Partial" whenever any input is missing.
import { scoreBreachResult } from "./risk.js";

export const WEIGHTS = { breach: 50, habits: 30, checkup: 20 };

/**
 * @param {{
 *   breachResult?: object|null,   // normalized breach result (preferred)
 *   breachesFound?: number|null,  // fallback count when no full result stored
 *   habitsScore?: number|null,    // 0..100 percent, or null if unknown
 *   checkupScore?: number|null,   // 0..100 percent, or null if unknown
 * }} input
 * @returns {{score:number, level:string, complete:boolean,
 *            parts:Array<{label:string,weight:number,value:number|null,known:boolean}>,
 *            missing:string[]}}
 */
export function scoreDashboard({ breachResult = null, breachesFound = null, habitsScore = null, checkupScore = null }) {
  const missing = [];

  let breachComponent = null; // 0..100 SAFETY (100 = no exposure, 0 = severe)
  if (breachResult) {
    // Invert the breach risk score into a safety score.
    breachComponent = 100 - scoreBreachResult(breachResult).score;
  } else if (typeof breachesFound === "number") {
    // No full result stored: scale by count (0 breaches = 100 safe, 12+ = 0).
    breachComponent = Math.max(0, 100 - breachesFound * 8);
  } else {
    missing.push("breach");
  }

  const habitsComponent = typeof habitsScore === "number" ? clamp100(habitsScore) : null;
  if (habitsComponent === null) missing.push("habits");

  const checkupComponent = typeof checkupScore === "number" ? clamp100(checkupScore) : null;
  if (checkupComponent === null) missing.push("checkup");

  const comps = { breach: breachComponent, habits: habitsComponent, checkup: checkupComponent };
  const labels = { breach: "Breach exposure", habits: "Safety habits", checkup: "Security checkup" };

  let availWeight = 0;
  let weighted = 0;
  for (const key of ["breach", "habits", "checkup"]) {
    const v = comps[key];
    if (v === null) continue;
    availWeight += WEIGHTS[key];
    weighted += (WEIGHTS[key] / 100) * v;
  }

  const score = availWeight === 0 ? 0 : Math.round((weighted / availWeight) * 100);
  const complete = missing.length === 0;
  const level = complete ? labelFor(score) : "Partial";

  const parts = ["breach", "habits", "checkup"].map((key) => ({
    label: labels[key],
    weight: WEIGHTS[key],
    value: comps[key],
    known: comps[key] !== null,
  }));

  return { score, level, complete, parts, missing };
}

function clamp100(n) {
  return Math.max(0, Math.min(100, n));
}

function labelFor(score) {
  if (score >= 80) return "Strong";
  if (score >= 55) return "Fair";
  if (score >= 30) return "Weak";
  return "At risk";
}


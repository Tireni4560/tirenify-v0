// In-memory session for the LATEST breach check — sits above the router so the
// full result (breach list, data types, dates) survives in-app navigation
// (Dashboard <-> tools <-> Breach Guard) without a reload.
// PRIVACY RULES (enforced here and unit-tested in tests/check-session.test.js):
//   - The full result is NEVER written to localStorage or sessionStorage.
//   - The raw email is masked the moment the check returns; the store keeps
//     only the mask, never the raw address.
//   - The only persisted artifact stays the existing masked summary row
//     (safeyard:breach-history, written by lib/device-storage.js — unchanged).
// Lifecycle: set on a completed check, REPLACED on a new check, cleared on
// "Clear my data". After a reload the store is empty and consumers fall back to
// the masked summary via computeSecurityScore() below.
import { useSyncExternalStore } from "react";
import { scoreDashboard } from "./score.js";
import { getBreachHistory, maskEmail } from "./device-storage.js";
import { getHabitsScore } from "./habits-store.js";

const EVENT = "safeyard:session-changed";

let session = null; // { result, masked, checkedAt } — never a raw email

function notify() {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* non-DOM (tests) — ignore */
  }
}

/**
 * Record the result of a completed check. Accepts the raw email ONLY to mask
 * it; the mask is what we keep.
 * @param {{result: object, email: string, checkedAt?: string}} input
 */
export function setCheckSession({ result, email, checkedAt }) {
  session = {
    result,
    masked: maskEmail(email),
    checkedAt: checkedAt || result?.checkedAt || new Date().toISOString(),
  };
  notify();
  return session;
}

/** The current session (object or null). Never contains a raw email. */
export function getCheckSession() {
  return session;
}

/** Clear the session (new check starts / Clear my data). */
export function clearCheckSession() {
  session = null;
  notify();
}

/** Subscribe/unsubscribe to session changes (framework-free). */
export function onCheckSessionChange(subscribe) {
  if (typeof window === "undefined" || !subscribe) return () => {};
  window.addEventListener(EVENT, subscribe);
  return () => window.removeEventListener(EVENT, subscribe);
}

/** React binding — re-renders when the session changes. */
export function useCheckSession() {
  return useSyncExternalStore(onCheckSessionChange, getCheckSession, () => null);
}

/** Safety-habits score (0..100) from the shared habits store — same key/shape
 *  the dashboard always persisted. Kept for tests and direct callers. */
export function readHabitsScore() {
  return getHabitsScore();
}

/**
 * The ONE scoring path shared by the Dashboard, Breach Guard and Report, so the
 * number can never drift between pages:
 *   - session with a full result  -> precise breach component (risk-based);
 *   - otherwise                   -> existing count fallback from the masked
 *                                    summary (formula untouched).
 * @param {{session?:object|null, history?:Array, habitsScore?:number|null,
 *          checkupScore?:number|null}} input
 */
export function computeSecurityScore({
  session = getCheckSession(),
  history = getBreachHistory(),
  habitsScore = readHabitsScore(),
  checkupScore = null,
} = {}) {
  if (session?.result) {
    return scoreDashboard({ breachResult: session.result, habitsScore, checkupScore });
  }
  const latest = history[0] || null;
  return scoreDashboard({
    breachesFound: latest ? latest.count : null,
    habitsScore,
    checkupScore,
  });
}

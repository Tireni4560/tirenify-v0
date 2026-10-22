// COMPAT LAYER — do not change behavior. The breach-check result components and
// the dashboard read/write through these names; they now delegate to the shared
// storage module (src/lib/storage.js). Key ("safeyard:breach-history"), row
// shape and masked-summary format are UNCHANGED (additive migration only).
import {
  getItem,
  setItem,
  clearAll as clearStorageAll,
  storageStatus,
  onSafeyardDataChange,
  DATA_CHANGED_EVENT,
} from "./storage.js";

const KEY = "breach-history";
const EVENT = DATA_CHANGED_EVENT;

/** d***@gmail.com style mask. */
export function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  const first = local.slice(0, 1);
  return `${first}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

function read() {
  const list = getItem(KEY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Save a masked summary row for a check. Keeps the latest 10.
 *
 * `pasteCount` is optional and ADDITIVE: older rows simply do not have it and
 * are read as "unknown" (never as "zero exposures"). Only the count is kept —
 * no paste titles, sources or text.
 */
export function saveBreachSummary({ email, breachCount, dataTypes, riskLevel, checkedAt, pasteCount = null }) {
  const list = read();
  // `null`/`undefined`/`""` mean "the API did not report a counter" — they are
  // NOT zero exposures, so the key is left off entirely (older rows stay
  // byte-identical).
  const rawPasteCount = Number(pasteCount);
  const hasPasteCount =
    pasteCount !== null && pasteCount !== undefined && pasteCount !== "" &&
    Number.isFinite(rawPasteCount) && rawPasteCount >= 0;
  const row = {
    masked: maskEmail(email),
    count: breachCount,
    types: [...new Set(dataTypes)].slice(0, 20),
    risk: riskLevel,
    ...(hasPasteCount ? { pasteCount: rawPasteCount } : {}),
    at: checkedAt || new Date().toISOString(),
  };
  const next = [row, ...list.filter((r) => !(r.masked === row.masked && r.count === row.count))].slice(0, 10);
  setItem(KEY, next);
  return row;
}

export function getBreachHistory() {
  return read();
}

export function clearAllSafeyardData() {
  clearStorageAll();
}

export function storageState() {
  return storageStatus();
}

export function useSafeyardDataVersion(subscribe) {
  return onSafeyardDataChange(subscribe);
}

export { EVENT };

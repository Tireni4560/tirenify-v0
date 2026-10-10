// On-device storage — masked summaries only. Never the raw email, never the
// full results. All keys are namespaced "safeyard:" and cleared by "Clear data".
const KEY = "safeyard:breach-history";
const EVENT = "safeyard:data-changed";

/** d***@gmail.com style mask. */
export function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  const first = local.slice(0, 1);
  return `${first}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage full or blocked — ignore, results still show in the page */
  }
}

/** Save a masked summary row for a check. Keeps the latest 10. */
export function saveBreachSummary({ email, breachCount, dataTypes, riskLevel, checkedAt }) {
  const list = read();
  const row = {
    masked: maskEmail(email),
    count: breachCount,
    types: [...new Set(dataTypes)].slice(0, 20),
    risk: riskLevel,
    at: checkedAt || new Date().toISOString(),
  };
  const next = [row, ...list.filter((r) => !(r.masked === row.masked && r.count === row.count))].slice(0, 10);
  write(next);
  return row;
}

export function getBreachHistory() {
  return read();
}

export function clearAllSafeyardData() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("safeyard:")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function useSafeyardDataVersion(subscribe) {
  // Tiny subscription helper (framework-free so it can be unit-tested).
  // Calling the returned function registers the listener and hands back a
  // cleanup function for useEffect: useEffect(() => useSafeyardDataVersion(cb)(), []).
  return subscribe
    ? () => {
        window.addEventListener(EVENT, subscribe);
        return () => window.removeEventListener(EVENT, subscribe);
      }
    : () => () => {};
}

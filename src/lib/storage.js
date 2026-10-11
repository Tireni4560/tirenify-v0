// Safeyard on-device storage — single module for EVERYTHING the app keeps in
// the browser. Namespaced "safeyard:" keys, schema versioned, additive.
// PRIVACY: only the allow-listed shapes below may be stored. Never store or log
// passwords, raw emails, pasted text, checked URLs, files or images.
// Every access is wrapped in try/catch: private mode / quota failure falls back
// to in-memory state and never breaks a tool (callers check `storageStatus()`).
//
// Allowed categories:
//   prefs      — theme, favorites, recent tools, remember-switches (no secrets)
//   breach     — masked breach summaries only (same shape as before; see migrate)
//   progress   — checklist / quiz / challenge / checkup progress (no PII)
//   tracker    — account tracker rows (service names + yes/no flags ONLY)
//   saved      — opt-in saved details (invoice business info, recovery kit fields)
//                written ONLY when the user flips "Remember on this device" (OFF
//                by default); cleared with everything else.
const PREFIX = "safeyard:";
export const SCHEMA_VERSION = 2;

const META_KEY = `${PREFIX}meta`; // { v: number }
const EVENT = "safeyard:data-changed";

// Category -> keys. New keys must be added here AND documented in /my-data.
const CATEGORY_KEYS = {
  prefs: ["theme", "favorites", "recents", "remember-flags", "profile"],
  breach: ["breach-history"],
  progress: ["checkup", "checklists", "quizzes", "challenge", "habits"],
  tracker: ["account-tracker"],
  saved: ["invoice-business", "recovery-kit"],
};

const ALL_KEYS = [META_KEY, ...Object.values(CATEGORY_KEYS).flat().map((k) => PREFIX + k)];

// In-memory fallback used when localStorage is unavailable/blocked/full.
// It behaves like storage for the session; callers are told via status().
let memoryFallback = {};
let storageAvailable = null; // null = untested

function backend() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function probe() {
  if (storageAvailable !== null) return storageAvailable;
  const store = backend();
  if (!store) {
    storageAvailable = false;
    return false;
  }
  try {
    const k = `${PREFIX}probe`;
    store.setItem(k, "1");
    store.removeItem(k);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

/** "ok" | "memory" — memory means writes last for this tab only. */
export function storageStatus() {
  return probe() ? "ok" : "memory";
}

/** Reset cached probe + memory (tests only). */
export function __resetForTests() {
  memoryFallback = {};
  storageAvailable = null;
}

function rawGet(store, key) {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function rawSet(store, key, value) {
  store.setItem(key, value);
}

function notify() {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* non-DOM (tests) — ignore */
  }
}

/** Parse a stored envelope {v, data}; returns {ok, data} (never throws). */
export function parseEnvelope(text) {
  if (text == null) return { ok: false, data: undefined };
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return { ok: true, data: parsed.data };
    }
    // Legacy bare value (pre-envelope): accept additively.
    return { ok: true, data: parsed, legacy: true };
  } catch {
    return { ok: false, data: undefined };
  }
}

export function makeEnvelope(data) {
  return JSON.stringify({ v: SCHEMA_VERSION, data });
}

/**
 * Additive migration of existing keys. v1 stored the breach history as a bare
 * JSON array under "safeyard:breach-history" and habits as a bare object under
 * "safeyard:habits". We re-wrap them in envelopes WITHOUT changing their
 * contents. Never deletes or rewrites user rows.
 */
export function migrateIfNeeded() {
  const store = backend();
  if (!store) return;
  let meta = null;
  try {
    meta = JSON.parse(rawGet(store, META_KEY) || "null");
  } catch {
    meta = null;
  }
  if (meta && typeof meta.v === "number" && meta.v >= SCHEMA_VERSION) return;
  for (const key of ALL_KEYS) {
    if (key === META_KEY) continue;
    let text = null;
    try {
      text = rawGet(store, key);
    } catch {
      continue;
    }
    if (text == null) continue;
    const { ok, data, legacy } = parseEnvelope(text);
    if (!ok) continue; // corrupt value: leave it; readers treat as missing
    if (legacy) {
      try {
        rawSet(store, key, makeEnvelope(data));
      } catch {
        /* quota — leave legacy value in place */
      }
    }
  }
  try {
    rawSet(store, META_KEY, JSON.stringify({ v: SCHEMA_VERSION }));
  } catch {
    /* ignore */
  }
  notify();
}

/** Read a namespaced key. Returns `fallback` when missing/corrupt/unavailable. */
export function getItem(name, fallback = null) {
  migrateIfNeeded();
  const key = PREFIX + name;
  const store = backend();
  if (store && probe()) {
    const { ok, data } = parseEnvelope(rawGet(store, key));
    return ok ? data : fallback;
  }
  return key in memoryFallback ? memoryFallback[key] : fallback;
}

/** Write a namespaced key. Never throws. Returns true when persisted. */
export function setItem(name, value) {
  const key = PREFIX + name;
  const store = backend();
  if (store && probe()) {
    try {
      rawSet(store, key, makeEnvelope(value));
      notify();
      return true;
    } catch {
      /* quota/blocked after probe — fall through to memory */
    }
  }
  memoryFallback[key] = value;
  notify();
  return false;
}

export function removeItem(name) {
  const key = PREFIX + name;
  delete memoryFallback[key];
  try {
    backend()?.removeItem(key);
  } catch {
    /* ignore */
  }
  notify();
}

/** Every stored key/value this module owns (for /my-data + export). */
export function getAll() {
  migrateIfNeeded();
  const out = {};
  for (const key of ALL_KEYS) {
    if (key === META_KEY) continue;
    const name = key.slice(PREFIX.length);
    out[name] = getItem(name, null);
  }
  return out;
}

/** Byte size report per key + total (for /my-data "what's stored"). */
export function sizeReport() {
  const rows = [];
  let total = 0;
  for (const key of ALL_KEYS) {
    if (key === META_KEY) continue;
    const name = key.slice(PREFIX.length);
    let bytes = 0;
    try {
      const text = backend()?.getItem(key);
      bytes = text == null ? 0 : new Blob([text]).size;
    } catch {
      bytes = 0;
    }
    if (key in memoryFallback && bytes === 0) {
      try {
        bytes = new Blob([JSON.stringify(memoryFallback[key])]).size;
      } catch {
        bytes = 0;
      }
    }
    total += bytes;
    rows.push({ key: name, bytes, category: categoryOf(name) });
  }
  return { rows: rows.filter((r) => r.bytes > 0), total };
}

function categoryOf(name) {
  for (const [cat, keys] of Object.entries(CATEGORY_KEYS)) {
    if (keys.includes(name)) return cat;
  }
  return "other";
}

/** Remove one category (used by per-category "clear" on /my-data). */
export function clearCategory(category) {
  for (const name of CATEGORY_KEYS[category] || []) removeItem(name);
}

/** Remove everything this module owns (used by /my-data "clear all"). */
export function clearAll() {
  for (const key of ALL_KEYS) {
    if (key === META_KEY) continue;
    removeItem(key.slice(PREFIX.length));
  }
}

/** Validate an imported payload before it touches storage. */
export function validateImport(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "File is not a Safeyard export object." };
  }
  if (payload.app !== "safeyard-export" || typeof payload.data !== "object" || !payload.data) {
    return { ok: false, reason: "Missing Safeyard export marker." };
  }
  const known = new Set(ALL_KEYS.map((k) => k.slice(PREFIX.length)));
  const clean = {};
  for (const [k, v] of Object.entries(payload.data)) {
    if (known.has(k) && v !== undefined) clean[k] = v;
  }
  return { ok: true, data: clean };
}

/** Export everything as a portable JSON string (for /my-data download). */
export function exportAll() {
  return JSON.stringify(
    { app: "safeyard-export", v: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: getAll() },
    null,
    2,
  );
}

/** Import a payload produced by exportAll(). Returns {ok, imported, reason?}. */
export function importAll(payload) {
  const v = validateImport(payload);
  if (!v.ok) return { ok: false, imported: 0, reason: v.reason };
  let n = 0;
  for (const [k, val] of Object.entries(v.data)) {
    setItem(k, val);
    n += 1;
  }
  return { ok: true, imported: n };
}

/**
 * Framework-free subscription helper (same contract as the old device-storage
 * one): useEffect(() => onSafeyardDataChange(cb)(), []).
 */
export function onSafeyardDataChange(subscribe) {
  return subscribe
    ? () => {
        if (typeof window === "undefined") return () => {};
        window.addEventListener(EVENT, subscribe);
        return () => window.removeEventListener(EVENT, subscribe);
      }
    : () => () => {};
}

export const DATA_CHANGED_EVENT = EVENT;
export const STORAGE_PREFIX = PREFIX;

// Shared Safety-habits store — ONE source of truth for habit ticks, read and
// written by the Dashboard, the Breach Guard page and the Security Report.
//   definitions: src/content/habits.js (wording/order PROTECTED, never edited)
//   persisted:   EXISTING storage key "habits" via src/lib/storage.js (same
//                {index: bool} shape, same envelope + bare-JSON migration;
//                additive use only — existing users keep their ticks)
//   live state:  tiny external store (useSyncExternalStore) above the router;
//                same-tab writes arrive via "safeyard:data-changed", other tabs
//                via the browser "storage" event.
// Prerender safety: getServerSnapshot (and the pre-hydration client snapshot)
// is a neutral {} — storage is read only after mount (first subscribe), so
// there is no hydration mismatch or flash of wrong ticks. Storage failure
// (private mode/quota) falls back to the storage module's in-memory session.
import { useSyncExternalStore } from "react";
import { HABITS } from "../content/habits.js";
import { getItem, setItem, DATA_CHANGED_EVENT } from "./storage.js";

export const HABITS_KEY = "habits";
/** Index of the "two-factor authentication" habit — used to de-dupe items that
 *  repeat it elsewhere (Do-this-first "2fa", ActionPlan "2fa"). Stable because
 *  habit wording AND order are protected. */
export const HABIT_2FA_INDEX = 1;
export const HABITS_TOTAL = HABITS.length;
const STORAGE_KEY = `safeyard:${HABITS_KEY}`;

const NEUTRAL = {}; // server snapshot + pre-hydration client snapshot
let cache = NEUTRAL;
let hydrated = false;
const listeners = new Set();
let windowHooked = false;

function hasWindow() {
  try {
    return typeof window !== "undefined" && !!window.addEventListener;
  } catch {
    return false;
  }
}

/** Get a window-like localStorage handle, or null (node tests). */
function storageHandle() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* ignore */
  }
  return null;
}

/** Keep only valid habit indexes; coerce to booleans (never throws). */
function normalize(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 0 && i < HABITS.length) out[i] = !!v;
  }
  return out;
}

function sameState(a, b) {
  for (let i = 0; i < HABITS.length; i += 1) {
    if (!!a[i] !== !!b[i]) return false;
  }
  return true;
}

function emit() {
  for (const l of [...listeners]) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}

/** Re-read from storage; notify subscribers only on a real change. Public so
 *  tests (and any external writer) can drive the cross-tab code path. */
export function refreshHabits() {
  let next = NEUTRAL;
  try {
    next = normalize(getItem(HABITS_KEY, {}));
  } catch {
    next = { ...cache };
  }
  if (!sameState(cache, next)) {
    cache = next;
    emit();
  }
  return cache;
}

function onDataChanged() {
  refreshHabits();
}

function onStorageEvent(e) {
  if (!e || e.key == null || e.key === STORAGE_KEY) refreshHabits();
}

function hookWindow() {
  if (windowHooked || !hasWindow()) return;
  window.addEventListener(DATA_CHANGED_EVENT, onDataChanged);
  window.addEventListener("storage", onStorageEvent);
  windowHooked = true;
}

/** Test hook: fire the cross-tab code path without a real second tab. */
export function __storageEventForTests(e) {
  onStorageEvent(e);
}

function unhookWindow() {
  if (!windowHooked || !hasWindow()) return;
  window.removeEventListener(DATA_CHANGED_EVENT, onDataChanged);
  window.removeEventListener("storage", onStorageEvent);
  windowHooked = false;
}

export function subscribeHabits(cb) {
  listeners.add(cb);
  if (hasWindow()) {
    hookWindow();
    if (!hydrated) {
      hydrated = true;
      refreshHabits();
    }
  } else {
    // Node test env / private-mode memory fallback: read the in-memory
    // fallback now so a freshly subscribed component gets the stored value,
    // and record the hydration state exactly like the window path.
    hydrated = true;
    refreshHabits();
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) unhookWindow();
  };
}

export function getHabitsSnapshot() {
  return cache;
}

export function getHabitsServerSnapshot() {
  return NEUTRAL;
}

/** Flip one habit. Writes through storage (same key/shape as always), then
 *  refreshes the cache so subscribers update even where events don't fire
 *  (tests, storage-event gaps). Returns the new state. */
export function toggleHabit(index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= HABITS.length) return cache;
  const next = { ...cache, [i]: !cache[i] };
  try {
    setItem(HABITS_KEY, next);
  } catch {
    /* storage module already falls back to memory; keep going */
  }
  refreshHabits();
  return cache;
}

/** Ticked indexes, ascending (for filtering duplicated next-step items). */
export function doneHabitIndexes(state = cache) {
  const out = [];
  for (let i = 0; i < HABITS.length; i += 1) {
    if (state[i]) out.push(i);
  }
  return out;
}

export function habitsScoreOf(state = cache) {
  return (doneHabitIndexes(state).length / HABITS.length) * 100;
}

/** Score input for computeSecurityScore(): null until hydrated (keeps the
 *  honest "Partial" state instead of flashing a number). */
export function getHabitsScore() {
  return hydrated ? habitsScoreOf(cache) : null;
}

/**
 * Shared hook. Returns { habits, done, total, toggle, habitsScore }.
 * Every mounted consumer re-renders on any tick — same tab, other tab, or
 * any writer through the storage module.
 */
export function useHabits() {
  const habits = useSyncExternalStore(subscribeHabits, getHabitsSnapshot, getHabitsServerSnapshot);
  const done = doneHabitIndexes(habits).length;
  return {
    habits,
    done,
    total: HABITS.length,
    toggle: toggleHabit,
    habitsScore: hydrated ? (done / HABITS.length) * 100 : null,
  };
}

/** Reset the module cache + listeners (tests only). */
export function __resetHabitsForTests() {
  cache = NEUTRAL;
  hydrated = false;
  listeners.clear();
  if (hasWindow()) unhookWindow();
}

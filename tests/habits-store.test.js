import { describe, it, expect, beforeEach } from "vitest";
import {
  HABIT_2FA_INDEX,
  HABITS_TOTAL,
  subscribeHabits,
  getHabitsSnapshot,
  getHabitsServerSnapshot,
  refreshHabits,
  toggleHabit,
  doneHabitIndexes,
  habitsScoreOf,
  getHabitsScore,
  __resetHabitsForTests,
  __storageEventForTests,
} from "../src/lib/habits-store.js";
import { setItem } from "../src/lib/storage.js";
import { __resetForTests } from "../src/lib/storage.js";
import { HABITS } from "../src/content/habits.js";
import { scoreDashboard } from "../src/lib/score.js";

// ONE habits source of truth: ticked state persists under the EXISTING
// "habits" key in the EXISTING {index: bool} shape (backward compatible);
// every subscriber updates on any tick; the score moves by the habits weight.
// (vitest runs in node: no window/localStorage, so the storage module's
// in-memory fallback is exercised — the same code path as private mode.)

beforeEach(() => {
  __resetForTests();
  __resetHabitsForTests();
});

describe("habits store subscription", () => {
  it("starts neutral and hydrates from the existing stored state", () => {
    expect(getHabitsServerSnapshot()).toEqual({});
    expect(getHabitsSnapshot()).toEqual({});
    setItem("habits", { 0: true, 2: true });
    let seen = null;
    const unsub = subscribeHabits(() => {
      seen = { ...getHabitsSnapshot() };
    });
    expect(getHabitsSnapshot()).toEqual({ 0: true, 2: true });
    expect(seen).toEqual({ 0: true, 2: true });
    unsub();
  });

  it("toggling notifies every subscriber and writes the existing key/shape", () => {
    const seenA = [];
    const seenB = [];
    const unA = subscribeHabits(() => seenA.push({ ...getHabitsSnapshot() }));
    const unB = subscribeHabits(() => seenB.push({ ...getHabitsSnapshot() }));
    toggleHabit(1);
    expect(getHabitsSnapshot()).toEqual({ 1: true });
    expect(seenA).toEqual([{ 1: true }]);
    expect(seenB).toEqual([{ 1: true }]);
    // Same {index: bool} shape the dashboard always persisted.
    expect(getHabitsSnapshot()).toEqual({ 1: true });
    toggleHabit(1);
    expect(getHabitsSnapshot()).toEqual({ 1: false });
    expect(seenA).toHaveLength(2);
    unA();
    unB();
  });

  it("ignores out-of-range indexes and junk payloads", () => {
    subscribeHabits(() => {});
    expect(toggleHabit(99)).toEqual({});
    expect(toggleHabit("x")).toEqual({});
    setItem("habits", { 0: true, 99: true, junk: 1 });
    refreshHabits();
    expect(getHabitsSnapshot()).toEqual({ 0: true });
  });

  it("loads an existing stored state (backward compatible)", () => {
    setItem("habits", { 1: true, 3: true });
    subscribeHabits(() => {});
    expect(getHabitsSnapshot()).toEqual({ 1: true, 3: true });
    toggleHabit(0);
    expect(getHabitsSnapshot()).toEqual({ 0: true, 1: true, 3: true });
  });

  it("the cross-tab storage event updates the store", () => {
    const seen = [];
    subscribeHabits(() => seen.push({ ...getHabitsSnapshot() }));
    // Simulate another tab writing the same raw key, then the storage event.
    setItem("habits", { 0: true });
    __storageEventForTests({ key: "safeyard:habits" });
    expect(getHabitsSnapshot()).toEqual({ 0: true });
    // A direct re-read + event still converges (idempotent refresh).
    __storageEventForTests({ key: "safeyard:habits" });
    expect(getHabitsSnapshot()).toEqual({ 0: true });
    // Unrelated keys are ignored.
    __storageEventForTests({ key: "safeyard:theme" });
    expect(seen.every((s) => JSON.stringify(s) === JSON.stringify({ 0: true }))).toBe(true);
  });

  it("a second toggle in another logical tab is visible after refresh", () => {
    subscribeHabits(() => {});
    toggleHabit(2);
    expect(getHabitsSnapshot()).toEqual({ 2: true });
    // Another writer (same storage module) flips habit 1; event converges.
    const current = { ...getHabitsSnapshot(), 1: true };
    setItem("habits", current);
    __storageEventForTests({ key: "safeyard:habits" });
    expect(getHabitsSnapshot()).toEqual({ 1: true, 2: true });
  });
});

describe("habits score math (formula untouched)", () => {
  it("each tick moves the habits component — score shifts by the 30% weight", () => {
    expect(HABITS_TOTAL).toBe(HABITS.length);
    subscribeHabits(() => {});
    const none = scoreDashboard({ breachesFound: 0, habitsScore: habitsScoreOf({}) });
    const two = scoreDashboard({ breachesFound: 0, habitsScore: habitsScoreOf({ 0: true, 3: true }) });
    const all = scoreDashboard({
      breachesFound: 0,
      habitsScore: habitsScoreOf({ 0: true, 1: true, 2: true, 3: true }),
    });
    expect(habitsScoreOf({})).toBe(0);
    expect(habitsScoreOf({ 0: true, 3: true })).toBe(50);
    // 30% weight: breach part known (50), checkup unknown → avail weight 80,
    // so a 50-point habits delta shifts the score by 30*50/80 = 18.75 → 19.
    expect(two.score - none.score).toBe(18);
    expect(all.score - none.score).toBe(37);
    expect(doneHabitIndexes({ 1: true, 3: true })).toEqual([1, 3]);
    expect(HABIT_2FA_INDEX).toBe(1);
  });

  it("score input stays null until hydrated (honest Partial, no flash)", () => {
    expect(getHabitsScore()).toBe(null);
    subscribeHabits(() => {});
    expect(getHabitsScore()).toBe(0);
  });
});

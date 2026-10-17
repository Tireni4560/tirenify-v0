import { describe, it, expect } from "vitest";
import { getDoThisFirst } from "../src/lib/next-steps.js";
import { HABIT_2FA_INDEX } from "../src/lib/habits-store.js";
import { LIVE_ROUTES } from "../src/config/routes.js";

// "Do this first" — pure derivation of up to 3 actions from the exposed data
// types and breach count (full result or masked summary). Every link must be
// a live route; nothing may point at a planned page.

const LIVE = new Set(LIVE_ROUTES.map((r) => r.path));

function expectLive(actions) {
  expect(actions.length).toBeLessThanOrEqual(3);
  for (const a of actions) {
    expect(LIVE.has(a.to)).toBe(true);
    expect(a.title.length).toBeGreaterThan(0);
    expect(a.reason.length).toBeGreaterThan(0);
    expect(a.id.length).toBeGreaterThan(0);
  }
}

describe("getDoThisFirst", () => {
  it("passwords exposed -> generator, strength checker, 2FA guide", () => {
    const actions = getDoThisFirst({ types: ["Passwords", "Email addresses"], count: 3 });
    expect(actions.map((a) => a.to)).toEqual([
      "/tools/password-generator",
      "/tools/password-strength",
      "/learn/setup-2fa",
    ]);
    expectLive(actions);
  });

  it("phone exposed (no passwords) -> SIM safety and scam-message guides", () => {
    const actions = getDoThisFirst({ types: ["Phone numbers"], count: 1 });
    expect(actions.map((a) => a.to)).toEqual([
      "/learn/sim-swap",
      "/learn/spotting-phishing",
    ]);
    expectLive(actions);
  });

  it("financial data exposed -> mobile money/banking safety", () => {
    const actions = getDoThisFirst({ types: ["Financial info"], count: 1 });
    expect(actions.map((a) => a.to)).toContain("/learn/mobile-money-safety");
    expectLive(actions);
  });

  it("breaches with unrecognisable types -> calm after-leak guidance", () => {
    const actions = getDoThisFirst({ types: ["Ethical tags"], count: 2 });
    expect(actions.map((a) => a.to)).toEqual([
      "/learn/in-a-breach",
      "/tools/leak-safety-guide",
    ]);
    expectLive(actions);
  });

  it("nothing found -> finish habits, add 2FA anyway", () => {
    const actions = getDoThisFirst({ types: [], count: 0 });
    expect(actions.map((a) => a.to)).toEqual(["/", "/learn/setup-2fa"]);
    expectLive(actions);
    // Honesty: the reason must not claim the user is safe.
    for (const a of actions) expect(a.reason).not.toMatch(/\bsafe\b|\bsecure\b/i);
  });

  it("no check at all -> no actions (the dashboard's primary action stays the check)", () => {
    expect(getDoThisFirst({ types: [], count: null })).toEqual([]);
  });

  it("filters non-live routes even if a mapping names one", () => {
    // /checkup is planned, not live — nothing may ever link to it.
    expect(LIVE.has("/checkup")).toBe(false);
    const all = [
      ...getDoThisFirst({ types: ["Passwords"], count: 5 }),
      ...getDoThisFirst({ types: ["Phone numbers"], count: 5 }),
      ...getDoThisFirst({ types: ["Ethical tags"], count: 5 }),
      ...getDoThisFirst({ types: [], count: 0 }),
    ];
    for (const a of all) expect(LIVE.has(a.to)).toBe(true);
  });

  it("caps at 3 actions for password + phone + bank combined", () => {
    const actions = getDoThisFirst({
      types: ["Passwords", "Phone numbers", "Financial info"],
      count: 5,
    });
    expect(actions).toHaveLength(3);
    expectLive(actions);
  });

  it("hides the 2FA action when the 2FA habit is already ticked", () => {
    const with2fa = getDoThisFirst({
      types: ["Passwords", "Email addresses"],
      count: 3,
      doneHabits: [HABIT_2FA_INDEX],
    });
    expect(with2fa.map((a) => a.to)).toEqual([
      "/tools/password-generator",
      "/tools/password-strength",
    ]);
    expectLive(with2fa);
    const without = getDoThisFirst({
      types: ["Passwords", "Email addresses"],
      count: 3,
      doneHabits: [],
    });
    expect(without.map((a) => a.to)).toContain("/learn/setup-2fa");
    const clean = getDoThisFirst({ types: [], count: 0, doneHabits: [HABIT_2FA_INDEX] });
    expect(clean.map((a) => a.to)).toEqual(["/"]);
    expectLive(clean);
  });
});

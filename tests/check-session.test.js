import { describe, it, expect, beforeEach } from "vitest";
import {
  setCheckSession,
  getCheckSession,
  clearCheckSession,
  computeSecurityScore,
} from "../src/lib/check-session.js";
import { scoreDashboard } from "../src/lib/score.js";
import { __resetForTests, setItem, getItem } from "../src/lib/storage.js";
import { saveBreachSummary, getBreachHistory } from "../src/lib/device-storage.js";

// In-memory session store: survives in-app navigation, replaced on a new
// check, cleared on "Clear my data" — and NEVER writes the full result or the
// raw email to localStorage/sessionStorage (only the existing masked summary
// row may be persisted, via the existing saveBreachSummary path).

const BREACH_RESULT = {
  found: true,
  breaches: [
    {
      name: "ExampleBreach",
      domain: "example.com",
      industry: "",
      date: "2021",
      records: 100,
      dataTypes: ["Email addresses", "Passwords"],
      passwordRisk: "plaintext",
      details: "",
      verified: false,
      references: [],
      added: null,
    },
  ],
  pastes: [],
  years: { "2021": 1 },
  risk: null,
  source: "XposedOrNot",
  checkedAt: "2026-10-17T00:00:00.000Z",
};

function fakeWebStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    _map: map,
  };
}

beforeEach(() => {
  clearCheckSession();
  __resetForTests();
});

describe("check-session store", () => {
  it("keeps the full result in memory across reads and clears on demand", () => {
    setCheckSession({ result: BREACH_RESULT, email: "user@example.com" });
    const s = getCheckSession();
    expect(s.result.breaches).toHaveLength(1);
    expect(s.result.breaches[0].name).toBe("ExampleBreach");
    clearCheckSession();
    expect(getCheckSession()).toBe(null);
  });

  it("masks the email immediately — the raw address is never held", () => {
    setCheckSession({ result: BREACH_RESULT, email: "verysecret@example.com" });
    const s = getCheckSession();
    expect(s.masked).toBe("v*********@example.com");
    expect(JSON.stringify(s)).not.toContain("verysecret@example.com");
  });

  it("a NEW check replaces (clears) the previous session", () => {
    setCheckSession({ result: BREACH_RESULT, email: "first@example.com" });
    const second = { ...BREACH_RESULT, breaches: [] };
    setCheckSession({ result: second, email: "second@example.com" });
    const s = getCheckSession();
    expect(s.result.breaches).toEqual([]);
    expect(s.masked).toBe("s*****@example.com");
  });

  it("writes NOTHING to web storage — not the result, not the raw email", () => {
    const ls = fakeWebStorage();
    const ss = fakeWebStorage();
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: ss, configurable: true });
    try {
      setCheckSession({ result: BREACH_RESULT, email: "secret@example.com" });
      clearCheckSession();
      expect(ls._map.size).toBe(0);
      expect(ss._map.size).toBe(0);
    } finally {
      delete globalThis.localStorage;
      delete globalThis.sessionStorage;
    }
  });

  it("keeps only the existing masked summary row in device storage", () => {
    saveBreachSummary({
      email: "user@example.com",
      breachCount: 1,
      dataTypes: ["Email addresses", "Passwords"],
      riskLevel: "High",
      checkedAt: BREACH_RESULT.checkedAt,
    });
    const rows = getBreachHistory();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ masked: "u***@example.com", count: 1, risk: "High" });
    expect(JSON.stringify(rows)).not.toContain("user@example.com");
    // The format/keys are the pre-existing ones (additive use only).
    expect(Object.keys(rows[0]).sort()).toEqual(["at", "count", "masked", "risk", "types"]);
  });
});

describe("shared score data flow (Dashboard == Breach Guard)", () => {
  it("same number on both pages for the same in-session inputs", () => {
    setCheckSession({ result: BREACH_RESULT, email: "user@example.com" });
    // Both pages call computeSecurityScore() with the same shared inputs.
    const dashboardView = computeSecurityScore({ habitsScore: 50 });
    const breachGuardView = computeSecurityScore({ habitsScore: 50 });
    expect(dashboardView.score).toBe(breachGuardView.score);
    expect(dashboardView.level).toBe(breachGuardView.level);
    // And it matches the protected formula fed with the full result.
    const direct = scoreDashboard({ breachResult: BREACH_RESULT, habitsScore: 50 });
    expect(dashboardView.score).toBe(direct.score);
  });

  it("falls back to the masked-summary count after a reload (both pages identical)", () => {
    // No session — simulate reload: only the stored summary row survives.
    setCheckSession({ result: BREACH_RESULT, email: "user@example.com" });
    saveBreachSummary({
      email: "user@example.com",
      breachCount: 1,
      dataTypes: ["Email addresses", "Passwords"],
      riskLevel: "High",
      checkedAt: BREACH_RESULT.checkedAt,
    });
    clearCheckSession(); // reload wipes the module-level store
    const history = getBreachHistory();
    const a = computeSecurityScore({ session: null, history, habitsScore: 50 });
    const b = computeSecurityScore({ session: null, history, habitsScore: 50 });
    expect(a.score).toBe(b.score);
    const direct = scoreDashboard({ breachesFound: 1, habitsScore: 50 });
    expect(a.score).toBe(direct.score);
  });

  it("keeps Partial/Unknown parts when habits/checkup are unknown", () => {
    setCheckSession({ result: BREACH_RESULT, email: "user@example.com" });
    const s = computeSecurityScore({ habitsScore: null, checkupScore: null });
    expect(s.complete).toBe(false);
    expect(s.level).toBe("Partial");
    expect(s.missing).toContain("habits");
    expect(s.missing).toContain("checkup");
  });

  it("empty state: no session, no history -> breach part unknown, never fake", () => {
    const s = computeSecurityScore({ session: null, history: [], habitsScore: null });
    expect(s.missing).toContain("breach");
    expect(s.complete).toBe(false);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it("computeSecurityScore reads storage but never writes to it", () => {
    setItem("favorites", ["password-generator"]);
    computeSecurityScore({ session: null, history: [], habitsScore: 100 });
    expect(getItem("favorites", null)).toEqual(["password-generator"]);
  });
});

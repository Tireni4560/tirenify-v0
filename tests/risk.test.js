import { describe, it, expect } from "vitest";
import { scoreBreachResult } from "../src/lib/risk.js";

function result({ breaches = [], pastes = [], risk = null }) {
  return {
    found: breaches.length > 0 || pastes.length > 0,
    breaches,
    pastes,
    years: {},
    risk,
    source: "XposedOrNot",
    checkedAt: new Date().toISOString(),
  };
}

describe("scoreBreachResult", () => {
  it("reports no known risk when nothing is found", () => {
    const r = scoreBreachResult(result({}));
    expect(r.level).toBe("None known");
    expect(r.score).toBe(0);
  });

  it("scores email-only breaches low", () => {
    const r = scoreBreachResult(
      result({ breaches: [{ dataTypes: ["Email addresses"], passwordRisk: "unknown", date: "2019" }] }),
    );
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(35);
  });

  it("scores password + plaintext risk as critical", () => {
    const r = scoreBreachResult(
      result({
        breaches: Array.from({ length: 10 }, () => ({
          dataTypes: ["Passwords", "Credit cards", "Bank details"],
          passwordRisk: "plaintext",
          date: "2020",
        })),
      }),
    );
    expect(r.level).toBe("Critical");
    expect(r.score).toBe(100);
  });

  it("caps the score at 100 regardless of how many breaches", () => {
    const r = scoreBreachResult(
      result({
        breaches: Array.from({ length: 100 }, () => ({
          dataTypes: ["Passwords"],
          passwordRisk: "plaintext",
          date: "2015",
        })),
      }),
    );
    expect(r.score).toBe(100);
  });

  it("returns a human-readable factors list", () => {
    const r = scoreBreachResult(
      result({ breaches: [{ dataTypes: ["Passwords"], passwordRisk: "plaintext", date: "2020" }] }),
    );
    expect(Array.isArray(r.factors)).toBe(true);
    expect(r.factors.length).toBeGreaterThan(0);
    for (const f of r.factors) {
      expect(typeof f.label).toBe("string");
      expect(typeof f.points).toBe("number");
    }
  });

  it("prefers the API risk label when present", () => {
    const r = scoreBreachResult(
      result({
        breaches: [{ dataTypes: ["Email addresses"], passwordRisk: "unknown", date: "2019" }],
        risk: { label: "Medium", score: 42 },
      }),
    );
    expect(r.apiLabel).toBe("Medium");
  });

  it("treats missing fields as unknown without throwing", () => {
    const r = scoreBreachResult(result({ breaches: [{ date: "2020" }] }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.level).toBeTruthy();
  });
});
